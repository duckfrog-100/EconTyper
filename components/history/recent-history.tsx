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
    <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">최근 학습</p>
          <h2 className="mt-2 text-xl font-semibold">차곡차곡 쌓인 기록</h2>
        </div>
        {recentEntries.length > 0 && (
          <Link href="/history" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            전체 보기 →
          </Link>
        )}
      </div>

      {recentEntries.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-zinc-50 px-4 py-6 text-sm leading-6 text-zinc-500 dark:bg-zinc-950">
          아직 완료한 필사가 없습니다. 첫 글을 끝내면 학습 기록이 여기에 쌓입니다.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-800">
          {recentEntries.map((entry) => (
            <article key={entry.id} className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-zinc-950 dark:text-zinc-50">{entry.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {[entry.sourceName, formatLocalDate(entry.completedAt)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="shrink-0 text-lg font-semibold text-emerald-700 dark:text-emerald-400">{Math.round(entry.accuracy)}%</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
