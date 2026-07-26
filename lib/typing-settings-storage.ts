export const TYPING_SETTINGS_KEY = "chagok.typingSettings.v2";
export const LEGACY_TYPING_SETTINGS_KEYS = [
  "chagok.typingSettings",
  "econtyper.typingSettings",
] as const;

function getStorage(kind: "localStorage" | "sessionStorage"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[kind];
  } catch {
    return null;
  }
}

export function saveTypingSettings<T>(value: T): void {
  const storage = getStorage("localStorage");
  if (!storage) return;

  try {
    storage.setItem(TYPING_SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // Settings persistence must not interrupt practice.
  }
}

export function loadTypingSettings<T>(defaults: T, normalize: (value: unknown) => T): T {
  const localStorage = getStorage("localStorage");
  const sessionStorage = getStorage("sessionStorage");

  const candidates = [
    localStorage?.getItem(TYPING_SETTINGS_KEY) ?? null,
    ...LEGACY_TYPING_SETTINGS_KEYS.map((key) => localStorage?.getItem(key) ?? null),
    ...LEGACY_TYPING_SETTINGS_KEYS.map((key) => sessionStorage?.getItem(key) ?? null),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const normalized = normalize(JSON.parse(raw));
      saveTypingSettings(normalized);
      return normalized;
    } catch {
      continue;
    }
  }

  return defaults;
}
