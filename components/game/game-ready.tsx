import Link from "next/link";
import { useEffect, useState } from "react";
import { readSpeedGameStore } from "@/lib/game-storage";
import type { GameDurationSeconds } from "@/types/game";

const DURATIONS: GameDurationSeconds[] = [30, 60, 120];

export function GameReady({ onStart }: { onStart: (duration: GameDurationSeconds) => void }) {
  const [selected, setSelected] = useState<GameDurationSeconds>(60);
  const [personalBests, setPersonalBests] = useState<Record<GameDurationSeconds, number | null>>({ "30": null, "60": null, "120": null });

  useEffect(() => {
    const store = readSpeedGameStore();
    setPersonalBests({
      "30": store.personalBests["30"]?.score ?? null,
      "60": store.personalBests["60"]?.score ?? null,
      "120": store.personalBests["120"]?.score ?? null,
    });
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <header>
          <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">타자 속도 게임</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">정확하게, 그리고 빠르게.</p>
        </header>
        <Link href="/" className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">← 홈으로</Link>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">제한 시간 선택</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {DURATIONS.map((duration) => {
            const active = selected === duration;
            const best = personalBests[duration];
            return (
              <button
                key={duration}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(duration)}
                className={`min-h-11 rounded-xl border px-3 py-2 text-center transition ${active ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700"}`}
              >
                <span className={`block text-base font-semibold ${active ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-950 dark:text-zinc-50"}`}>{duration}초</span>
                <span className="mt-0.5 block text-[11px] text-zinc-500">
                  {best === null ? "기록 없음" : `${best.toLocaleString()}점`}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onStart(selected)}
          className="mt-6 min-h-11 w-full rounded-xl bg-zinc-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
        >
          게임 시작
        </button>
      </div>
    </main>
  );
}