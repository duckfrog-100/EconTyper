export type CharacterState = {
  character: string;
  displayCharacter: string;
  state: "correct" | "incorrect" | "remaining";
};

export type PracticeSentence = {
  text: string;
  paragraphStart: boolean;
};

const DASH_EQUIVALENTS = new Set(["-", "–", "—", "−"]);

const IGNORABLE_FORMAT_CHARACTERS = new Set([
  "\u200B", // ZERO WIDTH SPACE
  "\u200C", // ZERO WIDTH NON-JOINER
  "\u200D", // ZERO WIDTH JOINER
  "\u200E", // LEFT-TO-RIGHT MARK
  "\u200F", // RIGHT-TO-LEFT MARK
  "\u2060", // WORD JOINER
  "\uFEFF", // ZERO WIDTH NO-BREAK SPACE
]);

/** 입력이 필요 없는 보이지 않는 포맷 문자인지 반환한다. */
export function isIgnorableFormatCharacter(character: string): boolean {
  return IGNORABLE_FORMAT_CHARACTERS.has(character);
}

export function normalizeComparableCharacter(character: string): string {
  if (DASH_EQUIVALENTS.has(character)) return "-";
  if (character === "’" || character === "‘" || character === "`" || character === "´") return "'";
  if (character === "“" || character === "”") return '"';
  if (/\s/u.test(character)) return " ";
  return character.toLocaleLowerCase("en");
}

/**
 * 비교·집계용 정규화 문자 배열을 반환한다.
 * - 보이지 않는 포맷 문자(U+200B~U+200F, U+2060, U+FEFF)는 제외
 * - 나머지 문자는 normalizeComparableCharacter 적용
 */
export function getComparableCharacters(value: string): string[] {
  return Array.from(value)
    .filter((character) => !isIgnorableFormatCharacter(character))
    .map(normalizeComparableCharacter);
}

/** target 문자열에서 invisible 문자 없이 원본 문자(정규화 전)를 반환한다. */
function getVisibleTargetCharacters(target: string): string[] {
  return Array.from(target).filter((character) => !isIgnorableFormatCharacter(character));
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
  const visibleTarget = getVisibleTargetCharacters(target);
  const comparableTyped = getComparableCharacters(typed);
  const states: CharacterState[] = [];

  let typedIndex = 0;
  const allTarget = Array.from(target);

  for (const character of allTarget) {
    if (isIgnorableFormatCharacter(character)) {
      // invisible format 문자는 렌더하지 않음
      continue;
    }
    const typedChar = typedIndex < comparableTyped.length ? comparableTyped[typedIndex] : "";
    const isCorrect = typedChar !== "" && typedChar === normalizeComparableCharacter(character);
    const displayChar = isCorrect ? character : (typedIndex < Array.from(typed).length ? Array.from(typed)[typedIndex] ?? character : character);
    states.push({
      character,
      displayCharacter: displayChar,
      state: typedChar === "" ? "remaining" : isCorrect ? "correct" : "incorrect",
    });
    typedIndex += 1;
  }

  return states;
}

export function calculateAccuracy(target: string, typed: string): number {
  const comparableTyped = getComparableCharacters(typed);
  if (!comparableTyped.length) return 100;
  const comparableTarget = getComparableCharacters(target);
  const correct = comparableTyped.reduce(
    (count, character, index) => count + (index < comparableTarget.length && comparableTarget[index] === character ? 1 : 0),
    0,
  );
  return Math.round((correct / comparableTyped.length) * 100);
}

export function hasIncorrectCharacter(target: string, typed: string): boolean {
  const comparableTarget = getComparableCharacters(target);
  const comparableTyped = getComparableCharacters(typed);
  return comparableTyped.some(
    (character, index) => index >= comparableTarget.length || character !== comparableTarget[index],
  );
}

export function calculateAggregateAccuracy(targets: string[], typedValues: string[]): number {
  let totalTyped = 0;
  let totalCorrect = 0;

  targets.forEach((target, targetIndex) => {
    const comparableTarget = getComparableCharacters(target);
    const comparableTyped = getComparableCharacters(typedValues[targetIndex] ?? "");
    totalTyped += comparableTyped.length;
    totalCorrect += comparableTyped.reduce(
      (count, character, index) => count + (
        index < comparableTarget.length && character === comparableTarget[index] ? 1 : 0
      ),
      0,
    );
  });

  return totalTyped === 0 ? 100 : Math.round((totalCorrect / totalTyped) * 100);
}

export function calculateWordsPerMinute(typedCharacters: number, elapsedSeconds: number): number {
  if (!Number.isFinite(typedCharacters) || !Number.isFinite(elapsedSeconds) || typedCharacters <= 0 || elapsedSeconds <= 0) {
    return 0;
  }

  return Math.round((typedCharacters / 5) / (elapsedSeconds / 60));
}

export function isTypingComplete(target: string, typed: string): boolean {
  const comparableTarget = getComparableCharacters(target);
  const comparableTyped = getComparableCharacters(typed);
  if (comparableTarget.length !== comparableTyped.length) return false;
  return comparableTarget.every((character, index) => character === comparableTyped[index]);
}
