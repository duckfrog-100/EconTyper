import { describe, expect, it } from "vitest";
import { getFocusableEdges } from "./focus-trap";

function makeElement(opts: { disabled?: boolean; tabindex?: number }) {
  const el: Record<string, unknown> = {};
  if (opts.disabled !== undefined) el.disabled = opts.disabled;
  if (opts.tabindex !== undefined) el.tabIndex = opts.tabindex;
  el.getAttribute = (name: string) => (name === "tabindex" && opts.tabindex !== undefined ? String(opts.tabindex) : null);
  return el as unknown as HTMLElement;
}

function makeContainer(elements: HTMLElement[]): Element {
  return {
    querySelectorAll: (_selector: string) => elements,
  } as unknown as Element;
}

describe("getFocusableEdges", () => {
  it("returns null-first and null-last for null container", () => {
    const { first, last } = getFocusableEdges(null);
    expect(first).toBeNull();
    expect(last).toBeNull();
  });

  it("returns nulls for container with no focusable elements", () => {
    const container = makeContainer([]);
    const { first, last } = getFocusableEdges(container);
    expect(first).toBeNull();
    expect(last).toBeNull();
  });

  it("returns the same element for first and last when only one focusable element exists", () => {
    const btn = makeElement({});
    const container = makeContainer([btn]);
    const { first, last } = getFocusableEdges(container);
    expect(first).toBe(btn);
    expect(last).toBe(btn);
  });

  it("returns correct first and last when multiple focusable elements", () => {
    const firstBtn = makeElement({});
    const input = makeElement({});
    const lastBtn = makeElement({});
    const container = makeContainer([firstBtn, input, lastBtn]);
    const { first, last } = getFocusableEdges(container);
    expect(first).toBe(firstBtn);
    expect(last).toBe(lastBtn);
  });

  it("excludes disabled button from focusable elements", () => {
    const disabledBtn = makeElement({ disabled: true });
    const activeBtn = makeElement({});
    const container = makeContainer([disabledBtn, activeBtn]);
    const { first, last } = getFocusableEdges(container);
    expect(first).toBe(activeBtn);
    expect(last).toBe(activeBtn);
  });

  it("excludes tabindex=-1 from focusable elements", () => {
    const untabbable = makeElement({ tabindex: -1 });
    const tabbable = makeElement({});
    const container = makeContainer([untabbable, tabbable]);
    const { first, last } = getFocusableEdges(container);
    expect(first).toBe(tabbable);
    expect(last).toBe(tabbable);
  });

  it("includes elements with explicit positive tabindex", () => {
    const span = makeElement({ tabindex: 5 });
    const container = makeContainer([span]);
    const { first, last } = getFocusableEdges(container);
    expect(first).toBe(span);
    expect(last).toBe(span);
  });
});