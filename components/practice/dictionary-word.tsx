"use client";

import { useEffect, useRef, useState } from "react";

type DictionaryEntry = { meanings?: Array<{ definitions?: Array<{ definition?: string }> }> };
type TranslationResponse = { responseData?: { translatedText?: string } };
type Meaning = { english: string; korean?: string };

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
    const meaning: Meaning = { english: parsed.english, korean: typeof parsed.korean === "string" ? parsed.korean : undefined };
    memoryCache.set(word, meaning);
    return meaning;
  } catch {
    return null;
  }
}

function cacheMeaning(word: string, meaning: Meaning) {
  memoryCache.set(word, meaning);
  try { sessionStorage.setItem(`${CACHE_PREFIX}${word}`, JSON.stringify(meaning)); } catch {}
}

async function translateToKorean(english: string): Promise<string | undefined> {
  const query = new URLSearchParams({ q: english.slice(0, 450), langpair: "en|ko" });
  const response = await fetch(`https://api.mymemory.translated.net/get?${query.toString()}`);
  if (!response.ok) return undefined;
  const payload = (await response.json()) as TranslationResponse;
  const translated = payload.responseData?.translatedText?.trim();
  return !translated || translated.toLowerCase() === english.toLowerCase() ? undefined : translated;
}

function fetchMeaning(word: string): Promise<Meaning> {
  const normalized = normalizeWord(word);
  if (!normalized) return Promise.resolve({ english: "No definition available." });
  const cached = readCachedMeaning(normalized);
  if (cached) return Promise.resolve(cached);
  const pending = pendingRequests.get(normalized);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`);
    if (!response.ok) throw new Error("Definition not found");
    const entries = (await response.json()) as DictionaryEntry[];
    const english = entries.flatMap((entry) => entry.meanings ?? []).flatMap((item) => item.definitions ?? []).find((item) => item.definition)?.definition;
    if (!english) throw new Error("Definition not found");
    const korean = await translateToKorean(english).catch(() => undefined);
    const meaning: Meaning = { english, korean };
    cacheMeaning(normalized, meaning);
    return meaning;
  })().finally(() => pendingRequests.delete(normalized));

  pendingRequests.set(normalized, request);
  return request;
}

export function DictionaryWord({ word }: { word: string }) {
  const [meaning, setMeaning] = useState<Meaning | null>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "copy-error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function handleEnter() {
    setVisible(true);
    if (meaning) return;
    timerRef.current = setTimeout(async () => {
      const next = await fetchMeaning(word).catch(() => ({ english: "Definition not found." }));
      if (mountedRef.current) setMeaning(next);
    }, 220);
  }

  function handleLeave() {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  async function handleDoubleClick() {
    const nextMeaning = meaning ?? (await fetchMeaning(word).catch(() => ({ english: "Definition not found." })));
    setMeaning(nextMeaning);
    setVisible(true);
    try {
      await navigator.clipboard.writeText(`${normalizeWord(word)} — ${nextMeaning.korean || nextMeaning.english}`);
      setStatus("copied");
    } catch {
      setStatus("copy-error");
    }
    window.setTimeout(() => mountedRef.current && setStatus("idle"), 1200);
  }

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave} onDoubleClick={handleDoubleClick}>
      <span className="cursor-help rounded px-0.5 transition hover:bg-yellow-200 hover:text-zinc-950 dark:hover:bg-yellow-300">{word}</span>
      {visible && <span className="absolute bottom-full left-1/2 z-20 mb-2 w-72 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-4 text-left text-xs leading-5 text-zinc-700 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"><strong className="block text-sm text-zinc-950 dark:text-zinc-50">{normalizeWord(word)}</strong>{!meaning && <span className="mt-2 block">뜻을 찾는 중…</span>}{meaning?.korean && <span className="mt-2 block text-sm font-semibold text-zinc-950 dark:text-zinc-50">{meaning.korean}</span>}{meaning && <><span className="mt-3 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">English definition</span><span className="mt-1 block">{meaning.english}</span></>}{status === "copied" && <span className="mt-3 block font-semibold text-emerald-600">단어와 뜻을 복사했습니다.</span>}{status === "copy-error" && <span className="mt-3 block font-semibold text-red-600">클립보드 복사에 실패했습니다.</span>}</span>}
    </span>
  );
}
