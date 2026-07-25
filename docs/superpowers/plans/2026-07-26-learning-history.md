# Learning History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record up to 100 completed practice sessions in `localStorage`, show summary statistics and the latest three sessions on the home page, and provide a grouped `/history` page.

**Architecture:** Keep persistence and statistics in a React-free `lib/history-storage.ts` module, expose typed history records through `types/history.ts`, and render them through focused shared history components. `PracticeWorkspace` writes one record when completion is first reached; Home and `/history` read the same storage after client mount and derive summary data on demand.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript 5.5, Tailwind CSS, Vitest 2, browser `localStorage`.

## Global Constraints

- Store history under one localStorage key and keep only the newest 100 records.
- Never store article body text in history.
- Treat malformed storage as empty history and discard malformed entries individually.
- Order all records newest first.
- Calculate streaks using the user's local calendar date.
- A streak may end today or yesterday; otherwise it is zero.
- Multiple sessions on one date count as one streak day.
- The result screen remains presentational; `PracticeWorkspace` owns persistence.
- Retrying an article creates a separate history entry after that retry is completed.
- Do not add deletion, filtering, pagination, charts, accounts, or cloud sync.

---

## File Structure

- Create `types/history.ts`: owns `PracticeHistoryEntry`, `PracticeHistorySummary`, and grouped-history types.
- Create `lib/history-storage.ts`: validation, read/write, insertion, 100-record limit, summary, streak, and month grouping.
- Create `lib/history-storage.test.ts`: unit coverage for storage and derived calculations.
- Create `components/history/history-summary.tsx`: reusable summary cards.
- Create `components/history/recent-history.tsx`: compact recent-three list and empty state.
- Create `components/history/history-list.tsx`: detailed month-grouped list and empty state.
- Create `components/history/history-workspace.tsx`: client-side history loader for `/history`.
- Create `app/history/page.tsx`: route wrapper.
- Modify `components/practice/practice-workspace.tsx`: save exactly one completion record.
- Modify `components/home/home-workspace.tsx`: load history and saved vocabulary, render summary and newest three records.

---

### Task 1: Define and test history persistence primitives

**Files:**
- Create: `types/history.ts`
- Create: `lib/history-storage.ts`
- Create: `lib/history-storage.test.ts`

**Interfaces:**
- Produces:
  - `PracticeHistoryEntry`
  - `PracticeHistorySummary`
  - `PracticeHistoryMonthGroup`
  - `readPracticeHistory(): PracticeHistoryEntry[]`
  - `writePracticeHistory(entries: PracticeHistoryEntry[]): void`
  - `addPracticeHistoryEntry(entry: PracticeHistoryEntry): PracticeHistoryEntry[]`
  - `calculatePracticeHistorySummary(entries: PracticeHistoryEntry[], savedWordCount: number, now?: Date): PracticeHistorySummary`
  - `groupPracticeHistoryByMonth(entries: PracticeHistoryEntry[]): PracticeHistoryMonthGroup[]`

- [ ] **Step 1: Create the history types**

```ts
export type PracticeHistoryEntry = {
  id: string;
  articleId: string;
  title: string;
  sourceName?: string;
  completedAt: string;
  accuracy: number;
  typedCharacters: number;
  wrongSentenceCount: number;
  sessionWordCount: number;
  savedWordCount: number;
  sentenceCount: number;
};

export type PracticeHistorySummary = {
  totalSessions: number;
  totalTypedCharacters: number;
  averageAccuracy: number;
  currentStreakDays: number;
  savedWordCount: number;
};

export type PracticeHistoryMonthGroup = {
  monthKey: string;
  entries: PracticeHistoryEntry[];
};
```

- [ ] **Step 2: Write failing tests for insertion, limiting, replacement, and malformed storage**

Use an in-memory `localStorage` stub in `lib/history-storage.test.ts`. Cover:

