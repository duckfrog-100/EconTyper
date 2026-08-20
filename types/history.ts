export type PracticeHistoryEntry = {
  id: string;
  articleId: string;
  title: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceText?: string;
  completedAt: string;
  accuracy: number;
  typedCharacters: number;
  wrongSentenceCount: number;
  sessionWordCount: number;
  savedWordCount: number;
  sentenceCount: number;
  wordsPerMinute?: number;
  elapsedSeconds?: number;
};

export type PracticeHistorySummary = {
  totalSessions: number;
  totalTypedCharacters: number;
  averageAccuracy: number;
  currentStreakDays: number;
  savedWordCount: number;
};

export type PracticeHistoryMonthGroup = {
  monthKey: string;
  entries: PracticeHistoryEntry[];
};
