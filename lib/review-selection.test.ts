import { describe, expect, it } from "vitest";
import { selectDueReviewWords, removeOrphanReviewStates } from "./review-selection";
import type { SavedWordReviewState } from "@/types/review";
import type { SavedWord } from "@/types/vocabulary";

const NOW = 1000;
function w(id: string, normalizedWord: string): SavedWord {
  return { id, word: normalizedWord, normalizedWord, meaning: "뜻", savedAt: 100, updatedAt: 100 } as SavedWord;
}
function s(id: string, normalizedWord: string, overrides?: Partial<SavedWordReviewState>): SavedWordReviewState {
  return { savedWordId: id, normalizedWord, reviewCount: 1, correctCount: 0, incorrectCount: 0, intervalDays: 1, nextReviewAt: 100, createdAt: 100, updatedAt: 100, ...overrides };
}

describe("selectDueReviewWords", () => {
  it("due만 선택", () => {
    const rows = [w("a", "bond"), w("b", "yield")];
    const states = { a: s("a", "bond"), b: s("b", "yield", { nextReviewAt: 2000 }) };
    const result = selectDueReviewWords(rows, states, NOW, 10);
    expect(result).toHaveLength(1);
    expect(result[0].word.id).toBe("a");
  });
  it("orphan 제외", () => {
    const result = selectDueReviewWords([w("a", "bond")], { x: s("x", "orphan") }, NOW, 10);
    expect(result).toHaveLength(0);
  });
  it("limit 적용", () => {
    const rows = [w("a", "bond"), w("b", "yield")];
    const states = { a: s("a", "bond"), b: s("b", "yield") };
    expect(selectDueReviewWords(rows, states, NOW, 1)).toHaveLength(1);
    expect(selectDueReviewWords(rows, states, NOW, 0)).toHaveLength(0);
  });
  it("정렬: nextReviewAt 오름차순 → incorrectCount 내림차순 → normalizedWord", () => {
    const rows = [w("a", "bond"), w("b", "yield"), w("c", "apple")];
    const states = {
      a: s("a", "bond", { nextReviewAt: 300, incorrectCount: 0 }),
      b: s("b", "yield", { nextReviewAt: 100, incorrectCount: 5 }),
      c: s("c", "apple", { nextReviewAt: 100, incorrectCount: 2 }),
    };
    const result = selectDueReviewWords(rows, states, NOW, 10);
    expect(result.map((r) => r.word.id)).toEqual(["b", "c", "a"]); // b(yield 100, 5) → c(apple 100, 2) → a(bond 300)
  });
  it("원본 mutate 안 함", () => {
    const rows = [w("a", "bond")];
    const states = { a: s("a", "bond") };
    selectDueReviewWords(rows, states, NOW, 10);
    expect(rows).toHaveLength(1);
    expect(states.a).toBeDefined();
  });
});

describe("removeOrphanReviewStates", () => {
  it("orphan 제거, 유효 유지, 원본 mutate 안 함", () => {
    const orig = { a: s("a", "bond"), x: s("x", "orphan") };
    const result = removeOrphanReviewStates([w("a", "bond")], orig);
    expect(result.a).toBeDefined();
    expect(result.x).toBeUndefined();
    expect(orig.x).toBeDefined();
  });

  it("SavedWord 일부 삭제 후 해당 id의 ReviewState만 orphan 처리", () => {
    const rows = [w("a", "bond")]; // b는 삭제됨
    const states = { a: s("a", "bond"), b: s("b", "yield") };
    const result = removeOrphanReviewStates(rows, states);
    expect(result.a).toBeDefined();
    expect(result.b).toBeUndefined();
  });

  it("모든 SavedWord 삭제 시 모든 ReviewState 제거", () => {
    const states = { a: s("a", "bond"), b: s("b", "yield") };
    const result = removeOrphanReviewStates([], states);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("orphan 없으면 원본과 동일 내용 (새 객체)", () => {
    const states = { a: s("a", "bond") };
    const result = removeOrphanReviewStates([w("a", "bond")], states);
    expect(result.a).toBeDefined();
    expect(result).not.toBe(states);
  });
});