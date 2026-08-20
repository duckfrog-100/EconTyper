import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  normalizePreferenceWord,
  saveCandidatePreference,
  saveCustomMeaningPreference,
  getDictionaryPreference,
  removeDictionaryPreference,
  loadDictionaryPreferences,
  restoreDictionaryPreference,
} from "./preferences";

// Mock localStorage for node test environment
class MockStorage {
  private store = new Map<string, string>();
  failOnSet = false;

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failOnSet) {
      throw new Error("Mock storage full");
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.failOnSet = false;
  }

  get length(): number {
    return this.store.size;
  }

  key(_index: number): string | null {
    return null;
  }
}

let mockStorage: MockStorage;

beforeEach(() => {
  mockStorage = new MockStorage();
  vi.stubGlobal("localStorage", mockStorage);
  vi.stubGlobal("window", { localStorage: mockStorage });
});

describe("normalizePreferenceWord", () => {
  it("대소문자 정규화", () => {
    expect(normalizePreferenceWord("Interest")).toBe("interest");
    expect(normalizePreferenceWord("INTEREST")).toBe("interest");
  });

  it("앞뒤 공백 제거", () => {
    expect(normalizePreferenceWord("  interest  ")).toBe("interest");
  });

  it("연속 공백 collapse", () => {
    expect(normalizePreferenceWord("interest  rate")).toBe("interest rate");
  });
});

describe("saveCandidatePreference", () => {
  it("저장 성공 시 CandidatePreference 반환", () => {
    const pref = saveCandidatePreference("interest", "key-1");
    expect(pref).not.toBeNull();
    expect(pref!.kind).toBe("candidate");
    expect(pref!.normalizedWord).toBe("interest");
    expect(pref!.candidateKey).toBe("key-1");
    expect(pref!.selectedAt).toBeTruthy();
  });

  it("custom Preference를 candidate로 교체", () => {
    saveCustomMeaningPreference("interest", "내가 쓴 뜻");
    saveCandidatePreference("interest", "key-candidate");
    const pref = getDictionaryPreference("interest");
    expect(pref?.kind).toBe("candidate");
    if (pref?.kind === "candidate") {
      expect(pref.candidateKey).toBe("key-candidate");
    }
  });

  it("localStorage setItem 실패 시 null 반환", () => {
    mockStorage.failOnSet = true;
    const pref = saveCandidatePreference("interest", "key-1");
    expect(pref).toBeNull();
  });
});

describe("saveCustomMeaningPreference", () => {
  it("저장 성공 시 CustomMeaningPreference 반환", () => {
    const pref = saveCustomMeaningPreference("interest", "내가 입력한 뜻");
    expect(pref).not.toBeNull();
    expect(pref!.kind).toBe("custom");
    expect(pref!.customMeaning).toBe("내가 입력한 뜻");
  });

  it("candidate Preference를 custom으로 교체", () => {
    saveCandidatePreference("interest", "key-candidate");
    saveCustomMeaningPreference("interest", "내가 입력한 뜻");
    const pref = getDictionaryPreference("interest");
    expect(pref?.kind).toBe("custom");
    if (pref?.kind === "custom") {
      expect(pref.customMeaning).toBe("내가 입력한 뜻");
    }
  });

  it("localStorage setItem 실패 시 null 반환", () => {
    mockStorage.failOnSet = true;
    const pref = saveCustomMeaningPreference("interest", "내가 입력한 뜻");
    expect(pref).toBeNull();
  });

  it("실패 시 기존 저장 데이터가 손상되지 않음", () => {
    saveCandidatePreference("bond", "bond-key");
    mockStorage.failOnSet = true;
    saveCustomMeaningPreference("interest", "내가 입력한 뜻");
    const pref = getDictionaryPreference("bond");
    expect(pref?.kind).toBe("candidate");
    if (pref?.kind === "candidate") {
      expect(pref.candidateKey).toBe("bond-key");
    }
    expect(getDictionaryPreference("interest")).toBeUndefined();
  });
});

describe("preference 조회", () => {
  it("대소문자가 다른 word에서도 동일 preference 반환", () => {
    saveCandidatePreference("interest", "test-key");
    expect(getDictionaryPreference("Interest")?.kind).toBe("candidate");
    expect(getDictionaryPreference("INTEREST")?.kind).toBe("candidate");
  });

  it("없는 word는 undefined", () => {
    expect(getDictionaryPreference("nonexistent")).toBeUndefined();
  });
});

