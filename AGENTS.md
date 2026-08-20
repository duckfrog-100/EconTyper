# EconTyper Development Rules

## Project
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Browser localStorage and sessionStorage
- No backend or user account in the current MVP

## Workflow
1. Read relevant files before editing.
2. Separate verified facts from assumptions.
3. Write a failing test before production changes.
4. Make the smallest change that satisfies the task.
5. Do not perform unrelated refactoring.
6. Preserve existing browser storage compatibility.
7. Run `npm test`, `npm run lint`, and `npm run build`.
8. Do not claim completion unless relevant checks pass.

## Safety
- Never expose API keys.
- Never commit `.env` files.
- Ask before introducing a dependency.
- Ask before making a breaking storage-schema change.
- Prefer focused edits over large rewrites.

## Communication
- Respond in Korean.
- Report changed files and exact verification results.
- Mention remaining risks honestly.
