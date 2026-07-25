import { describe, expect, it } from "vitest";
import { normalizeWord, parseVocabularyCsv, toVocabularyCsv, upsertWord } from "./vocabulary-storage";

const word = { word: "Inflation", meaning: "물가 상승", addedAt: 1 };

describe("vocabulary storage", () => {
  it("normalizes punctuation and case", () => {
    expect(normalizeWord("Inflation,")).toBe("inflation");
    expect(normalizeWord("'Growth'" )).toBe("growth");
  });

  it("deduplicates words case-insensitively", () => {
    const result = upsertWord([word], { ...word, word: "inflation", meaning: "인플레이션", addedAt: 2 });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ word: "inflation", meaning: "인플레이션", addedAt: 2 });
  });

  it("round-trips csv including commas and quotes", () => {
    const restored = parseVocabularyCsv(toVocabularyCsv([
      { ...word, meaning: '물가 상승, "인플레이션"', exampleSentence: "Prices rose, quickly." },
    ]));
    expect(restored[0]).toMatchObject({
      word: "inflation",
      meaning: '물가 상승, "인플레이션"',
      exampleSentence: "Prices rose, quickly.",
    });
  });

  it("rejects csv without required columns", () => {
    expect(() => parseVocabularyCsv("term,definition\nfoo,bar")).toThrow("word와 meaning 열이 필요합니다.");
  });

  it("ignores blank rows and deduplicates imported words", () => {
    const restored = parseVocabularyCsv("word,meaning\r\nGrowth,성장\r\n\r\ngrowth,경제 성장\r\n");
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ word: "growth", meaning: "경제 성장" });
  });
});
