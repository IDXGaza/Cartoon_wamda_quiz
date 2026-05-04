import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType, GameMode, Difficulty } from "../types";
import { QUESTION_BANK } from "../data/localBank";

import { 
  getQuestionsFromVault, 
  saveToVault,
  getRandomQuestionsFromVault
} from "./vaultService";

/**
 * 🎯 الروابط والموجهات الصارمة لكل نمط لعبة (Prompts & Rules)
 */
const MODE_RULES = {
  [GameMode.HEX_GRID]: {
    system: "أنت خبير في صياغة مسابقات 'شبكة الحروف' باللغة العربية حصراً. مهمتك هي ضمان تطابق الإجابة مع الحرف المعطى بنسبة 100%.",
    rules: [
      "اللغة: يجب أن يكون السؤال والإجابة باللغة العربية الفصحى.",
      "يجب أن تبدأ الإجابة بالحرف المطلوب بالضبط (أ، ب، ت...).",
      "يمنع ذكر الإجابة أو أي تلميح مباشر لها في نص السؤال.",
      "يمنع الهلوسة ببيانات خاطئة لمجرد مطابقة الحرف.",
      "الأسئلة قصيرة ومباشرة (أقل من 10 كلمات)."
    ]
  },
  [GameMode.GRID]: {
    system: "أنت محترف في تصميم مسابقات الجيبوردي (Jeopardy) باللغة العربية، مع فئات متدرجة الصعوبة بشكل حقيقي.",
    rules: [
      "اللغة: العربية الفصحى هي اللغة الوحيدة. يُمنع كتابة أسئلة بالإنجليزية.",
      "تدرج الصعوبة: يجب أن يكون السؤال ذو الـ 100 سهل جداً، والـ 500 يتطلب معرفة عميقة جداً أو نادرة.",
      "كل فئة يجب أن تحتوي على 5 أسئلة متسلسلة في الصعوبة.",
      "الإجابات يجب أن تكون محددة وقصيرة.",
      "ابتكار فئات مبتكرة ومرتبطة بالموضوع الرئيسي."
    ]
  },
  [GameMode.BUZZER]: {
    system: "أنت صانع مسابقات سرعة بديهة.",
    rules: [
      "الأسئلة يجب أن تكون سهلة ومباشرة (مستوى 3/10).",
      "الإجابة عبارة عن كلمة واحدة أو كلمتين بحد أقصى.",
      "تجنب الكلمات الغامضة أو الإجابات المتعددة."
    ]
  },
  [GameMode.TRUE_FALSE]: {
    system: "أنت خبير في كشف الخرافات وتوثيق الحقائق الصادمة.",
    rules: [
      "ركز على جلب معلومات مذهلة، غير معروفة، أو حقائق تبدو مضللة للوهلة الأولى.",
      "الجمل 'الصحيحة' يجب أن تكون حقائق صادمة لا تبدو حقيقية.",
      "الجمل 'الخاطئة' يجب أن تكون خرافات شائعة يظن الناس أنها صحيحة.",
      "يجب تقديم شرح علمي دقيق في حقل explanation لكل سؤال."
    ]
  },
  [GameMode.SILENT_GUESS]: {
    system: "أنت مصمم مسابقات 'بدون كلام' وتمثيل إيماءات.",
    rules: [
      "الإجابات يجب أن تكون أشياء قابلة للتمثيل الحركي (أمثال، أفلام، مهن، ميمز، شخصيات مشهورة).",
      "تجنب تماماً الكلمات المجردة (مثل 'الأمل'، 'المسؤولية'، 'الحب') التي يصعب تمثيلها بالأداء الحركي.",
      "اجعل نص السؤال يصف للمتسابق ما يجب تمثيله بوضوح."
    ]
  }
};

/**
 * 🏦 وظيفة سحب الأسئلة من بنك الأسئلة (المحلي والخاص بالمستخدم في Firestore)
 */
