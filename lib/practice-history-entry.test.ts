import { describe, expect, it } from "vitest";
import { buildPracticeHistoryEntry } from "./practice-history-entry";

describe("buildPracticeHistoryEntry", () => {
  it("builds a history entry with source text snapshot", () => {
    const entry = buildPracticeHistoryEntry({
      id: "completion-1",
      article: {
        id: "article-1",
        title: "Markets move",
        sourceName: "Reuters",
        text: "This body must not be stored.",
        createdAt: "2026-07-26T10:00:00.000Z",
      },
      completedAt: "2026-07-26T11:00:00.000Z",
      accuracy: 97,
      typedCharacters: 1234,
      wrongSentenceCount: 2,
      sessionWordCount: 8,
      savedWordCount: 3,
      sentenceCount: 14,
      wordsPerMinute: 48,
      elapsedSeconds: 620,
    });

    expect(entry).toEqual({
      id: "completion-1",
      articleId: "article-1",
      title: "Markets move",
      sourceName: "Reuters",
      completedAt: "2026-07-26T11:00:00.000Z",
      accuracy: 97,
      typedCharacters: 1234,
      wrongSentenceCount: 2,
      sessionWordCount: 8,
      savedWordCount: 3,
      sentenceCount: 14,
      wordsPerMinute: 48,
      elapsedSeconds: 620,
      sourceText: "This body must not be stored.",
    });
    expect(entry).toHaveProperty("sourceText");
  });

  it("omits an empty source name", () => {
    const entry = buildPracticeHistoryEntry({
      id: "completion-2",
      article: {
        id: "article-2",
        title: "Pasted article",
        sourceName: "  ",
        text: "Text",
        createdAt: "2026-07-26T10:00:00.000Z",
      },
      completedAt: "2026-07-26T11:00:00.000Z",
      accuracy: 100,
      typedCharacters: 4,
      wrongSentenceCount: 0,
      sessionWordCount: 0,
      savedWordCount: 0,
      sentenceCount: 1,
      wordsPerMinute: 0,
      elapsedSeconds: 0,
    });

    expect(entry.sourceName).toBeUndefined();
  });

  it("preserves words per minute and elapsed seconds", () => {
    const entry = buildPracticeHistoryEntry({
      id: "completion-3",
      article: {
        id: "article-3",
        title: "Timed run",
        text: "Text",
        createdAt: "2026-07-26T10:00:00.000Z",
      },
      completedAt: "2026-07-26T11:00:00.000Z",
      accuracy: 95,
      typedCharacters: 900,
      wrongSentenceCount: 1,
      sessionWordCount: 2,
      savedWordCount: 1,
      sentenceCount: 9,
      wordsPerMinute: 36,
      elapsedSeconds: 750,
    });

    expect(entry.wordsPerMinute).toBe(36);
    expect(entry.elapsedSeconds).toBe(750);
  });
});
