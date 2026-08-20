import { describe, expect, it } from "vitest";
import { buildRetryText, createPracticeRoute } from "./practice-retry";

describe("createPracticeRoute", () => {
  it("never builds a /practice/{id} path-style URL", () => {
    const url = createPracticeRoute("abc-123", "all");
    expect(url.startsWith("/practice/")).toBe(false);
    expect(url).toMatch(/^\/practice(?:\?|$)/);
  });

  it("uses the real /practice route for retry-all", () => {
    expect(createPracticeRoute("abc-123", "all")).toMatch(/^\/practice\?/);
  });

  it("uses the real /practice route for retry-wrong", () => {
    expect(createPracticeRoute("abc-123", "wrong")).toMatch(/^\/practice\?/);
  });

  it("URL-encodes the session id", () => {
    const url = createPracticeRoute("abc 123/세션", "all");
    expect(url).toBe("/practice?session=abc%20123%2F%EC%84%B8%EC%85%98&mode=all");
  });

  it("distinguishes retry mode via query parameter", () => {
    expect(createPracticeRoute("abc", "all")).toContain("mode=all");
    expect(createPracticeRoute("abc", "wrong")).toContain("mode=wrong");
  });

  it("falls back safely to /practice for empty or whitespace session ids", () => {
    expect(createPracticeRoute("", "all")).toBe("/practice");
    expect(createPracticeRoute("   ", "wrong")).toBe("/practice");
  });

  it("keeps the session id as the article/session identifier", () => {
    const url = createPracticeRoute("article-42", "all");
    expect(new URLSearchParams(url.split("?")[1]).get("session")).toBe("article-42");
  });
});

describe("buildRetryText", () => {
  const sentences = ["First sentence.", "Second sentence.", "Third sentence."];

  it("returns only the wrong sentences joined as paragraphs", () => {
    expect(buildRetryText(sentences, new Set([0, 2]))).toBe("First sentence.\n\nThird sentence.");
  });

  it("returns an empty string when there are no wrong sentences", () => {
    expect(buildRetryText(sentences, new Set())).toBe("");
    expect(buildRetryText(sentences, new Set([99]))).toBe("");
  });

  it("does not mutate the input sentence array", () => {
    const original = [...sentences];
    buildRetryText(sentences, new Set([0]));
    expect(sentences).toEqual(original);
  });
});