export const getQuestionsFromBank = async (
  topic: string,
  count: number,
  mode: GameMode,
  difficulty: Difficulty,
  excludedAnswers: string[] = []
): Promise<Question[]> => {
  let allQuestions: Question[] = [];

  // 1. Try fetching from user's personal vault in Firestore
  try {
    const { getQuestionsFromVault } = await import('./vaultService');
    const vaultQs = await getQuestionsFromVault(topic, count, mode, difficulty);
    if (vaultQs && vaultQs.length > 0) {
      allQuestions.push(...vaultQs);
    }
  } catch (e) {
    console.error("Failed to fetch from personal vault", e);
  }

  // 2. Fallback to Local Bank if needed
  if (allQuestions.length < count) {
    const needed = count - allQuestions.length;
    const rawLocalBank = (QUESTION_BANK as any)[mode] || [];
    
    // تصفية الأسئلة حسب الموضوع والمستبعد سابقاً
    const normalizedExclusions = new Set((excludedAnswers || []).map(item => item.trim().toLowerCase()));

    let filtered = rawLocalBank.filter((q: any) => 
      !normalizedExclusions.has(q.id?.toLowerCase()) && 
      !normalizedExclusions.has(q.text?.trim().toLowerCase()) &&
      !normalizedExclusions.has(q.answer?.trim().toLowerCase()) && (
        (q.category && (
          q.category.includes(topic) || 
          topic.includes(q.category) ||
          topic === 'عام' ||
          topic === 'ثقافة عامة' ||
          topic === 'معلومات عامة'
        )) || 
        topic === 'عام' ||
        topic === 'ثقافة عامة' ||
        topic === 'معلومات عامة'
      )
    );

    if (filtered.length === 0) {
      filtered = rawLocalBank.filter((q: any) => 
        !normalizedExclusions.has(q.id?.toLowerCase()) && 
        !normalizedExclusions.has(q.text?.trim().toLowerCase()) &&
        !normalizedExclusions.has(q.answer?.trim().toLowerCase())
      );
    }

    // Ultimate fallback if still empty
    if (filtered.length === 0) {
      filtered = [...rawLocalBank];
    }

    let selectedQuestions: any[] = [];

    const difficultyScore = { [Difficulty.EASY]: 1, [Difficulty.MEDIUM]: 2, [Difficulty.HARD]: 3 };

    if (mode === GameMode.HEX_GRID) {
      // منطق الشبكة: اختيار سؤال واحد لكل حرف من الحروف الـ 28
      const lettersToFill = [...ARABIC_ALPHABET];
      const shuffledFiltered = shuffleArray(filtered);
      
      for (const char of lettersToFill) {
        const found = shuffledFiltered.find((q: any) => 
          q.letter === char && 
          !selectedQuestions.some((sq: any) => (sq.id && sq.id === q.id) || sq.text === q.text)
        );
        if (found) {
          selectedQuestions.push(found);
        }
      }
      // ملاحظة: لا نضيف أسئلة عشوائية إضافية هنا لضمان عدم تكرار الحروف في الشبكة
      // النقص سيتم معالجته في GameScreen عن طريق طلب أسئلة AI أو عرض حروف فارغة
    } else if (mode === GameMode.GRID) {
      // منطق الشبكة: اختيار 5 فئات متنوعة، و5 أسئلة لكل فئة بتدرج صعوبة
      const groupedByCat: Record<string, any[]> = {};
      filtered.forEach(q => {
        const cat = q.category || 'عام';
        if (!groupedByCat[cat]) groupedByCat[cat] = [];
        groupedByCat[cat].push(q);
      });

      const availableCats = shuffleArray(Object.keys(groupedByCat));
      const catsToUse = availableCats.slice(0, 5);

      catsToUse.forEach(cat => {
        const catQs = groupedByCat[cat];
        const easyQs = shuffleArray(catQs.filter((q: any) => q.difficulty === 'easy' || q.difficulty === 'EASY'));
        const mediumQs = shuffleArray(catQs.filter((q: any) => q.difficulty === 'medium' || q.difficulty === 'MEDIUM'));
        const hardQs = shuffleArray(catQs.filter((q: any) => q.difficulty === 'hard' || q.difficulty === 'HARD'));

        let selectedForCat: any[] = [];
        // تدرج: 2 سهل، 2 متوسط، 1 صعب
        selectedForCat.push(...easyQs.slice(0, 2));
        selectedForCat.push(...mediumQs.slice(0, 2));
        selectedForCat.push(...hardQs.slice(0, 1));

        // إكمال النقص إذا وجد
        if (selectedForCat.length < 5) {
          const remaining = shuffleArray(catQs.filter(q => !selectedForCat.some(sq => sq.id === q.id))).slice(0, 5 - selectedForCat.length);
          selectedForCat.push(...remaining);
        }

        // فرز حسب الصعوبة
        selectedForCat.sort((a, b) => (difficultyScore[(a.difficulty?.toUpperCase() as Difficulty) || Difficulty.EASY] || 0) - (difficultyScore[(b.difficulty?.toUpperCase() as Difficulty) || Difficulty.EASY] || 0));
        
        selectedQuestions.push(...selectedForCat);
      });

      // إذا كانت الفئات المختارة غير كافية للوصول لـ count، نكمل عشوائياً
      if (selectedQuestions.length < needed) {
        const remaining = shuffleArray(filtered.filter(q => !selectedQuestions.some(sq => sq.id === q.id))).slice(0, needed - selectedQuestions.length);
        selectedQuestions.push(...remaining);
      }
    } else {
      selectedQuestions = shuffleArray(filtered)
        .filter((lq: any) => !allQuestions.some(aq => (aq.id && aq.id === lq.id) || aq.text === lq.text))
        .slice(0, needed);
    }

    const adaptedLocal = selectedQuestions.map((q: any, i: number) => ({
      id: q.id,
      text: q.text,
      answer: q.answer,
      category: q.category,
      points: mode === GameMode.GRID ? ((i % 5) + 1) * 100 : 100,
      letter: q.letter,
      type: mode === GameMode.TRUE_FALSE ? QuestionType.TRUE_FALSE : QuestionType.OPEN,
      difficulty: (q.difficulty?.toUpperCase() as Difficulty) || difficulty,
      explanation: q.explanation,
      generatedBy: "Local Bank",
      mode: mode
    }));

    allQuestions.push(...adaptedLocal);
  }

  return allQuestions.slice(0, count);
};