describe("restoreDictionaryPreference", () => {
  it("기존 preference 복원", () => {
    saveCustomMeaningPreference("interest", "새 뜻");
    const previous = getDictionaryPreference("interest")!;
    // 새 preference로 교체 후 이전 것 복원
    saveCandidatePreference("interest", "new-key");
    const ok = restoreDictionaryPreference("interest", previous);
    expect(ok).toBe(true);
    const restored = getDictionaryPreference("interest");
    expect(restored).toEqual(previous);
  });

  it("previous가 null이면 preference 삭제", () => {
    saveCandidatePreference("interest", "key-1");
    const ok = restoreDictionaryPreference("interest", null);
    expect(ok).toBe(true);
    expect(getDictionaryPreference("interest")).toBeUndefined();
  });
});

describe("preference 삭제", () => {
  it("해당 단어만 삭제", () => {
    saveCandidatePreference("interest", "key1");
    saveCandidatePreference("bond", "key2");
    removeDictionaryPreference("interest");
    expect(getDictionaryPreference("interest")).toBeUndefined();
    expect(getDictionaryPreference("bond")).toBeDefined();
  });
});

describe("loadDictionaryPreferences", () => {
  it("저장한 preference를 불러온다", () => {
    saveCandidatePreference("interest", "key1");
    saveCustomMeaningPreference("bond", "사용자 뜻");
    const all = loadDictionaryPreferences();
    expect(all["interest"].kind).toBe("candidate");
    expect(all["bond"].kind).toBe("custom");
  });
});

describe("preference 검증", () => {
  it("깨진 JSON은 빈 저장소 fallback", () => {
    localStorage.setItem("chagok.dictionary.preferences.v2", "{broken json");
    const all = loadDictionaryPreferences();
    expect(Object.keys(all).length).toBe(0);
  });

  it("잘못된 version은 빈 저장소 fallback", () => {
    localStorage.setItem("chagok.dictionary.preferences.v2", JSON.stringify({ version: 1, items: {} }));
    const all = loadDictionaryPreferences();
    expect(Object.keys(all).length).toBe(0);
  });

  it("일부 entry만 잘못된 데이터여도 유효한 entry는 유지", () => {
    const store = {
      version: 2,
      items: {
        bond: {
          kind: "candidate",
          normalizedWord: "bond",
          candidateKey: "key-bond",
          selectedAt: "2026-01-01T00:00:00.000Z",
        },
        interest: {
          kind: "custom",
          normalizedWord: "interest",
          customMeaning: "",
          selectedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    localStorage.setItem("chagok.dictionary.preferences.v2", JSON.stringify(store));
    const all = loadDictionaryPreferences();
    expect(all["bond"]).toBeDefined();
    expect(all["bond"].kind).toBe("candidate");
    expect(all["interest"]).toBeUndefined(); // customMeaning 빈 값 → 제외
  });
});

describe("v1 → v2 마이그레이션", () => {
  it("정상 v1 candidate Preference를 v2로 변환", () => {
    const v1 = {
      version: 1,
      items: {
        bond: {
          normalizedWord: "bond",
          candidateKey: "key-bond",
          selectedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    localStorage.setItem("chagok.dictionary.preferences.v1", JSON.stringify(v1));
    const all = loadDictionaryPreferences();
    expect(all["bond"].kind).toBe("candidate");
    if (all["bond"].kind === "candidate") {
      expect(all["bond"].candidateKey).toBe("key-bond");
    }
    // v2가 생성되어야 함
    expect(localStorage.getItem("chagok.dictionary.preferences.v2")).toContain("bond");
    // v1 삭제
    expect(localStorage.getItem("chagok.dictionary.preferences.v1")).toBeNull();
  });

  it("v2 저장 성공 후 반복 읽기에서 값 유지", () => {
    const v1 = {
      version: 1,
      items: {
        bond: {
          normalizedWord: "bond",
          candidateKey: "key-bond",
          selectedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    localStorage.setItem("chagok.dictionary.preferences.v1", JSON.stringify(v1));
    const first = loadDictionaryPreferences();
    const second = loadDictionaryPreferences();
    expect(first["bond"]).toEqual(second["bond"]);
  });
});