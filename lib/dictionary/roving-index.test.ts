import { describe, expect, it } from "vitest";
import { getNextDictionaryIndex } from "./roving-index";

describe("getNextDictionaryIndex", () => {
  it("moves to next index with ArrowRight", () => {
    expect(getNextDictionaryIndex(0, "next", 5)).toBe(1);
    expect(getNextDictionaryIndex(3, "next", 5)).toBe(4);
  });

  it("moves to previous index with ArrowLeft", () => {
    expect(getNextDictionaryIndex(4, "previous", 5)).toBe(3);
    expect(getNextDictionaryIndex(1, "previous", 5)).toBe(0);
  });

  it("stays at first index on ArrowLeft at boundary", () => {
    expect(getNextDictionaryIndex(0, "previous", 5)).toBe(0);
  });

  it("stays at last index on ArrowRight at boundary", () => {
    expect(getNextDictionaryIndex(4, "next", 5)).toBe(4);
  });

  it("does not wrap around from first to last", () => {
    expect(getNextDictionaryIndex(0, "previous", 5)).toBe(0);
  });

  it("does not wrap around from last to first", () => {
    expect(getNextDictionaryIndex(4, "next", 5)).toBe(4);
  });

  it("returns 0 safely when item count is 0", () => {
    expect(getNextDictionaryIndex(0, "next", 0)).toBe(0);
  });

  it("returns 0 safely when item count is negative", () => {
    expect(getNextDictionaryIndex(0, "next", -1)).toBe(0);
  });

  it("resets index when item count changes from 0 to non-zero", () => {
    expect(getNextDictionaryIndex(0, "next", 1)).toBe(0);
  });

  it("does not mutate its inputs", () => {
    const index = 2;
    const count = 5;
    getNextDictionaryIndex(index, "next", count);
    expect(index).toBe(2);
    expect(count).toBe(5);
  });

  it("handles single item without moving", () => {
    expect(getNextDictionaryIndex(0, "next", 1)).toBe(0);
    expect(getNextDictionaryIndex(0, "previous", 1)).toBe(0);
  });
});