```ts
it("inserts newest first and caps at 100 entries", () => { /* create 101 entries */ });
it("replaces an existing id without adding a duplicate", () => { /* same id twice */ });
it("returns an empty array for malformed JSON", () => { /* invalid JSON */ });
it("filters malformed entries while keeping valid entries", () => { /* mixed array */ });
```

- [ ] **Step 3: Run the focused test and verify failure**

Run:

```bash
npm test -- lib/history-storage.test.ts
```

Expected: FAIL because `history-storage.ts` does not exist.

- [ ] **Step 4: Implement storage validation and insertion**

Use:

```ts
export const PRACTICE_HISTORY_KEY = "chagok.practiceHistory";
export const PRACTICE_HISTORY_LIMIT = 100;
```

Validation rules:

- Required strings must be non-empty.
- `completedAt` must parse to a valid date.
- Numeric counters must be finite and normalized to non-negative integers.
- Accuracy must be clamped to `0..100`.
- Missing `sourceName` stays undefined.
- `readPracticeHistory()` catches storage errors and returns `[]`.
- `addPracticeHistoryEntry()` removes any existing record with the same `id`, prepends the new record, slices to 100, persists, and returns the resulting array.

- [ ] **Step 5: Run the focused test and verify pass**

```bash
npm test -- lib/history-storage.test.ts
```

Expected: insertion/storage tests PASS.

- [ ] **Step 6: Commit the persistence primitive**

```bash
git add types/history.ts lib/history-storage.ts lib/history-storage.test.ts
git commit -m "feat: add local practice history storage"
```

---

### Task 2: Add statistics, streak, and month grouping

**Files:**
- Modify: `lib/history-storage.ts`
- Modify: `lib/history-storage.test.ts`

**Interfaces:**
- Consumes: `PracticeHistoryEntry[]`
- Produces:
  - `calculatePracticeHistorySummary(...)`
  - `groupPracticeHistoryByMonth(...)`

- [ ] **Step 1: Add failing summary and streak tests**

Cover exact behavior:

```ts
it("calculates totals and rounded average accuracy", () => { /* 90 and 95 => 93 */ });
it("deduplicates multiple sessions on the same streak day", () => { /* same local date */ });
it("counts a streak ending today", () => { /* today, yesterday, two days ago */ });
it("counts a streak ending yesterday", () => { /* no today entry */ });
it("returns zero when neither today nor yesterday has a session", () => { /* old entries */ });
```

Pass a fixed `now` argument to avoid timezone-dependent test failures.

- [ ] **Step 2: Add failing month-grouping tests**

```ts
it("groups entries by local calendar month and keeps newest-first order", () => { /* two months */ });
```

Expected `monthKey` format: `YYYY-MM`.

- [ ] **Step 3: Run the focused test and verify failure**

```bash
npm test -- lib/history-storage.test.ts
```

Expected: FAIL because summary/grouping functions are absent.

- [ ] **Step 4: Implement derived calculations**

Implementation requirements:

- `totalSessions = entries.length`
- `totalTypedCharacters = sum(typedCharacters)`
- `averageAccuracy = entries.length ? Math.round(sum / entries.length) : 0`
- `savedWordCount` comes from the function argument
- Convert `completedAt` into a local `YYYY-MM-DD` key without using UTC slicing.
- Deduplicate date keys before streak calculation.
- Begin streak from today when present, otherwise yesterday when present, otherwise return zero.
- Sort month groups and group entries newest first by timestamp.

- [ ] **Step 5: Run focused tests and verify pass**

```bash
npm test -- lib/history-storage.test.ts
```

Expected: all history-storage tests PASS.

- [ ] **Step 6: Commit derived history calculations**

```bash
git add lib/history-storage.ts lib/history-storage.test.ts
git commit -m "feat: calculate practice history statistics"
```

---

### Task 3: Save one history record on practice completion

**Files:**
- Modify: `components/practice/practice-workspace.tsx`

