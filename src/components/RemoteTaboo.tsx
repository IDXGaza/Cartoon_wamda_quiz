import React, { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, query, orderBy, setDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Question, Player } from '../types';
import { playSound } from '../utils/sound';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  User, 
  Sparkles, 
  Timer, 
  Trophy, 
  Volume2, 
  ArrowRight,
  RefreshCw,
  Ban,
  Award
} from 'lucide-react';
import { CartoonTimer, CartoonTrophy, CartoonStar, CartoonAlert, CartoonUser } from './CartoonIcons';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const RemoteTaboo: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerColor] = useState(() => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
  const [isJoined, setIsJoined] = useState(false);
  const [roomState, setRoomState] = useState<any>(null);
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);
  const [revealed, setRevealed] = useState(true);
  const [error, setError] = useState('');
  const [playerScore, setPlayerScore] = useState(0);

  const localTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const parseRoomId = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const id = searchParams.get('roomId') || hashParams.get('roomId');
      if (id) {
        setRoomId(id.toUpperCase().trim());
      }
    };
    
    parseRoomId();
    window.addEventListener('hashchange', parseRoomId);
    return () => window.removeEventListener('hashchange', parseRoomId);
  }, []);

  useEffect(() => {
    if (!isJoined || !roomId || !auth.currentUser) return;

    // Listen to personal score
    const playerRef = doc(db, 'rooms', roomId, 'players', auth.currentUser.uid);
    const unsub = onSnapshot(playerRef, (snapshot) => {
      if (snapshot.exists()) {
        setPlayerScore(snapshot.data().score || 0);
      }
    });

    return () => unsub();
  }, [isJoined, roomId]);

  useEffect(() => {
    if (!isJoined || !roomId) return;

    const roomRef = doc(db, 'rooms', roomId);
    const unsub = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomState(snapshot.data());
      } else {
        setError('الغرفة غير موجودة أو تم إغلاقها من المضيف');
        setIsJoined(false);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `rooms/${roomId}`));

    const playersRef = collection(db, 'rooms', roomId, 'players');
    const q = query(playersRef, orderBy('joinedAt', 'asc'));
    const unsubPlayers = onSnapshot(q, (snapshot) => {
      setRemotePlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${roomId}/players`));

    return () => {
      unsub();
      unsubPlayers();
    };
  }, [isJoined, roomId]);

  // Sync Timer: If I am the active describer, tick the local timer and update Firestore
  const isDescriber = roomState?.describerId === auth.currentUser?.uid;
  const isPlaying = roomState?.gameState === 'playing';

  useEffect(() => {
    if (isPlaying && isDescriber && roomState?.timeLeft > 0) {
      localTimerRef.current = setTimeout(async () => {
        const nextTime = roomState.timeLeft - 1;
        if (nextTime <= 5 && nextTime > 0) {
          playSound('tick');
        }
        
        const roomRef = doc(db, 'rooms', roomId);
        if (nextTime === 0) {
          playSound('wrong');
          // Update player score in Firestore using transaction or merge write
          try {
            const playerRef = doc(db, 'rooms', roomId, 'players', auth.currentUser!.uid);
            await setDoc(playerRef, { score: Math.max(0, playerScore + (roomState.turnScore || 0)) }, { merge: true });
          } catch (e) {
            console.error("Failed to add score", e);
          }

          await updateDoc(roomRef, {
            gameState: 'timesup',
            timeLeft: 0
          });
        } else {
          await updateDoc(roomRef, {
            timeLeft: nextTime
          });
        }
      }, 1000);
    }

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
    };
  }, [isPlaying, isDescriber, roomState?.timeLeft, roomState?.turnScore, roomId, playerScore]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomId.trim() || !auth.currentUser) return;

    try {
      const playerRef = doc(db, 'rooms', roomId, 'players', auth.currentUser.uid);
      await setDoc(playerRef, {
        name: playerName,
        color: playerColor,
        score: 0,
        joinedAt: new Date().toISOString()
      });
      setIsJoined(true);
      setError('');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('فشل الانضمام: تأكد من رمز الغرفة أو قد تكون الجلسة قد انتهت.');
      } else if (err.message?.includes('offline') || err.code === 'unavailable') {
        setError('فشل الاتصال: يرجى التأكد من اتصالك بالإنترنت. (Firestore Offline)');
      } else {
        setError('فشل الانضمام للغرفة. تأكد من صحة الرمز.');
      }
    }
  };

  const currentQuestion = roomState?.currentQuestion as Question;

  const handleNextWord = async (status: 'correct' | 'wrong' | 'pass') => {
    if (!roomState || !currentQuestion) return;

    let scoreChange = 0;
    let isCorrect = 0;
    let isWrong = 0;

    if (status === 'correct') {
      playSound('correct');
      scoreChange = 1;
      isCorrect = 1;
    } else if (status === 'wrong') {
      playSound('wrong');
      scoreChange = -1;
      isWrong = 1;
    } else {
      playSound('click');
    }

    const nextIndex = (roomState.questionIndex || 0) + 1;
    const pool = roomState.questionsPool || [];
    const nextQuestion = pool[nextIndex % pool.length] || null;

    const word = currentQuestion.answer || 'سؤال';
    const newHistoryItem = { word, status };

    const roomRef = doc(db, 'rooms', roomId);
    try {
      await updateDoc(roomRef, {
        questionIndex: nextIndex,
        currentQuestion: nextQuestion,
        turnScore: (roomState.turnScore || 0) + scoreChange,
        turnCorrect: (roomState.turnCorrect || 0) + isCorrect,
        turnWrong: (roomState.turnWrong || 0) + isWrong,
        turnHistory: [...(roomState.turnHistory || []), newHistoryItem]
      });
      setRevealed(true);
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-cream)] p-6 flex items-center justify-center font-sans" dir="rtl">
        <div className="vintage-panel p-8 rounded-[2.5rem] w-full max-w-md border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] bg-white">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-rose-500 rounded-2xl border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] flex items-center justify-center mx-auto mb-4 text-white">
              <Sparkles size={48} />
            </div>
            <h1 className="text-3xl font-display text-[var(--color-ink-black)]">قول بس لا تقول</h1>
            <p className="text-sm font-bold opacity-60 mt-1">انضم للغرفة للمشاركة والوصف!</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-6">
            <div className="bg-rose-50 p-4 rounded-2xl border-2 border-dashed border-rose-200 text-center mb-4">
              <p className="text-xs font-bold text-gray-500">رمز الغرفة</p>
              <input 
                value={roomId}
                onChange={e => setRoomId(e.target.value.toUpperCase().trim())}
                className="text-2xl font-display text-rose-600 tracking-widest bg-transparent border-none text-center w-full focus:outline-none"
                placeholder="أدخل الرمز"
              />
            </div>

            <div>
              <label className="block text-lg font-bold mb-2">اسم المشترك</label>
              <div className="relative">
                <input 
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  className="w-full p-4 pr-12 rounded-xl border-4 border-[var(--color-ink-black)] font-bold text-xl"
                  placeholder="أدخل اسمك هنا..."
                  required
                  maxLength={15}
                />
                <CartoonUser size={24} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50" />
              </div>
            </div>

            {error && (
              <p className="text-[var(--color-primary-red)] font-bold text-center bg-[var(--color-primary-red)]/10 p-3 rounded-lg border-2 border-[var(--color-primary-red)] text-sm">
                {error}
              </p>
            )}

            <button 
              type="submit"
              className="vintage-button w-full py-5 rounded-2xl text-2xl font-display bg-rose-600 text-white shadow-[0_8px_0_#9f1239]"
            >
              دخول اللعبة 🎮
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!roomState) {
    return <div className="min-h-screen bg-[var(--color-bg-cream)] flex items-center justify-center font-bold">جاري المزامنة مع خوادم اللعبة... ⏳</div>;
  }

  // Active describer's details
  const activeDescriber = remotePlayers.find(p => p.id === roomState.describerId);

  return (
    <div className="min-h-screen bg-[var(--color-bg-cream)] flex flex-col font-sans" dir="rtl">
      {/* Top Header */}
      <div className="bg-white border-b-4 border-black p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-black" style={{ backgroundColor: playerColor }} />
          <span className="font-bold">{playerName}</span>
        </div>
        <div className="bg-rose-50 px-4 py-1 rounded-full border border-black font-extrabold text-sm text-rose-700">
          الغرفة: {roomId}
        </div>
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full flex flex-col justify-between py-6">
        <AnimatePresence mode="wait">
          {roomState.gameState === 'waiting' && (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-4 my-auto"
            >
              <div className="w-24 h-24 bg-rose-100 ring-4 ring-rose-200 rounded-[2rem] border-4 border-black flex items-center justify-center mx-auto animate-bounce text-rose-600">
                <Sparkles size={48} />
              </div>
              <h2 className="text-2xl font-black">جاهز لـ "قول بس لا تقول"؟</h2>
              <p className="text-gray-500 font-bold max-w-xs mx-auto text-sm">بانتظار أن يبدأ المضيف اللعبة ونظام تبادل الكلمات عن بّعد!</p>

              <div className="bg-white p-4 rounded-2xl border-2 border-black space-y-2">
                <p className="text-xs font-bold text-gray-500">المتسابقون المتصلون حالياً:</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {remotePlayers.map(p => (
                    <div key={p.id} className="text-xs px-2.5 py-1 bg-gray-100 rounded-lg border font-bold" style={{ borderColor: p.color }}>
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {roomState.gameState === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 w-full"
            >
              {isDescriber ? (
                // Current Describer's Controls View
                <div className="space-y-4">
                  <div className="bg-rose-500 text-white p-3 rounded-2xl border-2 border-black font-black text-center text-sm shadow-[2px_2px_0px_black] animate-pulse">
                    🎤 دورك الآن في الوصف! لا تنطق بالكلمات الممنوعة!
                  </div>

                  {/* Timer & Turn Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-amber-50 rounded-xl border-2 border-black p-2 text-center text-xs font-bold">
                      <p className="opacity-75">نقاط الجولة</p>
                      <p className={`text-xl font-black ${roomState.turnScore >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {roomState.turnScore > 0 ? `+${roomState.turnScore}` : roomState.turnScore || 0}
                      </p>
                    </div>

                    <div className="bg-red-100 rounded-xl border-2 border-black p-2 text-center flex flex-col items-center justify-center">
                      <CartoonTimer className="w-6 h-6 animate-spin-slow text-red-600" />
                      <p className="text-xl font-black text-red-600 mt-0.5">{roomState.timeLeft} ث</p>
                    </div>

                    <div className="bg-emerald-50 rounded-xl border-2 border-black p-2 text-center text-xs font-bold">
                      <p className="opacity-75">إجابات صحيحة</p>
                      <p className="text-xl font-black text-emerald-800">{roomState.turnCorrect || 0}</p>
                    </div>
                  </div>

                  {/* Current Active Word Card */}
                  <div className="vintage-panel bg-yellow-50/70 rounded-3xl p-6 border-4 border-black text-center relative overflow-hidden shadow-[4px_4px_0px_black]">
                    <div className="my-4">
                      <span className="text-[10px] opacity-60 uppercase font-black block mb-1">الكلمة الحالية</span>
                      {revealed ? (
                        <h2 className="text-3xl sm:text-4xl font-black text-rose-700 bg-white border-2 border-dashed border-rose-300 py-3 rounded-2xl">
                          {currentQuestion?.answer}
                        </h2>
                      ) : (
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-300 bg-gray-200 border-2 border-dashed border-gray-300 py-3 rounded-2xl blur-sm select-none">
                          •••••••••
                        </h2>
                      )}

                      <button 
                        onClick={() => { playSound('click'); setRevealed(!revealed); }} 
                        className="mt-2 text-xs font-bold underline text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto"
                      >
                        {revealed ? <><EyeOff size={14} /> إخفاء مؤقتاً</> : <><Eye size={14} /> إظهار الكلمة</>}
                      </button>
                    </div>

                    {/* Prohibited words */}
                    <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-500 max-w-sm mx-auto">
                      <p className="text-xs font-black text-red-700 mb-2">🚫 الممنوعات (لا تقلها!):</p>
                      <div className="flex flex-col gap-1.5">
                        {currentQuestion?.tabooWords?.map((word, idx) => (
                          <div key={idx} className="bg-white border text-sm font-bold text-red-900 py-1.5 px-3 rounded-xl border-red-100">
                            • {word}
                          </div>
                        )) || <p className="text-xs opacity-55 text-gray-400">لا توجد ممنوعات</p>}
                      </div>
                    </div>
                  </div>

                  {/* Guess buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleNextWord('wrong')}
                      className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl border-2 border-black font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-[1px_1px_0px_black]"
                    >
                      <X size={18} /> <span>ممنوعة / خطأ</span>
                    </button>

                    <button 
                      onClick={() => handleNextWord('pass')}
                      className="bg-gray-400 hover:bg-gray-500 text-white p-4 rounded-xl border-2 border-black font-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-[1px_1px_0px_black]"
                    >
                      <span>تخطي</span>
                    </button>

                    <button 
                      onClick={() => handleNextWord('correct')}
                      className="col-span-2 bg-[var(--color-primary-green)] hover:bg-green-600 text-white p-4 rounded-xl border-2 border-black font-black text-xl flex items-center justify-center gap-2 shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-[1px_1px_0px_black]"
                    >
                      <Check size={24} /> <span>صحّت الإجابة! (+١)</span>
                    </button>
                  </div>
                </div>
              ) : (
                // Other Players / Guesser View
                <div className="space-y-6 text-center py-6">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full border-2 border-black flex items-center justify-center mx-auto text-emerald-600 animate-pulse">
                    <Sparkles size={36} />
                  </div>

                  <div className="bg-white p-6 rounded-3xl border-4 border-black shadow-[4px_4px_0px_black] space-y-4">
                    <h2 className="text-2xl font-black text-gray-800">ابدأ التخمين! 🧠</h2>
                    <p className="text-sm font-bold opacity-75">
                      الواصف الحالي: <span className="underline decoration-indigo-500 text-rose-600 font-extrabold">{activeDescriber?.name || 'زميلك'}</span>
                    </p>

                    <p className="text-gray-500 text-xs">استمع له بتركيز وحاول تخمين الكلمة قبل زملائك للفوز بالنقطة!</p>
                  </div>

                  {/* Timer and Score Sync */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 border-2 border-black p-4 rounded-2xl text-center">
                      <p className="text-xs font-bold text-red-800 mb-1">الوقت المتبقي</p>
                      <p className="text-3xl font-black text-red-600">{roomState.timeLeft} ث</p>
                    </div>

                    <div className="bg-yellow-50 border-2 border-black p-4 rounded-2xl text-center">
                      <p className="text-xs font-bold text-yellow-800 mb-1">نقاط الجولة الحالية</p>
                      <p className="text-3xl font-black text-yellow-600">+{roomState.turnScore || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {roomState.gameState === 'timesup' && (
            <motion.div 
              key="timesup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center"
            >
              <div className="inline-block bg-red-100 text-red-800 font-black px-4 py-2 rounded-2xl border border-red-300 animate-bounce">
                ⏱️ انتهى الوقت!
              </div>

              <h1 className="text-2xl font-black">انتهاء جولة {activeDescriber?.name || 'الواصف'}!</h1>
              <p className="text-xs text-gray-500 font-bold">بانتظار أن يقوم المضيف باختيار الدور التالي وحساب النتائج.</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 bg-white p-4 rounded-2xl border-2 border-black text-center shadow-[4px_4px_0px_black]">
                <div className="bg-green-50 rounded-xl p-2">
                  <span className="text-[10px] font-bold text-green-700">صح</span>
                  <p className="text-lg font-black text-green-800">+{roomState.turnCorrect || 0}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2">
                  <span className="text-[10px] font-bold text-red-700">خطأ</span>
                  <p className="text-lg font-black text-red-800">-{roomState.turnWrong || 0}</p>
                </div>
              </div>

              {/* History */}
              {roomState.turnHistory && roomState.turnHistory.length > 0 && (
                <div className="text-right space-y-2">
                  <p className="text-xs font-bold opacity-60">الكلمات التي ظهرت في هذا الدور:</p>
                  <div className="flex flex-wrap gap-1 justify-center max-h-36 overflow-y-auto bg-white p-3 rounded-xl border border-gray-200">
                    {roomState.turnHistory.map((h: any, i: number) => (
                      <div key={i} className={`text-[11px] px-2 py-1 rounded border font-semibold ${h.status === 'correct' ? 'bg-green-50 text-green-800 border-green-200' : h.status === 'wrong' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-gray-50 text-gray-600' }`}>
                        {h.status === 'correct' ? '✅' : h.status === 'wrong' ? '❌' : '🔄'} {h.word}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {roomState.gameState === 'ended' && (
            <motion.div 
              key="ended"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center my-auto"
            >
              <Award size={64} className="text-yellow-500 mx-auto animate-pulse" />
              <h1 className="text-3xl font-black">النتائج النهائية 🏆</h1>

              <div className="flex flex-col gap-2 max-w-sm mx-auto bg-white p-4 rounded-2xl border-2 border-black">
                {remotePlayers.sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                    <span className="font-bold">{idx + 1}. {p.name}</span>
                    <span className="bg-yellow-400 text-xs font-extrabold px-3 py-1 rounded-full border">{p.score || 0} ن</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Persistent score footer for user */}
      <div className="p-4 bg-white border-t-2 border-dashed border-gray-200 text-center font-bold text-xs text-gray-600 flex justify-between items-center">
        <span>أنت متصل بالخادم</span>
        <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-300 font-bold">مجموع نقاطك الكلي: {playerScore} ن</span>
      </div>
    </div>
  );
};

export default RemoteTaboo;
