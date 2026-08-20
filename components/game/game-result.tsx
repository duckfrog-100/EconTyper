import Link from "next/link";
import type { GameDurationSeconds, SpeedGameResult } from "@/types/game";

export function GameResult({
  result,
  isNewBest,
  saveError,
  durationSeconds,
  onReplay,
  onBackToReady,
}: {
  result: SpeedGameResult;
  isNewBest: boolean;
  saveError: string;
  durationSeconds: GameDurationSeconds;
  onReplay: () => void;
  onBackToReady: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">타자 게임 완료</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{durationSeconds}초 게임</p>
        </div>
        <Link href="/" className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">← 홈으로</Link>
      </header>

      {isNewBest && (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" role="status">
          새로운 최고 기록!
        </p>
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <p className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{result.score.toLocaleString()}</p>
        <p className="mt-1 text-xs text-zinc-500">최종 점수</p>

        <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-xl font-semibold tabular-nums">{result.wpm} WPM · {result.accuracy}%</p>
          <p className="mt-1 text-xs text-zinc-500">최고 콤보 {result.maxCombo} · 완료 문장 {result.completedPrompts}</p>
        </div>

        {saveError && <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" role="alert">{saveError}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={onReplay} className="min-h-11 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950">같은 시간으로 다시 하기</button>
          <button type="button" onClick={onBackToReady} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">시간 다시 선택</button>
          <Link href="/" className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">홈으로</Link>
        </div>
      </div>
    </main>
  );
}