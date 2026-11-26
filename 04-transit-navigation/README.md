# 🧭 Transit Navigation

<p align="center">
  <img src="../assets/readme/navigation-banner.svg" alt="Transit Navigation banner" width="100%" />
</p>

<p align="right">
  <strong>繁體中文</strong> · <a href="./README.en.md">English</a> ·
  <a href="../README.md">專案首頁</a>
</p>

<p>
  <kbd>Origin → Destination</kbd>
  <kbd>Direct Route</kbd>
  <kbd>Transfer</kbd>
  <kbd>Journey Legs</kbd>
  <kbd>Apache-2.0</kbd>
</p>

## 🧭 目錄

- [問題背景](#這個模組解決什麼問題)
- [功能](#功能)
- [Quick Start](#quick-start)
- [主要 API](#主要-api)
- [Journey Types](#journey-types)
- [Routing Rules](#routing-rules)
- [數學模型](#-數學模型)
- [完整範例](#完整使用範例)
- [Custom DataProvider](#custom-dataprovider)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Roadmap](#roadmap)
- [License](#license)

> **把起點、目的地及 Bus／LRT network 轉成 ranked journey options，並輸出步行、乘車與轉乘 legs。**

## 🧩 這個模組解決什麼問題？

Navigation 不只是畫一條線。模組需要處理 access walking、boarding／alighting stop、transfer distance、route direction、等待時間與 journey ranking。

| Input | Processing | Output |
| --- | --- | --- |
| Origin／destination coordinates | Nearby access stops | Boarding／alighting candidates |
| Bus／LRT routes | Network construction | Transit services |
| Transfer distance | ≤ configured threshold | Transfer candidate |
| Journey metrics | Sort by time、transfers、ID | `JourneyOption[]` |
| Walking path | Provider geometry fallback | `JourneyLeg.coordinates` |

## ✨ 功能

<p align="center">
  <img src="../assets/readme/navigation-flow.svg" alt="Transit network, candidate journeys and ranking pipeline" width="100%" />
</p>

| 能力 | 說明 |
| --- | --- |
| Network builder | Bus／LRT directions 轉成 `TransitService[]` |
| Direct route | 同一 service 的 boarding → alighting |
| Transfer route | 兩個 services 加步行轉乘 |
| Traffic-aware ETA | BPR congestion、signal delay、turn penalty |
| Journey ranking | Total time、walking、transfers 與 ETA variance 的 weighted score |
| Leg generation | Walk、bus、LRT legs |
| Geometry | Walk path 與 transit stop geometry |
| Explainable output | Walk／wait／ride minutes、score、congestion 及 transfer buffer |

## 📊 At a Glance

| Metric | Value |
| --- | ---: |
| Transit modes | Bus + LRT |
| Transfer count | 1 |
| Unit tests in package | 18 |
| External routing service | 0 |

## 🚀 Quick Start

```powershell
npm run build -w @onedirect/transit-navigation
npm run test -w @onedirect/transit-navigation
```

## 🔌 主要 API

### `buildTransitNetwork(input)`

由 routes、LRT lines/stations 與 route geometry 建立 directional services。

### `loadTransitNetwork(provider)`

非同步從 `DataProvider` 載入 network。

### `calculateJourneyOptions(provider, origin, destination, options?)`

```ts
const journeys = await calculateJourneyOptions(
  provider,
  { lat: 22.1513, lng: 113.5489 },
  { lat: 22.1569, lng: 113.5663 },
  { limit: 4 },
);
```

### `prepareJourneyGeometry(provider, journey)`

為步行 legs 補上 provider 回傳的 geometry；若沒有，使用 straight-line fallback。

### `findBestJourney(journeys)`

回傳 ranked list 第一項或 `null`。

### 數學工具 API

所有公式由純函數組成，可直接 import、測試或在 host backend 重用：

```ts
import {
  haversineMeters,
  urbanDistanceMeters,
  bprSpeedKmh,
  segmentTravelSeconds,
  ewmaSpeed,
  walkingMinutes,
  lrtRideMinutes,
  feasibleTransferWaitMinutes,
  congestionRatio,
  routeScore,
} from "@onedirect/transit-navigation";
```

`calculateJourneyOptions` 與 `buildJourneyOptionsFromServices` 新增 optional options：

```ts
type JourneySearchOptions = {
  limit?: number;
  referenceTime?: Date;
  congestionRatio?: number;       // 0..1.5
  urbanDetourFactor?: number;    // 1.22..1.38
  walkingSlopeFactor?: number;   // >= 1
  transferSafetyBufferMinutes?: number;
  routeScoreWeights?: Partial<RouteScoreWeights>;
  liveWaitMinutes?: (serviceId: string, stopId: string) => number | null;
};
```

## 📦 Journey Types

```ts
type JourneyOption = {
  id: string;
  kind: "direct" | "transfer";
  totalMinutes: number;
  waitMinutes: number;
  walkMinutes: number;
  ridingMinutes: number;
  transferCount: number;
  transferBufferMinutes: number;
  congestionRatio: number;
  etaVarianceMinutes: number;
  score: number;
  badges: string[];
  legs: JourneyLeg[];
};
```

每個 `JourneyLeg` 包含：

- `type`: `walk`、`bus`、`lrt`
- `label`
- `minutes`
- `distanceMeters`
- `from`／`to`
- optional `coordinates`
- optional `waitMinutes`
- optional `waitConfidence`: `realtime` 或 `scheduled`
- optional `trafficSaturationRatio`

## 🧭 Routing Rules

1. Origin access walk 上限 `1400m`。
2. Destination access walk 上限 `1600m`。
3. Transfer walk 上限 `350m`。
4. Alight stop 必須在 boarding stop 之後。
5. Bus free-flow speed 預設 `18.6km/h`，再套用 BPR 壅塞模型。
6. LRT cruise speed `35km/h`，每個站加 `20s` dwell time。
7. Bus live ETA 由 caller 提供；沒有 live ETA 時使用 headway／2。
8. LRT 依 `LrtScheduleProfile` 的 weekday／weekend headway window 計算。
9. Transfer 會加入 `2min` safety buffer；趕不上時自動等待下一班。

## 📐 數學模型

公式集中於 [`src/routing/navigation-math.ts`](./src/routing/navigation-math.ts)，routing 只負責把 network data 套入模型。以下角度均以弧度計算。

### 1. WGS84 球面距離

$$d_{\mathrm{hav}} = 2R \arcsin\!\left(\sqrt{\sin^2\!\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\!\left(\frac{\Delta\lambda}{2}\right)}\right)$$

其中 `R = 6,371,000m`。無效座標回傳 `Infinity`，避免建立虛假 journey。

### 2. 澳門街道繞行與步行時間

$$d_{\mathrm{urban}} = \alpha_{\mathrm{urban}} d_{\mathrm{hav}}, \qquad 1.22 \le \alpha_{\mathrm{urban}} \le 1.38$$

$$T_{\mathrm{walk}} = \frac{d_{\mathrm{urban}}\eta_{\mathrm{slope}}}{v_{\mathrm{walk}} \cdot 60}, \qquad v_{\mathrm{walk}} = 1.25\mathrm{m/s}$$

預設 `αurban = 1.28`、`ηslope = 1.08`。兩者均可由 search options 覆寫並受範圍驗證。

### 3. BPR 道路壅塞模型

$$v_i(t) = \frac{v_{0,i}}{1 + \alpha \left(\frac{q_i(t)}{C_i}\right)^\beta}$$

$$T_{\mathrm{segment},i} = \frac{L_i}{v_i(t)} + N_{\mathrm{signal},i}\bar{w}_{\mathrm{signal}}(t) + P_{\mathrm{turn},i}$$

$$\bar{w}_{\mathrm{signal}}(t) = 15 + 30 \cdot \min\!\left(1.5, \frac{q_i(t)}{C_i}\right)$$

預設 `α = 0.15`、`β = 4`。Bus routing 每 `450m` 估算一個號誌，路段超過 `800m` 加 `10s` turn penalty。

### 4. EWMA 實時速度平滑

$$\hat{v}_i(t) = \gamma v_{\mathrm{obs},i}(t) + (1-\gamma)v_{\mathrm{hist},i}(t), \qquad 0.35 \le \gamma \le 0.65$$

預設 `γ = 0.5`，避免單次 traffic sample 令 ETA 大幅跳動。

### 5. Bus／LRT 等待時間

$$W_{\mathrm{scheduled}} = \frac{H(t)}{2}$$

Bus 若 caller 提供有效 live ETA，使用 `Wbus = ETAlive` 並標記 `realtime`；否則使用 headway／2 並標記 `scheduled`。

$$T_{\mathrm{ride,LRT}} = \sum_s \frac{L_s}{v_{\mathrm{LRT}}} + N_{\mathrm{stops}}t_{\mathrm{dwell}}$$

預設 `vLRT = 35km/h`、`tdwell = 20s`。LRT headway 由 weekday／weekend schedule window 決定。

### 6. 轉乘保護

$$R_{\mathrm{transfer}} = T_{\mathrm{walk,transfer}} + \delta_{\mathrm{safety}}$$

若下一班 ETA 早於 `Rtransfer`，等待時間推進至之後第一個可行班次：

$$W_{\mathrm{next}} = ETA_{\mathrm{next}} + \left\lceil\frac{R_{\mathrm{transfer}} - ETA_{\mathrm{next}}}{H}\right\rceil H$$

預設 safety buffer `δsafety = 2min`。`JourneyOption.transferBufferMinutes` 會保留緩衝時間。

### 7. Door-to-door journey time

$$T_{\mathrm{total}} = T_{\mathrm{walk,origin}} + \sum_{k=1}^{M}\left(W_{\mathrm{wait},k} + T_{\mathrm{ride},k} + B_{\mathrm{transfer},k}\right) + T_{\mathrm{walk,destination}}$$

`JourneyOption` 會分別輸出 `walkMinutes`、`waitMinutes`、`ridingMinutes` 及 `transferBufferMinutes`。顯示分鐘向上取整，ranking score 使用未取整的原始時間。

### 8. 多目標 ranking

$$J_{\mathrm{route}} = w_1T_{\mathrm{total}} + w_2T_{\mathrm{walk}} + w_3N_{\mathrm{transfers}} + w_4\sigma_{\mathrm{ETA}}$$

預設 `w1 = 1`、`w2 = 0.25`、`w3 = 2`、`w4 = 0.5`。`score` 越小越優先；分數相同時再以 total minutes、transfer count 及 stable ID 排序。

### 澳門時段擁擠 profile

| 時段 | Weekday | Weekend |
| --- | ---: | ---: |
| 07:30–09:30、17:30–19:30 | 0.95 | 0.78 |
| 10:00–17:00 | 0.55 | 0.55 |
| 19:30–23:00 | 0.38 | 0.38 |
| 其他 | 0.24 | 0.24 |

## 🧵 完整使用範例

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
  const prepared = await prepareJourneyGeometry(provider, best);
  console.log(prepared.legs);
}
```

## 🔌 Custom DataProvider

```ts
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";

class HostNavigationProvider extends MockDataProvider {
  readonly id = "host-navigation";

  override getRouteGeometries() {
    return this.hostGeometry.routes();
  }

  override getWalkingPath(from: Coordinate, to: Coordinate) {
    return this.hostWalking.route(from, to);
  }
}
```

Navigation package 不應包含 routing service URL、Mapbox token 或 vendor-specific request。

## ✅ 測試

- Mock data direct bus journey。
- Synthetic two-service transfer。
- Haversine、urban detour、BPR、signal delay、EWMA 及 walking formulas。
- Live bus availability、LRT headway window 及 missed-transfer protection。
- Route score、congestion profile、congestion sensitivity 及 unreachable coordinates。
- Geometry preparation。

## 🔒 安全邊界

- 不提交 origin／destination user data。
- 不加入真實 routing endpoint 或 API credential。
- Fixtures 必須虛構。
- 不 log 精確座標與使用者身份。

## 🤖 AI 協作

修改 network 或 routing 前先閱讀 [AGENTS.md](./AGENTS.md)。

## ✅ 適合使用場景

- 由使用者位置尋找巴士或 LRT journey。
- 需要 direct 與 one-transfer alternatives。
- 需要在沒有外部 routing service 時套用 explainable traffic-aware ETA。
- 需要把 walking、waiting、riding、transfer buffer 分開顯示。
- 想在 UI 先顯示 lightweight legs，再為 selected journey 載入 geometry。
- 想把 route ranking 從 frontend components 抽離。
- 需要以 deterministic mock network 測試 routing。

## 🚫 不適合使用場景

- 需要 street-level turn-by-turn navigation。
- 需要超過一程轉乘的 optimization。
- 需要直接呼叫 private routing backend。
- 需要真實車輛 GPS feed；本 package 只接受 caller 提供的 live bus wait，不會自行連接 vendor。

## 🔁 Journey Lifecycle

1. 載入 routes、LRT lines/stations 及 geometry。
2. 建立 directional services。
3. 找 origin access boarding stops。
4. 找 destination alight stops。
5. 選擇 Macau 時段 congestion profile 或套用 caller override。
6. 產生 direct candidates。
7. 產生 transfer candidates，並套用 missed-transfer protection。
8. 計算 walking、waiting、riding time 及 ETA variance。
9. 以多目標 score rank 及 limit results。
10. 只為 selected journey 準備 geometry。

## 🧩 Service Model

```ts
type TransitService = {
  id: string;
  mode: "bus" | "lrt";
  routeId: string | null;
  lineId: string | null;
  label: string;
  color: string;
  directionIndex: number;
  stops: NetworkStop[];
  geometry: Coordinate[];
  headwayMinutes?: number;
  scheduleProfile?: LrtScheduleProfile;
};
```

## 📊 Journey Comparison

| Kind | Boarding | Alighting | Transfer |
| --- | --- | --- | --- |
| Direct | Same service | Later stop | 0 |
| Transfer | First service | Second service | 1 walking transfer |

## ⏱️ Time Model

```text
totalMinutes =
  walkToBoarding
  + waitForFirstService
  + rideFirstService
  + transferWalk
  + waitForSecondService
  + rideSecondService
  + walkToDestination
```

每項時間都保留在 output，方便 UI 顯示或 debug。

## 🗺️ Geometry Strategy

- Bus: provider route geometry，缺資料時使用 stop coordinates。
- LRT: line geometry，reverse direction 時反轉。
- Walk: provider walking path，失敗時 straight-line fallback。
- Geometry 只在 selected journey 載入，避免一次計算所有 alternatives。

## 🏆 Ranking

先以多目標 score 排序：

1. `score` 升序。
2. Total minutes 升序。
3. Transfer count 升序。
4. Stable journey ID。

`score` 使用原始、未向上取整的分鐘與 caller 可覆寫的 weights。Host 仍可在回傳結果後加入價格、無障礙或個人 preference 作二次 ranking。

## 🧱 錯誤與限制

- Origin 或 destination 太遠時回傳空 array。
- 找不到 alight after boarding 時不建立 candidate。
- Transfer 超過 350m 時不建立 transfer candidate。
- Geometry provider 失敗時 degrade 為 local coordinates。
- 目前最多一程 transfer。

## 🧯 Troubleshooting

### 完全沒有 journey

檢查 origin／destination 是否在 access radius 內，以及 route directions 是否有順序。

### 只有 direct，沒有 transfer

可能 transfer walk 超過 threshold、兩個 services 沒有 overlapping proximity，或 destination 不在第二 service 的下游。

### Legs 次序錯誤

確認 `transferWalk` 插入位置在 first transit leg 與 second transit leg 之間。

### Geometry 是直線

Provider 沒有回傳 geometry，或 walking path unavailable；這是預期 fallback。

## ❓ FAQ

### 可以加入 second transfer 嗎？

需要擴充 candidate model 與 ranking tests；不要直接把 transfer 邏輯塞入 UI。

### 為何只 prepare best journey geometry？

減少 payload 與 computation，alternatives 可等 selected 時再 prepare。

### 可以改用 live traffic 嗎？

可以由 host 提供不同 speed profile 或 journey decorator，但核心應保持 deterministic baseline。

### 是否包含 turn-by-turn directions？

不包含。此模組只處理 transit journey 與 leg sequence。

## 🗺️ Roadmap

- [ ] Multi-transfer candidates.
- [x] Time-dependent Macau congestion profiles.
- [x] Live bus wait and scheduled LRT headway integration.
- [x] Explainable multi-objective journey ranking.
- [ ] Fare metadata hooks.
- [ ] Accessibility-aware ranking.

## 📄 License

Apache-2.0，詳見 [LICENSE](../LICENSE)。

---

<p align="center"><a href="#">Back to top</a></p>
