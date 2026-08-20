import type { SpeechLocale } from "@/hooks/use-speech-synthesis";

export type TypingSettingsValue = {
  fontSize: number;
  fontWeight: number;
  fontFamily: "sans" | "serif";
  lineHeight: number;
  showTranslations: boolean;
  speechLocale: SpeechLocale;
  speechRate: number;
  dictationMode: boolean;
  autoPlayNext: boolean;
};

export const DEFAULT_TYPING_SETTINGS: TypingSettingsValue = {
  fontSize: 26,
  fontWeight: 500,
  fontFamily: "sans",
  lineHeight: 1.7,
  showTranslations: false,
  speechLocale: "en-US",
  speechRate: 1,
  dictationMode: false,
  autoPlayNext: false,
};

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function normalizeTypingSettings(value: unknown): TypingSettingsValue {
  const parsed = (value && typeof value === "object" ? value : {}) as Partial<TypingSettingsValue>;

  return {
    fontSize: isNumberInRange(parsed.fontSize, 18, 36) ? parsed.fontSize : DEFAULT_TYPING_SETTINGS.fontSize,
    fontWeight: isNumberInRange(parsed.fontWeight, 300, 700) ? parsed.fontWeight : DEFAULT_TYPING_SETTINGS.fontWeight,
    lineHeight: isNumberInRange(parsed.lineHeight, 1.3, 2.2) ? parsed.lineHeight : DEFAULT_TYPING_SETTINGS.lineHeight,
    fontFamily: parsed.fontFamily === "serif" || parsed.fontFamily === "sans" ? parsed.fontFamily : DEFAULT_TYPING_SETTINGS.fontFamily,
    showTranslations: typeof parsed.showTranslations === "boolean" ? parsed.showTranslations : DEFAULT_TYPING_SETTINGS.showTranslations,
    speechLocale: parsed.speechLocale === "en-GB" ? "en-GB" : "en-US",
    speechRate: isNumberInRange(parsed.speechRate, 0.5, 1.5) ? parsed.speechRate : DEFAULT_TYPING_SETTINGS.speechRate,
    dictationMode: typeof parsed.dictationMode === "boolean" ? parsed.dictationMode : DEFAULT_TYPING_SETTINGS.dictationMode,
    autoPlayNext: typeof parsed.autoPlayNext === "boolean" ? parsed.autoPlayNext : DEFAULT_TYPING_SETTINGS.autoPlayNext,
  };
}
