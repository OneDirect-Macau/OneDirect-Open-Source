# 📖 OneDirect Documentation

<p align="right">
  <a href="../README.md">專案首頁</a> · <a href="../README.en.md">Project Home</a>
</p>

> Bilingual documentation index. 中文在前，English follows each section.

## 🇭🇰 繁體中文

### Getting Started

| Document | Description |
| --- | --- |
| [Installation](./getting-started/INSTALLATION.md) | Node/npm requirements、install、build、test 及 demo |
| [Quick Start](./getting-started/QUICK_START.md) | 最短流程啟動及執行四個核心 |
| [Provider Integration](./getting-started/PROVIDER_INTEGRATION.md) | 實作 host `DataProvider` 的安全方式 |

### Architecture

| Document | Description |
| --- | --- |
| [Architecture](./architecture/ARCHITECTURE.md) | System context、資料流及 module composition |
| [Module Boundaries](./architecture/MODULE_BOUNDARIES.md) | 核心依賴方向、ownership 與 extension rules |

### Reference

| Document | Description |
| --- | --- |
| [API Reference](./reference/API_REFERENCE.md) | 四個核心 package 的 exports 與 examples |
| [Environment](./reference/ENVIRONMENT.md) | `.env.example` variables 及 secret handling |
| [Compatibility](./reference/COMPATIBILITY.md) | Runtime、browser、ESM 及 version compatibility |

### Operations

| Document | Description |
| --- | --- |
| [Testing](./operations/TESTING.md) | Tests、sanitizer、quality gates 及 CI steps |
| [Troubleshooting](./operations/TROUBLESHOOTING.md) | 常見 build、workspace、demo 及 type errors |
| [Demo Guide](./operations/DEMO_GUIDE.md) | Demo Hub 功能及操作方式 |
| [Release Checklist](./operations/RELEASE_CHECKLIST.md) | 公開前完整檢查 |

### Project

| Document | Description |
| --- | --- |
| [Roadmap](./project/ROADMAP.md) | 已規劃功能及長期方向 |
| [FAQ](./project/FAQ.md) | 架構、安全及使用問題 |
| [Changelog](./project/CHANGELOG.md) | Version history |

## 🇬🇧 English

The same documents are bilingual in a single file. Each page contains Traditional Chinese first and English second, with stable local links and no external runtime dependencies.

## Documentation Rules

- Use fictional data only.
- Link to local files rather than unpublished external docs.
- Keep Chinese and English sections in sync.
- Update API examples when exported contracts change.
- Run `npm run verify` after documentation or code changes.
