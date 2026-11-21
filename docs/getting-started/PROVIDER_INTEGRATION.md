# 🔌 Provider Integration

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="../../02-data-fetcher-provider-layer/README.md">Provider README</a>
</p>

## 繁體中文

Host application 負責真實資料接入。Core packages 只依賴 `DataProvider` contract。

### Implementation pattern

```ts
import type {
  DataProvider,
  TransitRoute,
  TransitStop,
} from "@onedirect/data-fetcher-provider-layer";

interface BackendClient {
  routes(): Promise<TransitRoute[]>;
  stops(): Promise<TransitStop[]>;
}

export class HostProvider implements DataProvider {
  readonly id = "host";

  constructor(private readonly client: BackendClient) {}

  getRoutes() {
    return this.client.routes();
  }

  getStops() {
    return this.client.stops();
  }

  // 實作其餘 provider methods。
}
```

### Secure integration

- Authentication 與 headers 留在 host／server provider。
- Response 必須 map 成 shared contracts。
- Cache key 包含 route、stop、direction 及 coordinate。
- Permanent errors 不重試。
- 不記錄完整 upstream payload。

### Network failure policy

建議使用 `withRetry`、`CachedDataProvider` 及 `FallbackDataProvider`，並在 host 層觀察 `activeSources()`。

## 🇬🇧 English

The host application owns real data integration. Core packages see only the `DataProvider` contract.

Implement every provider method in the host, map vendor payloads into shared contracts, keep authentication outside public modules, use bounded retries, and compose cache and fallback wrappers only after the provider is stable and testable.
