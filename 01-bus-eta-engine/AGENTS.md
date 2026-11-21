# AGENTS.md

## Boundaries

- Owns ETA parsing, countdown state, vehicle-to-stop estimation, direction matching, and LRT headway helpers.
- Depends only on `@onedirect/data-fetcher-provider-layer`.
- Must not implement HTTP, provider caching, search UI, or navigation.
- Must not import `03` or `04`.

## Conventions

- Treat upstream payloads as `unknown`.
- Accept `now` for all time-sensitive functions.
- Never estimate backwards from a vehicle already beyond the target stop.
- Ignore vehicles with `speedKmh <= 0`.
- Sort multiple vehicle arrivals by minutes, then vehicle ID.
- Cover zero-minute, stale, missing vehicle, reverse direction, and invalid payload cases.

## Security

- No endpoint, IP, token, cookie, auth header, signature, scraping selector, or real transport target.
- Live and ETA fixtures must remain fictional.
- Logs must not contain raw live payloads or credentials.

## Extend

- ETA payload fields: update `src/eta/eta-parser.ts`, contracts in `02`, and parser tests.
- Arrival algorithm: update `src/eta/arrival-estimator.ts` and `test/eta.test.ts`.
- Direction matching: update `src/matching/` and `test/matching.test.ts`.
- New provider capability: extend `02` first; never call a vendor directly here.
