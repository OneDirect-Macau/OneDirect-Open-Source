# 🧭 Transit Navigation

<p align="center">
  <img src="../assets/readme/navigation-banner.svg" alt="Transit Navigation banner" width="100%" />
</p>

<p align="right">
  <a href="./README.md">繁體中文</a> · <strong>English</strong> ·
  <a href="../README.en.md">Project Home</a>
</p>

<p>
  <kbd>Origin → Destination</kbd>
  <kbd>Direct Route</kbd>
  <kbd>Transfer</kbd>
  <kbd>Journey Legs</kbd>
  <kbd>Apache-2.0</kbd>
</p>

## 🧭 Contents

- [Problem](#what-problem-does-it-solve)
- [Features](#features)
- [Quick Start](#quick-start)
- [Main API](#main-api)
- [Journey Output](#journey-output)
- [Routing Rules](#routing-rules)
- [Complete Example](#complete-example)
- [Custom DataProvider](#custom-dataprovider)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [License](#license)

> **Turn origin and destination coordinates into ranked bus and LRT journeys with walking, riding, and transfer legs.**

## What Problem Does It Solve?

Navigation is more than drawing a line. The engine handles access walking, boarding and alighting stops, transfer distance, direction, waiting time, and journey ranking.

| Input | Processing | Output |
| --- | --- | --- |
| Origin and destination | Nearby access stops | Boarding and alighting candidates |
| Bus and LRT routes | Network construction | Transit services |
| Transfer distance | Threshold check | Transfer candidates |
| Journey metrics | Time and transfer ranking | `JourneyOption[]` |
| Walking path | Provider geometry or fallback | `JourneyLeg.coordinates` |

## ✨ Features

<p align="center">
  <img src="../assets/readme/navigation-flow.svg" alt="Transit network, candidate journeys and ranking pipeline" width="100%" />
</p>

| Capability | Description |
| --- | --- |
| Network builder | Convert route directions into services |
| Direct route | Board and alight on the same service |
| Transfer route | Two services plus walking transfer |
| Ranking | Time, transfers, then stable ID |
| Leg generation | Walk, bus, and LRT legs |
| Geometry | Walking paths and transit stop geometry |

## 📊 At a Glance

| Metric | Value |
| --- | ---: |
| Transit modes | Bus + LRT |
| Supported transfers | 1 |
| Unit tests in package | 3 |
| External routing service | 0 |

## 🚀 Quick Start

```powershell
npm run build -w @onedirect/transit-navigation
npm run test -w @onedirect/transit-navigation
```

## 🔌 Main API

### `buildTransitNetwork(input)`

Builds directional services from routes, LRT lines, stations, and route geometry.

### `loadTransitNetwork(provider)`

Loads the same network from a `DataProvider`.

### `calculateJourneyOptions(provider, origin, destination, options?)`

Returns ranked direct and transfer journeys.

### `prepareJourneyGeometry(provider, journey)`

Adds walking geometry through the provider and falls back to a straight line.

### `findBestJourney(journeys)`

Returns the first ranked journey or `null`.

## 📦 Journey Output

Every journey contains total, waiting, and walking minutes, transfer count, badges, and a sequence of legs.

Every leg contains:

- `type`: `walk`, `bus`, or `lrt`
- `label`
- `minutes`
- `distanceMeters`
- `from` and `to`
- optional `coordinates`

## 🧭 Routing Rules

1. Origin access walk: up to `1400m`.
2. Destination access walk: up to `1600m`.
3. Transfer walk: up to `500m`.
4. Alighting must occur after boarding.
5. Bus speed: `310m/min`.
6. LRT speed: `520m/min`.
7. Bus wait: `4min`.
8. LRT wait: `3min`.

## 🧵 Complete Example

```ts
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import {
  calculateJourneyOptions,
  findBestJourney,
  prepareJourneyGeometry,
} from "@onedirect/transit-navigation";

const provider = new MockDataProvider();
const journeys = await calculateJourneyOptions(
  provider,
  { lat: 22.1513, lng: 113.5489 },
  { lat: 22.1569, lng: 113.5663 },
);

const best = findBestJourney(journeys);
if (best) {
  console.log(await prepareJourneyGeometry(provider, best));
}
```

## 🔌 Custom DataProvider

Override route geometry and walking path loading in the host provider. Keep routing endpoints and credentials outside the public package.

## ✅ Tests

Coverage includes a direct mock bus journey, a synthetic transfer, unreachable coordinates, and geometry preparation.

## 🔒 Security

- Do not commit user origin or destination data.
- Do not add real routing endpoints or API credentials.
- Fixtures must remain fictional.
- Do not log precise coordinates or user identity.

## 🤖 AI Collaboration

Read [AGENTS.md](./AGENTS.md) before changing the network or routing logic.

## ✅ When to Use It

- Find bus or LRT journeys from a user position.
- Compare direct and one-transfer alternatives.
- Show lightweight legs first and prepare geometry only for the selected trip.
- Move route ranking out of UI components.
- Test routing deterministically against a fictional network.

## 🚫 When Not to Use It

- Street-level turn-by-turn navigation.
- Traffic-aware travel time.
- Optimization across multiple transfers.
- Direct calls to a private routing backend.

## 🔁 Journey Lifecycle

The planner loads the network, finds access stops, generates direct and transfer candidates, calculates walking and waiting time, ranks results, and prepares geometry only when needed.

## 🧩 Service Model

A service includes mode, optional route or line ID, label, color, direction, ordered stops, and geometry.

## 📊 Journey Comparison

| Kind | Boarding | Alighting | Transfer |
| --- | --- | --- | --- |
| Direct | One service | Later stop | None |
| Transfer | First service | Second service | One walking transfer |

## ⏱️ Time Model

Total time is the sum of access walking, first wait, first ride, transfer walk, second wait, second ride, and destination access walking. Each component remains available in the output.

## 🗺️ Geometry Strategy

- Bus uses provider geometry with stop fallback.
- LRT uses line geometry and reverses it for reverse directions.
- Walking uses provider geometry with straight-line fallback.
- Alternatives defer geometry until selected.

## 🏆 Ranking

Journeys rank by total minutes, then transfer count, then stable ID. Hosts can apply additional preference ranking after receiving typed results.

## 🧱 Errors and Limits

- Unreachable coordinates return an empty list.
- Alighting must follow boarding.
- A transfer walk over `500m` is rejected.
- Missing geometry degrades to local coordinates.
- The current planner supports at most one transfer.

## 🧯 Troubleshooting

### No journeys appear

Check access radius, route directions, and stop order.

### Direct journeys exist but transfers do not

Check the transfer-walk threshold and destination progress on the second service.

### Leg order is wrong

The transfer walk must appear between the first and second transit legs.

### Geometry is a straight line

The provider did not return a usable path. The fallback is intentional.

## ❓ FAQ

### Can I add a second transfer?

Extend the candidate model and ranking tests rather than adding transfer logic to UI code.

### Why prepare only the best geometry?

It reduces computation and payload size for alternatives.

### Can travel time use live traffic?

A host can provide additional speed profiles or decorators while keeping a deterministic baseline.

### Does it provide turn-by-turn directions?

No. It models transit legs and access walking.

## 🗺️ Roadmap

- Multi-transfer candidates.
- Time-dependent speeds.
- Fare metadata hooks.
- Accessibility-aware ranking.

## 📄 License

Apache-2.0. See [LICENSE](../LICENSE).

---

<p align="center"><a href="#">Back to top</a></p>
