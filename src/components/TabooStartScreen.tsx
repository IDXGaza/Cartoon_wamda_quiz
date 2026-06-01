import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, doc, onSnapshot, setDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GameConfig, Player } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { CartoonRocket } from './CartoonIcons';
import { useToast } from '../contexts/ToastContext';
import { playSound } from '../utils/sound';
import { isColorDark } from '../utils/color';

interface Props {
  config: GameConfig;
  roomId: string;
  onStart: () => void;
}

const TabooStartScreen: React.FC<Props> = ({ config, roomId, onStart }) => {
  const [remotePlayers, setRemotePlayers] = useState<Player[]>([]);
  const { showToast } = useToast();

  const getShareableUrl = () => {
    const origin = window.location.origin;
    const search = `?mode=taboo&roomId=${roomId}`;
    return origin + '/' + search;
  };

  const joinUrl = getShareableUrl();

  useEffect(() => {
    const playersRef = collection(db, 'rooms', roomId, 'players');
    const q = query(playersRef, orderBy('joinedAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      setRemotePlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `rooms/${roomId}/players`));
  }, [roomId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 sm:gap-8 animate-fade-in px-2">
      <div className="vintage-panel p-4 sm:p-10 rounded-2xl sm:rounded-[3rem] text-center border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] bg-[var(--color-bg-cream)] max-w-2xl w-full">
        <h2 className="text-2xl sm:text-4xl font-display text-[var(--color-ink-black)] mb-6">قول بس لا تقول - عن بُعد</h2>
        
        <div className="flex flex-col items-center gap-6">
          <QRCodeSVG value={joinUrl} size={200} />
          
          <div className="w-full bg-[var(--color-off-white)] p-4 rounded-xl border-2 border-black">
             <p className="font-bold text-sm">رمز الغرفة: {roomId}</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {remotePlayers.map(p => (
              <div key={p.id} className="px-4 py-2 rounded-xl border-2 border-black font-bold" style={{ backgroundColor: p.color }}>
                {p.name}
              </div>
            ))}
          </div>

          <button 
            onClick={onStart}
            disabled={remotePlayers.length < 2}
            className="w-full bg-[var(--color-primary-green)] p-6 rounded-2xl flex items-center justify-center gap-4 border-4 border-black font-bold text-2xl"
          >
            ابدأ اللعبة <CartoonRocket />
          </button>
        </div>
      </div>
    </div>
  );
};
export default TabooStartScreen;
