import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CachedDataProvider,
  FallbackDataProvider,
  MockDataProvider,
  TtlCache,
  withRetry,
  type DataProvider,
} from "../src/index.js";

describe("MockDataProvider", () => {
  it("serves complete offline transit fixtures", async () => {
    const provider = new MockDataProvider();
    const [routes, stops, lines, stations] = await Promise.all([
      provider.getRoutes(),
      provider.getStops(),
      provider.getLrtLines(),
      provider.getLrtStations(),
    ]);

    assert.ok(routes.length >= 2);
    assert.ok(stops.length >= 10);
    assert.equal(lines[0]?.id, "green");
    assert.ok(stations.length >= 5);
    assert.equal(provider.id, "mock-static-v1");
  });

  it("returns defensive copies", async () => {
    const provider = new MockDataProvider();
    const first = await provider.getRoutes();
    first[0]!.label = "MUTATED";

    const second = await provider.getRoutes();
    assert.notEqual(second[0]?.label, "MUTATED");
  });

  it("provides live and schedule data without network access", async () => {
    const provider = new MockDataProvider();
    const live = await provider.getLiveRoute("B12", 0);
    const profile = await provider.getLrtScheduleProfile("green");

    assert.equal(live?.stops[0]?.code, "D101");
    assert.equal(profile?.lineId, "green");
    assert.equal(await provider.getLiveRoute("unknown", null), null);
  });

  it("serves defensive route geometry copies", async () => {
    const provider = new MockDataProvider();
    const geometry = await provider.getRouteGeometries();
    assert.ok((geometry.B12?.[0]?.length ?? 0) >= 2);
  });
});

describe("TtlCache", () => {
  it("expires values using an injected clock", () => {
    let now = 1_000;
    const cache = new TtlCache<string, number>(100, 10, () => now);
    cache.set("answer", 42);
    assert.equal(cache.get("answer"), 42);
    now = 1_101;
    assert.equal(cache.get("answer"), undefined);
  });
});

describe("withRetry", () => {
  it("retries transient failures with deterministic delays", async () => {
    const delays: number[] = [];
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("temporary");
        return "ok";
      },
      { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 40 },
      async (delay) => { delays.push(delay); },
    );

    assert.equal(result, "ok");
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [10, 20]);
  });
});

describe("provider wrappers", () => {
  it("falls back when the primary provider fails", async () => {
    const fallback = new MockDataProvider();
    class FailingProvider extends MockDataProvider {
      override readonly id = "failing";
      override async getStops(): Promise<never> {
        throw new Error("offline");
      }
    }
    const failing = new FailingProvider();
    const provider = new FallbackDataProvider(failing, fallback);

    const stops = await provider.getStops();
    assert.ok(stops.length > 0);
    assert.ok(provider.activeSources().some((source) => source.startsWith("mock-static-v1:stops")));
  });

  it("caches provider reads and clears them on reload", async () => {
    const mock = new MockDataProvider();
    let calls = 0;
    class CountingProvider extends MockDataProvider {
      override readonly id = "counted";
      override async getRoutes() {
        calls += 1;
        return mock.getRoutes();
      }
    }
    const counted = new CountingProvider();
    const provider = new CachedDataProvider(counted, 60_000);

    await provider.getRoutes();
    await provider.getRoutes();
    assert.equal(calls, 1);
    await provider.reload();
    await provider.getRoutes();
    assert.equal(calls, 2);
  });
});
