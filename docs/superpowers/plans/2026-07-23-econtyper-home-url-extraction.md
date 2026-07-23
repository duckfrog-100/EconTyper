# EconTyper Home & URL Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working EconTyper slice: a minimal responsive Home page with secure article URL extraction, direct paste, six starter texts, session-only state, and a placeholder Practice page that loads the selected article.

**Architecture:** Next.js 14 App Router uses a Server Action for extraction and client components for `sessionStorage` writes and navigation. URL validation, network fetching, Readability parsing, session serialization, and starter content remain isolated in focused modules with deterministic tests.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, `@mozilla/readability`, `jsdom`, Vitest, Testing Library, Playwright, Vercel Node.js runtime.

## Global Constraints

- Use Next.js 14 with App Router, TypeScript, and Tailwind CSS.
- No account, database, server-side persistence, saved history, analytics storage, or cookies.
- Store the current article only in `sessionStorage` under `econtyper.currentArticle`.
- Closing the tab or browser removes the active article.
- Accept public `http:` and `https:` URLs only.
- Block localhost, local host suffixes, credentials in URLs, and private/reserved IPv4 and IPv6 targets.
- Revalidate every redirect target, allow at most 4 redirects, use a 10-second timeout, accept HTML only, and cap response size at 2 MB.
- Use Mozilla Readability and JSDOM on the server.
- Support mobile and desktop layouts in light and dark modes.
- Keep the first milestone limited to Home, extraction, session transfer, and a placeholder Practice page.
- Do not include an advertising script yet; only preserve the future Practice-page boundary.

---

## File Map

- `package.json`: scripts and dependencies.
- `next.config.mjs`: Next.js configuration.
- `tsconfig.json`: strict TypeScript configuration.
- `postcss.config.mjs`, `tailwind.config.ts`: Tailwind setup and class-based dark mode.
- `vitest.config.ts`, `vitest.setup.ts`: unit/component test environment.
- `playwright.config.ts`: browser test configuration.
- `app/layout.tsx`: root metadata, font, body shell.
- `app/globals.css`: design tokens and shared styles.
- `app/page.tsx`: Home composition.
- `app/actions/extract-article.ts`: typed Server Action boundary.
- `app/practice/page.tsx`: placeholder Practice route.
- `components/home/article-url-form.tsx`: URL submission UI.
- `components/home/paste-form.tsx`: direct-text UI.
- `components/home/starter-library.tsx`: starter cards.
- `components/practice/practice-loader.tsx`: session read and missing-state handling.
- `components/ui/theme-toggle.tsx`: light/dark preference toggle.
- `lib/article-extractor.ts`: fetch, redirect, content validation, Readability parsing.
- `lib/url-security.ts`: URL and IP validation.
- `lib/session-storage.ts`: runtime-validated session serialization.
- `lib/starter-library.ts`: six original texts.
- `lib/text-normalization.ts`: whitespace and paragraph normalization.
- `types/article.ts`: shared article and action-result types.
- `tests/unit/url-security.test.ts`: SSRF validation tests.
- `tests/unit/text-normalization.test.ts`: text cleanup tests.
- `tests/unit/article-extractor.test.ts`: mocked extraction tests.
- `tests/unit/session-storage.test.ts`: browser storage tests.
- `tests/unit/starter-library.test.ts`: content integrity tests.
- `tests/components/article-url-form.test.tsx`: form states.
- `tests/components/paste-form.test.tsx`: paste validation and navigation.
- `tests/components/starter-library.test.tsx`: starter selection.
- `tests/e2e/home-practice.spec.ts`: end-to-end session flow.
- `tests/fixtures/article.html`: deterministic Readability fixture.

---