let useGeminiOnly = true;
const ARABIC_ALPHABET = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");

const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export const extractJson = (textInput: any): string => {
  if (!textInput) return "";
  const text = typeof textInput === 'string' ? textInput : JSON.stringify(textInput);
  
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let cleaned = text;
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }
  
  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');
  
  let startIdx = -1;
  if (firstBracket !== -1 && firstBrace !== -1) {
    startIdx = Math.min(firstBracket, firstBrace);
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  }
  
  if (startIdx === -1) return cleaned;
  
  let extracted = cleaned.substring(startIdx);
  
  const closeSequences = ['', ']', '}', '}]', ']}', '"]}', '"}', '"]', '}]}'];
  
  for (const seq of closeSequences) {
    try {
      JSON.parse(extracted + seq);
      return extracted + seq;
    } catch (e) {}
  }
  
  let trimmed = extracted.trim();
  if (trimmed.endsWith(',')) {
    const withoutComma = trimmed.substring(0, trimmed.length - 1).trim();
    for (const seq of closeSequences) {
      try {
        JSON.parse(withoutComma + seq);
        return withoutComma + seq;
      } catch (e) {}
    }
  }
  
  for (let i = extracted.length - 1; i >= 0; i--) {
    const char = extracted[i];
    if (char === '}' || char === ']' || char === ',' || char === '"') {
      let truncated = extracted.substring(0, i + 1).trim();
      for (const seq of closeSequences) {
        try {
          const p = JSON.parse(truncated + seq);
          if (typeof p === 'object' && p !== null && Object.keys(p).length > 0) return truncated + seq;
        } catch (e) {}
      }
      if (truncated.endsWith(',')) {
        const withoutComma = truncated.substring(0, truncated.length - 1).trim();
        for (const seq of closeSequences) {
          try {
            const p = JSON.parse(withoutComma + seq);
            if (typeof p === 'object' && p !== null && Object.keys(p).length > 0) return withoutComma + seq;
          } catch (e) {}
        }
      }
    }
  }
  
  return extracted;
};

const getDifficultyText = (diff: Difficulty) => {
  switch (diff) {
    case Difficulty.EASY: return "سهل (للمبتدئين)";
    case Difficulty.MEDIUM: return "متوسط (للمثقف العام)";
    case Difficulty.HARD: return "صعب (للمتخصصين)";
    default: return "متوازن";
  }
};

export const getAI = () => {
  // Respect the system instruction to use GEMINI_API_KEY as primary
  let apiKey = process.env.GEMINI_API_KEY || "";
  
  // Also check for API_KEY as a literal fallback if specifically set for this app
  if (!apiKey && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }
  
  try {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.apiKeys?.gemini && parsed.apiKeys.gemini.trim() !== "") {
        apiKey = parsed.apiKeys.gemini;
      }
    }
  } catch (e) {
    console.error("Failed to read API key from settings", e);
  }

  const sanitizedApiKey = String(apiKey || "").replace(/[^\x20-\x7E]/g, "").trim();

  if (!sanitizedApiKey) {
    console.warn("No Gemini API key found. AI features will likely fail.");
  }

  return new GoogleGenAI({ apiKey: sanitizedApiKey });
};

const getErrorMessage = (error: any): string => {
  if (!error) return "Unknown error";
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.error?.message) return error.error.message;
  if (error.statusText) return error.statusText;
  if (error.reason) return error.reason;
  try {
    const stringified = JSON.stringify(error);
    if (stringified !== '{}') return stringified;
  } catch (e) {}
  return String(error);
};

const isQuotaError = (error: any): boolean => {
  const errorStr = getErrorMessage(error).toLowerCase();
  return (
    errorStr.includes("429") || 
    errorStr.includes("quota") || 
    errorStr.includes("limit") || 
    errorStr.includes("exceeded") || 
    errorStr.includes("exhausted") || 
    errorStr.includes("failed to call the gemini api") ||
    errorStr.includes("deadline") ||
    errorStr.includes("too many requests") ||
    errorStr.includes("billing") ||
    errorStr.includes("credit")
  );
};

