import { describe, expect, it } from "vitest";
import {
  createPracticeTimer,
  finishPracticeTimer,
  formatElapsedSeconds,
  getElapsedSeconds,
  startPracticeTimer,
} from "./practice-timer";

describe("practice timer", () => {
  it("starts empty", () => {
    expect(createPracticeTimer()).toEqual({ startedAtMs: null, endedAtMs: null });
  });

  it("starts at the given time", () => {
    expect(startPracticeTimer(createPracticeTimer(), 1000)).toEqual({ startedAtMs: 1000, endedAtMs: null });
  });

  it("keeps the original start time when started again", () => {
    const started = startPracticeTimer(createPracticeTimer(), 1000);
    expect(startPracticeTimer(started, 2000)).toBe(started);
  });

  it("ignores finish before start", () => {
    const timer = createPracticeTimer();
    expect(finishPracticeTimer(timer, 5000)).toBe(timer);
  });

  it("fixes the end time on finish", () => {
    const started = startPracticeTimer(createPracticeTimer(), 1000);
    expect(finishPracticeTimer(started, 4000)).toEqual({ startedAtMs: 1000, endedAtMs: 4000 });
  });

  it("never resets the end time once finished", () => {
    const started = startPracticeTimer(createPracticeTimer(), 1000);
    const finished = finishPracticeTimer(started, 4000);
    expect(finishPracticeTimer(finished, 9000)).toBe(finished);
  });

  it("reports zero elapsed before the first valid input", () => {
    expect(getElapsedSeconds(createPracticeTimer(), 12345)).toBe(0);
  });

  it("reports elapsed seconds against the current time while running", () => {
    const started = startPracticeTimer(createPracticeTimer(), 10_000);
    expect(getElapsedSeconds(started, 10_000)).toBe(0);
    expect(getElapsedSeconds(started, 15_500)).toBe(5);
    expect(getElapsedSeconds(started, 15_999)).toBe(5);
  });

  it("freezes elapsed time after finish", () => {
    const started = startPracticeTimer(createPracticeTimer(), 10_000);
    const finished = finishPracticeTimer(started, 16_000);
    expect(getElapsedSeconds(finished, 16_000)).toBe(6);
    expect(getElapsedSeconds(finished, 999_999)).toBe(6);
  });

  it("never reports negative elapsed time", () => {
    const started = startPracticeTimer(createPracticeTimer(), 10_000);
    expect(getElapsedSeconds(started, 4_000)).toBe(0);
  });
});

describe("formatElapsedSeconds", () => {
  it("formats sub-minute values as seconds only", () => {
    expect(formatElapsedSeconds(0)).toBe("0초");
    expect(formatElapsedSeconds(59)).toBe("59초");
  });

  it("formats minute boundaries", () => {
    expect(formatElapsedSeconds(60)).toBe("1분 0초");
    expect(formatElapsedSeconds(61)).toBe("1분 1초");
  });

  it("formats hour-long sessions in minutes", () => {
    expect(formatElapsedSeconds(3600)).toBe("60분 0초");
  });

  it("floors fractional and negative input", () => {
    expect(formatElapsedSeconds(5.9)).toBe("5초");
    expect(formatElapsedSeconds(-10)).toBe("0초");
  });
});
