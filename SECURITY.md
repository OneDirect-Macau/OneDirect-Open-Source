# Security Policy

## Security Model

這些模組只處理 transit domain logic 與 UI。資料傳輸、認證、重試、快取與 secrets management 屬於宿主應用的 `DataProvider` implementation。

## Hard Rules

- 不得在 source、test、fixture、comment 或 documentation 中加入真實 endpoint、token、cookie、private domain、IP 或簽名流程。
- 不得加入 User-Agent 偽裝、瀏覽器指紋繞過、反機器人規避、session 竊取或政府網站 response 攔截。
- 所有 runtime data 必須來自注入的 `DataProvider`。
- `.env` 與 `.env.*` 不得提交；只提交空白 `.env.example`。
- Log 不得記錄 credentials、authorization values、cookies 或完整 upstream payload。
- Mock data 必須使用虛構名稱、虛構站點代碼與與正式資料無關的座標。

## Incident Response

若發現憑證或私有 endpoint 曾進入 repository：

1. 立即撤銷或輪替憑證。
2. 清除 Git history 與任何 build artifact 中的副本。
3. 檢查 CI logs、cache、release bundle 與 container image。
4. 以 `npm run sanitize` 重新驗證所有產品 source 與文件。

不要在公開 issue 中貼出完整 secret。使用 repository host 的私密安全回報機制。
