import Link from "next/link";
import type { PracticeHistoryEntry } from "@/types/history";

type RecentHistoryProps = {
  entries: PracticeHistoryEntry[];
};

function formatLocalDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function RecentHistory({ entries }: RecentHistoryProps) {
  const recentEntries = entries.slice(0, 3);

  return (
    <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">최근 학습</p>
          <h2 className="mt-2 text-xl font-semibold">차곡차곡 쌓인 기록</h2>
        </div>
        {recentEntries.length > 0 && (
          <Link href="/history" className="rounded-xl px-2 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
            전체 보기 →
          </Link>
        )}
      </div>

      {recentEntries.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-5">
          <p className="text-sm leading-6 text-zinc-500">아직 완료한 필사가 없습니다. 첫 글을 끝내면 학습 기록이 여기에 쌓입니다.</p>
          <a href="#practice-start" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
            첫 필사 시작하기
          </a>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-800">
          {recentEntries.map((entry) => (
            <article key={entry.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-zinc-950 dark:text-zinc-50 sm:truncate">{entry.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {[entry.sourceName, formatLocalDate(entry.completedAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="shrink-0 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="mr-1 text-xs font-medium text-zinc-500 sm:hidden">정확도</span>
                {Math.round(entry.accuracy)}%
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
