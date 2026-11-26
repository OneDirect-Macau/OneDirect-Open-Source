# Contributing to OneDirect Open Source

<p align="right">
  <strong>繁體中文</strong> · <a href="#english">English</a>
</p>

感謝你願意改善 OneDirect。這個 repository 重視正確性、可測試性、module boundaries 及安全去敏化。

## 開始之前

1. 閱讀根目錄 `README.md` 與 `AGENTS.md`。
2. 確認改動屬於哪個 module。
3. 不要修改 `../PWA/` 或其他唯讀參考來源。
4. 不要在 source、test、fixture 或 documentation 加入真實 endpoint、token、cookie 或 private data。

## 開發環境

```powershell
npm ci
npm run verify
```

需要 Node.js 20+、npm 10+。

## Branch 與 Commit

```text
feat/eta-arrival-confidence
fix/provider-cache-expiry
docs/search-bilingual-guide
test/navigation-transfer-boundary
```

Commit 建議：

```text
feat(eta): add configurable speed profile
fix(provider): clear cache before reload
docs(readme): expand bilingual usage guide
test(search): cover invalid keypad keys
```

## Code Standards

- TypeScript strict mode。
- 優先使用 pure functions。
- Untrusted input 類型為 `unknown`。
- 對外 contracts 放在 `02-data-fetcher-provider-layer`。
- 不讓 vendor response 進入 UI 或 core algorithms。
- 不新增無測試的行為變更。

## 測試要求

每個變更應包括：

- Happy path。
- Boundary values。
- Invalid input。
- Deterministic clock 或 sorting。
- Mock provider integration（如適用）。

```powershell
npm run test -w <PACKAGE_NAME>
npm run verify
```

## 文件要求

- 每個 module 保留 `README.md` 及 `README.en.md`。
- 兩份 README 都要有語言切換。
- API 變更要同步更新 examples 及 input/output tables。
- 安全邊界改變要同步更新 `AGENTS.md` 及 `SECURITY.md`。

## Pull Request Checklist

- [ ] 已說明 owning module。
- [ ] 已說明 public API 影響。
- [ ] 已加入 tests。
- [ ] 已更新中英文 README。
- [ ] 沒有 real endpoint／secret／private payload。
- [ ] `npm run verify` 通過。
- [ ] `git diff --cached --check` 通過。

## Security

若發現 credential 或 dangerous endpoint 曾進入 repository，請不要開 public issue 張貼完整 secret。依照 `SECURITY.md` 的 incident response 流程處理。

## License

提交 contribution 即表示你同意依 Apache License 2.0 授權你的 contribution。

---

<a id="english"></a>

# Contributing to OneDirect Open Source

<p align="right">
  <a href="#contributing-to-onedirect-open-source">繁體中文</a> · <strong>English</strong>
</p>

Thank you for improving OneDirect. This repository values correctness, testability, module boundaries, and sanitized public data.

## Before You Start

1. Read `README.md` and `AGENTS.md`.
2. Identify the owning module.
3. Never modify `../PWA/` or other read-only reference sources.
4. Never add real endpoints, credentials, cookies, or private data to source, tests, fixtures, or documentation.

## Development Setup

Run `npm ci` and `npm run verify`. Node.js 20+ and npm 10+ are required.

## Branch and Commit Examples

Use scoped branches such as `feat/eta-arrival-confidence` or `fix/provider-cache-expiry`.

Suggested commits:

```text
feat(eta): add configurable speed profile
fix(provider): clear cache before reload
docs(readme): expand bilingual usage guide
test(search): cover invalid keypad keys
```

## Code Standards

- TypeScript strict mode.
- Prefer pure functions.
- Treat untrusted data as `unknown`.
- Keep shared contracts in `02-data-fetcher-provider-layer`.
- Keep vendor responses outside UI and core algorithms.
- Every behavior change needs a test.

## Testing Requirements

Cover happy paths, boundaries, invalid input, deterministic behavior, and mock-provider integration where applicable.

## Documentation Requirements

Both `README.md` and `README.en.md` are part of the deliverable. API changes require updated examples, tables, and language-switch links.

## Pull Request Checklist

- [ ] Owning module identified.
- [ ] Public API impact documented.
- [ ] Tests added.
- [ ] Both README languages updated.
- [ ] No real endpoint or secret included.
- [ ] `npm run verify` passes.
- [ ] `git diff --cached --check` passes.

## Security

Do not disclose a complete secret in a public issue. Follow `SECURITY.md`.

## License

Contributions are accepted under the Apache License 2.0.

---

<p align="center"><a href="#contributing-to-onedirect-opensource">Back to top</a></p>
