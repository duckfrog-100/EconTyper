import type { ReviewRating, SavedWordReviewState } from "@/types/review";
import type { SavedWord } from "@/types/vocabulary";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getNextLocalMidnight(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

export function createInitialReviewState(savedWord: SavedWord, now: number): SavedWordReviewState {
  return {
    savedWordId: savedWord.id,
    normalizedWord: savedWord.normalizedWord,
    reviewCount: 0, correctCount: 0, incorrectCount: 0,
    intervalDays: 1, lastReviewedAt: undefined,
    nextReviewAt: getNextLocalMidnight(now),
    createdAt: now, updatedAt: now,
  };
}

export function ensureReviewStatesForSavedWords(
  savedWords: SavedWord[],
  reviewStates: Record<string, SavedWordReviewState>,
  now: number,
): Record<string, SavedWordReviewState> {
  const next = { ...reviewStates };
  for (const w of savedWords) {
    if (!next[w.id]) next[w.id] = createInitialReviewState(w, now);
  }
  return next;
}

export function calculateNextReviewState(
  state: SavedWordReviewState,
  rating: ReviewRating,
  now: number,
): SavedWordReviewState {
  const s = { ...state };
  s.reviewCount += 1;
  s.lastReviewedAt = now;
  s.updatedAt = now;
  if (rating === "again") { s.incorrectCount += 1; s.intervalDays = 0; s.nextReviewAt = now; }
  else if (rating === "hard") { s.incorrectCount += 1; s.intervalDays = 1; s.nextReviewAt = getNextLocalMidnight(now); }
  else if (rating === "good") {
    s.correctCount += 1;
    s.intervalDays = nextGood(s.intervalDays);
    s.nextReviewAt = now + s.intervalDays * DAY_MS;
  } else {
    s.correctCount += 1;
    s.intervalDays = nextEasy(s.intervalDays);
    s.nextReviewAt = now + s.intervalDays * DAY_MS;
  }
  return s;
}

function nextGood(c: number): number { return c <= 1 ? 3 : c <= 3 ? 7 : c <= 7 ? 14 : 30; }
function nextEasy(c: number): number { return c <= 1 ? 7 : c <= 7 ? 21 : 60; }