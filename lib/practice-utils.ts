export type CharacterState = {
  character: string;
  state: "correct" | "incorrect" | "remaining";
};

export function segmentSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return Array.from(segmenter.segment(normalized), ({ segment }) => segment.trim()).filter(Boolean);
  }

  return normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

export function buildCharacterStates(target: string, typed: string): CharacterState[] {
  return Array.from(target).map((character, index) => {
    if (index >= typed.length) return { character, state: "remaining" };
    return {
      character,
      state: typed[index] === character ? "correct" : "incorrect",
    };
  });
}

export function calculateAccuracy(target: string, typed: string): number {
  if (!typed.length) return 100;
  const correct = Array.from(typed).reduce((count, character, index) => count + (target[index] === character ? 1 : 0), 0);
  return Math.round((correct / typed.length) * 100);
}
