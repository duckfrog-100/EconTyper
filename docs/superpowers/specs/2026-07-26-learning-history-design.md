# Learning History Design

## Goal

Add a local-first learning history that records completed practice sessions, shows lightweight summary statistics on the home page, and provides a dedicated `/history` page for detailed review.

## Scope

This phase stores and displays learning history only. It does not add accounts, cloud sync, cross-device persistence, article-body retention, editing of past records, or charts.

## Storage Policy

- Storage: `localStorage`
- Maximum records: 100
- Ordering: newest first
- When the 101st record is added, discard the oldest record
- Store summary metadata only; never store the original article text
- Invalid or malformed stored values fall back to an empty history rather than breaking the UI

## Data Model

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
```

`id` is unique per completion event. `articleId` identifies the source practice session but is not used as the history record key, so repeating the same article creates a new record.

## Save Timing and Duplicate Prevention

A history entry is written when the practice result screen is first reached after all sentences are complete.

The workspace keeps an in-memory guard for the current completion event so React rerenders do not create duplicate records. Retrying all sentences or retrying wrong sentences creates a new practice session and may create a new history record when that retry is completed.

## Statistics

Statistics are derived from the stored history rather than maintained as a second mutable aggregate.

- Total sessions: number of history entries
- Total typed characters: sum of `typedCharacters`
- Average accuracy: arithmetic mean of entry accuracy values, rounded to the nearest integer
- Saved word count: current persistent vocabulary count from the existing vocabulary storage, not the sum of historical `savedWordCount`
- Current streak: consecutive calendar days ending today, or ending yesterday when the user has not practiced yet today

Multiple sessions completed on the same day count as one streak day.

Dates are interpreted in the user's local timezone. `completedAt` remains an ISO timestamp.

## Home Page

The home page shows a compact learning summary section without turning the page into a dashboard.

Summary cards:

- Total sessions
- Current streak
- Total typed characters
- Saved word count

Below the cards, show the three most recent history entries with:

- Article title
- Source name when available
- Completion date
- Accuracy

An `전체 보기` link navigates to `/history`.

When no history exists, show a short empty-state message and retain the link only when useful.

## History Page

Route: `/history`

The page displays:

- Overall summary cards
- History grouped by local calendar month
- Entries ordered newest first

Each entry shows:

- Title
- Source name when available
- Completion date and time
- Accuracy
- Sentence count
- Typed character count
- Wrong sentence count
- Session word count

The page does not provide deletion, filtering, pagination, or article reopening in this phase.

## Components and Boundaries

### `types/history.ts`

Owns history entry and summary types.

### `lib/history-storage.ts`

Owns parsing, validation, reading, writing, record limiting, duplicate-safe insertion, summary calculation, and streak calculation. It must not import React.

Expected public functions:

```ts
readPracticeHistory(): PracticeHistoryEntry[]
writePracticeHistory(entries: PracticeHistoryEntry[]): void
addPracticeHistoryEntry(entry: PracticeHistoryEntry): PracticeHistoryEntry[]
calculatePracticeHistorySummary(entries: PracticeHistoryEntry[], savedWordCount: number, now?: Date): PracticeHistorySummary
groupPracticeHistoryByMonth(entries: PracticeHistoryEntry[]): Array<{ monthKey: string; entries: PracticeHistoryEntry[] }>
```

### `components/history/history-summary.tsx`

Presentational summary cards shared by home and history pages.

### `components/history/recent-history.tsx`

Presentational home-page list limited by its caller to the newest three entries.

### `components/history/history-list.tsx`

Presentational month-grouped detailed list.

### `app/history/page.tsx`

Client-facing page that reads local history after mount and renders summary plus detailed groups.

### Practice result integration

`PracticeWorkspace` creates and saves one history entry when completion is reached. The result component remains presentational and does not write storage itself.

### Home integration

The home page reads history and saved words on the client, calculates the summary, and renders the compact summary and three newest entries.

## Error Handling

- `localStorage` unavailable: return empty history and keep the app usable
- Invalid JSON: remove or ignore the invalid value and return empty history
- Invalid entries: discard malformed records individually
- Out-of-range accuracy: clamp to 0–100 during validation
- Missing optional source name: omit the source label
- Invalid completion dates: discard the record

## Testing

Unit tests for `history-storage.ts` cover:

- Newest-first insertion
- Maximum 100 records
- Duplicate ID replacement without creating an extra row
- Malformed JSON fallback
- Invalid-entry filtering
- Total and average calculations
- Same-day deduplication for streaks
- Streak ending today
- Streak ending yesterday
- Broken streak returning zero when neither today nor yesterday is present
- Month grouping and newest-first ordering

Component tests cover:

- Empty states
- Summary values
- Recent list limited to three entries
- Month grouping labels

The existing CI command remains the source of truth for tests, lint, type checking, and production build.

## Future Migration

The local data model is intentionally suitable for later server sync. A future account feature can upload local entries and use `id` for deduplication, but no sync metadata is added in this phase.
