import type { DictionaryCandidate } from "@/types/dictionary";

type RawDictionaryEntry = {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
};

function isMeaningfulText(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 300) return false;
  return true;
}

export function normalizeDictionaryCandidates(entries: RawDictionaryEntry[]): DictionaryCandidate[] {
  const seen = new Set<string>();

  return entries
    .flatMap((entry) => entry.meanings ?? [])
    .flatMap((meaning) => {
      const partOfSpeech = meaning.partOfSpeech;
      return (meaning.definitions ?? [])
        .map((def) => ({
          meaning: def.definition?.trim() ?? "",
          partOfSpeech,
          example: def.example?.trim(),
        }))
        .filter((item) => isMeaningfulText(item.meaning));
    })
    .filter((item) => {
      const key = item.meaning.toLocaleLowerCase("en").slice(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item): DictionaryCandidate => ({
      meaning: item.meaning,
      partOfSpeech: item.partOfSpeech,
      example: item.example,
      source: "dictionary",
      language: "en",
      confidence: 0.5,
      rankingScore: 0, // ranking 엔진이 계산
    }));
}