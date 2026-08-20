import type { DictionaryResponse } from "@/types/dictionary";

const CACHE_PREFIX = "chagok.dictionary.v2";
const CACHE_VERSION = 2;

export type DictionaryCacheEntry = {
  version: typeof CACHE_VERSION;
  cachedAt: number;
  response: DictionaryResponse;
};

export function createCacheKey(normalizedWord: string, contextFingerprint: string): string {
  if (contextFingerprint) {
    const fingerprint = contextFingerprint.slice(0, 80);
    return `${CACHE_PREFIX}:${normalizedWord}:${fingerprint}`;
  }
  return `${CACHE_PREFIX}:${normalizedWord}`;
}

export function readCachedResponse(cacheKey: string): DictionaryResponse | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DictionaryCacheEntry>;
    if (parsed.version !== CACHE_VERSION) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    if (!parsed.response || !Array.isArray(parsed.response.candidates)) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }
    return parsed.response;
  } catch {
    try { sessionStorage.removeItem(cacheKey); } catch { /* ignore */ }
    return null;
  }
}

export function writeCachedResponse(cacheKey: string, response: DictionaryResponse): void {
  const entry: DictionaryCacheEntry = {
    version: CACHE_VERSION,
    cachedAt: Date.now(),
    response,
  };
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable; cache miss on next lookup is acceptable.
  }
}

export function clearV1Cache(): void {
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("chagok.dictionary.")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Best-effort cleanup.
  }
}