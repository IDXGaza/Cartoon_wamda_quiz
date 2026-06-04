import React, { useState } from 'react';
import { Dices } from 'lucide-react';
import { GameConfig, GameMode, QuestionType, Player, Difficulty } from '../types';
import { QUESTION_BANK } from '../data/localBank';
import { filterPlayedQuestions, addPlayedQuestionHashes } from '../utils/playedQuestions';

import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { playSound } from '../utils/sound';
import { CartoonHexagon, CartoonGrid, CartoonLightning, CartoonTimer, CartoonSilent, CartoonPencil, CartoonPlus, CartoonTrash, CartoonRefresh, CartoonStar, CartoonGear, CartoonBook, CartoonAlert, CartoonRocket, CartoonX, CartoonSparkles } from './CartoonIcons';
import { motion, AnimatePresence } from 'motion/react';

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
  { name: "لغة ودين", categories: ['علوم', 'إسلاميات', 'تاريخ وثقافة', 'معلومات عامة', 'جغرافيا'], icon: "📖" },
  { name: "مستكشف العالم", categories: ['جغرافيا', 'تاريخ وثقافة', 'فضاء وتقنية', 'علوم', 'معلومات عامة'], icon: "🌍" },
];

// Define base classifications
const BASE_CATEGORY_CLASSIFICATIONS = [
  { name: "العلوم والطبيعة", icon: "🧬", color: "bg-emerald-500", categories: ['علوم', 'فضاء وتقنية', 'الفضاء', 'فضاء', 'جسم الإنسان', 'أحياء', 'كيمياء', 'فيزياء', 'طب', 'طبيعة', 'حيوانات', 'مملكة الحيوان', 'اختراعات ومخترعون'] },
  { name: "اطلس", icon: "🌍", color: "bg-amber-500", categories: ['اطلس', 'جغرافيا', 'تاريخ', 'التاريخ', 'العملات', 'تاريخ وثقافة', 'عواصم ومدن', 'دول', 'قارات', 'حضارات', 'تاريخ إسلامي', 'العواصم العالمية', 'الحرب العالمية الأولى والثانية', 'ما هي الدولة؟'] },
  { name: "الدين والقيم", icon: "🕌", color: "bg-teal-500", categories: ['إسلاميات', 'إسلاميات وأدعية', 'خلفاء', 'الدين', 'حياة المعصومين', 'إكمال الدعاء', 'اكمال الدعاء', 'فقه السيد السيستاني', 'القرآن', 'قصص الأنبياء'] },
  { name: "الرياضة", icon: "⚽", color: "bg-red-500", categories: ['الرياضة', 'المصارعة', 'كرة القدم', 'كرة السلة', 'فورمولا 1', 'فورميلا 1'] },
  { name: "مسلسلات و انمي", icon: "🎬", color: "bg-purple-500", categories: ['Game of Thrones', 'ون بيس', 'هجوم العمالقة', 'مارفل', 'كرتون', 'Breaking Bad', 'Dexter', 'hunter x hunter', 'وادي الذئاب'] },
  { name: "منوعات", icon: "🎮", color: "bg-rose-500", categories: ['منوعات', 'معلومات عامة', 'متنوع', 'دارك سولز', 'أوفرواتش', 'هاري بوتر', 'الدن رينج', 'شبح تسوشيما', 'ذكاء', 'سيارات', 'التقنية', 'مورتال كومبات', 'تكن', 'the last of us'] }
];

const getDynamicCategoryClassifications = () => {
  const allBankCats = Array.from(new Set((QUESTION_BANK[GameMode.GRID] || []).map(q => q.category)));
  const classifications = JSON.parse(JSON.stringify(BASE_CATEGORY_CLASSIFICATIONS));

  const classifiedCats = new Set(classifications.flatMap((c: any) => c.categories));
  const unclassifiedCats = allBankCats.filter(cat => !classifiedCats.has(cat));

  if (unclassifiedCats.length > 0) {
    const miscellaneous = classifications.find((c: any) => c.name === "منوعات");
    if (miscellaneous) {
      miscellaneous.categories.push(...unclassifiedCats);
    }
  }
  
  return classifications;
};

