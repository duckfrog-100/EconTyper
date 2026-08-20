import { normalizeComparableCharacter, getComparableCharacters } from "@/lib/practice-utils";
import type { GameDurationSeconds, SpeedGameResult } from "@/types/game";

export function getRemainingGameSeconds(startedAtMs: number, durationSeconds: number, nowMs: number): number {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(durationSeconds) || !Number.isFinite(nowMs)) return 0;
  const remaining = durationSeconds - (nowMs - startedAtMs) / 1000;
  return Math.max(0, Math.floor(remaining));
}

export type GameAccuracyResult = {
  totalTypedCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  accuracy: number;
};

export function calculateGameAccuracy(
  prompts: string[],
  typedByPrompt: Record<number, string>,
): GameAccuracyResult {
  let totalTypedCharacters = 0;
  let correctCharacters = 0;

  prompts.forEach((prompt, index) => {
    const comparableTarget = getComparableCharacters(prompt);
    const comparableTyped = getComparableCharacters(typedByPrompt[index] ?? "");
    totalTypedCharacters += comparableTyped.length;
    correctCharacters += comparableTyped.reduce(
      (count, character, charIndex) => count + (
        charIndex < comparableTarget.length && character === comparableTarget[charIndex] ? 1 : 0
      ),
      0,
    );
  });

  const incorrectCharacters = totalTypedCharacters - correctCharacters;
  const accuracy = totalTypedCharacters === 0 ? 0 : Math.round((correctCharacters / totalTypedCharacters) * 100);
  return { totalTypedCharacters, correctCharacters, incorrectCharacters, accuracy };
}

export function calculateGameScore({
  wpm,
  accuracy,
  maxCombo,
}: {
  wpm: number;
  accuracy: number;
  maxCombo: number;
}): number {
  const safeWpm = Number.isFinite(wpm) && wpm > 0 ? wpm : 0;
  const safeAccuracy = Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : 0;
  const safeMaxCombo = Number.isFinite(maxCombo) && maxCombo >= 0 ? maxCombo : 0;

  const accuracyFactor = Math.pow(safeAccuracy / 100, 2);
  const comboBonus = 1 + Math.min(safeMaxCombo, 20) * 0.02;
  const score = safeWpm * accuracyFactor * comboBonus * 100;
  return Math.round(score);
}

export function calculateCompletedPrompts(
  prompts: string[],
  typedByPrompt: Record<number, string>,
): number {
  let completed = 0;
  prompts.forEach((prompt, index) => {
    const comparableTarget = getComparableCharacters(prompt);
    const comparableTyped = getComparableCharacters(typedByPrompt[index] ?? "");
    if (comparableTarget.length !== comparableTyped.length) return;
    const allCorrect = comparableTarget.every((character, charIndex) => character === comparableTyped[charIndex]);
    if (allCorrect) completed += 1;
  });
  return completed;
}

export type GameAnnouncement = {
  message: string;
  key: string;
};

/**
 * 주요 시점에서만 접근성 안내 메시지를 반환한다.
 * - 매초 반복 금지: wasAnnounced Set으로 한 번만 반환
 * - 게임 시작 / 10초 / 5초 / 게임 종료
 */
export function getGameAnnouncement({
  phase,
  remainingSeconds,
  wasAnnounced,
}: {
  phase: "ready" | "playing" | "completed";
  remainingSeconds: number;
  wasAnnounced: Set<string>;
}): GameAnnouncement | null {
  const announce = (key: string, message: string): GameAnnouncement | null => {
    if (wasAnnounced.has(key)) return null;
    wasAnnounced.add(key);
    return { key, message };
  };

  if (phase === "playing") {
    if (!wasAnnounced.has("start")) {
      wasAnnounced.add("start");
      return { key: "start", message: "게임이 시작되었습니다." };
    }
    if (remainingSeconds === 10) return announce("10", "10초 남았습니다.");
    if (remainingSeconds === 5) return announce("5", "5초 남았습니다.");
    return null;
  }

  if (phase === "completed") {
    return announce("end", "게임이 종료되었습니다.");
  }

  return null;
}

export function createSpeedGameResult({
  id,
  playedAt,
  durationSeconds,
  wpm,
  accuracy,
  score,
  maxCombo,
  totalTypedCharacters,
  correctCharacters,
  incorrectCharacters,
  completedPrompts,
}: {
  id: string;
  playedAt: number;
  durationSeconds: GameDurationSeconds;
  wpm: number;
  accuracy: number;
  score: number;
  maxCombo: number;
  totalTypedCharacters: number;
  correctCharacters: number;
  incorrectCharacters: number;
  completedPrompts: number;
}): SpeedGameResult {
  return {
    id,
    playedAt,
    durationSeconds,
    wpm,
    accuracy,
    score,
    maxCombo,
    totalTypedCharacters,
    correctCharacters,
    incorrectCharacters,
    completedPrompts,
  };
}