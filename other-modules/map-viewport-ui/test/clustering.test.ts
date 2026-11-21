import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateBounds,
  clusterMapPoints,
  projectCoordinate,
} from "../src/map/clustering.js";
import { getMapThemeTokens } from "../src/map/theme.js";

const points = [
  {
    id: "A",
    kind: "bus" as const,
    coordinate: { lat: 22.15, lng: 113.55 },
  },
  {
    id: "B",
    kind: "lrt" as const,
    coordinate: { lat: 22.152, lng: 113.552 },
  },
  {
    id: "C",
    kind: "bus" as const,
    coordinate: { lat: 22.2, lng: 113.62 },
  },
];

describe("map projection and clustering", () => {
  it("creates padded bounds and projects points into the viewport", () => {
    const bounds = calculateBounds(points.map((point) => point.coordinate));
    const projected = projectCoordinate(points[0]!.coordinate, bounds, 800, 500);

    assert.ok(projected.x >= 0 && projected.x <= 800);
    assert.ok(projected.y >= 0 && projected.y <= 500);
  });

  it("merges close stations at low zoom and separates them at high zoom", () => {
    const bounds = calculateBounds(points.map((point) => point.coordinate));
    const lowZoom = clusterMapPoints(points, bounds, { zoom: 1 });
    const highZoom = clusterMapPoints(points, bounds, { zoom: 6 });

    assert.equal(lowZoom.length, 2);
    assert.equal(highZoom.length, 3);
  });
});

describe("map themes", () => {
  it("provides distinct light and dark tokens", () => {
    const light = getMapThemeTokens("light");
    const dark = getMapThemeTokens("dark");

    assert.notEqual(light.background, dark.background);
    assert.equal(light.mapboxLightPreset, "day");
    assert.equal(dark.mapboxLightPreset, "night");
  });
});
