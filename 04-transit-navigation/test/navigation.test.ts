import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import {
  buildJourneyOptionsFromServices,
  calculateJourneyOptions,
  findBestJourney,
  prepareJourneyGeometry,
  type TransitService,
} from "../src/index.js";
import fixture from "../src/fixtures/navigation-case.json" with { type: "json" };

describe("transit navigation", () => {
  it("finds a direct bus journey from mock data", async () => {
    const provider = new MockDataProvider();
    const journeys = await calculateJourneyOptions(
      provider,
      fixture.origin,
      fixture.destination,
      {
        limit: fixture.limit,
        referenceTime: new Date("2026-11-25T04:00:00.000Z"),
      },
    );

    assert.ok(journeys.length > 0);
    assert.equal(journeys[0]?.kind, "direct");
    assert.ok(journeys[0]?.badges.includes("B12"));
    assert.ok((journeys[0]?.ridingMinutes ?? 0) > 0);
    assert.ok((journeys[0]?.score ?? 0) > 0);
    assert.ok((journeys[0]?.congestionRatio ?? 0) > 0);
    assert.ok((journeys[0]?.etaVarianceMinutes ?? 0) > 0);
    const best = findBestJourney(journeys);
    assert.ok(best);
    const prepared = await prepareJourneyGeometry(provider, best);
    assert.ok(prepared.legs.every((leg) => leg.coordinates?.length));
  });

  it("builds a transfer candidate from two synthetic services", () => {
    const services: TransitService[] = [
      {
        id: "bus:A:0",
        mode: "bus",
        routeId: "A",
        lineId: null,
        label: "A · Outbound",
        color: "#e4572e",
        directionIndex: 0,
        geometry: [],
        stops: [
          { id: "A1", code: "A1", name: "A1", order: 0, coordinate: { lat: 0, lng: 0 } },
          { id: "A2", code: "A2", name: "A2", order: 1, coordinate: { lat: 0, lng: 0.01 } },
        ],
      },
      {
        id: "bus:B:0",
        mode: "bus",
        routeId: "B",
        lineId: null,
        label: "B · Outbound",
        color: "#2578b8",
        directionIndex: 0,
        geometry: [],
        stops: [
          { id: "B1", code: "B1", name: "B1", order: 0, coordinate: { lat: 0, lng: 0.011 } },
          { id: "B2", code: "B2", name: "B2", order: 1, coordinate: { lat: 0, lng: 0.02 } },
        ],
      },
    ];

    const journeys = buildJourneyOptionsFromServices(
      services,
      { lat: 0, lng: -0.0005 },
      { lat: 0, lng: 0.0205 },
    );
    assert.ok(journeys.some((journey) => journey.kind === "transfer"));
    assert.ok(
      journeys
        .filter((journey) => journey.kind === "transfer")
        .every((journey) => journey.transferBufferMinutes >= 0),
    );
  });

  it("uses live wait data and exposes the timing breakdown", async () => {
    const provider = new MockDataProvider();
    const journeys = await calculateJourneyOptions(
      provider,
      fixture.origin,
      fixture.destination,
      {
        referenceTime: new Date("2026-11-25T04:00:00.000Z"),
        liveWaitMinutes: (serviceId, stopId) =>
          serviceId.startsWith("bus:B12") && stopId === "BUS-01"
            ? 2
            : null,
      },
    );
    const best = findBestJourney(journeys);
    assert.ok(best);
    const busLeg = best.legs.find((leg) => leg.type === "bus");
    assert.equal(busLeg?.waitConfidence, "realtime");
    assert.equal(busLeg?.waitMinutes, 2);
    assert.equal(
      best.walkMinutes + best.waitMinutes + best.ridingMinutes,
      best.totalMinutes,
    );
  });

  it("penalizes journeys under higher congestion", async () => {
    const provider = new MockDataProvider();
    const referenceTime = new Date("2026-11-25T04:00:00.000Z");
    const freeFlow = await calculateJourneyOptions(
      provider,
      fixture.origin,
      fixture.destination,
      { congestionRatio: 0, referenceTime },
    );
    const congested = await calculateJourneyOptions(
      provider,
      fixture.origin,
      fixture.destination,
      { congestionRatio: 1.5, referenceTime },
    );
    assert.ok((congested[0]?.ridingMinutes ?? 0) >=
      (freeFlow[0]?.ridingMinutes ?? 0));
    assert.ok((congested[0]?.score ?? 0) >
      (freeFlow[0]?.score ?? 0));
  });

  it("returns no options for unreachable coordinates", async () => {
    const provider = new MockDataProvider();
    assert.deepEqual(
      await calculateJourneyOptions(
        provider,
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
      ),
      [],
    );
  });
});
