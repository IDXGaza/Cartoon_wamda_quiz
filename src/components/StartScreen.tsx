
import React from 'react';
import { motion } from 'motion/react';
import { Share2 } from 'lucide-react';
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
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'لعبة ومضة',
          text: 'جرب لعبة ومضة الذكية!',
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch (error) {
        console.error('Error copying:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 relative">
      {/* Buttons */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button 
          onClick={() => {
            playSound('click');
            handleShare();
          }}
          className="bg-[var(--color-bg-cream)] border-4 border-[var(--color-ink-black)] p-3 rounded-2xl shadow-[4px_4px_0px_var(--color-ink-black)] hover:scale-110 transition-transform active:translate-y-1 active:shadow-none flex items-center gap-2"
          title="مشاركة"
        >
          <Share2 size={24} className="text-[var(--color-primary-green)] ml-2" />
          <span className="font-bold hidden sm:inline">مشاركة</span>
        </button>
        <button 
          onClick={() => {
            playSound('click');
            toggleFullScreen();
          }}
          className="bg-[var(--color-bg-cream)] border-4 border-[var(--color-ink-black)] p-3 rounded-2xl shadow-[4px_4px_0px_var(--color-ink-black)] hover:scale-110 transition-transform active:translate-y-1 active:shadow-none flex items-center gap-2"
          title="ملء الشاشة"
        >
          <CartoonEye size={24} className="text-[var(--color-primary-blue)]" />
          <span className="font-bold hidden sm:inline">ملء الشاشة</span>
        </button>
      </div>
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
        className="relative mb-6 sm:mb-12"
      >
        <div className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-white rounded-2xl sm:rounded-[3rem] border-4 sm:border-8 border-[var(--color-ink-black)] shadow-[6px_6px_0px_var(--color-ink-black)] sm:shadow-[12px_12px_0px_var(--color-ink-black)] flex items-center justify-center relative z-10 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary-gold)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <CartoonRocket size={80} className="w-16 h-16 sm:w-32 sm:h-32 md:w-40 md:h-40 text-[var(--color-primary-red)] group-hover:scale-110 transition-transform duration-500" />
        </div>
        
        {/* Decorative badge */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-[var(--color-primary-gold)] border-2 sm:border-4 border-[var(--color-ink-black)] p-2 sm:p-4 rounded-xl sm:rounded-2xl shadow-[2px_2px_0px_var(--color-ink-black)] sm:shadow-[4px_4px_0px_var(--color-ink-black)] z-20"
        >
          <CartoonSparkles size={20} className="text-[var(--color-ink-black)] sm:w-8 sm:h-8" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-2 sm:space-y-4"
      >
        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-[var(--color-ink-black)] vintage-text drop-shadow-[2px_2px_0px_white] sm:drop-shadow-[4px_4px_0px_white]">
          ومضة
        </h1>
        <p className="text-lg sm:text-2xl md:text-3xl font-display text-[var(--color-bg-dark)] font-bold opacity-80">
          تحدي الذكاء.. بمتعة الكرتون!
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 sm:mt-12 w-full px-4"
      >
        <button
          onClick={() => {
            playSound('click');
            onStart();
          }}
          className="group relative inline-flex items-center justify-center gap-2 sm:gap-6 bg-[var(--color-primary-green)] text-white w-full sm:w-auto px-6 py-4 sm:px-12 sm:py-6 rounded-xl sm:rounded-[2.5rem] text-2xl sm:text-4xl font-black border-4 border-[var(--color-ink-black)] shadow-[0px_4px_0px_#1a3a2a] sm:shadow-[0px_10px_0px_#1a3a2a] hover:translate-y-1 hover:shadow-[0px_4px_0px_#1a3a2a] active:translate-y-2 active:shadow-none transition-all"
        >
          <span>ابدأ الآن</span>
          <CartoonBot size={24} className="sm:w-12 sm:h-12 group-hover:rotate-12 transition-transform" />
          
          {/* Shine effect */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-lg sm:rounded-t-[2rem]"></div>
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-6 sm:mt-12 text-xs sm:text-sm font-bold text-[var(--color-bg-dark)]/50 uppercase tracking-widest"
      >
        Version 2.0 • Powered by Gemini AI
      </motion.div>
    </div>
  );
};

export default StartScreen;
