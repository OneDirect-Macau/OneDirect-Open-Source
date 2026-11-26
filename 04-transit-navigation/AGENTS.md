# AGENTS.md

## Boundaries

- Owns transit network construction, direct/transfer generation, journey ranking, leg sequence, and geometry preparation.
- Depends on `@onedirect/data-fetcher-provider-layer`.
- Must not own search UI, ETA countdown state, provider cache, or Mapbox rendering.
- Pure routing tests may use synthetic `TransitService[]`; provider integration tests use `MockDataProvider`.

## Conventions

- Preserve forward stop order for every service direction.
- Reject journeys where alight index is not after boarding index.
- Rank by the documented multi-objective score, then total minutes, fewer transfers, and stable ID.
- Keep congestion, walking, wait, ride, transfer-buffer, variance, and score values auditable in the journey output.
- Walking, waiting, and riding time must remain separately auditable.
- Geometry preparation must degrade to straight lines or known stop coordinates.
- Tests must cover direct, transfer, unreachable, and geometry cases.

## Security

- No routing service URL, API token, request header, or private hostname.
- Never copy production stop coordinates unless intentionally replaced with fictional fixtures.
- Do not log origin/destination coordinates or user identity.

## Extend

- Network shape changed: update `src/network/build-transit-network.ts` and integration tests.
- Routing changed: update `src/routing/routing.ts`; add direct/transfer boundary cases.
- New geometry source: extend `02` contracts and `MockDataProvider` first.
- UI result rendering belongs in `other-modules/demo-hub`.
