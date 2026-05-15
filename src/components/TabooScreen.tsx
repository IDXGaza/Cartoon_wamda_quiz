import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, doc, onSnapshot, setDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GameConfig, Question, Player } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { useToast } from '../contexts/ToastContext';
import { playSound } from '../utils/sound';

interface Props {
  config?: GameConfig;
  questions?: Question[];
  players?: Player[];
  onFinish?: (players: Player[]) => void;
}

const TabooScreen: React.FC<Props> = ({ config, questions, players, onFinish }) => {
  const [roomId] = useState(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    const search = new URLSearchParams(window.location.search);
    return params.get('roomId') || search.get('roomId') || Math.random().toString(36).substring(2, 8).toUpperCase();
  });
  const [roomState, setRoomState] = useState<any>(null);
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { showToast } = useToast();

  const isHosting = !!questions;
  const isDescriber = !isHosting && hasJoined;

  useEffect(() => {
    if (!auth.currentUser) return;

    const roomRef = doc(db, 'rooms', roomId);
    if (isHosting) {
      setDoc(roomRef, {
        hostId: auth.currentUser.uid,
        gameState: 'waiting',
        currentWord: '',
        tabooWords: [],
        score: 0,
        createdAt: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, `rooms/${roomId}`));
    }

    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomState(snapshot.data());
      }
    });

    const playersRef = collection(db, 'rooms', roomId, 'players');
    const unsubPlayers = onSnapshot(query(playersRef, orderBy('joinedAt', 'asc')), (snapshot) => {
      setRemotePlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    });

    return () => { unsubRoom(); unsubPlayers(); };
  }, [roomId, isHosting]);

  const handleStart = async () => {
    if (!questions || questions.length === 0) return;
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      gameState: 'playing',
      currentWord: questions[0].text,
      tabooWords: questions[0].tabooWords || [],
      score: 0
    });
  };

  const handleJoin = async () => {
    if (!name) return;
    const playerRef = doc(db, 'rooms', roomId, 'players', auth.currentUser!.uid);
    await setDoc(playerRef, {
      name,
      score: 0,
      joinedAt: new Date().toISOString()
    });
    setHasJoined(true);
  };

  const nextWord = async (scoreChange: number) => {
    if (scoreChange !== 0) {
      playSound(scoreChange > 0 ? 'correct' : 'wrong');
    }

    const roomRef = doc(db, 'rooms', roomId);
    const newScore = (roomState?.score || 0) + (scoreChange > 0 ? 1 : 0);

    if (isHosting && questions) {
      if (currentQuestionIndex < questions.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        await updateDoc(roomRef, {
          currentWord: questions[nextIndex].text,
          tabooWords: questions[nextIndex].tabooWords || [],
          score: newScore
        });
      } else {
        await updateDoc(roomRef, { gameState: 'finished', score: newScore });
        onFinish?.(remotePlayers);
      }
    } else {
      await updateDoc(roomRef, { score: newScore });
    }
  };

  const joinUrl = `${window.location.origin}${window.location.pathname}#/?mode=taboo&roomId=${roomId}`;

  const currentWord = roomState?.currentWord || '';
  const tabooWords = roomState?.tabooWords || [];

  if (!roomState) {
    return <div className="flex h-screen items-center justify-center text-xl font-bold animate-pulse text-[var(--color-primary-blue)]">جاري الاتصال...</div>;
  }

  if (roomState.gameState !== 'playing') {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-[var(--color-bg-cream)]">
        <div className="vintage-panel p-8 rounded-[3rem] border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] bg-white text-center w-full max-w-sm">
          <h2 className="text-3xl font-display mb-6">تحدي "قول بس لا تقول"</h2>
          {isHosting ? (
            <>
              <div className="bg-[var(--color-bg-cream)] p-4 rounded-xl mb-6 border-2 border-[var(--color-ink-black)]">
                <QRCodeSVG value={joinUrl} size={150} className="mx-auto" />
              </div>
              <p className="text-sm font-bold mb-6">رمز الغرفة: {roomId}</p>
              <button onClick={handleStart} className="vintage-button bg-[var(--color-primary-green)] w-full py-4 rounded-2xl text-2xl font-display border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] active:shadow-none translate-y-1 active:translate-y-0">ابدأ التحدي</button>
            </>
          ) : !hasJoined ? (
            <div className="space-y-4">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسمك" className="w-full p-4 border-2 border-[var(--color-ink-black)] rounded-xl text-lg font-bold" />
              <button onClick={handleJoin} className="vintage-button bg-[var(--color-primary-blue)] w-full py-4 rounded-2xl text-2xl font-display border-2 border-[var(--color-ink-black)]">انضمام</button>
            </div>
          ) : (
            <p className="text-xl font-bold">بانتظار بدء اللعبة من المضيف...</p>
          )}
        </div>
      </div>
    );
  }

  if (isDescriber) {
    return (
      <div className="flex flex-col h-screen p-4 bg-[var(--color-bg-cream)]">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
          <h1 className="text-6xl font-display text-[var(--color-ink-black)]">{currentWord}</h1>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm p-4 bg-white rounded-3xl border-4 border-[var(--color-ink-black)]">
            {tabooWords.map((word: string) => (
              <div key={word} className="bg-[var(--color-primary-red)]/10 text-[var(--color-primary-red)] py-3 rounded-xl font-bold text-xl border-2 border-[var(--color-primary-red)]">
                {word}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => nextWord(1)} className="vintage-button bg-[var(--color-primary-green)] text-white py-4 rounded-2xl font-display text-xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">صح</button>
          <button onClick={() => nextWord(0)} className="vintage-button bg-[var(--color-primary-red)] text-white py-4 rounded-2xl font-display text-xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">خطأ</button>
          <button onClick={() => nextWord(0)} className="vintage-button bg-[var(--color-primary-blue)] text-white py-4 rounded-2xl font-display text-xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">تخطي</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-4 bg-[var(--color-bg-cream)] flex flex-col items-center justify-center gap-8">
      <div className="vintage-panel p-8 rounded-[2rem] border-4 border-[var(--color-ink-black)] bg-white text-center shadow-[6px_6px_0px_var(--color-ink-black)] w-full max-w-sm">
        <p className="text-lg font-bold text-[var(--color-bg-dark)] mb-2">النقاط</p>
        <p className="text-7xl font-display text-[var(--color-primary-green)]">{roomState?.score || 0}</p>
      </div>
      <div className="vintage-panel p-6 rounded-[2rem] border-4 border-[var(--color-ink-black)] bg-white text-center shadow-[6px_6px_0px_var(--color-ink-black)] w-full max-w-sm">
        <p className="text-lg font-bold text-[var(--color-bg-dark)] mb-1">اللاعبون</p>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {remotePlayers.length === 0 ? (
            <p className="text-sm font-bold opacity-50">بانتظار الواصف...</p>
          ) : (
            remotePlayers.map(player => (
              <div key={player.id} className="bg-[var(--color-bg-cream)] px-4 py-2 rounded-xl border-2 border-[var(--color-ink-black)] font-bold">
                {player.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TabooScreen;
