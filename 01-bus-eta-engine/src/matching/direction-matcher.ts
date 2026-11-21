import type {
  LiveRouteSnapshot,
  LiveStopObservation,
  RouteDirection,
  RouteStop,
  TransitRoute,
} from "@onedirect/data-fetcher-provider-layer";
import { normalizeStopCode, normalizeStopName } from "./stop-normalizer.js";

export type MatchedStop = {
  liveIndex: number;
  routeIndex: number;
  routeStopId: string;
  liveCode: string;
  matchedBy: "code" | "name";
};

export type DirectionMatch = {
  routeId: string;
  directionIndex: number;
  directionName: string;
  score: number;
  coverage: number;
  matchedStops: MatchedStop[];
  unmatchedCodes: string[];
};

export type MatchOptions = {
  minCoverage?: number;
  maxIndexOffset?: number;
};

function normalizedLiveStop(stop: LiveStopObservation) {
  return {
    code: normalizeStopCode(stop.code),
    name: normalizeStopName(stop.name),
  };
}

function normalizedRouteStop(stop: RouteStop) {
  return {
    id: stop.id,
    code: normalizeStopCode(stop.code),
    name: normalizeStopName(stop.name),
  };
}

function scoreDirection(
  route: TransitRoute,
  direction: RouteDirection,
  liveStops: LiveStopObservation[],
  maxIndexOffset: number,
): Omit<DirectionMatch, "routeId"> {
  const routeStops = direction.stops.map(normalizedRouteStop);
  let best: Omit<DirectionMatch, "routeId"> = {
    directionIndex: direction.index,
    directionName: direction.name,
    score: Number.NEGATIVE_INFINITY,
    coverage: 0,
    matchedStops: [],
    unmatchedCodes: liveStops.map((stop) => normalizeStopCode(stop.code)),
  };

  for (let offset = -maxIndexOffset; offset <= maxIndexOffset; offset += 1) {
    const usedRouteIndexes = new Set<number>();
    const matchedStops: MatchedStop[] = [];
    const unmatchedCodes: string[] = [];

    liveStops.forEach((liveStop, liveIndex) => {
      const targetIndex = liveIndex + offset;
      const routeStop = routeStops[targetIndex];
      const live = normalizedLiveStop(liveStop);
      if (
        !routeStop ||
        usedRouteIndexes.has(targetIndex) ||
        (!live.code && !live.name)
      ) {
        unmatchedCodes.push(live.code || normalizeStopCode(liveStop.code));
        return;
      }

      const codeMatch = Boolean(live.code && live.code === routeStop.code);
      const nameMatch = Boolean(live.name && live.name === routeStop.name);
      if (!codeMatch && !nameMatch) {
        unmatchedCodes.push(live.code);
        return;
      }

      usedRouteIndexes.add(targetIndex);
      matchedStops.push({
        liveIndex,
        routeIndex: targetIndex,
        routeStopId: routeStop.id,
        liveCode: live.code,
        matchedBy: codeMatch ? "code" : "name",
      });
    });

    const codeMatches = matchedStops.filter(
      (match) => match.matchedBy === "code",
    ).length;
    const nameMatches = matchedStops.length - codeMatches;
    const denominator = Math.max(
      1,
      Math.min(
        liveStops.length,
        route.directions[direction.index]?.stops.length ??
          direction.stops.length,
      ),
    );
    const coverage = Math.min(1, matchedStops.length / denominator);
    const score =
      codeMatches * 20 +
      nameMatches * 6 +
      coverage * 10 +
      (offset === 0 ? 1 : 0) -
      Math.abs(offset) * 0.1;

    if (score > best.score) {
      best = {
        directionIndex: direction.index,
        directionName: direction.name,
        score,
        coverage,
        matchedStops,
        unmatchedCodes,
      };
    }
  }

  return best;
}

export function matchRouteDirection(
  route: TransitRoute,
  liveStops: LiveStopObservation[],
  options: MatchOptions = {},
): DirectionMatch | null {
  if (liveStops.length === 0 || route.directions.length === 0) return null;
  const minCoverage = options.minCoverage ?? 0.5;
  const maxIndexOffset = options.maxIndexOffset ?? 3;
  if (minCoverage < 0 || minCoverage > 1) {
    throw new RangeError("minCoverage must be between 0 and 1");
  }
  if (!Number.isInteger(maxIndexOffset) || maxIndexOffset < 0) {
    throw new RangeError("maxIndexOffset must be a non-negative integer");
  }

  const candidates = route.directions.map((direction) => ({
    routeId: route.id,
    ...scoreDirection(route, direction, liveStops, maxIndexOffset),
  }));
  candidates.sort(
    (left, right) =>
      right.score - left.score ||
      left.directionIndex - right.directionIndex,
  );
  const best = candidates[0];
  if (!best || best.score <= 0 || best.coverage < minCoverage) return null;
  return best;
}

export function matchLiveRoute(
  route: TransitRoute,
  snapshot: LiveRouteSnapshot,
  options: MatchOptions = {},
): DirectionMatch | null {
  if (normalizeStopCode(route.id) !== normalizeStopCode(snapshot.routeId)) {
    return null;
  }
  return matchRouteDirection(route, snapshot.stops, options);
}

export function findMatchingStop(
  route: TransitRoute,
  liveStop: LiveStopObservation,
): RouteStop | null {
  const code = normalizeStopCode(liveStop.code);
  const name = normalizeStopName(liveStop.name);
  for (const direction of route.directions) {
    const stop = direction.stops.find(
      (candidate) =>
        normalizeStopCode(candidate.code) === code ||
        normalizeStopName(candidate.name) === name,
    );
    if (stop) return stop;
  }
  return null;
}
