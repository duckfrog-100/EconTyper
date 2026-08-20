import { describe, expect, it } from "vitest";
import { calculateSessionRatingCounts, applyReviewRating, calculateReviewCompletionSummary } from "./review-ui";
import { getNextLocalMidnight } from "./review-srs";

describe("calculateSessionRatingCounts", () => {
  it("빈 결과", () => {
    expect(calculateSessionRatingCounts([])).toEqual({ again: 0, hard: 0, good: 0, total: 0 });
  });
  it("집계", () => {
    const r = calculateSessionRatingCounts([
      { savedWordId: "a", rating: "again" },
      { savedWordId: "b", rating: "hard" },
      { savedWordId: "c", rating: "good" },
      { savedWordId: "d", rating: "good" },
    ]);
    expect(r).toEqual({ again: 1, hard: 1, good: 2, total: 4 });
  });
});

describe("applyReviewRating", () => {
  const st = (id: string, intervalDays = 1, nextReviewAt = 100) => ({
    savedWordId: id, normalizedWord: "bond", reviewCount: 0, correctCount: 0, incorrectCount: 0,
    intervalDays, nextReviewAt, createdAt: 50, updatedAt: 50,
  });

  it("대상만 갱신, 다른 state 유지", () => {
    const before = { a: st("a"), b: st("b") };
    const after = applyReviewRating(before, "a", "good", 1000);
    expect(after.a.intervalDays).toBe(3);
    expect(after.b.intervalDays).toBe(1);
    expect(before.a.intervalDays).toBe(1);
  });

  it("없는 savedWordId는 원본 반환", () => {
    const before = { a: st("a") };
    const after = applyReviewRating(before, "x", "good", 1000);
    expect(after).toEqual(before);
  });
});

