# EconTyper Home & URL Extraction Design

**Date:** 2026-07-23  
**Repository:** `duckfrog-100/EconTyper`

## 1. Goal

Build the first working slice of EconTyper: a minimal Home page where users can submit a public article URL, paste text directly, or select an English economics starter text, then continue to a stateless practice flow. This design covers the full product architecture but the first implementation milestone is Home + secure URL extraction.

## 2. Product Constraints

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS with dark mode
- No account, database, server-side persistence, or saved history
- Current article and practice state stored only in `sessionStorage`
- Closing the tab or browser removes the active session data
- URL extraction uses Mozilla Readability and JSDOM on the server
- Public `http` and `https` URLs are allowed
- Localhost, loopback, link-local, private IP ranges, metadata endpoints, and internal network targets are blocked
- Mobile-first responsive layout
- Vercel-compatible runtime and deployment
- Practice page reserves a stable ad area for future AdSense or Carbon Ads integration

## 3. Chosen Architecture

Use a Server Action for article extraction.

Flow:

1. User enters a URL on the Home page.
2. A client component submits the URL to a Server Action.
3. The Server Action validates the URL and resolves its hostname.
4. The server rejects local, private, loopback, link-local, and reserved targets.
5. The server fetches the HTML with an explicit timeout, redirect limit, response-size limit, and browser-like headers.
6. JSDOM creates a DOM and Mozilla Readability extracts the main article.
7. The Server Action returns a normalized `PracticeArticle` object.
8. The client stores the object in `sessionStorage` and navigates to `/practice`.

Direct paste and Starter Library selections skip the server extraction step and store the normalized article directly in `sessionStorage`.

## 4. Core Data Model

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
```

Session storage key:

```ts
"econtyper.currentArticle"
```

No server-side copy of the article is retained after the response completes.

## 5. Repository Structure

```text
app/
├─ actions/
│  └─ extract-article.ts
├─ practice/
│  └─ page.tsx
├─ summary/
│  └─ page.tsx
├─ globals.css
├─ layout.tsx
└─ page.tsx

components/
├─ home/
│  ├─ article-url-form.tsx
│  ├─ paste-form.tsx
│  └─ starter-library.tsx
├─ practice/
│  ├─ ad-slot.tsx
│  ├─ article-viewer.tsx
│  ├─ dictionary-popover.tsx
│  ├─ session-stats.tsx
│  └─ typing-session.tsx
└─ ui/

lib/
├─ article-extractor.ts
├─ session-storage.ts
├─ starter-library.ts
├─ text-segmentation.ts
├─ typing-metrics.ts
└─ url-security.ts

