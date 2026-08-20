import { describe, expect, it } from "vitest";
import { normalizeDictionaryCandidates } from "./normalize";

describe("normalizeDictionaryCandidates", () => {
  it("빈 배열을 넣으면 빈 배열을 반환한다", () => {
    expect(normalizeDictionaryCandidates([])).toEqual([]);
  });

  it("빈 meanings 배열을 넣으면 빈 배열을 반환한다", () => {
    expect(normalizeDictionaryCandidates([{ meanings: [] }])).toEqual([]);
  });

  it("정의가 없는 meaning을 무시한다", () => {
    const input = [{ meanings: [{ partOfSpeech: "noun", definitions: [{ definition: undefined }] }] }];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result).toEqual([]);
  });

  it("빈 문자열 정의를 제거한다", () => {
    const input = [{ meanings: [{ definitions: [{ definition: "  " }] }] }];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result).toEqual([]);
  });

  it("300자 초과 정의를 제거한다", () => {
    const longDefinition = "x".repeat(301);
    const input = [{ meanings: [{ definitions: [{ definition: longDefinition }] }] }];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result).toEqual([]);
  });

  it("중복 정의를 하나로 줄인다", () => {
    const input = [
      {
        meanings: [
          {
            definitions: [
              { definition: "A financial instrument representing debt" },
              { definition: "A financial instrument representing debt" },
            ],
          },
        ],
      },
    ];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result).toHaveLength(1);
    expect(result[0].meaning).toBe("A financial instrument representing debt");
  });

  it("하나의 단어-의미에서 후보를 추출한다", () => {
    const input = [
      {
        meanings: [
          {
            partOfSpeech: "noun",
            definitions: [
              { definition: "A formal agreement between two parties" },
              { definition: "A written or spoken agreement, especially one concerning employment or ownership" },
            ],
          },
        ],
      },
    ];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("dictionary");
    expect(result[0].partOfSpeech).toBe("noun");
    expect(result[1].partOfSpeech).toBe("noun");
  });

  it("여러 의미(품사)에서 후보를 추출한다", () => {
    const input = [
      {
        meanings: [
          {
            partOfSpeech: "noun",
            definitions: [{ definition: "Wealth in the form of money or assets" }],
          },
          {
            partOfSpeech: "verb",
            definitions: [{ definition: "To finance or provide with capital" }],
          },
        ],
      },
    ];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result).toHaveLength(2);
    expect(result[0].partOfSpeech).toBe("noun");
    expect(result[1].partOfSpeech).toBe("verb");
  });

  it("example이 있으면 포함한다", () => {
    const input = [
      {
        meanings: [
          {
            definitions: [
              { definition: "A sum of money lent", example: "The bank approved the bond." },
            ],
          },
        ],
      },
    ];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result[0].example).toBe("The bank approved the bond.");
  });

  it("example이 없으면 undefined로 남긴다", () => {
    const input = [
      {
        meanings: [
          {
            definitions: [{ definition: "A sum of money lent" }],
          },
        ],
      },
    ];
    const result = normalizeDictionaryCandidates(input as any);
    expect(result[0].example).toBeUndefined();
  });
});