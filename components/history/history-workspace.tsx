"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HistoryList } from "@/components/history/history-list";
import { HistorySummary } from "@/components/history/history-summary";
import {
  calculatePracticeHistorySummary,
  groupPracticeHistoryByMonth,
  readPracticeHistory,
} from "@/lib/history-storage";
import { readSavedWords } from "@/lib/vocabulary-storage";
import type { PracticeHistoryEntry } from "@/types/history";

export function HistoryWorkspace() {
  const [history, setHistory] = useState<PracticeHistoryEntry[]>([]);
  const [savedWordCount, setSavedWordCount] = useState(0);

  useEffect(() => {
    setHistory(readPracticeHistory());
    setSavedWordCount(readSavedWords().length);
  }, []);

  const summary = useMemo(
    () => calculatePracticeHistorySummary(history, savedWordCount),
    [history, savedWordCount],
  );
  const groups = useMemo(() => groupPracticeHistoryByMonth(history), [history]);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <header>
          <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사 차곡차곡</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">학습 기록</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">완료한 필사와 누적 학습량을 확인해 보세요. 최근 100회 기록만 이 브라우저에 저장됩니다.</p>
        </header>
        <Link href="/" className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">← 홈으로</Link>
      </div>

      <div className="mt-10">
        <HistorySummary summary={summary} />
      </div>
      <HistoryList groups={groups} />
    </main>
  );
}
