import React, { useState } from 'react';
import { GameConfig, GameMode, QuestionType, Player, Difficulty } from '../types';
import { QUESTION_BANK } from '../data/localBank';
import { Type } from "@google/genai";
import { getAI, extractJson, generateQuestions } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';
import { playSound } from '../utils/sound';
import { CartoonHexagon, CartoonGrid, CartoonLightning, CartoonTimer, CartoonSilent, CartoonBot, CartoonPencil, CartoonPlus, CartoonTrash, CartoonRefresh, CartoonStar, CartoonGear, CartoonBook, CartoonAlert, CartoonRocket, CartoonX, CartoonSparkles } from './CartoonIcons';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onStart: (config: GameConfig) => void;
}

const QUICK_TOPICS = [
  { name: "تاريخ", icon: "📜" },
  { name: "جغرافيا", icon: "🌍" },
  { name: "علوم", icon: "🧪" },
  { name: "رياضة", icon: "⚽" },
  { name: "ثقافة عامة", icon: "💡" },
  { name: "أدب", icon: "📚" },
  { name: "فنون", icon: "🎨" },
  { name: "إسلاميات", icon: "🕌" }
];

const SILENT_GUESS_TOPICS = [
  { name: "أنمي", icon: "📺" },
  { name: "ماركة", icon: "🏷️" },
  { name: "شخص معروف", icon: "👤" },
  { name: "مكان مشهور", icon: "📍" },
  { name: "أفلام", icon: "🎬" },
  { name: "ألعاب", icon: "🎮" }
];

const JEOPARDY_SETS = [
  { name: "خماسية التحدي (منظم)", categories: ['جسم الإنسان', 'جغرافيا', 'علوم', 'تاريخ وثقافة', 'رياضة ومصارعة'], icon: "🏆" },
  { name: "منوعة كلاسيكية", categories: ['معلومات عامة', 'جغرافيا', 'تاريخ وثقافة', 'إسلاميات', 'رياضة ومصارعة'], icon: "🌟" },
  { name: "تكنولوجيا وفضاء", categories: ['علوم', 'فضاء وتقنية', 'تاريخ وثقافة', 'جسم الإنسان', 'معلومات عامة'], icon: "🚀" },
  { name: "لغة ودين", categories: ['لغة وأدب', 'إسلاميات', 'تاريخ وثقافة', 'معلومات عامة', 'جغرافيا'], icon: "📖" },
  { name: "مستكشف العالم", categories: ['جغرافيا', 'تاريخ وثقافة', 'فضاء وتقنية', 'علوم', 'معلومات عامة'], icon: "🌍" },
];

const CATEGORY_CLASSIFICATIONS = [
  { name: "العلوم والطبيعة", icon: "🧬", color: "bg-emerald-500", categories: ['علوم', 'فضاء وتقنية', 'جسم الإنسان', 'أحياء', 'كيمياء', 'فيزياء', 'طب', 'طبيعة', 'حيوانات'] },
  { name: "الجغرافيا والتاريخ", icon: "🌍", color: "bg-amber-500", categories: ['جغرافيا', 'تاريخ وثقافة', 'عواصم ومدن', 'دول', 'قارات', 'حضارات', 'تاريخ إسلامي'] },
  { name: "الثقافة والأدب", icon: "📚", color: "bg-indigo-500", categories: ['لغة وأدب', 'أدب', 'لغات', 'أقوال', 'أمثال وحكم', 'تقنية', 'فنون وترفيه'] },
  { name: "الدين والقيم", icon: "🕌", color: "bg-teal-500", categories: ['إسلاميات', 'إسلاميات وأدعية', 'خلفاء'] },
  { name: "رياضة ومنوعات", icon: "⚽", color: "bg-red-500", categories: ['رياضة ومصارعة', 'رياضة', 'معلومات عامة', 'متنوع', 'ذكاء'] }
];

