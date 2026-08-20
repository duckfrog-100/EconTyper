import { describe, expect, it } from "vitest";
import { createContextFingerprint, extractContextWindow, normalizeSentence, tokenizeSentence } from "./context";

describe("normalizeSentence", () => {
  it("빈 문장은 빈 문자열을 반환한다", () => {
    expect(normalizeSentence("")).toBe("");
    expect(normalizeSentence(undefined)).toBe("");
  });

  it("연속 공백을 하나로 합친다", () => {
    expect(normalizeSentence("The  government   issued bonds.")).toBe("The government issued bonds.");
  });

  it("200자 초과 시 자른다", () => {
    const long = "x ".repeat(150);
    const result = normalizeSentence(long);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("trim을 수행한다", () => {
    expect(normalizeSentence("  hello world  ")).toBe("hello world");
  });
});

describe("tokenizeSentence", () => {
  it("빈 문장은 빈 배열을 반환한다", () => {
    expect(tokenizeSentence("")).toEqual([]);
  });

  it("문장을 단어로 분할한다", () => {
    expect(tokenizeSentence("The government issued bonds.")).toEqual(["the", "government", "issued", "bonds"]);
  });

  it("소문자로 변환한다", () => {
    expect(tokenizeSentence("GDP Growth")).toEqual(["gdp", "growth"]);
  });

  it("소유격 아포스트로피를 유지한다", () => {
    expect(tokenizeSentence("investor's portfolio")).toEqual(["investor's", "portfolio"]);
  });
});

describe("extractContextWindow", () => {
  it("hover 단어 주변 ±5단어를 추출한다", () => {
    const sentence = "The central bank raised the interest rate yesterday to control inflation.";
    const result = extractContextWindow(sentence, "interest");
    const tokens = result.split(/\s+/);
    expect(tokens).toContain("interest");
    expect(tokens).toContain("rate");
    expect(tokens.length).toBeLessThanOrEqual(11);
  });

  it("문장 내 첫 번째 위치를 기준으로 윈도우를 만든다", () => {
    const result = extractContextWindow("interest rate and bond yield", "interest");
    expect(result).toContain("interest rate");
  });

  it("hover 단어가 없으면 빈 문자열을 반환한다", () => {
    const result = extractContextWindow("The weather is nice", "inflation");
    expect(result).toBe("");
  });

  it("wordStart/wordEnd로 첫 번째와 두 번째 동일 단어의 window가 다르다", () => {
    const sentence = "The interest rate is high but interest from investors is also strong.";
    // 첫 번째 "interest": offset 4-12
    const firstWindow = extractContextWindow(sentence, "interest", 4, 12);
    const firstTokens = firstWindow.split(/\s+/);
    expect(firstTokens).toContain("high"); // "but"은 5단어 밖이므로 포함되지 않을 수 있음

    // 두 번째 "interest": 두 번째 단어의 offset 찾기
    // "The interest rate is high but interest from investors is also strong."
    // 두 번째 "interest"의 char offset: "The interest rate is high but " = 30, "interest" = 30-38
    const secondWindow = extractContextWindow(sentence, "interest", 30, 38);
    const secondTokens = secondWindow.split(/\s+/);
    expect(secondTokens).toContain("but");

    // 두 window는 달라야 함 (첫 번째는 "high" 포함, 두 번째는 "but" 포함)
    expect(firstWindow).not.toBe(secondWindow);
  });

  it("토큰 순서를 보존한다", () => {
    const result = extractContextWindow("raised the interest rate yesterday", "interest");
    expect(result).toBe("raised the interest rate yesterday");
  });
});

describe("createContextFingerprint (hash 기반, 순서 보존)", () => {
  it("빈 문장은 빈 문자열을 반환한다", () => {
    expect(createContextFingerprint("", "test")).toBe("");
  });

  it("동일한 문맥은 동일한 fingerprint", () => {
    const a = createContextFingerprint("bank raised the interest rate yesterday", "interest");
    const b = createContextFingerprint("bank raised the interest rate yesterday", "interest");
    expect(a).toBe(b);
  });

  it("토큰 순서가 다른 문맥은 다른 fingerprint", () => {
    // "interest rate increased" vs "increased interest rate" → 서로 다른 순서
    const a = createContextFingerprint("the interest rate increased sharply", "interest");
    const b = createContextFingerprint("the increased interest rate surprised", "interest");
    // 윈도우가 서로 달라야 함
    expect(a).not.toBe(b);
  });

  it("중복 토큰 유무가 다른 문맥은 다른 fingerprint", () => {
    // 중복 없는 문맥
    const a = createContextFingerprint("the interest rate is high", "interest");
    // 중복 있는 문맥 ("the" 두 번)
    const b = createContextFingerprint("the the interest rate is high", "interest");
    expect(a).not.toBe(b);
  });

  it("단어 위치에 따라 다른 fingerprint", () => {
    const sentence = "The interest rate is high but interest from investors is also strong.";
    // 첫 번째 "interest" (offset 4-12)
    const fp1 = createContextFingerprint(sentence, "interest", 4, 12);
    // 두 번째 "interest" (offset 30-38)
    const fp2 = createContextFingerprint(sentence, "interest", 30, 38);
    expect(fp1).not.toBe(fp2);
  });

  it("hash는 32비트 hex 문자열", () => {
    const result = createContextFingerprint("bank raised the interest rate", "interest");
    expect(result).toMatch(/^[0-9a-f]{1,8}$/);
  });
});