export const retry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = getErrorMessage(error);
    if (retries > 0 && !isQuotaError(error)) {
      await new Promise(res => setTimeout(res, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const generateQuestions = async (
  topic: string,
  numQuestions: number,
  types: QuestionType[],
  mode: GameMode,
  difficulty: Difficulty,
  aiModel: string = "gemini-1.5-flash",
  categories?: string[],
  excludedAnswers?: string[]
): Promise<Question[]> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn("Offline detected. Falling back to local bank immediately.");
    return getQuestionsFromBank(topic, numQuestions, mode, difficulty, excludedAnswers);
  }

  const ai = getAI();
  const difficultyContext = getDifficultyText(difficulty);
  const allQuestions: Question[] = [];

  const generateSingleBatch = async (batchNum: number, batchStartIdx: number, batchLetters?: string[], category?: string): Promise<Question[]> => {
    const isTF = mode === GameMode.TRUE_FALSE || types.includes(QuestionType.TRUE_FALSE);
    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          answer: { type: Type.STRING },
          category: { type: Type.STRING },
          points: { type: Type.NUMBER },
          letter: { type: Type.STRING },
          explanation: { type: Type.STRING },
          difficulty: { type: Type.STRING, enum: ["EASY", "MEDIUM", "HARD"] }
        },
        required: ["text", "answer"]
      }
    };

    const modeInfo = MODE_RULES[mode] || { system: "Arabic quiz maker.", rules: [] };
    const rulesText = modeInfo.rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
    let systemInstruction = `${modeInfo.system}\nRules:\n${rulesText}\nCorrect facts only. No spoilers.`;
    if (topic.includes("أئمة") || topic.includes("أهل البيت")) systemInstruction += "\nUse Shia perspective.";
    
    let promptText = "";
    if (mode === GameMode.HEX_GRID) {
      promptText = `Hex Grid. Topic: ${topic}. Letters: [${batchLetters?.join(", ")}]. JSON array of {text, answer, letter}.`;
    } else if (mode === GameMode.GRID) {
      promptText = `Jeopardy Style. Topic: ${topic}. Categories: [${category}]. Request exactly 5 questions for EACH category with points 100, 200, 300, 400, 500. Total 25 questions. JSON array of {text, answer, category, points, difficulty}.`;
    } else {
      promptText = `Mode: ${mode}. Topic: ${topic}. Num: ${batchNum}. Difficulty: ${difficultyContext}. JSON array of {text, answer}.`;
    }

    const modelsToTry = aiModel.startsWith('groq') || aiModel.startsWith('qrok')
      ? [aiModel.replace('qrok', 'groq')] 
      : ["gemini-1.5-flash", "gemini-2.0-flash-lite"];

    for (const model of modelsToTry) {
      try {
        let data: any = null;
        
        if (model.startsWith('groq') || model.startsWith('qrok')) {
          let groqKey = "";
          try {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
              const parsed = JSON.parse(savedSettings);
              if (parsed.apiKeys?.groq) groqKey = parsed.apiKeys.groq;
            }
          } catch (e) {}

          const groqModelName = model.replace('groq-', '').replace('qrok-', '');

          const response = await fetch('/api/groq', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: groqModelName,
              apiKey: groqKey,
              systemInstruction: systemInstruction + "\nيجب أن يكون الرد مصفوفة JSON صالحة فقط. لا تضع رموز ماركداون.",
              promptText: promptText
            })
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(`Groq Proxy Error: ${response.status} ${JSON.stringify(errBody)}`);
          }

          const result = await response.json();
          const content = result.choices[0].message.content;
          data = JSON.parse(extractJson(content));
        } else {
          const result = await retry(() => ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema, maxOutputTokens: 2048 }
          })) as any;
          
          data = JSON.parse(extractJson(result.text || "[]"));
        }

        if (!Array.isArray(data)) data = data.questions || Object.values(data).find(Array.isArray) || [data];

        return data.filter((q: any) => q && q.text && q.answer).map((q: any, idx: number) => {
          let points = q.points || 100;
          let diff = (q.difficulty as Difficulty) || difficulty;
          if (mode === GameMode.GRID) {
            points = q.points || ((idx % 5) + 1) * 100;
            diff = points >= 400 ? Difficulty.HARD : (points === 300 ? Difficulty.MEDIUM : Difficulty.EASY);
          }
          return {
            id: `q-${Date.now()}-${batchStartIdx + idx}-${Math.random().toString(36).substr(2, 5)}`,
            text: q.text,
            answer: isTF ? (q.answer.includes("خطأ") ? "خطأ" : "صواب") : q.answer,
            category: q.category || category || topic,
            points,
            letter: q.letter || (batchLetters ? batchLetters[idx] : undefined),
            explanation: q.explanation,
            type: isTF ? QuestionType.TRUE_FALSE : QuestionType.OPEN,
            difficulty: diff,
            topic: topic,
            generatedBy: model,
            mode: mode
          };
        });
      } catch (e) { console.warn(`Model ${model} failed`, e); continue; }
    }
    return [];
  };

  try {
    if (mode === GameMode.HEX_GRID) {
      const letters = shuffleArray(ARABIC_ALPHABET.slice(0, 28));
      const questions = await generateSingleBatch(28, 0, letters);
      allQuestions.push(...questions);
    } else if (mode === GameMode.GRID) {
      const cats = (categories && categories.length > 0) ? categories.slice(0, 5) : ["ثقافة", "علوم", "تاريخ", "أمثال", "فن"];
      const questions = await generateSingleBatch(25, 0, undefined, cats.join(", "));
      allQuestions.push(...questions);
    } else {
      const questions = await generateSingleBatch(numQuestions, 0);
      allQuestions.push(...questions);
    }
    
    if (allQuestions.length === 0) return getQuestionsFromBank(topic, numQuestions, mode, difficulty);
    return allQuestions.slice(0, numQuestions);
  } catch (e) {
    return getQuestionsFromBank(topic, numQuestions, mode, difficulty);
  }
};

