"use client";

import Link from "next/link";
import type { PracticeHistoryMonthGroup } from "@/types/history";

type HistoryListProps = {
  groups: PracticeHistoryMonthGroup[];
  onDelete: (entryId: string) => void;
  onRetry: (articleId: string) => void;
};

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
}

function formatLocalDateTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HistoryList({ groups, onDelete, onRetry }: HistoryListProps) {
  if (groups.length === 0) {
    return (
      <section className="mt-8 rounded-3xl border border-dashed border-zinc-300 px-5 py-14 text-center dark:border-zinc-700 sm:px-6 sm:py-16">
        <h2 className="text-xl font-semibold">조건에 맞는 학습 기록이 없습니다.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
          검색어를 바꾸거나 새로운 글을 끝까지 필사해 보세요.
        </p>
        <Link href="/#start-practice" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
          새 필사 시작하기
        </Link>
      </section>
    );
  }

  return (
    <div className="mt-10 space-y-12">
      {groups.map((group) => (
        <section key={group.monthKey}>
          <h2 className="text-xl font-semibold tracking-tight">{formatMonth(group.monthKey)}</h2>
          <div className="mt-4 space-y-4">
            {group.entries.map((entry) => (
              <article key={entry.id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    {entry.sourceName && <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{entry.sourceName}</p>}
                    <h3 className="mt-1 break-words text-lg font-semibold text-zinc-950 dark:text-zinc-50">{entry.title}</h3>
                    <p className="mt-2 text-sm text-zinc-500">{formatLocalDateTime(entry.completedAt)}</p>
                  </div>
                  <p className="shrink-0 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{Math.round(entry.accuracy)}%</p>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-zinc-200 pt-5 text-sm dark:border-zinc-800 sm:grid-cols-4">
                  <div><dt className="text-zinc-500">완료 문장</dt><dd className="mt-1 font-semibold">{entry.sentenceCount.toLocaleString()}개</dd></div>
                  <div><dt className="text-zinc-500">입력 글자</dt><dd className="mt-1 font-semibold">{entry.typedCharacters.toLocaleString()}자</dd></div>
                  <div><dt className="text-zinc-500">실수 문장</dt><dd className="mt-1 font-semibold">{entry.wrongSentenceCount.toLocaleString()}개</dd></div>
                  <div><dt className="text-zinc-500">학습 단어</dt><dd className="mt-1 font-semibold">{entry.sessionWordCount.toLocaleString()}개</dd></div>
                </dl>
                <div className="mt-5 flex flex-col gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-800 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => onRetry(entry.articleId)} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">
                    다시 연습
                  </button>
                  <button type="button" onClick={() => onDelete(entry.id)} className="min-h-11 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:text-red-300">
                    기록 삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
