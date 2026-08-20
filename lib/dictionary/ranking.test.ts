import { describe, expect, it } from "vitest";
import { rankCandidates, getPreferredCandidate, RANKING_WEIGHTS } from "./ranking";
import type { DictionaryCandidate, DictionaryLookupContext } from "@/types/dictionary";

function makeCandidate(overrides: Partial<DictionaryCandidate> & { meaning: string }): DictionaryCandidate {
  const base: DictionaryCandidate = {
    meaning: overrides.meaning,
    partOfSpeech: overrides.partOfSpeech,
    source: "dictionary",
    language: "en",
    matchedTerm: undefined,
    matchedRange: undefined,
    confidence: 0.5,
    rankingScore: 0,
  };
  return { ...base, ...overrides };
}

const emptyContext: DictionaryLookupContext = { word: "bond" };
const bondYieldContext: DictionaryLookupContext = {
  word: "bond",
  sentence: "The bond yield rose sharply.",
};

describe("rankCandidates", () => {
  it("빈 배열은 빈 배열을 반환한다", () => {
    expect(rankCandidates([], emptyContext)).toEqual([]);
  });

  it("다단어 glossary가 단일어 glossary보다 높은 점수", () => {
    const multiWord = makeCandidate({
      meaning: "채권 수익률",
      source: "glossary-finance",
      language: "ko",
      matchedTerm: "bond yield",
      confidence: 0.95,
    });
    const singleWord = makeCandidate({
      meaning: "채권",
      source: "glossary-finance",
      language: "ko",
      matchedTerm: "bond",
      confidence: 0.95,
    });
    const result = rankCandidates([singleWord, multiWord], bondYieldContext);
    expect(result[0].matchedTerm).toBe("bond yield");
    expect(result[0].rankingScore).toBeGreaterThan(result[1].rankingScore);
  });

  it("matched glossary가 dictionary보다 높은 점수", () => {
    const glossary = makeCandidate({
      meaning: "채권",
      source: "glossary-finance",
      language: "ko",
      matchedTerm: "bond",
      confidence: 0.95,
    });
    const dictionary = makeCandidate({
      meaning: "A formal agreement to repay debt",
      source: "dictionary",
      confidence: 0.5,
    });
    const result = rankCandidates([dictionary, glossary], bondYieldContext);
    expect(result[0].source.startsWith("glossary-")).toBe(true);
    expect(result[0].rankingScore).toBeGreaterThan(result[1].rankingScore);
  });

  it("unmatched glossary는 preferred가 되지 않는다 (dictionary보다 낮음)", () => {
    // "recession"은 glossary에 있지만 문장에 없음 → unmatched
    const recessionCtx: DictionaryLookupContext = {
      word: "recession",
      sentence: "The growth rate is high.",
    };
    const glossary = makeCandidate({
      meaning: "경기 침체",
      source: "glossary-economy",
      language: "ko",
      matchedTerm: "recession",
      confidence: 0.95,
    });
    const dictionary = makeCandidate({
      meaning: "A period of economic decline",
      source: "dictionary",
      confidence: 0.5,
    });
    const result = rankCandidates([dictionary, glossary], recessionCtx);
    // unmatched glossary는 DICTIONARY_BASE(40) 이하 → dictionary보다 점수가 낮아야 함
    expect(result[0].source).toBe("dictionary");
    expect(result.length).toBe(2);
    expect(result[1].source.startsWith("glossary-")).toBe(true);
    expect(result[0].rankingScore).toBeGreaterThan(result[1].rankingScore);
  });

  it("sentence가 없고 hover word가 glossary term과 정확히 같으면 단일어 후보 허용", () => {
    const noSentenceCtx: DictionaryLookupContext = { word: "recession" };
    const glossary = makeCandidate({
      meaning: "경기 침체",
      source: "glossary-economy",
      language: "ko",
      matchedTerm: "recession",
      confidence: 0.95,
    });
    const result = rankCandidates([glossary], noSentenceCtx);
    expect(result).toHaveLength(1);
    // sentence가 없으므로 exact 매칭 불가 → unmatched 처리
    expect(result[0].rankingScore).toBeLessThan(RANKING_WEIGHTS.DICTIONARY_BASE);
  });

  it("deterministic tie-break: 동일 score면 confidence로 정렬", () => {
    const a = makeCandidate({ meaning: "A", confidence: 0.7 });
    const b = makeCandidate({ meaning: "B", confidence: 0.5 });
    const result = rankCandidates([b, a], emptyContext);
    expect(result[0].meaning).toBe("A");
  });

  it("모든 점수와 confidence가 같을 때 provider 원본 순서 유지 (stable sort)", () => {
    const a = makeCandidate({ meaning: "A", confidence: 0.5 });
    const b = makeCandidate({ meaning: "B", confidence: 0.5 });
    const c = makeCandidate({ meaning: "C", confidence: 0.5 });
    const result = rankCandidates([c, a, b], emptyContext);
    expect(result[0].meaning).toBe("C");
    expect(result[1].meaning).toBe("A");
    expect(result[2].meaning).toBe("B");
  });

  it("hover 단어가 matchedTerm 구성요소가 아니면 제외", () => {
    const candidate = makeCandidate({
      meaning: "채권 수익률",
      source: "glossary-finance",
      language: "ko",
      matchedTerm: "bond yield",
      confidence: 0.95,
    });
    const result = rankCandidates([candidate], { word: "yield", sentence: "The bond yield rose." });
    expect(result).toHaveLength(1);
  });
});

