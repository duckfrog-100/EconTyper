"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readSavedWords } from "@/lib/vocabulary-storage";
import { readReviewStates, writeReviewStates } from "@/lib/review-storage";
import { prepareReviewSession, DEFAULT_DAILY_REVIEW_LIMIT } from "@/lib/review-session";
import { applyReviewRating, calculateReviewCompletionSummary, type ReviewSessionResult } from "@/lib/review-ui";
import type { ReviewRating, SavedWordReviewState } from "@/types/review";
import type { DueReviewItem } from "@/lib/review-selection";

type Phase = "ready" | "reviewing" | "completed";

export function ReviewWorkspace() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [dueItems, setDueItems] = useState<DueReviewItem[]>([]);
  const [reviewStates, setReviewStates] = useState<Record<string, SavedWordReviewState>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ReviewSessionResult[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedWords = readSavedWords();
    const states = readReviewStates();
    const result = prepareReviewSession({ savedWords, reviewStates: states, now: Date.now(), limit: DEFAULT_DAILY_REVIEW_LIMIT });
    if (result.changed) {
      const ok = writeReviewStates(result.syncedStates);
      if (!ok) setError("복습 상태 저장에 실패했습니다. 새로고침 후 다시 시도해 주세요.");
    }
    setDueItems(result.dueItems);
    setReviewStates(result.syncedStates);
    setLoaded(true);
  }, []);

  const current = dueItems[currentIndex];
  const completionSummary = useMemo(
    () => (phase === "completed" ? calculateReviewCompletionSummary({ results, reviewStates, now: Date.now() }) : null),
    [phase, results, reviewStates],
  );

  function handleRating(rating: ReviewRating) {
    if (!current || saving) return;
    setSaving(true);
    setError("");

    const nextStates = applyReviewRating(
      reviewStates,
      current.state.savedWordId,
      rating,
      Date.now(),
    );
    const ok = writeReviewStates(nextStates);
    if (!ok) {
      setError("복습 결과 저장에 실패했습니다. 다시 시도해 주세요.");
      setSaving(false);
      return;
    }

    setReviewStates(nextStates);
    setResults((prev) => [...prev, { savedWordId: current.state.savedWordId, rating }]);

    if (currentIndex + 1 >= dueItems.length) {
      setPhase("completed");
    } else {
      setCurrentIndex((i) => i + 1);
      setRevealed(false);
    }
    setSaving(false);
  }

  if (!loaded) return <main className="mx-auto max-w-2xl px-5 py-16 text-sm text-zinc-500">복습 준비 중…</main>;

  if (phase === "ready") {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">오늘의 복습</h1>
        {error && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" role="alert">{error}</p>}
        {dueItems.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
            <p className="text-lg font-semibold">오늘 복습할 단어가 없어요.</p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">새로 저장한 단어는 일정에 따라 복습에 표시됩니다.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/vocabulary" className="min-h-11 rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold dark:border-zinc-700">내 단어장</Link>
              <Link href="/" className="min-h-11 rounded-xl bg-zinc-950 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">필사 시작하기</Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <p className="text-base font-semibold">{dueItems.length}개의 단어가 준비되어 있어요.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => { setPhase("reviewing"); setCurrentIndex(0); setRevealed(false); }} className="min-h-11 rounded-xl bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950">복습 시작</button>
              <Link href="/vocabulary" className="min-h-11 rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold dark:border-zinc-700">단어장으로 돌아가기</Link>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (phase === "completed") {
    if (!completionSummary) return null;
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
        <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">오늘 복습 완료</h1>
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
          <p className="text-base font-semibold">{completionSummary.total}개 단어</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            알고 있음 {completionSummary.goodCount} · 헷갈림 {completionSummary.hardCount} · 모름 {completionSummary.againCount}
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{completionSummary.successRate}% <span className="text-sm font-medium">성공률</span></p>
          <div className="mt-4 border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400">오늘 다시 복습 {completionSummary.dueAgainCount}개 · 내일 {completionSummary.dueTomorrowCount}개 · 이후 {completionSummary.dueLaterCount}개</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">오늘 복습 다시 확인</button>
            <Link href="/vocabulary" className="min-h-11 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-950">단어장으로 돌아가기</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-center text-xs text-zinc-500">현재 {currentIndex + 1} / 전체 {dueItems.length} · {dueItems.length - currentIndex}개 남음</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(currentIndex / dueItems.length) * 100}%` }} />
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <h2 className="text-center text-3xl font-semibold break-words">{current.word.word}</h2>
        {(current.word.phonetic || current.word.partOfSpeech) && (
          <p className="mt-2 text-center text-xs text-zinc-500">
            {current.word.partOfSpeech ?? ""}{current.word.phonetic ? ` · ${current.word.phonetic}` : ""}
          </p>
        )}

        {revealed && (
          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <p className="text-lg font-medium leading-relaxed text-zinc-950 dark:text-zinc-50">{current.word.meaning}</p>
            {current.word.exampleSentence && <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">“{current.word.exampleSentence}”</p>}
            {current.word.sourceTitle && <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">{current.word.sourceTitle}</p>}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400" aria-live="polite">{error}</p>}

        {!revealed ? (
          <button type="button" onClick={() => setRevealed(true)} className="mt-8 w-full min-h-11 rounded-xl border border-zinc-300 px-5 py-2 text-sm font-semibold dark:border-zinc-700">뜻 보기</button>
        ) : (
          <div className="mt-8 grid grid-cols-3 gap-2">
            <button type="button" disabled={saving} aria-disabled={saving} onClick={() => handleRating("again")} className="min-h-11 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30">모름</button>
            <button type="button" disabled={saving} aria-disabled={saving} onClick={() => handleRating("hard")} className="min-h-11 rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/30">헷갈림</button>
            <button type="button" disabled={saving} aria-disabled={saving} onClick={() => handleRating("good")} className="min-h-11 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30">알고 있음</button>
          </div>
        )}
      </div>
    </main>
  );
}