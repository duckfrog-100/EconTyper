import type { DictionaryCandidate, DictionaryLookupContext } from "@/types/dictionary";
import type { UserDictionaryPreference } from "@/types/dictionary-preference";
import { normalizeSentence } from "@/lib/dictionary/context";
import { getCandidateKey } from "@/lib/dictionary/candidate-key";

/**
 * rankingScore 계산에 사용되는 상수 (한 곳에서 관리)
 */
export const RANKING_WEIGHTS = {
  MULTI_WORD_GLOSSARY_EXACT: 100,
  SINGLE_WORD_GLOSSARY_EXACT: 85,
  GLOSSARY_ALIAS: 75,
  DICTIONARY_BASE: 40,
  TERM_LENGTH_BONUS: 3,
  CONFIDENCE_MAX_BONUS: 30,
  UNMATCHED_GLOSSARY_PENALTY: 50,
} as const;

type MatchKind = "multi-word-exact" | "single-word-exact" | "alias" | "glossary-unmatched" | "dictionary";

function determineMatchKind(candidate: DictionaryCandidate, sentenceText: string): MatchKind {
  const isGlossary = candidate.source.startsWith("glossary-");
  if (!isGlossary) return "dictionary";

  const matchedTerm = candidate.matchedTerm ?? "";
  const termTokens = matchedTerm.split(/\s+/);
  const isMultiWord = termTokens.length > 1;

  if (isMultiWord) {
    const escapedTerm = matchedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|\\s)${escapedTerm}(?=\\s|$|[.,!?;:'"])`, "i");
    if (sentenceText && pattern.test(sentenceText)) return "multi-word-exact";
    return "glossary-unmatched";
  }

  const escapedTerm = matchedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\s)${escapedTerm}(?=\\s|$|[.,!?;:'"])`, "i");
  if (sentenceText && pattern.test(sentenceText)) return "single-word-exact";

  return "glossary-unmatched";
}

export function rankCandidates(
  candidates: DictionaryCandidate[],
  context: DictionaryLookupContext,
): DictionaryCandidate[] {
  if (candidates.length === 0) return [];

  const normalizedWord = context.word.toLocaleLowerCase("en").replace(/[^a-z'-]/g, "");
  const sentenceText = normalizeSentence(context.sentence).toLocaleLowerCase("en");

  const scored = candidates
    .filter((c) => {
      if (!c.matchedTerm) return true;
      const termTokens = c.matchedTerm.toLocaleLowerCase("en").split(/\s+/);
      return termTokens.some((t) => t === normalizedWord);
    })
    .map((c) => ({
      ...c,
      rankingScore: calculateScore(c, sentenceText, normalizedWord),
    }));

  return scored.sort((a, b) => {
    if (a.rankingScore !== b.rankingScore) return b.rankingScore - a.rankingScore;
    if (a.confidence !== b.confidence) return b.confidence - a.confidence;
    const aLen = (a.matchedTerm ?? "").split(/\s+/).length;
    const bLen = (b.matchedTerm ?? "").split(/\s+/).length;
    if (aLen !== bLen) return bLen - aLen;
    return 0;
  });
}

function calculateScore(
  candidate: DictionaryCandidate,
  sentenceText: string,
  _hoverWord: string,
): number {
  const matchKind = determineMatchKind(candidate, sentenceText);
  const termTokens = (candidate.matchedTerm ?? "").split(/\s+/);

  let base: number;
  switch (matchKind) {
    case "multi-word-exact": base = RANKING_WEIGHTS.MULTI_WORD_GLOSSARY_EXACT; break;
    case "single-word-exact": base = RANKING_WEIGHTS.SINGLE_WORD_GLOSSARY_EXACT; break;
    case "alias": base = RANKING_WEIGHTS.GLOSSARY_ALIAS; break;
    case "glossary-unmatched": base = RANKING_WEIGHTS.DICTIONARY_BASE - RANKING_WEIGHTS.UNMATCHED_GLOSSARY_PENALTY; break;
    case "dictionary": base = RANKING_WEIGHTS.DICTIONARY_BASE; break;
  }

  const lengthBonus = Math.min(termTokens.length - 1, 5) * RANKING_WEIGHTS.TERM_LENGTH_BONUS;
  const confidenceBonus = Math.round(candidate.confidence * RANKING_WEIGHTS.CONFIDENCE_MAX_BONUS);

  let score = base + lengthBonus + confidenceBonus;
  if (matchKind === "glossary-unmatched") {
    score = Math.min(score, RANKING_WEIGHTS.DICTIONARY_BASE - 1);
  }
  return Math.max(0, score);
}

export function getPreferredCandidate(candidates: DictionaryCandidate[]): DictionaryCandidate | undefined {
  if (candidates.length === 0) return undefined;

  let best = candidates[0];
  for (let i = 1; i < candidates.length; i += 1) {
    const c = candidates[i];
    if (c.rankingScore > best.rankingScore) {
      best = c;
    } else if (c.rankingScore === best.rankingScore) {
      if (c.confidence > best.confidence) {
        best = c;
      } else if (c.confidence === best.confidence) {
        const cLen = (c.matchedTerm ?? "").split(/\s+/).length;
        const bLen = (best.matchedTerm ?? "").split(/\s+/).length;
        if (cLen > bLen) best = c;
      }
    }
  }
  return best;
}

/**
 * 사용자 preference를 고려하여 최종 preferred candidate를 결정한다.
 *
 * 우선순위:
 * 1. 현재 candidates 안에 존재하는 사용자 preference candidate
 * 2. ranking engine 결과 (getPreferredCandidate)
 * 3. undefined
 */
export function resolvePreferredCandidate(
  candidates: DictionaryCandidate[],
  selectedCandidateKey: string | null,
): DictionaryCandidate | undefined {
  if (candidates.length === 0) return undefined;

  if (selectedCandidateKey) {
    const selected = candidates.find((c) => getCandidateKey(c) === selectedCandidateKey);
    if (selected) return selected;
  }

  return getPreferredCandidate(candidates);
}

/**
 * 저장된 preference를 인자로 받아 최종 preferred candidate를 결정하는 순수 함수.
 *
 * IO(localStorage 접근)는 호출 측에서 수행한 뒤 preference를 넘겨준다.
 *
 * @param candidates - ranked candidates 배열
 * @param preference - 호출 측에서 조회한 사용자 preference (없으면 null)
 * @returns { preferred, selectedKey, hasUserPreference }
 */
export function resolvePreferenceSelection(
  candidates: DictionaryCandidate[],
  preference: UserDictionaryPreference | null,
): {
  preferred: DictionaryCandidate | undefined;
  selectedKey: string | null;
  hasUserPreference: boolean;
} {
  if (preference?.kind === "custom") {
    // custom preference는 candidates가 비어 있어도 논리적으로 존재하지만,
    // DictionaryCandidate 기반 preferred는 없을 수 있다.
    // (custom meaning은 DictionaryWord에서 별도 처리)
    return { preferred: undefined, selectedKey: null, hasUserPreference: true };
  }

  if (candidates.length === 0) {
    return { preferred: undefined, selectedKey: null, hasUserPreference: false };
  }

  let selectedKey: string | null = null;
  let hasUserPreference = false;

  if (preference?.kind === "candidate") {
    const exists = candidates.some((c) => getCandidateKey(c) === preference.candidateKey);
    if (exists) {
      selectedKey = preference.candidateKey;
      hasUserPreference = true;
    }
  }

  const preferred = resolvePreferredCandidate(candidates, selectedKey);
  return { preferred, selectedKey, hasUserPreference };
}
