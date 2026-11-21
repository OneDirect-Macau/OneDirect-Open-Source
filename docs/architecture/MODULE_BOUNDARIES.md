# 🧩 Module Boundaries

<p align="right">
  <a href="../README.md">Docs Index</a> · <a href="./ARCHITECTURE.md">Architecture</a>
</p>

## 繁體中文

| Module | Owns | Forbidden |
| --- | --- | --- |
| 01 Bus ETA | Parsing、state、arrival estimation、direction | HTTP、UI、search、navigation |
| 02 Provider | Contracts、mock、cache、retry、fallback | ETA algorithms、map UI |
| 03 Search | Query、ranking、completion、keypad state | Network、ETA、journey routing |
| 04 Navigation | Network、journey、legs、geometry preparation | Provider auth、search UI |
| other-modules | Auxiliary utilities、UI、demo | Core upstream dependency |

### Allowed imports

```text
01 → 02
03 → 02
04 → 02
other → 02
demo → 01, 02, 03, 04
```

### Forbidden imports

```text
01 → 03
01 → 04
02 → 01 / 03 / 04
other → core reverse dependency from core
```

### Adding a module

1. Define its single responsibility.
2. Choose whether it needs `DataProvider`.
3. Add typed public contracts.
4. Add deterministic fixtures.
5. Add tests and bilingual README.
6. Register build and tests in root verification.

## 🇬🇧 English

Each module has one responsibility and one public boundary. Core modules depend only on the provider layer, while the demo may compose all four cores.

Before adding a module, define its responsibility, decide whether it needs the provider contract, add deterministic tests and fixtures, provide bilingual documentation, and register it in the root verification flow.