**Interfaces:**
- Consumes: `addPracticeHistoryEntry(entry)`
- Produces: exactly one persisted `PracticeHistoryEntry` per completion event

- [ ] **Step 1: Add imports and a completion guard**

Add:

```ts
import { addPracticeHistoryEntry } from "@/lib/history-storage";
```

Use a ref keyed to the current completion event:

```ts
const savedCompletionRef = useRef<string | null>(null);
```

Reset it when `sessionId` changes.

- [ ] **Step 2: Add a completion persistence effect**

The effect runs only when:

```ts
article && sentences.length > 0 && completedCount === sentences.length
```

Build an entry with:

```ts
{
  id: crypto.randomUUID(),
  articleId: article.id,
  title: article.title,
  sourceName: article.sourceName,
  completedAt: new Date().toISOString(),
  accuracy: aggregateAccuracy,
  typedCharacters: totalTyped,
  wrongSentenceCount: wrongAttemptIndices.size,
  sessionWordCount: sessionWords.length,
  savedWordCount: savedWords.length,
  sentenceCount: sentences.length,
}
```

Use a stable in-memory completion key such as `${sessionId}:${completedCount}:${sentences.length}` before saving so rerenders do not duplicate the record.

- [ ] **Step 3: Verify retry behavior manually in code review**

Confirm:

- A new retry session receives a new article/session ID.
- `savedCompletionRef` resets on session change.
- Completing a retry creates a distinct history entry.
- Reopening the result UI within the same session does not add another entry.

- [ ] **Step 4: Run tests and build**

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit completion integration**

```bash
git add components/practice/practice-workspace.tsx
git commit -m "feat: record completed practice sessions"
```

---

### Task 4: Build reusable history presentation components

**Files:**
- Create: `components/history/history-summary.tsx`
- Create: `components/history/recent-history.tsx`
- Create: `components/history/history-list.tsx`

**Interfaces:**
- Consumes:
  - `PracticeHistorySummary`
  - `PracticeHistoryEntry[]`
  - `PracticeHistoryMonthGroup[]`
- Produces reusable presentational components with no storage access

- [ ] **Step 1: Implement `HistorySummary`**

Props:

```ts
type HistorySummaryProps = {
  summary: PracticeHistorySummary;
  compact?: boolean;
};
```

Render four cards:

- 총 학습 `{totalSessions}회`
- 연속 학습 `{currentStreakDays}일`
- 총 입력 `{totalTypedCharacters.toLocaleString()}자`
- 내 단어 `{savedWordCount.toLocaleString()}개`

- [ ] **Step 2: Implement `RecentHistory`**

Props:

```ts
type RecentHistoryProps = {
  entries: PracticeHistoryEntry[];
};
```

Requirements:

- Render only `entries.slice(0, 3)` defensively.
- Show title, optional source, local completion date, and accuracy.
- Show an empty-state sentence when no records exist.
- Show an `전체 보기` link to `/history` only when records exist.

- [ ] **Step 3: Implement `HistoryList`**

Props:

```ts
type HistoryListProps = {
  groups: PracticeHistoryMonthGroup[];
};
```

Requirements:

- Month heading format: `2026년 7월`.
- Entry values: local date/time, accuracy, sentence count, typed characters, wrong sentence count, session word count.
- Omit source label when missing.
- Render a full-page empty state when no groups exist.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit shared history components**

```bash
git add components/history
git commit -m "feat: add practice history components"
```

---

### Task 5: Integrate the home-page summary and recent records

**Files:**
- Modify: `components/home/home-workspace.tsx`

**Interfaces:**
- Consumes:
  - `readPracticeHistory()`
  - `calculatePracticeHistorySummary(...)`
  - `readSavedWords()`
  - `HistorySummary`
  - `RecentHistory`

- [ ] **Step 1: Add client state for mounted history data**

Add `useEffect` and state:

```ts
const [history, setHistory] = useState<PracticeHistoryEntry[]>([]);
const [savedWordCount, setSavedWordCount] = useState(0);
```

