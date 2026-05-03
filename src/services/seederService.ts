
import { generateQuestions } from './geminiService';
import { GameMode, Difficulty, QuestionType } from '../types';

export const seedVault = async (onProgress: (msg: string) => void) => {
  const topics = ["ثقافة عامة", "تاريخ وجغرافيا", "علوم وتقنية", "رياضة", "أدب وفنون", "إسلاميات"];
  const difficulty = Difficulty.MEDIUM;
  
  try {
    // 1. Hex Grid (2 sessions = 56 questions)
    onProgress("جاري تجهيز أسئلة شبكة الحروف (56 سؤال)...");
    await generateQuestions(topics[0], 56, [QuestionType.OPEN], GameMode.HEX_GRID, difficulty);

    // 2. Jeopardy Grid (2 sessions = 50 questions)
    onProgress("جاري تجهيز أسئلة الجيبوردي (50 سؤال، 10 فئات)...");
    // We do it in two separate calls to get distinct category sets
    await generateQuestions(topics[1], 25, [QuestionType.OPEN], GameMode.GRID, difficulty);
    await generateQuestions(topics[2], 25, [QuestionType.OPEN], GameMode.GRID, difficulty);

    // 3. True/False (30 questions)
    onProgress("جاري تجهيز أسئلة صح أم خطأ (30 سؤال)...");
    await generateQuestions(topics[3], 30, [QuestionType.TRUE_FALSE], GameMode.TRUE_FALSE, difficulty);

    // 4. Buzzer/Timed (30 questions)
    onProgress("جاري تجهيز أسئلة السرعة (30 سؤال)...");
    await generateQuestions(topics[4], 30, [QuestionType.OPEN], GameMode.BUZZER, difficulty);

    // 5. Silent Guess (30 words)
    onProgress("جاري تجهيز كلمات التمثيل الصامت (30 كلمة)...");
    await generateQuestions(topics[5], 30, [QuestionType.OPEN], GameMode.SILENT_GUESS, difficulty);

    onProgress("تم تجهيز البنك بنجاح! جميع الأوضاع جاهزة الآن.");
    return true;
  } catch (error) {
    console.error("Seeding failed:", error);
    onProgress("فشل التجهيز التلقائي. تأكد من مفتاح API وحاول مجدداً.");
    return false;
  }
};
