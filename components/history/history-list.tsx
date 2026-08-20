"use client";

import Link from "next/link";
import { useState } from "react";
import { formatElapsedSeconds } from "@/lib/practice-timer";
import type { PracticeHistoryMonthGroup } from "@/types/history";

type HistoryListProps = {
  groups: PracticeHistoryMonthGroup[];
  onDelete: (entryId: string) => void;
  onRetry: (entryId: string) => void;
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
  const [expandedTextId, setExpandedTextId] = useState<string | null>(null);

  if (groups.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-zinc-300 px-5 py-14 text-center dark:border-zinc-700 sm:px-6 sm:py-16">
        <h2 className="text-lg font-semibold">조건에 맞는 학습 기록이 없습니다.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
          검색어를 바꾸거나 새로운 글을 끝까지 필사해 보세요.
        </p>
        <Link href="/#practice-start" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
          새 필사 시작하기
        </Link>
      </section>
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {groups.map((group) => (
        <section key={group.monthKey}>
          <h2 className="text-lg font-semibold tracking-tight">{formatMonth(group.monthKey)}</h2>
          <div className="mt-3 space-y-2">
            {group.entries.map((entry) => {
              const isExpanded = expandedTextId === entry.id;
              return (
                <article key={entry.id} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {entry.sourceName && (
                          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{entry.sourceName}</p>
                        )}
                        <h3 className="mt-0.5 text-sm font-semibold text-zinc-950 dark:text-zinc-50">{entry.title}</h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatLocalDateTime(entry.completedAt)}
                          {" · "}
                          {entry.sentenceCount}문장 · {entry.typedCharacters.toLocaleString()}자
                          {entry.wordsPerMinute !== undefined && ` · ${entry.wordsPerMinute} WPM`}
                          {entry.elapsedSeconds !== undefined && ` · ${formatElapsedSeconds(entry.elapsedSeconds)}`}
                        </p>
                      </div>
                      <p className="shrink-0 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{Math.round(entry.accuracy)}%</p>
                    </div>

                    {entry.sourceText && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setExpandedTextId(isExpanded ? null : entry.id)}
                          className="text-xs font-semibold text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                        >
                          {isExpanded ? "원문 접기" : "원문 보기"}
                        </button>
                        {isExpanded && (
                          <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                            {entry.sourceText}
                          </p>
                        )}
                      </div>
                    )}
                    {!entry.sourceText && (
                      <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">이 기록은 이전 버전에서 저장되어 원문을 확인할 수 없습니다.</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => onRetry(entry.id)}
                        className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold dark:border-zinc-700"
                      >
                        다시 연습
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(entry.id)}
                        className="min-h-11 rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 dark:border-red-900 dark:text-red-300"
                      >
                        기록 삭제
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}