# Local Handoff Foundation Design

## Goal
Prepare low-risk, independently testable foundations in GitHub before browser-dependent work continues locally with Kimi.

## Scope
- Add project agent rules.
- Add a pure WPM calculator with tests.
- Extend history records with optional WPM and elapsed-time fields without breaking old records.
- Persist typing settings in localStorage while reading legacy sessionStorage values.
- Add static metadata for recommended English reading sites.

## Out of Scope
- TTS first-word audio fixes.
- Right-side tool panel and mobile drawer.
- Long-article rendering optimization.
- Recording full per-session vocabulary lists in history.
- Visual placement of recommended-site cards.

## Architecture
Pure calculations and normalization stay in `lib`. Browser persistence is isolated in a settings storage helper. Existing history fields remain required; newly introduced metrics are optional and normalized defensively. Recommended sites are static typed data so local UI work can consume them without network calls.

## Compatibility
Existing history records without speed metrics remain valid. Existing settings are loaded in this order: new localStorage key, legacy localStorage key, legacy sessionStorage keys, defaults. Successfully loaded settings are normalized and written to the new localStorage key.

## Verification
Each production behavior receives a failing unit test first. CI must pass tests, lint, and production build after implementation.
