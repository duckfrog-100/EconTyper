import type { SavedWord, SavedWordStore, LegacySavedWord } from "@/types/vocabulary";

const SESSION_PREFIX = "chagok.sessionWords.";
const SAVED_WORDS_KEY = "chagok.savedWords.v2";
const LEGACY_SAVED_WORDS_KEY = "chagok.savedWords";
const STORE_VERSION = 2;

// ---------- ID 생성 ----------

/**
 * crypto.randomUUID()를 사용하되, 없는 환경에서는 fallback UUID 생성.
 */
export function createSavedWordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: 브라우저/Node가 randomUUID 미지원 시
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

// ---------- 정규화 ----------

/**
 * 단어를 정규화한다. (trim, lowercase, 연속 공백 collapse)
 */
export function normalizeSavedWord(word: string): string {
  return word
    .trim()
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ");
}

/**
 * 기존 코드 호환용 함수: 단일 단어 정규화 (문장부호 제거 포함).
 * "Inflation," → "inflation", "'Growth'" → "growth"
 */
export function normalizeWord(word: string): string {
  return word
    .trim()
    .toLocaleLowerCase("en")
    .replace(/^[^a-z'-]+|[^a-z'-]+$/g, "")
    .replace(/^['-]+|['-]+$/g, "");
}

// ---------- 타입 검증 ----------

function isSavedWordV2(value: unknown): value is SavedWord {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<SavedWord>;
  return (
    typeof v.id === "string" && v.id.length > 0 &&
    typeof v.word === "string" && v.word.length > 0 &&
    typeof v.normalizedWord === "string" && v.normalizedWord.length > 0 &&
    typeof v.meaning === "string" &&
    typeof v.savedAt === "number" && Number.isFinite(v.savedAt) &&
    typeof v.updatedAt === "number" && Number.isFinite(v.updatedAt)
  );
}

function isLegacySavedWord(value: unknown): value is LegacySavedWord {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LegacySavedWord>;
  return (
    typeof v.word === "string" && v.word.trim().length > 0 &&
    typeof v.meaning === "string" &&
    typeof v.addedAt === "number" && Number.isFinite(v.addedAt)
  );
}

// ---------- v1 → v2 마이그레이션 ----------

export function migrateLegacyWord(legacy: LegacySavedWord): SavedWord {
  const now = Date.now();
  const savedAt = Number.isFinite(legacy.addedAt) ? legacy.addedAt : now;
  return {
    id: createSavedWordId(),
    word: legacy.word,
    normalizedWord: normalizeSavedWord(legacy.word),
    meaning: legacy.meaning,
    phonetic: legacy.phonetic,
    partOfSpeech: legacy.partOfSpeech,
    exampleSentence: legacy.exampleSentence,
    sourceTitle: legacy.sourceTitle,
    savedAt,
    updatedAt: savedAt,
  };
}

export function migrateLegacyWords(legacyWords: unknown[]): SavedWord[] {
  const result: SavedWord[] = [];
  const seen = new Set<string>();

  for (const raw of legacyWords) {
    if (!isLegacySavedWord(raw)) continue;
    const migrated = migrateLegacyWord(raw);
    if (seen.has(migrated.normalizedWord)) continue; // 중복 방지
    seen.add(migrated.normalizedWord);
    result.push(migrated);
  }
  return result;
}

// ---------- 저장소 접근 ----------

function getStorage(kind: "localStorage" | "sessionStorage"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[kind];
  } catch {
    return null;
  }
}

