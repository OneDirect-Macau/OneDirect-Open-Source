# 🚀 Installation

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="../../README.md">專案首頁</a>
</p>

## 繁體中文

### Requirements

| Tool | Required |
| --- | --- |
| Node.js | 20+ |
| npm | 10+ |
| Git | Optional for local use |

### Monorepo Install

```powershell
npm install
npm run build
npm test
```

### Full Verification

```powershell
npm run verify
```

`verify` 包括 sanitization、7 個 workspace builds 及 40 個 unit tests。

### Demo

```powershell
npm run dev
```

Demo 位於 `localhost:4173`。

### Install One Package

```powershell
npm run build -w @onedirect/bus-eta-engine
npm run test -w @onedirect/bus-eta-engine
```

### Environment

Default demo 不需要 `.env`。如需 host services，只複製 variable names 到 local env，不要提交 secret values。

## 🇬🇧 English

Install from the repository root with `npm install`, then run `npm run build` and `npm test`. Use `npm run verify` for the full sanitization, build, and test suite.

The demo starts with `npm run dev` at `localhost:4173`. Individual workspaces can be built and tested with npm’s `-w` option.

The default demo requires no environment file. Host applications may provide environment-controlled provider settings locally, but must never commit secret values.