export const autoGenerateAllQuestions = async (
  topic: string,
  difficulty: Difficulty,
  onProgress?: (msg: string) => void,
  signal?: AbortSignal
): Promise<void> => {
  const modesToGenerate = [
    { mode: GameMode.HEX_GRID, count: 28, label: "شبكة الحروف" }, // Reduced count for faster auto-gen
    { mode: GameMode.GRID, count: 25, label: "الشبكة الكلاسيكية" },
    { mode: GameMode.BUZZER, count: 20, label: "تحدي البازر" },
    { mode: GameMode.TRUE_FALSE, count: 20, label: "صواب أم خطأ" },
    { mode: GameMode.SILENT_GUESS, count: 20, label: "تمثيل صامت" }
  ];

  for (const { mode, count, label } of modesToGenerate) {
    if (signal?.aborted) throw new Error("تم إلغاء التوليد");
    if (onProgress) onProgress(`جاري توليد أسئلة: ${label}...`);
    try {
      await generateQuestions(topic, count, [mode === GameMode.TRUE_FALSE ? QuestionType.TRUE_FALSE : QuestionType.OPEN], mode, difficulty);
    } catch (err: any) {
      if (err.message === "تم إلغاء التوليد") throw err;
      console.error(`Failed to generate for mode ${mode}:`, err);
    }
  }
};

export const parseCustomJson = (
  jsonStr: string,
  topic: string,
  mode: GameMode,
  difficulty: Difficulty
): Question[] => {
  try {
    const rawData = JSON.parse(jsonStr);
    if (!Array.isArray(rawData)) {
      throw new Error("يجب أن يكون النص المدخل عبارة عن مصفوفة JSON.");
    }

    return rawData.map((q: any, idx: number) => {
      let category = q.category || topic;
      let points = q.points || 100;
      
      if (mode === GameMode.GRID && !q.category) {
        const catIndex = Math.floor(idx / 5);
        category = `الفئة ${catIndex + 1}`;
        points = ((idx % 5) + 1) * 100;
      }

      return {
        id: `custom-${Date.now()}-${idx}`,
        text: q.text || "سؤال غير معروف",
        answer: q.answer || "",
        category: category,
        points: points,
        letter: mode === GameMode.HEX_GRID ? (q.letter || ARABIC_ALPHABET[idx % 25]) : q.letter,
        type: QuestionType.OPEN,
        difficulty: (q.difficulty as Difficulty) || difficulty,
        emojis: q.emojis
      };
    });
  } catch (error: any) {
    throw new Error("فشل في تحليل JSON المدخل: " + error.message);
  }
};

export const getSampleJson = (mode: GameMode, topic: string): string => {
  if (mode === GameMode.HEX_GRID) {
    const samples = ARABIC_ALPHABET.slice(0, 25).map(l => ({
      text: `سؤال يبدأ بحرف ${l} عن ${topic}`,
      answer: `${l}...`,
      difficulty: "MEDIUM",
      letter: l
    }));
    return JSON.stringify(samples, null, 2);
  } else {
    const samples = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 1; j <= 5; j++) {
        samples.push({
          text: `سؤال الفئة ${i + 1} بقيمة ${j * 100} عن ${topic}`,
          answer: "إجابة نموذجية",
          category: `الفئة ${i + 1}`,
          points: j * 100,
          difficulty: "MEDIUM"
        });
      }
    }
    return JSON.stringify(samples, null, 2);
  }
};

