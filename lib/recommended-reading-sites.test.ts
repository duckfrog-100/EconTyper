import { describe, expect, it } from "vitest";
import { recommendedReadingSites } from "./recommended-reading-sites";

describe("recommendedReadingSites", () => {
  it("uses unique stable ids", () => {
    const ids = recommendedReadingSites.map((site) => site.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains only HTTPS links and Korean descriptions", () => {
    expect(recommendedReadingSites.length).toBeGreaterThanOrEqual(6);
    for (const site of recommendedReadingSites) {
      expect(site.url.startsWith("https://")).toBe(true);
      expect(site.description.trim().length).toBeGreaterThan(10);
      expect(site.category.trim().length).toBeGreaterThan(0);
    }
  });
});
