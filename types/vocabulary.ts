export type SavedWord = {
  id: string;
  word: string;
  normalizedWord: string;
  meaning: string;
  phonetic?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  sourceTitle?: string;
  sourceUrl?: string;
  dictionarySource?: string;
  candidateKey?: string;
  practiceSessionId?: string;
  savedAt: number;
  updatedAt: number;
};

export type SavedWordStore = {
  version: 2;
  items: SavedWord[];
};

export type LegacySavedWord = {
  word: string;
  meaning: string;
  phonetic?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  sourceTitle?: string;
  addedAt: number;
};