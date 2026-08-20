import { describe, expect, it } from "vitest";
import { prepareReviewSession, DEFAULT_DAILY_REVIEW_LIMIT } from "./review-session";
import { parseVocabularyCsv } from "./vocabulary-storage";
import type { SavedWordReviewState } from "@/types/review";
import type { SavedWord } from "@/types/vocabulary";

const NOW = new Date("2026-08-02T15:30:00").getTime();

function w(id: string, normalizedWord: string): SavedWord {
  return { id, word: normalizedWord, normalizedWord, meaning: "뜻", savedAt: NOW, updatedAt: NOW } as SavedWord;
}
function s(id: string, normalizedWord: string, nextReviewAt: number, overrides?: Partial<SavedWordReviewState>): SavedWordReviewState {
  return { savedWordId: id, normalizedWord, reviewCount: 1, correctCount: 0, incorrectCount: 0, intervalDays: 1, nextReviewAt, createdAt: NOW, updatedAt: NOW, ...overrides };
}

describe("prepareReviewSession", () => {
  it("누락된 ReviewState 생성 + changed=true", () => {
    const r = prepareReviewSession({ savedWords: [w("a", "bond")], reviewStates: {}, now: NOW });
    expect(r.changed).toBe(true);
    expect(r.syncedStates.a).toBeDefined();
  });

  it("orphan 제거 + changed=true", () => {
    const r = prepareReviewSession({ savedWords: [], reviewStates: { x: s("x", "orphan", 0) }, now: NOW });
    expect(r.changed).toBe(true);
    expect(r.syncedStates.x).toBeUndefined();
  });

  it("변화 없으면 changed=false", () => {
    const states = { a: s("a", "bond", 0) };
    const r = prepareReviewSession({ savedWords: [w("a", "bond")], reviewStates: states, now: NOW });
    expect(r.changed).toBe(false);
    expect(r.dueItems.length).toBe(1);
  });

  it("lazy sync: 기존 ReviewState의 id와 일정 유지 (중복 생성/ID 변경 없음)", () => {
    const existing = s("a", "bond", 12345, { intervalDays: 7, reviewCount: 5 });
    const r = prepareReviewSession({ savedWords: [w("a", "bond")], reviewStates: { a: existing }, now: NOW });
    expect(r.changed).toBe(false);
    expect(r.syncedStates.a).toBe(existing);
    expect(r.syncedStates.a.savedWordId).toBe("a");
    expect(r.syncedStates.a.intervalDays).toBe(7);
    expect(r.syncedStates.a.reviewCount).toBe(5);
    expect(r.syncedStates.a.nextReviewAt).toBe(12345);
  });

  it("오늘 저장한 단어(nextReviewAt 다음날)는 due 제외", () => {
    const tomorrowMidnight = new Date("2026-08-03T00:00:00").getTime();
    const r = prepareReviewSession({ savedWords: [w("a", "bond")], reviewStates: { a: s("a", "bond", tomorrowMidnight) }, now: NOW });
    expect(r.dueItems).toHaveLength(0);
  });

  it("기한 지난 단어는 due 포함", () => {
    const r = prepareReviewSession({ savedWords: [w("a", "bond")], reviewStates: { a: s("a", "bond", NOW - 1000) }, now: NOW });
    expect(r.dueItems).toHaveLength(1);
  });

  it("limit 적용", () => {
    const rows = [w("a", "bond"), w("b", "yield"), w("c", "apple")];
    const states = { a: s("a", "bond", 0), b: s("b", "yield", 0), c: s("c", "apple", 0) };
    const r = prepareReviewSession({ savedWords: rows, reviewStates: states, now: NOW, limit: 2 });
    expect(r.dueItems).toHaveLength(2);
    expect(DEFAULT_DAILY_REVIEW_LIMIT).toBe(20);
  });

  it("SavedWord 0개, ReviewState 0개 → due 0", () => {
    const r = prepareReviewSession({ savedWords: [], reviewStates: {}, now: NOW });
    expect(r.dueItems).toHaveLength(0);
    expect(r.changed).toBe(false);
  });

  it("CSV import된 SavedWord도 ensure로 ReviewState 생성", () => {
    const imported = parseVocabularyCsv("word,meaning\nbond,채권\n");
    expect(imported).toHaveLength(1);
    const r = prepareReviewSession({ savedWords: imported, reviewStates: {}, now: NOW });
    expect(r.changed).toBe(true);
    expect(r.syncedStates[imported[0].id]).toBeDefined();
    expect(r.syncedStates[imported[0].id].savedWordId).toBe(imported[0].id);
  });

  it("CSV import된 기존 단어의 상태는 유지 (lazy sync)", () => {
    const imported = parseVocabularyCsv("word,meaning\nbond,채권\n");
    const existing = s(imported[0].id, "bond", 999);
    const r = prepareReviewSession({ savedWords: imported, reviewStates: { [imported[0].id]: existing }, now: NOW });
    expect(r.changed).toBe(false);
    expect(r.syncedStates[imported[0].id].nextReviewAt).toBe(999);
  });

  it("원본 mutate 안 함", () => {
    const states = { a: s("a", "bond", 0) };
    prepareReviewSession({ savedWords: [w("a", "bond")], reviewStates: states, now: NOW });
    expect(states.a).toBeDefined();
  });
});