
import React, { useState, useEffect } from 'react';
import { Player, GameConfig, Question, GameMode, Difficulty } from '../types';
import confetti from 'canvas-confetti';
import { playSound } from '../utils/sound';
import { auth, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { CartoonStar, CartoonBook, CartoonCheck, CartoonHome, CartoonTrophy, CartoonGear } from './CartoonIcons';

interface Props {
  config: GameConfig;
  questions: Question[];
  players: Player[];
  onRestart: () => void;
}

const SummaryScreen: React.FC<Props> = ({ config, questions, players, onRestart }) => {
  const [isSaved, setIsSaved] = useState(false);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  
  useEffect(() => {
    playSound('win');
    // Fire confetti when the summary screen loads
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#D93025', '#F5C518', '#1E6FD9']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#D93025', '#F5C518', '#1E6FD9']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <div className="vintage-panel p-6 md:p-20 max-w-2xl mx-auto text-center animate-fade-up relative overflow-hidden rounded-3xl md:rounded-[3rem]">
      <div className="mb-8 md:mb-14 relative z-10">
        <div className="w-20 h-20 md:w-28 md:h-28 bg-[var(--color-primary-gold)] rounded-2xl md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] md:shadow-[6px_6px_0px_var(--color-ink-black)] animate-bounce-cartoon">
          <CartoonTrophy size={40} className="md:!w-16 md:!h-16" />
        </div>
        <h2 className="text-3xl md:text-7xl font-display text-[var(--color-ink-black)] mb-2 md:mb-4 drop-shadow-[2px_2px_0_var(--color-primary-gold)] md:drop-shadow-[4px_4px_0_var(--color-primary-gold)]">النتائج النهائية</h2>
        <p className="text-[var(--color-ink-black)] font-display text-sm md:text-lg bg-[var(--color-primary-gold)] inline-block px-4 py-1 md:px-8 md:py-2 rounded-xl md:rounded-2xl border-2 md:border-4 border-[var(--color-ink-black)] shadow-[2px_2px_0_var(--color-ink-black)] md:shadow-[4px_4px_0_var(--color-ink-black)]">أبطال المسابقة</p>
      </div>

      <div className="space-y-4 mb-8 md:mb-16 relative z-10">
        {sorted.map((p, idx) => (
          <div key={p.id} className={`flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-[2rem] transition-all border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] md:shadow-[6px_6px_0px_var(--color-ink-black)] ${idx === 0 ? 'bg-[var(--color-primary-gold)]/20 scale-105 z-10 relative' : 'bg-[var(--color-off-white)]'}`}>
            <div className="flex items-center gap-4 md:gap-6">
              <span className={`text-xl md:text-3xl font-display w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center border-2 md:border-4 border-[var(--color-ink-black)] shadow-[1px_1px_0_var(--color-ink-black)] md:shadow-[2px_2px_0_var(--color-ink-black)] ${idx === 0 ? 'bg-[var(--color-primary-gold)] text-[var(--color-ink-black)]' : 'bg-[var(--color-off-white)] text-[var(--color-bg-dark)]'}`}>
                {idx + 1}
              </span>
              <span className={`text-xl md:text-3xl font-display text-[var(--color-ink-black)]`}>{p.name}</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className={`text-3xl md:text-5xl font-display text-[var(--color-ink-black)] drop-shadow-[1px_1px_0_rgba(0,0,0,0.1)] md:drop-shadow-[2px_2px_0_rgba(0,0,0,0.1)]`}>{p.score}</span>
              <span className="text-[10px] md:text-xs font-display text-[var(--color-bg-dark)] mt-0 md:mt-1 bg-[var(--color-primary-gold)] px-1 md:px-2 py-0.5 rounded-lg border border-[var(--color-ink-black)] md:border-2">نقطة</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        <button 
          onClick={() => {
            playSound('click');
            onRestart();
          }} 
          className="vintage-button w-full py-4 md:py-8 rounded-xl md:rounded-[2.5rem] font-display text-xl md:text-4xl flex items-center justify-center gap-4 md:gap-6 bg-[var(--color-primary-gold)]"
        >
          <CartoonGear size={32} className="md:!w-16 md:!h-16 animate-spin-slow" />
          <span>القائمة الرئيسية</span>
        </button>
      </div>
    </div>
  );
};

export default SummaryScreen;
