export type CharacterState = {
  character: string;
  state: "correct" | "incorrect" | "remaining";
};

export type PracticeSentence = {
  text: string;
  paragraphStart: boolean;
};

export function normalizeComparableCharacter(character: string): string {
  if (character === "’" || character === "‘" || character === "`" || character === "´") return "'";
  if (character === "“" || character === "”") return '"';
  if (/\s/u.test(character)) return " ";
  return character.toLocaleLowerCase("en");
}

function splitParagraph(paragraph: string): string[] {
  const normalized = paragraph.replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    return Array.from(segmenter.segment(normalized), ({ segment }) => segment.trim()).filter(Boolean);
  }

  return normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

export function segmentSentences(text: string): PracticeSentence[] {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  return normalized
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitParagraph(paragraph).map((sentence, index) => ({ text: sentence, paragraphStart: index === 0 })));
}

export function buildCharacterStates(target: string, typed: string): CharacterState[] {
  return Array.from(target).map((character, index) => {
    if (index >= typed.length) return { character, state: "remaining" };
    return {
      character,
      state:
        normalizeComparableCharacter(typed[index]) === normalizeComparableCharacter(character)
          ? "correct"
          : "incorrect",
    };
  });
}

export function calculateAccuracy(target: string, typed: string): number {
  if (!typed.length) return 100;
  const correct = Array.from(typed).reduce(
    (count, character, index) =>
      count +
      (index < target.length && normalizeComparableCharacter(target[index]) === normalizeComparableCharacter(character) ? 1 : 0),
    0,
  );
  return Math.round((correct / typed.length) * 100);
}

export function isTypingComplete(target: string, typed: string): boolean {
  if (target.length !== typed.length) return false;
  return Array.from(target).every(
    (character, index) => normalizeComparableCharacter(character) === normalizeComparableCharacter(typed[index]),
  );
}