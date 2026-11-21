# 📍 Geofencing Engine

<p align="center">
  <img src="../../assets/readme/geofencing-banner.svg" alt="Geofencing Engine banner" width="100%" />
</p>

<p align="right">
  <strong>繁體中文</strong> · <a href="./README.en.md">English</a> ·
  <a href="../README.md">Other Modules</a>
</p>

<p>
  <kbd>Auxiliary</kbd>
  <kbd>Haversine</kbd>
  <kbd>Nearby Stops</kbd>
  <kbd>Apache-2.0</kbd>
</p>

## 🧭 目錄

- [功能](#功能)
- [Quick Start](#quick-start)
- [Example](#example)
- [Use Cases](#使用場景)
- [API Details](#api-details)
- [Performance](#效能)
- [Tests](#tests)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [License](#license)

> **計算 WGS84 distance、半徑內站點及每條 route 最近的一站。**

## ✨ 功能

| Function | Description |
| --- | --- |
| `distanceInMeters` | Haversine spherical distance |
| `isCoordinate` | WGS84 type guard |
| `assertCoordinate` | Validation with domain error |
| `findNearbyStops` | Radius filter and distance sorting |
| `findNearestStopPerRoute` | One nearest stop per route |

## 🚀 Quick Start

```powershell
npm run build -w @onedirect/geofencing-engine
npm run test -w @onedirect/geofencing-engine
```

## 🧵 Example

```ts
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import { findNearbyStops } from "@onedirect/geofencing-engine";

const provider = new MockDataProvider();
const nearby = await findNearbyStops(
  provider,
  { lat: 22.1512, lng: 113.5488 },
  { radiusMeters: 750, limit: 20 },
);
```

## 📦 Input and Output

| Input | Validation |
| --- | --- |
| `lat` | `-90..90` |
| `lng` | `-180..180` |
| `radiusMeters` | `> 0` |
| `limit` | positive integer |

Output：

```ts
type NearbyStop = {
  stop: TransitStop;
  distanceMeters: number;
};
```

## 🔌 Custom DataProvider

只是需要 `getStops()`。Host provider 可從任何 backend 映射 `TransitStop[]`，但不可把 endpoint 或 headers 放入本 package。

## ✅ Tests

- Same coordinate returns zero。
- Known latitude distance。
- Invalid coordinate。
- Radius boundary。
- Nearest stop per route。

## 🔒 Security

Mock coordinates must remain fictional. Do not log user location.

## 🤖 AI Collaboration

Read [AGENTS.md](./AGENTS.md).

## 🌐 使用場景

- 以 GPS 找附近 1km 內站點。
- 每條路線只顯示最近站點。
- 在 navigation 前作 access-stop filtering。
- 為 map viewport 作 distance sorting。

## 📐 Haversine Formula

```text
a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
c = 2 · atan2(√a, √(1−a))
d = R · c
```

此 package 使用 `asin` 版本並將 haversine 值 clamp 至 `0..1`。

## 🔌 API Details

### `distanceInMeters(from, to, radius?)`

- 預設 Earth radius `6_371_000`。
- 回傳 meters。
- Invalid coordinate 會拋出 `CoordinateValidationError`。

### `findNearbyStops`

- route filter 可選。
- limit 預設 `50`。
- 排序先 distance、再 stop ID。

### `findNearestStopPerRoute`

- 會為每個 route ID 保留最近 candidate。
- 同一站服務多條 route 時可被多條 route 選中。

## ⚡ 效能

時間複雜度為 `O(stops × routesPerStop)`，對一般數百至數千站點足夠。若需要更大資料集，host 可加入 geospatial index，再以相同 output contract 回傳。

## 🧯 Troubleshooting

### 所有 distance 都是 Infinity

檢查 coordinate 是否為 finite WGS84 值。

### 最近站點不在預期 route

檢查 `routeIds` 是否完整；本模組依賴 provider data。

### Radius boundary 不穩定

距離計算是 floating point；測試應使用 tolerance 或明確 boundary fixtures。

## ❓ FAQ

### 是否支援 polygon？

目前只支援半徑搜尋。

### 是否計算 walking route？

不計算；只計算 straight-line geographic distance。

### 是否會 cache provider？

不會；cache 由 provider layer 負責。

## 📄 License

Apache-2.0. See [LICENSE](../../LICENSE).

---

<p align="center"><a href="#">Back to top</a></p>
