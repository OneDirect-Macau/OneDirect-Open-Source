import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import {
  EtaParseError,
  calculateLrtSchedule,
  deriveEtaState,
  estimateSnapshotArrivals,
  estimateStopArrivals,
  matchLiveRoute,
  parseEtaPayload,
  parseLiveRouteSnapshot,
} from "../src/index.js";
import fixture from "../src/fixtures/eta-boundary.json" with { type: "json" };

describe("parseEtaPayload", () => {
  it("sanitizes identifiers, dates, duplicates, and invalid arrivals", () => {
    const snapshot = parseEtaPayload({
      routeId: "  b12  ",
      stopId: 101,
      direction: "1",
      generatedAt: "2026-11-21T08:00:00.000Z",
      isRealtime: true,
      source: " mock ",
      arrivals: [
        { minutes: 6.4 },
        { minutes: -1 },
        { minutes: 3 },
        { minutes: 3 },
        { minutes: "not-a-number" },
      ],
    });

    assert.equal(snapshot.routeId, "b12");
    assert.equal(snapshot.stopId, "101");
    assert.equal(snapshot.direction, 1);
    assert.deepEqual(snapshot.arrivals.map((item) => item.minutes), [3, 6]);
  });

  it("rejects payloads without a valid route and date", () => {
    assert.throws(
      () => parseEtaPayload({ arrivals: [] }),
      EtaParseError,
    );
  });

  it("handles the zero-minute boundary from a fixture", () => {
    const snapshot = parseEtaPayload(fixture);
    const state = deriveEtaState(snapshot, {
      now: new Date("2026-11-21T08:00:00.000Z"),
    });
    assert.equal(state.state, "arriving");
    assert.equal(snapshot.arrivals[0]?.minutes, 0);
  });
});

describe("deriveEtaState", () => {
  const snapshot = parseEtaPayload({
    routeId: "B12",
    generatedAt: "2026-11-21T08:00:00.000Z",
    arrivals: [{ minutes: 3 }],
  });

  it("subtracts elapsed minutes and enters approaching state", () => {
    const state = deriveEtaState(snapshot, {
      now: new Date("2026-11-21T08:01:05.000Z"),
    });
    assert.equal(state.state, "approaching");
    assert.equal(state.minutes, 2);
  });

  it("marks old data as stale", () => {
    const state = deriveEtaState(snapshot, {
      now: new Date("2026-11-21T08:03:00.000Z"),
      staleAfterSeconds: 120,
    });
    assert.equal(state.state, "stale");
  });

  it("marks an empty arrival list unavailable", () => {
    const state = deriveEtaState(
      { ...snapshot, arrivals: [] },
      { now: new Date("2026-11-21T08:00:10.000Z") },
    );
    assert.equal(state.state, "unavailable");
  });
});

describe("live route parser", () => {
  it("normalizes nested live observations", () => {
    const snapshot = parseLiveRouteSnapshot({
      routeId: " b12 ",
      directionIndex: 0,
      observedAt: "2026-11-21T08:00:00.000Z",
      stops: [
        {
          index: 1,
          code: " d101 ",
          name: " Harbor North ",
          vehicles: [
            { id: 7, segmentIndex: 0, speedKmh: "24" },
            { id: "", segmentIndex: 2, speedKmh: 10 },
          ],
        },
      ],
    });

    assert.equal(snapshot.routeId, "B12");
    assert.equal(snapshot.stops[0]?.code, "D101");
    assert.equal(snapshot.stops[0]?.vehicles[0]?.id, "7");
  });
});

describe("LRT schedule", () => {
  it("calculates weekend next departures from a mock profile", async () => {
    const provider = new MockDataProvider();
    const profile = await provider.getLrtScheduleProfile("green");
    const schedule = calculateLrtSchedule(profile, {
      lineId: "green",
      stationId: "LRT-01",
      direction: 0,
      stationIndex: 0,
      stationCount: 5,
      now: new Date("2026-11-21T08:00:00.000Z"),
    });

    assert.ok(schedule);
    assert.equal(schedule.serviceType, "weekend");
    assert.ok(schedule.next.length > 0);
    assert.equal(schedule.next[0]?.minutes, 2);
  });

  it("returns null when the profile does not match", async () => {
    const provider = new MockDataProvider();
    const profile = await provider.getLrtScheduleProfile("green");
    assert.equal(
      calculateLrtSchedule(profile, {
        lineId: "other",
        stationId: "LRT-01",
        direction: 0,
        stationIndex: 0,
        stationCount: 5,
      }),
      null,
    );
  });
});

describe("live stop arrival estimation", () => {
  it("estimates downstream arrivals from vehicle segment and speed", async () => {
    const provider = new MockDataProvider();
    const route = await provider.getRoute("B12");
    const live = await provider.getLiveRoute("B12", 0);
    assert.ok(route);
    assert.ok(live);

    const match = matchLiveRoute(route, live);
    assert.ok(match);
    const direction = route.directions[match.directionIndex]!;
    const estimates = estimateSnapshotArrivals(direction, live);
    const terminal = estimates.find((item) => item.stopId === "BUS-04");

    assert.ok(terminal?.estimateMinutes);
    assert.ok(terminal?.arrivals.some((arrival) => arrival.vehicleId === "DEMO-101"));
  });

  it("returns no estimate for a stopped vehicle", () => {
    const estimates = estimateStopArrivals(
      {
        index: 0,
        name: "Outbound",
        stops: [
          { id: "A", code: "A1", name: "A", coordinate: { lat: 0, lng: 0 } },
          { id: "B", code: "B1", name: "B", coordinate: { lat: 0, lng: 0.01 } },
        ],
      },
      [{
        index: 0,
        code: "A1",
        name: "A",
        vehicles: [{ id: "STOPPED", segmentIndex: 0, speedKmh: 0 }],
      }],
    );
    assert.equal(estimates[1]?.estimateMinutes, null);
  });
});
