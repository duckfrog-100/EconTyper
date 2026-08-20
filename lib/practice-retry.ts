export type PracticeRetryMode = "wrong" | "all";

/**
 * 재시도 세션을 위한 /practice 라우트 URL을 생성한다.
 *
 * - 실제 존재하는 정적 라우트 `/practice`와 `?session=` 쿼리 파라미터만 사용한다.
 * - sessionId는 URL 인코딩된다.
 * - 빈 sessionId는 안전하게 기본 `/practice` 라우트를 반환한다.
 */
export function createPracticeRoute(sessionId: string, mode: PracticeRetryMode): string {
  const safeSessionId = sessionId.trim();
  if (!safeSessionId) return "/practice";
  return `/practice?session=${encodeURIComponent(safeSessionId)}&mode=${mode}`;
}

/**
 * 틀린 문장 다시 하기용 텍스트를 구성한다.
 * wrongAttemptIndices에 해당하는 문장만 문단 구분으로 이어 붙인다.
 * 틀린 문장이 없으면 안전하게 빈 문자열을 반환한다.
 */
export function buildRetryText(sentences: readonly string[], wrongAttemptIndices: ReadonlySet<number>): string {
  return sentences.filter((_, index) => wrongAttemptIndices.has(index)).join("\n\n");
}