async function fallbackGenerate(topic: string, num: number, mode: GameMode, difficulty: Difficulty, aiModel: string = "gemini-2.0-flash"): Promise<Question[]> {
  const ai = getAI();
  let textOutput = "";
  const currentModel = useGeminiOnly ? "gemini-2.0-flash" : aiModel;
  const systemInstruction = "أنت صانع محتوى إبداعي ومصمم مسابقات محترف. الخطوط الحمراء: يُمنع ذكر إسرائيل أو أي مدن فلسطينية بمسميات إسرائيلية. يجب أن تكون الإجابة مرتبطة منطقياً وصحيحة 100% للسؤال.";
  let promptText = `أنشئ مصفوفة JSON بسيطة لـ ${num} أسئلة عن ${topic} بمستوى صعوبة ${getDifficultyText(difficulty)}. 
مهم جداً: تأكد من أن الإجابة صحيحة تماماً ومرتبطة بالسؤال. لا تضع إجابات عشوائية.
الخطوط الحمراء (قيد صارم جدًا): يُمنع منعاً باتاً ذكر "إسرائيل". الأسئلة يجب أن تتوافق تماماً مع الثقافة العربية والإسلامية.
${mode === GameMode.SILENT_GUESS ? "الإجابات للتمثيل الصامت (أمثال، أفلام، مواقف)." : ""}
مهم جداً: اجعل الأسئلة قصيرة جداً ومختصرة (لا تتجاوز 10-15 كلمة).
يجب أن يكون الرد عبارة عن مصفوفة JSON فقط تحتوي على كائنات بها الحقول "text" و "answer".
مثال: [ { "text": "سؤال؟", "answer": "إجابة" } ]`;


  try {
    if (currentModel.includes("gemini")) {
      const response = await retry(() => (ai.models as any).generateContent({
        model: currentModel, 
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          maxOutputTokens: 4096,
          responseSchema: (() => {
              const schema: any = {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    answer: { type: Type.STRING },
                    letter: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["text", "answer"]
                }
              };
              return schema;
            })()
        }
      })) as any;
      textOutput = response.text || "[]";
    } else {
      let apiKeys = {};
      try {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.apiKeys) {
            apiKeys = parsed.apiKeys;
          }
        }
      } catch (e) {
        console.error("Failed to read API keys from settings", e);
      }

      const sanitizedApiKeys = Object.entries(apiKeys || {}).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, "").trim() : value;
        return acc;
      }, {} as any);

      const sanitizedModel = String(currentModel || "").replace(/[^\x20-\x7E]/g, "").trim();

      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: promptText + " Return ONLY valid JSON array.", model: sanitizedModel, apiKeys: sanitizedApiKeys })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `Backend failed with status ${res.status}`;
        if (res.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("QUOTA_EXCEEDED")) {
          console.warn("Quota exceeded for non-Gemini model during fallback, switching to Gemini...");
          useGeminiOnly = true;
          return fallbackGenerate(topic, num, mode, difficulty, "gemini-2.0-flash");
        }
        throw new Error("Backend failed during fallback: " + errorMsg);
      }
      const data = await res.json();
      textOutput = data.text;
    }

    textOutput = extractJson(textOutput);
    textOutput = textOutput.replace(/:\s*([0-9]{15,})[^,}\]]*/g, ': 100');
    
    let data: any[] = [];
    try {
      data = JSON.parse(textOutput || "[]");
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Empty or invalid JSON array during fallback");
      }
    } catch (e) {
      console.error("Fallback JSON Parse Error:", e, textOutput);
      throw new Error("فشل في تحليل الرد في المحاولة البديلة.");
    }
    
    return data.map((q: any, i: number) => {
      let category = topic;
      let points = 100;
      
      if (mode === GameMode.GRID) {
        const catIndex = Math.floor(i / 5);
        category = `الفئة ${catIndex + 1}`;
        points = ((i % 5) + 1) * 100;
      }

      let actualLetter = "";
      if (mode === GameMode.HEX_GRID) {
        if (q.answer) {
          actualLetter = q.answer.replace(/^ال/, '').trim().charAt(0).toUpperCase();
        } else {
          actualLetter = ARABIC_ALPHABET[i % 25];
        }
      }

      return {
        id: `fb-${Date.now()}-${i}`,
        text: q.text || "",
        answer: q.target || q.answer || "",
        category: q.category || category,
        points: q.points || points,
        letter: actualLetter,
        hint: q.hint,
        explanation: q.explanation,
        type: QuestionType.OPEN,
        difficulty: difficulty,
        emojis: q.emojis,
        generatedBy: currentModel || 'fallback'
      };
    });
  } catch (error: any) {
    const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
    const isQuotaError = error.message?.includes("429") || error.message?.includes("quota") || error.message?.includes("QUOTA_EXCEEDED") || errorStr.includes("429") || errorStr.includes("quota") || errorStr.includes("RESOURCE_EXHAUSTED");
    
    if (isQuotaError) {
      throw new Error("انتهت حصة الاستخدام (Quota) لهذا المحرك. يرجى الانتظار أو تغيير المحرك.");
    } else {
      console.error("Fallback Generation Error:", error.message || error);
      throw error;
    }
  }
}

export const testAI = async (model: string): Promise<{ success: boolean, message: string }> => {
  try {
    if (model.startsWith('groq')) {
      let groqKey = "";
      try {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.apiKeys?.groq) groqKey = parsed.apiKeys.groq;
        }
      } catch (e) {}

      const groqModelName = model.replace('groq-', '');

      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: groqModelName,
          apiKey: groqKey,
          systemInstruction: "Verify connection.",
          promptText: "Say 'OK'"
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        return { success: false, message: `Groq Error: ${response.status} ${JSON.stringify(errBody)}` };
      }

      return { success: true, message: "تم الاتصال بـ Groq بنجاح!" };
    }

    const ai = getAI();
    const modelName = model.includes("gemini") ? model : "gemini-2.0-flash";
    
    const response = await (ai.models as any).generateContent({
      model: modelName,
      contents: [{ role: "user", parts: [{ text: "Say 'OK' if you can read this." }] }],
      config: { maxOutputTokens: 10 }
    }) as any;
    
    if (response.text && response.text.includes("OK")) {
      return { success: true, message: "تم الاتصال بنجاح!" };
    }
    return { success: false, message: "استجابة غير متوقعة من المحرك." };
  } catch (error: any) {
    console.error("AI Test Failed:", error);
    return { success: false, message: error.message || "فشل الاتصال بالمحرك." };
  }
};

const normalizeArabicLetter = (l: string | undefined | null) => {
  if (!l) return '';
  // Normalize letters to match the standardized bank
  // [أإآا] -> أ
  // [ةه] -> ه
  // [ىي] -> ي
  return l.replace(/[أإآا]/g, 'أ').replace(/[ةه]/g, 'ه').replace(/[ىي]/g, 'ي').trim();
};

