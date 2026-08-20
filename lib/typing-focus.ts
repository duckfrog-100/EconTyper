/**
 * 필사 입력은 "원문을 처음부터 순서대로 따라 입력"하는 구조라서
 * 사용자가 문자 사이에 caret을 두고 중간 삽입/수정하는 것을 지원하지 않는다.
 * caret은 항상 현재 입력 문자열의 끝에 있어야 한다.
 *
 * transparent textarea에서 사용자가 다른 영역(번역·단어·버튼·카드)을 클릭했다가
 * 다시 입력으로 돌아오면, 브라우저가 click 위치 또는 이전 selection을 복원해
 * caret이 중간에 남을 수 있다. 아래 helper는 caret을 값의 끝으로 복원한다.
 */

export type TypingInputLike = {
  value: string;
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
};

/** caret이 복원되어야 할 위치(현재 입력 값의 끝)를 반환한다. */
export function getTypingCaretTarget(value: string): number {
  return value.length;
}

/** textarea에 focus하고 caret을 현재 값의 끝으로 이동시킨다. */
export function focusTypingInputAtEnd(input: TypingInputLike | null | undefined): void {
  if (!input) return;
  input.focus();
  const end = getTypingCaretTarget(input.value);
  input.setSelectionRange(end, end);
}
