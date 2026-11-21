# Map Viewport UI

<p align="center">
  <img src="../../assets/readme/map-banner.svg" alt="Map Viewport UI banner" width="100%" />
</p>

<p>
  <kbd>Auxiliary</kbd>
  <kbd>React</kbd>
  <kbd>Clustering</kbd>
  <kbd>Host-Injected Mapbox</kbd>
</p>

> **Optional transit viewport；核心功能不依賴此 UI。**

保留站點聚合、light／dark theme、pointer pan、zoom 與 detail sheet。Mapbox SDK、token 與 style identifier 只能由宿主注入。

## 使用

```tsx
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import { MapViewport } from "@onedirect/map-viewport-ui";
import "@onedirect/map-viewport-ui/styles.css";

const provider = new MockDataProvider();

export function Screen() {
  return <MapViewport provider={provider} initialTheme="light" />;
}
```

## 開發

```powershell
npm run build -w @onedirect/map-viewport-ui
npm run test -w @onedirect/map-viewport-ui
```

> Default demo 不需要 token。不要把 secret、style URL、tile endpoint 或 credentials 寫進 component、fixture 或 README。

AI 修改前請閱讀 [`AGENTS.md`](./AGENTS.md)。
