import { describe, expect, it } from "vitest";
import { getCandidateKey } from "./candidate-key";
import type { DictionaryCandidate } from "@/types/dictionary";

function make(overrides: Partial<DictionaryCandidate> & { meaning: string }): DictionaryCandidate {
  return {
    source: "dictionary",
    language: "en",
    confidence: 0.5,
    rankingScore: 0,
    ...overrides,
  };
}

describe("getCandidateKey", () => {
  it("같은 candidate는 항상 같은 key", () => {
    const a = make({ meaning: "채권", source: "glossary-finance", language: "ko", matchedTerm: "bond" });
    const b = make({ meaning: "채권", source: "glossary-finance", language: "ko", matchedTerm: "bond" });
    expect(getCandidateKey(a)).toBe(getCandidateKey(b));
  });

  it("의미가 다르면 다른 key", () => {
    const a = make({ meaning: "채권", source: "glossary-finance", language: "ko", matchedTerm: "bond" });
    const b = make({ meaning: "채권 수익률", source: "glossary-finance", language: "ko", matchedTerm: "bond yield" });
    expect(getCandidateKey(a)).not.toBe(getCandidateKey(b));
  });

  it("출처가 다르면 다른 key", () => {
    const a = make({ meaning: "a formal agreement", source: "dictionary", language: "en" });
    const b = make({ meaning: "a formal agreement", source: "glossary-finance", language: "ko" });
    expect(getCandidateKey(a)).not.toBe(getCandidateKey(b));
  });

  it("대소문자 정규화", () => {
    const a = make({ meaning: "BOND", source: "glossary-finance", language: "ko", matchedTerm: "BOND" });
    const b = make({ meaning: "bond", source: "glossary-finance", language: "ko", matchedTerm: "bond" });
    expect(getCandidateKey(a)).toBe(getCandidateKey(b));
  });

  it("공백 정규화", () => {
    const a = make({ meaning: "  채권  ", source: "glossary-finance", language: "ko", matchedTerm: "  bond  " });
    const b = make({ meaning: "채권", source: "glossary-finance", language: "ko", matchedTerm: "bond" });
    expect(getCandidateKey(a)).toBe(getCandidateKey(b));
  });

  it("품사가 다르면 다른 key", () => {
    const a = make({ meaning: "이익", source: "glossary-business", language: "ko", matchedTerm: "profit", partOfSpeech: "noun" });
    const b = make({ meaning: "이익", source: "glossary-business", language: "ko", matchedTerm: "profit", partOfSpeech: "verb" });
    expect(getCandidateKey(a)).not.toBe(getCandidateKey(b));
  });

  it("빈 matchedTerm/partOfSpeech도 자리 구분자가 유지되어 충돌하지 않음", () => {
    const a = make({ meaning: "test", source: "dictionary", language: "en", matchedTerm: "", partOfSpeech: "noun" });
    const b = make({ meaning: "test", source: "dictionary", language: "en", matchedTerm: "noun", partOfSpeech: "" });
    // matchedTerm과 partOfSpeech가 서로 바뀌어도 key가 달라야 함
    expect(getCandidateKey(a)).not.toBe(getCandidateKey(b));
  });
});