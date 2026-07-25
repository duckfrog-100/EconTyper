import type { PracticeHistoryEntry } from "@/types/history";

export const PRACTICE_HISTORY_KEY = "chagok.practiceHistory";
export const PRACTICE_HISTORY_LIMIT = 100;

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.trunc(value));
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHistoryEntry(value: unknown): PracticeHistoryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = normalizeRequiredString(candidate.id);
  const articleId = normalizeRequiredString(candidate.articleId);
  const title = normalizeRequiredString(candidate.title);
  const completedAt = normalizeRequiredString(candidate.completedAt);
  const accuracy = typeof candidate.accuracy === "number" && Number.isFinite(candidate.accuracy)
    ? Math.min(100, Math.max(0, candidate.accuracy))
    : null;
  const typedCharacters = normalizeNonNegativeInteger(candidate.typedCharacters);
  const wrongSentenceCount = normalizeNonNegativeInteger(candidate.wrongSentenceCount);
  const sessionWordCount = normalizeNonNegativeInteger(candidate.sessionWordCount);
  const savedWordCount = normalizeNonNegativeInteger(candidate.savedWordCount);
  const sentenceCount = normalizeNonNegativeInteger(candidate.sentenceCount);

  if (
    !id ||
    !articleId ||
    !title ||
    !completedAt ||
    Number.isNaN(Date.parse(completedAt)) ||
    accuracy === null ||
    typedCharacters === null ||
    wrongSentenceCount === null ||
    sessionWordCount === null ||
    savedWordCount === null ||
    sentenceCount === null
  ) {
    return null;
  }

  const sourceName = normalizeRequiredString(candidate.sourceName);

  return {
    id,
    articleId,
    title,
    ...(sourceName ? { sourceName } : {}),
    completedAt,
    accuracy,
    typedCharacters,
    wrongSentenceCount,
    sessionWordCount,
    savedWordCount,
    sentenceCount,
  };
}

function normalizeHistoryEntries(value: unknown): PracticeHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeHistoryEntry)
    .filter((entry): entry is PracticeHistoryEntry => entry !== null)
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
    .slice(0, PRACTICE_HISTORY_LIMIT);
}

export function readPracticeHistory(): PracticeHistoryEntry[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(PRACTICE_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    return normalizeHistoryEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writePracticeHistory(entries: PracticeHistoryEntry[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(normalizeHistoryEntries(entries)));
  } catch {
    // Storage can be unavailable or full. History must not break practice flows.
  }
}

export function addPracticeHistoryEntry(entry: PracticeHistoryEntry): PracticeHistoryEntry[] {
  const normalizedEntry = normalizeHistoryEntry(entry);
  if (!normalizedEntry) {
    return readPracticeHistory();
  }

  const nextEntries = [
    normalizedEntry,
    ...readPracticeHistory().filter((existing) => existing.id !== normalizedEntry.id),
  ].slice(0, PRACTICE_HISTORY_LIMIT);

  writePracticeHistory(nextEntries);
  return nextEntries;
}
