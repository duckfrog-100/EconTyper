# Learning Finish Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add session vocabulary capture, browser-persistent saved words, learning summary, CSV backup, and wrong-sentence retry without introducing accounts or a backend database.

**Architecture:** Keep persistence behind small browser-storage helpers. Dictionary lookup emits a successful lookup event; the practice workspace owns session progress and wrong-attempt tracking; focused drawer and summary components render derived state. Retry creates a new `PracticeArticle` containing only wrong sentences and reuses the existing practice route.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, Vitest, sessionStorage, localStorage

## Global Constraints

- No account registration or server-side persistence.
- Session vocabulary uses `sessionStorage` and saved vocabulary uses `localStorage`.
- Existing typing, translation, dictionary, TTS, and settings behavior must remain intact.
- Storage parsing must fail safely.
- CSV import requires `word` and `meaning` columns.
- Duplicate words are normalized case-insensitively.

---

## File Structure

- Create `src/types/vocabulary.ts`: shared vocabulary types.
- Create `src/lib/vocabulary-storage.ts`: normalization, session/local storage, CSV serialization and parsing.
- Create `src/lib/vocabulary-storage.test.ts`: unit tests for persistence and CSV behavior.
- Modify `src/components/practice/dictionary-word.tsx`: emit successful lookup data.
- Create `src/components/practice/vocabulary-drawer.tsx`: session vocabulary and saved-word UI.
- Create `src/components/practice/practice-summary.tsx`: result metrics and retry actions.
- Modify `src/components/practice/practice-workspace.tsx`: own vocabulary state, wrong-attempt tracking, summary transition, and retry article creation.
- Modify `src/lib/practice-utils.ts`: add aggregate accuracy helper if needed.
- Modify or create `src/lib/practice-utils.test.ts`: test wrong-attempt and aggregate calculation helpers.

### Task 1: Vocabulary Domain and Storage

**Files:**
- Create: `src/types/vocabulary.ts`
- Create: `src/lib/vocabulary-storage.ts`
- Test: `src/lib/vocabulary-storage.test.ts`

**Interfaces:**
- Produces: `normalizeWord(word: string): string`
- Produces: `readSessionWords(sessionId: string): SavedWord[]`
- Produces: `writeSessionWords(sessionId: string, words: SavedWord[]): void`
- Produces: `readSavedWords(): SavedWord[]`
- Produces: `writeSavedWords(words: SavedWord[]): void`
- Produces: `upsertWord(words: SavedWord[], incoming: SavedWord): SavedWord[]`
- Produces: `toVocabularyCsv(words: SavedWord[]): string`
- Produces: `parseVocabularyCsv(csv: string): SavedWord[]`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeWord, parseVocabularyCsv, toVocabularyCsv, upsertWord } from "./vocabulary-storage";

const word = { word: "Inflation", meaning: "물가 상승", addedAt: 1 };