function readStore(): SavedWordStore | null {
  const storage = getStorage("localStorage");
  if (!storage) return null;

  // 1. 유효한 v2 확인
  try {
    const raw = storage.getItem(SAVED_WORDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedWordStore>;
      if (parsed.version === STORE_VERSION && Array.isArray(parsed.items)) {
        const validItems = parsed.items.filter(isSavedWordV2);
        return { version: STORE_VERSION, items: validItems };
      }
    }
  } catch {
    // v2 JSON 깨짐 — 레거시로 계속
  }

  // 2. 레거시 v1 배열 확인 + 마이그레이션
  try {
    const legacyRaw = storage.getItem(LEGACY_SAVED_WORDS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as unknown;
      if (Array.isArray(parsed)) {
        const migrated = migrateLegacyWords(parsed);

        // 3. v2 저장 성공 시에만 레거시 키 삭제
        const writeOk = writeStore({ version: STORE_VERSION, items: migrated });
        if (writeOk) {
          try { storage.removeItem(LEGACY_SAVED_WORDS_KEY); } catch { /* 유지해도 무방 */ }
        }
        return { version: STORE_VERSION, items: migrated };
      }
    }
  } catch {
    // 레거시도 깨짐
  }

  return null;
}

// v2 저장에 성공하면 true, 실패하면 false 반환
function writeStore(store: SavedWordStore): boolean {
  const storage = getStorage("localStorage");
  if (!storage) return false;
  try {
    storage.setItem(SAVED_WORDS_KEY, JSON.stringify(store));
    return true;
  } catch {
    // localStorage full 또는 접근 불가 — UI 상태는 유지
    return false;
  }
}

// ---------- CRUD ----------

export function readSavedWords(): SavedWord[] {
  const store = readStore();
  return store?.items ?? [];
}

export function writeSavedWords(items: SavedWord[]): boolean {
  return writeStore({ version: STORE_VERSION, items });
}

export function upsertWord(words: SavedWord[], incoming: SavedWord): SavedWord[] {
  const normalized = normalizeSavedWord(incoming.normalizedWord || incoming.word);
  if (!normalized || !incoming.meaning.trim()) return words;

  const now = Date.now();
  const existingIndex = words.findIndex((w) => normalizeSavedWord(w.normalizedWord) === normalized);

  if (existingIndex === -1) {
    // 새 단어: id, savedAt, updatedAt 생성
    return [
      ...words,
      {
        ...incoming,
        id: incoming.id || createSavedWordId(),
        word: incoming.word || normalized,
        normalizedWord: normalized,
        meaning: incoming.meaning.trim(),
        savedAt: now,
        updatedAt: now,
      },
    ];
  }

  // 기존 단어: id, savedAt 유지, updatedAt만 갱신, snapshot 갱신
  return words.map((w, index) => {
    if (index !== existingIndex) return w;
    return {
      ...w,
      ...incoming,
      id: w.id,
      word: incoming.word || w.word,
      normalizedWord: normalized,
      meaning: incoming.meaning.trim(),
      savedAt: w.savedAt,
      updatedAt: now,
    };
  });
}

/**
 * 저장된 snapshot의 meaning을 id 기준으로 수정한다.
 *
 * 정책:
 * - id가 일치하는 항목만 수정
 * - meaning은 trim
 * - 빈 문자열은 저장하지 않음 (원본 배열 반환)
 * - id 유지, normalizedWord 유지, savedAt 유지
 * - updatedAt만 now로 갱신
 * - 다른 snapshot 필드 유지
 * - 대상 id가 없으면 원본과 동일한 내용 반환
 * - 원본 배열 mutate 금지
 */
export function updateSavedWordMeaning(
  words: SavedWord[],
  id: string,
  meaning: string,
  now = Date.now(),
): SavedWord[] {
  const trimmed = meaning.trim();
  if (!trimmed) return words;

  let found = false;
  const next = words.map((w) => {
    if (w.id !== id) return w;
    if (w.meaning === trimmed) return w;
    found = true;
    return {
      ...w,
      meaning: trimmed,
      updatedAt: now,
    };
  });

  // 의미가 동일하면 불필요한 갱신 없이 원본 배열 반환
  if (!found) return words;
  return next;
}

export function deleteSavedWord(words: SavedWord[], id: string): SavedWord[] {
  return words.filter((w) => w.id !== id);
}

export function deleteSavedWordByNormalized(words: SavedWord[], normalizedWord: string): SavedWord[] {
  const normalized = normalizeSavedWord(normalizedWord);
  return words.filter((w) => normalizeSavedWord(w.normalizedWord) !== normalized);
}

