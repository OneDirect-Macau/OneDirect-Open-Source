# 🧱 Compatibility

<p align="right">
  <a href="../README.md">Docs Index</a>
</p>

## 繁體中文

| Environment | Support |
| --- | --- |
| Node.js 20+ | Supported |
| npm 10+ | Supported |
| ESM | Supported |
| TypeScript strict | Supported |
| Chromium / Firefox / Safari | UI demo expected |
| Deno | Not verified |
| Bun | Not verified |
| CommonJS | Not part of current export contract |

### Versioning

Core packages use `0.1.x`. Shared contract changes should be reviewed before publishing independent packages.

### Browser APIs

UI packages may use DOM、Pointer Events、ResizeObserver 及 CSS variables。Core algorithm packages should not require DOM APIs.

## 🇬🇧 English

The supported baseline is Node.js 20+, npm 10+, ESM, and strict TypeScript. UI packages target current evergreen browsers. Deno, Bun, and CommonJS are not part of the current contract.

Core algorithms must stay DOM-independent so they can run in backend jobs, tests, and browser consumers.