const ConfigScreen: React.FC<Props> = ({ onStart }) => {
  const { showToast } = useToast();
  const [isOnline] = useState(navigator.onLine);
  const [topic, setTopic] = useState('ثقافة عامة');
  const [activeClassification, setActiveClassification] = useState<string>("العلوم والطبيعة");
  const [mode, setMode] = useState<GameMode>(GameMode.HEX_GRID);
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.OPEN);
  const [numQuestionsState, setNumQuestionsState] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [categories, setCategories] = useState<string[]>(['', '', '', '', '']);
  const [playersConfig, setPlayersConfig] = useState<{name: string, color: string}[]>([
    { name: 'الفريق الأحمر', color: '#ef4444' },
    { name: 'الفريق الأخضر', color: '#22c55e' }
  ]);

  const [inputMethod, setInputMethod] = useState<'ai' | 'manual' | 'bank'>('ai');
  const [buzzerTimeout, setBuzzerTimeout] = useState<number>(20);

  React.useEffect(() => {
    if (mode === GameMode.GRID && inputMethod === 'bank' && categories.every(c => c === '')) {
      setCategories(JEOPARDY_SETS[0].categories);
    }
  }, [mode, inputMethod, categories]);
  
  const [manualQuestions, setManualQuestions] = useState<Record<string, {
    question: string, 
    answer: string, 
    category?: string, 
    points?: number, 
    explanation?: string
  }>>({});
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);

  React.useEffect(() => {
    if (inputMethod === 'bank') {
      const bankTopics = ['معلومات عامة', 'جغرافيا', 'علوم', 'رياضة', 'أحياء', 'اختراعات'];
      if (!bankTopics.includes(topic)) {
        setTopic('معلومات عامة');
      }
    }
  }, [inputMethod, topic]);

  React.useEffect(() => {
    if (mode !== GameMode.GRID && inputMethod === 'ai') {
      setInputMethod('bank');
    }
  }, [mode, inputMethod]);

  const randomizeTopic = React.useCallback(() => {
    playSound('click');
    const topics = ["تاريخ إسلامي", "عواصم العالم", "اختراعات غيرت العالم", "أدب عالمي", "عجائب الدنيا", "فضاء ونجوم", "كيمياء حيوية", "تاريخ الأندلس", "أساطير قديمة", "أفلام ومسلسلات"];
    setTopic(topics[Math.floor(Math.random() * topics.length)]);
  }, [setTopic]);

  const clearManualQuestions = React.useCallback(() => {
    playSound('click');
    if (window.confirm("هل أنت متأكد من مسح جميع الأسئلة اليدوية؟")) {
      setManualQuestions({});
    }
  }, [setManualQuestions]);

  const LETTERS = [
    ['أ', 'ب', 'ت', 'ث'],
    ['ج', 'ح', 'خ', 'د'],
    ['ذ', 'ر', 'ز', 'س'],
    ['ش', 'ص', 'ض', 'ط'],
    ['ظ', 'ع', 'غ', 'ف'],
    ['ق', 'ك', 'ل', 'م'],
    ['ن', 'ه', 'و', 'ي']
  ];

  const JEOPARDY_STRUCTURE = [
    { category: 'الفئة الأولى', points: [100, 200, 300, 400, 500] },
    { category: 'الفئة الثانية', points: [100, 200, 300, 400, 500] },
    { category: 'الفئة الثالثة', points: [100, 200, 300, 400, 500] },
    { category: 'الفئة الرابعة', points: [100, 200, 300, 400, 500] },
    { category: 'الفئة الخامسة', points: [100, 200, 300, 400, 500] },
  ];

  const handleManualChange = (key: string, field: string, value: any) => {
    setManualQuestions(prev => ({
      ...prev,
      [key]: { ...prev[key] || { question: '', answer: '' }, [field]: value }
    }));
  };

  const isManualValid = () => {
    if (mode === GameMode.HEX_GRID) {
      for (const letter of LETTERS.flat()) {
        const q = manualQuestions[letter];
        if (!q || !q.question.trim() || !q.answer.trim()) return false;
        
        let ans = q.answer.trimStart();
        if (ans.startsWith('ال') && letter !== 'ا' && letter !== 'ل') {
          ans = ans.substring(2);
        }
        if (!ans.startsWith(letter) && !q.answer.trimStart().startsWith(letter)) return false;
      }
    } else if (mode === GameMode.GRID) {
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const key = `j-${i}-${j}`;
          const q = manualQuestions[key];
          if (!q || !q.question.trim() || !q.answer.trim()) return false;
        }
      }
    } else {
      for (let i = 0; i < numQuestionsState; i++) {
        const q = manualQuestions[`b-${i}`];
        if (!q || !q.question.trim() || !q.answer.trim()) return false;
      }
    }
    return true;
  };

  const generateAISamples = async () => {
    if (!navigator.onLine) {
      showToast("عذراً، توليد الأسئلة بالذكاء الاصطناعي يتطلب اتصالاً بالإنترنت.", "error");
      return;
    }
    if (!topic.trim()) {
      showToast("الرجاء إدخال موضوع المسابقة أولاً.", "error");
      return;
    }
    setIsGeneratingSamples(true);
    try {
      const requiredCount = mode === GameMode.HEX_GRID ? 28 : (mode === GameMode.GRID ? 25 : numQuestionsState);
      const targetModel = "gemini-2.0-flash";
      
      const generated = await generateQuestions(
        topic,
        requiredCount,
        [QuestionType.OPEN],
        mode,
        difficulty,
        targetModel,
        categories.filter(c => c.trim() !== '')
      );
      
      const samples: any = {};

      if (mode === GameMode.HEX_GRID) {
        // Precise letter matching for Hex Grid
        generated.forEach((q: any) => {
          if (q.letter) {
            const letter = q.letter.trim();
            samples[letter] = { question: q.text, answer: q.answer };
          }
        });

        // Force fill all 28 letters
        LETTERS.flat().forEach(l => {
          if (!samples[l] || !samples[l].question.trim() || !samples[l].answer.trim()) {
            samples[l] = { 
              question: `سؤال إبداعي يبدأ بحرف ${l} حول ${topic}`, 
              answer: l 
            };
          }
        });
      } else if (mode === GameMode.GRID) {
        // Initialize all 25 slots for Jeopardy Grid
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            samples[`j-${i}-${j}`] = { question: '', answer: '' };
          }
          samples[`cat-${i}`] = { category: categories[i] || `الفئة ${i+1}` };
        }

        const cats: Record<string, any[]> = {};
        generated.forEach(q => {
          const cat = (q.category || topic).trim();
          if (!cats[cat]) cats[cat] = [];
          cats[cat].push(q);
        });

        let foundCategories = Object.keys(cats).slice(0, 5);
        
        // Ensure we have 5 categories by splitting if AI was lazy
        if (foundCategories.length < 5 && generated.length >= 10) {
          const splitSize = Math.ceil(generated.length / 5);
          foundCategories = [];
          for (let i = 0; i < 5; i++) {
            const batch = generated.slice(i * splitSize, (i + 1) * splitSize);
            if (batch.length > 0) {
              const name = batch[0].category || `${topic} (${i+1})`;
              foundCategories.push(name);
              cats[name] = batch;
            }
          }
        }

        foundCategories.forEach((catName, i) => {
          samples[`cat-${i}`] = { category: catName };
          (cats[catName] || []).forEach((q, j) => {
            if (j < 5) {
              samples[`j-${i}-${j}`] = { 
                question: q.text || 'سؤال افتراضي', 
                answer: q.answer || 'إجابة' 
              };
            }
          });
        });

        // Cleanup remaining empty Jeopardy cells
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            const key = `j-${i}-${j}`;
            if (!samples[key].question.trim()) {
              samples[key] = { question: `سؤال جيبوردي المستوى ${j+1}`, answer: 'إجابة' };
            }
          }
        }
      } else {
        // Standard modes (Buzzer, Timed, True/False, Silent Guess)
        generated.forEach((q: any, i: number) => {
          samples[`b-${i}`] = { 
            question: q.text || (mode === GameMode.SILENT_GUESS ? 'خمن ما هذا؟' : 'سؤال افتراضي'), 
            answer: q.answer || 'إجابة',
            category: q.category,
            explanation: q.explanation
          };
        });
        
        // Ensure minimum count is met
        for (let i = 0; i < numQuestionsState; i++) {
          if (!samples[`b-${i}`] || !samples[`b-${i}`].question.trim()) {
            samples[`b-${i}`] = { question: 'سؤال المسابقة', answer: 'إجابة جاهزة' };
          }
        }
      }

      setManualQuestions(samples);
      showToast("تم توليد الأسئلة بنجاح!", "success");
    } catch (error) {
      console.error("Failed to generate samples:", error);
      showToast("حدث خطأ أثناء توليد الأسئلة. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsGeneratingSamples(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMethod === 'manual' && !isManualValid()) {
      playSound('wrong');
      showToast('الرجاء إكمال جميع الأسئلة المطلوبة بشكل صحيح', "error");
      return;
    }

    playSound('start');

    const players: Player[] = playersConfig.map((p) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: p.name,
      score: 0,
      color: p.color,
      powers: {
        FREEZE: 1,
        STEAL: 1,
        SHIELD: 1
      }
    }));

    // Convert manual questions to standard format if needed
    let finalManualQuestions: any[] = [];
    if (inputMethod === 'manual') {
      if (mode === GameMode.HEX_GRID) {
        // Handled by GameScreen via hexManualQuestions
      } else if (mode === GameMode.GRID) {
        JEOPARDY_STRUCTURE.forEach((cat, i) => {
          cat.points.forEach((p, j) => {
            const q = manualQuestions[`j-${i}-${j}`];
            finalManualQuestions.push({
              id: `m-${i}-${j}`,
              text: q.question,
              answer: q.answer,
              category: q.category || cat.category,
              points: p,
              type: QuestionType.OPEN,
              difficulty
            });
          });
        });
      } else {
        const count = numQuestionsState;
        for (let i = 0; i < count; i++) {
          const q = manualQuestions[`b-${i}`];
          finalManualQuestions.push({
            id: `m-b-${i}`,
            text: q?.question || '',
            answer: q?.answer || '',
            category: topic,
            points: 100,
            explanation: q?.explanation,
            type: QuestionType.OPEN,
            difficulty,
          });
        }
      }
    } else if (inputMethod === 'bank') {
      // Logic for Bank
      if (mode === GameMode.GRID) {
        const bank = QUESTION_BANK[GameMode.GRID] || [];
        // Use user-selected categories if available, else fallback to first 5 unique categories
        const selectedCats = categories.filter(c => c.trim() !== '');
        let cats = selectedCats.length >= 3 ? selectedCats : Array.from(new Set(bank.map(q => q.category))).slice(0, 5);
        
        // Ensure we always have 5 categories
        while (cats.length < 5) {
          cats.push(`تصنيف إضافي ${cats.length + 1}`);
        }

        cats.forEach((catName, i) => {
          let catQuestions = bank.filter(q => q.category === catName);
          
          const diffMap: Record<string, number> = { 'easy': 1, 'medium': 2, 'hard': 3 };

          // If we don't have 5 questions for this category, try to find ANY unused questions from the bank as fallback
          if (catQuestions.length < 5) {
            const usedTexts = new Set(finalManualQuestions.map(q => q.text));
            const extra = bank.filter(q => !usedTexts.has(q.text) && q.category !== catName);
            // Sort extra to prioritize fitting the difficulty profile later
            extra.sort((a, b) => (diffMap[a.difficulty] || 2) - (diffMap[b.difficulty] || 2));
            catQuestions = [...catQuestions, ...extra.slice(0, 5 - catQuestions.length)];
          }

          // Crucial: Sort all selected questions by difficulty before slicing/assigning
          catQuestions.sort((a, b) => (diffMap[a.difficulty] || 2) - (diffMap[b.difficulty] || 2));

          catQuestions.slice(0, 5).forEach((q, j) => {
            finalManualQuestions.push({
              id: `b-j-${i}-${j}`,
              text: q.text,
              answer: q.answer,
              category: catName, // Use the category name we targeted
              points: (j + 1) * 100,
              type: QuestionType.OPEN,
              difficulty: (q.difficulty?.toUpperCase() as Difficulty) || Difficulty.MEDIUM
            });
          });

          // absolute fallback if still not 5 questions for this column
          const currentCatCount = finalManualQuestions.filter(q => q.id.startsWith(`b-j-${i}-`)).length;
          if (currentCatCount < 5) {
            for (let j = currentCatCount; j < 5; j++) {
              finalManualQuestions.push({
                id: `b-j-${i}-${j}-fallback`,
                text: `سؤال إضافي حول ${catName} وموضوعات عامة`,
                answer: 'إجابة من البنك',
                category: catName,
                points: (j + 1) * 100,
                type: QuestionType.OPEN,
                difficulty: Difficulty.MEDIUM
              });
            }
          }
        });
      } else if (mode === GameMode.HEX_GRID) {
         // HEX_GRID handles bank directly in GameScreen if no manualQuestions
      } else {
        const modeBank = QUESTION_BANK[mode] || [];
        // Filter by topic if selected
        const filteredBank = topic && topic !== 'عام' ? modeBank.filter(q => q.category === topic) : modeBank;
        let bank = [...(filteredBank.length > 0 ? filteredBank : modeBank)];
        
        // Shuffle for variety using Fisher-Yates
        for (let i = bank.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bank[i], bank[j]] = [bank[j], bank[i]];
        }
        
        const count = numQuestionsState;
        for (let i = 0; i < count; i++) {
          const q = bank[i % bank.length] || { id: 'bk-def', text: 'ما هي عاصمة العالم في الثقافة والجمال؟', answer: 'باريس', category: 'عام', difficulty: 'medium' };
          finalManualQuestions.push({
            id: `bk-${q.id}-${i}-${Date.now()}`,
            text: q.text,
            answer: q.answer,
            category: q.category,
            points: 100,
            type: QuestionType.OPEN,
            difficulty: (q.difficulty?.toUpperCase() as Difficulty) || Difficulty.MEDIUM
          });
        }
      }
    }
    
    onStart({ 
      topic, 
      numQuestions: mode === GameMode.HEX_GRID ? 28 : (mode === GameMode.GRID ? 25 : numQuestionsState), 
      mode, 
      questionTypes: mode === GameMode.TRUE_FALSE ? [QuestionType.TRUE_FALSE] : [questionType], 
      difficulty,
      players,
      categories: mode === GameMode.GRID ? (inputMethod === 'bank' ? Array.from(new Set(finalManualQuestions.map(q => q.category))) : categories.filter(c => c.trim() !== '')) : [],
      manualQuestions: finalManualQuestions,
      hexMode: inputMethod,
      questionSource: inputMethod,
      hexManualQuestions: mode === GameMode.HEX_GRID && inputMethod === 'manual' ? manualQuestions as any : undefined,
      buzzerTimeout: buzzerTimeout,
      timerDuration: buzzerTimeout
    });
  };

  return (
    <div className="min-h-screen py-6 md:py-12 px-2 md:px-4 relative z-10">
      <div className="vintage-panel rounded-3xl md:rounded-[3rem] p-4 md:p-12 max-w-5xl mx-auto animate-fade-up relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
        
        <div className="text-center mb-8 md:mb-16 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 bg-[var(--color-primary-gold)] rounded-2xl md:rounded-3xl mb-4 md:mb-6 border-2 md:border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] md:shadow-[6px_6px_0px_var(--color-ink-black)]">
            <CartoonGear className="w-8 h-8 md:w-12 md:h-12 animate-spin-slow" />
          </div>
          <h1 className="text-3xl md:text-7xl font-bold mb-4 text-[var(--color-ink-black)] vintage-text">إعداد المسابقة</h1>
          
          {/* Join Room Section */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <p className="text-lg font-bold text-[var(--color-bg-dark)]">لديك رمز غرفة؟</p>
            <div className="flex gap-2 w-full max-w-sm">
              <input 
                type="text" 
                placeholder="أدخل الرمز هنا..." 
                className="vintage-input flex-1 p-4 text-center font-display"
                id="room-code-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const code = (e.target as HTMLInputElement).value.trim().toUpperCase();
                    if (code) window.location.href = `?mode=remote&roomId=${code}`;
                  }
                }}
              />
              <button 
                type="button"
                onClick={() => {
                  playSound('click');
                  const input = document.getElementById('room-code-input') as HTMLInputElement;
                  const code = input.value.trim().toUpperCase();
                  if (code) window.location.href = `?mode=remote&roomId=${code}`;
                  else showToast("الرجاء إدخال رمز الغرفة", "warning");
                }}
                className="vintage-button bg-[var(--color-primary-blue)] text-white px-6"
              >
                انضمام
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
          {/* Game Mode Selection */}
          <div className="space-y-8 animate-fade-in vintage-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-[var(--color-primary-gold)] border-2 md:border-4 border-[var(--color-ink-black)] flex items-center justify-center text-[var(--color-ink-black)] font-bold text-xl md:text-3xl shadow-[2px_2px_0px_var(--color-ink-black)] md:shadow-[4px_4px_0px_var(--color-ink-black)]">1</div>
              <label className="text-xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">نمط اللعب</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { val: GameMode.HEX_GRID, label: 'شبكة الحروف', icon: <CartoonHexagon size={48} />, desc: 'تحدي الحروف', color: 'text-[var(--color-primary-blue)]', ring: 'ring-[var(--color-primary-blue)]/50', activeBg: 'var(--color-primary-blue)', activeText: 'white' },
                { val: GameMode.GRID, label: 'شبكة النقاط', icon: <CartoonGrid size={48} />, desc: 'فئات ونقاط متدرجة', color: 'text-[var(--color-accent-sky)]', ring: 'ring-[var(--color-accent-sky)]/50', activeBg: 'var(--color-accent-sky)', activeText: 'var(--color-ink-black)' },
                { val: GameMode.BUZZER, label: 'تحدي السرعة', icon: <CartoonLightning size={48} />, desc: 'أسرع إجابة تفوز', color: 'text-[var(--color-primary-green)]', ring: 'ring-[var(--color-primary-green)]/50', activeBg: 'var(--color-primary-green)', activeText: 'white' },
                { val: GameMode.TIMED, label: 'سباق الوقت', icon: <CartoonTimer size={48} />, desc: 'أكبر عدد إجابات', color: 'text-[var(--color-primary-gold)]', ring: 'ring-[var(--color-primary-gold)]/50', activeBg: 'var(--color-primary-gold)', activeText: 'var(--color-ink-black)' },
                { val: GameMode.TRUE_FALSE, label: 'صواب أم خطأ؟', icon: <CartoonAlert size={48} />, desc: 'حقائق مذهلة', color: 'text-[var(--color-primary-red)]', ring: 'ring-[var(--color-primary-red)]/50', activeBg: 'var(--color-primary-red)', activeText: 'white' },
                { val: GameMode.SILENT_GUESS, label: 'بدون كلام', icon: <CartoonSilent size={48} />, desc: 'تخمين بدون نص', color: 'text-violet-600', ring: 'ring-violet-500/50', activeBg: '#8b5cf6', activeText: 'white' }
              ].map(m => (
                <button
                  key={m.val}
                  type="button"
                  onClick={() => {
                    playSound('click');
                    setMode(m.val);
                  }}
                  className={`vintage-button rounded-3xl p-8 flex flex-col items-center gap-4 text-center transition-all duration-300 ${mode === m.val ? `ring-4 ${m.ring} scale-105 shadow-[8px_8px_0px_var(--color-ink-black)]` : 'bg-[var(--color-off-white)] hover:scale-105'}`}
                  style={mode === m.val ? { backgroundColor: m.activeBg, color: m.activeText } : {}}
                >
                  <div className={`mb-2 transition-colors ${mode === m.val ? 'text-inherit' : m.color}`}>{m.icon}</div>
                  <h3 className="font-bold text-xl vintage-text">{m.label}</h3>
                  <p className="text-xs opacity-70">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Topic Selection */}
          <div className="space-y-8 animate-fade-in vintage-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-cyan-500"></div>
            <div className="flex items-center gap-3 md:gap-4 mb-6">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-[var(--color-accent-sky)] border-2 md:border-4 border-[var(--color-ink-black)] flex items-center justify-center text-[var(--color-ink-black)] font-bold text-xl md:text-3xl shadow-[2px_2px_0px_var(--color-ink-black)] md:shadow-[4px_4px_0px_var(--color-ink-black)]">2</div>
              <label className="text-xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">
                {mode === GameMode.GRID ? 'اختيار الفئات الجاهزة' : 'موضوع المسابقة الرئيسي'}
              </label>
            </div>
            
            {mode === GameMode.GRID ? (
              inputMethod === 'bank' ? (
                <div className="space-y-8 w-full">
                  {/* Jeopardy Sets - Primary Choice */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white/40 p-4 rounded-2xl border-2 border-dashed border-[var(--color-ink-black)]">
                      <p className="text-xl font-bold text-[var(--color-bg-dark)] flex items-center gap-2">
                        <CartoonBook className="w-8 h-8 text-[var(--color-primary-blue)]" /> اختر مجموعة فئات جاهزة:
                      </p>
                      <button 
                        type="button"
                        onClick={() => {
                          playSound('click');
                          setCategories(['', '', '', '', '']);
                        }}
                        className="text-xs font-bold underline text-red-600"
                      >
                        إعادة تعيين
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {JEOPARDY_SETS.map(set => (
                        <button
                          key={set.name}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setCategories(set.categories);
                            showToast(`تم اختيار مجموعة: ${set.name}`, "info");
                          }}
                          className={`p-6 rounded-[2rem] border-4 transition-all text-right flex items-center gap-4 group/set relative ${
                            JSON.stringify(categories) === JSON.stringify(set.categories)
                              ? 'bg-[var(--color-primary-gold)] border-[var(--color-ink-black)] shadow-[6px_6px_0px_var(--color-ink-black)] scale-105'
                              : 'bg-white border-white/20 hover:border-[var(--color-primary-gold)] hover:bg-[var(--color-bg-cream)] shadow-[4px_4px_0px_rgba(0,0,0,0.1)]'
                          }`}
                        >
                          <div className="w-16 h-16 rounded-2xl bg-white/50 border-2 border-[var(--color-ink-black)] flex items-center justify-center text-3xl group-hover/set:rotate-6 transition-transform">
                            {set.icon}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-xl mb-1">{set.name}</p>
                            <div className="flex flex-wrap gap-1">
                              {set.categories.slice(0, 5).map(c => (
                                <span key={c} className="text-[9px] bg-black/5 px-2 py-0.5 rounded-full">{c}</span>
                              ))}
                              {set.categories.length > 5 && <span className="text-[9px] bg-black/5 px-2 py-0.5 rounded-full">+{set.categories.length - 5}</span>}
                            </div>
                          </div>
                          {JSON.stringify(categories) === JSON.stringify(set.categories) && (
                            <div className="absolute -top-3 -left-3 w-8 h-8 bg-green-500 text-white rounded-full border-4 border-[var(--color-ink-black)] flex items-center justify-center shadow-md">
                              ✓
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Classification Explorer - Secondary Choice */}
                  <div className="pt-8 border-t-4 border-dashed border-black/5 space-y-6">
                    <p className="text-xl font-bold text-[var(--color-bg-dark)] flex items-center gap-2">
                      <CartoonSparkles className="w-8 h-8 text-[var(--color-primary-gold)]" /> أو صمم مجموعتك باختيار 5 فئات من التصنيفات:
                    </p>
                    
                    {/* Classifications Tabs */}
                    <div className="flex flex-wrap gap-2 mb-4 bg-white/30 p-2 rounded-2xl border-2 border-[var(--color-ink-black)]">
                      {CATEGORY_CLASSIFICATIONS.map(cls => (
                        <button
                          key={cls.name}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setActiveClassification(cls.name);
                          }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all font-bold text-sm ${
                            activeClassification === cls.name
                              ? `${cls.color} text-white border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] scale-105`
                              : 'bg-white border-transparent hover:bg-[var(--color-bg-cream)] opacity-60 grayscale'
                          }`}
                        >
                          <span>{cls.icon}</span>
                          {cls.name}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-4 bg-white/20 rounded-[2rem] border-2 border-dashed border-[var(--color-ink-black)] custom-scrollbar">
                      {(() => {
                        const bankCats = Array.from(new Set((QUESTION_BANK[GameMode.GRID] || []).map(q => q.category)));
                        const currentCls = CATEGORY_CLASSIFICATIONS.find(c => c.name === activeClassification);
                        const filteredCats = bankCats.filter(cat => currentCls?.categories.includes(cat));

                        return filteredCats.length > 0 ? filteredCats.map(cat => {
                          const isSelected = categories.includes(cat);
                          const index = categories.indexOf(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                playSound('click');
                                if (isSelected) {
                                  setCategories(prev => prev.map(c => c === cat ? '' : c));
                                } else {
                                  const emptyIdx = categories.indexOf('');
                                  if (emptyIdx !== -1) {
                                    const newCats = [...categories];
                                    newCats[emptyIdx] = cat;
                                    setCategories(newCats);
                                  } else {
                                    showToast("لقد اخترت 5 فئات بالفعل. قم بإلغاء واحدة لتتمكن من إضافة غيرها.", "warning");
                                  }
                                }
                              }}
                              className={`p-3 rounded-xl border-2 transition-all font-bold text-sm text-center relative ${
                                isSelected 
                                  ? 'bg-[var(--color-primary-blue)] border-[var(--color-ink-black)] text-white shadow-[3px_3px_0px_var(--color-ink-black)]' 
                                  : 'bg-white/50 border-white/20 text-[var(--color-ink-black)] hover:bg-white'
                              }`}
                            >
                              {cat}
                              {isSelected && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--color-primary-gold)] text-[var(--color-ink-black)] rounded-full border-2 border-[var(--color-ink-black)] flex items-center justify-center text-[10px] font-black">
                                  {index + 1}
                                </span>
                              )}
                            </button>
                          );
                        }) : (
                          <div className="col-span-full py-8 text-center text-gray-500 italic">لا توجد فئات في هذا التصنيف حالياً</div>
                        );
                      })()}
                    </div>
                    
                    {/* Display Selected Categories Order */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {categories.map((cat, i) => (
                        <div key={i} className={`px-4 py-2 rounded-xl border-2 border-[var(--color-ink-black)] font-bold flex items-center gap-2 ${cat ? 'bg-[var(--color-primary-gold)]' : 'bg-white/30 border-dashed border-white/50 opacity-50'}`}>
                          <span className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs">{i + 1}</span>
                          {cat || '...انتظار'}
                          {cat && (
                            <button 
                              type="button" 
                              onClick={() => setCategories(prev => {
                                const n = [...prev];
                                n[i] = '';
                                return n;
                              })}
                              className="hover:text-red-600"
                            >
                              <CartoonX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((cat, i) => (
                    <div key={i} className="relative">
                      <input 
                        value={cat}
                        onChange={(e) => {
                          const newCats = [...categories];
                          newCats[i] = e.target.value;
                          setCategories(newCats);
                        }}
                        className="vintage-input w-full p-6 text-xl font-bold"
                        placeholder={`الفئة ${i + 1}`}
                        required={i < 3}
                      />
                    </div>
                  ))}
                </div>
              )
            ) : inputMethod === 'bank' ? (
              <div className="space-y-6">
                {mode !== GameMode.HEX_GRID && (
                  <div className="flex flex-col items-center gap-2 mb-6 p-4 bg-white/10 rounded-2xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
                    <label className="text-xl font-bold text-[var(--color-ink-black)]">عدد الأسئلة</label>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={numQuestionsState}
                      onChange={(e) => setNumQuestionsState(parseInt(e.target.value) || 10)}
                      className="vintage-input p-4 w-32 text-center text-2xl font-bold"
                      required
                    />
                  </div>
                )}
                {mode === GameMode.HEX_GRID ? (
                  <div className="p-6 bg-[var(--color-primary-gold)]/10 rounded-[2rem] border-4 border-dashed border-[var(--color-primary-gold)] text-center">
                    <p className="text-2xl font-display text-[var(--color-ink-black)]">موضوع مسابقة الشبكة:</p>
                    <p className="text-4xl font-display text-[var(--color-primary-gold)] mt-2">معلومات عامة</p>
                  </div>
                ) : [GameMode.GRID, GameMode.BUZZER, GameMode.TIMED].includes(mode) ? (
                  <>
                    <p className="text-xl md:text-2xl font-display text-[var(--color-ink-black)] mb-6">اختر مجال المسابقة من البنك:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {['معلومات عامة', 'جغرافيا', 'علوم', 'رياضة', 'أحياء', 'اختراعات'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            playSound('click');
                            setTopic(t);
                          }}
                          className={`p-6 rounded-[2rem] border-4 border-[var(--color-ink-black)] font-display text-xl md:text-2xl transition-all shadow-[6px_6px_0px_var(--color-ink-black)] active:translate-y-1 active:shadow-none ${
                            topic === t 
                              ? 'bg-[var(--color-primary-gold)] text-[var(--color-ink-black)] scale-105' 
                              : 'bg-white text-[var(--color-ink-black)] hover:bg-[var(--color-bg-cream)]'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-8 bg-blue-50 rounded-[2rem] border-4 border-blue-200 text-center">
                    <p className="text-2xl font-display text-blue-900">
                      {mode === GameMode.TRUE_FALSE 
                        ? "سيتم جلب معلومات مذهلة ومضللة لهذا الوضع." 
                        : "سيتم جلب أشياء قابلة للتمثيل (أمثال، أفلام، مهن) لهذا الوضع."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="relative flex-1">
                    <input 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="vintage-input w-full p-4 md:p-10 text-xl md:text-4xl font-bold"
                      placeholder="مثال: الفضاء، تاريخ الأندلس، كرة القدم..."
                      required
                    />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={randomizeTopic}
                        className="vintage-button p-2"
                        title="موضوع عشوائي"
                      >
                        <CartoonRefresh className="w-8 h-8" />
                      </button>
                    </div>
                  </div>
                  {mode !== GameMode.HEX_GRID && (
                    <div className="relative w-full md:w-48">
                      <div className="absolute -top-4 right-6 bg-[var(--color-primary-gold)] border-2 border-[var(--color-ink-black)] text-[var(--color-ink-black)] px-4 py-1 text-xs font-bold rounded-full z-10">عدد الأسئلة</div>
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        value={numQuestionsState}
                        onChange={(e) => setNumQuestionsState(parseInt(e.target.value) || 10)}
                        className="vintage-input w-full h-full p-4 md:p-10 text-2xl md:text-5xl font-bold text-center"
                        required
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 mt-6">
                  {(mode === GameMode.SILENT_GUESS ? SILENT_GUESS_TOPICS : QUICK_TOPICS).map(t => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        playSound('click');
                        setTopic(t.name);
                      }}
                      className={`px-6 py-3 rounded-xl border transition-all font-medium text-sm ${topic === t.name ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                    >
                      <span className="ml-2">{t.icon}</span> {t.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>


          {/* Input Method Selection */}
          <div className="space-y-8 animate-fade-in vintage-panel p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-[var(--color-primary-green)]"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-[var(--color-primary-green)] border-4 border-[var(--color-ink-black)] flex items-center justify-center text-white font-bold text-3xl shadow-[4px_4px_0px_var(--color-ink-black)]">3</div>
              <label className="text-2xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">طريقة الإدخال</label>
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${!isOnline ? 'opacity-70' : ''}`}>
              {mode === GameMode.GRID && (
                <button 
                  type="button"
                  disabled={!isOnline}
                  onClick={() => {
                    playSound('click');
                    if (!isOnline) {
                      showToast("هذا الخيار يتطلب اتصالاً بالإنترنت", "warning");
                      return;
                    }
                    setInputMethod('ai');
                  }}
                  className={`relative p-6 md:p-8 rounded-[2rem] transition-all duration-300 text-right overflow-hidden group/btn border-4 border-[var(--color-ink-black)] ${inputMethod === 'ai' ? 'shadow-[6px_6px_0px_var(--color-ink-black)]' : 'bg-[var(--color-off-white)] hover:bg-[var(--color-bg-cream)]'} ${!isOnline ? 'grayscale cursor-not-allowed' : ''}`}
                  style={inputMethod === 'ai' ? { backgroundColor: 'var(--color-primary-green)', color: 'white' } : {}}
                >
                   {!isOnline && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white p-1 rounded-full border-2 border-black z-20">
                      <CartoonX size={12} />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 border-4 border-[var(--color-ink-black)] ${inputMethod === 'ai' ? 'bg-white text-[var(--color-ink-black)]' : 'bg-[var(--color-primary-green)] text-white'}`}>
                      <CartoonBot className="w-10 h-10" />
                    </div>
                    {inputMethod === 'ai' && <div className="bg-white text-[var(--color-ink-black)] border-2 border-[var(--color-ink-black)] text-xs px-3 py-1 rounded-full font-bold">مختار</div>}
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 relative z-10 vintage-text">توليد بالذكاء الاصطناعي</h3>
                  <p className="text-xs opacity-80">توليد تلقائي فوري للمسابقة. سريع وذكي.</p>
                </button>
              )}
              
              <button 
                type="button"
                onClick={() => {
                  playSound('click');
                  setInputMethod('manual');
                }}
                className={`relative p-6 md:p-8 rounded-[2rem] transition-all duration-300 text-right overflow-hidden group/btn border-4 border-[var(--color-ink-black)] ${inputMethod === 'manual' ? 'shadow-[6px_6px_0px_var(--color-ink-black)]' : 'bg-[var(--color-off-white)] hover:bg-[var(--color-bg-cream)]'}`}
                style={inputMethod === 'manual' ? { backgroundColor: 'var(--color-primary-gold)', color: 'var(--color-ink-black)' } : {}}
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 border-4 border-[var(--color-ink-black)] ${inputMethod === 'manual' ? 'bg-white text-[var(--color-ink-black)]' : 'bg-var(--color-primary-gold) text-[var(--color-ink-black)]'}`}>
                    <CartoonPencil className="w-10 h-10" />
                  </div>
                  {inputMethod === 'manual' && <div className="bg-white text-[var(--color-ink-black)] border-2 border-[var(--color-ink-black)] text-xs px-3 py-1 rounded-full font-bold">مختار</div>}
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2 relative z-10 vintage-text">إضافة يدوية</h3>
                <p className="text-xs opacity-80">أدخل أسئلتك الخاصة يدوياً لتتحكم في التفاصيل.</p>
              </button>

              <button 
                type="button"
                onClick={() => {
                  playSound('click');
                  setInputMethod('bank');
                }}
                className={`relative p-6 md:p-8 rounded-[2rem] transition-all duration-300 text-right overflow-hidden group/btn border-4 border-[var(--color-ink-black)] ${inputMethod === 'bank' ? 'shadow-[6px_6px_0px_var(--color-ink-black)]' : 'bg-[var(--color-off-white)] hover:bg-[var(--color-bg-cream)]'}`}
                style={inputMethod === 'bank' ? { backgroundColor: 'var(--color-primary-blue)', color: 'white' } : {}}
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 border-4 border-[var(--color-ink-black)] ${inputMethod === 'bank' ? 'bg-white text-[var(--color-ink-black)]' : 'bg-var(--color-primary-blue) text-white'}`}>
                    <CartoonBook className="w-10 h-10" />
                  </div>
                  {inputMethod === 'bank' && <div className="bg-white text-[var(--color-ink-black)] border-2 border-[var(--color-ink-black)] text-xs px-3 py-1 rounded-full font-bold">مختار</div>}
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-2 relative z-10 vintage-text">بنك الأسئلة</h3>
                <p className="text-xs opacity-80">سحب أسئلة عشوائية من مكتبة جاهزة حسب الموضوع.</p>
              </button>
            </div>

            {!isOnline && (
              <div className="mt-4 bg-red-50 p-4 rounded-xl border-2 border-red-200 text-red-700 font-bold text-center text-sm flex items-center justify-center gap-2">
                <CartoonAlert size={16} />
                <span>أنت غير متصل بالإنترنت حالياً، لذا تم تعطيل خيار الذكاء الاصطناعي. يمكنك استخدام بنك الأسئلة أو الإدخال اليدوي.</span>
              </div>
            )}

          {inputMethod === 'manual' && (
            <div className="space-y-6 animate-fade-in pt-6 border-t border-white/10">
              <div className="bg-amber-500/10 p-5 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row gap-4 justify-between items-center">
                <p className="font-bold text-amber-400 text-sm md:text-base flex items-center gap-2">
                  <CartoonAlert className="w-5 h-5" />
                  {mode === GameMode.HEX_GRID 
                    ? 'أدخل سؤالاً وإجابة لكل حرف (28 حرفاً). يجب أن تبدأ الإجابة بالحرف المخصص.' 
                    : mode === GameMode.GRID 
                    ? 'أدخل 25 سؤالاً مقسمة على 5 فئات، كل فئة 5 مستويات من النقاط.'
                    : 'أدخل العدد المطلوب من الأسئلة المتنوعة للمسابقة.'}
                </p>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    type="button"
                    onClick={generateAISamples}
                    disabled={isGeneratingSamples}
                    className="vintage-button bg-[var(--color-accent-sky)] flex-1 md:flex-none"
                  >
                    {isGeneratingSamples ? (
                      <><CartoonRefresh className="w-5 h-5 animate-spin" /> جاري التوليد...</>
                    ) : (
                      <><CartoonStar className="w-5 h-5" /> تعبئة بأسئلة عشوائية (AI)</>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={clearManualQuestions}
                    className="vintage-button bg-[var(--color-primary-red)] text-[var(--color-off-white)]"
                  >
                    <CartoonTrash className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4 max-h-[60vh] md:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {mode === GameMode.HEX_GRID ? (
                  LETTERS.flat().map(letter => {
                    const q = manualQuestions[letter] || { question: '', answer: '' };
                    let ans = q.answer.trimStart();
                    if (ans.startsWith('ال') && letter !== 'ا' && letter !== 'ل') {
                      ans = ans.substring(2);
                    }
                    const isValid = q.answer.trim() === '' || ans.startsWith(letter) || q.answer.trimStart().startsWith(letter);
                    return (
                      <div key={letter} className={`flex flex-col md:flex-row gap-4 items-start p-4 md:p-5 rounded-2xl border transition-all ${!isValid ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10'}`}>
                        <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center text-xl md:text-3xl font-bold border border-amber-500/30">
                          {letter}
                        </div>
                        <div className="flex-1 space-y-3 w-full">
                          <input 
                            type="text" placeholder="نص السؤال..." value={q.question}
                            onChange={e => handleManualChange(letter, 'question', e.target.value)}
                            className="vintage-input w-full p-3 md:p-4 text-sm"
                          />
                          <input 
                            type="text" placeholder={`الإجابة (تبدأ بـ ${letter})`} value={q.answer}
                            onChange={e => handleManualChange(letter, 'answer', e.target.value)}
                            className={`vintage-input w-full p-3 md:p-4 text-sm ${!isValid ? 'border-rose-500/50 text-rose-300 focus:border-rose-400' : ''}`}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : mode === GameMode.GRID ? (
                  JEOPARDY_STRUCTURE.map((cat, catIdx) => (
                    <div key={catIdx} className="space-y-4 p-4 md:p-6 border border-white/10 rounded-2xl bg-white/5">
                      <input 
                        className="bg-transparent text-xl md:text-2xl font-bold text-cyan-400 w-full outline-none border-b border-white/10 pb-2 mb-4 placeholder:text-cyan-400/50"
                        value={manualQuestions[`cat-${catIdx}`]?.category || cat.category}
                        onChange={e => handleManualChange(`cat-${catIdx}`, 'category', e.target.value)}
                        placeholder="اسم الفئة..."
                      />
                      {cat.points.map((p, pIdx) => {
                        const key = `j-${catIdx}-${pIdx}`;
                        const q = manualQuestions[key] || { question: '', answer: '' };
                        return (
                          <div key={p} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-black/20 p-4 rounded-xl border border-white/5">
                            <div className="w-auto md:w-20 text-right md:text-center font-bold text-amber-400 text-lg bg-amber-500/10 py-2 px-3 rounded-lg border border-amber-500/20">{p}</div>
                            <div className="flex-1 space-y-2 w-full">
                              <input 
                                type="text" placeholder="السؤال..." value={q.question}
                                onChange={e => handleManualChange(key, 'question', e.target.value)}
                                className="vintage-input w-full p-3 text-sm"
                              />
                              <input 
                                type="text" placeholder="الإجابة..." value={q.answer}
                                onChange={e => handleManualChange(key, 'answer', e.target.value)}
                                className="vintage-input w-full p-3 text-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  Array.from({ length: numQuestionsState }).map((_, i) => {
                    const key = `b-${i}`;
                    const q = manualQuestions[key] || { question: '', answer: '', explanation: '' };
                    return (
                      <div key={i} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-white/5 p-4 md:p-5 rounded-2xl border border-white/10">
                        <div className="w-12 h-12 shrink-0 bg-cyan-500/20 text-cyan-400 rounded-xl flex items-center justify-center font-bold text-2xl border border-cyan-500/30">{i + 1}</div>
                        <div className="flex-1 space-y-3 w-full">
                          <input 
                            type="text" placeholder="السؤال..." value={q.question}
                            onChange={e => handleManualChange(key, 'question', e.target.value)}
                            className="vintage-input w-full p-3 md:p-4 text-sm"
                          />
                          {mode === GameMode.TRUE_FALSE ? (
                            <div className="flex gap-4">
                              <button
                                type="button"
                                onClick={() => handleManualChange(key, 'answer', 'صواب')}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${q.answer === 'صواب' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-slate-400'}`}
                              >
                                صواب
                              </button>
                              <button
                                type="button"
                                onClick={() => handleManualChange(key, 'answer', 'خطأ')}
                                className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${q.answer === 'خطأ' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-slate-400'}`}
                              >
                                خطأ
                              </button>
                            </div>
                          ) : (
                            <input 
                              type="text" placeholder="الإجابة..." value={q.answer}
                              onChange={e => handleManualChange(key, 'answer', e.target.value)}
                              className="vintage-input w-full p-3 md:p-4 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

          {/* Players and Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-8 vintage-panel p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-2 h-full bg-violet-500"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-violet-500/20 border-4 border-[var(--color-ink-black)] flex items-center justify-center text-violet-600 font-bold text-3xl shadow-[4px_4px_0px_var(--color-ink-black)]">4</div>
                <label className="text-2xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">المتنافسون</label>
              </div>
              <div className="space-y-4">
                {playersConfig.map((p, i) => (
                  <div key={i} className="group/player flex gap-4 items-center bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] p-3 rounded-2xl shadow-[4px_4px_0px_var(--color-ink-black)]">
                    {playersConfig.length > 2 && (
                      <button 
                        type="button" 
                        onClick={() => setPlayersConfig(playersConfig.filter((_, idx) => idx !== i))} 
                        className="w-12 h-12 rounded-xl border-4 border-[var(--color-ink-black)] bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-[3px_3px_0px_var(--color-ink-black)] active:translate-x-1 active:translate-y-1 active:shadow-none shrink-0"
                        title="حذف المتسابق"
                      >
                        <CartoonTrash className="w-6 h-6" />
                      </button>
                    )}
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border-4 border-[var(--color-ink-black)] shrink-0 group-hover/player:scale-105 transition-transform">
                      <input 
                        type="color"
                        value={p.color}
                        onChange={e => {
                          const newPlayers = [...playersConfig];
                          newPlayers[i].color = e.target.value;
                          setPlayersConfig(newPlayers);
                        }}
                        className="absolute -top-4 -left-4 w-24 h-24 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <input 
                        value={p.name}
                        onChange={e => {
                          const newPlayers = [...playersConfig];
                          newPlayers[i].name = e.target.value;
                          setPlayersConfig(newPlayers);
                        }}
                        className="w-full bg-transparent border-none border-b-4 border-[var(--color-ink-black)] p-2 text-xl font-bold outline-none text-[var(--color-ink-black)] placeholder:text-slate-400"
                        placeholder={`متسابق ${i+1}`}
                      />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setPlayersConfig([...playersConfig, { name: `متسابق ${playersConfig.length + 1}`, color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') }])} className="vintage-button w-full flex items-center justify-center gap-3 bg-[var(--color-primary-blue)] text-[var(--color-off-white)]">
                  <CartoonPlus className="w-6 h-6" /> إضافة منافس
                </button>
              </div>
            </div>

            <div className="space-y-8 vintage-panel p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-2 h-full bg-fuchsia-500"></div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-fuchsia-500/20 border-4 border-[var(--color-ink-black)] flex items-center justify-center text-fuchsia-600 font-bold text-3xl shadow-[4px_4px_0px_var(--color-ink-black)]">5</div>
                <label className="text-2xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">مستوى الصعوبة</label>
              </div>
              <div className="flex flex-col gap-4">
                {[
                  { val: Difficulty.EASY, label: 'سهل', color: '#84cc16', text: 'white' },
                  { val: Difficulty.MEDIUM, label: 'متوسط', color: 'var(--color-primary-gold)', text: 'var(--color-ink-black)' },
                  { val: Difficulty.HARD, label: 'صعب', color: 'var(--color-primary-red)', text: 'white' }
                ].map(d => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => {
                    playSound('click');
                    setDifficulty(d.val);
                  }}
                    className={`vintage-button py-5 text-xl transition-all ${difficulty === d.val ? `scale-[1.02] shadow-[6px_6px_0px_var(--color-ink-black)]` : 'bg-[var(--color-off-white)]'}`}
                    style={difficulty === d.val ? { backgroundColor: d.color, color: d.text } : {}}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {(mode === GameMode.BUZZER || mode === GameMode.TIMED) && (
              <div className="space-y-8 vintage-panel p-8 md:p-10 rounded-[2.5rem] relative overflow-hidden group border-4 border-dashed border-[var(--color-primary-gold)]">
                <div className="absolute top-0 right-0 w-2 h-full bg-[var(--color-primary-gold)]"></div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-[var(--color-primary-gold)]/20 border-4 border-[var(--color-ink-black)] flex items-center justify-center text-[var(--color-primary-gold)] font-bold text-3xl shadow-[4px_4px_0px_var(--color-ink-black)]">6</div>
                  <label className="text-2xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">سرعة الإجابة</label>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xl">المهلة الزمنية</span>
                    <span className="bg-[var(--color-primary-gold)] px-6 py-2 rounded-2xl font-black border-4 border-black text-2xl">{buzzerTimeout}ث</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="5"
                    value={buzzerTimeout}
                    onChange={(e) => {
                      playSound('click');
                      setBuzzerTimeout(parseInt(e.target.value));
                    }}
                    className="w-full h-6 bg-slate-200 rounded-2xl appearance-none cursor-pointer accent-[var(--color-primary-gold)] border-4 border-black"
                  />
                  <div className="flex justify-between text-xs font-black opacity-60">
                    <span>ثواني معدودة ⚡</span>
                    <span>وقت كافٍ 🐢</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="vintage-button w-full py-8 md:py-10 rounded-[2.5rem] text-3xl md:text-5xl font-bold mt-12 relative overflow-hidden group">
            <span className="relative z-10 flex items-center justify-center gap-6">
              انطلاق المسابقة <CartoonRocket className="w-10 h-10 group-hover:translate-x-[-10px] group-hover:translate-y-[-10px] transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-cyan-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_auto] animate-gradient"></div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConfigScreen;
