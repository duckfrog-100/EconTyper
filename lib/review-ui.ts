import { calculateNextReviewState, getNextLocalMidnight } from "@/lib/review-srs";
import { upsertReviewState } from "@/lib/review-storage";
import type { SavedWordReviewState } from "@/types/review";
import type { ReviewRating } from "@/types/review";

export type ReviewSessionResult = {
  savedWordId: string;
  rating: ReviewRating;
};

export type SessionRatingCounts = {
  again: number;
  hard: number;
  good: number;
  total: number;
};

export type ReviewCompletionSummary = {
  total: number;
  goodCount: number;
  hardCount: number;
  againCount: number;
  successRate: number;
  dueAgainCount: number;
  dueTomorrowCount: number;
  dueLaterCount: number;
};

export function calculateSessionRatingCounts(results: ReviewSessionResult[]): SessionRatingCounts {
  let again = 0;
  let hard = 0;
  let good = 0;
  for (const r of results) {
    if (r.rating === "again") again += 1;
    else if (r.rating === "hard") hard += 1;
    else good += 1;
  }
  return { again, hard, good, total: results.length };
}

export function applyReviewRating(
  reviewStates: Record<string, SavedWordReviewState>,
  savedWordId: string,
  rating: ReviewRating,
  now: number,
): Record<string, SavedWordReviewState> {
  const state = reviewStates[savedWordId];
  if (!state) return reviewStates;
  const next = calculateNextReviewState(state, rating, now);
  return upsertReviewState(reviewStates, next);
}

/**
 * 완료 화면 요약 계산.
 * - 결과는 현재 세션의 results와 최신 reviewStates만으로 계산한다.
 * - successRate는 good 비율(good+easy 포함)을 반올림한 정수 (total 0이면 0).
 * - 일정 분류는 로컬 날짜 기준 (getNextLocalMidnight는 다음 로컬 자정 = 내일 00:00 반환):
 *   - 오늘 다시 복습: nextReviewAt < 다음 로컬 자정
 *   - 내일 복습: 다음 로컬 자정 <= nextReviewAt < 그다음 로컬 자정
 *   - 그 이후: 그다음 로컬 자정 <= nextReviewAt
 */
export function calculateReviewCompletionSummary({
  results,
  reviewStates,
  now,
}: {
  results: ReviewSessionResult[];
  reviewStates: Record<string, SavedWordReviewState>;
  now: number;
}): ReviewCompletionSummary {
  let goodCount = 0;
  let hardCount = 0;
  let againCount = 0;
  const sessionIds = new Set<string>();

  for (const r of results) {
    sessionIds.add(r.savedWordId);
    if (r.rating === "again") againCount += 1;
    else if (r.rating === "hard") hardCount += 1;
    else goodCount += 1; // good, easy
  }

  const total = results.length;
  const successRate = total === 0 ? 0 : Math.round((goodCount / total) * 100);

  const nextLocalMidnight = getNextLocalMidnight(now);
  const followingLocalMidnight = getNextLocalMidnight(nextLocalMidnight);

  let dueAgainCount = 0;
  let dueTomorrowCount = 0;
  let dueLaterCount = 0;
  for (const id of sessionIds) {
    const state = reviewStates[id];
    if (!state) continue;
    if (state.nextReviewAt < nextLocalMidnight) dueAgainCount += 1;
    else if (state.nextReviewAt < followingLocalMidnight) dueTomorrowCount += 1;
    else dueLaterCount += 1;
  }

  return { total, goodCount, hardCount, againCount, successRate, dueAgainCount, dueTomorrowCount, dueLaterCount };
}