describe("vocabulary storage", () => {
  it("normalizes punctuation and case", () => {
    expect(normalizeWord("Inflation,")) .toBe("inflation");
  });

  it("deduplicates words case-insensitively", () => {
    const result = upsertWord([word], { ...word, word: "inflation", meaning: "인플레이션", addedAt: 2 });
    expect(result).toHaveLength(1);
    expect(result[0].meaning).toBe("인플레이션");
  });

  it("round-trips csv", () => {
    const restored = parseVocabularyCsv(toVocabularyCsv([word]));
    expect(restored[0]).toMatchObject({ word: "inflation", meaning: "물가 상승" });
  });

  it("rejects csv without required columns", () => {
    expect(() => parseVocabularyCsv("term,definition\nfoo,bar")).toThrow("word와 meaning 열이 필요합니다.");
  });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/lib/vocabulary-storage.test.ts`
Expected: FAIL because module does not exist.

- [ ] **Step 3: Implement types and minimal storage helpers**

```ts
export type SavedWord = {
  word: string;
  meaning: string;
  phonetic?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  sourceTitle?: string;
  addedAt: number;
};
```

Implement browser guards with `typeof window === "undefined"`, JSON parse fallbacks, normalized deduplication, RFC-4180-compatible quoting for commas and quotes, and required-column validation.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- src/lib/vocabulary-storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/vocabulary.ts src/lib/vocabulary-storage.ts src/lib/vocabulary-storage.test.ts
git commit -m "feat: add browser vocabulary storage"
```

### Task 2: Dictionary Lookup Event

**Files:**
- Modify: `src/components/practice/dictionary-word.tsx`

**Interfaces:**
- Consumes: `SavedWord`
- Produces prop: `onLookupSuccess?: (word: SavedWord) => void`

- [ ] **Step 1: Add a component test or focused callback test**

Test that a successful dictionary response calls `onLookupSuccess` once with normalized word, first usable meaning, phonetic, part of speech, and source sentence metadata supplied by props.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- dictionary-word`
Expected: FAIL because the callback prop does not exist.

- [ ] **Step 3: Implement callback emission**

Add optional props `sentence?: string`, `sourceTitle?: string`, and `onLookupSuccess`. Call the callback only after a usable definition is resolved. Do not emit on loading, cache miss, or error.

- [ ] **Step 4: Run focused test and verify pass**

Run: `npm test -- dictionary-word`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/practice/dictionary-word.tsx src/components/practice/dictionary-word.test.tsx
git commit -m "feat: capture successful dictionary lookups"
```

### Task 3: Vocabulary Drawer

**Files:**
- Create: `src/components/practice/vocabulary-drawer.tsx`
- Modify: `src/components/practice/practice-workspace.tsx`

**Interfaces:**
- Consumes: `sessionWords: SavedWord[]`, `savedWords: SavedWord[]`
- Produces callbacks: `onToggleSaved`, `onDeleteSessionWord`, `onClearSessionWords`, `onImportCsv`

- [ ] **Step 1: Write component tests**

Cover search filtering, saved toggle, deletion, empty state, local-only notice, CSV export filename, and invalid CSV error message.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- vocabulary-drawer`
Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement drawer UI**

Add `단어장 (N)` in the workspace header. Drawer lists session words, supports search, toggles `내 단어로 저장`, deletes entries, clears with confirmation, downloads CSV through a Blob URL, and imports a selected CSV file.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- vocabulary-drawer`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/practice/vocabulary-drawer.tsx src/components/practice/vocabulary-drawer.test.tsx src/components/practice/practice-workspace.tsx
git commit -m "feat: add session and saved vocabulary drawer"
```

### Task 4: Wrong Attempt Tracking and Summary Metrics

**Files:**
- Modify: `src/lib/practice-utils.ts`
- Test: `src/lib/practice-utils.test.ts`
- Modify: `src/components/practice/practice-workspace.tsx`

**Interfaces:**
- Produces: `hasIncorrectCharacter(target: string, typed: string): boolean`
- Produces: `calculateAggregateAccuracy(targets: string[], typedValues: string[]): number`

- [ ] **Step 1: Write failing helper tests**

```ts
it("detects an incorrect attempt before completion", () => {
  expect(hasIncorrectCharacter("cat", "cb")).toBe(true);
  expect(hasIncorrectCharacter("cat", "ca")).toBe(false);
});

it("calculates aggregate accuracy by character count", () => {
  expect(calculateAggregateAccuracy(["cat", "dog"], ["cat", "dig"])).toBe(83);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/lib/practice-utils.test.ts`
Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement helpers and workspace tracking**

Maintain `wrongAttemptIndices: Set<number>`. During each input change, add the sentence index when `hasIncorrectCharacter` is true; never remove it when the final text becomes correct. Keep unfinished sentences separate.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- src/lib/practice-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/practice-utils.ts src/lib/practice-utils.test.ts src/components/practice/practice-workspace.tsx
git commit -m "feat: track wrong typing attempts"
```

### Task 5: Learning Summary and Retry

**Files:**
- Create: `src/components/practice/practice-summary.tsx`
- Create: `src/components/practice/practice-summary.test.tsx`
- Modify: `src/components/practice/practice-workspace.tsx`
- Modify: `src/lib/session-storage.ts`

**Interfaces:**
- Consumes summary metrics and wrong sentence indices.
- Produces callbacks: `onRetryWrong`, `onRetryAll`, `onReturnHome`.

- [ ] **Step 1: Write component tests**

Test displayed metrics, disabled wrong-retry when count is zero, and callback invocation for all three actions.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- practice-summary`
Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement summary transition**

Show `결과 보기` once at least one sentence is complete; automatically show summary when every sentence is complete. Build a retry article from wrong sentences joined with paragraph breaks, assign a new ID, save through existing session storage, reset workspace state, and navigate to the new practice session. `전체 다시 연습` performs the same flow with the original article text.

- [ ] **Step 4: Run tests and verify pass**

Run: `npm test -- practice-summary`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/practice/practice-summary.tsx src/components/practice/practice-summary.test.tsx src/components/practice/practice-workspace.tsx src/lib/session-storage.ts
git commit -m "feat: add learning summary and wrong-sentence retry"
```

### Task 6: Full Verification

**Files:**
- Review all files changed in Tasks 1-5.

- [ ] **Step 1: Run complete tests**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: build completes without TypeScript, lint, or Next.js errors.

- [ ] **Step 3: Manual browser verification**

Verify dictionary lookup auto-adds one normalized session word, saved words persist after reload, CSV export/import restores data, summary metrics are correct, and wrong-only retry contains only sentences with an incorrect attempt.

- [ ] **Step 4: Commit verification fixes if any**

```bash
git add -A
git commit -m "fix: verify learning finish flow"
```
