# AGENTS.md

## Boundaries

- Auxiliary geospatial module only.
- May depend on `@onedirect/data-fetcher-provider-layer`.
- Must not be imported by core modules.
- No network, UI, ETA, or route matching.

## Conventions

- Validate latitude/longitude and radius.
- Use deterministic distance and ID sorting.
- Keep all outputs in meters.
- Test exact radius boundaries and invalid coordinates.

## Security

- No real endpoints, tokens, headers, IPs, private domains, or production coordinates.
- Fixtures remain fictional.

## Extend

- Distance change: `src/distance.ts`.
- Radius change: `src/nearby.ts`.
- Update tests and `other-modules/README.md` if exports change.
