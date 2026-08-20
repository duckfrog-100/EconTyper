import { describe, expect, it } from "vitest";
import {
  filterSavedWords,
  sortSavedWords,
  filterSavedWordsByPartOfSpeech,
  getDictionarySourceLabel,
  formatSavedWordDate,
  validateSavedWordMeaning,
  isSavedWordDefaultPreference,
} from "./vocabulary-view";
import type { UserDictionaryPreference } from "@/types/dictionary-preference";
import type { SavedWord } from "@/types/vocabulary";

function makeWord(overrides: Partial<SavedWord> & { word: string; meaning: string }): SavedWord {
  const base: SavedWord = {
    id: overrides.id ?? `id-${overrides.word}`,
    word: overrides.word,
    normalizedWord: overrides.normalizedWord ?? overrides.word.toLocaleLowerCase("en"),
    meaning: overrides.meaning,
    savedAt: overrides.savedAt ?? 0,
    updatedAt: overrides.updatedAt ?? 0,
  };
  return { ...base, ...overrides };
}

describe("filterSavedWords", () => {
  it("단어 검색", () => {
    const words = [
      makeWord({ word: "Bond", meaning: "채권" }),
      makeWord({ word: "Inflation", meaning: "인플레이션" }),
    ];
    const result = filterSavedWords(words, "bond");
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("Bond");
  });

  it("뜻 검색", () => {
    const words = [
      makeWord({ word: "Bond", meaning: "채권" }),
      makeWord({ word: "Yield", meaning: "수익률" }),
    ];
    const result = filterSavedWords(words, "채권");
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("Bond");
  });

  it("출처 검색 (sourceTitle)", () => {
    const words = [
      makeWord({ word: "Bond", meaning: "채권", sourceTitle: "Reuters 기사" }),
      makeWord({ word: "Yield", meaning: "수익률", sourceTitle: "CNBC 기사" }),
    ];
    const result = filterSavedWords(words, "reuters");
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("Bond");
  });

  it("dictionarySource 검색", () => {
    const words = [
      makeWord({ word: "Bond", meaning: "채권", dictionarySource: "glossary-finance" }),
      makeWord({ word: "Apple", meaning: "사과", dictionarySource: "dictionary" }),
    ];
    const result = filterSavedWords(words, "glossary");
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("Bond");
  });

  it("대소문자 무시", () => {
    const words = [makeWord({ word: "Bond", meaning: "채권" })];
    expect(filterSavedWords(words, "BOND")).toHaveLength(1);
    expect(filterSavedWords(words, "bond")).toHaveLength(1);
  });

  it("공백 정규화", () => {
    const words = [makeWord({ word: "interest rate", meaning: "금리" })];
    expect(filterSavedWords(words, "  interest   rate  ")).toHaveLength(1);
  });

  it("빈 검색어 전체 반환", () => {
    const words = [
      makeWord({ word: "A", meaning: "a" }),
      makeWord({ word: "B", meaning: "b" }),
    ];
    expect(filterSavedWords(words, "")).toHaveLength(2);
    expect(filterSavedWords(words, "   ")).toHaveLength(2);
  });

  it("검색 결과 없음", () => {
    const words = [makeWord({ word: "Bond", meaning: "채권" })];
    expect(filterSavedWords(words, "없는단어")).toHaveLength(0);
  });
});

describe("sortSavedWords", () => {
  const words = [
    makeWord({ word: "B", meaning: "b", savedAt: 200, updatedAt: 200 }),
    makeWord({ word: "A", meaning: "a", savedAt: 100, updatedAt: 300 }),
    makeWord({ word: "C", meaning: "c", savedAt: 300, updatedAt: 100 }),
  ];

  it("최신 저장순", () => {
    const result = sortSavedWords(words, "saved-newest");
    expect(result.map((w) => w.word)).toEqual(["C", "B", "A"]);
  });

  it("오래된 저장순", () => {
    const result = sortSavedWords(words, "saved-oldest");
    expect(result.map((w) => w.word)).toEqual(["A", "B", "C"]);
  });

  it("A→Z", () => {
    const result = sortSavedWords(words, "word-asc");
    expect(result.map((w) => w.word)).toEqual(["A", "B", "C"]);
  });

  it("Z→A", () => {
    const result = sortSavedWords(words, "word-desc");
    expect(result.map((w) => w.word)).toEqual(["C", "B", "A"]);
  });

  it("원본 배열 mutate 안 함", () => {
    const original = [...words];
    sortSavedWords(words, "saved-newest");
    expect(words[0].word).toBe(original[0].word);
    expect(words[1].word).toBe(original[1].word);
    expect(words[2].word).toBe(original[2].word);
  });
});

