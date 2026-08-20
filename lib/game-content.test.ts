import { describe, expect, it } from "vitest";
import { GAME_PROMPTS, extendGamePromptQueue, selectGamePrompts } from "./game-content";

describe("GAME_PROMPTS", () => {
  it("최소 30문장", () => {
    expect(GAME_PROMPTS.length).toBeGreaterThanOrEqual(30);
  });
  it("모든 문장이 40~120자", () => {
    for (const prompt of GAME_PROMPTS) {
      expect(prompt.length).toBeGreaterThanOrEqual(40);
      expect(prompt.length).toBeLessThanOrEqual(120);
    }
  });
});

describe("extendGamePromptQueue", () => {
  const source = ["a", "b", "c", "d", "e"];

  it("기존 queue에 새 batch 추가", () => {
    const result = extendGamePromptQueue({ currentQueue: ["x"], sourcePrompts: source, batchSize: 3, random: () => 0 });
    expect(result).toHaveLength(4);
    expect(result[0]).toBe("x");
    expect(result.slice(1)).toEqual(source.slice(0, 3));
  });

  it("원본 queue와 source mutate 안 함", () => {
    const queue = ["x", "y"];
    const sourceCopy = [...source];
    extendGamePromptQueue({ currentQueue: queue, sourcePrompts: source, batchSize: 3, random: () => 0 });
    expect(queue).toEqual(["x", "y"]);
    expect(source).toEqual(sourceCopy);
  });

  it("source가 빈 배열이면 기존 queue 유지", () => {
    const queue = ["x", "y"];
    const result = extendGamePromptQueue({ currentQueue: queue, sourcePrompts: [], batchSize: 3 });
    expect(result).toEqual(["x", "y"]);
    expect(result).not.toBe(queue);
  });

  it("source가 1개면 반복 허용", () => {
    const result = extendGamePromptQueue({ currentQueue: ["x"], sourcePrompts: ["a"], batchSize: 3 });
    expect(result).toEqual(["x", "a", "a", "a"]);
  });

  it("직전 문장과 새 첫 문장이 같으면 순서 조정", () => {
    // random=0 → selectGamePrompts가 source 처음부터 선택하도록 구성
    // queue 마지막 == source[0] 인 경우를 만들기 위해 source[0]을 직전 문장과 동일하게
    const awkwardSource = ["a", "b", "c"];
    const result = extendGamePromptQueue({ currentQueue: ["a"], sourcePrompts: awkwardSource, batchSize: 2, random: () => 0 });
    // selectGamePrompts(awkwardSource, 2, () => 0) → ["a", "b"], 첫 문장이 "a"로 직전과 같음 → 순서 조정 ["b", "a"]
    expect(result[0]).toBe("a");
    expect(result[1]).toBe("b");
    expect(result[2]).toBe("a");
  });

  it("queue가 20개를 넘어 계속 확장 가능", () => {
    const queue = Array.from({ length: 20 }, (_, i) => `p${i}`);
    const result = extendGamePromptQueue({ currentQueue: queue, sourcePrompts: source, batchSize: 20, random: () => 0 });
    expect(result).toHaveLength(40);
  });

  it("deterministic RNG 주입", () => {
    const result1 = extendGamePromptQueue({ currentQueue: ["x"], sourcePrompts: source, batchSize: 2, random: () => 0 });
    const result2 = extendGamePromptQueue({ currentQueue: ["x"], sourcePrompts: source, batchSize: 2, random: () => 0 });
    expect(result1).toEqual(result2);
  });
});

describe("selectGamePrompts", () => {
  it("빈 배열 → 빈 배열", () => {
    expect(selectGamePrompts([], 3)).toEqual([]);
    expect(selectGamePrompts([], 0)).toEqual([]);
  });

  it("count 제한", () => {
    const result = selectGamePrompts(GAME_PROMPTS, 5);
    expect(result).toHaveLength(5);
  });

  it("count가 문장 수보다 크거나 같으면 전체 반환 (반복 없음)", () => {
    const result = selectGamePrompts(["a", "b", "c"], 3);
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
  });

  it("RNG 주입이 가능하고 선택 순서를 제어", () => {
    const result = selectGamePrompts(["a", "b", "c", "d"], 2, () => 0);
    expect(result).toEqual(["a", "b"]);
  });

  it("같은 세션 내 중복 최소화 (count < length)", () => {
    const result = selectGamePrompts(["a", "b", "c", "d"], 4);
    expect(new Set(result).size).toBe(4);
  });

  it("원본 mutate 안 함", () => {
    const original = ["a", "b", "c"];
    selectGamePrompts(original, 2, () => 0);
    expect(original).toEqual(["a", "b", "c"]);
  });
});