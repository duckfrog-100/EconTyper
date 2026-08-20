import type { SavedWordReviewState } from "@/types/review";
import type { SavedWord } from "@/types/vocabulary";
import { ensureReviewStatesForSavedWords } from "@/lib/review-srs";
import { removeOrphanReviewStates, selectDueReviewWords, type DueReviewItem } from "@/lib/review-selection";

export const DEFAULT_DAILY_REVIEW_LIMIT = 20;

export type ReviewSessionResult = {
  syncedStates: Record<string, SavedWordReviewState>;
  dueItems: DueReviewItem[];
  changed: boolean;
};

export function prepareReviewSession({
  savedWords,
  reviewStates,
  now,
  limit = DEFAULT_DAILY_REVIEW_LIMIT,
}: {
  savedWords: SavedWord[];
  reviewStates: Record<string, SavedWordReviewState>;
  now: number;
  limit?: number;
}): ReviewSessionResult {
  const ensured = ensureReviewStatesForSavedWords(savedWords, reviewStates, now);
  const syncedStates = removeOrphanReviewStates(savedWords, ensured);
  const changed = JSON.stringify(syncedStates) !== JSON.stringify(reviewStates);
  const dueItems = selectDueReviewWords(savedWords, syncedStates, now, limit);
  return { syncedStates, dueItems, changed };
}