import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import {
  CoordinateValidationError,
  distanceInMeters,
  findNearestStopPerRoute,
  findNearbyStops,
} from "../src/index.js";

describe("distanceInMeters", () => {
  it("returns zero for the same coordinate", () => {
    assert.equal(
      distanceInMeters(
        { lat: 22.1512, lng: 113.5488 },
        { lat: 22.1512, lng: 113.5488 },
      ),
      0,
    );
  });

  it("matches a known one-degree latitude distance", () => {
    const distance = distanceInMeters(
      { lat: 0, lng: 0 },
      { lat: 1, lng: 0 },
    );
    assert.ok(Math.abs(distance - 111_194.9) < 2);
  });

  it("rejects invalid coordinates", () => {
    assert.throws(
      () => distanceInMeters(
        { lat: 95, lng: 0 },
        { lat: 0, lng: 0 },
      ),
      CoordinateValidationError,
    );
  });
});

describe("nearby stop search", () => {
  it("finds stops inside the requested radius", async () => {
    const provider = new MockDataProvider();
    const results = await findNearbyStops(
      provider,
      { lat: 22.1512, lng: 113.5488 },
      { radiusMeters: 500 },
    );

    assert.equal(results[0]?.stop.id, "BUS-01");
    assert.ok(results.every((item) => item.distanceMeters <= 500));
  });

  it("returns one nearest candidate for every reachable route", async () => {
    const provider = new MockDataProvider();
    const results = await findNearestStopPerRoute(
      provider,
      { lat: 22.1508, lng: 113.5602 },
      2_000,
    );

    assert.ok(results.some((item) => item.stop.routeIds.includes("B12")));
    assert.ok(results.some((item) => item.stop.routeIds.includes("B27")));
  });
});
