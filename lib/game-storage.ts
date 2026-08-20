import type { GameDurationSeconds, SpeedGameResult, SpeedGameStore } from "@/types/game";

const STORAGE_KEY = "chagok.speedGame.v1";
const STORE_VERSION = 1;
export const MAX_RECENT_RESULTS = 20;

export function getGameStorage(): Storage | null {
  try {
    const g = globalThis as Record<string, unknown>;
    const storage = g.localStorage;
    if (storage && typeof (storage as Storage).getItem === "function") {
      return storage as Storage;
    }
    return null;
  } catch {
    return null;
  }
}

export function createGameResultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isGameDuration(value: unknown): value is GameDurationSeconds {
  return value === 30 || value === 60 || value === 120;
}

function isSpeedGameResult(value: unknown): value is SpeedGameResult {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<SpeedGameResult>;
  return (
    typeof r.id === "string" && r.id.length > 0 &&
    isFiniteNumber(r.playedAt) &&
    isGameDuration(r.durationSeconds) &&
    isFiniteNumber(r.wpm) &&
    isFiniteNumber(r.accuracy) &&
    isFiniteNumber(r.score) &&
    isFiniteNumber(r.maxCombo) &&
    isFiniteNumber(r.totalTypedCharacters) &&
    isFiniteNumber(r.correctCharacters) &&
    isFiniteNumber(r.incorrectCharacters) &&
    isFiniteNumber(r.completedPrompts)
  );
}

export function createEmptySpeedGameStore(): SpeedGameStore {
  return {
    version: STORE_VERSION,
    personalBests: { "30": null, "60": null, "120": null },
    recentResults: [],
  };
}

function readRawStore(): SpeedGameStore | null {
  const storage = getGameStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SpeedGameStore>;
    if (parsed.version !== STORE_VERSION) return null;

    const personalBests: SpeedGameStore["personalBests"] = { "30": null, "60": null, "120": null };
    for (const duration of [30, 60, 120] as const) {
      const value = parsed.personalBests?.[duration];
      if (isSpeedGameResult(value)) personalBests[duration] = value;
    }

    const recentResults = Array.isArray(parsed.recentResults)
      ? parsed.recentResults.filter(isSpeedGameResult)
      : [];

    return { version: STORE_VERSION, personalBests, recentResults };
  } catch {
    return null;
  }
}

export function readSpeedGameStore(): SpeedGameStore {
  return readRawStore() ?? createEmptySpeedGameStore();
}

export function writeSpeedGameStore(store: SpeedGameStore): boolean {
  const storage = getGameStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

/**
 * 두 결과를 비교해 더 나은 결과를 반환한다.
 * 우선순위: score > wpm > accuracy > playedAt(최신).
 */
export function compareGameResults(a: SpeedGameResult | null, b: SpeedGameResult | null): SpeedGameResult | null {
  if (!a) return b;
  if (!b) return a;
  if (a.score !== b.score) return a.score > b.score ? a : b;
  if (a.wpm !== b.wpm) return a.wpm > b.wpm ? a : b;
  if (a.accuracy !== b.accuracy) return a.accuracy > b.accuracy ? a : b;
  return a.playedAt >= b.playedAt ? a : b;
}

/**
 * incoming이 existing보다 더 나은 기록인지 판정한다.
 * - existing이 null이면 (첫 기록) true
 * - 그 외에는 compareGameResults 기준으로 incoming이 더 우수하면 true
 */
export function isNewPersonalBest(
  existing: SpeedGameResult | null,
  incoming: SpeedGameResult,
): boolean {
  if (!existing) return true;
  return compareGameResults(existing, incoming) === incoming;
}

export function saveGameResult(store: SpeedGameStore, result: SpeedGameResult): SpeedGameStore {
  const next: SpeedGameStore = {
    version: STORE_VERSION,
    personalBests: {
      "30": store.personalBests["30"],
      "60": store.personalBests["60"],
      "120": store.personalBests["120"],
    },
    // 같은 id는 중복 저장하지 않는다
    recentResults: [result, ...store.recentResults.filter((r) => r.id !== result.id)].slice(0, MAX_RECENT_RESULTS),
  };
  next.personalBests[result.durationSeconds] = compareGameResults(
    store.personalBests[result.durationSeconds],
    result,
  );
  return next;
}
