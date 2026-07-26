import type {
  PracticeHistoryEntry,
  PracticeHistoryMonthGroup,
  PracticeHistorySummary,
} from "@/types/history";

export const PRACTICE_HISTORY_KEY = "chagok.practiceHistory";
export const PRACTICE_HISTORY_LIMIT = 100;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage; } catch { return null; }
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHistoryEntry(value: unknown): PracticeHistoryEntry | null {
  if (!value || typeof value !== "object") return null;

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

  if (!id || !articleId || !title || !completedAt || Number.isNaN(Date.parse(completedAt)) ||
      accuracy === null || typedCharacters === null || wrongSentenceCount === null ||
      sessionWordCount === null || savedWordCount === null || sentenceCount === null) {
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
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeHistoryEntry)
    .filter((entry): entry is PracticeHistoryEntry => entry !== null)
    .sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt))
    .slice(0, PRACTICE_HISTORY_LIMIT);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function readPracticeHistory(): PracticeHistoryEntry[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(PRACTICE_HISTORY_KEY);
    return raw ? normalizeHistoryEntries(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writePracticeHistory(entries: PracticeHistoryEntry[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify(normalizeHistoryEntries(entries)));
  } catch {
    // History persistence must never interrupt practice.
  }
}

export function addPracticeHistoryEntry(entry: PracticeHistoryEntry): PracticeHistoryEntry[] {
  const normalizedEntry = normalizeHistoryEntry(entry);
  if (!normalizedEntry) return readPracticeHistory();

  const nextEntries = [
    normalizedEntry,
    ...readPracticeHistory().filter((existing) => existing.id !== normalizedEntry.id),
  ].slice(0, PRACTICE_HISTORY_LIMIT);

  writePracticeHistory(nextEntries);
  return nextEntries;
}

export function deletePracticeHistoryEntry(id: string): PracticeHistoryEntry[] {
  const normalizedId = id.trim();
  if (!normalizedId) return readPracticeHistory();

  const nextEntries = readPracticeHistory().filter((entry) => entry.id !== normalizedId);
  writePracticeHistory(nextEntries);
  return nextEntries;
}

export function filterPracticeHistory(
  entries: PracticeHistoryEntry[],
  query: string,
): PracticeHistoryEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) return entries;

  return entries.filter((entry) =>
    entry.title.toLocaleLowerCase("ko-KR").includes(normalizedQuery) ||
    entry.sourceName?.toLocaleLowerCase("ko-KR").includes(normalizedQuery),
  );
}

export function calculatePracticeHistorySummary(
  entries: PracticeHistoryEntry[],
  savedWordCount: number,
  now = new Date(),
): PracticeHistorySummary {
  const totalTypedCharacters = entries.reduce((sum, entry) => sum + entry.typedCharacters, 0);
  const averageAccuracy = entries.length
    ? Math.round(entries.reduce((sum, entry) => sum + entry.accuracy, 0) / entries.length)
    : 0;

  const practiceDates = new Set(entries.map((entry) => localDateKey(new Date(entry.completedAt))));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let cursor: Date;
  if (practiceDates.has(localDateKey(today))) cursor = today;
  else if (practiceDates.has(localDateKey(yesterday))) cursor = yesterday;
  else cursor = new Date(Number.NaN);

  let currentStreakDays = 0;
  while (!Number.isNaN(cursor.getTime()) && practiceDates.has(localDateKey(cursor))) {
    currentStreakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalSessions: entries.length,
    totalTypedCharacters,
    averageAccuracy,
    currentStreakDays,
    savedWordCount: Math.max(0, Math.trunc(savedWordCount)),
  };
}

export function groupPracticeHistoryByMonth(entries: PracticeHistoryEntry[]): PracticeHistoryMonthGroup[] {
  const sortedEntries = [...entries].sort(
    (left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt),
  );
  const groups = new Map<string, PracticeHistoryEntry[]>();

  for (const entry of sortedEntries) {
    const monthKey = localMonthKey(new Date(entry.completedAt));
    const monthEntries = groups.get(monthKey) ?? [];
    monthEntries.push(entry);
    groups.set(monthKey, monthEntries);
  }

  return Array.from(groups, ([monthKey, monthEntries]) => ({ monthKey, entries: monthEntries }));
}