export const fetchSingleQuestion = async (
  letter: string,
  topic: string,
  difficulty: Difficulty,
  aiModel: string,
  excludedAnswers: string[] = []
): Promise<Question> => {
  // 1. سرعة فائقة: البحث في البنك المحلي أولاً
  const localQs = (QUESTION_BANK as any)[GameMode.HEX_GRID] || [];
  const normalizedTarget = normalizeArabicLetter(letter);
  const normalizedExclusions = new Set(excludedAnswers.map(item => item.trim().toLowerCase()));

  const foundInBank = localQs.find((q: any) => 
    normalizeArabicLetter(q.letter) === normalizedTarget && 
    !normalizedExclusions.has(q.text?.trim().toLowerCase()) &&
    !normalizedExclusions.has(q.answer?.trim().toLowerCase())
  );
  
  if (foundInBank) {
    return {
      id: `bank-${foundInBank.id}-${Date.now()}`,
      text: foundInBank.text,
      answer: foundInBank.answer,
      category: foundInBank.category || "عام",
      points: 100,
      letter: letter,
      type: QuestionType.OPEN,
      difficulty: (foundInBank.difficulty?.toUpperCase() as Difficulty) || Difficulty.MEDIUM
    };
  }

  // 2. إذا لم يوجد في البنك، ولم يتوفر اتصال، نأخذ عشوائياً بدلاً من التعطيل (خاصة لنمط شبكة الحروف)
  if (topic === "HEX_GRID_NO_AI" || (topic.includes("عام") && letter)) { 
    const matchingLetterQs = localQs.filter((q: any) => normalizeArabicLetter(q.letter) === normalizedTarget);
    const pool = matchingLetterQs.length > 0 ? matchingLetterQs : localQs;
    const randomFallback = pool[Math.floor(Math.random() * pool.length)] || { 
      text: `ما هو الشيء الذي تبدأ تسميته بحرف "${letter}"؟`, 
      answer: 'إجابة عامة' 
    };
    return {
      id: `fallback-${Date.now()}`,
      text: randomFallback.text,
      answer: randomFallback.answer,
      category: "عام",
      points: 100,
      letter: matchingLetterQs.length > 0 ? letter : (randomFallback.letter || letter),
      type: QuestionType.OPEN,
      difficulty: Difficulty.MEDIUM
    };
  }

  const limitedExclusions = excludedAnswers.slice(0, 100);
  const exclusionText = limitedExclusions.length > 0 
    ? `\nمهم جداً (أولوية قصوى): يمنع منعاً باتاً تكرار أي من المواضيع أو الإجابات التالية لأنها استخدمت سابقاً: [${limitedExclusions.join("، ")}]. ابحث عن معلومة جديدة تماماً.`
    : "";

  const difficultyText = getDifficultyText(difficulty);
  const hardContext = difficulty === Difficulty.HARD 
    ? "\nملاحظة للمستوى الصعب: ابحث عن معلومة نادرة أو دقيقة جداً لا يعرفها إلا المتخصصون أو المطلعون بعمق على الموضوع." 
    : "";

  const randomAngles = [
    "ركز على معلومة تاريخية.",
    "ركز على معلومة علمية.",
    "ركز على شخصية مشهورة.",
    "ركز على مكان جغرافي.",
    "ركز على مصطلح تقني أو فني.",
    "ركز على حقيقة مذهلة وغير شائعة."
  ];
  const randomAngle = randomAngles[Math.floor(Math.random() * randomAngles.length)];

  const promptText = `اكتب "جملة تعريفية" مباشرة تصف إجابة تبدأ بحرف "${letter}".
الموضوع: ${topic}
المستوى المطلوب: ${difficultyText}${hardContext}

قوانين الصياغة (التزام مطلق):
1. "ثبات الحرف": ابحث أولاً عن كلمة "طبيعية" تبدأ بحرف "${letter}". يمنع منعاً باتاً تركيب جملة لجعلها تبدأ بالحرف (مثل تحويل "زحل" إلى "كوكب زحل" لمطابقة حرف الكاف). إذا كان الحرف هو "${letter}"، يجب أن تكون الإجابة كلمة تبدأ به أصلاً.
2. "الأسلوب المباشر": نص السؤال هو تعريف (مثل أمثلة المستخدم)، يمنع استخدام "ما هو" أو "؟".
3. أمثلة: "اللغة الأكثر انتشاراً.."، "العالم الذي صاغ..".

معايير الجودة (إلزامية):
1. الدقة الحرفية: الإجابة تبدأ بالحرف "${letter}" (تجاهل ال التعريف).
2. عدم الذكر: لا تذكر الإجابة أو الحرف في نص السؤال.${exclusionText}`;

  const systemInstructionBase = `أنت صانع محتوى إبداعي ومصمم مسابقات محترف.
الخطوط الحمراء (قيد صارم جدًا): يُمنع منعاً باتاً ومطلقاً ذكر "إسرائيل" أو أي كيانات تابعة لها أو مدن محتلة تحت مسمياتها الإسرائيلية. الأسئلة يجب أن تتوافق تماماً مع الثقافة العربية والإسلامية.
مهمتك هي إرسال جمل تعريفية مباشرة (بدون علامات استفهام، بدون "ما هو").
يجب عليك إرجاع كائن JSON واحد فقط يحتوي على:
- text: نص التعريف المباشر.
- answer: الإجابة الصحيحة (يجب أن تبدأ بحرف ${letter} بشكل طبيعي دون إجبار).
- hint: تلميح ذكي وبسيط يساعد في الوصول للإجابة دون ذكرها صراحة.

تنبيه للحساسية الدينية (سيرة الأئمة/أهل البيت): إذا كان الموضوع مرتبطاً بالأئمة المعصومين أو أهل البيت، يجب الالتزام بالروايات المعتمدة عند الشيعة (مثلاً: علي عليه السلام هو أول من أسلم).

تنبيه: لا تترك حقل "answer" فارغاً أبداً.`;

  const systemInstruction = systemInstructionBase;

  const schema = {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "نص السؤال" },
      answer: { type: Type.STRING, description: "الإجابة" },
      hint: { type: Type.STRING, description: "تلميح" }
    },
    required: ["text", "answer"]
  };

  const modelsToTry = [
    aiModel,
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-flash-latest"
  ].filter((m, i, self) => m && self.indexOf(m) === i);

  for (const currentModel of modelsToTry) {
    try {
      let textOutput = "";
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        if (currentModel.includes("gemini")) {
          const aiInstance = getAI();
          const seed = Math.floor(Math.random() * 1000000);
          const response = await retry(() => aiInstance.models.generateContent({
            model: currentModel,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              maxOutputTokens: 2048,
              seed: seed,
              responseSchema: schema,
            }
          })) as any;
          
          textOutput = response.text || "";
          
          if (!textOutput || textOutput === "{}") {
            const candidate = response.candidates?.[0];
            if (candidate?.content?.parts?.[0]?.text) {
              textOutput = candidate.content.parts[0].text;
            } else if (candidate?.finishReason === 'SAFETY') {
              if (attempts < maxAttempts) continue;
              throw new Error("تم حجب الرد من قبل فلاتر الأمان.");
            }
          }
        } else if (currentModel.startsWith('groq') || currentModel.startsWith('qrok')) {
          let groqKey = "";
          try {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
              const parsed = JSON.parse(savedSettings);
              if (parsed.apiKeys?.groq) groqKey = parsed.apiKeys.groq;
            }
          } catch (e) {}

          if (!groqKey) throw new Error("Groq API Key missing");

          const groqModelName = currentModel.replace('groq-', '').replace('qrok-', '');

          const response = await fetch('/api/groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: groqModelName,
              apiKey: groqKey,
              systemInstruction: systemInstruction + "\nيجب أن يكون الرد كائن JSON صالح فقط. لا تضع رموز ماركداون.",
              promptText: promptText
            })
          });

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(`Groq Proxy Error: ${response.status} ${JSON.stringify(errBody)}`);
          }

          const result = await response.json();
          textOutput = result.choices[0].message.content;
        } else {
          let apiKeys = {};
          try {
            const savedSettings = localStorage.getItem('appSettings');
            if (savedSettings) {
              const parsed = JSON.parse(savedSettings);
              if (parsed.apiKeys) apiKeys = parsed.apiKeys;
            }
          } catch (e) {}

          const sanitizedApiKeys = Object.entries(apiKeys || {}).reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'string' ? value.replace(/[^\x20-\x7E]/g, "").trim() : value;
            return acc;
          }, {} as any);

          const res = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptText: promptText + " Return ONLY valid JSON object.", model: currentModel, apiKeys: sanitizedApiKeys, systemInstruction })
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || `Backend failed with status ${res.status}`);
          }
          const data = await res.json();
          textOutput = data.text;
        }

        textOutput = extractJson(textOutput);
        let data: any;
        try {
          data = JSON.parse(textOutput);
        } catch (e) {
          if (attempts < maxAttempts) continue;
          throw new Error("فشل في تحليل JSON.");
        }

        const cleanText = (data.text || "").trim();
        const cleanAnswer = (data.answer || "").trim();

        if (!cleanText || !cleanAnswer) {
          if (attempts < maxAttempts) continue;
          throw new Error("بيانات غير مكتملة.");
        }

        return {
          id: `sq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          text: cleanText,
          answer: cleanAnswer,
          category: topic,
          points: 100,
          letter: letter,
          hint: (data.hint || "").trim(),
          type: QuestionType.OPEN,
          difficulty: difficulty,
          generatedBy: currentModel
        };
      }
    } catch (error: any) {
      const errorStr = getErrorMessage(error);
      
      console.warn(`Model ${currentModel} failed for fetchSingleQuestion: ${errorStr}`);
      
      if (isQuotaError(error) && currentModel === modelsToTry[modelsToTry.length - 1]) {
        break;
      }
      continue;
    }
  }
  
  throw new Error("فشل الذكاء الاصطناعي في توليد السؤال المطلوب.");
};
