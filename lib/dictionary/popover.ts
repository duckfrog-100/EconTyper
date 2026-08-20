/**
 * Dictionary 단어 팝오버의 순수 헬퍼 함수.
 * 팝오버 상태 전이·포커스 정책의 핵심 판정을 테스트 가능하게 분리한다.
 */

/**
 * 팝오버 dialog의 접근성 라벨을 생성한다.
 * 예: "bond 단어 뜻"
 */
export function createDictionaryPopoverLabel(word: string): string {
  return `${word} 단어 뜻`;
}

/**
 * 팝오버 내부 후보 listbox의 접근성 라벨을 생성한다.
 * 예: "bond의 다른 뜻"
 */
export function createDictionaryListboxLabel(word: string): string {
  return `${word}의 다른 뜻`;
}

/**
 * 외부 클릭(pointerdown) 판정.
 * 클릭 대상이 boundary(단어 버튼 + 팝오버 wrapper) 내부면 false(닫지 않음),
 * 그 밖이거나 경계가 없으면 true(닫음).
 */
export function shouldCloseOnOutsideClick(
  target: unknown,
  boundary: { contains(node: Node | null): boolean } | null,
): boolean {
  if (target === null || target === undefined) return true;
  if (!boundary) return true;
  return !boundary.contains(target as Node | null);
}
