import { describe, expect, it } from "vitest";
import {
  getRemainingGameSeconds,
  calculateGameAccuracy,
  calculateGameScore,
  calculateCompletedPrompts,
  createSpeedGameResult,
  getGameAnnouncement,
} from "./game-metrics";

describe("getRemainingGameSeconds", () => {
  it("시작 직후", () => {
    expect(getRemainingGameSeconds(1000, 30, 1000)).toBe(30);
  });
  it("중간 시점", () => {
    expect(getRemainingGameSeconds(1000, 60, 25000)).toBe(36); // 60 - 24 = 36
  });
  it("종료 시 0", () => {
    expect(getRemainingGameSeconds(1000, 30, 31000)).toBe(0);
  });
  it("음수 clamp 0", () => {
    expect(getRemainingGameSeconds(1000, 30, 100000)).toBe(0);
  });
  it("비정상 입력 → 0", () => {
    expect(getRemainingGameSeconds(Number.NaN, 30, 1000)).toBe(0);
  });
});

describe("calculateGameAccuracy", () => {
  it("전체 정답", () => {
    const r = calculateGameAccuracy(["abc"], { 0: "abc" });
    expect(r).toEqual({ totalTypedCharacters: 3, correctCharacters: 3, incorrectCharacters: 0, accuracy: 100 });
  });
  it("일부 오답", () => {
    const r = calculateGameAccuracy(["abc"], { 0: "abd" });
    expect(r).toEqual({ totalTypedCharacters: 3, correctCharacters: 2, incorrectCharacters: 1, accuracy: 67 });
  });
  it("미완성 문장 포함", () => {
    const r = calculateGameAccuracy(["abcdef"], { 0: "abc" });
    expect(r).toEqual({ totalTypedCharacters: 3, correctCharacters: 3, incorrectCharacters: 0, accuracy: 100 });
  });
  it("입력 0 → accuracy 0", () => {
    const r = calculateGameAccuracy(["abc"], {});
    expect(r).toEqual({ totalTypedCharacters: 0, correctCharacters: 0, incorrectCharacters: 0, accuracy: 0 });
  });
  it("여러 문장 집계", () => {
    const r = calculateGameAccuracy(["abc", "def"], { 0: "abc", 1: "dex" });
    expect(r).toEqual({ totalTypedCharacters: 6, correctCharacters: 5, incorrectCharacters: 1, accuracy: 83 });
  });
  it("원본 mutate 안 함", () => {
    const prompts = ["abc"];
    const typed = { 0: "abc" };
    calculateGameAccuracy(prompts, typed);
    expect(prompts).toEqual(["abc"]);
    expect(typed).toEqual({ 0: "abc" });
  });
});

