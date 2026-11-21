# 🎬 Demo Guide

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="../../other-modules/demo-hub/">Demo Hub</a>
</p>

## 繁體中文

### Start

```powershell
npm run dev
```

### Four panels

1. Provider：顯示 id、routes、stops、geometry 及 TTL。
2. Bus ETA：以 mock live snapshot 計算 downstream ETA。
3. Smart Search：輸入 `B1` 或 `Harbor`，查看 suggestions 及 keypad。
4. Navigation：由 Harbor North 到 Tech Park，查看 walk／bus legs。

### Expected behavior

- 無 network request。
- 無真實 credentials。
- Desktop 及 mobile 無水平 overflow。
- Search 首個結果與輸入相關。
- Navigation 至少包含一個 transit leg。

## 🇬🇧 English

Run `npm run dev` and exercise the four panels: provider metadata, ETA, search keyboard, and navigation.

The demo must work without network access or credentials. The layout should remain usable at desktop and mobile widths, search should return relevant suggestions, and navigation should produce transit legs.
