import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_TYPING_SETTINGS, normalizeTypingSettings } from "./typing-settings";
import {
  LEGACY_TYPING_SETTINGS_KEYS,
  loadTypingSettings,
  saveTypingSettings,
  TYPING_SETTINGS_KEY,
} from "./typing-settings-storage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

type Settings = { fontSize: number; showTranslations: boolean };
const defaults: Settings = { fontSize: 26, showTranslations: false };
const normalize = (value: unknown): Settings => {
  if (!value || typeof value !== "object") return defaults;
  const candidate = value as Partial<Settings>;
  return {
    fontSize: typeof candidate.fontSize === "number" ? candidate.fontSize : defaults.fontSize,
    showTranslations: typeof candidate.showTranslations === "boolean" ? candidate.showTranslations : defaults.showTranslations,
  };
};

describe("typing settings storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() },
    });
  });

  afterEach(() => { Reflect.deleteProperty(globalThis, "window"); });

  it("prefers the current localStorage key", () => {
    window.localStorage.setItem(TYPING_SETTINGS_KEY, JSON.stringify({ fontSize: 31, showTranslations: true }));
    window.sessionStorage.setItem(LEGACY_TYPING_SETTINGS_KEYS[0], JSON.stringify({ fontSize: 20, showTranslations: false }));
    expect(loadTypingSettings(defaults, normalize)).toEqual({ fontSize: 31, showTranslations: true });
    expect(window.sessionStorage.getItem(LEGACY_TYPING_SETTINGS_KEYS[0])).not.toBeNull();
  });

  it("loads a legacy session value and migrates it to localStorage", () => {
    window.sessionStorage.setItem(LEGACY_TYPING_SETTINGS_KEYS[0], JSON.stringify({ fontSize: 29, showTranslations: true }));
    expect(loadTypingSettings(defaults, normalize)).toEqual({ fontSize: 29, showTranslations: true });
    expect(JSON.parse(window.localStorage.getItem(TYPING_SETTINGS_KEY) ?? "null")).toEqual({ fontSize: 29, showTranslations: true });
    expect(window.sessionStorage.getItem(LEGACY_TYPING_SETTINGS_KEYS[0])).toBeNull();
  });

  it("returns defaults for malformed data", () => {
    window.localStorage.setItem(TYPING_SETTINGS_KEY, "{bad-json");
    expect(loadTypingSettings(defaults, normalize)).toEqual(defaults);
  });

  it("migrates a partial legacy session value merged with typing-settings defaults", () => {
    window.sessionStorage.setItem(LEGACY_TYPING_SETTINGS_KEYS[0], JSON.stringify({ fontSize: 29, dictationMode: true }));
    const loaded = loadTypingSettings(DEFAULT_TYPING_SETTINGS, normalizeTypingSettings);
    expect(loaded).toEqual({ ...DEFAULT_TYPING_SETTINGS, fontSize: 29, dictationMode: true });
    expect(JSON.parse(window.localStorage.getItem(TYPING_SETTINGS_KEY) ?? "null")).toEqual(loaded);
    expect(window.sessionStorage.getItem(LEGACY_TYPING_SETTINGS_KEYS[0])).toBeNull();
  });

  it("saves settings to the current localStorage key", () => {
    saveTypingSettings({ fontSize: 30, showTranslations: true });
    expect(JSON.parse(window.localStorage.getItem(TYPING_SETTINGS_KEY) ?? "null")).toEqual({ fontSize: 30, showTranslations: true });
  });
});
