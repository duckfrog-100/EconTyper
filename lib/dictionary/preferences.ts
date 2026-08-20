import type {
  CandidatePreference,
  CustomMeaningPreference,
  DictionaryPreferenceStoreV2,
  LegacyDictionaryPreference,
  UserDictionaryPreference,
} from "@/types/dictionary-preference";

const V2_STORAGE_KEY = "chagok.dictionary.preferences.v2";
const LEGACY_STORAGE_KEY = "chagok.dictionary.preferences.v1";
const STORE_VERSION = 2;

export function normalizePreferenceWord(word: string): string {
  return word
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
}

function getStorage(): Storage | null {
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

// ---------- validation ----------

function isValidDateString(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isCandidatePreference(value: unknown): value is CandidatePreference {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CandidatePreference>;
  return (
    v.kind === "candidate" &&
    typeof v.normalizedWord === "string" && v.normalizedWord.length > 0 &&
    typeof v.candidateKey === "string" && v.candidateKey.length > 0 &&
    isValidDateString(v.selectedAt)
  );
}

function isCustomMeaningPreference(value: unknown): value is CustomMeaningPreference {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CustomMeaningPreference>;
  return (
    v.kind === "custom" &&
    typeof v.normalizedWord === "string" && v.normalizedWord.length > 0 &&
    typeof v.customMeaning === "string" && v.customMeaning.trim().length > 0 &&
    isValidDateString(v.selectedAt)
  );
}

function isUserPreference(value: unknown): value is UserDictionaryPreference {
  return isCandidatePreference(value) || isCustomMeaningPreference(value);
}

function isLegacyPreference(value: unknown): value is LegacyDictionaryPreference {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LegacyDictionaryPreference>;
  return (
    typeof v.normalizedWord === "string" && v.normalizedWord.length > 0 &&
    typeof v.candidateKey === "string" && v.candidateKey.length > 0 &&
    typeof v.selectedAt === "string"
  );
}

// ---------- store read/write ----------

function writeStore(store: DictionaryPreferenceStoreV2): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(V2_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

function readV2Store(): DictionaryPreferenceStoreV2 | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(V2_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DictionaryPreferenceStoreV2>;
    if (parsed.version !== STORE_VERSION || !parsed.items || typeof parsed.items !== "object") {
      return null;
    }
    const items: Record<string, UserDictionaryPreference> = {};
    for (const [key, value] of Object.entries(parsed.items)) {
      if (isUserPreference(value) && value.normalizedWord === key) {
        items[key] = value;
      }
    }
    return { version: STORE_VERSION, items };
  } catch {
    return null;
  }
}

/**
 * v1 → v2 마이그레이션.
 * v1 entry를 kind: "candidate"로 변환.
 * selectedAt이 잘못된 경우 현재 ISO 시각으로 복구.
 */
function migrateLegacyEntry(legacy: LegacyDictionaryPreference): CandidatePreference {
  return {
    kind: "candidate",
    normalizedWord: legacy.normalizedWord,
    candidateKey: legacy.candidateKey,
    selectedAt: isValidDateString(legacy.selectedAt) ? legacy.selectedAt : new Date().toISOString(),
  };
}

function readLegacyAndMigrate(): DictionaryPreferenceStoreV2 | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; items?: Record<string, unknown> };
    if (!parsed.items || typeof parsed.items !== "object") return null;

    const items: Record<string, UserDictionaryPreference> = {};
    for (const [key, value] of Object.entries(parsed.items)) {
      if (isLegacyPreference(value) && value.normalizedWord === key) {
        items[key] = migrateLegacyEntry(value);
      }
    }

    // v2 저장 성공 시에만 v1 삭제
    const store: DictionaryPreferenceStoreV2 = { version: STORE_VERSION, items };
    const writeOk = writeStore(store);
    if (writeOk) {
      try { storage.removeItem(LEGACY_STORAGE_KEY); } catch { /* 유지해도 무방 */ }
    }
    return store;
  } catch {
    return null;
  }
}

function readStore(): DictionaryPreferenceStoreV2 {
  // 1. 유효한 v2 우선
  const v2 = readV2Store();
  if (v2) return v2;

  // 2. v1 마이그레이션
  const migrated = readLegacyAndMigrate();
  if (migrated) return migrated;

  return { version: STORE_VERSION, items: {} };
}

// ---------- public API ----------

export function loadDictionaryPreferences(): Record<string, UserDictionaryPreference> {
  return readStore().items;
}

export function getDictionaryPreference(word: string): UserDictionaryPreference | undefined {
  const normalized = normalizePreferenceWord(word);
  if (!normalized) return undefined;
  const items = loadDictionaryPreferences();
  return items[normalized];
}

export function saveDictionaryPreference(
  word: string,
  preference: UserDictionaryPreference,
): UserDictionaryPreference | null {
  const normalized = normalizePreferenceWord(word);
  const store = readStore();
  store.items[normalized] = preference;
  const ok = writeStore(store);
  return ok ? preference : null;
}

export function saveCandidatePreference(
  word: string,
  candidateKey: string,
): CandidatePreference | null {
  const preference: CandidatePreference = {
    kind: "candidate",
    normalizedWord: normalizePreferenceWord(word),
    candidateKey,
    selectedAt: new Date().toISOString(),
  };
  const saved = saveDictionaryPreference(preference.normalizedWord, preference);
  return saved?.kind === "candidate" ? saved : null;
}

export function saveCustomMeaningPreference(
  word: string,
  customMeaning: string,
): CustomMeaningPreference | null {
  const preference: CustomMeaningPreference = {
    kind: "custom",
    normalizedWord: normalizePreferenceWord(word),
    customMeaning,
    selectedAt: new Date().toISOString(),
  };
  const saved = saveDictionaryPreference(preference.normalizedWord, preference);
  return saved?.kind === "custom" ? saved : null;
}

export function restoreDictionaryPreference(
  word: string,
  previousPreference: UserDictionaryPreference | null,
): boolean {
  if (!previousPreference) {
    return removeDictionaryPreference(word);
  }
  const saved = saveDictionaryPreference(word, previousPreference);
  return saved !== null;
}

export function removeDictionaryPreference(word: string): boolean {
  const normalized = normalizePreferenceWord(word);
  if (!normalized) return false;
  const store = readStore();
  delete store.items[normalized];
  return writeStore(store);
}

export function clearDictionaryPreferences(): void {
  writeStore({ version: STORE_VERSION, items: {} });
}