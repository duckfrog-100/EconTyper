import type { PracticeHistorySummary as PracticeHistorySummaryValue } from "@/types/history";

type HistorySummaryProps = {
  summary: PracticeHistorySummaryValue;
  compact?: boolean;
};

export function HistorySummary({ summary, compact = false }: HistorySummaryProps) {
  const items = [
    { label: "총 학습", value: `${summary.totalSessions.toLocaleString()}회` },
    { label: "연속 학습", value: `${summary.currentStreakDays.toLocaleString()}일` },
    { label: "총 입력", value: `${summary.totalTypedCharacters.toLocaleString()}자` },
    { label: "내 단어", value: `${summary.savedWordCount.toLocaleString()}개` },
  ];

  return (
    <section aria-label="학습 요약" className={`grid gap-3 ${compact ? "grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
      {items.map((item) => (
        <article key={item.label} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <p className="text-xs font-semibold tracking-wide text-zinc-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
