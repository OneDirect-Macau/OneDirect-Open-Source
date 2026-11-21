import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import {
  findMatchingStop,
  matchLiveRoute,
  matchRouteDirection,
  normalizeStopCode,
} from "../src/index.js";

describe("stop normalization", () => {
  it("removes lane suffixes and whitespace", () => {
    assert.equal(normalizeStopCode(" d101 / 2 "), "D101");
    assert.equal(normalizeStopCode("d-204"), "D204");
  });
});

describe("route direction matching", () => {
  it("matches outbound live stop order", async () => {
    const provider = new MockDataProvider();
    const route = await provider.getRoute("B12");
    const live = await provider.getLiveRoute("B12", 0);
    assert.ok(route);
    assert.ok(live);

    const match = matchLiveRoute(route, live);
    assert.equal(match?.directionIndex, 0);
    assert.equal(match?.coverage, 1);
    assert.equal(match?.directionName, "Outbound");
  });

  it("matches reversed direction using ordered observations", async () => {
    const provider = new MockDataProvider();
    const route = await provider.getRoute("B12");
    assert.ok(route);

    const match = matchRouteDirection(route, [
      { index: 0, code: "D104", name: "Tech Park", vehicles: [] },
      { index: 1, code: "D103", name: "Central Square", vehicles: [] },
      { index: 2, code: "D102", name: "City Museum", vehicles: [] },
      { index: 3, code: "D101", name: "Harbor North", vehicles: [] },
    ]);

    assert.equal(match?.directionIndex, 1);
    assert.equal(match?.coverage, 1);
  });

  it("reports unmatched data instead of forcing a route", async () => {
    const provider = new MockDataProvider();
    const route = await provider.getRoute("B12");
    assert.ok(route);

    assert.equal(
      matchRouteDirection(route, [
        { index: 0, code: "X001", name: "Unknown", vehicles: [] },
      ]),
      null,
    );
  });
});

describe("findMatchingStop", () => {
  it("finds a local stop by code", async () => {
    const provider = new MockDataProvider();
    const route = await provider.getRoute("B27");
    assert.ok(route);
    const stop = findMatchingStop(route, {
      index: 0,
      code: "D203/2",
      name: "Unrelated display name",
      vehicles: [],
    });
    assert.equal(stop?.id, "BUS-07");
  });
});
