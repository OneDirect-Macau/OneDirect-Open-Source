# 🚢 Release Checklist

<p align="right">
  <a href="../README.md">Docs Index</a>
</p>

## 繁體中文

- [ ] `npm ci`
- [ ] `npm run verify`
- [ ] `npm audit`
- [ ] `git diff --cached --check`
- [ ] Sanitizer 沒有 unexpected URL
- [ ] 沒有 `.env`、credentials、private payload
- [ ] LICENSE 是 Apache-2.0
- [ ] 所有 package `license` metadata 正確
- [ ] 8 對 README 語言切換有效
- [ ] Assets 及 docs links 有效
- [ ] Git remote 指向預期 Organization repository
- [ ] Push 前 review staged files

### Release metadata

| Field | Expected |
| --- | --- |
| Version | `0.1.0` |
| License | `Apache-2.0` |
| Branch | `main` |
| Runtime | Node.js 20+ |

## 🇬🇧 English

Release is blocked by any failed verification, secret scan, broken link, missing license metadata, or unexpected staged file.

Run install, verification, audit, staged diff checks, link checks, and final Git status review before pushing to the organization repository.
