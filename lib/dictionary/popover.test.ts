import { describe, expect, it } from "vitest";
import { createDictionaryListboxLabel, createDictionaryPopoverLabel, shouldCloseOnOutsideClick } from "./popover";

describe("dictionary popover labels", () => {
  it("builds a dialog label containing the word", () => {
    expect(createDictionaryPopoverLabel("bond")).toBe("bond 단어 뜻");
  });

  it("builds a listbox label containing the word", () => {
    expect(createDictionaryListboxLabel("bond")).toBe("bond의 다른 뜻");
  });
});

function makeBoundary(contains: (node: unknown) => boolean) {
  return { contains };
}

describe("shouldCloseOnOutsideClick", () => {
  it("closes when the click target is outside the boundary", () => {
    const boundary = makeBoundary(() => false);
    expect(shouldCloseOnOutsideClick({ value: "outside" }, boundary)).toBe(true);
  });

  it("does not close when the click target is inside the boundary", () => {
    const boundary = makeBoundary(() => true);
    expect(shouldCloseOnOutsideClick({ value: "inside" }, boundary)).toBe(false);
  });

  it("closes when there is no boundary or no target", () => {
    expect(shouldCloseOnOutsideClick(null, null)).toBe(true);
    expect(shouldCloseOnOutsideClick(undefined, null)).toBe(true);
    expect(shouldCloseOnOutsideClick({ value: "x" }, null)).toBe(true);
  });
});