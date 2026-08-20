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

  const candidates: Array<{ raw: string | null; legacySessionKey?: string }> = [
    { raw: localStorage?.getItem(TYPING_SETTINGS_KEY) ?? null },
    ...LEGACY_TYPING_SETTINGS_KEYS.map((key) => ({ raw: localStorage?.getItem(key) ?? null })),
    ...LEGACY_TYPING_SETTINGS_KEYS.map((key) => ({ raw: sessionStorage?.getItem(key) ?? null, legacySessionKey: key })),
  ];

  for (const candidate of candidates) {
    if (!candidate.raw) continue;
    try {
      const normalized = normalize(JSON.parse(candidate.raw));
      saveTypingSettings(normalized);
      if (candidate.legacySessionKey) {
        try {
          sessionStorage?.removeItem(candidate.legacySessionKey);
        } catch {
          // The migrated value is already saved; cleanup failure is harmless.
        }
      }
      return normalized;
    } catch {
      continue;
    }
  }

  return defaults;
}
