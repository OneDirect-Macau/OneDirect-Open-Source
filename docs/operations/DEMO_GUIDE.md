# 🎬 Demo Guide

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="../../other-modules/demo-hub/">Demo Hub</a>
</p>

## 繁體中文

### Start

```powershell
npm run dev
```

### Animated walkthrough

Demo 第一頁自動播放四段系統資料流，可以暫停及前後切換。動畫展示 Host request、`02` provider boundary、`01`／`03`／`04` engines 及 typed output。系統啟用 reduced motion 時會預設暫停。

詳細內容見 [Operating Flow](../architecture/OPERATING_FLOW.md)。

### Five panels

1. How it works：動畫展示 provider-first data flow。
2. Provider：顯示 id、routes、stops、geometry 及 TTL。
3. Bus ETA：以 mock live snapshot 計算 downstream ETA。
4. Smart Search：輸入 `B1` 或 `Harbor`，查看 suggestions 及 keypad。
5. Navigation：由 Harbor North 到 Tech Park，查看 walk／bus legs。

### Expected behavior

- 無 network request。
- 無真實 credentials。
- Desktop 及 mobile 無水平 overflow。
- Animation controls 可以暫停、前進及後退。
- Search 首個結果與輸入相關。
- Navigation 至少包含一個 transit leg。

## 🇬🇧 English

Run `npm run dev` and exercise the animated walkthrough, provider metadata, ETA, search keyboard, and navigation.

The demo must work without network access or credentials. The layout should remain usable at desktop and mobile widths, search should return relevant suggestions, and navigation should produce transit legs.
