import type { SavedWordReviewState } from "@/types/review";
import type { SavedWord } from "@/types/vocabulary";

export type DueReviewItem = { word: SavedWord; state: SavedWordReviewState };

export function selectDueReviewWords(
  savedWords: SavedWord[],
  reviewStates: Record<string, SavedWordReviewState>,
  now: number,
  limit: number,
): DueReviewItem[] {
  if (limit <= 0) return [];

  const seenNormalized = new Set<string>();
  const items: DueReviewItem[] = [];

  // SavedWord map id -> word
  const wordById = new Map<string, SavedWord>();
  for (const w of savedWords) {
    if (!wordById.has(w.id)) wordById.set(w.id, w);
  }

  // due 후보 수집
  for (const state of Object.values(reviewStates)) {
    if (state.nextReviewAt > now) continue;
    const word = wordById.get(state.savedWordId);
    if (!word) continue; // orphan 제외
    if (seenNormalized.has(state.normalizedWord)) continue; // 중복 normalizedWord 방어
    seenNormalized.add(state.normalizedWord);
    items.push({ word, state });
  }

  // 정렬: nextReviewAt 오름차순 → incorrectCount 내림차순 → normalizedWord 오름차순 → savedWordId
  items.sort((a, b) => {
    if (a.state.nextReviewAt !== b.state.nextReviewAt) return a.state.nextReviewAt - b.state.nextReviewAt;
    if (a.state.incorrectCount !== b.state.incorrectCount) return b.state.incorrectCount - a.state.incorrectCount;
    const n = a.state.normalizedWord.localeCompare(b.state.normalizedWord, "en");
    if (n !== 0) return n;
    return a.state.savedWordId.localeCompare(b.state.savedWordId, "en");
  });

  return items.slice(0, limit);
}

export function removeOrphanReviewStates(
  savedWords: SavedWord[],
  reviewStates: Record<string, SavedWordReviewState>,
): Record<string, SavedWordReviewState> {
  const ids = new Set(savedWords.map((w) => w.id));
  const next: Record<string, SavedWordReviewState> = {};
  for (const [key, state] of Object.entries(reviewStates)) {
    if (ids.has(state.savedWordId)) next[key] = state;
  }
  return next;
}