# AGENTS.md

## Boundaries

- Auxiliary React UI only.
- May depend on `@onedirect/data-fetcher-provider-layer`.
- Core packages must not import this module.
- Mapbox integration belongs behind `mountMapboxAdapter`.

## Conventions

- Keep projection, clustering, and theme helpers pure.
- Keep the default demo offline.
- Use icon buttons with accessible labels.
- Avoid UI controls overlapping markers or sheets.
- Test clustering and theme tokens.

## Security

- No real tile URLs, style URLs, tokens, cookies, headers, private domains, or server secrets.
- `VITE_*` values are public; never put privileged credentials there.
- Mock station data remains fictional.

## Extend

- Clustering: `src/map/clustering.ts`.
- Theme: `src/map/theme.ts`.
- Mapbox lifecycle: `src/map/mapbox-adapter.ts`.
- Core integration belongs in `other-modules/demo-hub`.
