import React from 'react';
import { Question } from '../types';
import { CartoonAlert } from './CartoonIcons';
import { playSound } from '../utils/sound';

export const ReportButton: React.FC<{ question: Question, onReport: (q: Question) => void, className?: string }> = ({ question, onReport, className }) => {
  const handleReportClick = () => {
    playSound('click');
    onReport(question);
  };

  return (
    <button 
      onClick={handleReportClick}
      className={`absolute top-4 right-4 z-10 text-xs bg-red-500 text-white px-3 py-1.5 rounded-full shadow hover:bg-red-600 transition-colors flex items-center gap-1 font-bold ${className}`}
      title="إبلاغ عن سؤال"
    >
      <CartoonAlert size={12} />
      إبلاغ
    </button>
  );
};
