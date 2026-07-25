import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addPracticeHistoryEntry,
  PRACTICE_HISTORY_KEY,
  readPracticeHistory,
} from "./history-storage";
import type { PracticeHistoryEntry } from "@/types/history";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function createEntry(overrides: Partial<PracticeHistoryEntry> = {}): PracticeHistoryEntry {
  return {
    id: "history-1",
    articleId: "article-1",
    title: "Markets move",
    sourceName: "Reuters",
    completedAt: "2026-07-26T10:00:00.000Z",
    accuracy: 98,
    typedCharacters: 1200,
    wrongSentenceCount: 2,
    sessionWordCount: 8,
    savedWordCount: 3,
    sentenceCount: 14,
    ...overrides,
  };
}

describe("practice history persistence", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: new MemoryStorage() },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("inserts newest first and caps at 100 entries", () => {
    for (let index = 0; index < 101; index += 1) {
      addPracticeHistoryEntry(createEntry({
        id: `history-${index}`,
        completedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      }));
    }

    const entries = readPracticeHistory();
    expect(entries).toHaveLength(100);
    expect(entries[0].id).toBe("history-100");
    expect(entries.at(-1)?.id).toBe("history-1");
  });

  it("replaces an existing id without adding a duplicate", () => {
    addPracticeHistoryEntry(createEntry());
    addPracticeHistoryEntry(createEntry({ title: "Updated title", accuracy: 120 }));

    const entries = readPracticeHistory();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ title: "Updated title", accuracy: 100 });
  });

  it("returns an empty array for malformed JSON", () => {
    window.localStorage.setItem(PRACTICE_HISTORY_KEY, "{not-json");
    expect(readPracticeHistory()).toEqual([]);
  });

  it("filters malformed entries while keeping valid entries", () => {
    window.localStorage.setItem(PRACTICE_HISTORY_KEY, JSON.stringify([
      createEntry({ id: "valid" }),
      { id: "missing-fields" },
      createEntry({ id: "bad-date", completedAt: "not-a-date" }),
      createEntry({ id: "normalized", typedCharacters: -4.8, sourceName: "  " }),
    ]));

    expect(readPracticeHistory()).toEqual([
      createEntry({ id: "valid" }),
      {
        ...createEntry({ id: "normalized", typedCharacters: 0 }),
        sourceName: undefined,
      },
    ].map(({ sourceName, ...entry }) => sourceName ? { ...entry, sourceName } : entry));
  });
});
