# ❓ FAQ

<p align="right">
  <a href="../README.md">Docs Index</a>
</p>

## 繁體中文

### 這是官方交通服務嗎？

不是。OneDirect 是 sanitized reference implementation。

### 為何使用 MockDataProvider？

任何人都可以在沒有 credentials 的環境重現功能及 tests。

### 可否直接在此 repo 加入真實 API？

真實 API、auth、headers 及 secrets 應放在 host application。

### 可否只抽取一個 module？

可以。保留 shared provider dependency、fixtures、README 及 AGENTS。

### 是否會收集 telemetry？

不會。

### 如何加入社群？

使用 [COMMUNITY.md](../../COMMUNITY.md) 的 WhatsApp 或 Telegram links；不要在 public channel 張貼 secret。

## 🇬🇧 English

OneDirect is a sanitized reference implementation, not an official transit authority client. The mock provider enables development and testing without credentials.

Real integrations belong in a host provider. Individual modules can be extracted together with their shared dependency, fixtures, README, and AGENTS guidance. The project does not collect telemetry.
