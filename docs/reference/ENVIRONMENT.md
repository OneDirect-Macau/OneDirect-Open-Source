# ⚙️ Environment Reference

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="../../.env.example">.env.example</a>
</p>

## 繁體中文

| Variable | Default | Required |
| --- | --- | --- |
| `DATA_PROVIDER` | `mock` | No |
| `PROVIDER_CACHE_TTL_MS` | `30000` | No |
| `PROVIDER_RETRY_MAX_ATTEMPTS` | `3` | No |
| `PROVIDER_RETRY_BASE_DELAY_MS` | `100` | No |
| `VITE_MAPBOX_ACCESS_TOKEN` | empty | No |
| `VITE_MAPBOX_STYLE_LIGHT` | empty | No |
| `VITE_MAPBOX_STYLE_DARK` | empty | No |

### Rules

- Default demo 必須在沒有 `.env` 時運作。
- 只在 local environment 填 secret。
- 不提交 `.env`、`.env.local` 或 provider credentials。
- Frontend variables 屬 public，不可保存 server secret。
- Production provider 應由 backend 控制 secrets。

## 🇬🇧 English

The default demo runs without any environment file. Host applications may configure provider behavior through environment variables, but public frontend values must never contain privileged credentials.

Use server-side secret storage for production authentication and keep local environment files ignored by Git.