types/
└─ article.ts
```

Each file has one main responsibility. URL security is isolated from article parsing so it can be tested independently.

## 6. Home Page Design

The Home page uses a centered, narrow reading-width layout with a minimal header and three entry paths.

### URL extraction

- URL input with label and example placeholder
- Primary `Extract article` button
- Inline loading state
- Inline error message without navigating away
- Successful extraction stores the article and opens `/practice`

### Direct paste

- Large textarea
- Optional title input
- Character count
- Disabled start button until meaningful text is entered
- On submit, normalize whitespace, store the article, and open `/practice`

### Starter Library

Six bundled English economics and finance texts that are either public domain or newly authored for the application. Each card contains title, topic, estimated reading length, and a `Practice` action.

Initial topics:

1. Supply and Demand
2. Inflation and Purchasing Power
3. Opportunity Cost
4. The Role of Central Banks
5. Comparative Advantage
6. Market Competition

To avoid copyright uncertainty, the initial library will use original educational summaries written for EconTyper rather than copied modern news articles.

## 7. URL Security and Fetch Rules

The extraction service must defend against SSRF and resource exhaustion.

### Validation

- Accept only `http:` and `https:` schemes
- Reject URLs containing credentials
- Reject empty or malformed hostnames
- Reject `localhost` and local hostname suffixes
- Resolve DNS and inspect all returned IP addresses
- Reject IPv4 and IPv6 loopback, private, link-local, multicast, unspecified, carrier-grade NAT, documentation, benchmark, and reserved ranges
- Repeat validation for every redirect target

### Fetch controls

- Maximum 4 redirects
- 10-second total timeout
- Maximum 2 MB HTML response body
- Accept HTML content types only
- Reject binary downloads and unsupported content types
- Use a descriptive User-Agent
- Do not forward cookies, authorization headers, or user-provided headers

DNS rebinding cannot be eliminated perfectly with a basic `fetch` flow. The implementation will validate every redirect and all DNS answers immediately before requesting. For a higher-security production environment, extraction should later move behind a dedicated proxy or controlled egress service.

## 8. Article Extraction Rules

- Parse HTML with JSDOM using the final response URL as the document URL
- Run Mozilla Readability on a cloned document
- Require a non-empty title or text body
- Strip script, style, form, navigation, and unsafe embedded content through Readability output handling
- Convert extracted HTML to normalized plain text
- Collapse repeated whitespace while preserving paragraph boundaries
- Reject results below a minimum meaningful length
- Return title, byline, excerpt, source URL, source host, and plain text

Expected user-facing failures:

- Invalid URL
- Address is not publicly reachable
- Website blocked automated access
- Response was not an HTML article
- Article body could not be found
- Article was too large or timed out

## 9. Practice and Summary Extension

The first implementation milestone will create the data boundary needed for later pages.

### Practice

- Read `econtyper.currentArticle` from `sessionStorage`
- Redirect to Home when no article exists
- Split text into sentence-level units with `Intl.Segmenter` and a fallback splitter
- Show source text and active sentence
- Calculate live accuracy and WPM
- Double-click a word to call a free dictionary API and show a popover
- Use Web Speech API for sentence playback and dictation practice
- Focus Mode hides secondary controls and article context
- Place `AdSlot` below the practice workspace, outside the active typing area

### Summary

- Accuracy
- WPM
- Correct characters
- Mistyped characters
- Elapsed time
- Completed sentence count
- Retry and return-home actions

Summary data exists only for the active browser session.

## 10. Advertising Boundary

The Practice page contains a dedicated `AdSlot` component below the main content.

Rules:

- Stable minimum height to prevent layout shift
- Clearly separated from typing controls
- Never placed between source text and typing input
- Responsive width with safe mobile spacing
- No ad script included in the MVP
- Future provider-specific code is isolated inside `AdSlot`
- Ad loading failure must not affect practice functionality

## 11. Error Handling

- Server Action returns a typed success or failure result rather than throwing expected user errors
- Unexpected server failures are logged without exposing internal network details to the user
- Client forms preserve the entered URL or pasted text after recoverable failures
- Session storage parsing uses runtime validation and clears corrupt values
- Practice page provides a clear return-to-home state when session data is absent

## 12. Testing Strategy

### Unit tests

- URL scheme validation
- Private and reserved IPv4/IPv6 detection
- Redirect target validation
- HTML content-type and body-size enforcement
- Readability extraction and text normalization
- Session storage serialization helpers
- Starter Library data validity

### Component tests

- URL form loading, success, and error states
- Paste form validation
- Starter card selection
- Mobile layout behavior for primary controls

### End-to-end tests

- Paste text → Practice navigation
- Starter text → Practice navigation
- Public fixture article → extraction → Practice navigation
- Blocked localhost/private URL displays an error
- Missing session article returns user to Home

External news sites will not be required for deterministic CI tests. Tests will use local HTML fixtures and mocked network responses.

## 13. First Milestone Acceptance Criteria

Home + URL extraction is complete when:

1. A fresh Next.js 14 TypeScript and Tailwind project runs locally.
2. The Home page offers URL, paste, and six Starter Library options.
3. A valid public article can be extracted with Readability and stored in `sessionStorage`.
4. Local, private, loopback, and reserved network targets are rejected.
5. Redirect destinations are revalidated.
6. Extraction failures appear as clear inline messages.
7. Paste and Starter Library choices navigate to a placeholder Practice page with the correct article loaded.
8. Layout is usable on mobile and desktop in light and dark modes.
9. Unit and component tests pass.
10. The project builds successfully for Vercel.
