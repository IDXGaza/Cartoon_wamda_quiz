import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { CartoonUser, CartoonLightning } from './CartoonIcons';
import { motion } from 'motion/react';

const RemoteTaboo: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [roomState, setRoomState] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const parseRoomId = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
      const id = searchParams.get('roomId') || hashParams.get('roomId');
      if (id) {
        setRoomId(id.toUpperCase().trim());
      }
    };
    parseRoomId();
  }, []);

  useEffect(() => {
    if (!isJoined || !roomId) return;
    const roomRef = doc(db, 'rooms', roomId);
    const unsub = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomState(snapshot.data());
      } else {
        setError('الغرفة غير موجودة');
        setIsJoined(false);
      }
    });
    return () => unsub();
  }, [isJoined, roomId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomId.trim() || !auth.currentUser) return;
    try {
      await setDoc(doc(db, 'rooms', roomId, 'players', auth.currentUser.uid), {
        name: playerName,
        score: 0,
        joinedAt: new Date().toISOString()
      });
      setIsJoined(true);
    } catch (err) {
      setError('فشل الانضمام');
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-cream)] p-6 flex items-center justify-center font-sans" dir="rtl">
        <div className="vintage-panel p-8 rounded-[2.5rem] w-full max-w-md border-4 border-[var(--color-ink-black)] bg-white">
          <form onSubmit={handleJoin} className="space-y-6">
            <input value={roomId} onChange={e => setRoomId(e.target.value.toUpperCase())} placeholder="رمز الغرفة" className="w-full p-4 border border-black rounded-lg" required />
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="اسمك" className="w-full p-4 border border-black rounded-lg" required />
            <button type="submit" className="w-full py-5 rounded-2xl text-2xl font-display bg-[var(--color-primary-green)] text-white">دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-cream)] flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="vintage-panel p-8 rounded-[2.5rem] w-full max-w-md border-4 border-[var(--color-ink-black)] bg-white text-center">
            {roomState?.gameState === 'waiting' ? (
                <h2 className="text-3xl font-display">بانتظار المضيف...</h2>
            ) : (
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">اللعبة جارية!</h2>
                    <p className="text-xl font-bold">بانتظار المضيف لإنهاء هذه الكلمة...</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default RemoteTaboo;
