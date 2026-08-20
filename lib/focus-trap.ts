/**
 * Dialog 접근성을 위한 최소 포커스 트랩 유틸리티.
 * 새 의존성을 추가하지 않고 현재 프로젝트 규모에 맞춘 최소 helper.
 */

const INTERACTIVE_SELECTOR =
  'button, input, select, textarea, a[href], [tabindex]';

/**
 * container 내부에서 실제로 focus 가능한 첫 번째·마지막 요소를 반환한다.
 * container가 null이거나 focusable 요소가 없으면 first=null, last=null을 반환한다.
 */
export function getFocusableEdges(container: Element | null): { first: HTMLElement | null; last: HTMLElement | null } {
  if (!container) return { first: null, last: null };
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR))
    .filter((el) => !(el as HTMLButtonElement | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).disabled && el.tabIndex !== -1);
  return {
    first: nodes[0] ?? null,
    last: nodes[nodes.length - 1] ?? null,
  };
}