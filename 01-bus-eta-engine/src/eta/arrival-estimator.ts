import type {
  LiveRouteSnapshot,
  LiveStopObservation,
  RouteDirection,
} from "@onedirect/data-fetcher-provider-layer";
import { distanceInMeters } from "./geo.js";
import { normalizeStopCode } from "../matching/stop-normalizer.js";

export type VehicleArrival = {
  minutes: number;
  vehicleId: string;
  speedKmh: number;
};

export type StopArrivalEstimate = {
  routeStopIndex: number;
  stopId: string;
  stopCode: string;
  name: string;
  estimateMinutes: number | null;
  arrivals: VehicleArrival[];
};

export type ArrivalEstimateOptions = {
  maxArrivalsPerStop?: number;
  minimumMinutes?: number;
};

function routeIndexForLiveStop(
  direction: RouteDirection,
  liveStop: LiveStopObservation,
  fallbackIndex: number,
): number {
  const matchingIndex = direction.stops.findIndex(
    (stop) =>
      normalizeStopCode(stop.code) === normalizeStopCode(liveStop.code),
  );
  if (matchingIndex >= 0) return matchingIndex;
  return Math.min(fallbackIndex, direction.stops.length - 1);
}

export function estimateStopArrivals(
  direction: RouteDirection,
  liveStops: LiveStopObservation[],
  options: ArrivalEstimateOptions = {},
): StopArrivalEstimate[] {
  const maxArrivalsPerStop = options.maxArrivalsPerStop ?? 3;
  const minimumMinutes = options.minimumMinutes ?? 1;
  if (!Number.isInteger(maxArrivalsPerStop) || maxArrivalsPerStop < 1) {
    throw new RangeError("maxArrivalsPerStop must be a positive integer");
  }
  if (!Number.isFinite(minimumMinutes) || minimumMinutes < 0) {
    throw new RangeError("minimumMinutes must be a non-negative number");
  }

  const segmentDistances = direction.stops.slice(0, -1).map((stop, index) =>
    distanceInMeters(stop.coordinate, direction.stops[index + 1]!.coordinate),
  );
  const cumulative = [0];
  for (const segmentDistance of segmentDistances) {
    cumulative.push(
      cumulative[cumulative.length - 1]! +
        (Number.isFinite(segmentDistance) ? segmentDistance : 0),
    );
  }

  const vehicles = liveStops.flatMap((liveStop, liveIndex) => {
    const routeIndex = routeIndexForLiveStop(direction, liveStop, liveIndex);
    return liveStop.vehicles.map((vehicle) => ({
      ...vehicle,
      routeIndex,
    }));
  });

  return direction.stops.map((stop, targetIndex) => {
    const arrivals = vehicles
      .filter(
        (vehicle) =>
          vehicle.routeIndex < targetIndex &&
          vehicle.speedKmh !== null &&
          vehicle.speedKmh > 0 &&
          targetIndex < cumulative.length,
      )
      .map((vehicle) => {
        const segmentStart = cumulative[vehicle.routeIndex] ?? 0;
        const segmentEnd = cumulative[vehicle.routeIndex + 1] ?? segmentStart;
        const remainingMeters = Math.max(
          0,
          cumulative[targetIndex]! -
            segmentStart -
            (segmentEnd - segmentStart) / 2,
        );
        const metersPerMinute = vehicle.speedKmh! * 1_000 / 60;
        return {
          minutes: Math.max(
            minimumMinutes,
            Math.ceil(remainingMeters / metersPerMinute),
          ),
          vehicleId: vehicle.id,
          speedKmh: vehicle.speedKmh!,
        };
      })
      .sort(
        (left, right) =>
          left.minutes - right.minutes ||
          left.vehicleId.localeCompare(right.vehicleId),
      )
      .slice(0, maxArrivalsPerStop);

    return {
      routeStopIndex: targetIndex,
      stopId: stop.id,
      stopCode: stop.code,
      name: stop.name,
      estimateMinutes: arrivals[0]?.minutes ?? null,
      arrivals,
    };
  });
}

export function estimateSnapshotArrivals(
  direction: RouteDirection,
  snapshot: LiveRouteSnapshot,
  options: ArrivalEstimateOptions = {},
): StopArrivalEstimate[] {
  return estimateStopArrivals(direction, snapshot.stops, options);
}
