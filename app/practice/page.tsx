"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DictionaryWord } from "@/components/practice/dictionary-word";
import { buildCharacterStates, calculateAccuracy, segmentSentences } from "@/lib/practice-utils";
import { getCurrentArticle } from "@/lib/session-storage";
import type { PracticeArticle } from "@/types/article";

function InteractiveSentence({ sentence }: { sentence: string }) {
  return (
    <p className="text-base leading-8 text-zinc-700 dark:text-zinc-300">
      {sentence.split(/(\s+)/).map((part, index) =>
        /[A-Za-z]/.test(part) ? <DictionaryWord key={`${part}-${index}`} word={part} /> : <span key={`${part}-${index}`}>{part}</span>,
      )}
    </p>
  );
}

export default function PracticePage() {
  const [article, setArticle] = useState<PracticeArticle | null | undefined>(undefined);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setArticle(getCurrentArticle());
  }, []);

  const sentences = useMemo(() => segmentSentences(article?.text ?? ""), [article?.text]);
  const sentence = sentences[sentenceIndex] ?? "";
  const characterStates = useMemo(() => buildCharacterStates(sentence, typed), [sentence, typed]);
  const isComplete = sentence.length > 0 && typed === sentence;
  const accuracy = calculateAccuracy(sentence, typed);

  function moveToSentence(nextIndex: number) {
    setSentenceIndex(nextIndex);
    setTyped("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (article === undefined) {
    return <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-zinc-500">Loading session…</main>;
  }

  if (!article) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">No active session</p>
        <h1 className="mt-3 text-3xl font-semibold">Choose an article first.</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">Practice content belongs only to the tab where you started it.</p>
        <Link href="/" className="mx-auto mt-7 rounded-2xl bg-zinc-950 px-5 py-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">Return home</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Home</Link>
      <header className="mt-8 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{article.sourceName}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">{article.title}</h1>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500">
          <span>Sentence {Math.min(sentenceIndex + 1, sentences.length)} / {sentences.length}</span>
          <span>Accuracy {accuracy}%</span>
          <span>{typed.length} / {sentence.length} characters</span>
        </div>
      </header>

      <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Read · hover for meaning · double-click to copy</p>
        <InteractiveSentence sentence={sentence} />
      </section>

      <section className="mt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Type the sentence</p>
        <div
          role="textbox"
          tabIndex={0}
          onClick={() => inputRef.current?.focus()}
          onFocus={() => inputRef.current?.focus()}
          className="relative min-h-44 cursor-text rounded-3xl border border-zinc-300 bg-white p-6 text-xl leading-9 shadow-sm outline-none focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-900 sm:p-8 sm:text-2xl sm:leading-10"
        >
          <p aria-hidden="true" className="whitespace-pre-wrap break-words font-medium">
            {characterStates.map(({ character, state }, index) => (
              <span
                key={`${character}-${index}`}
                className={
                  state === "correct"
                    ? "text-zinc-950 dark:text-zinc-50"
                    : state === "incorrect"
                      ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                      : "text-zinc-300 dark:text-zinc-700"
                }
              >
                {character}
              </span>
            ))}
            {typed.length > sentence.length && <span className="bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">{typed.slice(sentence.length)}</span>}
            <span className="ml-0.5 inline-block h-7 w-0.5 animate-pulse bg-emerald-500 align-middle" />
          </p>
          <textarea
            ref={inputRef}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onPaste={(event) => event.preventDefault()}
            autoFocus
            aria-label="Type the current sentence"
            className="absolute inset-0 h-full w-full resize-none opacity-0"
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-4">
          <button type="button" disabled={sentenceIndex === 0} onClick={() => moveToSentence(sentenceIndex - 1)} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-30 dark:border-zinc-700">Previous</button>
          <p className={`text-sm font-medium ${isComplete ? "text-emerald-600" : "text-zinc-500"}`}>{isComplete ? "Sentence complete" : "Match every character to continue"}</p>
          <button type="button" disabled={!isComplete || sentenceIndex >= sentences.length - 1} onClick={() => moveToSentence(sentenceIndex + 1)} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-950">Next</button>
        </div>
      </section>

      <section aria-label="Advertisement" className="mt-10 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 text-center text-xs text-zinc-500 dark:border-zinc-700">Reserved for a future AdSense or Carbon Ads placement</section>
    </main>
  );
}
