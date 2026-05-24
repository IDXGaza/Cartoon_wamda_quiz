export const PLAYED_QUESTIONS_KEY = 'played_question_hashes';

// Helper to generate a robust hash for a question
export const getQuestionHash = (q: { category: string; difficulty: string; text: string }) => {
  // Use a simple, deterministic hash of category+difficulty+text to ensure uniqueness even if IDs change
  const cat = (q.category || '').trim().toLowerCase();
  const diff = (q.difficulty || '').trim().toLowerCase();
  const txt = (q.text || '').trim();
  const content = `${cat}|${diff}|${txt}`;
  return btoa(unescape(encodeURIComponent(content))); // Standard Base64 in Browser
};

export const getPlayedQuestionHashes = (): string[] => {
  try {
    const data = localStorage.getItem(PLAYED_QUESTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const addPlayedQuestionHashes = (questions: { category: string; difficulty: string; text: string }[]) => {
  try {
    const existing = new Set(getPlayedQuestionHashes());
    questions.forEach(q => existing.add(getQuestionHash(q)));
    localStorage.setItem(PLAYED_QUESTIONS_KEY, JSON.stringify(Array.from(existing)));
  } catch (e) {
    console.error('Failed to save played question hashes', e);
  }
};

export const clearPlayedQuestionHashes = () => {
  localStorage.removeItem(PLAYED_QUESTIONS_KEY);
};

export const filterPlayedQuestions = <T extends { id: string; category: string; difficulty: string; text: string }>(questions: T[]): T[] => {
  const playedHashes = new Set(getPlayedQuestionHashes());
  const unplayed = questions.filter(q => !playedHashes.has(getQuestionHash(q)));
  return unplayed;
};
