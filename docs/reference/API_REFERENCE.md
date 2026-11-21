# 🔌 API Reference

<p align="right">
  <a href="../README.md">Docs Index</a>
</p>

## 繁體中文

### 01 Bus ETA Engine

```ts
import {
  deriveEtaState,
  estimateSnapshotArrivals,
  matchLiveRoute,
  parseEtaPayload,
} from "@onedirect/bus-eta-engine";
```

主要 output：`EtaSnapshot`、`EtaState`、`DirectionMatch`、`StopArrivalEstimate[]`。

### 02 Data Fetcher & Provider Layer

```ts
import {
  CachedDataProvider,
  FallbackDataProvider,
  MockDataProvider,
  TtlCache,
  withRetry,
} from "@onedirect/data-fetcher-provider-layer";
```

主要 exports：`DataProvider`、mock fixtures、cache、retry、fallback。

### 03 Smart Transit Search Keyboard

```ts
import {
  SmartTransitSearchController,
  buildKeyAvailability,
  createSearchIndex,
  searchTransit,
} from "@onedirect/smart-transit-search-keyboard";
```

主要 output：`SearchCandidate`、`SearchResult[]`、`KeyboardState`。

### 04 Transit Navigation

```ts
import {
  calculateJourneyOptions,
  findBestJourney,
  prepareJourneyGeometry,
} from "@onedirect/transit-navigation";
```

主要 output：`TransitService`、`JourneyOption`、`JourneyLeg`。

### Auxiliary Modules

- `@onedirect/geofencing-engine`
- `@onedirect/map-viewport-ui`

## 🇬🇧 English

This page summarizes the public entry points for the four core packages. Detailed behavior, edge cases, and provider integration examples live in each package’s bilingual README.

The ETA engine exports parsing, state, direction matching, and arrival estimation. The provider layer exports the contract, mock data, wrappers, cache, and retry. Search exports index creation, ranking, controller state, and key availability. Navigation exports network construction, journey planning, ranking, and geometry preparation.
