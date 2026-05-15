import React, { useState } from 'react';
import { GameMode, Difficulty, Question, QuestionType } from '../types';
import { saveToVault } from '../services/vaultService';
import { autoGenerateAllQuestions, parseQuestionsWithAI } from '../services/geminiService';
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
import { addUserCustomCategory } from '../services/categoryService';
import { CATEGORIES, getCategoryNames, getTopicsForCategory } from '../data/categoryStructure';

interface Props {
  onClose: () => void;
}

const BankManager: React.FC<Props> = ({ onClose }) => {
  const { showToast } = useToast();
  const [topic, setTopic] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(getCategoryNames()[0]);
  const [categories, setCategories] = useState(getCategoryNames());
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  const [mode, setMode] = useState<GameMode>(GameMode.GRID);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'ai'>('single');
  const [generationProgress, setGenerationProgress] = useState('');

  const showTopic = mode === GameMode.GRID || mode === GameMode.HEX_GRID || mode === GameMode.BUZZER || mode === GameMode.TIMED;

  const parseJeopardyText = (text: string) => {
    const questions: Question[] = [];
    let currentTopic = topic;
    let currentDifficulty = difficulty;
    let currentPoints = 100;

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('### ')) {
        currentTopic = trimmedLine.replace('### ', '').trim();
      } else if (trimmedLine.startsWith('#### فئة')) {
         const match = trimmedLine.match(/(\d+)/);
         currentPoints = match ? parseInt(match[0]) : 100;
         if (currentPoints < 200) currentDifficulty = Difficulty.BEGINNER;
         else if (currentPoints < 300) currentDifficulty = Difficulty.EASY;
         else if (currentPoints < 400) currentDifficulty = Difficulty.MEDIUM;
         else if (currentPoints < 500) currentDifficulty = Difficulty.HARD;
         else currentDifficulty = Difficulty.EXPERT;
      } else if (/^\d+\./.test(trimmedLine)) {
        const match = trimmedLine.match(/^\d+\.\s*(.*?)\s*\((.*?)\)$/);
        if (match) {
          questions.push({
            id: `user-bulk-${Date.now()}-${Math.random()}`,
            text: match[1],
            answer: match[2],
            category: selectedCategory,
            topic: currentTopic,
            mode: mode,
            difficulty: currentDifficulty,
            points: currentPoints,
            type: QuestionType.OPEN,
            generatedBy: 'User'
          });
        }
      }
    }
    return questions;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        if (activeTab === 'bulk') {
            const questions = parseJeopardyText(bulkText);
            for (const q of questions) await saveToVault(q);
            showToast(`تم حفظ ${questions.length} سؤال بنجاح!`, "success");
        } else {
            const newQuestion: Question = {
                id: `user-${Date.now()}`,
                text: question,
                answer: answer,
                category: selectedCategory,
                topic: topic,
                mode: mode,
                difficulty: difficulty,
                points: 100,
                type: mode === GameMode.TRUE_FALSE ? QuestionType.TRUE_FALSE : QuestionType.OPEN,
                generatedBy: 'User'
            };
            await saveToVault(newQuestion);
            await addUserCustomCategory(selectedCategory, topic); // Persist category
            showToast("تم حفظ السؤال في البنك بنجاح!", "success");
        }
        playSound('correct');
        setQuestion('');
        setAnswer('');
        setBulkText('');
    } catch (err) {
      showToast("فشل في الحفظ", "error");
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
          onClick={onClose} 
          className="w-12 h-12 bg-[var(--color-primary-red)] text-white rounded-xl flex items-center justify-center transition-transform hover:scale-110 border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none"
        >
          <CartoonX size={28} />
        </button>
      </div>

      <div className="space-y-6">
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
          <div className="col-span-1">
             <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">نوع اللعبة</label>
             <select 
               value={mode}
               onChange={e => setMode(e.target.value as GameMode)}
               className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl focus:outline-none shadow-[2px_2px_0px_var(--color-ink-black)]"
             >
               {Object.values(GameMode).map(m => <option key={m} value={m}>{m}</option>)}
             </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">التصنيف</label>
            <select 
              value={selectedCategory} 
              onChange={e => {
                if (e.target.value === 'add-new') setIsAddingCategory(true);
                else { setSelectedCategory(e.target.value); setIsAddingCategory(false); }
              }}
              className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="add-new">+ إضافة تصنيف جديد</option>
            </select>
          </div>
          
          {isAddingCategory ? (
            <div className="col-span-1">
               <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">اسم التصنيف الجديد</label>
               <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl" />
               <button onClick={async () => {
                  setCategories([...categories, newCategory]); 
                  setSelectedCategory(newCategory); 
                  setIsAddingCategory(false); 
                  await addUserCustomCategory(newCategory, ''); 
               }} className="mt-2 w-full bg-[var(--color-primary-green)] text-white p-2 rounded-lg">حفظ</button>
            </div>
          ) : showTopic && (
            <div className="col-span-1">
              <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">الفئة</label>
              <select 
                 value={topic}
                 onChange={e => setTopic(e.target.value)}
                 className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl"
              >
                 {getTopicsForCategory(selectedCategory).map(t => <option key={t} value={t}>{t}</option>)}
                 <option value="جديد">+ إضافة فئة جديدة</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">مساعد البنك الذكي</label>
            <textarea 
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl h-40 ltr"
              placeholder="مثال: أضف هذه الأسئلة إلى فئة التاريخ، موضوع: العصر العباسي..."
              required
            />
            <button 
              onClick={async () => {
                 setIsSaving(true);
                 try {
                     showToast("جاري معالجة طلبك...", "info");
                     const questions = await parseQuestionsWithAI(bulkText, mode, difficulty);
                     if (questions.length === 0) {
                        showToast("لم أتمكن من استخراج أسئلة من النص.", "error");
                        return;
                     }
                     for (const q of questions) {
                        await saveToVault(q);
                        await addUserCustomCategory(q.category, q.topic);
                     }
                     showToast(`تمت إضافة ${questions.length} سؤال بنجاح!`, "success");
                     setBulkText('');
                 } catch(e) { showToast("فشل في المعالجة", "error"); }
                 finally { setIsSaving(false); }
              }}
              disabled={isSaving}
              className="w-full py-4 text-center bg-[var(--color-primary-green)] text-white font-display text-xl rounded-xl border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]"
            >
              تنفيذ الأمر
            </button>
            <div className="border-t-2 border-[var(--color-ink-black)] pt-4 mt-4">
              <h4 className="font-display text-lg mb-2">أو التوليد العادي:</h4>
              <button 
                onClick={async () => {
                   setIsSaving(true);
                   try {
                       await autoGenerateAllQuestions(topic, difficulty, (msg) => setGenerationProgress(msg), new AbortController().signal);
                       showToast("تم توليد الأسئلة!", "success");
                   } catch(e) { showToast("فشل التوليد", "error"); }
                   finally { setIsSaving(false); }
                }}
                disabled={isSaving}
                className="w-full py-4 text-center bg-[var(--color-primary-gold)] border-4 border-[var(--color-ink-black)] rounded-xl"
              >
                توليد تلقائي (AI)
              </button>
            </div>
          </div>
        )}

        {(activeTab === 'single' || activeTab === 'bulk') && (
            <form onSubmit={handleSave} className="space-y-6">
              {activeTab === 'bulk' ? (
                <div>
                  <label className="block text-xl font-display text-[var(--color-bg-dark)] mb-2">قائمة الأسئلة</label>
                  <textarea 
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    className="w-full bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] rounded-xl p-4 font-display text-xl h-64 ltr"
                    placeholder="### جيبوردي&#10;#### فئة 100&#10;1. السؤال؟ (الإجابة)"
                    required
                  />
                </div>
              ) : (
                <>
                    <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="السؤال" className="w-full p-4 border-4 rounded-xl" />
                    <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="الإجابة" className="w-full p-4 border-4 rounded-xl" />
                </>
              )}
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-6 rounded-2xl text-3xl font-display bg-[var(--color-primary-green)] text-white"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </form>
        )}
      </div>
      </div>
    </div>
  );
};

export default BankManager;
