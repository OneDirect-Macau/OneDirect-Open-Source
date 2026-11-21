# ⚡ Quick Start

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="./INSTALLATION.md">Installation</a>
</p>

## 繁體中文

### 1. Install

```powershell
npm install
```

### 2. Verify

```powershell
npm run verify
```

### 3. Run the demo

```powershell
npm run dev
```

### Minimal code

```ts
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import { estimateSnapshotArrivals, matchLiveRoute } from "@onedirect/bus-eta-engine";

const provider = new MockDataProvider();
const route = await provider.getRoute("B12");
const live = await provider.getLiveRoute("B12", 0);

if (route && live) {
  const match = matchLiveRoute(route, live);
  if (match) {
    const direction = route.directions[match.directionIndex]!;
    console.log(estimateSnapshotArrivals(direction, live));
  }
}
```

### What to check

- Provider counts appear in the demo.
- `B12` appears in search.
- ETA panel returns a minute value.
- Navigation panel returns walk and bus legs.

## 🇬🇧 English

Install dependencies, run the verification suite, and start the demo with the three commands above.

The minimal example demonstrates provider injection, live snapshot loading, direction matching, and downstream ETA estimation without network access.

Expected demo results include provider counts, B12 search results, a non-empty ETA, and a journey leg sequence.