describe("filterSavedWordsByPartOfSpeech", () => {
  const words = [
    makeWord({ word: "Bond", meaning: "채권", partOfSpeech: "noun" }),
    makeWord({ word: "Yield", meaning: "수익률", partOfSpeech: "verb" }),
    makeWord({ word: "High", meaning: "높은", partOfSpeech: "adjective" }),
    makeWord({ word: "Quickly", meaning: "빠르게", partOfSpeech: "adverb" }),
    makeWord({ word: "NoPos", meaning: "품사 없음" }),
  ];

  it("전체", () => {
    expect(filterSavedWordsByPartOfSpeech(words, "all")).toHaveLength(5);
  });

  it("noun", () => {
    const result = filterSavedWordsByPartOfSpeech(words, "noun");
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("Bond");
  });

  it("verb", () => {
    expect(filterSavedWordsByPartOfSpeech(words, "verb")).toHaveLength(1);
  });

  it("adjective", () => {
    expect(filterSavedWordsByPartOfSpeech(words, "adjective")).toHaveLength(1);
  });

  it("adverb", () => {
    expect(filterSavedWordsByPartOfSpeech(words, "adverb")).toHaveLength(1);
  });

  it("기타 (undefined 품사)", () => {
    const result = filterSavedWordsByPartOfSpeech(words, "other");
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("NoPos");
  });
});

describe("getDictionarySourceLabel", () => {
  it("glossary-economy", () => {
    expect(getDictionarySourceLabel("glossary-economy")).toBe("경제 용어");
  });
  it("glossary-finance", () => {
    expect(getDictionarySourceLabel("glossary-finance")).toBe("금융 용어");
  });
  it("glossary-business", () => {
    expect(getDictionarySourceLabel("glossary-business")).toBe("비즈니스 용어");
  });
  it("glossary-news", () => {
    expect(getDictionarySourceLabel("glossary-news")).toBe("시사 용어");
  });
  it("dictionary", () => {
    expect(getDictionarySourceLabel("dictionary")).toBe("일반 사전");
  });
  it("unknown 또는 undefined", () => {
    expect(getDictionarySourceLabel("unknown-source")).toBeUndefined();
    expect(getDictionarySourceLabel(undefined)).toBeUndefined();
    expect(getDictionarySourceLabel("")).toBeUndefined();
  });
});

describe("validateSavedWordMeaning", () => {
  it("유효한 값: trim된 뜻 반환", () => {
    const result = validateSavedWordMeaning("  채권  ");
    expect(result.trimmedValue).toBe("채권");
    expect(result.error).toBeUndefined();
  });

  it("빈 문자열: 에러", () => {
    const result = validateSavedWordMeaning("   ");
    expect(result.error).toBe("뜻을 입력해 주세요.");
  });

  it("300자 경계: 유효", () => {
    const value = "a".repeat(300);
    const result = validateSavedWordMeaning(value);
    expect(result.error).toBeUndefined();
  });

  it("301자 초과: 에러", () => {
    const value = "a".repeat(301);
    const result = validateSavedWordMeaning(value);
    expect(result.error).toBe("뜻은 300자 이하로 입력해 주세요.");
  });
});

describe("isSavedWordDefaultPreference", () => {
  const word = makeWord({
    word: "Bond",
    meaning: "채권",
    normalizedWord: "bond",
    candidateKey: "glossary-finance::ko::bond::noun::채권",
  });

  it("preference가 없으면 false", () => {
    expect(isSavedWordDefaultPreference(word, undefined)).toBe(false);
  });

  it("candidateKey가 없으면 false", () => {
    const noKey = makeWord({ word: "Bond", meaning: "채권", normalizedWord: "bond" });
    const pref: UserDictionaryPreference = {
      kind: "candidate",
      normalizedWord: "bond",
      candidateKey: "glossary-finance::ko::bond::noun::채권",
      selectedAt: "2026-01-01",
    };
    expect(isSavedWordDefaultPreference(noKey, pref)).toBe(false);
  });

  it("candidateKey가 일치하면 true", () => {
    const pref: UserDictionaryPreference = {
      kind: "candidate",
      normalizedWord: "bond",
      candidateKey: "glossary-finance::ko::bond::noun::채권",
      selectedAt: "2026-01-01",
    };
    expect(isSavedWordDefaultPreference(word, pref)).toBe(true);
  });

  it("normalizedWord가 다르면 false", () => {
    const pref: UserDictionaryPreference = {
      kind: "candidate",
      normalizedWord: "yield",
      candidateKey: "glossary-finance::ko::bond::noun::채권",
      selectedAt: "2026-01-01",
    };
    expect(isSavedWordDefaultPreference(word, pref)).toBe(false);
  });

  it("candidateKey가 다르면 false", () => {
    const pref: UserDictionaryPreference = {
      kind: "candidate",
      normalizedWord: "bond",
      candidateKey: "glossary-finance::ko::bond::noun::유대",
      selectedAt: "2026-01-01",
    };
    expect(isSavedWordDefaultPreference(word, pref)).toBe(false);
  });
});

describe("formatSavedWordDate", () => {
  it("유효 timestamp", () => {
    const ts = Date.UTC(2026, 7, 2);
    const result = formatSavedWordDate(ts);
    expect(result).toContain("2026");
    expect(result.length).toBeGreaterThan(0);
  });

  it("잘못된 timestamp 빈 문자열", () => {
    expect(formatSavedWordDate(0)).toBe("");
    expect(formatSavedWordDate(-1)).toBe("");
    expect(formatSavedWordDate(Number.NaN)).toBe("");
    expect(formatSavedWordDate(Number.POSITIVE_INFINITY)).toBe("");
  });
});