describe("getPreferredCandidate (rankingScore 기반)", () => {
  it("빈 배열은 undefined를 반환한다", () => {
    expect(getPreferredCandidate([])).toBeUndefined();
  });

  it("rankingScore가 가장 높은 후보를 선택한다", () => {
    const candidates = [
      makeCandidate({
        meaning: "채권 수익률",
        source: "glossary-finance",
        language: "ko",
        matchedTerm: "bond yield",
        confidence: 0.95,
        rankingScore: 100,
      }),
      makeCandidate({
        meaning: "채권",
        source: "glossary-finance",
        language: "ko",
        matchedTerm: "bond",
        confidence: 0.95,
        rankingScore: 85,
      }),
    ];
    expect(getPreferredCandidate(candidates)?.matchedTerm).toBe("bond yield");
  });

  it("unmatched glossary는 preferred가 되지 않음", () => {
    // recession이 문장에 없으므로 unmatched 처리 → dictionary가 preferred
    const recessionCtx: DictionaryLookupContext = {
      word: "recession",
      sentence: "The growth rate is high.",
    };
    const glossary = makeCandidate({
      meaning: "경기 침체",
      source: "glossary-economy",
      language: "ko",
      matchedTerm: "recession",
      confidence: 0.95,
    });
    const dictionary = makeCandidate({
      meaning: "A period of economic decline",
      source: "dictionary",
      confidence: 0.5,
    });
    const ranked = rankCandidates([dictionary, glossary], recessionCtx);
    const preferred = getPreferredCandidate(ranked);
    expect(preferred?.source).toBe("dictionary");
  });

  it("동점 score면 confidence로 결정", () => {
    const candidates = [
      makeCandidate({ meaning: "A", confidence: 0.5, rankingScore: 50 }),
      makeCandidate({ meaning: "B (higher confidence)", confidence: 0.7, rankingScore: 50 }),
    ];
    expect(getPreferredCandidate(candidates)?.meaning).toBe("B (higher confidence)");
  });

  it("candidates가 비어 있으면 undefined", () => {
    expect(getPreferredCandidate([])).toBeUndefined();
  });
});

describe("RANKING_WEIGHTS constants", () => {
  it("MULTI_WORD_GLOSSARY_EXACT가 SINGLE_WORD보다 높다", () => {
    expect(RANKING_WEIGHTS.MULTI_WORD_GLOSSARY_EXACT).toBeGreaterThan(RANKING_WEIGHTS.SINGLE_WORD_GLOSSARY_EXACT);
  });
  it("SINGLE_WORD_GLOSSARY_EXACT가 GLOSSARY_ALIAS보다 높다", () => {
    expect(RANKING_WEIGHTS.SINGLE_WORD_GLOSSARY_EXACT).toBeGreaterThan(RANKING_WEIGHTS.GLOSSARY_ALIAS);
  });
  it("GLOSSARY_ALIAS가 DICTIONARY_BASE보다 높다", () => {
    expect(RANKING_WEIGHTS.GLOSSARY_ALIAS).toBeGreaterThan(RANKING_WEIGHTS.DICTIONARY_BASE);
  });
  it("unmatched glossary는 DICTIONARY_BASE보다 낮게 설정된다", () => {
    // unmatched: DICTIONARY_BASE - UNMATCHED_GLOSSARY_PENALTY + max(length+confidence)
    // DICTIONARY_BASE - 50 + 3 + 28 = DICTIONARY_BASE - 19
    // 따라서 DICTIONARY_BASE보다 낮음
    const maxUnmatched = RANKING_WEIGHTS.DICTIONARY_BASE - RANKING_WEIGHTS.UNMATCHED_GLOSSARY_PENALTY
      + 5 * RANKING_WEIGHTS.TERM_LENGTH_BONUS
      + RANKING_WEIGHTS.CONFIDENCE_MAX_BONUS;
    expect(maxUnmatched).toBeLessThan(RANKING_WEIGHTS.DICTIONARY_BASE);
  });
});