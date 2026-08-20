import { describe, expect, it } from "vitest";
import { getHomeExperienceMode } from "./home-experience";

describe("getHomeExperienceMode", () => {
  it("returns first-visit when history is empty and saved words are empty", () => {
    expect(getHomeExperienceMode(0, 0)).toBe("first-visit");
  });

  it("returns returning when history exists", () => {
    expect(getHomeExperienceMode(1, 0)).toBe("returning");
    expect(getHomeExperienceMode(5, 0)).toBe("returning");
  });

  it("returns returning when saved words exist", () => {
    expect(getHomeExperienceMode(0, 1)).toBe("returning");
    expect(getHomeExperienceMode(0, 12)).toBe("returning");
  });

  it("hides the learning summary for first-visit users", () => {
    const mode: string = getHomeExperienceMode(0, 0);
    expect(mode === "first-visit").toBe(true);
    expect(mode !== "returning").toBe(true);
  });

  it("shows the learning summary for returning users", () => {
    const mode: string = getHomeExperienceMode(3, 2);
    expect(mode === "returning").toBe(true);
    expect(mode !== "first-visit").toBe(true);
  });

  it("does not mutate its inputs", () => {
    const historyCount = 0;
    const savedWordCount = 0;
    getHomeExperienceMode(historyCount, savedWordCount);
    expect(historyCount).toBe(0);
    expect(savedWordCount).toBe(0);
  });
});