const CATEGORY_CLASSIFICATIONS = getDynamicCategoryClassifications();


import { getUserCustomCategories, UserCategory } from '../services/categoryService';
import { generateQuestions } from '../services/geminiService';
// ... (imports)
const ConfigScreen: React.FC<Props> = ({ onStart }) => {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [topic, setTopic] = useState('ثقافة عامة');
  const [isOnline] = useState(navigator.onLine);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
  
  React.useEffect(() => {
    getUserCustomCategories().then(setUserCategories);
  }, []);
// ...
// Then inside CATEGORY_CLASSIFICATIONS logic, add userCategories
  const [mode, setMode] = useState<GameMode>(GameMode.HEX_GRID);
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.OPEN);
  const [numQuestionsState, setNumQuestionsState] = useState<number>(10);

  React.useEffect(() => {
    if (mode === GameMode.TABOO) {
      setNumQuestionsState(30);
    } else if (mode === GameMode.BUZZER || mode === GameMode.TIMED) {
      setNumQuestionsState(15);
    }
  }, [mode]);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [activeClassification, setActiveClassification] = useState<string>("العلوم والطبيعة");
  const [timedDuration, setTimedDuration] = useState<number>(settings.timedDuration);
  const [categories, setCategories] = useState<string[]>(['', '', '', '', '']);
  const [playersConfig, setPlayersConfig] = useState<{name: string, color: string}[]>([
    { name: 'الفريق الأحمر', color: '#ef4444' },
    { name: 'الفريق الأخضر', color: '#22c55e' }
  ]);

  const [buzzerTimeout, setBuzzerTimeout] = useState<number>(20);
  const [isRestrictedMode, setIsRestrictedMode] = useState<boolean>(true);
  const [inputMethod, setInputMethod] = useState<'manual' | 'bank'>('bank');
  const [tabooType, setTabooType] = useState<'local' | 'remote'>('local');
  const [tabooTimerDuration, setTabooTimerDuration] = useState<number>(60);
  const [tabooWordTimerDuration, setTabooWordTimerDuration] = useState<number>(0); // 0 means no limit

  // ... (activeFeats state removed)

  React.useEffect(() => {
    setIsRestrictedMode(mode === GameMode.GRID || mode === GameMode.HEX_GRID || mode === GameMode.LISTING);
  }, [mode]);

  // Categories should start empty without autofilling as requested by the user
  const [hasInitializedCategories] = useState(true);
  
  const [manualQuestions, setManualQuestions] = useState<Record<string, {
    question: string, 
    answer: string, 
    category?: string, 
    points?: number, 
    explanation?: string
  }>>({});
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");

  React.useEffect(() => {
    if (mode === GameMode.BUZZER || mode === GameMode.TIMED || mode === GameMode.TABOO) {
      setTopic('عام');
    }
  }, [mode]);

  const randomizeTopic = React.useCallback(() => {
    playSound('click');
    const topics = ["تاريخ إسلامي", "عواصم العالم", "اختراعات غيرت العالم", "أدب عالمي", "عجائب الدنيا", "فضاء ونجوم", "كيمياء حيوية", "تاريخ الأندلس", "أساطير قديمة", "أفلام ومسلسلات"];
    setTopic(topics[Math.floor(Math.random() * topics.length)]);
  }, [setTopic]);

  const randomizeCategories = React.useCallback(() => {
    playSound('click');
    const bank = QUESTION_BANK[GameMode.GRID] || [];
    const allBankCats = Array.from(new Set(bank.map(q => q.category)));
    
    // Pick 5 unique random
    const shuffled = [...allBankCats].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);
    
    // Fill to 5 if less than 5
    while (selected.length < 5) {
        selected.push('');
    }
    setCategories(selected);
  }, []);

  const clearManualQuestions = React.useCallback(() => {
    playSound('click');
    if (window.confirm("هل أنت متأكد من مسح جميع الأسئلة اليدوية؟")) {
      setManualQuestions({});
    }
  }, [setManualQuestions]);

  const MODELS = [
    { name: "Tencent Hy3 (Free)", value: "tencent/hy3-preview:free" },
    { name: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
    { name: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    { name: "Other (Custom)", value: "custom" }
  ];

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
      
      const generated = await generateQuestions(
        topic,
        requiredCount,
        [QuestionType.OPEN],
        mode,
        Difficulty.MEDIUM,
        selectedModel,
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
    if (mode === GameMode.GRID && inputMethod !== 'manual') {
      const selectedCats = categories.filter(c => c.trim() !== '');
      if (selectedCats.length < 5) {
        playSound('wrong');
        showToast(`يجب اختيار أو كتابة 5 فئات كاملة لبدء مسابقة الجيبوردي (لقد حددت ${selectedCats.length} من 5)`, "error");
        return;
      }
    }

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
              difficulty: Difficulty.MEDIUM
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
        let cats = [...selectedCats];
        
        // Pad to exactly 5 categories using other categories from the bank
        const allBankCats = Array.from(new Set(bank.map(q => q.category)));
        for (const bankCat of allBankCats) {
          if (cats.length >= 5) break;
          if (!cats.includes(bankCat)) {
            cats.push(bankCat);
          }
        }
        
        // Ensure we always have 5 categories
        while (cats.length < 5) {
          cats.push(`تصنيف إضافي ${cats.length + 1}`);
        }

        cats.forEach((catName, i) => {
          let allCatQuestions = bank.filter(q => q.category === catName || (catName === 'رياضة ومصارعة' && q.category === 'الرياضة'));
          let catQuestions = filterPlayedQuestions(allCatQuestions);
          
          const diffMap: Record<string, number> = { 'beginner': 1, 'easy': 2, 'medium': 3, 'hard': 4 };

          // If we don't have enough unplayed questions for this category, try unplayed from other categories or just reuse played
          if (catQuestions.length < 5) {
            // First fallback: unplayed extra questions
            const usedTexts = new Set(finalManualQuestions.map(q => q.text));
            let extra = filterPlayedQuestions(bank).filter(q => !usedTexts.has(q.text) && q.category !== catName);
            extra.sort(() => Math.random() - 0.5);
            catQuestions = [...catQuestions, ...extra].slice(0, 5);
            
            // Second fallback: reuse played questions if still less than 5
            if (catQuestions.length < 5) {
              const playedExtra = bank.filter(q => !usedTexts.has(q.text) && !catQuestions.some(cq => cq.id === q.id));
              playedExtra.sort(() => Math.random() - 0.5);
              catQuestions = [...catQuestions, ...playedExtra].slice(0, 5);
            }
          }

          // To improve variety, shuffle questions of the same difficulty
          catQuestions.sort(() => Math.random() - 0.5);
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
        
        // Add selected questions to played history
        addPlayedQuestionHashes(finalManualQuestions.map(q => ({ category: q.category, difficulty: q.difficulty, text: q.text })));
      } else if (mode === GameMode.HEX_GRID) {
         // HEX_GRID handles bank directly in GameScreen if no manualQuestions
      } else {
        const modeBank = QUESTION_BANK[mode] || [];
        // Filter by topic if selected
        const filteredBank = topic && topic !== 'عام' ? modeBank.filter(q => q.category === topic) : modeBank;
        let allBank = [...(filteredBank.length > 0 ? filteredBank : modeBank)];
        let bank = filterPlayedQuestions(allBank);
        
        if (bank.length < numQuestionsState) {
          // Fallback to all questions if not enough unplayed
          bank = allBank;
        }

        // Shuffle for variety using Fisher-Yates
        for (let i = bank.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bank[i], bank[j]] = [bank[j], bank[i]];
        }
        
        const count = numQuestionsState;
        for (let i = 0; i < count; i++) {
          const q = bank[i % bank.length] || { id: `bk-def-${i}`, text: 'ما هي عاصمة العالم في الثقافة والجمال؟', answer: 'باريس', category: 'عام', difficulty: Difficulty.MEDIUM };
          finalManualQuestions.push({
            id: q.id, // Keep original ID to mark as played
            text: q.text,
            answer: q.answer,
            category: q.category,
            points: 100,
            type: QuestionType.OPEN,
            difficulty: (q.difficulty?.toUpperCase() as Difficulty) || Difficulty.MEDIUM,
            tabooWords: q.tabooWords
          });
        }
        
        // Add selected questions to played history
        addPlayedQuestionHashes(finalManualQuestions.map(q => ({ category: q.category, difficulty: q.difficulty, text: q.text })));
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
      timerDuration: mode === GameMode.TIMED ? timedDuration : (mode === GameMode.TABOO ? tabooTimerDuration : buzzerTimeout),
      wordTimerDuration: mode === GameMode.TABOO ? tabooWordTimerDuration : undefined,
      aiModel: settings.aiModel === 'custom' ? (settings.customModel || 'gemini-1.5-flash') : settings.aiModel,
      tabooType: mode === GameMode.TABOO ? tabooType : undefined
    });
  };

  return (
    <div className="pt-1 pb-1 md:pb-6 px-1 md:px-4 relative z-10">
      <div className="vintage-panel rounded-3xl md:rounded-[3rem] p-3 md:p-12 max-w-5xl mx-auto animate-fade-up relative">
        
        <div className="text-center mb-8 md:mb-16 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 bg-[var(--color-primary-gold)] rounded-2xl md:rounded-3xl mb-4 md:mb-6 border-2 md:border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] md:shadow-[6px_6px_0px_var(--color-ink-black)]">
            <CartoonGear className="w-8 h-8 md:w-12 md:h-12 animate-spin-slow" />
          </div>
          <h1 className="text-3xl md:text-7xl font-bold mb-4 text-[var(--color-ink-black)] vintage-text">إعداد المسابقة</h1>
          
          {/* Active Features indicators indicator dynamically loaded */}
          {/* Deleted as requested */}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-12 relative z-10">
          {/* Game Mode Selection */}
          <motion.div layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="space-y-4 md:space-y-8 vintage-panel p-3 sm:p-8 md:p-12 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-[var(--color-primary-gold)] border-2 md:border-4 border-[var(--color-ink-black)] flex items-center justify-center text-[var(--color-ink-black)] font-bold text-xl md:text-3xl shadow-[2px_2px_0px_var(--color-ink-black)] md:shadow-[4px_4px_0px_var(--color-ink-black)]">1</div>
              <label className="text-xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">نمط اللعب</label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { val: GameMode.HEX_GRID, label: 'شبكة الحروف', icon: <CartoonHexagon size={32} className="sm:size-12" />, desc: 'تحدي الحروف', color: 'text-[var(--color-primary-blue)]', ring: 'ring-[var(--color-primary-blue)]/50', activeBg: 'var(--color-primary-blue)', activeText: 'white' },
                { val: GameMode.GRID, label: 'شبكة النقاط', icon: <CartoonGrid size={32} className="sm:size-12" />, desc: 'فئات ونقاط متدرجة', color: 'text-[var(--color-accent-sky)]', ring: 'ring-[var(--color-accent-sky)]/50', activeBg: 'var(--color-accent-sky)', activeText: 'var(--color-ink-black)' },
                { val: GameMode.BUZZER, label: 'تحدي السرعة', icon: <CartoonLightning size={32} className="sm:size-12" />, desc: 'أسرع إجابة تفوز', color: 'text-[var(--color-primary-green)]', ring: 'ring-[var(--color-primary-green)]/50', activeBg: 'var(--color-primary-green)', activeText: 'white' },
                { val: GameMode.TIMED, label: 'سباق الوقت', icon: <CartoonTimer size={32} className="sm:size-12" />, desc: 'أكبر عدد إجابات', color: 'text-[var(--color-primary-gold)]', ring: 'ring-[var(--color-primary-gold)]/50', activeBg: 'var(--color-primary-gold)', activeText: 'var(--color-ink-black)' },
                { val: GameMode.TRUE_FALSE, label: 'صواب أم خطأ؟', icon: <CartoonAlert size={32} className="sm:size-12" />, desc: 'حقائق مذهلة', color: 'text-[var(--color-primary-red)]', ring: 'ring-[var(--color-primary-red)]/50', activeBg: 'var(--color-primary-red)', activeText: 'white' },
                { val: GameMode.SILENT_GUESS, label: 'تخمين صامت', icon: <CartoonSilent size={32} className="sm:size-12" />, desc: 'تخمين بدون نص', color: 'text-violet-600', ring: 'ring-violet-500/50', activeBg: '#8b5cf6', activeText: 'white' },
                { val: GameMode.TABOO, label: 'قول بس لا تقول', icon: <CartoonSparkles size={32} className="sm:size-12" />, desc: 'تحدي الكلمات الممنوعة', color: 'text-rose-600', ring: 'ring-rose-500/50', activeBg: '#e11d48', activeText: 'white' }
              ].map(m => {
                return (
                  <motion.button
                    layout
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={m.val}
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setMode(m.val);
                    }}
                    className={`vintage-button rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col items-center gap-2 sm:gap-4 text-center transition-all duration-300 ${mode === m.val ? `ring-4 ${m.ring} shadow-[8px_8px_0px_var(--color-ink-black)]` : 'bg-[var(--color-off-white)]'}`}
                    style={mode === m.val ? { backgroundColor: m.activeBg, color: m.activeText } : {}}
                  >
                    <motion.div layout className={`mb-2 transition-colors ${mode === m.val ? 'text-inherit' : m.color}`}>{m.icon}</motion.div>
                    <motion.h3 layout className="font-bold text-xl vintage-text">{m.label}</motion.h3>
                    <motion.p layout className="text-xs opacity-70">{m.desc}</motion.p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Topic Selection */}
          <motion.div layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-4 md:space-y-8 vintage-panel p-3 sm:p-8 md:p-12 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
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
                  {/* Classification Explorer - Secondary Choice */}
                  <div className="pt-8 border-t-4 border-dashed border-black/5 space-y-6">
                    <p className="text-xl font-bold text-[var(--color-bg-dark)] flex items-center gap-2">
                       صمم مجموعتك باختيار 5 فئات من التصنيفات:
                       <button
                         id="random-selector-button"
                         type="button"
                         onClick={randomizeCategories}
                         className="p-2 bg-[var(--color-primary-gold)] rounded-xl border-2 border-[var(--color-ink-black)] shadow-[2px_2px_0px_var(--color-ink-black)] hover:scale-105 active:scale-95 transition-all"
                         title="اختيار فئات عشوائية"
                       >
                         <Dices className="w-6 h-6" />
                       </button>
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
                        const filteredCats = bankCats.filter(cat => currentCls?.categories.some(c => c && cat.startsWith(c)));

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
            ) : mode === GameMode.TABOO ? (
              <div className="space-y-4 md:space-y-8 animate-fade-in w-full">
                <div className="flex flex-col md:flex-row gap-6 justify-center">
                  <div className="flex flex-col items-center gap-2 p-5 bg-white/10 rounded-2xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
                    <label className="text-xl font-bold text-[var(--color-ink-black)]">طريقة اللعب</label>
                    <div className="flex gap-2">
                       <button 
                         type="button" 
                         onClick={() => setTabooType('local')}
                         className={`px-6 py-3 rounded-xl border-2 font-bold ${tabooType === 'local' ? 'bg-[var(--color-primary-gold)] border-black' : 'bg-white opacity-50'}`}
                       >جهاز واحد</button>
                       <button 
                         type="button" 
                         onClick={() => setTabooType('remote')}
                         className={`px-6 py-3 rounded-xl border-2 font-bold ${tabooType === 'remote' ? 'bg-[var(--color-primary-gold)] border-black' : 'bg-white opacity-50'}`}
                       >عدة أجهزة</button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-5 bg-white/10 rounded-2xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
                    <label className="text-xl font-bold text-[var(--color-ink-black)]">وقت الجولة (ثواني)</label>
                    <input 
                      type="number"
                      min="10"
                      max="300"
                      value={tabooTimerDuration}
                      onChange={(e) => setTabooTimerDuration(parseInt(e.target.value) || 60)}
                      className="vintage-input p-4 w-40 text-center text-2xl font-bold"
                      required
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 p-5 bg-white/10 rounded-2xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
                    <label className="text-xl font-bold text-[var(--color-ink-black)]">وقت الكلمة (0 = بدون)</label>
                    <input 
                      type="number"
                      min="0"
                      max="60"
                      value={tabooWordTimerDuration}
                      onChange={(e) => setTabooWordTimerDuration(parseInt(e.target.value) || 0)}
                      className="vintage-input p-4 w-40 text-center text-2xl font-bold"
                      required
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2 p-5 bg-white/10 rounded-2xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
                    <label className="text-xl font-bold text-[var(--color-ink-black)]">عدد الكلمات (التكرار)</label>
                    <input 
                      type="number"
                      min="5"
                      max="200"
                      value={numQuestionsState}
                      onChange={(e) => setNumQuestionsState(parseInt(e.target.value) || 30)}
                      className="vintage-input p-4 w-40 text-center text-2xl font-bold"
                      required
                    />
                  </div>
                </div>
              </div>
            ) : [GameMode.BUZZER, GameMode.TIMED].includes(mode) ? (
              <div className="space-y-6 w-full">
                <div className="p-8 bg-cyan-500/10 rounded-[2rem] border-4 border-dashed border-cyan-500 text-center">
                  <p className="text-2xl font-bold text-[var(--color-ink-black)]">موضوع المسابقة:</p>
                  <p className="text-4xl font-bold text-cyan-600 mt-2 vintage-text">عشوائي 🎲</p>
                  <p className="text-sm text-gray-600 mt-3 font-bold leading-relaxed">
                    تم اختيار وضبط موضوع المسابقة على عشوائي تلقائياً لهذه اللعبة، لتنعموا بمنافسة ممتعة وغير متوقعة تشمل جميع مجالات المعرفة!
                  </p>
                </div>
                
                <div className="flex justify-center mt-6 col-span-full">
                  {mode === GameMode.BUZZER && (
                    <div className="flex flex-col items-center gap-2 p-5 bg-white/10 rounded-2xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
                      <label className="text-xl font-bold text-[var(--color-ink-black)]">عدد الأسئلة</label>
                      <input 
                        type="number"
                        min="1"
                        max="100"
                        value={numQuestionsState}
                        onChange={(e) => setNumQuestionsState(parseInt(e.target.value) || 10)}
                        className="vintage-input p-4 w-40 text-center text-2xl font-bold"
                        required
                      />
                    </div>
                  )}
                  {mode === GameMode.TIMED && (
                    <div className="flex flex-col items-center gap-2 p-5 bg-white/10 rounded-2xl border-2 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)]">
                      <label className="text-xl font-bold text-[var(--color-ink-black)]">المدة (بالثواني)</label>
                      <input 
                        type="number"
                        min="10"
                        value={timedDuration}
                        onChange={(e) => setTimedDuration(parseInt(e.target.value) || 60)}
                        className="vintage-input p-4 w-48 text-center text-2xl font-bold"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : inputMethod === 'bank' ? (
              <div className="space-y-6 animate-fade-in w-full">
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
                
                <div className="flex flex-wrap gap-3 mt-6 animate-fade-in">
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
          </motion.div>


          {/* Input Method Selection */}
          <motion.div layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-4 md:space-y-8 vintage-panel p-3 sm:p-8 md:p-12 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-2 h-full bg-[var(--color-primary-green)]"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-[var(--color-primary-green)] border-4 border-[var(--color-ink-black)] flex items-center justify-center text-white font-bold text-3xl shadow-[4px_4px_0px_var(--color-ink-black)]">3</div>
              <label className="text-2xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">طريقة الإدخال</label>
            </div>
            
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8`}>
              <button
                type="button"
                onClick={() => {
                  playSound('click');
                  setInputMethod('manual');
                }}
                className={`relative p-6 md:p-8 rounded-[2rem] transition-all duration-300 text-right overflow-hidden group/btn border-4 border-[var(--color-ink-black)] ${
                  inputMethod === 'manual' ? 'shadow-[6px_6px_0px_var(--color-ink-black)]' : 'bg-[var(--color-off-white)] hover:bg-[var(--color-bg-cream)]'
                }`}
                style={inputMethod === 'manual' ? { backgroundColor: 'var(--color-primary-gold)', color: 'var(--color-ink-black)' } : {}}
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 border-4 border-[var(--color-ink-black)] ${inputMethod === 'manual' ? 'bg-white text-[var(--color-ink-black)]' : 'bg-[var(--color-primary-gold)] text-[var(--color-ink-black)]'}`}>
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
                className={`relative p-6 md:p-8 rounded-[2rem] transition-all duration-300 text-right overflow-hidden group/btn border-4 border-[var(--color-ink-black)] ${
                  inputMethod === 'bank' ? 'shadow-[6px_6px_0px_var(--color-ink-black)]' : 'bg-[var(--color-off-white)] hover:bg-[var(--color-bg-cream)]'
                }`}
                style={inputMethod === 'bank' ? { backgroundColor: 'var(--color-primary-blue)', color: 'white' } : {}}
              >
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover/btn:scale-110 group-hover/btn:rotate-12 border-4 border-[var(--color-ink-black)] ${inputMethod === 'bank' ? 'bg-white text-[var(--color-ink-black)]' : 'bg-[var(--color-primary-blue)] text-white'}`}>
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

          <AnimatePresence mode="wait">
          {inputMethod === 'manual' && (
            <motion.div 
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6 pt-6 border-t border-black/10 overflow-hidden"
            >
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
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-12 flex flex-col lg:flex-row justify-center gap-6 items-start w-full max-w-5xl mx-auto">
          {/* Players Selection */}
          <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.4 }} className="space-y-4 md:space-y-8 vintage-panel p-4 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group w-full max-w-2xl">
            <div className="absolute top-0 right-0 w-2 h-full bg-violet-500"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-violet-500/20 border-4 border-[var(--color-ink-black)] flex items-center justify-center text-violet-600 font-bold text-3xl shadow-[4px_4px_0px_var(--color-ink-black)]">4</div>
              <label className="text-2xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">المتنافسون</label>
            </div>
            <div className="space-y-4">
              {playersConfig.map((p, i) => (
                <div key={i} className="group/player flex gap-4 items-center bg-[var(--color-off-white)] border-4 border-[var(--color-ink-black)] p-3 rounded-2xl shadow-[4px_4px_0px_var(--color-ink-black)]">
                  {!isRestrictedMode && playersConfig.length > 2 && (
                    <button 
                      type="button" 
                      onClick={() => setPlayersConfig(playersConfig.filter((_, idx) => idx !== i))} 
                      className="w-12 h-12 rounded-xl border-4 border-[var(--color-ink-black)] bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-all shadow-[3px_3px_0px_var(--color-ink-black)] active:translate-x-1 active:translate-y-1 active:shadow-none shrink-0"
                      title="حذف المتسابق"
                    >
                      <CartoonTrash className="w-6 h-6" />
                    </button>
                  )}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border-4 border-[var(--color-ink-black)] shrink-0 transition-opacity group-hover/player:opacity-90">
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
              {!isRestrictedMode && (
                <button type="button" onClick={() => setPlayersConfig([...playersConfig, { name: `متسابق ${playersConfig.length + 1}`, color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0') }])} className="vintage-button w-full flex items-center justify-center gap-3 bg-[var(--color-primary-blue)] text-[var(--color-off-white)]">
                  <CartoonPlus className="w-6 h-6" /> إضافة منافس
                </button>
              )}
            </div>
          </motion.div>

            <AnimatePresence>
            {mode === GameMode.BUZZER && (
              <motion.div 
                layout 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="space-y-4 md:space-y-6 vintage-panel p-3 sm:p-8 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group w-full max-w-2xl"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-[var(--color-primary-gold)]"></div>
                <div className="flex items-center gap-3 md:gap-4 mb-4">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-[var(--color-primary-gold)]/20 border-2 md:border-4 border-[var(--color-ink-black)] flex items-center justify-center text-[var(--color-primary-gold)] font-bold text-xl md:text-3xl shadow-[2px_2px_0px_var(--color-ink-black)] md:shadow-[4px_4px_0px_var(--color-ink-black)]">6</div>
                  <label className="text-xl md:text-4xl font-bold text-[var(--color-ink-black)] vintage-text">سرعة الإجابة</label>
                </div>
                
                <div className="bg-[var(--color-off-white)] p-4 md:p-6 rounded-2xl border-4 border-[var(--color-ink-black)] shadow-[4px_4px_0px_var(--color-ink-black)] space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg md:text-xl text-[var(--color-ink-black)]">المهلة الزمنية</span>
                    <span className="bg-[var(--color-primary-gold)] px-4 py-1.5 md:px-6 md:py-2 rounded-xl border-4 border-black font-black text-xl md:text-2xl shadow-[3px_3px_0px_black]">{buzzerTimeout}ث</span>
                  </div>
                  <div className="px-1 md:px-2 py-1">
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
                      className="vintage-slider cursor-pointer w-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs font-black opacity-65 text-[var(--color-ink-black)]">
                    <span>ثواني معدودة ⚡</span>
                    <span>وقت كافٍ 🐢</span>
                  </div>
                </div>
              </motion.div>
            )}
            {mode === GameMode.TABOO && (
              <motion.div 
                layout 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="space-y-4 md:space-y-6 vintage-panel p-3 sm:p-8 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden group w-full max-w-2xl"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
                <div className="flex items-center gap-3 md:gap-4 mb-4">
                  <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-rose-500/20 border-2 md:border-4 border-[var(--color-ink-black)] flex items-center justify-center text-rose-500 font-bold text-xl md:text-3xl shadow-[2px_2px_0px_var(--color-ink-black)] md:shadow-[4px_4px_0px_var(--color-ink-black)]">6</div>
                  <label className="text-xl md:text-3xl font-bold text-[var(--color-ink-black)] vintage-text">طريقة لعب "قول بس لا تقول"</label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setTabooType('local');
                    }}
                    className={`vintage-button rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all ${tabooType === 'local' ? 'bg-rose-600 text-white shadow-[4px_4px_0px_var(--color-ink-black)] ring-2 ring-rose-500/50' : 'bg-[var(--color-off-white)]'}`}
                  >
                    <span className="font-bold text-lg md:text-xl vintage-text">محلي 📱</span>
                    <span className="text-[10px] opacity-85">على جهاز واحد متناوب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click');
                      setTabooType('remote');
                    }}
                    className={`vintage-button rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-all ${tabooType === 'remote' ? 'bg-blue-600 text-white shadow-[4px_4px_0px_var(--color-ink-black)] ring-2 ring-blue-500/50' : 'bg-[var(--color-off-white)]'}`}
                  >
                    <span className="font-bold text-lg md:text-xl vintage-text">عن بعد 🌐</span>
                    <span className="text-[10px] opacity-85">باستخدام الرابط والغرفة</span>
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          <motion.button layout type="submit" className="vintage-button w-full py-5 md:py-10 rounded-[1.5rem] md:rounded-[2.5rem] text-2xl md:text-5xl font-bold mt-6 md:mt-12 relative overflow-hidden group">
            <span className="relative z-10 flex items-center justify-center gap-6">
              انطلاق المسابقة <CartoonRocket className="w-10 h-10 group-hover:translate-x-[-10px] group-hover:translate-y-[-10px] transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-cyan-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_auto] animate-gradient"></div>
          </motion.button>
        </form>
      </div>
    </div>
  );
};

export default ConfigScreen;
