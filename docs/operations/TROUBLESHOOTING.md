# 🧯 Troubleshooting

<p align="right">
  <a href="../README.md">Docs Index</a>
</p>

## 繁體中文

### Workspace package cannot resolve

```powershell
npm install
npm run build
```

### Demo is blank

Build packages before starting Vite. Confirm port `4173` is available.

### TypeScript cannot find JSON

Check `resolveJsonModule` and package tsconfig includes.

### Tests have stale compiled files

Package test scripts clear `.test-dist` automatically.

### Map is blank

Default mock viewport is offline. A real Mapbox adapter needs host-injected SDK, token, and style configuration.

### Direction match is null

Review live stop order and local route data. Do not force a fallback direction.

## 🇬🇧 English

Rebuild workspace symlinks with `npm install`, build packages before starting the demo, and confirm the local port is available.

The package scripts clear generated build and test folders before compiling. Map rendering failure should not affect the four core packages. Direction matching should return `null` when coverage is insufficient.
