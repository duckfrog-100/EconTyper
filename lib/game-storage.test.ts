import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  compareGameResults,
  createEmptySpeedGameStore,
  isNewPersonalBest,
  readSpeedGameStore,
  saveGameResult,
  writeSpeedGameStore,
} from "./game-storage";
import type { SpeedGameResult, SpeedGameStore } from "@/types/game";

class MockStorage {
  private store = new Map<string, string>();
  failOnSet = false;
  failOnGet = false;
  getItem(_key: string): string | null { if (this.failOnGet) throw new Error("get fail"); return this.store.get(_key) ?? null; }
  setItem(key: string, value: string): void { if (this.failOnSet) throw new Error("set fail"); this.store.set(key, value); }
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

function result(id: string, duration: 30 | 60 | 120, overrides?: Partial<SpeedGameResult>): SpeedGameResult {
  return {
    id, playedAt: 100, durationSeconds: duration,
    wpm: 50, accuracy: 90, score: 4000, maxCombo: 8,
    totalTypedCharacters: 100, correctCharacters: 90, incorrectCharacters: 10,
    completedPrompts: 3,
    ...overrides,
  };
}

const STORAGE_KEY = "chagok.speedGame.v1";

describe("game-storage", () => {
  it("정상 읽기/쓰기", () => {
    const store = createEmptySpeedGameStore();
    expect(writeSpeedGameStore(store)).toBe(true);
    const read = readSpeedGameStore();
    expect(read.version).toBe(1);
    expect(read.recentResults).toEqual([]);
  });

  it("깨진 JSON → 빈 저장소", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    const read = readSpeedGameStore();
    expect(read.recentResults).toEqual([]);
    expect(read.personalBests["60"]).toBeNull();
  });

  it("잘못된 version → 빈 저장소", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, personalBests: {}, recentResults: [] }));
    const read = readSpeedGameStore();
    expect(read.recentResults).toEqual([]);
    expect(read.version).toBe(1);
  });

  it("일부 잘못된 result 제외", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      personalBests: { "30": result("good-30", 30), "60": null, "120": null },
      recentResults: [result("good", 60), { id: "bad", durationSeconds: 45 }],
    }));
    const read = readSpeedGameStore();
    expect(read.personalBests["30"]?.id).toBe("good-30");
    expect(read.recentResults).toHaveLength(1);
  });

  it("recent 최대 20개, 최신이 앞", () => {
    let store = createEmptySpeedGameStore();
    for (let index = 0; index < 25; index += 1) {
      store = saveGameResult(store, result(`id-${index}`, 60, { playedAt: index }));
    }
    expect(store.recentResults).toHaveLength(20);
    expect(store.recentResults[0].id).toBe("id-24");
    expect(store.recentResults[19].id).toBe("id-5");
  });

  it("duration별 최고 기록", () => {
    let store = createEmptySpeedGameStore();
    store = saveGameResult(store, result("r30-1", 30, { score: 1000 }));
    store = saveGameResult(store, result("r30-2", 30, { score: 2000 }));
    store = saveGameResult(store, result("r60-1", 60, { score: 5000 }));
    expect(store.personalBests["30"]?.id).toBe("r30-2");
    expect(store.personalBests["60"]?.id).toBe("r60-1");
    expect(store.personalBests["120"]).toBeNull();
  });

  it("동점 tie-break: score → wpm → accuracy → playedAt", () => {
    const base = { wpm: 50, accuracy: 90, score: 4000, maxCombo: 8, totalTypedCharacters: 100, correctCharacters: 90, incorrectCharacters: 10, completedPrompts: 3 };

    // score 동점 → wpm 높은 쪽
    const wr = result("wpm-higher", 60, { ...base, playedAt: 200, wpm: 60 });
    const wr2 = result("wpm-lower", 60, { ...base, playedAt: 300, wpm: 40 });
    expect(compareGameResults(wr2, wr)?.id).toBe("wpm-higher");

    // score/wpm 동점 → accuracy 높은 쪽
    const ar = result("acc-higher", 60, { ...base, playedAt: 200, accuracy: 95 });
    const ar2 = result("acc-lower", 60, { ...base, playedAt: 300, accuracy: 85 });
    expect(compareGameResults(ar2, ar)?.id).toBe("acc-higher");

    // 전부 동점 → 최신(playedAt 큰 쪽)
    const tr = result("newer", 60, { ...base, playedAt: 300 });
    const tr2 = result("older", 60, { ...base, playedAt: 100 });
    expect(compareGameResults(tr2, tr)?.id).toBe("newer");

    // null 처리
    expect(compareGameResults(null, tr)?.id).toBe("newer");
    expect(compareGameResults(tr, null)?.id).toBe("newer");
  });

  it("저장 실패 → false, 예외 없음", () => {
    mock.failOnSet = true;
    expect(writeSpeedGameStore(createEmptySpeedGameStore())).toBe(false);
  });

  it("중복 result id 처리: 같은 id는 recentResults에 중복 저장하지 않음", () => {
    const store = createEmptySpeedGameStore();
    const r = result("dup", 60);
    const after1 = saveGameResult(store, r);
    const after2 = saveGameResult(after1, r);
    expect(after2.recentResults).toHaveLength(1);
    expect(after2.recentResults[0].id).toBe("dup");
    expect(after2.personalBests["60"]?.id).toBe("dup");
  });

  it("서로 다른 id는 모두 저장", () => {
    const store = createEmptySpeedGameStore();
    const r1 = result("a", 60);
    const r2 = result("b", 60);
    const after = saveGameResult(saveGameResult(store, r1), r2);
    expect(after.recentResults).toHaveLength(2);
  });

  it("원본 mutate 안 함", () => {
    const store = createEmptySpeedGameStore();
    const r = result("new", 60);
    const before = JSON.stringify(store);
    saveGameResult(store, r);
    expect(JSON.stringify(store)).toBe(before);
  });

  it("null 저장소 구조일 때 read → 빈 저장소", () => {
    const read = readSpeedGameStore();
    expect(read).toEqual(createEmptySpeedGameStore());
  });
});

