
import React, { useState } from 'react';
import { GameMode, Difficulty, Question, QuestionType } from '../types';
import { saveToVault } from '../services/vaultService';
import { autoGenerateAllQuestions } from '../services/geminiService';
import { playSound } from '../utils/sound';
import { 
  CartoonPlus, 
  CartoonX, 
  CartoonCheck, 
  CartoonAlert,
  CartoonBook,
  CartoonStar,
  CartoonSparkles
} from './CartoonIcons';
import { useToast } from '../contexts/ToastContext';

interface Props {
  onClose: () => void;
}

const BankManager: React.FC<Props> = ({ onClose }) => {
  const { showToast } = useToast();
  const [topic, setTopic] = useState('معلومات عامة');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [mode, setMode] = useState<GameMode>(GameMode.HEX_GRID);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [isBulk, setIsBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const getPlaceholder = () => {
    switch (mode) {
      case GameMode.HEX_GRID:
        return "ملك الغابة؟ | أسد\nأكبر الكواكب؟ | المشتري\n(تأكد أن الإجابة تبدأ بالحرف المراد استخدام في الشبكة)";
      case GameMode.TRUE_FALSE:
        return "الأخطبوط له 3 قلوب؟ | صواب\nالشمس تدور حول الأرض؟ | خطأ";
      case GameMode.GRID:
        return "عاصمة فرنسا؟ | باريس | 200\nمكتشف الجاذبية؟ | نيوتن | 500\n(سؤال | إجابة | نقاط)";
      case GameMode.SILENT_GUESS:
        return "رجل فضاء يمشي على القمر | رائد فضاء\nطباخ يحرق الطعام | طباخ";
      default:
        return "السؤال هنا؟ | الإجابة هنا";
    }
  };

  const handleBulkSave = async () => {
    if (!bulkText.trim()) return;
    setIsSaving(true);
    try {
      const lines = bulkText.split('\n').filter(l => l.trim().includes('|'));
      const questionsToSave: Question[] = lines.map(line => {
        const parts = line.split('|').map(s => s.trim());
        const qText = parts[0];
        const aText = parts[1];
        const pVal = parts[2] ? parseInt(parts[2]) : 100;
        
        const normalizedAnswer = aText.replace(/^(ال|الـ)/, "").trim();
        const firstLetter = normalizedAnswer[0];

        return {
          id: `user-bulk-${Date.now()}-${Math.random()}`,
          text: qText,
          answer: aText,
          category: topic,
          mode: mode,
          difficulty: difficulty,
          points: pVal,
          letter: mode === GameMode.HEX_GRID ? firstLetter : undefined,
          type: mode === GameMode.TRUE_FALSE ? QuestionType.TRUE_FALSE : QuestionType.OPEN,
          generatedBy: 'User'
        };
      });

      for (const q of questionsToSave) {
        await saveToVault(q);
      }
      
      showToast(`تم حفظ ${questionsToSave.length} سؤال بنجاح!`, "success");
      setBulkText('');
      setIsBulk(false);
      playSound('correct');
    } catch (err) {
      showToast("فشل في الحفظ الجماعي", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'ai'>('single');
  const [generationProgress, setGenerationProgress] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleAiCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsSaving(false);
      setGenerationProgress('تم إلغاء التوليد.');
      showToast("تم إلغاء عملية التوليد", "info");
    }
  };

  const handleAiGenerate = async () => {
    if (!topic.trim()) {
      showToast("يرجى إدخال موضوع للتوليد", "error");
      return;
    }
    const controller = new AbortController();
    setAbortController(controller);
    
    setIsSaving(true);
    setGenerationProgress('جاري البدء...');
    try {
      await autoGenerateAllQuestions(topic, difficulty, (msg) => {
        setGenerationProgress(msg);
      }, controller.signal);
      showToast("تم توليد جميع الأسئلة بنجاح!", "success");
      setGenerationProgress('');
      playSound('correct');
    } catch (err: any) {
      if (err.message !== "تم إلغاء التوليد") {
        showToast(err.message || "فشل التوليد التلقائي", "error");
      }
    } finally {
      setAbortController(null);
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulk) {
      await handleBulkSave();
      return;
    }
    if (!topic || !question || !answer) {
      showToast("يرجى ملء جميع الحقول", "error");
      return;
    }

    setIsSaving(true);
    try {
      const newQuestion: Question = {
        id: `user-${Date.now()}`,
        text: question,
        answer: answer,
        category: topic,
        mode: mode,
        difficulty: difficulty,
        points: 100,
        type: mode === GameMode.TRUE_FALSE ? QuestionType.TRUE_FALSE : QuestionType.OPEN,
        generatedBy: 'User'
      };

      await saveToVault(newQuestion);
      showToast("تم حفظ السؤال في البنك بنجاح!", "success");
      
      // Reset only question and answer to allow rapid entry for same topic/mode
      setQuestion('');
      setAnswer('');
      playSound('correct');
    } catch (err) {
      console.error("Failed to save to bank", err);
      showToast("فشل في حفظ السؤال", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="vintage-panel p-8 md:p-12 max-w-3xl mx-auto animate-fade-up relative overflow-hidden rounded-[3rem] border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] bg-[var(--color-bg-cream)]">
      <div className="flex justify-between items-center mb-10 bg-[var(--color-primary-gold)] p-6 rounded-[2rem] border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
        <h2 className="text-3xl md:text-4xl font-display text-[var(--color-ink-black)] flex items-center gap-4">
          <CartoonBook size={40} />
          <span>إضافة سؤال للبنك</span>
        </h2>
        <button 
          onClick={() => {
            playSound('click');
            onClose();
          }} 
          className="w-12 h-12 bg-[var(--color-primary-red)] text-white rounded-xl flex items-center justify-center transition-transform hover:scale-110 border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none"
        >
          <CartoonX size={28} />
        </button>
      </div>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => { playSound('click'); setActiveTab('single'); }}
          className={`flex-1 py-4 rounded-2xl font-display text-lg border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] transition-all ${activeTab === 'single' ? 'bg-[var(--color-primary-gold)] ring-4 ring-white/50' : 'bg-white opacity-60'}`}
        >
          سؤال واحد
        </button>
        <button 
          onClick={() => { playSound('click'); setActiveTab('bulk'); }}
          className={`flex-1 py-4 rounded-2xl font-display text-lg border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] transition-all ${activeTab === 'bulk' ? 'bg-[var(--color-primary-gold)] ring-4 ring-white/50' : 'bg-white opacity-60'}`}
        >
          إضافة جماعية
        </button>
        <button 
          onClick={() => { playSound('click'); setActiveTab('ai'); }}
          className={`flex-1 py-4 rounded-2xl font-display text-lg border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] transition-all ${activeTab === 'ai' ? 'bg-[var(--color-primary-gold)] ring-4 ring-white/50' : 'bg-white opacity-60'}`}
        >
          توليد تلقائي (AI)
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${activeTab === 'ai' ? 'md:col-span-2' : ''}`}>
            <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">
              {activeTab === 'ai' ? 'موضوع التوليد (مثلاً: تاريخ، علوم، كرتون)' : 'الموضوع (الفئة)'}
            </label>
            {activeTab === 'ai' ? (
              <input 
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl focus:outline-none shadow-[2px_2px_0px_var(--color-ink-black)]"
                placeholder="أدخل موضوعاً شاملاً للتوليد..."
              />
            ) : (
              <select 
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl focus:outline-none shadow-[2px_2px_0px_var(--color-ink-black)]"
              >
                {['معلومات عامة', 'جغرافيا', 'علوم', 'رياضة', 'أحياء', 'اختراعات'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
          {activeTab !== 'ai' && (
            <div>
              <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">نوع اللعبة</label>
              <select 
                value={mode}
                onChange={e => setMode(e.target.value as GameMode)}
                className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl focus:outline-none shadow-[2px_2px_0px_var(--color-ink-black)]"
              >
                <option value={GameMode.HEX_GRID}>شبكة الحروف</option>
                <option value={GameMode.GRID}>الشبكة الكلاسيكية</option>
                <option value={GameMode.BUZZER}>تحدي البازر</option>
                <option value={GameMode.TIMED}>تحدي الوقت</option>
                <option value={GameMode.TRUE_FALSE}>صواب أم خطأ</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-[var(--color-primary-gold)]/10 rounded-2xl border-4 border-[var(--color-primary-gold)]">
              <CartoonStar size={40} className="text-[var(--color-primary-gold)]" />
              <div>
                <h3 className="text-2xl font-bold font-display text-[var(--color-ink-black)] mb-1">توليد 4 جولات كاملة</h3>
                <p className="text-lg font-display text-[var(--color-bg-dark)]/70">
                  سيقوم الذكاء الاصطناعي بتوليد أكثر من 300 سؤال تغطي كافة أوضاع اللعبة (شبكة الحروف، جيبوردي، بازر، إلخ) وحفظها في البنك الخاص بك.
                </p>
              </div>
            </div>

            {generationProgress && (
              <div className="space-y-4">
                <div className="bg-[var(--color-ink-black)] text-white p-6 rounded-2xl font-mono text-lg animate-pulse border-4 border-white/20">
                  <span className="text-[var(--color-primary-green)] mr-2">●</span>
                  {generationProgress}
                </div>
                {abortController && (
                    <button
                      onClick={handleAiCancel}
                      className="w-full py-4 rounded-2xl bg-[var(--color-primary-red)] text-white font-bold text-xl border-4 border-[var(--color-ink-black)]"
                    >
                      إلغاء التوليد
                    </button>
                )}
              </div>
            )}

            <button 
              onClick={handleAiGenerate}
              disabled={isSaving}
              className={`w-full py-8 rounded-[2rem] text-4xl font-black flex items-center justify-center gap-6 transition-all border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none ${
                isSaving ? 'bg-gray-400 opacity-50' : 'bg-[var(--color-primary-gold)] text-[var(--color-ink-black)] hover:bg-[var(--color-primary-gold)]/90'
              }`}
            >
              {isSaving ? 'جاري التوليد (قد يستغرق دقائق)...' : 'توليد البنك كاملاً بالذكاء'}
              <CartoonSparkles size={48} />
            </button>
          </div>
        )}

        {activeTab === 'bulk' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">قائمة الأسئلة (سؤال | إجابة)</label>
              <textarea 
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl focus:outline-none shadow-[2px_2px_0px_var(--color-ink-black)] h-64 ltr placeholder:text-gray-400"
                placeholder={getPlaceholder()}
                required
              />
              <p className="mt-2 text-xs text-slate-500 text-right">استخدم الرمز | للفصل بين السؤال والإجابة. كل سطر هو سؤال جديد.</p>
            </div>
            <button 
              type="submit"
              disabled={isSaving}
              className={`w-full py-6 rounded-2xl text-3xl font-display flex items-center justify-center gap-4 transition-all border-4 border-[var(--color-ink-black)] shadow-[6px_6px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none ${
                isSaving ? 'bg-gray-400 opacity-50' : 'bg-[var(--color-primary-green)] text-white hover:bg-[var(--color-primary-green)]/90'
              }`}
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ في البنك'}
              <CartoonPlus size={32} />
            </button>
          </form>
        )}

        {activeTab === 'single' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">نص السؤال</label>
              <textarea 
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl focus:outline-none shadow-[2px_2px_0px_var(--color-ink-black)] h-32"
                placeholder="اكتب السؤال هنا..."
                required
              />
            </div>

            <div>
              <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">الإجابة</label>
              <input 
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl focus:outline-none shadow-[2px_2px_0px_var(--color-ink-black)]"
                placeholder="اكتب الإجابة النهائية..."
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className={`w-full py-6 rounded-2xl text-3xl font-display flex items-center justify-center gap-4 transition-all border-4 border-[var(--color-ink-black)] shadow-[6px_6px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none ${
                isSaving ? 'bg-gray-400 opacity-50' : 'bg-[var(--color-primary-green)] text-white hover:bg-[var(--color-primary-green)]/90'
              }`}
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ في البنك'}
              <CartoonPlus size={32} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BankManager;
