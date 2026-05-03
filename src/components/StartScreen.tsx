
import React from 'react';
import { motion } from 'framer-motion';
import { toggleFullScreen } from '../utils/fullscreen';
import { 
  CartoonRocket, 
  CartoonStar, 
  CartoonSparkles, 
  CartoonBot,
  CartoonEye
} from './CartoonIcons';
import { playSound } from '../utils/sound';

interface Props {
  onStart: () => void;
}

const StartScreen: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 relative">
      {/* Fullscreen Toggle Button */}
      <button 
        onClick={() => {
          playSound('click');
          toggleFullScreen();
        }}
        className="absolute top-4 right-4 bg-[var(--color-bg-cream)] border-4 border-[var(--color-ink-black)] p-3 rounded-2xl shadow-[4px_4px_0px_var(--color-ink-black)] z-50 hover:scale-110 transition-transform active:translate-y-1 active:shadow-none flex items-center gap-2"
        title="ملء الشاشة"
      >
        <CartoonEye size={24} className="text-[var(--color-primary-blue)]" />
        <span className="font-bold hidden sm:inline">ملء الشاشة</span>
      </button>
      {/* Playful background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ x: [0, 20, 0], y: [0, -30, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
          className="absolute top-20 left-[10%] opacity-20"
        >
          <CartoonStar size={80} className="text-[var(--color-primary-gold)]" />
        </motion.div>
        <motion.div 
          animate={{ x: [0, -20, 0], y: [0, 40, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 7, repeat: Infinity, delay: 1 }}
          className="absolute bottom-40 right-[15%] opacity-20"
        >
          <CartoonSparkles size={100} className="text-[var(--color-primary-blue)]" />
        </motion.div>
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 100 }}
        className="relative mb-12"
      >
        <div className="w-48 h-48 md:w-64 md:h-64 bg-white rounded-[3rem] border-8 border-[var(--color-ink-black)] shadow-[12px_12px_0px_var(--color-ink-black)] flex items-center justify-center relative z-10 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-gold)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CartoonRocket size={120} className="text-[var(--color-primary-red)] group-hover:scale-110 transition-transform duration-500" />
        </div>
        
        {/* Decorative badge */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -top-6 -right-6 bg-[var(--color-primary-gold)] border-4 border-[var(--color-ink-black)] p-4 rounded-2xl shadow-[4px_4px_0px_var(--color-ink-black)] z-20"
        >
          <CartoonSparkles size={32} className="text-[var(--color-ink-black)]" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h1 className="text-6xl md:text-8xl font-black text-[var(--color-ink-black)] vintage-text drop-shadow-[4px_4px_0px_white]">
          ومضة
        </h1>
        <p className="text-2xl md:text-3xl font-display text-[var(--color-bg-dark)] font-bold opacity-80">
          تحدي الذكاء.. بمتعة الكرتون!
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-16"
      >
        <button
          onClick={() => {
            playSound('click');
            onStart();
          }}
          className="group relative inline-flex items-center gap-6 bg-[var(--color-primary-green)] text-white px-12 py-6 rounded-[2.5rem] text-4xl font-black border-4 border-[var(--color-ink-black)] shadow-[0px_10px_0px_#1a3a2a] hover:translate-y-1 hover:shadow-[0px_6px_0px_#1a3a2a] active:translate-y-2 active:shadow-none transition-all"
        >
          <span>ابدأ الآن</span>
          <CartoonBot size={48} className="group-hover:rotate-12 transition-transform" />
          
          {/* Shine effect */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-[2rem]"></div>
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 text-sm font-bold text-[var(--color-bg-dark)]/50 uppercase tracking-widest"
      >
        Version 2.0 • Powered by Gemini AI
      </motion.div>
    </div>
  );
};

export default StartScreen;
