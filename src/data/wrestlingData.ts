import { BankQuestion } from './localBank';

export const WRESTLING_QUESTIONS: BankQuestion[] = (() => {
  const diffs: ('beginner' | 'easy' | 'medium' | 'hard' | 'expert')[] = ['beginner', 'easy', 'medium', 'hard', 'expert'];
  const questions: BankQuestion[] = [];
  
  // Real Wrestling Questions Sample
  const realQuestions = [
    { text: 'من هو المصارع الملقب بـ "الرجل الميت"؟', answer: 'أندرتيكر', difficulty: 'beginner' },
    { text: 'ما هو اسم الاتحاد الشهير الذي يضم جون سينا؟', answer: 'WWE', difficulty: 'beginner' },
    { text: 'ما هو اسم المصارع الذي يلقب بـ "الوحش البشري"؟', answer: 'بروك ليسنر', difficulty: 'beginner' },

    { text: 'من هو المصارع الذي اشتهر بحركة "ستون كولد ستانر"؟', answer: 'ستيف أوستن', difficulty: 'easy' },
    { text: 'كم عدد حبال الحلبة التقليدية؟', answer: '3', difficulty: 'easy' },
    { text: 'من هو المصارع الذي يلقب بـ "الأفعى"؟', answer: 'راندي أورتن', difficulty: 'easy' },
    { text: 'من هو المصارع الأسطوري الملقب بـ "ذا روك"؟', answer: 'دواين جونسون', difficulty: 'easy' },

    { text: 'ما اسم أكبر عرض سنوي للمصارعة في WWE؟', answer: 'ريسلمانيا', difficulty: 'medium' },
    { text: 'من هو المصارع الذي يلقب بـ "الرجل الذي لا يقهر"؟', answer: 'رومان رينز', difficulty: 'medium' },
    { text: 'من هو المصارع الذي حقق أطول سلسلة انتصارات في ريسلمانيا؟', answer: 'أندرتيكر', difficulty: 'medium' },
    { text: 'ما اسم لقب البطولة الذي يحمله رومان رينز حالياً؟', answer: 'يونيفرسال', difficulty: 'medium' },

    { text: 'من هو المصارع الذي لقب بـ "القلب الجريح"؟', answer: 'شون مايكلز', difficulty: 'hard' },
    { text: 'ما هو اسم الاتحاد الياباني الكبير المعروف اختصاراً بـ NJPW؟', answer: 'نيو جابان برو ريسلينغ', difficulty: 'hard' },
    { text: 'من هو المصارع الذي شارك في أول مباراة "هيل إن أ سيل"؟', answer: 'شاون مايكلز وأندرتيكر', difficulty: 'hard' },

    { text: 'من هو المصارع الذي لقب بـ "المدمر" وبدأ سلسلة انتصاراته في WWE؟', answer: 'غولدبيرغ', difficulty: 'expert' },
    { text: 'ما اسم أول عرض ريسلمانيا أقيم في التاريخ؟', answer: 'ريسلمانيا 1', difficulty: 'expert' },
    { text: 'ما هي الحركة القاضية للمصارع بروك ليسنر؟', answer: 'اف فايف', difficulty: 'expert' },
    { text: 'من هو المصارع الذي يحمل الرقم القياسي لأكثر من فاز بلقب القارات في WWE؟', answer: 'كريس جيريكو', difficulty: 'expert' }
  ];

  const questionsByDiff: Record<string, typeof realQuestions> = {
    beginner: realQuestions.filter(q => q.difficulty === 'beginner'),
    easy: realQuestions.filter(q => q.difficulty === 'easy'),
    medium: realQuestions.filter(q => q.difficulty === 'medium'),
    hard: realQuestions.filter(q => q.difficulty === 'hard'),
    expert: realQuestions.filter(q => q.difficulty === 'expert'),
  };

  for (let i = 0; i < 150; i++) {
    const diffIndex = i % 5;
    const diff = diffs[diffIndex];
    const availableQuestions = questionsByDiff[diff];
    const q = availableQuestions[i % availableQuestions.length];
    
    questions.push({
      id: `wrestle_${i + 1}`,
      category: 'المصارعة',
      text: q.text,
      answer: q.answer,
      tabooWords: ['مصارعة', 'اتحاد', 'بطل'],
      difficulty: diff,
      points: (diffIndex + 1) * 100
    });
  }
  return questions;
})();
