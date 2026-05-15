
export enum GameMode {
  GRID = 'GRID',
  HEX_GRID = 'HEX_GRID',
  POINTS = 'POINTS',
  BUZZER = 'BUZZER',
  TIMED = 'TIMED',
  SILENT_GUESS = 'SILENT_GUESS',
  TRUE_FALSE = 'TRUE_FALSE',
  TABOO = 'TABOO'
}

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
  OPEN = 'OPEN'
}

export enum Difficulty {
  BEGINNER = 'BEGINNER',
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  EXPERT = 'EXPERT'
}

export interface Question {
  id: string;
  text: string;
  options?: string[];
  answer: string;
  answer_alt?: string;
  answer_alt2?: string;
  category: string;
  points: number;
  letter?: string;
  hint?: string;
  explanation?: string;
  type: QuestionType;
  difficulty: Difficulty;
  mode?: GameMode;
  emojis?: string[];
  topic?: string;
  generatedBy?: string;
  tabooWords?: string[];
  
  // Vault Metadata
  times_played?: number;
  last_played_at?: number;
  avg_time_to_answer?: number;
  correct_count?: number;
  mastered?: boolean;
  real_difficulty_score?: number; // 0-1000
}

export enum PowerType {
  FREEZE = 'FREEZE',
  STEAL = 'STEAL',
  SHIELD = 'SHIELD'
}

export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
  powers: Record<PowerType, number>;
}

export interface GameConfig {
  topic: string;
  numQuestions: number;
  mode: GameMode;
  questionTypes: QuestionType[];
  difficulty: Difficulty;
  players: Player[];
  manualQuestions: Question[];
  categories?: string[];
  sessionId?: string;
  // Questions Setup
  hexMode?: 'ai' | 'manual' | 'bank';
  questionSource?: 'ai' | 'manual' | 'bank';
  hexCategories?: string[];
  hexManualQuestions?: Record<string, {question: string, answer: string}>;
  customJson?: string;
  timerDuration?: number; // for timed racing
  buzzerTimeout?: number; // for buzzer mode
  aiModel?: string;
}

export interface SavedSet {
  id: string;
  userId: string;
  name: string;
  topic: string;
  numQuestions: number;
  mode: GameMode;
  difficulty: Difficulty;
  questions: Question[];
  manualQuestions?: Question[];
  createdAt: number;
}
