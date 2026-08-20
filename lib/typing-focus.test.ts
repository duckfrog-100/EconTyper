import { describe, expect, it, vi } from "vitest";
import { focusTypingInputAtEnd, getTypingCaretTarget, type TypingInputLike } from "./typing-focus";

describe("getTypingCaretTarget", () => {
  it("returns 0 for empty value", () => {
    expect(getTypingCaretTarget("")).toBe(0);
  });

  it("returns the end of the current typed value", () => {
    expect(getTypingCaretTarget("hello")).toBe(5);
  });

  it("counts spaces in the target", () => {
    expect(getTypingCaretTarget("hello world")).toBe(11);
  });

  it("equals the append position (inserting at caret keeps the text contiguous)", () => {
    const value = "Bernie Sanders, a Vermont";
    const caret = getTypingCaretTarget(value);
    expect(value.slice(0, caret) + " " + value.slice(caret)).toBe(`${value} `);
  });
});

describe("focusTypingInputAtEnd", () => {
  it("focuses the input and moves the caret to the end of the value", () => {
    const focus = vi.fn();
    const setSelectionRange = vi.fn();
    const input: TypingInputLike = { value: "hello", focus, setSelectionRange };

    focusTypingInputAtEnd(input);

    expect(focus).toHaveBeenCalledTimes(1);
    expect(setSelectionRange).toHaveBeenCalledWith(5, 5);
  });

  it("snaps the caret to the end even when a stale selection exists", () => {
    const setSelectionRange = vi.fn();
    const input: TypingInputLike = { value: "hello world", focus: vi.fn(), setSelectionRange };

    focusTypingInputAtEnd(input);

    expect(setSelectionRange).toHaveBeenCalledWith(11, 11);
  });

  it("does nothing for a missing input", () => {
    expect(() => focusTypingInputAtEnd(null)).not.toThrow();
    expect(() => focusTypingInputAtEnd(undefined)).not.toThrow();
  });
});
