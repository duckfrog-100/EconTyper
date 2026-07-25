import type { SavedWord } from "@/types/vocabulary";

const SESSION_PREFIX = "chagok.sessionWords.";
const SAVED_WORDS_KEY = "chagok.savedWords";

function isSavedWord(value: unknown): value is SavedWord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SavedWord>;
  return (
    typeof candidate.word === "string" &&
    typeof candidate.meaning === "string" &&
    typeof candidate.addedAt === "number" &&
    Number.isFinite(candidate.addedAt)
  );
}

function readStorage(storage: Storage | undefined, key: string): SavedWord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedWord).reduce<SavedWord[]>((words, item) => upsertWord(words, item), []);
  } catch {
    return [];
  }
}

function writeStorage(storage: Storage | undefined, key: string, words: SavedWord[]): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(words));
  } catch {
    // Storage may be unavailable or full. Keep the current UI state intact.
  }
}

function browserSessionStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.sessionStorage;
}

function browserLocalStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

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

export function normalizeWord(word: string): string {
  return word
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/^[^a-z'-]+|[^a-z'-]+$/g, "")
    .replace(/^['-]+|['-]+$/g, "");
}

export function upsertWord(words: SavedWord[], incoming: SavedWord): SavedWord[] {
  const normalized = normalizeWord(incoming.word);
  if (!normalized || !incoming.meaning.trim()) return words;

  const next: SavedWord = {
    ...incoming,
    word: normalized,
    meaning: incoming.meaning.trim(),
  };
  const existingIndex = words.findIndex((word) => normalizeWord(word.word) === normalized);

  if (existingIndex === -1) return [...words, next];
  return words.map((word, index) => (index === existingIndex ? { ...word, ...next } : word));
}

export function readSessionWords(sessionId: string): SavedWord[] {
  if (!sessionId) return [];
  return readStorage(browserSessionStorage(), `${SESSION_PREFIX}${sessionId}`);
}

export function writeSessionWords(sessionId: string, words: SavedWord[]): void {
  if (!sessionId) return;
  writeStorage(browserSessionStorage(), `${SESSION_PREFIX}${sessionId}`, words);
}

export function readSavedWords(): SavedWord[] {
  return readStorage(browserLocalStorage(), SAVED_WORDS_KEY);
}

export function writeSavedWords(words: SavedWord[]): void {
  writeStorage(browserLocalStorage(), SAVED_WORDS_KEY, words);
}

export function toVocabularyCsv(words: SavedWord[]): string {
  const headers: Array<keyof SavedWord> = [
    "word",
    "meaning",
    "phonetic",
    "partOfSpeech",
    "exampleSentence",
    "sourceTitle",
    "addedAt",
  ];
  const lines = words.map((word) =>
    headers
      .map((header) => escapeCsvCell(String(word[header] ?? "")))
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
    const normalized = normalizeWord(row[wordIndex] ?? "");
    const meaning = (row[meaningIndex] ?? "").trim();
    if (!normalized || !meaning) return words;

    const addedAtRaw = row[indexOf("addedAt")] ?? "";
    const parsedAddedAt = Number(addedAtRaw);
    const imported: SavedWord = {
      word: normalized,
      meaning,
      phonetic: row[indexOf("phonetic")] || undefined,
      partOfSpeech: row[indexOf("partOfSpeech")] || undefined,
      exampleSentence: row[indexOf("exampleSentence")] || undefined,
      sourceTitle: row[indexOf("sourceTitle")] || undefined,
      addedAt: Number.isFinite(parsedAddedAt) && parsedAddedAt > 0 ? parsedAddedAt : Date.now() + rowIndex,
    };
    return upsertWord(words, imported);
  }, []);
}
