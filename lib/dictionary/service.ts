import { findGlossaryMatches, mergeCandidates } from "@/lib/dictionary/matcher";
import { normalizeDictionaryCandidates } from "@/lib/dictionary/normalize";
import { rankCandidates } from "@/lib/dictionary/ranking";
import type { DictionaryLookupContext, DictionaryResponse } from "@/types/dictionary";

const TIMEOUT_MS = 7_000;

type RawEntry = {
  word?: string;
  phonetic?: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string; example?: string }>;
  }>;
};

/**
 * DictionaryLookupContext를 받아 사전 조회를 수행하고,
 * glossary + dictionary 후보를 병합 + ranking하여 DictionaryResponse를 반환한다.
 */
export async function lookupDictionary(context: DictionaryLookupContext): Promise<DictionaryResponse> {
  const { word } = context;

  // 1. glossary 후보 (문맥 기반)
  const glossaryCandidates = findGlossaryMatches(word, context.sentence);

  // 2. 외부 사전 API 호출
  let dictionaryCandidates: ReturnType<typeof normalizeDictionaryCandidates> = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const dictionaryResponse = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal, cache: "no-store" },
    );

    if (dictionaryResponse.ok) {
      const entries = (await dictionaryResponse.json()) as RawEntry[];
      dictionaryCandidates = normalizeDictionaryCandidates(entries as any);
    }
  } finally {
    clearTimeout(timer);
  }

  // 3. 병합
  const merged = mergeCandidates(glossaryCandidates, dictionaryCandidates);

  // 4. ranking (score 계산 + 정렬)
  const ranked = rankCandidates(merged, context);

  return {
    word,
    candidates: ranked,
  };
}