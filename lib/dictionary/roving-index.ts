/**
 * Roving tabindex를 위한 순수 유틸리티.
 * Dictionary 단어 버튼들의 키보드 탐색 시 인덱스 계산만 담당한다.
 */

export type RovingDirection = "previous" | "next";

/**
 * 화살표 방향에 따라 다음 Dictionary 단어 인덱스를 반환한다.
 * - 경계를 벗어나면 현재 인덱스를 그대로 반환 (wrap-around 없음)
 * - itemCount가 0이면 0 반환
 */
export function getNextDictionaryIndex(
  currentIndex: number,
  direction: RovingDirection,
  itemCount: number,
): number {
  if (itemCount <= 0) return 0;
  if (direction === "next") {
    return Math.min(currentIndex + 1, itemCount - 1);
  }
  return Math.max(currentIndex - 1, 0);
}