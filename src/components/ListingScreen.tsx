import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { playSound } from '../utils/sound';

interface Props {
  questions?: Question[];
  onFinish: (result: { correct: number; incorrect: number }) => void;
}

const ListingScreen: React.FC<Props> = ({ questions = [], onFinish }) => {
  const [gameState, setGameState] = useState<'bidding' | 'playing' | 'finished'>('bidding');
  const [topic, setTopic] = useState('');
  const [targetCount, setTargetCount] = useState(5);
  const [timeLeft, setTimeLeft] = useState(30);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    }
    if (timeLeft === 0 && gameState === 'playing') {
      setGameState('finished');
      playSound('wrong');
    }
  }, [gameState, timeLeft]);

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(30); // Should come from settings
    playSound('start');
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 bg-[var(--color-bg-cream)]" dir="rtl">
      {gameState === 'bidding' ? (
        <div className="vintage-panel p-8 rounded-[2.5rem] border-4 border-[var(--color-ink-black)] bg-white shadow-[8px_8px_0px_var(--color-ink-black)] text-center w-full max-w-sm">
          <h2 className="text-4xl font-display mb-6">تحدي "كم تقدر تعدد؟"</h2>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="الموضوع" className="w-full p-4 mb-4 border-2 border-[var(--color-ink-black)] rounded-xl"/>
          <input type="number" value={targetCount} onChange={e => setTargetCount(parseInt(e.target.value))} className="w-full p-4 mb-4 border-2 border-[var(--color-ink-black)] rounded-xl"/>
          <button onClick={startGame} className="vintage-button bg-[var(--color-primary-green)] w-full py-5 rounded-2xl text-2xl font-display border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">ابدأ التحدي</button>
        </div>
      ) : gameState === 'playing' ? (
        <div className="w-full max-w-lg text-center space-y-6">
          <h2 className="text-3xl font-display">موضوع: {topic}</h2>
          <p className="text-2xl">المطلوب: {targetCount}</p>
          <p className="text-7xl font-display text-[var(--color-primary-red)]">{timeLeft}</p>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setCorrect(c => c + 1); playSound('correct'); }} className="p-6 bg-green-500 text-white text-2xl font-bold rounded-2xl border-4 border-black">صح</button>
            <button onClick={() => { setIncorrect(i => i + 1); playSound('wrong'); }} className="p-6 bg-red-500 text-white text-2xl font-bold rounded-2xl border-4 border-black">خطأ</button>
          </div>
        </div>
      ) : (
        <div className="vintage-panel text-center">
            <h2 className="text-4xl">انتهى التحدي</h2>
            <p>صحيح: {correct} / خاطئ: {incorrect}</p>
            <button onClick={() => onFinish({ correct, incorrect })} className="vintage-button">عرض النتائج</button>
        </div>
      )}
    </div>
  );
};

export default ListingScreen;