### Task 1: Scaffold the Next.js application and test harness

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/page.tsx`

**Interfaces:**
- Produces scripts `dev`, `build`, `lint`, `test`, `test:watch`, and `test:e2e`.
- Produces the `@/*` path alias used by all later tasks.

- [ ] **Step 1: Create project metadata and dependencies**

```json
{
  "name": "econtyper",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@mozilla/readability": "^0.5.0",
    "jsdom": "^24.1.3",
    "next": "14.2.31",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.54.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/jsdom": "^21.1.7",
    "@types/node": "^22.16.5",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "autoprefixer": "^10.4.21",
    "eslint": "^8.57.1",
    "eslint-config-next": "14.2.31",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.8.3",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Create strict TypeScript and Next.js configuration**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

- [ ] **Step 3: Create Tailwind and test configuration**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
};

export default config;
```

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"]
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } }
});
```

Add `@vitejs/plugin-react` to `devDependencies` before installation.

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Create a minimal root shell**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconTyper",
  description: "Practice economic English through focused typing."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
```

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
.dark { color-scheme: dark; }
body { min-width: 320px; }
```

```tsx
export default function HomePage() {
  return <main className="mx-auto max-w-5xl px-4 py-12">EconTyper</main>;
}
```

- [ ] **Step 5: Install and verify the scaffold**

Run: `npm install`

Run: `npm run build`

Expected: Next.js production build succeeds.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold EconTyper app"
```

---

### Task 2: Define article contracts and session storage

**Files:**
- Create: `types/article.ts`
- Create: `lib/session-storage.ts`
- Create: `tests/unit/session-storage.test.ts`

**Interfaces:**
- Produces `PracticeArticle`, `ExtractArticleResult`, `saveCurrentArticle`, `loadCurrentArticle`, and `clearCurrentArticle`.

- [ ] **Step 1: Write failing session tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { clearCurrentArticle, loadCurrentArticle, saveCurrentArticle } from "@/lib/session-storage";
import type { PracticeArticle } from "@/types/article";

const article: PracticeArticle = {
  id: "article-1",
  title: "Supply and Demand",
  text: "Prices coordinate decisions between buyers and sellers.",
  createdAt: "2026-07-23T00:00:00.000Z"
};

describe("session storage", () => {
  beforeEach(() => sessionStorage.clear());

  it("round-trips a valid article", () => {
    saveCurrentArticle(article);
    expect(loadCurrentArticle()).toEqual(article);
  });

  it("clears corrupt data", () => {
    sessionStorage.setItem("econtyper.currentArticle", "{broken");
    expect(loadCurrentArticle()).toBeNull();
    expect(sessionStorage.getItem("econtyper.currentArticle")).toBeNull();
  });

  it("removes the current article", () => {
    saveCurrentArticle(article);
    clearCurrentArticle();
    expect(loadCurrentArticle()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `npm test -- tests/unit/session-storage.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement shared types**

```ts
export type PracticeArticle = {
  id: string;
  title: string;
  sourceUrl?: string;
  sourceName?: string;
  text: string;
  excerpt?: string;
  byline?: string;
  createdAt: string;
};

export type ExtractArticleResult =
  | { ok: true; article: PracticeArticle }
  | { ok: false; code: string; message: string };
```

- [ ] **Step 4: Implement runtime-validated session helpers**

```ts
import type { PracticeArticle } from "@/types/article";

export const CURRENT_ARTICLE_KEY = "econtyper.currentArticle";

function isPracticeArticle(value: unknown): value is PracticeArticle {
  if (!value || typeof value !== "object") return false;
  const article = value as Record<string, unknown>;
  return typeof article.id === "string" &&
    typeof article.title === "string" &&
    typeof article.text === "string" &&
    article.text.trim().length > 0 &&
    typeof article.createdAt === "string";
}

export function saveCurrentArticle(article: PracticeArticle): void {
  sessionStorage.setItem(CURRENT_ARTICLE_KEY, JSON.stringify(article));
}

export function loadCurrentArticle(): PracticeArticle | null {
  const raw = sessionStorage.getItem(CURRENT_ARTICLE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPracticeArticle(parsed)) throw new Error("Invalid article");
    return parsed;
  } catch {
    sessionStorage.removeItem(CURRENT_ARTICLE_KEY);
    return null;
  }
}

export function clearCurrentArticle(): void {
  sessionStorage.removeItem(CURRENT_ARTICLE_KEY);
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/session-storage.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add types/article.ts lib/session-storage.ts tests/unit/session-storage.test.ts
git commit -m "feat: add session article storage"
```

---

### Task 3: Implement URL and IP security validation

**Files:**
- Create: `lib/url-security.ts`
- Create: `tests/unit/url-security.test.ts`

**Interfaces:**
- Produces `validatePublicUrl(rawUrl: string): Promise<URL>` and `isBlockedIp(address: string): boolean`.

- [ ] **Step 1: Write failing security tests**

```ts
import { describe, expect, it, vi } from "vitest";
import * as dns from "node:dns/promises";
import { isBlockedIp, validatePublicUrl } from "@/lib/url-security";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));

it.each(["127.0.0.1", "10.0.0.1", "169.254.1.2", "192.168.1.1", "::1", "fc00::1", "fe80::1"])(
  "blocks %s",
  (address) => expect(isBlockedIp(address)).toBe(true)
);

it("accepts a public URL whose DNS answers are public", async () => {
  vi.mocked(dns.lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
  await expect(validatePublicUrl("https://example.com/article")).resolves.toEqual(
    new URL("https://example.com/article")
  );
});

it.each(["ftp://example.com", "http://user:pass@example.com", "http://localhost/test"])(
  "rejects %s",
  async (url) => expect(validatePublicUrl(url)).rejects.toThrow()
);
```

- [ ] **Step 2: Run and confirm failure**

Run: `npm test -- tests/unit/url-security.test.ts`

Expected: FAIL because `lib/url-security.ts` does not exist.

- [ ] **Step 3: Implement validation**

Use `node:net` and `node:dns/promises`. Parse IPv4 octets and classify loopback, RFC1918, link-local, CGNAT, multicast, documentation, benchmark, and reserved ranges. For IPv6, normalize lowercase and block `::`, `::1`, `fc00::/7`, `fe80::/10`, multicast `ff00::/8`, documentation `2001:db8::/32`, and IPv4-mapped blocked addresses. Reject `.local`, `.localhost`, `.internal`, and `.home` suffixes. Resolve with `lookup(hostname, { all: true, verbatim: true })` and reject when any answer is blocked.

The exported function must return the parsed `URL` only after all checks pass and must throw user-safe `Error` messages without returning DNS details.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/url-security.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/url-security.ts tests/unit/url-security.test.ts
git commit -m "feat: block unsafe extraction targets"
```

---

### Task 4: Normalize and extract article text

**Files:**
- Create: `lib/text-normalization.ts`
- Create: `lib/article-extractor.ts`
- Create: `tests/fixtures/article.html`
- Create: `tests/unit/text-normalization.test.ts`
- Create: `tests/unit/article-extractor.test.ts`

**Interfaces:**
- Consumes `validatePublicUrl` from Task 3.
- Produces `normalizeArticleText(input: string): string` and `extractArticleFromUrl(rawUrl: string): Promise<PracticeArticle>`.

- [ ] **Step 1: Write normalization tests**

```ts
import { expect, it } from "vitest";
import { normalizeArticleText } from "@/lib/text-normalization";

it("preserves paragraphs while collapsing repeated whitespace", () => {
  expect(normalizeArticleText(" First   paragraph.\n\n\n Second\tparagraph. ")).toBe(
    "First paragraph.\n\nSecond paragraph."
  );
});
```

- [ ] **Step 2: Implement normalization**

```ts
export function normalizeArticleText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/[\t ]+/g, " ").replace(/\n+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
```

- [ ] **Step 3: Add a deterministic article fixture**

Create an HTML document containing a title, byline, one navigation block, and at least three substantial article paragraphs totaling more than 300 characters.

- [ ] **Step 4: Write extraction tests with mocked fetch**

Tests must cover:

```ts
it("extracts title and plain text from HTML", async () => { /* mocked 200 text/html response */ });
it("rejects non-HTML content", async () => { /* mocked application/pdf response */ });
it("rejects a body larger than 2 MB", async () => { /* mocked oversized stream */ });
it("revalidates redirect destinations", async () => { /* mocked 302 then 200 */ });
it("rejects articles shorter than 200 characters", async () => { /* tiny HTML */ });
```

Mock `validatePublicUrl` independently so extractor tests verify redirect calls without real DNS.

- [ ] **Step 5: Implement controlled fetching and Readability parsing**

Implement these exact rules:

- `redirect: "manual"`
- maximum 4 redirects
- one `AbortController` with a 10,000 ms timer
- validate the initial URL and every `Location` target
- allow only `text/html` and `application/xhtml+xml`
- stream the body and stop after `2 * 1024 * 1024` bytes
- send `User-Agent: EconTyper/0.1 (+https://github.com/duckfrog-100/EconTyper)` and `Accept: text/html,application/xhtml+xml`
- create `new JSDOM(html, { url: finalUrl.toString() })`
- run `new Readability(document.cloneNode(true) as Document).parse()`
- convert `article.textContent` with `normalizeArticleText`
- reject text shorter than 200 characters
- return `crypto.randomUUID()` as `id`, hostname as `sourceName`, and an ISO timestamp
- clear the timeout in `finally`

- [ ] **Step 6: Run unit tests**

Run: `npm test -- tests/unit/text-normalization.test.ts tests/unit/article-extractor.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/text-normalization.ts lib/article-extractor.ts tests/fixtures/article.html tests/unit/text-normalization.test.ts tests/unit/article-extractor.test.ts
git commit -m "feat: extract readable article text"
```

---

### Task 5: Add the typed Server Action

**Files:**
- Create: `app/actions/extract-article.ts`
- Create: `tests/unit/extract-article-action.test.ts`

**Interfaces:**
- Consumes `extractArticleFromUrl`.
- Produces `extractArticleAction(rawUrl: string): Promise<ExtractArticleResult>`.

- [ ] **Step 1: Write failing action tests**

Test success, known validation failure, timeout, and unexpected failure. Assert that the action returns a typed error object and never exposes stack traces, IP addresses, or internal exception text.

- [ ] **Step 2: Implement the action**

```ts
"use server";

import { extractArticleFromUrl } from "@/lib/article-extractor";
import type { ExtractArticleResult } from "@/types/article";

export async function extractArticleAction(rawUrl: string): Promise<ExtractArticleResult> {
  if (!rawUrl.trim()) {
    return { ok: false, code: "EMPTY_URL", message: "Enter an article URL." };
  }

  try {
    return { ok: true, article: await extractArticleFromUrl(rawUrl) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Article extraction failed.";
    const safeMessages = new Set([
      "Enter a valid public HTTP or HTTPS URL.",
      "This address is not publicly reachable.",
      "The website returned unsupported content.",
      "The article was too large.",
      "The article request timed out.",
      "The article body could not be found."
    ]);
    return {
      ok: false,
      code: "EXTRACTION_FAILED",
      message: safeMessages.has(message) ? message : "We could not extract this article. Try pasting the text instead."
    };
  }
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/unit/extract-article-action.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/actions/extract-article.ts tests/unit/extract-article-action.test.ts
git commit -m "feat: expose article extraction action"
```

---

### Task 6: Add six original starter texts

**Files:**
- Create: `lib/starter-library.ts`
- Create: `tests/unit/starter-library.test.ts`

**Interfaces:**
- Produces `StarterArticle` and `STARTER_ARTICLES`.

- [ ] **Step 1: Write data validity tests**

Assert exactly six unique IDs, six required topic titles, text length of at least 500 characters, positive estimated minutes, and no `sourceUrl`.

- [ ] **Step 2: Implement the library**

Create original educational English summaries for:

1. Supply and Demand
2. Inflation and Purchasing Power
3. Opportunity Cost
4. The Role of Central Banks
5. Comparative Advantage
6. Market Competition

Each object must contain:

```ts
export type StarterArticle = {
  id: string;
  title: string;
  topic: string;
  estimatedMinutes: number;
  text: string;
};
```

Do not copy modern news or textbook passages.

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/unit/starter-library.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/starter-library.ts tests/unit/starter-library.test.ts
git commit -m "feat: add economics starter library"
```

---

### Task 7: Build Home forms and starter cards

**Files:**
- Create: `components/home/article-url-form.tsx`
- Create: `components/home/paste-form.tsx`
- Create: `components/home/starter-library.tsx`
- Create: `tests/components/article-url-form.test.tsx`
- Create: `tests/components/paste-form.test.tsx`
- Create: `tests/components/starter-library.test.tsx`

**Interfaces:**
- Consumes `extractArticleAction`, `saveCurrentArticle`, `STARTER_ARTICLES`, and `useRouter`.
- Successful actions navigate to `/practice`.

- [ ] **Step 1: Write URL form component tests**

Cover empty submission, pending disabled state, successful storage/navigation, and inline action error while preserving the URL.

- [ ] **Step 2: Implement `ArticleUrlForm`**

Use a controlled input, `useTransition`, accessible labels, `aria-live="polite"`, and a primary button. On success call `saveCurrentArticle(result.article)` before `router.push("/practice")`.

- [ ] **Step 3: Write paste form tests**

Cover character count, disabled state under 200 non-whitespace characters, default title `Pasted article`, normalized whitespace, storage, and navigation.

- [ ] **Step 4: Implement `PasteForm`**

Create the `PracticeArticle` client-side with `crypto.randomUUID()` and `new Date().toISOString()`. Require 200 meaningful characters.

- [ ] **Step 5: Write starter-library tests**

Render six cards and verify that selecting one creates the expected session article and navigates to `/practice`.

- [ ] **Step 6: Implement `StarterLibrary`**

Use semantic list markup, visible topic and estimated time, keyboard-accessible buttons, and cards that collapse to one column on mobile.

- [ ] **Step 7: Run component tests**

Run: `npm test -- tests/components`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/home tests/components
git commit -m "feat: add Home article entry flows"
```

---

### Task 8: Compose the minimal responsive Home page and dark mode

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Create: `components/ui/theme-toggle.tsx`

**Interfaces:**
- Consumes all Home components.
- Produces the user-facing Home layout.

- [ ] **Step 1: Implement theme toggle**

Use a client component that toggles the `dark` class on `document.documentElement`. Store only the visual preference in `localStorage` under `econtyper.theme`; article data remains session-only. Fall back to `prefers-color-scheme` when unset.

- [ ] **Step 2: Compose Home**

Structure:

```tsx
<main>
  <header>{/* logo, description, theme toggle */}</header>
  <section>{/* URL form */}</section>
  <section>{/* paste form */}</section>
  <section>{/* starter library */}</section>
  <footer>{/* stateless privacy note */}</footer>
</main>
```

Use a maximum content width around `64rem`, reading-width text, 44 px minimum touch targets, visible focus states, restrained borders, and no decorative imagery.

- [ ] **Step 3: Verify responsive behavior manually**

Run: `npm run dev`

Check widths 320 px, 390 px, 768 px, and 1440 px. Confirm no horizontal scrolling, buttons remain tappable, and both themes preserve contrast.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/globals.css components/ui/theme-toggle.tsx
git commit -m "feat: compose responsive EconTyper home"
```

---

### Task 9: Add the placeholder Practice session boundary

**Files:**
- Create: `app/practice/page.tsx`
- Create: `components/practice/practice-loader.tsx`
- Create: `tests/components/practice-loader.test.tsx`

**Interfaces:**
- Consumes `loadCurrentArticle`.
- Displays title, source, text preview, and a reserved future ad boundary.

- [ ] **Step 1: Write practice-loader tests**

Cover valid session display and missing/corrupt session state with a Home link.

- [ ] **Step 2: Implement the loader**

Use a client component with a hydration-safe loading state. Read session data inside `useEffect`. When valid, display article metadata and a limited preview. When absent, display `No active article` and a link to `/`.

Include this non-ad placeholder below the article preview:

```tsx
<div aria-label="Future advertising area" className="mt-12 min-h-24 rounded-xl border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700">
  Advertising space reserved for a future provider.
</div>
```

Do not load AdSense or Carbon Ads scripts.

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/components/practice-loader.test.tsx`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/practice/page.tsx components/practice/practice-loader.tsx tests/components/practice-loader.test.tsx
git commit -m "feat: add session-backed practice placeholder"
```

---

### Task 10: Add end-to-end tests and Vercel verification

**Files:**
- Create: `tests/e2e/home-practice.spec.ts`
- Create: `app/api/test-article/route.ts` only when `NODE_ENV === "test"` cannot be guaranteed; otherwise use Playwright route interception.
- Modify: `playwright.config.ts`

**Interfaces:**
- Verifies the complete Home-to-Practice boundary.

- [ ] **Step 1: Configure Playwright web server**

Use `npm run dev`, base URL `http://127.0.0.1:3000`, Chromium, one retry in CI, and retain traces only on failure.

- [ ] **Step 2: Write E2E tests**

Cover:

```ts
test("pasted text opens Practice and survives navigation within the tab", async ({ page }) => {});
test("starter text opens Practice", async ({ page }) => {});
test("localhost extraction is rejected inline", async ({ page }) => {});
test("extraction fixture opens Practice", async ({ page }) => {});
test("opening Practice without session shows the empty state", async ({ page }) => {});
```

Use `page.route()` to mock a public article response for the extraction success case; never depend on an external news website.

- [ ] **Step 3: Run full verification**

Run: `npm run lint`

Expected: PASS.

Run: `npm test`

Expected: all unit and component tests PASS.

Run: `npx playwright install chromium && npm run test:e2e`

Expected: all E2E tests PASS.

Run: `npm run build`

Expected: production build succeeds with the extraction action on the Node.js runtime.

- [ ] **Step 4: Add README deployment notes**

Create `README.md` with local setup, test commands, Vercel import steps, the stateless privacy model, URL extraction limitations, and the statement that some publishers may block automated extraction.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts tests/e2e README.md
git commit -m "test: verify Home extraction flow"
```

---

## Final Verification Checklist

- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:e2e` passes.
- [ ] `npm run build` passes.
- [ ] URL form preserves input after recoverable failures.
- [ ] Paste and starter selections write only to `sessionStorage`.
- [ ] Closing the tab removes the article session.
- [ ] Localhost, private, loopback, link-local, and reserved targets are rejected.
- [ ] Every redirect target is revalidated.
- [ ] HTML size, content type, redirect count, and timeout limits are enforced.
- [ ] The layout works at 320 px and desktop widths in light and dark modes.
- [ ] No database, authentication, tracking, or advertising script exists.
