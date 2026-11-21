# AGENTS.md

## Architecture & Boundaries

```text
02-data-fetcher-provider-layer
    ↑
    ├── 01-bus-eta-engine
    ├── 03-smart-transit-search-keyboard
    └── 04-transit-navigation

other-modules = auxiliary only
```

- `02-data-fetcher-provider-layer` owns shared contracts, providers, mock data, cache, retry, and fallback.
- `01`, `03`, and `04` must not import one another directly.
- No module in `other-modules` may become an upstream dependency of a core module.
- `other-modules/demo-hub` may depend on the four core packages because it is an integration surface.
- Keep UI functional and minimal. Core algorithm changes take priority over presentation work.

## Core Ownership

| Module | Owns | Must not own |
| --- | --- | --- |
| `01-bus-eta-engine` | ETA parsing, state, arrival estimation, direction matching | HTTP, provider implementation, UI |
| `02-data-fetcher-provider-layer` | Contracts, providers, cache, retry, fallback, fixtures | ETA UI, search UI, navigation logic |
| `03-smart-transit-search-keyboard` | Query normalization, ranking, dynamic keyboard state | Real APIs, route geometry, ETA |
| `04-transit-navigation` | Network construction, journey candidates, legs, geometry preparation | Search keyboard UI, provider auth |
| `other-modules` | Geofencing, optional map UI, integration demo | New mandatory dependencies for core modules |

## Coding Conventions

- TypeScript strict mode is mandatory.
- Accept untrusted external payloads as `unknown` and return typed domain objects.
- Use fixed clocks, fixed data, and deterministic ordering in tests.
- Provider calls must receive a `DataProvider` instance; no singleton network client.
- Remove stale `dist` and `.test-dist` in package scripts before build/test.
- Every behavior change requires a focused unit test.

## Security & Privacy Rules

- Never add operational URLs, government endpoints, private domains, IPs, tokens, cookies, auth headers, signatures, scraping selectors, or User-Agent spoofing.
- Never copy production payloads, coordinates, credentials, or request metadata into fixtures.
- All fixtures must be fictional and intentionally authored.
- Real authentication and network access belong to a host-owned `DataProvider`, never the public frontend or core package.

## How to Extend

- Shared contract changed: update `02/src/contracts`, `MockDataProvider`, fixtures, and affected package tests.
- ETA changed: update `01/src/eta` and `01/test/eta.test.ts`.
- Search changed: update `03/src/search` or `03/src/keyboard` and corresponding tests.
- Navigation changed: update `04/src/network` or `04/src/routing`; add direct, transfer, unreachable, and geometry cases.
- Auxiliary feature changed: keep it under `other-modules` and preserve core dependency direction.
- Before finishing, run `npm run verify`.
