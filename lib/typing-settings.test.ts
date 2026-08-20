import { describe, expect, it } from "vitest";
import { DEFAULT_TYPING_SETTINGS, normalizeTypingSettings } from "./typing-settings";

describe("normalizeTypingSettings", () => {
  it("returns defaults for non-object values", () => {
    expect(normalizeTypingSettings(null)).toEqual(DEFAULT_TYPING_SETTINGS);
    expect(normalizeTypingSettings(undefined)).toEqual(DEFAULT_TYPING_SETTINGS);
    expect(normalizeTypingSettings(42)).toEqual(DEFAULT_TYPING_SETTINGS);
    expect(normalizeTypingSettings("serif")).toEqual(DEFAULT_TYPING_SETTINGS);
  });

  it("merges a partial value with defaults", () => {
    expect(normalizeTypingSettings({ fontSize: 31, showTranslations: true })).toEqual({
      ...DEFAULT_TYPING_SETTINGS,
      fontSize: 31,
      showTranslations: true,
    });
  });

  it("keeps every valid field", () => {
    const valid = {
      fontSize: 20,
      fontWeight: 300,
      lineHeight: 2.2,
      fontFamily: "serif",
      showTranslations: true,
      speechLocale: "en-GB",
      speechRate: 1.5,
      dictationMode: true,
      autoPlayNext: true,
    };
    expect(normalizeTypingSettings(valid)).toEqual(valid);
  });

  it("falls back per field for out-of-range or wrong-typed values", () => {
    expect(normalizeTypingSettings({
      fontSize: 100,
      fontWeight: 1000,
      lineHeight: 0.5,
      fontFamily: "mono",
      showTranslations: "yes",
      speechLocale: "ko-KR",
      speechRate: 3,
      dictationMode: 1,
      autoPlayNext: null,
    })).toEqual(DEFAULT_TYPING_SETTINGS);
  });

  it("accepts boundary values", () => {
    expect(normalizeTypingSettings({ fontSize: 18 }).fontSize).toBe(18);
    expect(normalizeTypingSettings({ fontSize: 36 }).fontSize).toBe(36);
    expect(normalizeTypingSettings({ speechRate: 0.5 }).speechRate).toBe(0.5);
    expect(normalizeTypingSettings({ lineHeight: 1.3 }).lineHeight).toBe(1.3);
  });

  it("treats non-finite numbers as missing", () => {
    expect(normalizeTypingSettings({ fontSize: Number.NaN }).fontSize).toBe(DEFAULT_TYPING_SETTINGS.fontSize);
    expect(normalizeTypingSettings({ speechRate: Number.POSITIVE_INFINITY }).speechRate).toBe(DEFAULT_TYPING_SETTINGS.speechRate);
  });
});