describe("calculateGameScore", () => {
  it("정확도 높을수록 점수 증가", () => {
    const base = { wpm: 50, maxCombo: 5 };
    const low = calculateGameScore({ ...base, accuracy: 80 });
    const high = calculateGameScore({ ...base, accuracy: 100 });
    expect(high).toBeGreaterThan(low);
  });
  it("정확도 0 → 0", () => {
    expect(calculateGameScore({ wpm: 50, accuracy: 0, maxCombo: 5 })).toBe(0);
  });
  it("콤보 증가 효과", () => {
    const c0 = calculateGameScore({ wpm: 50, accuracy: 100, maxCombo: 0 });
    const c5 = calculateGameScore({ wpm: 50, accuracy: 100, maxCombo: 5 });
    const c20 = calculateGameScore({ wpm: 50, accuracy: 100, maxCombo: 20 });
    const c50 = calculateGameScore({ wpm: 50, accuracy: 100, maxCombo: 50 });
    expect(c5).toBeGreaterThan(c0);
    expect(c20).toBeGreaterThan(c5);
    expect(c50).toBe(c20); // 콤보 상한 20
  });
  it("NaN/음수 방어", () => {
    expect(calculateGameScore({ wpm: Number.NaN, accuracy: 100, maxCombo: 5 })).toBe(0);
    expect(calculateGameScore({ wpm: 50, accuracy: -10, maxCombo: 5 })).toBe(0);
    expect(calculateGameScore({ wpm: -5, accuracy: 100, maxCombo: 5 })).toBe(0);
  });
  it("정수 반환", () => {
    const score = calculateGameScore({ wpm: 50, accuracy: 98, maxCombo: 8 });
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe("calculateCompletedPrompts", () => {
  it("완벽한 문장만 완료로 집계", () => {
    const prompts = ["abc", "def", "ghi"];
    const typed = { 0: "abc", 1: "deX", 2: "" };
    expect(calculateCompletedPrompts(prompts, typed)).toBe(1);
  });
  it("입력 없음 → 0", () => {
    expect(calculateCompletedPrompts(["abc"], {})).toBe(0);
  });
});

describe("getGameAnnouncement", () => {
  const announced = () => new Set<string>();

  it("게임 시작 시 한 번만 안내", () => {
    const set = announced();
    const first = getGameAnnouncement({ phase: "playing", remainingSeconds: 30, wasAnnounced: set });
    expect(first?.message).toBe("게임이 시작되었습니다.");
    const second = getGameAnnouncement({ phase: "playing", remainingSeconds: 20, wasAnnounced: set });
    expect(second).toBeNull();
  });

  it("10초/5초 시점에 각각 안내, 중복 없음", () => {
    const set = announced();
    getGameAnnouncement({ phase: "playing", remainingSeconds: 30, wasAnnounced: set });
    const ten = getGameAnnouncement({ phase: "playing", remainingSeconds: 10, wasAnnounced: set });
    expect(ten?.message).toBe("10초 남았습니다.");
    expect(getGameAnnouncement({ phase: "playing", remainingSeconds: 9, wasAnnounced: set })).toBeNull();
    const five = getGameAnnouncement({ phase: "playing", remainingSeconds: 5, wasAnnounced: set });
    expect(five?.message).toBe("5초 남았습니다.");
    expect(getGameAnnouncement({ phase: "playing", remainingSeconds: 5, wasAnnounced: set })).toBeNull();
  });

  it("일반 구간에서는 안내 없음", () => {
    const set = announced();
    getGameAnnouncement({ phase: "playing", remainingSeconds: 30, wasAnnounced: set });
    expect(getGameAnnouncement({ phase: "playing", remainingSeconds: 15, wasAnnounced: set })).toBeNull();
  });

  it("게임 종료 시 안내", () => {
    const set = announced();
    const end = getGameAnnouncement({ phase: "completed", remainingSeconds: 0, wasAnnounced: set });
    expect(end?.message).toBe("게임이 종료되었습니다.");
    expect(getGameAnnouncement({ phase: "completed", remainingSeconds: 0, wasAnnounced: set })).toBeNull();
  });
});

describe("createSpeedGameResult", () => {
  it("결과 필드 생성", () => {
    const r = createSpeedGameResult({
      id: "id1", playedAt: 100, durationSeconds: 60,
      wpm: 50, accuracy: 90, score: 4000, maxCombo: 8,
      totalTypedCharacters: 100, correctCharacters: 90, incorrectCharacters: 10,
      completedPrompts: 3,
    });
    expect(r.id).toBe("id1");
    expect(r.durationSeconds).toBe(60);
    expect(r.wpm).toBe(50);
    expect(r.accuracy).toBe(90);
    expect(r.score).toBe(4000);
    expect(r.maxCombo).toBe(8);
    expect(r.completedPrompts).toBe(3);
  });
  it("duration 30/120 지원", () => {
    const r30 = createSpeedGameResult({
      id: "a", playedAt: 0, durationSeconds: 30, wpm: 0, accuracy: 0, score: 0, maxCombo: 0,
      totalTypedCharacters: 0, correctCharacters: 0, incorrectCharacters: 0, completedPrompts: 0,
    });
    const r120 = { ...r30, id: "b", durationSeconds: 120 as const };
    expect(r30.durationSeconds).toBe(30);
    expect(r120.durationSeconds).toBe(120);
  });
});