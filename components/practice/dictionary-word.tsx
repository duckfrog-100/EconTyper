"use client";

import { useEffect, useRef, useState } from "react";

type Meaning = { english: string; korean?: string };
type DictionaryPayload = Meaning & { word: string };

const memoryCache = new Map<string, Meaning>();
const pendingRequests = new Map<string, Promise<Meaning>>();
const CACHE_PREFIX = "econtyper.dictionary.";

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z'-]/g, "");
}

function readCachedMeaning(word: string): Meaning | null {
  const memory = memoryCache.get(word);
  if (memory) return memory;

  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${word}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Meaning>;
    if (typeof parsed.english !== "string") return null;
    const meaning: Meaning = {
      english: parsed.english,
      korean: typeof parsed.korean === "string" ? parsed.korean : undefined,
    };
    memoryCache.set(word, meaning);
    return meaning;
  } catch {
    return null;
  }
}

function cacheMeaning(word: string, meaning: Meaning) {
  memoryCache.set(word, meaning);
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${word}`, JSON.stringify(meaning));
  } catch {
    // 메모리 캐시는 계속 사용한다.
  }
}

function fetchMeaning(word: string): Promise<Meaning> {
  const normalized = normalizeWord(word);
  if (!normalized) return Promise.reject(new Error("Invalid word"));

  const cached = readCachedMeaning(normalized);
  if (cached) return Promise.resolve(cached);

  const pending = pendingRequests.get(normalized);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch(`/api/dictionary?word=${encodeURIComponent(normalized)}`, { cache: "no-store" });
    const payload = (await response.json()) as Partial<DictionaryPayload> & { message?: string };
    if (!response.ok || typeof payload.english !== "string") {
      throw new Error(payload.message || "단어 뜻을 찾지 못했습니다.");
    }

    const meaning: Meaning = {
      english: payload.english,
      korean: typeof payload.korean === "string" ? payload.korean : undefined,
    };
    cacheMeaning(normalized, meaning);
    return meaning;
  })().finally(() => pendingRequests.delete(normalized));

  pendingRequests.set(normalized, request);
  return request;
}

export function DictionaryWord({ word }: { word: string }) {
  const [meaning, setMeaning] = useState<Meaning | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "copied" | "copy-error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function beginLookup() {
    setVisible(true);
    setError("");
    if (meaning || timerRef.current) return;

    timerRef.current = setTimeout(async () => {
      timerRef.current = null;
      try {
        const next = await fetchMeaning(word);
        if (mountedRef.current) setMeaning(next);
      } catch (lookupError) {
        if (mountedRef.current) {
          setError(lookupError instanceof Error ? lookupError.message : "단어 뜻을 불러오지 못했습니다.");
        }
      }
    }, 120);
  }

  function handleLeave() {
    setVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleDoubleClick() {
    setVisible(true);
    setError("");

    try {
      const nextMeaning = meaning ?? await fetchMeaning(word);
      if (mountedRef.current) setMeaning(nextMeaning);
      await navigator.clipboard.writeText(`${normalizeWord(word)} — ${nextMeaning.korean || nextMeaning.english}`);
      if (mountedRef.current) setStatus("copied");
    } catch {
      if (mountedRef.current) setStatus("copy-error");
    }

    window.setTimeout(() => mountedRef.current && setStatus("idle"), 1400);
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={beginLookup}
      onFocus={beginLookup}
      onMouseLeave={handleLeave}
      onBlur={handleLeave}
      onDoubleClick={handleDoubleClick}
    >
      <button
        type="button"
        className="cursor-help rounded px-0.5 text-inherit transition hover:bg-yellow-200 hover:text-zinc-950 focus:bg-yellow-200 focus:text-zinc-950 focus:outline-none dark:hover:bg-yellow-300 dark:focus:bg-yellow-300"
      >
        {word}
      </button>

      {visible && (
        <span className="absolute bottom-full left-1/2 z-30 mb-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-4 text-left text-xs leading-5 text-zinc-700 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          <strong className="block text-sm text-zinc-950 dark:text-zinc-50">{normalizeWord(word)}</strong>
          {!meaning && !error && <span className="mt-2 block">뜻을 찾는 중…</span>}
          {error && <span className="mt-2 block text-red-600 dark:text-red-400">{error}</span>}
          {meaning?.korean && <span className="mt-2 block text-sm font-semibold text-zinc-950 dark:text-zinc-50">{meaning.korean}</span>}
          {meaning && (
            <>
              <span className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">영문 정의</span>
              <span className="mt-1 block">{meaning.english}</span>
            </>
          )}
          {status === "copied" && <span className="mt-3 block font-semibold text-emerald-600">단어와 뜻을 복사했습니다.</span>}
          {status === "copy-error" && <span className="mt-3 block font-semibold text-red-600">클립보드 복사에 실패했습니다.</span>}
        </span>
      )}
    </span>
  );
}
