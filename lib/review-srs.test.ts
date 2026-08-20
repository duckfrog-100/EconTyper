import { describe, expect, it } from "vitest";
import { createInitialReviewState, ensureReviewStatesForSavedWords, calculateNextReviewState, getNextLocalMidnight } from "./review-srs";
import type { SavedWordReviewState } from "@/types/review";
import type { SavedWord } from "@/types/vocabulary";

const NOW = new Date("2026-08-02T15:30:00").getTime();

function w(overrides?: Partial<SavedWord>): SavedWord {
  return { id: "id1", word: "Bond", normalizedWord: "bond", meaning: "채권", savedAt: NOW, updatedAt: NOW, ...overrides } as SavedWord;
}
function st(overrides?: Partial<SavedWordReviewState>): SavedWordReviewState {
  return { savedWordId: "id1", normalizedWord: "bond", reviewCount: 0, correctCount: 0, incorrectCount: 0, intervalDays: 1, nextReviewAt: 200, createdAt: 100, updatedAt: 100, ...overrides } as SavedWordReviewState;
}

describe("createInitialReviewState", () => {
  it("SavedWord 연결, count 0, interval 1", () => {
    const r = createInitialReviewState(w(), NOW);
    expect(r.savedWordId).toBe("id1");
    expect(r.normalizedWord).toBe("bond");
    expect(r.reviewCount).toBe(0);
    expect(r.correctCount).toBe(0);
    expect(r.incorrectCount).toBe(0);
    expect(r.intervalDays).toBe(1);
    expect(r.createdAt).toBe(NOW);
    expect(r.updatedAt).toBe(NOW);
    expect(r.lastReviewedAt).toBeUndefined();
  });
  it("nextReviewAt 다음 날 00:00", () => {
    const r = createInitialReviewState(w(), NOW);
    const expected = new Date("2026-08-03T00:00:00").getTime();
    expect(r.nextReviewAt).toBe(getNextLocalMidnight(NOW));
    expect(r.nextReviewAt).toBe(expected);
  });
});

describe("ensureReviewStatesForSavedWords", () => {
  it("누락 state만 생성, 기존 유지", () => {
    const existing = st();
    const rows = [w(), w({ id: "id2", word: "Yield", normalizedWord: "yield" })];
    const result = ensureReviewStatesForSavedWords(rows, { id1: existing }, NOW);
    expect(result.id1).toBe(existing);
    expect(result.id2).toBeDefined();
  });
  it("원본 mutate 안 함", () => {
    const orig = { id1: st() };
    ensureReviewStatesForSavedWords([w()], orig, NOW);
    expect(orig.id1).toBeDefined();
  });
});

describe("calculateNextReviewState", () => {
  it("again", () => {
    const r = calculateNextReviewState(st(), "again", NOW);
    expect(r.intervalDays).toBe(0);
    expect(r.nextReviewAt).toBe(NOW);
    expect(r.incorrectCount).toBe(1);
    expect(r.reviewCount).toBe(1);
  });
  it("hard", () => {
    const r = calculateNextReviewState(st(), "hard", NOW);
    expect(r.intervalDays).toBe(1);
    expect(r.nextReviewAt).toBe(getNextLocalMidnight(NOW));
    expect(r.incorrectCount).toBe(1);
  });
  it("good 1→3", () => {
    expect(calculateNextReviewState(st(), "good", NOW).intervalDays).toBe(3);
  });
  it("good 3→7", () => {
    expect(calculateNextReviewState(st({ intervalDays: 3 }), "good", NOW).intervalDays).toBe(7);
  });
  it("good 7→14", () => {
    expect(calculateNextReviewState(st({ intervalDays: 7 }), "good", NOW).intervalDays).toBe(14);
  });
  it("good 14→30", () => {
    expect(calculateNextReviewState(st({ intervalDays: 14 }), "good", NOW).intervalDays).toBe(30);
  });
  it("good 30→30", () => {
    expect(calculateNextReviewState(st({ intervalDays: 30 }), "good", NOW).intervalDays).toBe(30);
  });
  it("easy 1→7", () => {
    expect(calculateNextReviewState(st(), "easy", NOW).intervalDays).toBe(7);
  });
  it("easy 7→21", () => {
    expect(calculateNextReviewState(st({ intervalDays: 7 }), "easy", NOW).intervalDays).toBe(21);
  });
  it("easy 21→60", () => {
    expect(calculateNextReviewState(st({ intervalDays: 21 }), "easy", NOW).intervalDays).toBe(60);
  });
  it("savedWordId/createdAt 유지, 원본 mutate 안 함", () => {
    const orig = st();
    const r = calculateNextReviewState(orig, "good", NOW);
    expect(r.savedWordId).toBe("id1");
    expect(r.createdAt).toBe(100);
    expect(orig.intervalDays).toBe(1);
  });
});