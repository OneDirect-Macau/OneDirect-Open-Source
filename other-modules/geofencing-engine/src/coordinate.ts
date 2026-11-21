import type { Coordinate } from "@onedirect/data-fetcher-provider-layer";

export class CoordinateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoordinateValidationError";
  }
}

export function isCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Coordinate>;
  return (
    Number.isFinite(candidate.lat) &&
    Number.isFinite(candidate.lng) &&
    candidate.lat! >= -90 &&
    candidate.lat! <= 90 &&
    candidate.lng! >= -180 &&
    candidate.lng! <= 180
  );
}

export function assertCoordinate(
  value: unknown,
  label = "coordinate",
): asserts value is Coordinate {
  if (!isCoordinate(value)) {
    throw new CoordinateValidationError(
      `${label} must contain finite lat/lng values within WGS84 bounds`,
    );
  }
}
