import type { SavedWordReviewState, ReviewStateStore } from "@/types/review";

const STORAGE_KEY = "chagok.reviewStates.v1";
const STORE_VERSION = 1;

export function getReviewStorage(): Storage | null {
  try {
    const g = globalThis as Record<string, unknown>;
    const storage = g.localStorage;
    if (storage && typeof (storage as Storage).getItem === "function") {
      return storage as Storage;
    }
    return null;
  } catch {
    return null;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

export function normalizeReviewState(value: unknown): SavedWordReviewState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<SavedWordReviewState>;

  if (typeof candidate.savedWordId !== "string" || candidate.savedWordId.length === 0) return undefined;
  if (typeof candidate.normalizedWord !== "string" || candidate.normalizedWord.trim().length === 0) return undefined;

  const normalizedWord = candidate.normalizedWord
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");

  if (
    !isNonNegativeInteger(candidate.reviewCount) ||
    !isNonNegativeInteger(candidate.correctCount) ||
    !isNonNegativeInteger(candidate.incorrectCount) ||
    !isNonNegativeInteger(candidate.intervalDays) ||
    !isFiniteNumber(candidate.nextReviewAt) ||
    !isFiniteNumber(candidate.createdAt) ||
    !isFiniteNumber(candidate.updatedAt)
  ) {
    return undefined;
  }

  let lastReviewedAt: number | undefined;
  if (candidate.lastReviewedAt !== undefined) {
    if (!isFiniteNumber(candidate.lastReviewedAt)) {
      lastReviewedAt = undefined;
    } else {
      lastReviewedAt = candidate.lastReviewedAt;
    }
  }

  return {
    savedWordId: candidate.savedWordId,
    normalizedWord,
    reviewCount: candidate.reviewCount,
    correctCount: candidate.correctCount,
    incorrectCount: candidate.incorrectCount,
    intervalDays: candidate.intervalDays,
    lastReviewedAt,
    nextReviewAt: candidate.nextReviewAt,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

function readRawStore(): Record<string, SavedWordReviewState> | null {
  const storage = getReviewStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReviewStateStore>;
    if (parsed.version !== STORE_VERSION || !parsed.items || typeof parsed.items !== "object") {
      return null;
    }
    const items: Record<string, SavedWordReviewState> = {};
    for (const [key, value] of Object.entries(parsed.items)) {
      const normalized = normalizeReviewState(value);
      if (normalized && normalized.savedWordId === key) {
        items[key] = normalized;
      }
    }
    return items;
  } catch {
    return null;
  }
}

export function readReviewStates(): Record<string, SavedWordReviewState> {
  const items = readRawStore();
  return items ?? {};
}

export function writeReviewStates(
  states: Record<string, SavedWordReviewState>,
): boolean {
  const storage = getReviewStorage();
  if (!storage) return false;
  try {
    const store: ReviewStateStore = { version: STORE_VERSION, items: states };
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function upsertReviewState(
  states: Record<string, SavedWordReviewState>,
  state: SavedWordReviewState,
): Record<string, SavedWordReviewState> {
  const next: Record<string, SavedWordReviewState> = { ...states };
  next[state.savedWordId] = state;
  return next;
}

export function deleteReviewState(
  states: Record<string, SavedWordReviewState>,
  savedWordId: string,
): Record<string, SavedWordReviewState> {
  const next: Record<string, SavedWordReviewState> = { ...states };
  delete next[savedWordId];
  return next;
}