import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeSentenceCard } from "./practice-sentence-card";
import type { PracticeSentence } from "@/lib/practice-utils";

function renderCard(overrides: Partial<React.ComponentProps<typeof PracticeSentenceCard>> = {}) {
  const sentence: PracticeSentence = { text: "Markets move.", paragraphStart: true };
  const props: React.ComponentProps<typeof PracticeSentenceCard> = {
    index: 0,
    sentence,
    typed: "",
    isActive: true,
    hadWrongAttempt: false,
    isSpeaking: false,
    speechSupported: true,
    dictationMode: false,
    revealed: true,
    showTranslations: false,
    textStyle: { fontSize: 18 },
    sourceTitle: "Source",
    isLast: true,
    cardRefs: { current: [] as Array<HTMLElement | null> },
    inputRefs: { current: [] as Array<HTMLTextAreaElement | null> },
    onActivate: () => {},
    onPlay: () => {},
    onTyped: () => {},
    onReveal: () => {},
    onFocusSentence: () => {},
    onToggleSaved: () => {},
    practiceSessionId: "test-session-id",
    ...overrides,
  };
  return renderToStaticMarkup(<PracticeSentenceCard {...props} />);
}

describe("PracticeSentenceCard accessibility", () => {
  it("exposes exactly one textbox element (textarea only)", () => {
    const html = renderCard();
    const textareaCount = (html.match(/<textarea/g) ?? []).length;
    const roleTextBoxCount = (html.match(/role="textbox"/g) ?? []).length;

    expect(textareaCount).toBe(1);
    expect(roleTextBoxCount).toBe(0);
  });

  it("does not add a tabIndex to the wrapper div around the textarea", () => {
    const html = renderCard();
    // wrapper div는 PR 3에서 role/tabIndex 제거됨
    // HTML 구조: <div onClick=... class="relative mt-6 ...">
    // tabindex="0"이 모든 DictionaryWord button 중에 하나만 존재해야 함 (roving)
    expect(html).not.toContain('tabindex="0" class="relative');
    expect(html).not.toContain('tabindex="0" role="');
    expect(html).not.toContain('div tabindex="0"');
  });

  it("has only one button with tabIndex=0 which is the roving dictionary entry", () => {
    const html = renderCard();
    // DICTIONARY WORD에 tabindex="0"이 하나만 존재
    const buttonMatches = [...html.matchAll(/<button[^>]*tabindex="0"[^>]*>/g)];
    expect(buttonMatches.length).toBeLessThanOrEqual(1);
  });

  it("marks the character rendering layer as aria-hidden", () => {
    const html = renderCard();
    expect(html).toContain('aria-hidden="true"');
  });

  it("keeps a single labelled textarea for screen readers", () => {
    const html = renderCard();
    expect(html).toContain('aria-label="1번째 문장 입력"');
    expect((html.match(/aria-label="/g) ?? []).length).toBe(1);
  });

  it("preserves the click-to-focus wrapper behavior", () => {
    const html = renderCard();
    expect(html).toContain('cursor-text');
  });
});