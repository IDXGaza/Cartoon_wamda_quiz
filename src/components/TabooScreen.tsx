import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Check, X, RotateCcw } from 'lucide-react';
import { Question } from '../types';
import { playSound } from '../utils/sound';

interface Props {
  question: Question;
  onCorrect: () => void;
  onWrong: () => void;
  onSkip: () => void;
}

const TabooScreen: React.FC<Props> = ({ question, onCorrect, onWrong, onSkip }) => {
  return (
    <div className="min-h-screen bg-[var(--color-bg-cream)] p-4 flex flex-col items-center">
      <div className="w-full max-w-md vintage-panel p-6 rounded-[2rem] border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)]">
        <h2 className="text-xl sm:text-3xl font-black text-center mb-4 vintage-text">
          {question.answer}
        </h2>

        <div className="bg-red-100 p-3 rounded-xl border-2 border-red-400 mb-4 font-bold">
          <p className="text-red-800 text-center uppercase mb-1 text-sm">كلمات ممنوعة</p>
          <ul className="text-center">
            {question.tabooWords?.map(word => (
              <li key={word} className="text-base text-red-900">• {word}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onWrong} className="bg-red-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 border-2 border-black font-bold text-sm">
            <X size={20} /> خطأ / ممنوعة
          </button>
          <button onClick={onSkip} className="bg-gray-400 text-white p-3 rounded-xl flex flex-col items-center gap-1 border-2 border-black font-bold text-sm">
            <RotateCcw size={20} /> تخطي
          </button>
          <button onClick={onCorrect} className="col-span-2 bg-green-500 text-white p-4 rounded-xl flex items-center justify-center gap-2 border-2 border-black font-bold">
            <Check size={24} /> صحيح
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabooScreen;
