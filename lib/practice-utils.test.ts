import { describe, expect, it } from "vitest";
import {
  buildCharacterStates,
  calculateAccuracy,
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
});
