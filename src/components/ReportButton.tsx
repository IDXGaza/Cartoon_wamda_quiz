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
      className={`absolute top-4 right-4 z-30 text-[9.5px] xs:text-[10.5px] sm:text-xs bg-red-500 text-white px-2 py-0.5 xs:px-2.5 xs:py-1 sm:px-3.5 sm:py-1.5 rounded-full shadow hover:bg-red-600 transition-colors flex items-center gap-1 font-bold border border-white/20 whitespace-nowrap active:scale-95 transition-transform ${className}`}
      title="إبلاغ عن سؤال"
    >
      <CartoonAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      <span>إبلاغ</span>
    </button>
  );
};
