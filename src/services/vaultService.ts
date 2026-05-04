
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  increment,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Question, Difficulty, GameMode, QuestionType } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const VAULT_COLLECTION = 'questions_vault';
const COOLDOWN_DAYS = 7;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * Removes undefined fields from an object to prevent Firestore errors
 */
const sanitizeForFirestore = (obj: any) => {
  const result: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const saveToVault = async (question: Question) => {
  if (!auth.currentUser) return;
  
  const userVaultId = `${auth.currentUser.uid}_${question.id}`;
  const questionRef = doc(db, VAULT_COLLECTION, userVaultId);
  const rawData = {
    ...question,
    id: userVaultId, // Ensure the internal ID also matches
    userId: auth.currentUser.uid,
    topic_match: (question.topic || question.category || 'unknown').toLowerCase(),
    times_played: question.times_played || 0,
    last_played_at: question.last_played_at || 0,
    avg_time_to_answer: question.avg_time_to_answer || 0,
    running_time_sum: (question.avg_time_to_answer || 0) * (question.times_played || 0),
    correct_count: question.correct_count || 0,
    mastered: question.mastered || false,
    real_difficulty_score: question.real_difficulty_score || (
      question.difficulty === Difficulty.HARD ? 800 :
      question.difficulty === Difficulty.MEDIUM ? 500 : 200
    )
  };

  const data = sanitizeForFirestore(rawData);
  
  try {
    await setDoc(questionRef, data, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${VAULT_COLLECTION}/${question.id}`);
  }
};

export const updateQuestionStats = async (
  question: Question, 
  answeredCorrectly: boolean, 
  timeSpentMs: number
) => {
  if (!auth.currentUser) return;
  
  // Force all IDs to be user-prefixed for safety and unique tracking
  const cleanId = question.id.includes('_') ? question.id.split('_').pop() : question.id;
  const fullId = `${auth.currentUser.uid}_${cleanId}`;
    
  const questionRef = doc(db, VAULT_COLLECTION, fullId);
  const now = Date.now();
  
  // Logic for Realistic Difficulty Adjustment
  let difficultyShift = 0;
  if (answeredCorrectly) {
    if (timeSpentMs < 3000) difficultyShift = -50;
    else if (timeSpentMs < 7000) difficultyShift = -20;
    else difficultyShift = -5;
  } else {
    difficultyShift = 50;
  }

  try {
    // We include required fields (text, answer, topic_match) so if setDoc triggers a CREATE 
    // for a new question, it satisfies the isValidVaultQuestion rule's hasAll() requirement.
    await setDoc(questionRef, {
      id: fullId,
      userId: auth.currentUser.uid,
      text: question.text,
      answer: question.answer,
      topic_match: (question.topic || question.category || 'unknown').toLowerCase(),
      times_played: increment(1),
      correct_count: answeredCorrectly ? increment(1) : increment(0),
      last_played_at: now,
      running_time_sum: increment(timeSpentMs),
      last_time_spent: timeSpentMs,
      real_difficulty_score: increment(difficultyShift),
      updated_at: now
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${VAULT_COLLECTION}/${fullId}`);
  }
};

export const clearUserVault = async () => {
  if (!auth.currentUser) return;
  
  try {
    const q = query(
      collection(db, VAULT_COLLECTION),
      where('userId', '==', auth.currentUser.uid)
    );
    const snapshot = await getDocs(q);
    
    // Firestore doesn't provide a bulk delete for collections easily in client SDK, 
    // but we can batch or delete one by one for reasonably sized vaults.
    const deletePromises = snapshot.docs.map(d => {
       // We'll just delete them. If there are thousands, this might be slow, 
       // but for a quiz app vault it should be fine.
       return setDoc(d.ref, { _deleted: true }, { merge: true }); // Soft delete or just use actual delete
    });
    
    // Actually, let's just delete the docs. 
    // (Note: In a real prod app, you'd use a write batch or cloud function)
    // For this applet context, we'll try to delete.
    const { deleteDoc } = await import('firebase/firestore');
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
    
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, VAULT_COLLECTION);
    return false;
  }
};

export const getRandomQuestionsFromVault = async (
  numQuestions: number,
  mode: GameMode,
  difficulty?: Difficulty,
  preferredLetters?: string[]
): Promise<Question[]> => {
  if (!auth.currentUser) return [];

  // It's not possible to form a valid Jeopardy Grid from purely random un-topic-matched questions,
  // let Gemini naturally handle the generation failure instead of sending garbage grids.
  if (mode === GameMode.GRID) return [];
  
  // Try to get more than needed so we can filter/shuffle effectively
  const fetchLimit = preferredLetters ? numQuestions * 10 : numQuestions * 3;

  const vaultQuery = query(
    collection(db, VAULT_COLLECTION),
    where('userId', '==', auth.currentUser.uid),
    limit(Math.min(fetchLimit, 500))
  );
  
  try {
    const snapshot = await getDocs(vaultQuery);
    let questions = snapshot.docs.map(d => d.data() as Question);
    
    // Sort by last played to favor unseen or old questions, but add a random factor
    // for those with the same last_played_at (like 0)
    questions.sort((a, b) => {
      const timeDiff = (a.last_played_at || 0) - (b.last_played_at || 0);
      if (timeDiff === 0) return Math.random() - 0.5;
      return timeDiff;
    });

    if (difficulty) {
      const difficultyFiltered = questions.filter(q => q.difficulty === difficulty);
      if (difficultyFiltered.length >= numQuestions) questions = difficultyFiltered;
    }

    if (preferredLetters && preferredLetters.length > 0) {
      // Emergency matching for Hex Grid
      const matched: Question[] = [];
      const usedIds = new Set<string>();

      for (const letter of preferredLetters) {
        // Find a question that starts with this letter
        const match = questions.find(q => {
          if (usedIds.has(q.id)) return false;
          const firstChar = q.answer.replace(/^ال/, '').trim().charAt(0).toUpperCase();
          return firstChar === letter.toUpperCase();
        });

        if (match) {
          matched.push(match);
          usedIds.add(match.id);
        } else {
          // If no perfect match, just take a random one and we'll force the letter in UI
          const random = questions.find(q => !usedIds.has(q.id));
          if (random) {
            matched.push({ ...random, letter });
            usedIds.add(random.id);
          }
        }
      }
      
      if (matched.length > 0) {
        return matched.map(q => adaptQuestionForMode(q, mode));
      }
    }
    
    if (questions.length > 0) {
      // Shuffle the first few candidates to ensure variety within the "oldest" pool
      const poolSize = Math.max(numQuestions, Math.floor(questions.length * 0.3));
      const topPool = questions.slice(0, poolSize).sort(() => Math.random() - 0.5);
      
      return topPool
        .slice(0, numQuestions)
        .map(q => adaptQuestionForMode(q, mode));
    }
  } catch (err) {
    console.error("Failed to get random questions from vault", err);
  }
  
  return [];
};

