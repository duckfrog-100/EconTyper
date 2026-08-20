import type { DictionaryCandidate } from "@/types/dictionary";

function normalize(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

/**
 * 후보를 식별하는 고유 키를 생성한다.
 *
 * - source, language, matchedTerm, partOfSpeech, normalized meaning을 조합
 * - 같은 후보에는 항상 같은 key
 * - 서로 다른 뜻은 다른 key
 * - 빈 필드도 자리 구분자를 유지하여 충돌 방지
 */
export function getCandidateKey(candidate: DictionaryCandidate): string {
  const source = normalize(candidate.source);
  const language = normalize(candidate.language);
  const matchedTerm = normalize(candidate.matchedTerm ?? "");
  const pos = normalize(candidate.partOfSpeech ?? "");
  const meaning = normalize(candidate.meaning);

  return [source, language, matchedTerm, pos, meaning].join("::");
}