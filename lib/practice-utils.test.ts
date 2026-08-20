import { describe, expect, it } from "vitest";
import {
  buildCharacterStates,
  calculateAccuracy,
  calculateAggregateAccuracy,
  calculateWordsPerMinute,
  getComparableCharacters,
  hasIncorrectCharacter,
  isIgnorableFormatCharacter,
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

  it.each([
    ["–", "-"],
    ["—", "-"],
    ["−", "-"],
    ["-", "–"],
    ["-", "—"],
    ["-", "−"],
  ])("treats dash-family character %p and %p as equivalent", (targetCharacter, typedCharacter) => {
    expect(normalizeComparableCharacter(targetCharacter)).toBe("-");
    expect(normalizeComparableCharacter(typedCharacter)).toBe("-");
    expect(buildCharacterStates(targetCharacter, typedCharacter)[0].state).toBe("correct");
    expect(calculateAccuracy(targetCharacter, typedCharacter)).toBe(100);
    expect(calculateAggregateAccuracy([targetCharacter], [typedCharacter])).toBe(100);
    expect(hasIncorrectCharacter(targetCharacter, typedCharacter)).toBe(false);
    expect(isTypingComplete(targetCharacter, typedCharacter)).toBe(true);
  });

  it("marks a non-dash character as incorrect against a dash target", () => {
    expect(buildCharacterStates("-", "x")[0].state).toBe("incorrect");
    expect(hasIncorrectCharacter("-", "x")).toBe(true);
    expect(isTypingComplete("-", "x")).toBe(false);
  });

  it("keeps smart quote normalization intact alongside dash normalization", () => {
    expect(isTypingComplete("He’s – smart", "he's - smart")).toBe(true);
    expect(calculateAccuracy("He’s – smart", "he's - smart")).toBe(100);
  });

  it("keeps whitespace normalization intact alongside dash normalization", () => {
    expect(isTypingComplete("noted – with", "noted\u00a0- with")).toBe(true);
    expect(calculateAccuracy("noted – with", "noted\u00a0- with")).toBe(100);
  });

  it("does not mutate the target or typed strings when comparing dashes", () => {
    const target = "noted – with";
    const typed = "noted - with";
    buildCharacterStates(target, typed);
    expect(target).toBe("noted – with");
    expect(typed).toBe("noted - with");
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

  it("completes the real sentence when en dashes are typed as hyphens", () => {
    const target =
      "For example, Yana Lantratova, formerly deputy chair of the State Duma’s committee on education, now Russia’s human rights commissioner, noted – with specific reference to children in Russian-occupied Ukraine – that the Russian Federation “must first of all take care of the main thing – our children.”";
    const typed =
      "For example, Yana Lantratova, formerly deputy chair of the State Duma’s committee on education, now Russia’s human rights commissioner, noted - with specific reference to children in Russian-occupied Ukraine - that the Russian Federation “must first of all take care of the main thing - our children.”";

    expect(isTypingComplete(target, typed)).toBe(true);
    expect(calculateAccuracy(target, typed)).toBe(100);
    expect(hasIncorrectCharacter(target, typed)).toBe(false);
    expect(buildCharacterStates(target, typed).every(({ state }) => state === "correct")).toBe(true);
  });

  it("calculates aggregate accuracy by all typed characters", () => {
    expect(calculateAggregateAccuracy(["cat", "dog"], ["cat", "dig"])).toBe(83);
    expect(calculateAggregateAccuracy(["cat"], [""])).toBe(100);
  });
});

describe("invisible format character handling", () => {
  const INVISIBLES = ["\u200B", "\u200C", "\u200D", "\u200E", "\u200F", "\u2060", "\uFEFF"];

  it("knows invisible format characters are ignorable", () => {
    INVISIBLES.forEach((char) => expect(isIgnorableFormatCharacter(char)).toBe(true));
  });

  it("filters invisible characters from comparable arrays", () => {
    expect(getComparableCharacters("\u200C")).toEqual([]);
    expect(getComparableCharacters("a\u200Bb")).toEqual(["a", "b"]);
  });

  INVISIBLES.forEach((char) => {
    it(`ignores U+${char.codePointAt(0)?.toString(16).toUpperCase()} (target-only) in typing comparison`, () => {
      const target = `said ${char}on`;
      const typed = "said on";
      expect(isTypingComplete(target, typed)).toBe(true);
      expect(calculateAccuracy(target, typed)).toBe(100);
      expect(hasIncorrectCharacter(target, typed)).toBe(false);
      expect(calculateAggregateAccuracy([target], [typed])).toBe(100);
      expect(buildCharacterStates(target, typed).every(({ state }) => state === "correct")).toBe(true);
    });
  });

  it("ignores invisible character in typed input as well", () => {
    const target = "said on";
    const typed = "said \u200Con";
    expect(isTypingComplete(target, typed)).toBe(true);
    expect(calculateAccuracy(target, typed)).toBe(100);
  });

  it("allows multiple consecutive invisible characters", () => {
    const target = "a\u200B\u200C\u200Db";
    const typed = "ab";
    expect(isTypingComplete(target, typed)).toBe(true);
    expect(calculateAccuracy(target, typed)).toBe(100);
  });

  it("does not shift indices for later visible characters", () => {
    const states = buildCharacterStates("a\u200Cb c", "ab c");
    expect(states).toHaveLength(4); // a, b, " ", c
    expect(states[0].state).toBe("correct"); // a
    expect(states[1].state).toBe("correct"); // b
    expect(states[2].state).toBe("correct"); // 공백
    expect(states[3].state).toBe("correct"); // c
  });

  it("still marks visible mismatch as incorrect", () => {
    expect(hasIncorrectCharacter("a\u200Cb", "ac")).toBe(true);
    expect(buildCharacterStates("a\u200Cb", "ac")[1].state).toBe("incorrect");
  });

  it("preserves dash normalization with invisible characters", () => {
    expect(isTypingComplete("noted\u200C – with", "noted - with")).toBe(true);
    expect(calculateAccuracy("noted\u200C – with", "noted - with")).toBe(100);
  });

  it("preserves smart quote normalization with invisible characters", () => {
    expect(isTypingComplete("\u200Che’s here", "he's here")).toBe(true);
    expect(calculateAccuracy("\u200Che’s here", "he's here")).toBe(100);
  });

  it("does not mutate the original target or typed strings", () => {
    const target = "said \u200Con";
    const typed = "said on";
    buildCharacterStates(target, typed);
    expect(target).toBe("said \u200Con");
    expect(typed).toBe("said on");
  });

  it("completes the Reuters sentence with U+200C (ZWNJ) when typed without it", () => {
    const target =
      "Aug 4 (Reuters) - Federal Reserve Bank of Kansas City President Jeff Schmid said \u200Con Tuesday the financial situation involved in building out the artificial intelligence sector bears watching.";
    const typed =
      "Aug 4 (Reuters) - Federal Reserve Bank of Kansas City President Jeff Schmid said on Tuesday the financial situation involved in building out the artificial intelligence sector bears watching.";

    expect(isTypingComplete(target, typed)).toBe(true);
    expect(calculateAccuracy(target, typed)).toBe(100);
    expect(hasIncorrectCharacter(target, typed)).toBe(false);
    expect(buildCharacterStates(target, typed).every(({ state }) => state === "correct")).toBe(true);
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
