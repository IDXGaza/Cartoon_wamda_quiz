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

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="vintage-panel w-full max-w-md p-10 relative max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[3rem] border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] bg-[var(--color-bg-cream)]">
        <button 
          onClick={() => {
            playSound('click');
            setIsSettingsOpen(false);
          }}
          className="absolute top-6 left-6 w-14 h-14 bg-[var(--color-primary-red)] text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none"
        >
          <CartoonX size={32} />
        </button>
        
        <h2 className="text-4xl font-display text-[var(--color-ink-black)] mb-10 flex items-center gap-4">
          <CartoonGear size={48} className="animate-spin-slow" />
          <span>الإعدادات</span>
        </h2>

        <div className="space-y-10 bg-[var(--color-off-white)] p-8 rounded-[2.5rem] border-4 border-[var(--color-ink-black)] shadow-[inner_4px_4px_0px_rgba(0,0,0,0.1)]">
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
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
