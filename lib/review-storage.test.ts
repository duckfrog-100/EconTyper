import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  readReviewStates, writeReviewStates, upsertReviewState, deleteReviewState, normalizeReviewState,
} from "./review-storage";
import type { SavedWordReviewState } from "@/types/review";

class MockStorage {
  private store = new Map<string, string>();
  failOnSet = false;
  failOnGet = false;
  getItem(_key: string): string | null { if (this.failOnGet) throw new Error("get fail"); return this.store.get(_key) ?? null; }
  setItem(key: string, v: string): void { if (this.failOnSet) throw new Error("set fail"); this.store.set(key, v); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); this.failOnSet = false; this.failOnGet = false; }
  get length(): number { return this.store.size; }
  key(_i: number): string | null { return null; }
}

let mock: MockStorage;
beforeEach(() => {
  mock = new MockStorage();
  vi.stubGlobal("localStorage", mock);
  vi.stubGlobal("window", { localStorage: mock });
});

function s(id: string, overrides?: Partial<SavedWordReviewState>): SavedWordReviewState {
  return { savedWordId: id, normalizedWord: "bond", reviewCount: 0, correctCount: 0, incorrectCount: 0, intervalDays: 1, nextReviewAt: 200, createdAt: 100, updatedAt: 100, ...overrides };
}

describe("review-storage", () => {
  it("normalizeReviewState: 유효 entry", () => {
    const r = normalizeReviewState(s("id1"));
    expect(r).toBeDefined();
    expect(r!.savedWordId).toBe("id1");
  });
  it("normalizeReviewState: lastReviewedAt 문자열 → undefined", () => {
    const bad = { ...s("id1"), lastReviewedAt: "abc" };
    const r = normalizeReviewState(bad);
    expect(r!.lastReviewedAt).toBeUndefined();
  });
  it("normalizeReviewState: 필수 number 누락 → undefined", () => {
    expect(normalizeReviewState({ ...s("id1"), reviewCount: "x" })).toBeUndefined();
  });
  it("정상 읽기", () => {
    localStorage.setItem("chagok.reviewStates.v1", JSON.stringify({ version: 1, items: { id1: s("id1") } }));
    expect(readReviewStates().id1).toBeDefined();
  });
  it("version !== 1 → 빈 객체", () => {
    localStorage.setItem("chagok.reviewStates.v1", JSON.stringify({ version: 2, items: {} }));
    expect(readReviewStates()).toEqual({});
  });
  it("깨진 JSON → 빈 객체", () => {
    localStorage.setItem("chagok.reviewStates.v1", "{broken");
    expect(readReviewStates()).toEqual({});
  });
  it("잘못된 entry만 제외", () => {
    localStorage.setItem("chagok.reviewStates.v1", JSON.stringify({ version: 1, items: { id1: s("id1"), bad: { savedWordId: "" } } }));
    const r = readReviewStates();
    expect(r.id1).toBeDefined();
    expect(r.bad).toBeUndefined();
  });
  it("get 실패 → 빈 객체", () => {
    mock.failOnGet = true;
    expect(readReviewStates()).toEqual({});
  });
  it("write 성공 → true", () => {
    expect(writeReviewStates({ id1: s("id1") })).toBe(true);
  });
  it("write 실패 → false", () => {
    mock.failOnSet = true;
    expect(writeReviewStates({})).toBe(false);
  });
  it("upsert 신규/기존", () => {
    const afterNew = upsertReviewState({}, s("id1"));
    expect(afterNew.id1).toBeDefined();
    const afterOld = upsertReviewState(afterNew, s("id1", { intervalDays: 7 }));
    expect(afterOld.id1.intervalDays).toBe(7);
  });
  it("delete + 원본 mutate 안 함", () => {
    const orig = { id1: s("id1"), id2: s("id2") };
    const after = deleteReviewState(orig, "id1");
    expect(after.id1).toBeUndefined();
    expect(orig.id1).toBeDefined();
  });
});