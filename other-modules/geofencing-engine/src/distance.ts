import type { Coordinate } from "@onedirect/data-fetcher-provider-layer";
import { assertCoordinate } from "./coordinate.js";

export const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceInMeters(
  from: Coordinate,
  to: Coordinate,
  earthRadiusMeters = EARTH_RADIUS_METERS,
): number {
  assertCoordinate(from, "from");
  assertCoordinate(to, "to");
  if (!Number.isFinite(earthRadiusMeters) || earthRadiusMeters <= 0) {
    throw new RangeError("earthRadiusMeters must be a positive finite number");
  }

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(to.lng - from.lng);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const bounded = Math.min(1, Math.max(0, haversine));

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(bounded));
}