// ---------- Session 단어 (v1 구조 유지, SavedWord v2로 통일) ----------

function readSessionStorage(storage: Storage | null, sessionId: string): SavedWord[] {
  if (!storage || !sessionId) return [];
  try {
    const raw = storage.getItem(`${SESSION_PREFIX}${sessionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedWordV2);
  } catch {
    return [];
  }
}

function writeSessionStorage(storage: Storage | null, sessionId: string, words: SavedWord[]): void {
  if (!storage || !sessionId) return;
  try {
    storage.setItem(`${SESSION_PREFIX}${sessionId}`, JSON.stringify(words));
  } catch {
    // 세션 저장 실패 — 무시
  }
}

/**
 * 특정 학습 세션(sessionId)에서 저장한 SavedWord만 필터링하여 반환한다.
 * 원본 배열을 변경하지 않는다.
 */
export function getSavedWordsForSession(words: readonly SavedWord[], sessionId: string): SavedWord[] {
  if (!sessionId) return [];
  return words.filter((word) => word.practiceSessionId === sessionId);
}

export function readSessionWords(sessionId: string): SavedWord[] {
  return readSessionStorage(getStorage("sessionStorage"), sessionId);
}

export function writeSessionWords(sessionId: string, words: SavedWord[]): void {
  writeSessionStorage(getStorage("sessionStorage"), sessionId, words);
}

// ---------- CSV ----------

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("CSV 따옴표 형식이 올바르지 않습니다.");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

export function toVocabularyCsv(words: SavedWord[]): string {
  const headers: Array<keyof SavedWord> = [
    "word",
    "meaning",
    "phonetic",
    "partOfSpeech",
    "exampleSentence",
    "sourceTitle",
    "sourceUrl",
    "dictionarySource",
    "candidateKey",
    "savedAt",
    "updatedAt",
  ];
  const lines = words.map((word) =>
    headers
      .map((header) => {
        const value = String(word[header] ?? "");
        // CSV Formula Injection 방어: = + - @ 시작 셀
        const protectedValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
        return escapeCsvCell(protectedValue);
      })
      .join(","),
  );
  return [headers.join(","), ...lines].join("\r\n");
}

export function parseVocabularyCsv(csv: string): SavedWord[] {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  const wordIndex = headers.indexOf("word");
  const meaningIndex = headers.indexOf("meaning");
  if (wordIndex === -1 || meaningIndex === -1) {
    throw new Error("word와 meaning 열이 필요합니다.");
  }

  const indexOf = (name: string) => headers.indexOf(name);
  return rows.slice(1).reduce<SavedWord[]>((words, row, rowIndex) => {
    const normalized = normalizeSavedWord(row[wordIndex] ?? "");
    const meaning = (row[meaningIndex] ?? "").trim();
    if (!normalized || !meaning) return words;

    const savedAtRaw = row[indexOf("savedAt")] ?? "";
    const parsedSavedAt = Number(savedAtRaw);
    const now = Date.now();
    const savedAt = Number.isFinite(parsedSavedAt) && parsedSavedAt > 0 ? parsedSavedAt : now + rowIndex;

    const imported: SavedWord = {
      id: createSavedWordId(),
      word: row[wordIndex] ?? "",
      normalizedWord: normalized,
      meaning,
      phonetic: row[indexOf("phonetic")] || undefined,
      partOfSpeech: row[indexOf("partOfSpeech")] || undefined,
      exampleSentence: row[indexOf("exampleSentence")] || undefined,
      sourceTitle: row[indexOf("sourceTitle")] || undefined,
      sourceUrl: row[indexOf("sourceUrl")] || undefined,
      dictionarySource: row[indexOf("dictionarySource")] || undefined,
      candidateKey: row[indexOf("candidateKey")] || undefined,
      savedAt,
      updatedAt: Number.isFinite(Number(row[indexOf("updatedAt")])) && Number(row[indexOf("updatedAt")]) > 0
        ? Number(row[indexOf("updatedAt")])
        : savedAt,
    };

    return upsertWord(words, imported);
  }, []);
}