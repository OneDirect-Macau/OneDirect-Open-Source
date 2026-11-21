# AGENTS.md

## Boundaries

- This package is the only shared foundation for `01`, `03`, `04`, and `other-modules`.
- Owns contracts, provider interfaces, mock data, cache, retry, and fallback behavior.
- Must not own ETA logic, search ranking, navigation routing, or UI.
- Keep all provider methods platform-neutral.

## Conventions

- Return defensive copies from mock and cached providers.
- Use injected clocks in `TtlCache` tests.
- Use injected sleep in retry tests.
- Fallback must be explicit and observable through `activeSources()`.
- `reload()` must clear caches before reloading.
- Add tests for cache expiration, retry exhaustion, primary failure, and defensive copies.

## Security

- Never add real endpoints, SDK credentials, headers, cookies, tokens, signatures, IPs, or production payloads.
- Fixtures must use fictional names, codes, and coordinates.
- Do not expose raw transport error bodies.

## Extend

- New contract: update `src/contracts/`, add a fixture, implement `MockDataProvider`, and add a test.
- New provider wrapper: keep it generic and composable around `DataProvider`.
- New retry behavior: add deterministic tests with an injected sleeper.
- Before finishing, run provider tests and root `npm run verify`.
