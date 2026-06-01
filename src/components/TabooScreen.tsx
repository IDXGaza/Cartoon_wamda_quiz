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
        <h2 className="text-3xl font-black text-center mb-6 vintage-text">
          {question.answer}
        </h2>

        <div className="bg-red-100 p-4 rounded-xl border-2 border-red-400 mb-6 font-bold">
          <p className="text-red-800 text-center uppercase mb-2">كلمات ممنوعة</p>
          <ul className="text-center">
            {question.tabooWords?.map(word => (
              <li key={word} className="text-lg text-red-900">• {word}</li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={onWrong} className="bg-red-500 text-white p-6 rounded-2xl flex flex-col items-center gap-2 border-4 border-black font-bold">
            <X size={32} /> خطأ / ذكرت كلمة ممنوعة
          </button>
          <button onClick={onSkip} className="bg-gray-400 text-white p-6 rounded-2xl flex flex-col items-center gap-2 border-4 border-black font-bold">
            <RotateCcw size={32} /> تخطي
          </button>
          <button onClick={onCorrect} className="col-span-2 bg-green-500 text-white p-6 rounded-2xl flex flex-col items-center gap-2 border-4 border-black font-bold">
            <Check size={32} /> صحيح
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabooScreen;
