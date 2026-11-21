# AGENTS.md

## Boundaries

- This folder owns non-core and auxiliary functionality only.
- `geofencing-engine` and `map-viewport-ui` may depend on `02-data-fetcher-provider-layer`.
- `demo-hub` may depend on all four core packages for integration.
- No core package may import anything from `other-modules`.

## Core Navigation

- Bus ETA: `../01-bus-eta-engine/`
- Provider layer: `../02-data-fetcher-provider-layer/`
- Smart Search Keyboard: `../03-smart-transit-search-keyboard/`
- Transit Navigation: `../04-transit-navigation/`

## Conventions

- Keep UI simple and functional.
- Do not duplicate core algorithms inside demo-hub.
- Preserve package-specific README and AGENTS when editing an auxiliary module.
- Each package must clean stale build/test output before compiling.

## Security

- No real endpoint, IP, token, cookie, auth header, signature, scraper, or private domain.
- Demo must run entirely on fictional mock data.
- Do not add remote tile or map-style URLs.

## Extend

- New auxiliary function: add a focused package under `other-modules/`.
- Integration demo change: edit `demo-hub/src/main.ts` and CSS only.
- Before finishing, run root `npm run verify`.
