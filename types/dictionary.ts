export type DictionaryCandidate = {
  meaning: string;
  partOfSpeech?: string;
  example?: string;
  source: "glossary-economy" | "glossary-finance" | "glossary-business" | "glossary-news" | "dictionary" | "ai";
  language: "en" | "ko";
  matchedTerm?: string;
  matchedRange?: { start: number; end: number };
  /** 데이터 자체의 신뢰도 (고정값) */
  confidence: number;
  /** 현재 문맥에서의 최종 선택 점수 (ranking 엔진이 계산) */
  rankingScore: number;
};

export type DictionaryResponse = {
  word: string;
  phonetic?: string;
  candidates: DictionaryCandidate[];
};

export type GlossaryEntry = {
  term: string;
  koreanMeaning: string;
  partOfSpeech?: string;
  domain: "economy" | "finance" | "business" | "news";
  aliases?: string[];
};

export type DictionaryLookupContext = {
  word: string;
  sentence?: string;
  wordStart?: number;
  wordEnd?: number;
};