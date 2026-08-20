import type { UserDictionaryPreference } from "@/types/dictionary-preference";
import type { SavedWord } from "@/types/vocabulary";

export type VocabularySortOption =
  | "saved-newest"
  | "saved-oldest"
  | "word-asc"
  | "word-desc";

export type VocabularyPartOfSpeechFilter =
  | "all"
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "other";

/**
 * 저장 단어 목록을 검색한다.
 * word, normalizedWord, meaning, partOfSpeech, sourceTitle, dictionarySource 대상.
 */
export function filterSavedWords(words: SavedWord[], query: string): SavedWord[] {
  const normalizedQuery = query.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) return words;

  return words.filter((word) =>
    [
      word.word ?? "",
      word.normalizedWord ?? "",
      word.meaning ?? "",
      word.partOfSpeech ?? "",
      word.sourceTitle ?? "",
      word.dictionarySource ?? "",
    ]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(normalizedQuery),
  );
}

/**
 * 저장 단어를 정렬한다.
 * @param words 원본 배열 (mutate하지 않음)
 * @param option 정렬 옵션
 */
/**
 * 저장된 단어의 snapshot candidateKey가 현재 Preference와 일치하는지 판단.
 *
 * 정책:
 * - preference가 없으면 false
 * - word.candidateKey가 없으면 false
 * - preference.candidateKey === word.candidateKey이면 true
 * - normalizedWord가 다르면 false (다른 단어의 preference)
 */
export function isSavedWordDefaultPreference(
  word: SavedWord,
  preference?: UserDictionaryPreference,
): boolean {
  if (!preference) return false;
  if (!word.candidateKey) return false;
  if (preference.normalizedWord !== word.normalizedWord) return false;
  if (preference.kind !== "candidate") return false;
  return preference.candidateKey === word.candidateKey;
}

export function sortSavedWords(words: SavedWord[], option: VocabularySortOption): SavedWord[] {
  const sorted = [...words];

  switch (option) {
    case "saved-newest":
      return sorted.sort((a, b) => b.savedAt - a.savedAt);
    case "saved-oldest":
      return sorted.sort((a, b) => a.savedAt - b.savedAt);
    case "word-asc":
      return sorted.sort((a, b) =>
        (a.normalizedWord || a.word).localeCompare(b.normalizedWord || b.word, "en"),
      );
    case "word-desc":
      return sorted.sort((a, b) =>
        (b.normalizedWord || b.word).localeCompare(a.normalizedWord || a.word, "en"),
      );
  }
}

/**
 * 품사 필터. undefined/빈 값은 "other"로 처리.
 */
export function filterSavedWordsByPartOfSpeech(
  words: SavedWord[],
  filter: VocabularyPartOfSpeechFilter,
): SavedWord[] {
  if (filter === "all") return words;

  return words.filter((word) => {
    const pos = (word.partOfSpeech ?? "").trim().toLocaleLowerCase("en");
    if (!pos) return filter === "other";
    return pos === filter;
  });
}

/**
 * dictionarySource → 사용자 표시용 라벨 변환.
 */
export function getDictionarySourceLabel(source?: string): string | undefined {
  if (!source) return undefined;
  switch (source) {
    case "glossary-economy": return "경제 용어";
    case "glossary-finance": return "금융 용어";
    case "glossary-business": return "비즈니스 용어";
    case "glossary-news": return "시사 용어";
    case "dictionary": return "일반 사전";
    case "ai": return "AI 추천";
    case "user": return "내 선택";
    default: return undefined;
  }
}

export type MeaningValidationResult = {
  trimmedValue: string;
  error?: string;
};

/**
 * 뜻 입력값을 검증한다.
 * - trim 후 빈 문자열 금지
 * - 최대 300자 제한
 */
export function validateSavedWordMeaning(value: string): MeaningValidationResult {
  const trimmed = value.trim();
  if (!trimmed) return { trimmedValue: "", error: "뜻을 입력해 주세요." };
  if (trimmed.length > 300) return { trimmedValue: trimmed, error: "뜻은 300자 이하로 입력해 주세요." };
  return { trimmedValue: trimmed };
}

/**
 * epoch milliseconds → 한국어 날짜 문자열 ("2026. 8. 2.")
 * 잘못된 timestamp는 빈 문자열.
 */
export function formatSavedWordDate(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(date);
  } catch {
    // Intl 실패 시 수동 포맷 fallback
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  }
}