export type PracticeTimerState = {
  startedAtMs: number | null;
  endedAtMs: number | null;
};

export function createPracticeTimer(): PracticeTimerState {
  return { startedAtMs: null, endedAtMs: null };
}

export function startPracticeTimer(state: PracticeTimerState, nowMs: number): PracticeTimerState {
  if (state.startedAtMs !== null) return state;
  return { startedAtMs: nowMs, endedAtMs: null };
}

export function finishPracticeTimer(state: PracticeTimerState, nowMs: number): PracticeTimerState {
  if (state.startedAtMs === null || state.endedAtMs !== null) return state;
  return { startedAtMs: state.startedAtMs, endedAtMs: nowMs };
}

export function getElapsedSeconds(state: PracticeTimerState, nowMs: number): number {
  if (state.startedAtMs === null) return 0;
  const endMs = state.endedAtMs ?? nowMs;
  return Math.max(0, Math.floor((endMs - state.startedAtMs) / 1000));
}

export function formatElapsedSeconds(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}분 ${remainder}초` : `${remainder}초`;
}
