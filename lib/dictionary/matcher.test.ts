import { describe, expect, it } from "vitest";
import { findGlossaryMatches, mergeCandidates } from "./matcher";
import type { DictionaryCandidate } from "@/types/dictionary";

describe("findGlossaryMatches", () => {
  it("빈 단어는 빈 배열을 반환한다", () => {
    expect(findGlossaryMatches("", "test sentence")).toEqual([]);
  });

  it("glossary에 없는 일반 단어는 빈 배열을 반환한다", () => {
    expect(findGlossaryMatches("apple", "An apple a day.")).toEqual([]);
  });

  it("단일어 glossary 매칭", () => {
    const result = findGlossaryMatches("inflation", "Inflation is rising.");
    expect(result).toHaveLength(1);
    expect(result[0].meaning).toContain("인플레이션");
    expect(result[0].source).toBe("glossary-economy");
    expect(result[0].language).toBe("ko");
    expect(result[0].matchedTerm).toBe("inflation");
    expect(result[0].confidence).toBe(0.95);
  });

  it("대소문자와 문장부호를 정규화한다", () => {
    const result = findGlossaryMatches("Inflation!", "Inflation is rising.");
    expect(result).toHaveLength(1);
    expect(result[0].matchedTerm).toBe("inflation");
  });

  it("다단어 표현 매칭: interest rate 문장에서 interest hover", () => {
    const result = findGlossaryMatches("interest", "The interest rate increased.");
    expect(result.some((c) => c.matchedTerm === "interest rate")).toBe(true);
  });

  it("다단어 표현 매칭: interest rate 문장에서 rate hover", () => {
    const result = findGlossaryMatches("rate", "The interest rate increased.");
    expect(result.some((c) => c.matchedTerm === "interest rate")).toBe(true);
  });

  it("다단어 표현이 더 긴 후보를 우선한다 (정렬 확인)", () => {
    const result = findGlossaryMatches("bond", "The bond yield rose.");
    const first = result[0];
    expect(first.matchedTerm).toBe("bond yield");
  });

  it("단일어 bond 단독 문장에서는 bond 단일어 매칭", () => {
    const result = findGlossaryMatches("bond", "The government issued a bond.");
    expect(result.some((c) => c.matchedTerm === "bond")).toBe(true);
    expect(result.some((c) => c.matchedTerm === "bond yield")).toBe(false);
  });

  it("alias GDP 매칭", () => {
    const result = findGlossaryMatches("GDP", "GDP growth accelerated.");
    expect(result).toHaveLength(1);
    expect(result[0].meaning).toContain("국내총생산");
  });

  it("alias gross domestic product 매칭 (GDP alias로)", () => {
    const result = findGlossaryMatches("GDP", "Gross domestic product grew.");
    expect(result).toHaveLength(1);
  });

  it("단어 경계 오탐 방지: 'interest'가 'interesting'의 일부일 때 매칭 안 됨", () => {
    const result = findGlossaryMatches("interest", "It was an interesting article.");
    expect(result.filter((c) => c.matchedTerm === "interest")).toHaveLength(0);
  });

  it("단어 경계 오탐 방지: 다단어 표현에서 'capital'이 포함되지 않은 문장", () => {
    const result = findGlossaryMatches("capital", "The capital of France is Paris.");
    expect(result).toHaveLength(0);
  });

  it("matchedRange를 포함한다", () => {
    const result = findGlossaryMatches("interest", "The interest rate is high.");
    const candidate = result.find((c) => c.matchedTerm === "interest rate");
    expect(candidate).toBeDefined();
    expect(candidate!.matchedRange).toBeDefined();
    expect(candidate!.matchedRange!.start).toBeGreaterThanOrEqual(0);
    expect(candidate!.matchedRange!.end).toBeGreaterThan(candidate!.matchedRange!.start);
  });
});

describe("mergeCandidates", () => {
  const dictCandidate: DictionaryCandidate = {
    meaning: "A formal agreement to repay debt",
    source: "dictionary",
    language: "en",
    confidence: 0.5,
    rankingScore: 0,
  };

  function g(overrides: Partial<DictionaryCandidate> & { meaning: string }): DictionaryCandidate {
    return {
      source: "glossary-finance",
      language: "ko",
      confidence: 0.95,
      rankingScore: 0,
      ...overrides,
    };
  }

  it("glossary 후보만 있으면 glossary 후보를 반환한다", () => {
    const glossary = [g({ meaning: "채권", matchedTerm: "bond" })];
    const result = mergeCandidates(glossary, []);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("glossary-finance");
  });

  it("dictionary 후보만 있으면 dictionary 후보를 반환한다", () => {
    const result = mergeCandidates([], [dictCandidate]);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("dictionary");
  });

  it("다단어 glossary 후보가 단일어보다 먼저 온다", () => {
    const single = g({ meaning: "채권", matchedTerm: "bond" });
    const multi = g({ meaning: "채권 수익률", matchedTerm: "bond yield" });
    const result = mergeCandidates([single, multi], []);
    expect(result[0].matchedTerm).toBe("bond yield");
  });

  it("동일 한국어 뜻 중복 제거", () => {
    const items = [
      g({ meaning: "채권", matchedTerm: "bond" }),
      g({ meaning: "채권", matchedTerm: "bond" }),
    ];
    const result = mergeCandidates(items, []);
    expect(result).toHaveLength(1);
  });

  it("glossary 미매칭 시 기존 dictionary 후보 유지", () => {
    const result = mergeCandidates([], [dictCandidate]);
    expect(result).toHaveLength(1);
    expect(result[0].meaning).toBe("A formal agreement to repay debt");
  });
});
