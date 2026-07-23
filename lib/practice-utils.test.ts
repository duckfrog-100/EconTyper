import { describe, expect, it } from "vitest";
import { buildCharacterStates, segmentSentences } from "./practice-utils";

describe("segmentSentences", () => {
  it("splits English text into sentence-level practice units", () => {
    expect(segmentSentences("Markets move. Inflation matters! Does policy work?")).toEqual([
      "Markets move.",
      "Inflation matters!",
      "Does policy work?",
    ]);
  });
});

describe("buildCharacterStates", () => {
  it("marks typed characters as correct, incorrect, and remaining", () => {
    expect(buildCharacterStates("market", "marx")).toEqual([
      { character: "m", state: "correct" },
      { character: "a", state: "correct" },
      { character: "r", state: "correct" },
      { character: "k", state: "incorrect" },
      { character: "e", state: "remaining" },
      { character: "t", state: "remaining" },
    ]);
  });
});
