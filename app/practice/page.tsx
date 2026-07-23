"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentArticle } from "@/lib/session-storage";
import type { PracticeArticle } from "@/types/article";

export default function PracticePage() {
  const [article, setArticle] = useState<PracticeArticle | null | undefined>(undefined);

  useEffect(() => {
    setArticle(getCurrentArticle());
  }, []);

  if (article === undefined) {
    return <main className="mx-auto max-w-3xl px-5 py-16 text-sm text-zinc-500">Loading session…</main>;
  }

  if (!article) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">No active session</p>
        <h1 className="mt-3 text-3xl font-semibold">Choose an article first.</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">Practice content is stored only in the current browser tab.</p>
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
        <p className="mt-4 text-sm text-zinc-500">{article.text.length.toLocaleString()} characters · session only</p>
      </header>
      <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <p className="whitespace-pre-wrap text-lg leading-8 text-zinc-700 dark:text-zinc-300">{article.text}</p>
      </section>
      <section aria-label="Advertisement" className="mt-10 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 text-center text-xs text-zinc-500 dark:border-zinc-700">Reserved for a future AdSense or Carbon Ads placement</section>
    </main>
  );
}
