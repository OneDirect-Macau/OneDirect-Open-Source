# 🏗️ Architecture

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="../../README.md">Project Home</a>
</p>

## 繁體中文

Demo Hub 的四段動畫提供互動式總覽；完整 lifecycle、ETA 及 navigation 參數見 [Operating Flow](./OPERATING_FLOW.md)。

### System context

```text
Host UI / API / CLI
        ↓
Four core packages
        ↓
DataProvider
        ↓
Host backend or MockDataProvider
```

### Dependency direction

```text
02-provider
   ↑
   ├── 01-eta
   ├── 03-search
   └── 04-navigation
```

### Data flow

1. Host constructs a `DataProvider`.
2. Core package requests normalized data.
3. Pure algorithms transform the data.
4. Package returns typed output.
5. UI renders the output.

### State ownership

| State | Owner |
| --- | --- |
| Provider connection | Host |
| Cache | Provider wrapper |
| ETA countdown | Bus ETA Engine |
| Search query | Search Controller |
| Journey selection | Host UI |
| Journey ranking | Navigation Engine |

### Failure boundaries

- Provider error remains in provider layer.
- Parser error is a typed domain error.
- Direction mismatch returns `null`.
- Navigation without reachable stops returns `[]`.
- Map UI failure does not affect core packages.

## 🇬🇧 English

The Demo Hub includes a four-stage interactive animation. See [Operating Flow](./OPERATING_FLOW.md) for the complete lifecycle and estimate parameters.

The architecture uses the provider layer as the only data-access foundation. The host creates a provider, the core packages request typed data, pure algorithms transform it, and the host UI renders the output.

Each package owns one state category and one failure boundary. Provider errors, parse errors, ETA matching failures, empty navigation results, and optional UI failures are handled without leaking vendor details into consumers.
