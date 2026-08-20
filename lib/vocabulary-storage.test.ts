import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  normalizeWord,
  normalizeSavedWord,
  createSavedWordId,
  parseVocabularyCsv,
  toVocabularyCsv,
  upsertWord,
  migrateLegacyWord,
  migrateLegacyWords,
  readSavedWords,
  writeSavedWords,
  updateSavedWordMeaning,
} from "./vocabulary-storage";
import type { SavedWord, LegacySavedWord } from "@/types/vocabulary";

// Mock localStorage for node test environment
class MockStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }

  key(_index: number): string | null {
    return null;
  }
}

beforeEach(() => {
  const mock = new MockStorage();
  vi.stubGlobal("localStorage", mock);
  vi.stubGlobal("window", { localStorage: mock, sessionStorage: new MockStorage() });
});

function makeV2(overrides: Partial<SavedWord> & { word: string; meaning: string }): SavedWord {
  const base: SavedWord = {
    id: createSavedWordId(),
    word: overrides.word,
    normalizedWord: normalizeSavedWord(overrides.word),
    meaning: overrides.meaning,
    savedAt: Date.now(),
    updatedAt: Date.now(),
  };
  return { ...base, ...overrides };
}

describe("normalizeSavedWord", () => {
  it("trim", () => {
    expect(normalizeSavedWord("  interest  ")).toBe("interest");
  });

  it("lowercase", () => {
    expect(normalizeSavedWord("Interest")).toBe("interest");
    expect(normalizeSavedWord("INTEREST")).toBe("interest");
  });

  it("연속 공백 collapse", () => {
    expect(normalizeSavedWord("Interest   Rate")).toBe("interest rate");
  });

  it("빈 값 처리", () => {
    expect(normalizeSavedWord("   ")).toBe("");
  });
});

describe("normalizeWord (기존 호환)", () => {
  it("문장부호 제거", () => {
    expect(normalizeWord("Inflation,")).toBe("inflation");
    expect(normalizeWord("'Growth'")).toBe("growth");
  });
});

describe("createSavedWordId", () => {
  it("문자열 반환", () => {
    expect(typeof createSavedWordId()).toBe("string");
  });

  it("반복 호출 시 서로 다른 값", () => {
    const a = createSavedWordId();
    const b = createSavedWordId();
    expect(a).not.toBe(b);
  });
});

