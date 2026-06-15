import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, doc, onSnapshot, setDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GameConfig, Player, Question } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { CartoonRocket } from './CartoonIcons';
import { useToast } from '../contexts/ToastContext';
import { playSound } from '../utils/sound';
import { isColorDark } from '../utils/color';

interface Props {
  config: GameConfig;
  questions: Question[];
  roomId: string;
  onStart: () => void;
}

const TabooStartScreen: React.FC<Props> = ({ config, questions = [], roomId: rawRoomId, onStart }) => {
  const roomId = rawRoomId.toUpperCase();
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);
  const { showToast } = useToast();

  const getShareableUrl = () => {
    const origin = window.location.origin;
    const pathname = '/';
    const search = `?mode=taboo&roomId=${roomId}`;
    
    if (origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-') + pathname + search;
    }
    return origin + pathname + search;
  };

  const joinUrl = getShareableUrl();
  const isPreview = window.location.hostname.includes('aistudio.google.com') || window.location.origin.includes('ais-dev-');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Create / initialize the remote Taboo room document in Firestore
    const roomRef = doc(db, 'rooms', roomId);
    setDoc(roomRef, {
      hostId: auth.currentUser.uid,
      gameState: 'waiting',
      mode: 'taboo',
      describerId: null,
      activePlayerIndex: 0,
      questionIndex: 0,
      timer: config.timerDuration || 60,
      questionsPool: questions,
      currentQuestion: questions[0] || null,
      turnHistory: [],
      turnScore: 0,
      turnCorrect: 0,
      turnWrong: 0,
      createdAt: new Date().toISOString()
    }).catch(err => handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}`));

    const playersRef = collection(db, 'rooms', roomId, 'players');
    const q = query(playersRef, orderBy('joinedAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setRemotePlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${roomId}/players`));
  }, [roomId, questions]);

  const handleStartGame = async () => {
    if (remotePlayers.length < 1) {
      showToast("يجب انضمام لاعب واحد على الأقل لبدء اللعبة عن بعد", "warning");
      return;
    }
    playSound('start');
    const roomRef = doc(db, 'rooms', roomId);
    try {
      await updateDoc(roomRef, {
        gameState: 'intro',
        activePlayerIndex: 0,
        describerId: remotePlayers[0].id,
        questionIndex: 0,
        questionsPool: questions,
        currentQuestion: questions[0] || null,
        timer: config.timerDuration || 60,
        timeLeft: config.timerDuration || 60,
        turnHistory: [],
        turnScore: 0,
        turnCorrect: 0,
        turnWrong: 0
      });
      onStart();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `rooms/${roomId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 sm:gap-8 animate-fade-in px-2">
      <div className="vintage-panel p-4 sm:p-10 rounded-2xl sm:rounded-[3rem] text-center border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] bg-[var(--color-bg-cream)] max-w-2xl w-full">
        <h2 className="text-2xl sm:text-4xl font-display text-[var(--color-ink-black)] mb-6">قول بس لا تقول - عن بُعد</h2>
        
        <div className="flex flex-col items-center gap-6">
          <QRCodeSVG value={joinUrl} size={200} />
          
          {isPreview && (
            <div className="bg-amber-100 p-3 rounded-lg border-2 border-amber-400 text-amber-900 text-xs font-bold text-center">
              ⚠️ أنت تستخدم رابط العرض (Preview). هذا الرابط لن يعمل مع الآخرين. يرجى استخدام رابط التطبيق المشترك (Deployment URL).
            </div>
          )}

          <div className="w-full bg-[var(--color-off-white)] p-4 rounded-xl border-2 border-black flex flex-col gap-2 items-center">
             <p className="font-bold text-sm hidden">رمز الغرفة: <span className="text-rose-600 font-extrabold text-lg select-all">{roomId}</span></p>
             <button 
               onClick={() => {
                 navigator.clipboard.writeText(joinUrl).then(() => showToast("تم نسخ رابط الانضمام!", "success"));
               }}
               className="text-xs text-blue-600 underline font-extrabold hover:text-blue-800"
             >
               نسخ رابط الانضمام 🔗
             </button>
          </div>

          <p className="font-bold text-gray-600 text-sm">اللاعبون المتصلون ({remotePlayers.length}) :</p>
          <div className="flex flex-wrap gap-2 justify-center min-h-[50px] bg-white/50 w-full p-4 rounded-2xl border-2 border-dashed border-gray-300">
            {remotePlayers.length === 0 ? (
              <p className="text-gray-400 text-xs my-auto">بانتظار دخول اللاعبين باستخدام الباركود أو الرابط...</p>
            ) : (
              remotePlayers.map((p, idx) => (
                <div key={p.id} className="px-4 py-2 rounded-xl border-2 border-black font-bold flex items-center gap-2 shadow-[2px_2px_0px_black]" style={{ backgroundColor: p.color || '#f3f4f6' }}>
                  <span className="bg-white/90 text-xs px-2 py-0.5 rounded border border-black">{idx + 1}</span>
                  <span>{p.name}</span>
                </div>
              ))
            )}
          </div>

          <button 
            onClick={handleStartGame}
            disabled={remotePlayers.length < 1}
            className={`w-full p-6 rounded-2xl flex items-center justify-center gap-4 border-4 border-black font-bold text-2xl shadow-[4px_4px_0px_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_black] transition-all ${remotePlayers.length < 1 ? 'bg-gray-300 opacity-60 cursor-not-allowed' : 'bg-[var(--color-primary-green)] text-white hover:bg-green-600'}`}
          >
            ابدأ اللعبة <CartoonRocket />
          </button>
        </div>
      </div>
      
      {/* Help tooltip for why start is disabled */}
      {remotePlayers.length < 1 && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-[2px_2px_0px_var(--color-ink-black)] flex items-center gap-2 mt-4">
          <span className="w-5 h-5 rounded-full bg-blue-300 text-blue-900 flex items-center justify-center text-xs">i</span>
          يجب انضمام لاعب واحد على الأقل (الواصف) لبدء اللعبة عن بعد
        </div>
      )}
    </div>
  );
};
export default TabooStartScreen;