describe("calculateReviewCompletionSummary", () => {
  const now = new Date(2024, 5, 15, 12, 0, 0).getTime();
  // getNextLocalMidnight(now)는 다음 로컬 자정 = 내일 00:00
  const nextLocalMidnight = getNextLocalMidnight(now);
  const followingLocalMidnight = getNextLocalMidnight(nextLocalMidnight);

  const st = (id: string, nextReviewAt: number) => ({
    savedWordId: id, normalizedWord: "bond", reviewCount: 1, correctCount: 0, incorrectCount: 0,
    intervalDays: 1, nextReviewAt, createdAt: 50, updatedAt: 50,
  });

  it("빈 세션은 모두 0, 성공률 0", () => {
    const s = calculateReviewCompletionSummary({ results: [], reviewStates: {}, now });
    expect(s).toEqual({ total: 0, goodCount: 0, hardCount: 0, againCount: 0, successRate: 0, dueAgainCount: 0, dueTomorrowCount: 0, dueLaterCount: 0 });
  });

  it("good/hard/again 집계와 성공률 반올림", () => {
    const states = {
      a: st("a", nextLocalMidnight + 1000),
      b: st("b", followingLocalMidnight + 1000),
      c: st("c", now),
    };
    const s = calculateReviewCompletionSummary({
      results: [
        { savedWordId: "a", rating: "good" },
        { savedWordId: "b", rating: "good" },
        { savedWordId: "c", rating: "again" },
      ],
      reviewStates: states,
      now,
    });
    expect(s.total).toBe(3);
    expect(s.goodCount).toBe(2);
    expect(s.hardCount).toBe(0);
    expect(s.againCount).toBe(1);
    expect(s.successRate).toBe(67); // 2/3 = 66.66 → 반올림 67
  });

  it("성공률 100%", () => {
    const s = calculateReviewCompletionSummary({
      results: [{ savedWordId: "a", rating: "good" }],
      reviewStates: { a: st("a", followingLocalMidnight + 1000) },
      now,
    });
    expect(s.successRate).toBe(100);
  });

  it("againCount는 rating again 수와 일치", () => {
    const s = calculateReviewCompletionSummary({
      results: [
        { savedWordId: "a", rating: "again" },
        { savedWordId: "b", rating: "again" },
        { savedWordId: "c", rating: "hard" },
      ],
      reviewStates: { a: st("a", now), b: st("b", now), c: st("c", nextLocalMidnight) },
      now,
    });
    expect(s.againCount).toBe(2);
  });

  it("오늘 다시 복습/내일/그 이후 일정 분류", () => {
    const s = calculateReviewCompletionSummary({
      results: [
        { savedWordId: "today", rating: "again" },
        { savedWordId: "tomorrow", rating: "hard" },
        { savedWordId: "later", rating: "good" },
      ],
      reviewStates: {
        today: st("today", now),                       // nextReviewAt = now → 오늘 다시 복습
        tomorrow: st("tomorrow", nextLocalMidnight),   // 정확히 다음 로컬 자정 → 내일 복습
        later: st("later", followingLocalMidnight),    // 정확히 그다음 로컬 자정 → 그 이후
      },
      now,
    });
    expect(s.dueAgainCount).toBe(1);
    expect(s.dueTomorrowCount).toBe(1);
    expect(s.dueLaterCount).toBe(1);
  });

  it("자정 직전: 다음 자정 - 1ms는 오늘 다시 복습", () => {
    const s = calculateReviewCompletionSummary({
      results: [{ savedWordId: "a", rating: "good" }],
      reviewStates: { a: st("a", nextLocalMidnight - 1) },
      now,
    });
    expect(s.dueAgainCount).toBe(1);
    expect(s.dueTomorrowCount).toBe(0);
    expect(s.dueLaterCount).toBe(0);
  });

  it("정확히 자정: 다음 자정은 내일 복습", () => {
    const s = calculateReviewCompletionSummary({
      results: [{ savedWordId: "a", rating: "good" }],
      reviewStates: { a: st("a", nextLocalMidnight) },
      now,
    });
    expect(s.dueAgainCount).toBe(0);
    expect(s.dueTomorrowCount).toBe(1);
    expect(s.dueLaterCount).toBe(0);
  });

  it("자정 직후: 다음 자정 + 1ms도 내일 복습", () => {
    const s = calculateReviewCompletionSummary({
      results: [{ savedWordId: "a", rating: "good" }],
      reviewStates: { a: st("a", nextLocalMidnight + 1) },
      now,
    });
    expect(s.dueAgainCount).toBe(0);
    expect(s.dueTomorrowCount).toBe(1);
    expect(s.dueLaterCount).toBe(0);
  });

  it("그다음 자정: 그 이후 복습으로 분류", () => {
    const s = calculateReviewCompletionSummary({
      results: [{ savedWordId: "a", rating: "good" }],
      reviewStates: { a: st("a", followingLocalMidnight) },
      now,
    });
    expect(s.dueAgainCount).toBe(0);
    expect(s.dueTomorrowCount).toBe(0);
    expect(s.dueLaterCount).toBe(1);
  });

  it("원본 results/reviewStates mutate 안 함", () => {
    const states = { a: st("a", now) };
    const results = [{ savedWordId: "a", rating: "again" } as const];
    const statesBefore = JSON.stringify(states);
    const resultsBefore = JSON.stringify(results);
    calculateReviewCompletionSummary({ results, reviewStates: states, now });
    expect(JSON.stringify(states)).toBe(statesBefore);
    expect(JSON.stringify(results)).toBe(resultsBefore);
  });

  it("세션에 없는 savedWordId의 reviewState는 일정에 포함되지 않음", () => {
    const s = calculateReviewCompletionSummary({
      results: [{ savedWordId: "a", rating: "good" }],
      reviewStates: {
        a: st("a", followingLocalMidnight + 1000),
        b: st("b", now), // 세션에 없음 → 무시
      },
      now,
    });
    expect(s.total).toBe(1);
    expect(s.dueAgainCount).toBe(0);
    expect(s.dueLaterCount).toBe(1);
  });
});