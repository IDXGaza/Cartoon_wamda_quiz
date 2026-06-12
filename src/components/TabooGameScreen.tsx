import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, X, RotateCcw, AlertTriangle, Trophy, Timer, Eye, EyeOff, Volume2, User, ArrowRight, RefreshCw, Star, Ban, Award } from 'lucide-react';
import { doc, onSnapshot, updateDoc, collection, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { GameConfig, Player, Question } from '../types';
import { playSound } from '../utils/sound';
import { CartoonTimer, CartoonTrophy, CartoonStar, CartoonAlert } from './CartoonIcons';

interface Props {
  config: GameConfig;
  questions: Question[];
  players: Player[];
  onFinish: (playersWithUpdatedScores: Player[]) => void;
  onClose: () => void;
}

const TabooGameScreen: React.FC<Props> = ({ config, questions = [], players: initialPlayers, onFinish, onClose }) => {
  const isRemote = config.tabooType === 'remote';
  const remoteRoomId = (config.sessionId || '').toUpperCase();

  // Local modes state
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'timesup' | 'ended'>('intro');
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(config.timerDuration || 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [turnHistory, setTurnHistory] = useState<{ word: string; status: 'correct' | 'wrong' | 'pass' }[]>([]);
  const [revealed, setRevealed] = useState(true);

  // Local stats
  const [turnScore, setTurnScore] = useState(0);
  const [turnCorrect, setTurnCorrect] = useState(0);
  const [turnWrong, setTurnWrong] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Remote-specific Firestore state
  const [remoteRoom, setRemoteRoom] = useState<any>(null);
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!isRemote) return;

    // Listen to room document
    const roomRef = doc(db, 'rooms', remoteRoomId);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRemoteRoom(snapshot.data());
      }
    });

    // Listen to players
    const playersRef = collection(db, 'rooms', remoteRoomId, 'players');
    const q = query(playersRef, orderBy('joinedAt', 'asc'));
    const unsubPlayers = onSnapshot(q, (snapshot) => {
      setRemotePlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    });

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [remoteRoomId, isRemote]);

  // Resolving synchronized variables depending on type
  const currentGameState = isRemote ? (remoteRoom?.gameState || 'waiting') : gameState;
  const currentPlayers = isRemote ? remotePlayers : players;

  const activeDescriberId = isRemote ? remoteRoom?.describerId : null;
  const currentActivePlayerIndex = isRemote 
    ? Math.max(0, currentPlayers.findIndex(p => p.id === activeDescriberId)) 
    : activePlayerIndex;

  const currentActivePlayer = currentPlayers[currentActivePlayerIndex] || currentPlayers[0];
  const currentActiveQuestion = isRemote ? remoteRoom?.currentQuestion : questions[questionIndex];

  const currentTimeLeft = isRemote ? (remoteRoom?.timeLeft || 0) : timeLeft;
  const currentTurnScore = isRemote ? (remoteRoom?.turnScore || 0) : turnScore;
  const currentTurnCorrect = isRemote ? (remoteRoom?.turnCorrect || 0) : turnCorrect;
  const currentTurnWrong = isRemote ? (remoteRoom?.turnWrong || 0) : turnWrong;
  const currentTurnHistory = isRemote ? (remoteRoom?.turnHistory || []) : turnHistory;

  // Local Mode timer logic
  useEffect(() => {
    if (isRemote) return; // Managed by custom describer device in remote mode

    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        if (timeLeft <= 6 && timeLeft > 1) {
          playSound('tick');
        }
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playSound('wrong');
      setGameState('timesup');
      
      // Update local player score
      setPlayers(prevPlayers => prevPlayers.map((p, idx) => {
        if (idx === activePlayerIndex) {
          return { ...p, score: Math.max(0, p.score + turnScore) };
        }
        return p;
      }));
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isTimerRunning, turnScore, activePlayerIndex, isRemote]);

  // Local turn handlers
  const getUnusedRandomIndex = (currentUsed: number[]) => {
    if (questions.length === 0) return 0;
    
    // available indices
    const available = questions.map((_, i) => i).filter(i => !currentUsed.includes(i));
    
    if (available.length === 0) {
      // All questions used! Reset the session but clear the current one to avoid immediate repeat
      // We don't want to reset COMPLETELY because we might want to know which one we just picked
      return -1; // Special signal to reset
    }
    
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  };

  const handleStartTurn = () => {
    playSound('start');
    setTurnScore(0);
    setTurnCorrect(0);
    setTurnWrong(0);
    setTurnHistory([]);
    setTimeLeft(config.timerDuration || 60);
    setGameState('playing');
    setIsTimerRunning(true);
    setRevealed(true);
    
    // Pick an unused random index
    let nextIdx = getUnusedRandomIndex(usedIndices);
    if (nextIdx === -1) {
      // Reset if all used
      nextIdx = Math.floor(Math.random() * questions.length);
      setUsedIndices([nextIdx]);
    } else {
      setUsedIndices(prev => [...prev, nextIdx]);
    }
    setQuestionIndex(nextIdx);
  };

  const moveToNextQuestion = () => {
    let nextIdx = getUnusedRandomIndex(usedIndices);
    if (nextIdx === -1) {
      // Reset if all used
      nextIdx = Math.floor(Math.random() * questions.length);
      setUsedIndices([nextIdx]);
    } else {
      setUsedIndices(prev => [...prev, nextIdx]);
    }
    setQuestionIndex(nextIdx);
  };

  const handleCorrect = () => {
    playSound('correct');
    setTurnScore(prev => prev + 1);
    setTurnCorrect(prev => prev + 1);
    const word = currentActiveQuestion ? currentActiveQuestion.answer : 'سؤال';
    setTurnHistory(prev => [...prev, { word, status: 'correct' }]);
    moveToNextQuestion();
  };

  const handleWrong = () => {
    playSound('wrong');
    setTurnScore(prev => prev - 1);
    setTurnWrong(prev => prev + 1);
    const word = currentActiveQuestion ? currentActiveQuestion.answer : 'سؤال';
    setTurnHistory(prev => [...prev, { word, status: 'wrong' }]);
    moveToNextQuestion();
  };

  const handlePass = () => {
    playSound('click');
    const word = currentActiveQuestion ? currentActiveQuestion.answer : 'سؤال';
    setTurnHistory(prev => [...prev, { word, status: 'pass' }]);
    moveToNextQuestion();
  };

  const handleNextPlayer = () => {
    playSound('click');
    setActivePlayerIndex(prev => (prev + 1) % players.length);
    setGameState('intro');
    moveToNextQuestion();
  };

  const handleEndGame = () => {
    playSound('win');
    setGameState('ended');
  };

  // Remote Mode Turn Transition handlers (controlled by Host screen)
  const handleRemoteNextPlayer = async () => {
    if (remotePlayers.length === 0) return;
    playSound('click');

    // Resolve index of next describer
    const nextPlayerIndex = (currentActivePlayerIndex + 1) % remotePlayers.length;
    const nextPlayer = remotePlayers[nextPlayerIndex];

    const nextQuestionIndex = (remoteRoom?.questionIndex || 0) + 1;
    const pool = remoteRoom?.questionsPool || questions;
    const nextQuestion = pool[nextQuestionIndex % pool.length];

    const roomRef = doc(db, 'rooms', remoteRoomId);
    try {
      await updateDoc(roomRef, {
        gameState: 'playing',
        activePlayerIndex: nextPlayerIndex,
        describerId: nextPlayer.id,
        currentQuestion: nextQuestion,
        questionIndex: nextQuestionIndex,
        timeLeft: config.timerDuration || 60,
        turnScore: 0,
        turnCorrect: 0,
        turnWrong: 0,
        turnHistory: []
      });
    } catch (err) {
      console.error("Failed to transition remote turn", err);
    }
  };

  const handleRemoteEndGame = async () => {
    playSound('win');
    const roomRef = doc(db, 'rooms', remoteRoomId);
    try {
      await updateDoc(roomRef, {
        gameState: 'ended'
      });
    } catch (err) {
      console.error("Failed to end remote game", err);
    }
  };

  if (!isRemote && questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <Ban size={64} className="text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-black mb-2">لا توجد أسئلة متوفرة!</h2>
        <p className="opacity-80 mb-6">يرجى العودة واختيار باقة أخرى أو إضافة الأسئلة يدويًا.</p>
        <button onClick={onClose} className="vintage-button bg-[var(--color-primary-blue)] text-white font-bold py-3 px-6 rounded-2xl border-4 border-black shadow-[4px_4px_0px_black]">نهاية</button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-2 py-4">
      {/* Top Header Stats */}
      {currentGameState !== 'ended' && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-amber-50 rounded-2xl border-4 border-black p-3 shadow-[4px_4px_0px_black]">
          <div className="flex items-center gap-2">
            <span className="bg-red-500 text-white w-3 h-3 rounded-full animate-ping" />
            <h3 className="font-bold text-sm sm:text-base text-[var(--color-ink-black)]">
              الدور لـ: <span className="underline font-black decoration-rose-500">{currentActivePlayer?.name}</span>
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 font-bold text-xs bg-white py-1 px-3 rounded-xl border border-black">
              ⭐ {currentActivePlayer?.score || 0} نقطة بالترتيب
            </div>
            <button 
              onClick={isRemote ? handleRemoteEndGame : handleEndGame} 
              className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold py-1 px-3 rounded-xl border-2 border-rose-800 transition-colors"
            >
              إنهاء اللعبة
            </button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {currentGameState === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="vintage-panel p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] text-center border-4 border-black shadow-[8px_8px_0px_black] bg-white max-w-2xl mx-auto"
          >
            <div className="inline-block bg-rose-100 text-rose-700 font-bold px-4 py-2 rounded-2xl border-2 border-rose-400 mb-6">
              دور اللاعب الحالي: {currentActivePlayer?.name} 🎤
            </div>

            <h1 className="text-3xl sm:text-5xl font-black mb-4 text-[var(--color-ink-black)]">سَلّم الجوال للمشرح!</h1>
            <p className="text-sm sm:text-base opacity-75 mb-8 max-w-md mx-auto">
              يجب على اللاعب <strong className="font-black text-rose-600">{currentActivePlayer?.name}</strong> حمل الجوال ووصف الكلمات لزملائه دون النطق بأي كلمة ممنوعة في القائمة!
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-8">
              {currentPlayers.map((p, idx) => (
                <div 
                  key={p.id} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black font-bold text-sm transition-all duration-300 ${idx === currentActivePlayerIndex ? 'ring-4 ring-rose-500 scale-105 shadow-[4px_4px_0px_black]' : 'opacity-60 bg-gray-100'}`}
                  style={{ backgroundColor: idx === currentActivePlayerIndex ? p.color : '#f3f4f6' }}
                >
                  <User size={16} />
                  <span>{p.name}</span>
                  <span className="bg-white/80 px-2 py-0.5 rounded-md border border-black text-xs font-black">{p.score || 0}ن</span>
                </div>
              ))}
            </div>

            <button 
              onClick={handleStartTurn}
              className="w-full sm:w-auto bg-[var(--color-primary-green)] text-white font-bold py-4 px-10 rounded-2xl text-xl sm:text-2xl border-4 border-black shadow-[6px_6px_0px_black] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all"
            >
              جاهز، ابدأ دوري! 🚀
            </button>
          </motion.div>
        )}

        {currentGameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* Countdown & Scoring Turn Header */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-100/50 rounded-2xl border-4 border-black p-3 text-center shadow-[4px_4px_0px_black]">
                <p className="text-xs font-bold opacity-75 mb-1">نقاط الجولة</p>
                <p className={`text-2xl font-black ${currentTurnScore >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {currentTurnScore > 0 ? `+${currentTurnScore}` : currentTurnScore}
                </p>
              </div>

              <div className="bg-rose-100 rounded-2xl border-4 border-black p-3 flex flex-col items-center justify-center shadow-[4px_4px_0px_black] col-start-2">
                <CartoonTimer className={`w-8 h-8 ${currentTimeLeft <= 10 ? 'animate-bounce text-red-600' : 'animate-spin-slow'}`} />
                <p className={`text-2xl font-black mt-1 ${currentTimeLeft <= 10 ? 'text-red-600 font-extrabold scale-110' : ''}`}>
                  {currentTimeLeft} ث
                </p>
              </div>
            </div>

            {isRemote ? (
              // Remote Host Screen - Doesn't show correct word / taboo words to prevent cheating on public display
              <div className="vintage-panel rounded-[2.5rem] p-6 sm:p-14 border-4 border-black shadow-[8px_8px_0px_black] bg-[var(--color-bg-cream)] text-center relative overflow-hidden flex flex-col items-center gap-6">
                
                {/* Timer & Turn Points displayed on Main Host Screen */}
                <div className="flex gap-4 w-full justify-center mb-4">
                  <div className="bg-red-50 border-4 border-black px-6 py-4 rounded-3xl text-center shadow-[4px_4px_0px_black]">
                    <p className="text-sm font-bold text-red-800 mb-1">الوقت المتبقي</p>
                    <p className={`text-5xl font-black ${remoteRoom?.timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                      {remoteRoom?.timeLeft || 0} ث
                    </p>
                  </div>
                  <div className="bg-green-50 border-4 border-black px-6 py-4 rounded-3xl text-center shadow-[4px_4px_0px_black]">
                    <p className="text-sm font-bold text-green-800 mb-1">النقاط هذا الدور</p>
                    <p className="text-5xl font-black text-green-600">
                      +{remoteRoom?.turnScore || 0}
                    </p>
                  </div>
                </div>

                <div className="w-24 h-24 bg-rose-100 rounded-full border-4 border-black flex items-center justify-center text-rose-600 animate-pulse">
                  <Star fill="currentColor" size={48} />
                </div>
                
                <h2 className="text-3xl sm:text-5xl font-black text-[var(--color-ink-black)]">تخّمن مع زملائك! 🤔🔊</h2>
                <p className="text-gray-600 font-bold max-w-md">
                  اللاعب <span className="text-rose-600 font-extrabold text-xl">{currentActivePlayer?.name}</span> يصف الكلمات الآن! تم إخفاء الكلمات الممنوعة لمنع الغش!
                </p>

                <div className="text-xs text-gray-400 bg-white border px-4 py-2 rounded-xl mt-2 mb-2">
                  ⚠️ يتم توجيه الأزرار والوقت من جوال الواصف مباشرة
                </div>

                {/* Main screen display of players scores */}
                <div className="w-full mt-4 bg-white/50 p-4 rounded-3xl border-4 border-black">
                  <p className="font-bold text-sm text-gray-500 mb-3">نتائج المتسابقين الحالية</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {remotePlayers.map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_black]">
                        <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: p.color }} />
                        <span className="font-bold">{p.name}</span>
                        <span className="bg-yellow-100 text-yellow-800 font-black px-2 py-0.5 rounded-md text-xs border border-yellow-300">
                          {p.score || 0} ن
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              // Local Host Screen - Shows word & taboo words on same device
              <div className="vintage-panel rounded-[2.5rem] p-6 sm:p-10 border-4 border-black shadow-[8px_8px_0px_black] bg-[var(--color-bg-cream)] text-center relative overflow-hidden">
                <div className="my-8">
                  <span className="text-xs opacity-50 uppercase tracking-widest block mb-2 font-black">الكلمة المراد تخمينها</span>
                  
                  <div className="flex items-center justify-center gap-2 mb-4">
                    {revealed ? (
                      <h2 className="text-4xl sm:text-6xl font-black text-[var(--color-ink-black)] tracking-tight px-4 py-2 bg-yellow-100 rounded-3xl border-2 border-dashed border-yellow-400 select-none">
                        {currentActiveQuestion?.answer}
                      </h2>
                    ) : (
                      <h2 className="text-4xl sm:text-6xl font-black text-gray-300 tracking-tight px-8 py-2 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 select-none blur-md">
                        ••••••••••••
                      </h2>
                    )}

                    <button 
                      onClick={() => { playSound('click'); setRevealed(!revealed); }} 
                      className="p-3 bg-white hover:bg-gray-100 border-2 border-black rounded-2xl shadow-[2px_2px_0px_black]"
                      title="إخفاء/إظهار الكلمة"
                    >
                      {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forbidden Words Box */}
                <div className="bg-red-50 p-5 rounded-3xl border-4 border-red-500 max-w-md mx-auto mb-4 shadow-[4px_4px_0px_red]">
                  <div className="flex items-center justify-center gap-2 text-red-700 font-extrabold mb-3 text-sm">
                    <Star fill="red" size={16} />
                    <span>الكلمات الممنوعة (لا تقلها!)</span>
                    <Star fill="red" size={16} />
                  </div>

                  <div className="flex flex-col gap-2 font-bold select-none text-base sm:text-lg">
                    {currentActiveQuestion?.tabooWords && currentActiveQuestion.tabooWords.length > 0 ? (
                      currentActiveQuestion.tabooWords.map((word, i) => (
                        <div key={i} className="bg-white/90 border border-red-200 py-2 px-4 rounded-xl text-red-800 flex items-center justify-center gap-2">
                          <span className="bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-black">🚫</span>
                          <span>{word}</span>
                        </div>
                      ))
                    ) : (
                      <p className="opacity-50 text-xs">لا توجد كلمات ممنوعة مسجلة</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick action buttons (Only for Local players on host screen) */}
            {!isRemote && (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleCorrect}
                  className="bg-[var(--color-primary-green)] hover:bg-green-600 text-white p-5 rounded-2xl border-4 border-black text-lg font-black flex items-center justify-center gap-3 shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all order-1"
                >
                  <Check size={26} /> <span>صح</span>
                </button>

                <button 
                  onClick={handleWrong}
                  className="bg-red-500 hover:bg-red-600 text-white p-5 rounded-2xl border-4 border-black text-lg font-black flex items-center justify-center gap-3 shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all order-2"
                >
                  <X size={26} /> <span>خطأ</span>
                </button>

                <button 
                  onClick={handlePass}
                  className="col-span-2 bg-gray-400 hover:bg-gray-500 text-white p-10 rounded-2xl border-4 border-black text-4xl font-black flex items-center justify-center gap-4 shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all order-3"
                >
                  <span>تخطي</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {currentGameState === 'timesup' && (
          <motion.div 
            key="timesup"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="vintage-panel p-6 sm:p-12 rounded-[2.5rem] text-center border-4 border-black shadow-[8px_8px_0px_black] bg-white max-w-2xl mx-auto"
          >
            <div className="inline-block bg-amber-100 text-amber-800 font-extrabold px-6 py-2 rounded-2xl border-2 border-amber-400 mb-6 flex items-center gap-2 justify-center w-fit mx-auto animate-bounce">
              <CartoonTimer className="w-5 h-5 animate-spin" />
              <span>انتهى الوقت!</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black mb-1 text-[var(--color-ink-black)]">ملخص جولة {currentActivePlayer?.name}</h1>
            <p className="text-gray-500 mb-8 font-bold">تم حفظ النقاط المكتسبة بنجاح</p>

            <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm mx-auto">
              <div className="bg-emerald-50 border-2 border-emerald-500 p-3 rounded-xl block text-center">
                <p className="text-xs font-bold text-emerald-800">إجابات صحيحة</p>
                <p className="text-lg font-black text-emerald-900">+{currentTurnCorrect}</p>
              </div>
              <div className="bg-red-50 border-2 border-red-500 p-3 rounded-xl block text-center">
                <p className="text-xs font-bold text-red-800">أخطاء ومخالفات</p>
                <p className="text-lg font-black text-red-900">-{currentTurnWrong}</p>
              </div>
            </div>

            {/* Word History */}
            {currentTurnHistory.length > 0 && (
              <div className="mb-8 text-right max-w-lg mx-auto">
                <p className="font-extrabold text-sm border-b pb-2 mb-3 text-gray-500">تفاصيل الكلمات في هذه الجولة:</p>
                <div className="flex flex-wrap gap-2 justify-center max-h-40 overflow-y-auto">
                  {currentTurnHistory.map((item: any, index: number) => (
                    <div 
                      key={index}
                      className={`px-3 py-1 bg-white border rounded-xl flex items-center gap-1.5 text-xs font-bold ${
                        item.status === 'correct' ? 'border-green-400 text-green-800 bg-green-50' :
                        item.status === 'wrong' ? 'border-red-400 text-red-800 bg-red-50' : 'border-gray-400 text-gray-600 bg-gray-50'
                      }`}
                    >
                      <span>{item.status === 'correct' ? '✅' : item.status === 'wrong' ? '❌' : '🔄'}</span>
                      <span>{item.word}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={isRemote ? handleRemoteNextPlayer : handleNextPlayer}
                className="bg-[var(--color-primary-blue)] hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-2xl text-lg border-4 border-black shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all"
              >
                الدور التالي 🎤
              </button>
              
              <button 
                onClick={isRemote ? handleRemoteEndGame : handleEndGame}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 px-8 rounded-2xl text-lg border-4 border-black shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all"
              >
                عرض النتائج النهائية 🏁
              </button>
            </div>
          </motion.div>
        )}

        {currentGameState === 'ended' && (
          <motion.div 
            key="ended"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="vintage-panel p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[3rem] text-center border-4 border-black shadow-[8px_8px_0px_black] bg-white max-w-2xl mx-auto"
          >
            {/* Winners Reveal Animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Award size={80} className="text-yellow-500 animate-pulse" />
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">🏆</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black mb-2 text-[var(--color-ink-black)]">النتائج النهائية</h1>
            <p className="text-sm font-bold text-gray-500 mb-8">إليك ترتيب أبطال "قول بس لا تقول"</p>

            {/* Leaderboard list */}
            <div className="flex flex-col gap-3 max-w-md mx-auto mb-8">
              {[...currentPlayers].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p, idx) => {
                const isFirst = idx === 0 && (p.score || 0) > 0;
                return (
                  <div 
                    key={p.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border-4 border-black font-black transition-all ${isFirst ? 'bg-yellow-50 shadow-[4px_4px_0px_black] scale-[1.03]' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center font-black ${isFirst ? 'bg-yellow-400' : 'bg-white'}`}>
                        {idx + 1}
                      </span>
                      <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: p.color }} />
                      <span className="text-sm sm:text-base">{p.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-white border border-black px-3 py-1 rounded-xl shadow-[2px_2px_0px_black]">
                      <span>{p.score || 0}</span>
                      <span className="text-xs opacity-60">ن</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => onFinish(currentPlayers)}
                className="bg-[var(--color-primary-green)] text-white font-bold py-4 px-8 rounded-2xl text-lg border-4 border-black shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all"
              >
                تأكيد النتيجة والعودة 🏁
              </button>

              <button 
                onClick={onClose}
                className="bg-gray-100 text-gray-800 font-bold py-4 px-8 rounded-2xl text-lg border-4 border-black shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TabooGameScreen;
