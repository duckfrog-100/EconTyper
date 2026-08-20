import { glossary } from "@/lib/dictionary/glossary";
import { normalizeSentence, tokenizeSentence } from "@/lib/dictionary/context";
import type { DictionaryCandidate, DictionaryLookupContext } from "@/types/dictionary";

function domainToSource(domain: "economy" | "finance" | "business" | "news"): DictionaryCandidate["source"] {
  switch (domain) {
    case "economy": return "glossary-economy";
    case "finance": return "glossary-finance";
    case "business": return "glossary-business";
    case "news": return "glossary-news";
  }
}

function findMatchRange(hoverWord: string, sentence: string, term: string): { start: number; end: number } | undefined {
  const hoverLower = hoverWord.toLocaleLowerCase("en").replace(/[^a-z'-]/g, "");
  if (!hoverLower || !sentence) return undefined;

  const sentenceText = sentence;
  const sentenceLower = sentenceText.toLocaleLowerCase("en");
  const termLower = term.toLocaleLowerCase("en");

  const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${escaped}(?=\\s|$|[.,!?;:'"])`, "i");
  const match = pattern.exec(sentenceLower);
  if (!match) return undefined;

  const start = match.index + match[1].length;
  const end = start + termLower.length;

  const termTokens = termLower.split(/\s+/);
  const hoverInTerm = termTokens.some((t) => t === hoverLower);
  if (!hoverInTerm) return undefined;

  return { start, end };
}

/**
 * 문장 내에서 hover된 word와 일치하는 용어집 후보를 찾는다.
 */
export function findGlossaryMatches(word: string, sentence?: string): DictionaryCandidate[] {
  const normalizedWord = word.toLocaleLowerCase("en").replace(/[^a-z'-]/g, "");
  if (!normalizedWord) return [];

  const normalizedSentence = normalizeSentence(sentence);
  const sentenceText = normalizedSentence.toLocaleLowerCase("en");

  const matches: DictionaryCandidate[] = [];

  for (const entry of glossary) {
    const normalizedTerm = entry.term.toLocaleLowerCase("en");
    const allTerms = [normalizedTerm, ...(entry.aliases ?? []).map((a) => a.toLocaleLowerCase("en"))];

    for (const term of allTerms) {
      const termTokens = term.split(/\s+/);
      const termHasWord = termTokens.some((t) => t === normalizedWord);
      if (!termHasWord) continue;

      if (termTokens.length === 1) {
        if (term !== normalizedWord) continue;
        matches.push(createGlossaryCandidate(entry, term, normalizedSentence));
        break;
      }

      if (!sentence) continue;

      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const boundaryPattern = new RegExp(`(^|\\s)${escapedTerm}(?=\\s|$|[.,!?;:'"])`, "i");
      if (!boundaryPattern.test(sentenceText)) continue;

      matches.push(createGlossaryCandidate(entry, term, normalizedSentence));
      break;
    }
  }

  return matches.sort((a, b) => {
    const aLen = (a.matchedTerm ?? "").split(/\s+/).length;
    const bLen = (b.matchedTerm ?? "").split(/\s+/).length;
    return bLen - aLen;
  });
}

function createGlossaryCandidate(
  entry: typeof glossary[number],
  matchedTerm: string,
  sentence: string,
): DictionaryCandidate {
  const word = matchedTerm.split(/\s+/)[0];
  const matchedRange = findMatchRange(word, sentence, matchedTerm);

  return {
    meaning: entry.koreanMeaning,
    partOfSpeech: entry.partOfSpeech,
    source: domainToSource(entry.domain),
    language: "ko",
    matchedTerm,
    matchedRange,
    confidence: 0.95,
    rankingScore: 0, // ranking 엔진이 계산
  };
}

/**
 * 모든 후보를 통합한다. (중복 제거 + 기본 정렬)
 * rankingScore는 ranking 엔진에서 계산되므로 여기서는 설정하지 않는다.
 */
export function mergeCandidates(
  glossaryCandidates: DictionaryCandidate[],
  dictionaryCandidates: DictionaryCandidate[],
): DictionaryCandidate[] {
  const seenKo = new Set<string>();
  const seenEn = new Set<string>();

  const result: DictionaryCandidate[] = [];

  const addIfUnique = (candidate: DictionaryCandidate): boolean => {
    const key = candidate.language === "ko"
      ? candidate.meaning.toLocaleLowerCase("ko-KR")
      : candidate.meaning.toLocaleLowerCase("en").slice(0, 100);

    const seen = candidate.language === "ko" ? seenKo : seenEn;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  for (const c of glossaryCandidates) {
    const termLen = (c.matchedTerm ?? "").split(/\s+/).length;
    if (termLen > 1 && addIfUnique(c)) result.push(c);
  }

  for (const c of glossaryCandidates) {
    const termLen = (c.matchedTerm ?? "").split(/\s+/).length;
    if (termLen <= 1 && addIfUnique(c)) result.push(c);
  }

  for (const c of dictionaryCandidates) {
    if (addIfUnique(c)) result.push(c);
  }

  return result;
}