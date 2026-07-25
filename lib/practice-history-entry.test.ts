import { describe, expect, it } from "vitest";
import { buildPracticeHistoryEntry } from "./practice-history-entry";

describe("buildPracticeHistoryEntry", () => {
  it("builds a history entry without article body text", () => {
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
    });
    expect(entry).not.toHaveProperty("text");
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
    });

    expect(entry.sourceName).toBeUndefined();
  });
});
