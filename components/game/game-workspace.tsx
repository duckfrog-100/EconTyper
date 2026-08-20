"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GAME_PROMPTS, extendGamePromptQueue, selectGamePrompts } from "@/lib/game-content";
import {
  calculateCompletedPrompts,
  calculateGameAccuracy,
  calculateGameScore,
  createSpeedGameResult,
  getGameAnnouncement,
  getRemainingGameSeconds,
} from "@/lib/game-metrics";
import { createGameResultId, isNewPersonalBest, readSpeedGameStore, saveGameResult, writeSpeedGameStore } from "@/lib/game-storage";
import { buildCharacterStates, calculateWordsPerMinute, hasIncorrectCharacter, isTypingComplete } from "@/lib/practice-utils";
import { GameReady } from "@/components/game/game-ready";
import { GameResult } from "@/components/game/game-result";
import type { GameDurationSeconds, SpeedGameResult } from "@/types/game";

type Phase = "ready" | "playing" | "completed";

const PROMPT_QUEUE_SIZE = 20;

export function GameWorkspace() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [durationSeconds, setDurationSeconds] = useState<GameDurationSeconds>(60);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [typedByPrompt, setTypedByPrompt] = useState<Record<number, string>>({});
  const [currentTyped, setCurrentTyped] = useState("");
  const [hadWrongAttempt, setHadWrongAttempt] = useState(false);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [result, setResult] = useState<SpeedGameResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [accessibilityMessage, setAccessibilityMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const finishedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  const announcedCurrentRef = useRef("");

  const currentPrompt = prompts[currentPromptIndex] ?? "";

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === "playing" && startedAtMs !== null && inputRef.current) {
      inputRef.current.focus();
    }
    if (phase === "playing" && currentPromptIndex > 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase, currentPromptIndex, startedAtMs]);

  function scheduleAnnouncement(phaseForAnnouncement: Phase, remaining: number) {
    const announcement = getGameAnnouncement({
      phase: phaseForAnnouncement,
      remainingSeconds: remaining,
      wasAnnounced: announcedRef.current,
    });
    if (announcement && announcement.message !== announcedCurrentRef.current) {
      announcedCurrentRef.current = announcement.message;
      setAccessibilityMessage(announcement.message);
    }
  }

  function startGame(duration: GameDurationSeconds) {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    finishedRef.current = false;
    announcedRef.current = new Set<string>();
    announcedCurrentRef.current = "";
    setAccessibilityMessage("");
    const queue = selectGamePrompts(GAME_PROMPTS, PROMPT_QUEUE_SIZE);
    setDurationSeconds(duration);
    setPrompts(queue);
    setCurrentPromptIndex(0);
    setTypedByPrompt({});
    setCurrentTyped("");
    setHadWrongAttempt(false);
    setCurrentCombo(0);
    setMaxCombo(0);
    setRemainingSeconds(duration);
    setResult(null);
    setIsNewBest(false);
    setSaveError("");
    const started = Date.now();
    setStartedAtMs(started);
    setPhase("playing");

    scheduleAnnouncement("playing", duration);

    intervalRef.current = setInterval(() => {
      const remaining = getRemainingGameSeconds(started, duration, Date.now());
      setRemainingSeconds(remaining);
      scheduleAnnouncement("playing", remaining);
      if (remaining <= 0) finishGame();
    }, 1000);
  }

  function finishGame() {
    const targetPhase = phaseRef.current;
    if (targetPhase !== "playing") return;
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const finalTypedByPrompt = { ...typedByPromptRef.current };
    finalTypedByPrompt[currentPromptIndexRef.current] = currentTypedRef.current;

    const accuracyResult = calculateGameAccuracy(promptsRef.current, finalTypedByPrompt);
    const wpm = calculateWordsPerMinute(accuracyResult.totalTypedCharacters, durationRef.current);
    const score = calculateGameScore({ wpm, accuracy: accuracyResult.accuracy, maxCombo: maxComboRef.current });
    const completedPrompts = calculateCompletedPrompts(promptsRef.current, finalTypedByPrompt);

    const gameResult = createSpeedGameResult({
      id: createGameResultId(),
      playedAt: Date.now(),
      durationSeconds: durationRef.current,
      wpm,
      accuracy: accuracyResult.accuracy,
      score,
      maxCombo: maxComboRef.current,
      totalTypedCharacters: accuracyResult.totalTypedCharacters,
      correctCharacters: accuracyResult.correctCharacters,
      incorrectCharacters: accuracyResult.incorrectCharacters,
      completedPrompts,
    });

    const store = readSpeedGameStore();
    const previousBest = store.personalBests[gameResult.durationSeconds];
    const isBest = isNewPersonalBest(previousBest, gameResult);

    const nextStore = saveGameResult(store, gameResult);
    const ok = writeSpeedGameStore(nextStore);
    if (!ok) {
      setSaveError("기록 저장에 실패했습니다.");
      setIsNewBest(false);
    } else {
      setIsNewBest(isBest);
    }

    setResult(gameResult);
    setPhase("completed");
    scheduleAnnouncement("completed", 0);
  }

  function extendQueueIfNeeded(nextIndex: number) {
    if (nextIndex < promptsRef.current.length) return;
    const nextPrompts = extendGamePromptQueue({
      currentQueue: promptsRef.current,
      sourcePrompts: GAME_PROMPTS,
      batchSize: PROMPT_QUEUE_SIZE,
    });
    setPrompts(nextPrompts);
  }

  // refs로 최신 값에 안전하게 접근 (interval 클로저용)
  const phaseRef = useRef(phase);
  const promptsRef = useRef(prompts);
  const currentPromptIndexRef = useRef(currentPromptIndex);
  const typedByPromptRef = useRef(typedByPrompt);
  const currentTypedRef = useRef(currentTyped);
  const maxComboRef = useRef(maxCombo);
  const durationRef = useRef(durationSeconds);
  phaseRef.current = phase;
  promptsRef.current = prompts;
  currentPromptIndexRef.current = currentPromptIndex;
  typedByPromptRef.current = typedByPrompt;
  currentTypedRef.current = currentTyped;
  maxComboRef.current = maxCombo;
  durationRef.current = durationSeconds;

  const characterStates = useMemo(
    () => (phase === "playing" ? buildCharacterStates(currentPrompt, currentTyped) : []),
    [phase, currentPrompt, currentTyped],
  );

  function handleInputChange(value: string) {
    if (phase !== "playing" || finishedRef.current) return;
    setCurrentTyped(value);
    if (hasIncorrectCharacter(currentPrompt, value)) setHadWrongAttempt(true);

    if (isTypingComplete(currentPrompt, value)) {
      const nextTypedByPrompt = { ...typedByPromptRef.current, [currentPromptIndex]: value };
      setTypedByPrompt(nextTypedByPrompt);
      setCurrentTyped("");

      if (hadWrongAttemptRef.current) {
        setCurrentCombo(0);
      } else {
        setCurrentCombo((c) => {
          const next = c + 1;
          if (next > maxComboRef.current) setMaxCombo(next);
          return next;
        });
      }
      setHadWrongAttempt(false);

      const nextIndex = currentPromptIndex + 1;
      setCurrentPromptIndex(nextIndex);
      extendQueueIfNeeded(nextIndex);
    }
  }
  const hadWrongAttemptRef = useRef(hadWrongAttempt);
  hadWrongAttemptRef.current = hadWrongAttempt;

  if (phase === "ready") {
    return <GameReady onStart={startGame} />;
  }

  if (phase === "completed") {
    if (!result) return null;
    return <GameResult result={result} isNewBest={isNewBest} saveError={saveError} durationSeconds={durationSeconds} onReplay={() => startGame(durationSeconds)} onBackToReady={() => { setPhase("ready"); setResult(null); }} />;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-[0.18em] text-emerald-600 dark:text-emerald-400">영어필사차곡차곡</p>
        <Link href="/" className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700">← 홈으로</Link>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {/* 타이머는 시각적 갱신만 수행, 매초 스크린리더 안내 방지 */}
        <p aria-hidden="true" className="text-2xl font-semibold tabular-nums">남은 시간 {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</p>
        <p className="sr-only" role="status" aria-live="polite">{accessibilityMessage}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          콤보 <strong className="font-semibold text-emerald-700 dark:text-emerald-300">{currentCombo}</strong> · 최고 <strong className="font-semibold">{maxCombo}</strong>
        </p>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(remainingSeconds / durationSeconds) * 100}%` }} />
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">문장 {currentPromptIndex + 1}</p>
        <div className="mt-4 whitespace-pre-wrap break-words text-lg leading-relaxed">
          {characterStates.map((state, index) => (
            <span
              key={index}
              className={
                state.state === "correct"
                  ? "text-zinc-950 dark:text-zinc-50"
                  : state.state === "incorrect"
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-400 dark:text-zinc-600"
              }
            >
              {state.displayCharacter}
            </span>
          ))}
        </div>

        <label htmlFor="game-input" className="sr-only">현재 문장 입력</label>
        <textarea
          id="game-input"
          ref={inputRef}
          value={currentTyped}
          onChange={(event) => handleInputChange(event.target.value)}
          disabled={phase !== "playing"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={3}
          placeholder="여기에 문장을 입력하세요."
          className="mt-6 w-full resize-none rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-base leading-7 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-zinc-700"
        />
      </div>

      {saveError && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" role="alert">{saveError}</p>}
    </main>
  );
}