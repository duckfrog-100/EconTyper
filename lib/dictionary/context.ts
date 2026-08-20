/**
 * 문맥 정규화 유틸리티.
 *
 * - 지나치게 긴 문장을 제한
 * - hover 단어 주변 ±5단어 윈도우로 fingerprint 생성 (토큰 순서 보존, stable hash)
 * - wordStart/wordEnd 기반 위치 지정 지원
 * - 문장부호와 공백 정규화
 */

const MAX_SENTENCE_LENGTH = 200;
const CONTEXT_WINDOW_SIZE = 5;

/**
 * 간단한 stable hash. 문맥 비교용이므로 암호학적 강도는 불필요.
 */
function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  // unsigned 32-bit hex
  return (hash >>> 0).toString(16);
}

/**
 * 문장을 정규화한다.
 */
export function normalizeSentence(sentence?: string): string {
  if (!sentence) return "";
  return sentence
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_SENTENCE_LENGTH);
}

/**
 * 정규화된 문장에서 단어 목록을 추출한다.
 * 소문자, 문장부호 제거.
 */
export function tokenizeSentence(sentence: string): string[] {
  if (!sentence) return [];
  return sentence
    .toLocaleLowerCase("en")
    .replace(/[^a-z\s'-]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * hover 단어 주변 ±N단어의 윈도우를 추출한다.
 *
 * @param sentence - 원본 문장
 * @param hoverWord - hover한 단어
 * @param wordStart - (optional) hover 단어의 문장 내 char offset. 없으면 첫 출현 사용
 * @returns 윈도우 문자열 (토큰 순서 보존, 소문자 정규화)
 */
export function extractContextWindow(
  sentence: string,
  hoverWord: string,
  wordStart?: number,
  wordEnd?: number,
): string {
  const normalized = normalizeSentence(sentence);
  if (!normalized) return "";

  const tokens = tokenizeSentence(normalized);
  if (tokens.length === 0) return "";

  const hoverLower = hoverWord.toLocaleLowerCase("en").replace(/[^a-z'-]/g, "");
  if (!hoverLower) return "";

  // wordStart/wordEnd가 주어지면 해당 위치의 단어 인덱스 찾기
  let centerIndex = -1;

  if (wordStart !== undefined && wordEnd !== undefined) {
    const normalizedLower = normalized.toLocaleLowerCase("en");
    const hoverInSentence = normalizedLower.slice(wordStart, wordEnd);

    // hoverInSentence가 hoverLower와 일치하는지 간단히 확인
    const hoverTokens = hoverInSentence
      .toLocaleLowerCase("en")
      .replace(/[^a-z\s'-]/g, "")
      .trim()
      .split(/\s+/);

    if (hoverTokens.length > 0 && hoverTokens[0] === hoverLower) {
      // wordStart를 기준으로 토큰 인덱스 계산: wordStart 이전의 단어 개수
      const beforeText = normalizedLower.slice(0, Math.max(0, wordStart));
      const beforeTokens = beforeText
        .split(/\s+/)
        .filter(Boolean);
      centerIndex = beforeTokens.length;
    }
  }

  // wordStart가 유효하지 않거나 주어지지 않은 경우: 첫 출현 찾기
  if (centerIndex === -1) {
    for (let i = 0; i < tokens.length; i += 1) {
      if (tokens[i] === hoverLower) {
        centerIndex = i;
        break;
      }
    }
  }

  if (centerIndex === -1) return "";

  const start = Math.max(0, centerIndex - CONTEXT_WINDOW_SIZE);
  const end = Math.min(tokens.length - 1, centerIndex + CONTEXT_WINDOW_SIZE);

  // 윈도우 내 토큰 순서 보존, 중복 유지
  const windowTokens = tokens.slice(start, end + 1);
  return windowTokens.join(" ");
}

/**
 * context fingerprint: hover 단어 주변 ±N단어의 토큰 순서를 보존한 window를
 * `|`로 join 후 stable hash한 문자열.
 * cache key의 일부로 사용.
 *
 * 토큰 순서가 다른 두 문맥은 다른 fingerprint를 생성한다.
 */
export function createContextFingerprint(sentence: string, hoverWord: string, wordStart?: number, wordEnd?: number): string {
  const windowStr = extractContextWindow(sentence, hoverWord, wordStart, wordEnd);
  if (!windowStr) return "";

  // 토큰 순서 보존, 중복 유지, "|" 구분자
  const tokens = windowStr.split(/\s+/);
  const canonical = tokens.join("|");

  // stable hash
  return stableHash(canonical);
}