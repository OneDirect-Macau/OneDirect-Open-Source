import type {
  Coordinate,
  DataProvider,
  TransitStop,
} from "@onedirect/data-fetcher-provider-layer";
import { assertCoordinate } from "./coordinate.js";
import { distanceInMeters } from "./distance.js";

export type NearbyStop = {
  stop: TransitStop;
  distanceMeters: number;
};

export type NearbySearchOptions = {
  radiusMeters?: number;
  routeId?: string | null;
  limit?: number;
};

export async function findNearbyStops(
  provider: DataProvider,
  origin: Coordinate,
  options: NearbySearchOptions = {},
): Promise<NearbyStop[]> {
  assertCoordinate(origin, "origin");
  const radiusMeters = options.radiusMeters ?? 1_000;
  const limit = options.limit ?? 50;

  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new RangeError("radiusMeters must be a positive finite number");
  }
  if ((!Number.isInteger(limit) && limit !== Number.POSITIVE_INFINITY) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }

  const stops = await provider.getStops();
  const routeId = options.routeId?.trim();

  return stops
    .filter(
      (stop) => !routeId || stop.routeIds.includes(routeId),
    )
    .map((stop) => ({
      stop,
      distanceMeters: distanceInMeters(origin, stop.coordinate),
    }))
    .filter((item) => item.distanceMeters <= radiusMeters)
    .sort(
      (left, right) =>
        left.distanceMeters - right.distanceMeters ||
        left.stop.id.localeCompare(right.stop.id),
    )
    .slice(0, limit);
}

export async function findNearestStopPerRoute(
  provider: DataProvider,
  origin: Coordinate,
  radiusMeters = 1_000,
): Promise<NearbyStop[]> {
  const candidates = await findNearbyStops(provider, origin, {
    radiusMeters,
    limit: Number.POSITIVE_INFINITY,
  });
  const nearestByRoute = new Map<string, NearbyStop>();

  for (const candidate of candidates) {
    for (const routeId of candidate.stop.routeIds) {
      const current = nearestByRoute.get(routeId);
      if (!current || candidate.distanceMeters < current.distanceMeters) {
        nearestByRoute.set(routeId, candidate);
      }
    }
  }

  return [...nearestByRoute.values()].sort(
    (left, right) =>
      left.distanceMeters - right.distanceMeters ||
      left.stop.routeIds.join(",").localeCompare(right.stop.routeIds.join(",")),
  );
}
