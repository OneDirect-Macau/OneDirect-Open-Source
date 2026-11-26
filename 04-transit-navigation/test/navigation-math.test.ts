import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bprSpeedKmh,
  busWait,
  congestionRatio,
  ewmaSpeed,
  expectedWaitMinutes,
  feasibleTransferWaitMinutes,
  haversineMeters,
  headwayAtTime,
  lrtRideMinutes,
  routeScore,
  segmentTravelSeconds,
  signalWaitSeconds,
  urbanDistanceMeters,
  walkingMinutes,
} from "../src/index.js";

describe("navigation math", () => {
  it("computes WGS84 haversine distance", () => {
    const oneDegree = haversineMeters(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
    );
    assert.ok(Math.abs(oneDegree - 111_194.93) < 0.1);
    assert.equal(
      haversineMeters(
        { lat: 22.15, lng: 113.55 },
        { lat: 22.15, lng: 113.55 },
      ),
      0,
    );
  });

  it("rejects invalid coordinates through an infinite distance", () => {
    assert.equal(
      haversineMeters(
        { lat: 91, lng: 0 },
        { lat: 0, lng: 0 },
      ),
      Number.POSITIVE_INFINITY,
    );
  });

  it("applies and validates the Macau urban detour factor", () => {
    const direct = haversineMeters(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
    );
    const urban = urbanDistanceMeters(
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0.01 },
      1.28,
    );
    assert.ok(Math.abs(urban - direct * 1.28) < 0.001);
    assert.throws(
      () =>
        urbanDistanceMeters(
          { lat: 0, lng: 0 },
          { lat: 0, lng: 1 },
          1.1,
        ),
      /detourFactor/,
    );
  });

  it("computes the BPR congestion speed curve", () => {
    assert.equal(bprSpeedKmh(30, 0), 30);
    const congested = bprSpeedKmh(30, 1);
    assert.ok(Math.abs(congested - 30 / 1.15) < 0.000_001);
    assert.ok(
      Math.abs(bprSpeedKmh(30, 10) - 30 / (1 + 0.15 * 1.5 ** 4)) <
        0.000_001,
    );
  });

  it("adds signal and turn penalties to segment time", () => {
    const seconds = segmentTravelSeconds({
      lengthMeters: 1_000,
      freeFlowSpeedKmh: 36,
      saturationRatio: 0,
      signalCount: 1,
      turnPenaltySeconds: 5,
    });
    assert.equal(seconds, 120);
    assert.equal(signalWaitSeconds(0), 15);
    assert.equal(signalWaitSeconds(1), 45);
  });

  it("smooths observed and historical speed with EWMA", () => {
    assert.equal(ewmaSpeed(20, 40, 0.35), 33);
    assert.throws(() => ewmaSpeed(20, 40, 0.7), /gamma/);
  });

  it("calculates detoured walking time with slope", () => {
    assert.ok(
      Math.abs(walkingMinutes(125, 1.28, 1.08) - 2.304) <
        0.000_001,
    );
  });

  it("uses live bus ETA before scheduled headway", () => {
    assert.deepEqual(busWait(3, 8), {
      minutes: 3,
      confidence: "realtime",
    });
    assert.deepEqual(busWait(null, 8), {
      minutes: 4,
      confidence: "scheduled",
    });
    assert.equal(expectedWaitMinutes(8), 4);
  });

  it("computes LRT ride time with station dwell", () => {
    assert.equal(lrtRideMinutes(7_000, 3), 13);
  });

  it("protects a missed transfer by advancing to the next departure", () => {
    assert.equal(
      feasibleTransferWaitMinutes(2, 3, 2, 5),
      7,
    );
    assert.equal(
      feasibleTransferWaitMinutes(9, 3, 2, 5),
      9,
    );
  });

  it("calculates the multi-objective route score", () => {
    const score = routeScore(30, 8, 1, 4);
    assert.equal(score.value, 36);
    assert.equal(score.totalMinutes, 30);
    assert.equal(score.transfers, 1);
  });

  it("uses the Macau weekday and weekend congestion profile", () => {
    const weekday = new Date("2026-11-25T01:00:00.000Z");
    const weekend = new Date("2026-11-28T01:00:00.000Z");
    assert.equal(congestionRatio(weekday), 0.95);
    assert.equal(congestionRatio(weekend), 0.78);
    assert.equal(
      congestionRatio(new Date("2026-11-25T04:00:00.000Z")),
      0.55,
    );
    assert.equal(
      congestionRatio(new Date("2026-11-25T14:00:00.000Z")),
      0.38,
    );
  });

  it("selects the LRT headway window for Macau local time", () => {
    const headway = headwayAtTime(
      [
        { startMinute: 390, endMinute: 510, minutes: 8 },
        { startMinute: 510, endMinute: 1_200, minutes: 6 },
      ],
      new Date("2026-11-25T03:00:00.000Z"),
    );
    assert.equal(headway, 6);
  });
});
