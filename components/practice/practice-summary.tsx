"use client";

import type { SavedWord } from "@/types/vocabulary";

type PracticeSummaryProps = {
  sourceName?: string;
  title: string;
  completedCount: number;
  totalSentences: number;
  totalTyped: number;
  accuracy: number;
  wrongCount: number;
  sessionWords: SavedWord[];
  savedWordsCount: number;
  onRetryWrong: () => void;
  onRetryAll: () => void;
  onReturnHome: () => void;
};

export function PracticeSummary({
  sourceName,
  title,
  completedCount,
  totalSentences,
  totalTyped,
  accuracy,
  wrongCount,
  sessionWords,
  savedWordsCount,
  onRetryWrong,
  onRetryAll,
  onReturnHome,
}: PracticeSummaryProps) {
  const recentWords = [...sessionWords].sort((a, b) => b.addedAt - a.addedAt);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">학습 완료</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {sourceName && <p className="mt-3 text-zinc-500">{sourceName}</p>}
        <p className="mt-6 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
          기사 한 편을 끝냈습니다. 총 {totalTyped.toLocaleString()}자를 입력했고, {sessionWords.length}개의 단어를 확인했습니다.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryMetric label="완료 문장" value={`${completedCount} / ${totalSentences}`} />
          <SummaryMetric label="전체 정확도" value={`${accuracy}%`} />
          <SummaryMetric label="실수 문장" value={`${wrongCount}`} />
          <SummaryMetric label="오늘 단어" value={`${sessionWords.length}`} />
          <SummaryMetric label="내 단어" value={`${savedWordsCount}`} />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={wrongCount === 0}
            onClick={onRetryWrong}
            className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
          >
            틀린 문장 다시 연습
          </button>
          <button type="button" onClick={onRetryAll} className="rounded-2xl border border-zinc-300 px-5 py-3 font-semibold dark:border-zinc-700">
            전체 다시 연습
          </button>
          <button type="button" onClick={onReturnHome} className="rounded-2xl border border-zinc-300 px-5 py-3 font-semibold dark:border-zinc-700">
            홈으로
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">오늘 확인한 단어</h2>
          <span className="text-sm text-zinc-500">최근 확인 순</span>
        </div>
        {recentWords.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-500">이번 학습에서 확인한 단어가 없습니다.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {recentWords.map((word) => (
              <li key={word.word} className="rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <strong className="block text-zinc-950 dark:text-zinc-50">{word.word}</strong>
                <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">{word.meaning}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-100 px-4 py-4 dark:bg-zinc-800">
      <span className="block text-xs text-zinc-500">{label}</span>
      <strong className="mt-1 block text-xl">{value}</strong>
    </div>
  );
}
