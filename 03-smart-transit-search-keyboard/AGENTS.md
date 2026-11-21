# AGENTS.md

## Boundaries

- Owns query normalization, route/stop indexing, ranking, completions, and dynamic key state.
- Depends on `@onedirect/data-fetcher-provider-layer`.
- Does not own HTTP, provider auth, ETA, navigation, or map rendering.
- Keep logic framework-agnostic; demo-hub owns presentation.

## Conventions

- Use NFKC normalization and locale-safe comparisons.
- Exact IDs rank above prefix IDs; prefix IDs rank above description matches.
- Empty query returns no suggestions.
- Disabled key must be impossible to append into an existing route prefix.
- Preserve deterministic ordering with numeric-aware route ID sorting.
- Tests must cover full-width input, stop search, disabled keys, selection, and backspace.

## Security

- Do not add upstream search endpoints or autocomplete API credentials.
- Search indexes must be built from injected provider data.
- Never log raw user queries together with location or account data.

## Extend

- Ranking changed: update `src/search/search.ts` and `test/search.test.ts`.
- Keyboard behavior changed: update `src/keyboard/keyboard-model.ts` and keyboard tests.
- New candidate source: add it to `buildSearchCandidates` and provider contracts where necessary.
- UI changes belong in `other-modules/demo-hub`.