describe("v1 → v2 마이그레이션", () => {
  it("migrateLegacyWord: savedAt/updatedAt = legacy addedAt", () => {
    const legacy: LegacySavedWord = { word: "Bond", meaning: "채권", addedAt: 1000 };
    const migrated = migrateLegacyWord(legacy);
    expect(migrated.id).toBeTruthy();
    expect(migrated.word).toBe("Bond");
    expect(migrated.normalizedWord).toBe("bond");
    expect(migrated.meaning).toBe("채권");
    expect(migrated.savedAt).toBe(1000);
    expect(migrated.updatedAt).toBe(1000);
  });

  it("migrateLegacyWords: 잘못된 entry 제외", () => {
    const result = migrateLegacyWords([
      { word: "valid", meaning: "뜻", addedAt: 1 },
      { word: "", meaning: "빈 단어", addedAt: 2 },
      { word: "no-added", meaning: "addedAt 없음" },
      null,
      "string",
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].normalizedWord).toBe("valid");
  });

  it("migrateLegacyWords: 중복 normalizedWord 제외", () => {
    const result = migrateLegacyWords([
      { word: "Bond", meaning: "채권", addedAt: 1 },
      { word: "bond", meaning: "유대", addedAt: 2 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].meaning).toBe("채권");
  });
});

describe("v2 저장소 읽기/쓰기", () => {
  it("유효한 v2 읽기", () => {
    const items = [makeV2({ word: "Bond", meaning: "채권" })];
    localStorage.setItem("chagok.savedWords.v2", JSON.stringify({ version: 2, items }));
    const result = readSavedWords();
    expect(result).toHaveLength(1);
    expect(result[0].normalizedWord).toBe("bond");
  });

  it("version !== 2인 v2 데이터 거부", () => {
    localStorage.setItem("chagok.savedWords.v2", JSON.stringify({ version: 1, items: [{ id: "x" }] }));
    expect(readSavedWords()).toEqual([]);
  });

  it("깨진 v2 JSON + 정상 v1 → v1 마이그레이션", () => {
    localStorage.setItem("chagok.savedWords.v2", "{broken json");
    localStorage.setItem("chagok.savedWords", JSON.stringify([{ word: "Bond", meaning: "채권", addedAt: 100 }]));
    const result = readSavedWords();
    expect(result).toHaveLength(1);
    expect(result[0].normalizedWord).toBe("bond");
    expect(result[0].savedAt).toBe(100);
    // v2가 생성되어 있어야 함
    expect(localStorage.getItem("chagok.savedWords.v2")).toContain("bond");
  });

  it("v2 저장 성공 후 반복 읽기에서 ID가 유지됨", () => {
    localStorage.setItem("chagok.savedWords", JSON.stringify([{ word: "Bond", meaning: "채권", addedAt: 100 }]));
    const first = readSavedWords();
    const firstId = first[0].id;
    const second = readSavedWords();
    expect(second[0].id).toBe(firstId);
  });

  it("writeSavedWords: v2 포맷으로 저장", () => {
    const items = [makeV2({ word: "Bond", meaning: "채권" })];
    writeSavedWords(items);
    const raw = localStorage.getItem("chagok.savedWords.v2");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
    expect(parsed.items).toHaveLength(1);
  });
});

describe("upsertWord (v2)", () => {
  it("신규 단어: id, savedAt, updatedAt 생성", () => {
    const incoming = makeV2({ word: "Bond", meaning: "채권" });
    const result = upsertWord([], incoming);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBeTruthy();
    expect(result[0].savedAt).toBeTruthy();
    expect(result[0].updatedAt).toBeTruthy();
  });

  it("기존 단어: id/savedAt 유지, updatedAt 변경, snapshot 갱신", () => {
    const existing = makeV2({
      id: "fixed-id",
      word: "Bond",
      meaning: "채권",
      savedAt: 100,
      updatedAt: 100,
    });
    const incoming = makeV2({ word: "bond", meaning: "유대" });
    const result = upsertWord([existing], incoming);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fixed-id");
    expect(result[0].savedAt).toBe(100);
    expect(result[0].meaning).toBe("유대");
    expect(result[0].updatedAt).toBeGreaterThan(100);
  });

  it("normalizedWord 기준 중복", () => {
    const a = makeV2({ word: "Bond", meaning: "A" });
    const b = makeV2({ word: "BOND", meaning: "B" });
    const result = upsertWord([a], b);
    expect(result).toHaveLength(1);
    expect(result[0].meaning).toBe("B");
  });

  it("빈 meaning은 거부", () => {
    const incoming = makeV2({ word: "Bond", meaning: "   " });
    const result = upsertWord([], incoming);
    expect(result).toHaveLength(0);
  });
});

describe("updateSavedWordMeaning", () => {
  it("대상 id의 meaning 수정", () => {
    const base = makeV2({ word: "Bond", meaning: "채권", id: "id-1", savedAt: 100, updatedAt: 100 });
    const result = updateSavedWordMeaning([base], "id-1", "유대", 200);
    expect(result[0].meaning).toBe("유대");
  });

  it("id 유지, savedAt 유지, updatedAt 갱신", () => {
    const base = makeV2({ word: "Bond", meaning: "채권", id: "id-1", savedAt: 100, updatedAt: 100 });
    const result = updateSavedWordMeaning([base], "id-1", "유대", 200);
    expect(result[0].id).toBe("id-1");
    expect(result[0].savedAt).toBe(100);
    expect(result[0].updatedAt).toBe(200);
  });

  it("다른 필드 유지", () => {
    const base = makeV2({
      word: "Bond",
      meaning: "채권",
      id: "id-1",
      savedAt: 100,
      updatedAt: 100,
      exampleSentence: "The government issued bonds.",
      dictionarySource: "glossary-finance",
    });
    const result = updateSavedWordMeaning([base], "id-1", "유대", 200);
    expect(result[0].exampleSentence).toBe("The government issued bonds.");
    expect(result[0].dictionarySource).toBe("glossary-finance");
    expect(result[0].normalizedWord).toBe("bond");
  });

  it("다른 항목 유지", () => {
    const a = makeV2({ word: "Bond", meaning: "채권", id: "id-1", savedAt: 100, updatedAt: 100 });
    const b = makeV2({ word: "Yield", meaning: "수익률", id: "id-2", savedAt: 200, updatedAt: 200 });
    const result = updateSavedWordMeaning([a, b], "id-1", "유대", 300);
    expect(result).toHaveLength(2);
    expect(result[1].word).toBe("Yield");
    expect(result[1].meaning).toBe("수익률");
    expect(result[1].updatedAt).toBe(200);
  });

  it("원본 배열 mutate 안 함", () => {
    const base = makeV2({ word: "Bond", meaning: "채권", id: "id-1", savedAt: 100, updatedAt: 100 });
    updateSavedWordMeaning([base], "id-1", "유대", 200);
    expect(base.meaning).toBe("채권");
    expect(base.updatedAt).toBe(100);
  });

  it("빈 문자열 거부", () => {
    const base = makeV2({ word: "Bond", meaning: "채권", id: "id-1" });
    const result = updateSavedWordMeaning([base], "id-1", "   ");
    expect(result).toEqual([base]);
    expect(result[0].meaning).toBe("채권");
  });

  it("공백 trim", () => {
    const base = makeV2({ word: "Bond", meaning: "채권", id: "id-1", savedAt: 100, updatedAt: 100 });
    const result = updateSavedWordMeaning([base], "id-1", "  유대  ", 200);
    expect(result[0].meaning).toBe("유대");
  });

  it("대상 id 없으면 원본 배열 반환", () => {
    const base = makeV2({ word: "Bond", meaning: "채권", id: "id-1", updatedAt: 100 });
    const result = updateSavedWordMeaning([base], "nonexistent", "유대", 200);
    expect(result).toEqual([base]);
    expect(result[0].updatedAt).toBe(100);
  });

  it("기존 meaning과 같으면 불필요한 갱신 없음", () => {
    const base = makeV2({ word: "Bond", meaning: "채권", id: "id-1", updatedAt: 100 });
    const result = updateSavedWordMeaning([base], "id-1", "  채권  ", 200);
    expect(result).toEqual([base]);
    expect(result[0].updatedAt).toBe(100);
  });
});

describe("CSV", () => {
  it("round-trips csv including commas and quotes", () => {
    const item = makeV2({
      word: "Inflation",
      meaning: '물가 상승, "인플레이션"',
      exampleSentence: "Prices rose, quickly.",
    });
    const restored = parseVocabularyCsv(toVocabularyCsv([item]));
    expect(restored[0]).toMatchObject({
      word: "Inflation",
      meaning: '물가 상승, "인플레이션"',
      exampleSentence: "Prices rose, quickly.",
    });
  });

  it("rejects csv without required columns", () => {
    expect(() => parseVocabularyCsv("term,definition\nfoo,bar")).toThrow("word와 meaning 열이 필요합니다.");
  });

  it("ignores blank rows and deduplicates imported words", () => {
    const restored = parseVocabularyCsv("word,meaning\r\nGrowth,성장\r\n\r\ngrowth,경제 성장\r\n");
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ word: "growth", meaning: "경제 성장" });
  });

  it("신규 CSV 필드 포함 export", () => {
    const item = makeV2({
      word: "Bond",
      meaning: "채권",
      dictionarySource: "glossary-finance",
      candidateKey: "test-key",
    });
    const csv = toVocabularyCsv([item]);
    expect(csv).toContain("dictionarySource");
    expect(csv).toContain("glossary-finance");
    expect(csv).toContain("candidateKey");
  });

  it("기존 v1 형식 CSV import 호환", () => {
    const csv = "word,meaning,addedAt\r\nBond,채권,100\r\n";
    const restored = parseVocabularyCsv(csv);
    expect(restored).toHaveLength(1);
    expect(restored[0].normalizedWord).toBe("bond");
  });

  it("CSV Formula Injection 방어", () => {
    const csv = toVocabularyCsv([makeV2({ word: "Bond", meaning: "=SUM(1,2)" })]);
    expect(csv).toContain("'=SUM(1,2)");
  });
});