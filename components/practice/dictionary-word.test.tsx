import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DictionaryWord } from "./dictionary-word";

function renderWord(word = "bond") {
  return renderToStaticMarkup(<DictionaryWord word={word} sentence="The bond market moves." sourceTitle="Test" />);
}

describe("DictionaryWord accessibility (SSR, closed state)", () => {
  it("marks the word button with aria-haspopup dialog", () => {
    const html = renderWord();
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it("sets aria-expanded false when the popover is closed", () => {
    const html = renderWord();
    expect(html).toContain('aria-expanded="false"');
  });

  it("connects the button to a popover id via aria-controls", () => {
    const html = renderWord();
    const match = html.match(/aria-controls="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toMatch(/^dict-/);
  });

  it("does not render the popover dialog when closed", () => {
    const html = renderWord();
    expect(html).not.toContain('role="dialog"');
  });

  it("renders the original word text unchanged", () => {
    const html = renderWord();
    expect(html).toContain("bond");
  });
});