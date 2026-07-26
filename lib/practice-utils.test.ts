import { describe, expect, it } from "vitest";
import {
  buildCharacterStates,
  calculateAccuracy,
  calculateAggregateAccuracy,
  calculateWordsPerMinute,
  hasIncorrectCharacter,
  isTypingComplete,
  normalizeComparableCharacter,
  segmentSentences,
} from "./practice-utils";

describe("segmentSentences", () => {
  it("splits English text into sentence-level practice units", () => {
    expect(segmentSentences("Markets move. Inflation matters! Does policy work?")).toEqual([
      { text: "Markets move.", paragraphStart: true },
      { text: "Inflation matters!", paragraphStart: false },
      { text: "Does policy work?", paragraphStart: false },
    ]);
  });

  it("preserves paragraph boundaries as spacing metadata", () => {
    expect(segmentSentences("First sentence.\n\nSecond paragraph begins. Another sentence.")).toEqual([
      { text: "First sentence.", paragraphStart: true },
      { text: "Second paragraph begins.", paragraphStart: true },
      { text: "Another sentence.", paragraphStart: false },
    ]);
  });

  it("repairs missing spaces between sentence punctuation and uppercase text", () => {
    expect(segmentSentences("Public safety matters.Congress introduced a bill.They debated it.")).toEqual([
      { text: "Public safety matters.", paragraphStart: true },
      { text: "Congress introduced a bill.", paragraphStart: false },
      { text: "They debated it.", paragraphStart: false },
    ]);
  });

  it("does not split a single-letter abbreviation", () => {
    expect(segmentSentences("The U.S. economy grew. Markets reacted.")).toEqual([
      { text: "The U.S. economy grew.", paragraphStart: true },
      { text: "Markets reacted.", paragraphStart: false },
    ]);
  });
});

describe("tolerant typing comparison", () => {
  it("treats case, smart quotes, straight quotes, and non-breaking spaces as equivalent", () => {
    expect(normalizeComparableCharacter("H")).toBe("h");
    expect(normalizeComparableCharacter("’")).toBe("'");
    expect(normalizeComparableCharacter("“")).toBe('"');
    expect(normalizeComparableCharacter("\u00a0")).toBe(" ");
  });

  it("shows the actual mistyped character while retaining the target character", () => {
    expect(buildCharacterStates("market", "marx")[3]).toEqual({
      character: "k",
      displayCharacter: "x",
      state: "incorrect",
    });
  });

  it("marks equivalent characters as correct", () => {
    expect(buildCharacterStates("He’s Here", "he's here").every(({ state }) => state === "correct")).toBe(true);
  });

  it("calculates completion and accuracy using tolerant comparison", () => {
    expect(isTypingComplete("“Inflation”", '"inflation"')).toBe(true);
    expect(calculateAccuracy("He’s Here", "he's here")).toBe(100);
  });

  it("detects an incorrect attempt before completion", () => {
    expect(hasIncorrectCharacter("cat", "cb")).toBe(true);
    expect(hasIncorrectCharacter("cat", "ca")).toBe(false);
    expect(hasIncorrectCharacter("cat", "cats")).toBe(true);
  });

  it("calculates aggregate accuracy by all typed characters", () => {
    expect(calculateAggregateAccuracy(["cat", "dog"], ["cat", "dig"])).toBe(83);
    expect(calculateAggregateAccuracy(["cat"], [""])).toBe(100);
  });
});

describe("calculateWordsPerMinute", () => {
  it("uses five typed characters as one standard word", () => {
    expect(calculateWordsPerMinute(300, 120)).toBe(30);
  });

  it("rounds fractional WPM to the nearest whole number", () => {
    expect(calculateWordsPerMinute(137, 90)).toBe(18);
  });

  it("returns zero for non-positive or non-finite inputs", () => {
    expect(calculateWordsPerMinute(0, 60)).toBe(0);
    expect(calculateWordsPerMinute(100, 0)).toBe(0);
    expect(calculateWordsPerMinute(-10, 60)).toBe(0);
    expect(calculateWordsPerMinute(Number.NaN, 60)).toBe(0);
  });
});