export const getQuestionsFromVault = async (
  topic: string, 
  numQuestions: number,
  mode: GameMode,
  difficulty: Difficulty
): Promise<Question[]> => {
  if (!auth.currentUser) return [];
  
  const fetchLimit = mode === GameMode.GRID ? 200 : numQuestions * 2;
  
  const vaultQuery = query(
    collection(db, VAULT_COLLECTION),
    where('userId', '==', auth.currentUser.uid),
    where('topic_match', '==', topic.toLowerCase()),
    where('mode', '==', mode),
    limit(fetchLimit)
  );
  
  try {
    const snapshot = await getDocs(vaultQuery);
    let questions = snapshot.docs.map(d => {
      const data = d.data();
      const timesPlayed = data.times_played || 0;
      const runningSum = data.running_time_sum || 0;
      const avgTime = timesPlayed > 0 ? runningSum / timesPlayed : 0;
      const correctCount = data.correct_count || 0;
      const correctRate = timesPlayed > 0 ? correctCount / timesPlayed : 0;

      if (!data.mastered && timesPlayed >= 6 && correctRate >= 0.9 && avgTime < 5000) {
        updateDoc(d.ref, { mastered: true }).catch(e => console.error("Mastery update fail", e));
        return { ...data, mastered: true } as Question;
      }

      return data as Question;
    });
    
    // Prioritize by last_played_at (least recently played first) + random factor for same time
    questions.sort((a, b) => {
      const timeDiff = (a.last_played_at || 0) - (b.last_played_at || 0);
      if (timeDiff === 0) return Math.random() - 0.5;
      return timeDiff;
    });

    let activeQuestions = questions.filter(q => q.difficulty === difficulty && !q.mastered);
    if (activeQuestions.length === 0) {
      activeQuestions = questions.filter(q => !q.mastered);
    }
    
    const pool = activeQuestions.length > 0 ? activeQuestions : questions;
    
    if (pool.length > 0) {
      if (mode === GameMode.GRID) {
        // ... (grid logic remains the same for consistency)
        const categoriesMap: Record<string, Question[]> = {};
        pool.forEach(q => {
          if (!q.category || q.category === 'عام' || q.type === QuestionType.TRUE_FALSE) return;
          if (!categoriesMap[q.category]) categoriesMap[q.category] = [];
          categoriesMap[q.category].push(q);
        });
        
        const validCategories: string[] = [];
        Object.keys(categoriesMap).forEach(cat => {
           const qs = categoriesMap[cat];
           const has100 = qs.some(q => q.points === 100);
           const has200 = qs.some(q => q.points === 200);
           const has300 = qs.some(q => q.points === 300);
           const has400 = qs.some(q => q.points === 400);
           const has500 = qs.some(q => q.points === 500);
           if (has100 && has200 && has300 && has400 && has500) {
             validCategories.push(cat);
           }
        });
        
        if (validCategories.length >= 5) {
          const selectedCats = validCategories.sort(() => 0.5 - Math.random()).slice(0, 5);
          const resultGrid: Question[] = [];
          selectedCats.forEach(cat => {
             [100, 200, 300, 400, 500].forEach(pts => {
                const matches = categoriesMap[cat].filter(q => q.points === pts);
                resultGrid.push(matches[Math.floor(Math.random() * matches.length)]);
             });
          });
          return resultGrid.map(q => adaptQuestionForMode(q, mode));
        } else {
          return []; // Not a complete grid in vault, let Gemini generate
        }
      }

      // Shuffle the selected pool before slicing
      return pool
        .sort(() => Math.random() - 0.5)
        .slice(0, numQuestions)
        .map(q => adaptQuestionForMode(q, mode));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, VAULT_COLLECTION);
  }
  
  return [];
};

/**
 * Cross-Mode Recycling Logic
 * Adapts a question's text or format based on the target game mode
 */
function adaptQuestionForMode(q: Question, targetMode: GameMode): Question {
  const adapted = { ...q };
  
  if (targetMode === GameMode.HEX_GRID) {
    // Ensure it has a letter
    if (!adapted.letter) {
      adapted.letter = adapted.answer.replace(/^ال/, '').trim().charAt(0).toUpperCase();
    }
  } else if (targetMode === GameMode.TIMED) {
    // For timed mode, we want short punchy questions
    if (adapted.text.length > 30) {
      // Potentially simplify?
    }
  }
  
  return adapted;
}
