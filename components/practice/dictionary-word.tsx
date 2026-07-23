"use client";

import { useRef, useState } from "react";

type DictionaryEntry = {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>;
};

const definitionCache = new Map<string, string>();

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z'-]/g, "");
}

async function fetchDefinition(word: string): Promise<string> {
  const normalized = normalizeWord(word);
  if (!normalized) return "No definition available.";
  const cached = definitionCache.get(normalized);
  if (cached) return cached;

  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`);
  if (!response.ok) throw new Error("Definition not found");
  const entries = (await response.json()) as DictionaryEntry[];
  const meaning = entries
    .flatMap((entry) => entry.meanings ?? [])
    .flatMap((item) => item.definitions ?? [])
    .find((item) => item.definition)?.definition;

  if (!meaning) throw new Error("Definition not found");
  definitionCache.set(normalized, meaning);
  return meaning;
}

export function DictionaryWord({ word }: { word: string }) {
  const [definition, setDefinition] = useState("");
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    setVisible(true);
    if (definition) return;
    timerRef.current = setTimeout(async () => {
      try {
        setDefinition(await fetchDefinition(word));
      } catch {
        setDefinition("Definition not found.");
      }
    }, 250);
  }

  function handleLeave() {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  async function handleDoubleClick() {
    const meaning = definition || (await fetchDefinition(word).catch(() => "Definition not found."));
    await navigator.clipboard.writeText(`${normalizeWord(word)} — ${meaning}`);
    setDefinition(meaning);
    setCopied(true);
    setVisible(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave} onDoubleClick={handleDoubleClick}>
      <span className="cursor-help rounded px-0.5 transition hover:bg-yellow-200 hover:text-zinc-950 dark:hover:bg-yellow-300">{word}</span>
      {visible && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 text-left text-xs leading-5 text-zinc-700 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          <strong className="block text-sm text-zinc-950 dark:text-zinc-50">{normalizeWord(word)}</strong>
          <span className="mt-1 block">{definition || "Looking up definition…"}</span>
          {copied && <span className="mt-2 block font-semibold text-emerald-600">Word and definition copied</span>}
        </span>
      )}
    </span>
  );
}
