export type CharacterState = {
  character: string;
  displayCharacter: string;
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

function repairMissingSentenceSpaces(paragraph: string): string {
  const characters = Array.from(paragraph);
  const repaired: string[] = [];

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    repaired.push(character);

    if (character !== "." && character !== "!" && character !== "?") continue;

    let nextIndex = index + 1;
    while (characters[nextIndex] === '"' || characters[nextIndex] === "'" || characters[nextIndex] === "”" || characters[nextIndex] === "’") {
      repaired.push(characters[nextIndex]);
      nextIndex += 1;
      index += 1;
    }

    const next = characters[nextIndex];
    if (!next || /\s/u.test(next) || !/[A-Z]/.test(next)) continue;

    const before = repaired.slice(0, -1).join("");
    const previousToken = before.match(/([A-Za-z]+)$/)?.[1] ?? "";
    const isSingleLetterInitial = previousToken.length === 1 && /[A-Z]/.test(previousToken);

    if (!isSingleLetterInitial) repaired.push(" ");
  }

  return repaired.join("");
}

function splitParagraph(paragraph: string): string[] {
  const normalized = repairMissingSentenceSpaces(paragraph.replace(/[ \t]+/g, " ").trim());
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

  return normalized.split(/\n{2,}/).flatMap((paragraph) =>
    splitParagraph(paragraph).map((sentence, index) => ({ text: sentence, paragraphStart: index === 0 })),
  );
}

export function buildCharacterStates(target: string, typed: string): CharacterState[] {
  const targetCharacters = Array.from(target);
  const typedCharacters = Array.from(typed);
  return targetCharacters.map((character, index) => {
    if (index >= typedCharacters.length) return { character, displayCharacter: character, state: "remaining" };
    const typedCharacter = typedCharacters[index] ?? "";
    const isCorrect = normalizeComparableCharacter(typedCharacter) === normalizeComparableCharacter(character);
    return { character, displayCharacter: isCorrect ? character : typedCharacter, state: isCorrect ? "correct" : "incorrect" };
  });
}

export function calculateAccuracy(target: string, typed: string): number {
  const typedCharacters = Array.from(typed);
  if (!typedCharacters.length) return 100;
  const targetCharacters = Array.from(target);
  const correct = typedCharacters.reduce(
    (count, character, index) => count + (index < targetCharacters.length && normalizeComparableCharacter(targetCharacters[index]) === normalizeComparableCharacter(character) ? 1 : 0),
    0,
  );
  return Math.round((correct / typedCharacters.length) * 100);
}

export function isTypingComplete(target: string, typed: string): boolean {
  const targetCharacters = Array.from(target);
  const typedCharacters = Array.from(typed);
  if (targetCharacters.length !== typedCharacters.length) return false;
  return targetCharacters.every((character, index) => normalizeComparableCharacter(character) === normalizeComparableCharacter(typedCharacters[index]));
}
