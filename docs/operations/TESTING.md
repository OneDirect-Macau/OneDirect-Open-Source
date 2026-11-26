# ✅ Testing

<p align="right">
  <a href="../README.md">Docs Index</a>
</p>

## 繁體中文

### Commands

| Command | Scope |
| --- | --- |
| `npm test` | All workspace tests |
| `npm run build` | All builds |
| `npm run sanitize` | Security scan |
| `npm run verify` | Full gate |

### Test matrix

| Area | Cases |
| --- | --- |
| ETA | Duplicate arrivals、zero minute、stale、direction、stationary vehicle |
| Provider | TTL、retry、fallback、defensive copy |
| Search | Full-width input、ranking、disabled keys |
| Navigation | Direct、transfer、Haversine／BPR／EWMA、LRT headway、transfer protection、ranking、unreachable、geometry |
| Geofencing | Distance、invalid coordinate、radius |
| Map | Projection、clustering、theme |

### Fixture rules

- 全部虛構。
- 固定時間及 deterministic ordering。
- 每個 fixture 都要有 test consumer。
- 不加入 production response。

## 🇬🇧 English

Use `npm run verify` as the full quality gate. It runs sanitization, workspace builds, and all unit tests.

Tests cover ETA boundaries, provider caching and fallback, search normalization, navigation direct and transfer journeys, geofencing, and map helpers. Fixtures remain fictional and deterministic.
