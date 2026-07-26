"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HistoryList } from "@/components/history/history-list";
import { HistorySummary } from "@/components/history/history-summary";
import {
  calculatePracticeHistorySummary,
  deletePracticeHistoryEntry,
  filterPracticeHistory,
  groupPracticeHistoryByMonth,
  readPracticeHistory,
} from "@/lib/history-storage";
import { getCurrentArticle, saveCurrentArticle } from "@/lib/session-storage";
import { starterLibrary } from "@/lib/starter-library";
import { readSavedWords } from "@/lib/vocabulary-storage";
import type { PracticeArticle } from "@/types/article";
import type { PracticeHistoryEntry } from "@/types/history";

export function HistoryWorkspace() {
  const router = useRouter();
  const [history, setHistory] = useState<PracticeHistoryEntry[]>([]);
  const [savedWordCount, setSavedWordCount] = useState(0);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setHistory(readPracticeHistory());
    setSavedWordCount(readSavedWords().length);
  }, []);

  const summary = useMemo(
    () => calculatePracticeHistorySummary(history, savedWordCount),
    [history, savedWordCount],
  );
  const filteredHistory = useMemo(() => filterPracticeHistory(history, query), [history, query]);
  const groups = useMemo(() => groupPracticeHistoryByMonth(filteredHistory), [filteredHistory]);

  function handleDelete(entryId: string) {
    const confirmed = window.confirm("이 학습 기록을 삭제할까요? 삭제한 기록은 복구할 수 없습니다.");
    if (!confirmed) return;

    setHistory(deletePracticeHistoryEntry(entryId));
    setNotice("학습 기록을 삭제했습니다.");
  }

  function findRetryArticle(articleId: string): PracticeArticle | null {
    const currentArticle = getCurrentArticle();
    if (currentArticle?.id === articleId) return currentArticle;

    const starterArticle = starterLibrary.find((article) => article.id === articleId);
    if (!starterArticle) return null;

    return {
      ...starterArticle,
      createdAt: new Date().toISOString(),
    };
  }

  function handleRetry(articleId: string) {
    const article = findRetryArticle(articleId);
    if (!article) {
      setNotice("원문 본문은 학습 기록에 저장하지 않습니다. 홈에서 URL을 다시 불러오거나 글을 붙여 넣어 주세요.");
      return;
    }

    const retryArticle: PracticeArticle = {
      ...article,
      id: crypto.randomUUID(),
      title: `${article.title} · 다시 연습`,
      createdAt: new Date().toISOString(),
    };
    saveCurrentArticle(retryArticle);
    router.push(`/practice?session=${encodeURIComponent(retryArticle.id)}`);
  }

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

      <section aria-labelledby="history-search-title" className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <label id="history-search-title" htmlFor="history-search" className="block text-sm font-semibold">제목 또는 출처 검색</label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="history-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setNotice("");
            }}
            placeholder="예: Reuters, Inflation"
            className="min-h-11 flex-1 rounded-xl border border-zinc-300 bg-transparent px-4 py-2 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">
              검색 초기화
            </button>
          )}
        </div>
        <p className="mt-3 text-sm text-zinc-500">{query.trim() ? `${filteredHistory.length}개의 기록을 찾았습니다.` : `전체 ${history.length}개의 기록`}</p>
      </section>

      {notice && (
        <p role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {notice}
        </p>
      )}

      <HistoryList groups={groups} onDelete={handleDelete} onRetry={handleRetry} />
    </main>
  );
}
