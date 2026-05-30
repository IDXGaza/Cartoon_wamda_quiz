import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings, Theme, AIModel } from '../contexts/SettingsContext';
import { testAI } from '../services/geminiService';
import { seedVault } from '../services/seederService';
import { playSound } from '../utils/sound';
import { toggleFullScreen, isFullScreen } from '../utils/fullscreen';
import { 
  CartoonX, 
  CartoonGear, 
  CartoonStar, 
  CartoonAlert, 
  CartoonCheck,
  CartoonRocket,
  CartoonRefresh,
  CartoonZap,
  CartoonEye
} from './CartoonIcons';

const SettingsModal: React.FC = () => {
  const { settings, updateSettings, isSettingsOpen, setIsSettingsOpen } = useSettings();
  const [testStatus, setTestStatus] = useState<{ loading: boolean, result: string | null, success: boolean }>({
    loading: false,
    result: null,
    success: false
  });
  const [seedStatus, setSeedStatus] = useState<{ loading: boolean, message: string }>({
    loading: false,
    message: ''
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(isFullScreen());
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleTestAI = async () => {
    playSound('click');
    setTestStatus({ loading: true, result: null, success: false });
    const res = await testAI(settings.aiModel);
    setTestStatus({ loading: false, result: res.message, success: res.success });
    
    // Clear status after 3 seconds
    setTimeout(() => {
      setTestStatus(prev => ({ ...prev, result: null }));
    }, 3000);
  };

  const handleSeedVault = async () => {
    playSound('power');
    setSeedStatus({ loading: true, message: 'جاري البدء...' });
    const success = await seedVault((msg) => {
      setSeedStatus(prev => ({ ...prev, message: msg }));
    });
    setSeedStatus(prev => ({ ...prev, loading: false }));
    if (success) {
      setTimeout(() => setSeedStatus({ loading: false, message: '' }), 5000);
    }
  };

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="vintage-panel vintage-panel-animate w-full max-w-md p-5 pb-5 md:p-8 md:pb-8 relative max-h-[90vh] flex flex-col rounded-[3rem] border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] bg-[var(--color-bg-cream)] overflow-hidden"
          >
            {/* Fixed Header: Title and Static Close Button */}
            <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0 z-20">
              <h2 className="text-3xl md:text-4xl font-display text-[var(--color-ink-black)] flex items-center gap-3">
                <CartoonGear size={36} className="animate-spin-slow" />
                <span>الإعدادات</span>
              </h2>
              <button 
                onClick={() => {
                  playSound('click');
                  setIsSettingsOpen(false);
                }}
                className="w-12 h-12 bg-[var(--color-primary-red)] text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform border-4 border-[var(--color-ink-black)] shadow-[3px_3px_0px_var(--color-ink-black)] active:translate-y-0.5 active:shadow-none shrink-0"
              >
                <CartoonX size={24} />
              </button>
            </div>

            {/* Scrollable container for parameters - wrapped in an overflow-hidden rounded container to prevent scrollbars from clipping the rounded corners */}
            <div className="flex-1 rounded-[2rem] border-4 border-[var(--color-ink-black)] bg-[var(--color-off-white)] shadow-[inner_4px_4px_0px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col">
              <div className="overflow-y-auto custom-scrollbar flex-1 p-4 md:p-8 space-y-6 md:space-y-8">
          {/* AI Connection Test */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-xl font-display text-[var(--color-bg-dark)] bg-[var(--color-primary-gold)] px-4 py-1 rounded-xl border-2 border-[var(--color-ink-black)] inline-block shadow-[2px_2px_0px_var(--color-ink-black)]">حالة الذكاء الاصطناعي</label>
                <button 
                  onClick={handleTestAI}
                  disabled={testStatus.loading}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border-2 border-[var(--color-ink-black)] text-sm font-bold transition-all shadow-[2px_2px_0px_var(--color-ink-black)] active:translate-y-0.5 active:shadow-none bg-[var(--color-bg-cream)] hover:bg-[var(--color-primary-gold)] ${
                    testStatus.loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {testStatus.loading ? <CartoonRefresh size={16} className="animate-spin" /> : <CartoonRocket size={16} />}
                  <span>اختبار الاتصال</span>
                </button>
              </div>
              
              <AnimatePresence>
                {testStatus.result && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-3 rounded-xl border-2 border-black text-xs font-bold shadow-[2px_2px_0px_rgba(0,0,0,1)] ${
                      testStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {testStatus.result}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-[var(--color-ink-black)] opacity-60 font-medium">تم ضبط التطبيق ليعتمد على الذكاء الاصطناعي المدمج لتوفير أفضل دقة في الأسئلة.</p>
          </div>

          {/* AI Model Selection */}
          <div className="space-y-4">
            <label className="text-xl font-display text-[var(--color-bg-dark)] bg-[var(--color-primary-gold)] px-4 py-1 rounded-xl border-2 border-[var(--color-ink-black)] inline-block shadow-[2px_2px_0px_var(--color-ink-black)]">نموذج الذكاء الاصطناعي</label>
            <select
              value={settings.aiModel}
              onChange={(e) => updateSettings({ aiModel: e.target.value as AIModel })}
              className="w-full bg-[var(--color-bg-cream)] border-4 border-[var(--color-ink-black)] rounded-2xl p-4 font-display text-xl shadow-[4px_4px_0px_var(--color-ink-black)] focus:outline-none"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="custom">نموذج مخصص (Custom)</option>
            </select>
            {settings.aiModel === 'custom' && (
              <input
                type="text"
                value={settings.customModel || ''}
                onChange={(e) => updateSettings({ customModel: e.target.value })}
                className="w-full bg-[var(--color-bg-cream)] border-4 border-[var(--color-ink-black)] rounded-2xl p-4 font-display text-xl shadow-[4px_4px_0px_var(--color-ink-black)] focus:outline-none"
                placeholder="أدخل اسم النموذج (مثال: meta-llama/llama-3-8b-instruct)"
                dir="ltr"
              />
            )}
          </div>

          {/* API Keys */}
          <div className="space-y-4">
            <label className="text-xl font-display text-[var(--color-bg-dark)] bg-[var(--color-primary-gold)] px-4 py-1 rounded-xl border-2 border-[var(--color-ink-black)] inline-block shadow-[2px_2px_0px_var(--color-ink-black)]">مفاتيح API</label>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-display text-[var(--color-bg-dark)] block mb-2 px-2">مفتاح الذكاء الاصطناعي (AI Key)</label>
                <input 
                  type="password" 
                  value={settings.apiKeys?.gemini || ''}
                  onChange={(e) => updateSettings({ apiKeys: { ...settings.apiKeys, gemini: e.target.value } })}
                  className="w-full bg-[var(--color-bg-cream)] border-4 border-[var(--color-ink-black)] rounded-2xl p-4 font-display text-xl shadow-[4px_4px_0px_var(--color-ink-black)] focus:outline-none"
                  placeholder="AIzaSy..."
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Timed Mode Duration */}
          <div className="space-y-4">
            <label className="text-xl font-display text-[var(--color-bg-dark)] bg-[var(--color-primary-gold)] px-4 py-1 rounded-xl border-2 border-[var(--color-ink-black)] inline-block shadow-[2px_2px_0px_var(--color-ink-black)]">مدة "تحدي الوقت" (ثانية)</label>
            <div className="relative">
              <input 
                type="number" 
                min="30" 
                max="300" 
                step="10"
                value={settings.timedDuration}
                onChange={(e) => updateSettings({ timedDuration: parseInt(e.target.value) || 120 })}
                className="w-full bg-[var(--color-bg-cream)] border-4 border-[var(--color-ink-black)] rounded-2xl p-5 font-display text-3xl shadow-[4px_4px_0px_var(--color-ink-black)] focus:outline-none"
              />
              <CartoonRocket size={32} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-primary-red)]" />
            </div>
          </div>

          {/* Reset App State */}
          <div className="space-y-4 mt-6">
            <button 
              onClick={() => {
                playSound('click');
                import('../utils/playedQuestions').then(module => {
                  module.clearPlayedQuestionHashes();
                  setTestStatus({ loading: false, result: 'تم تصفير سجل الأسئلة بنجاح!', success: true });
                  setTimeout(() => setTestStatus(prev => ({ ...prev, result: null })), 3000);
                });
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-4 border-[var(--color-ink-black)] font-bold transition-all shadow-[4px_4px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none bg-slate-200 hover:bg-slate-300"
            >
              <CartoonRefresh size={24} />
              <span>تصفير الأسئلة الملعوبة (السماح بتكرار الأسئلة السابقة)</span>
            </button>
          </div>
        </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
  );
};

export default SettingsModal;