describe("isNewPersonalBest", () => {
  const base = { wpm: 50, accuracy: 90, score: 4000, maxCombo: 8, totalTypedCharacters: 100, correctCharacters: 90, incorrectCharacters: 10, completedPrompts: 3 };

  it("기존 기록 없음 → 새 최고 기록", () => {
    expect(isNewPersonalBest(null, result("first", 60, base))).toBe(true);
  });

  it("score가 높음 → 새 최고 기록", () => {
    const existing = result("low", 60, { ...base, score: 3000 });
    const incoming = result("high", 60, { ...base, score: 5000 });
    expect(isNewPersonalBest(existing, incoming)).toBe(true);
  });

  it("score 동점 + WPM 높음 → 새 최고 기록", () => {
    const existing = result("low-wpm", 60, { ...base, wpm: 40 });
    const incoming = result("high-wpm", 60, { ...base, wpm: 60 });
    expect(isNewPersonalBest(existing, incoming)).toBe(true);
  });

  it("score/WPM 동점 + accuracy 높음 → 새 최고 기록", () => {
    const existing = result("low-acc", 60, { ...base, accuracy: 85 });
    const incoming = result("high-acc", 60, { ...base, accuracy: 95 });
    expect(isNewPersonalBest(existing, incoming)).toBe(true);
  });

  it("모두 동점 + 최신 playedAt → 새 최고 기록", () => {
    const existing = result("older", 60, { ...base, playedAt: 100 });
    const incoming = result("newer", 60, { ...base, playedAt: 200 });
    expect(isNewPersonalBest(existing, incoming)).toBe(true);
  });

  it("모두 동점 + 더 오래된 playedAt → 최고 기록 아님", () => {
    const existing = result("newer", 60, { ...base, playedAt: 200 });
    const incoming = result("older", 60, { ...base, playedAt: 100 });
    expect(isNewPersonalBest(existing, incoming)).toBe(false);
  });

  it("낮은 기록 → 최고 기록 아님", () => {
    const existing = result("best", 60, { ...base, score: 9000 });
    const incoming = result("worse", 60, { ...base, score: 1000 });
    expect(isNewPersonalBest(existing, incoming)).toBe(false);
  });

  it("duration별 기록 독립: 저장소는 duration별 personalBests를 분리", () => {
    const store = createEmptySpeedGameStore();
    const best30 = result("best30", 30, { ...base, score: 9000 });
    const new60 = result("new60", 60, { ...base, score: 100 });
    const after = saveGameResult(saveGameResult(store, best30), new60);
    // 30초 최고가 60초 최고에 영향을 주지 않고 60초는 첫 기록으로 저장
    expect(after.personalBests["30"]?.id).toBe("best30");
    expect(after.personalBests["60"]?.id).toBe("new60");
  });
});