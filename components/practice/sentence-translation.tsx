"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const CACHE_PREFIX = "chagok.sentenceTranslation.";
const memoryCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

function hashText(text: string): string {
  let hash = 5381;
  for (const character of text) hash = ((hash << 5) + hash) ^ character.codePointAt(0)!;
  return `${text.length}-${(hash >>> 0).toString(36)}`;
}

function readCache(key: string): string | null {
  const memory = memoryCache.get(key);
  if (memory) return memory;

  try {
    const cached = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!cached) return null;
    memoryCache.set(key, cached);
    return cached;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: string) {
  memoryCache.set(key, value);
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, value);
  } catch {
    // 메모리 캐시는 계속 사용한다.
  }
}

function fetchTranslation(text: string, key: string): Promise<string> {
  const cached = readCache(key);
  if (cached) return Promise.resolve(cached);

  const pending = pendingRequests.get(key);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });
    const payload = (await response.json()) as { translatedText?: string; message?: string };
    if (!response.ok || typeof payload.translatedText !== "string") {
      throw new Error(payload.message || "문장 해석을 불러오지 못했습니다.");
    }
    writeCache(key, payload.translatedText);
    return payload.translatedText;
  })().finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, request);
  return request;
}

type Props = {
  sentence: string;
  showAll: boolean;
};

export function SentenceTranslation({ sentence, showAll }: Props) {
  const [override, setOverride] = useState<boolean | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const cacheKey = useMemo(() => hashText(sentence), [sentence]);
  const visible = override ?? showAll;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setOverride(null);
  }, [showAll]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "200px 0px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !inView || translation) return;
    const cached = readCache(cacheKey);
    if (cached) {
      setTranslation(cached);
      return;
    }

    setError("");
    void fetchTranslation(sentence, cacheKey)
      .then((value) => mountedRef.current && setTranslation(value))
      .catch((reason: unknown) => {
        if (mountedRef.current) setError(reason instanceof Error ? reason.message : "문장 해석을 불러오지 못했습니다.");
      });
  }, [cacheKey, inView, sentence, translation, visible]);

  return (
    <div ref={containerRef} className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOverride(!visible)}
        className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
        aria-expanded={visible}
      >
        {visible ? "해석 숨기기" : "한국어 해석 보기"}
      </button>

      {visible && (
        <div className="mt-3 rounded-xl bg-emerald-50/70 px-4 py-3 text-sm leading-7 text-zinc-700 dark:bg-emerald-950/20 dark:text-zinc-200">
          {!translation && !error && <p className="text-zinc-500">문장을 번역하는 중…</p>}
          {translation && <p>{translation}</p>}
          {error && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  void fetchTranslation(sentence, cacheKey)
                    .then((value) => mountedRef.current && setTranslation(value))
                    .catch((reason: unknown) => mountedRef.current && setError(reason instanceof Error ? reason.message : "문장 해석을 불러오지 못했습니다."));
                }}
                className="font-semibold text-zinc-700 underline underline-offset-4 dark:text-zinc-200"
              >
                다시 시도
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