After mount:

```ts
setHistory(readPracticeHistory());
setSavedWordCount(readSavedWords().length);
```

- [ ] **Step 2: Calculate the summary from current data**

```ts
const historySummary = calculatePracticeHistorySummary(history, savedWordCount);
```

- [ ] **Step 3: Render the learning section without displacing the primary start flow**

Place the compact learning section after the introductory header and before the article input cards:

```tsx
<section aria-labelledby="learning-summary-title">
  <h2 id="learning-summary-title">나의 학습</h2>
  <HistorySummary summary={historySummary} compact />
  <RecentHistory entries={history.slice(0, 3)} />
</section>
```

Keep URL extraction and paste entry as the primary visual action.

- [ ] **Step 4: Run lint, tests, and build**

```bash
npm run lint
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit home integration**

```bash
git add components/home/home-workspace.tsx
git commit -m "feat: show learning summary on home page"
```

---

### Task 6: Add the detailed `/history` route

**Files:**
- Create: `components/history/history-workspace.tsx`
- Create: `app/history/page.tsx`

**Interfaces:**
- Consumes:
  - `readPracticeHistory()`
  - `calculatePracticeHistorySummary(...)`
  - `groupPracticeHistoryByMonth(...)`
  - `readSavedWords()`
  - `HistorySummary`
  - `HistoryList`

- [ ] **Step 1: Build the client workspace**

`HistoryWorkspace` must:

- Start with a mounted/loading state to avoid rendering browser storage on the server.
- Read history and saved words in `useEffect`.
- Calculate summary and month groups after data loads.
- Render a home link, page heading, summary cards, and detailed list.

Suggested shell:

```tsx
<main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
  <Link href="/">← 홈</Link>
  <header>...</header>
  <HistorySummary summary={summary} />
  <HistoryList groups={groups} />
</main>
```

- [ ] **Step 2: Add the route wrapper**

```tsx
import { HistoryWorkspace } from "@/components/history/history-workspace";

export default function HistoryPage() {
  return <HistoryWorkspace />;
}
```

- [ ] **Step 3: Run full verification**

```bash
npm run lint
npm test
npm run build
```

Expected: all commands PASS and `/history` is included in the production build.

- [ ] **Step 4: Commit the history route**

```bash
git add app/history/page.tsx components/history/history-workspace.tsx
git commit -m "feat: add detailed practice history page"
```

---

### Task 7: Final regression and requirement verification

**Files:**
- Review all files changed in Tasks 1–6

**Interfaces:**
- Produces a verified, complete Task 6 learning-history feature

- [ ] **Step 1: Run the complete automated checks**

```bash
npm run lint
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 2: Verify storage behavior manually**

In the browser:

1. Complete one practice article.
2. Confirm exactly one record appears on Home and `/history`.
3. Navigate away and back; confirm no duplicate record is created.
4. Complete a retry; confirm it creates a second record.
5. Confirm storage contains metadata only and no article body.
6. Confirm Home displays at most three recent records.
7. Seed more than 100 records and confirm only the newest 100 remain.

- [ ] **Step 3: Verify statistics manually**

Check:

- Total sessions increments correctly.
- Total typed characters equals the record sum.
- Average accuracy is rounded.
- Multiple sessions today count as one streak day.
- Yesterday-only recent activity preserves the streak.
- Saved-word count matches the persistent vocabulary store rather than historical sums.

- [ ] **Step 4: Verify empty and corrupt-storage states**

Check:

- Fresh browser storage shows usable empty states.
- Invalid JSON under `chagok.practiceHistory` does not crash Home or `/history`.
- A mixed array discards only invalid records.

- [ ] **Step 5: Commit any verification fixes, then inspect the final diff**

```bash
git status --short
git diff HEAD~6..HEAD --stat
```

If fixes were needed:

```bash
git add <fixed-files>
git commit -m "fix: harden practice history flow"
```
