# Local Handoff Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add low-risk, tested foundations for WPM, history compatibility, persistent settings, and recommended-site metadata before local Kimi work.

**Architecture:** Keep calculations and normalization in focused `lib` modules. Preserve browser-storage compatibility through explicit fallback and migration. Expose recommended sites as static typed data without changing visual layout.

**Tech Stack:** Next.js 14, TypeScript, Vitest, browser localStorage/sessionStorage.

## Global Constraints
- No new dependencies.
- Preserve existing history and settings data.
- New history fields remain optional.
- Do not change TTS, practice layout, or long-article rendering.
- Run `npm test`, `npm run lint`, and `npm run build`.

---

### Task 1: WPM calculation

**Files:**
- Modify: `lib/practice-utils.test.ts`
- Modify: `lib/practice-utils.ts`

**Interfaces:**
- Produces: `calculateWordsPerMinute(typedCharacters: number, elapsedSeconds: number): number`

- [ ] Write tests for normal values, zero/negative input, and fractional values.
- [ ] Run the targeted test and verify it fails because the function is missing.
- [ ] Implement the minimal pure calculation using the five-characters-per-word convention.
- [ ] Run the targeted test and verify it passes.

### Task 2: Optional history metrics

**Files:**
- Modify: `types/history.ts`
- Modify: `lib/history-storage.test.ts`
- Modify: `lib/history-storage.ts`

**Interfaces:**
- Extends `PracticeHistoryEntry` with `wordsPerMinute?: number` and `elapsedSeconds?: number`.

- [ ] Add tests proving old entries remain valid and valid optional metrics survive normalization.
- [ ] Run the targeted test and verify the new assertions fail.
- [ ] Add optional fields and normalize finite non-negative values.
- [ ] Run the targeted test and verify it passes.

### Task 3: Persistent typing settings

**Files:**
- Create: `lib/typing-settings-storage.test.ts`
- Create: `lib/typing-settings-storage.ts`
- Modify later locally: `components/practice/practice-workspace.tsx`

**Interfaces:**
- Produces: `loadTypingSettings(defaults)`, `saveTypingSettings(value)`, and `TYPING_SETTINGS_KEY`.

- [ ] Test new localStorage precedence, legacy sessionStorage fallback, migration, malformed JSON, and save behavior.
- [ ] Run the test and verify it fails because the module is missing.
- [ ] Implement browser-safe storage access and normalization through a caller-supplied normalizer.
- [ ] Run the targeted test and verify it passes.

### Task 4: Recommended reading-site metadata

**Files:**
- Create: `lib/recommended-reading-sites.test.ts`
- Create: `lib/recommended-reading-sites.ts`

**Interfaces:**
- Produces: `recommendedReadingSites` with stable id, name, URL, category, and Korean description.

- [ ] Test unique ids, HTTPS URLs, and required descriptions.
- [ ] Run the test and verify it fails because the module is missing.
- [ ] Add six static recommendations.
- [ ] Run the targeted test and verify it passes.

### Task 5: Full verification

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Record remaining local-only tasks: TTS, tool panel, performance profiling, result/history UI wiring, and recommendation cards.
