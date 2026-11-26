import type { Coordinate } from "@onedirect/data-fetcher-provider-layer";

export const EARTH_RADIUS_METERS = 6_371_000;
export const DEFAULT_URBAN_DETOUR_FACTOR = 1.28;
export const DEFAULT_WALKING_SLOPE_FACTOR = 1.08;
export const WALK_SPEED_METERS_PER_SECOND = 1.25;
export const BPR_ALPHA = 0.15;
export const BPR_BETA = 4;
export const LRT_CRUISE_SPEED_KMH = 35;
export const LRT_DWELL_SECONDS = 20;

export type WaitConfidence = "realtime" | "scheduled";

export type WaitEstimate = {
  minutes: number;
  confidence: WaitConfidence;
};

export type RouteScoreWeights = {
  totalMinutes: number;
  walkingMinutes: number;
  transfers: number;
  etaVarianceMinutes: number;
};

export type RouteScore = {
  value: number;
  totalMinutes: number;
  walkingMinutes: number;
  transfers: number;
  etaVarianceMinutes: number;
};

export type HeadwayWindow = {
  startMinute: number;
  endMinute: number;
  minutes: number;
};

export const DEFAULT_ROUTE_SCORE_WEIGHTS: RouteScoreWeights = {
  totalMinutes: 1,
  walkingMinutes: 0.25,
  transfers: 2,
  etaVarianceMinutes: 0.5,
};

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

function assertNonNegative(value: number, name: string): void {
  assertFinite(value, name);
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative`);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function isValidCoordinate(coordinate: Coordinate): boolean {
  return (
    Number.isFinite(coordinate.lat) &&
    Number.isFinite(coordinate.lng) &&
    coordinate.lat >= -90 &&
    coordinate.lat <= 90 &&
    coordinate.lng >= -180 &&
    coordinate.lng <= 180
  );
}

/**
 * WGS84 great-circle distance using the haversine form.
 * Invalid coordinates return Infinity so routing can reject them safely.
 */
export function haversineMeters(
  from: Coordinate,
  to: Coordinate,
): number {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
    return Number.POSITIVE_INFINITY;
  }

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(to.lng - from.lng);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.asin(Math.sqrt(clamp(h, 0, 1)))
  );
}

export function urbanDistanceMeters(
  from: Coordinate,
  to: Coordinate,
  detourFactor = DEFAULT_URBAN_DETOUR_FACTOR,
): number {
  if (
    !Number.isFinite(detourFactor) ||
    detourFactor < 1.22 ||
    detourFactor > 1.38
  ) {
    throw new RangeError("detourFactor must be between 1.22 and 1.38");
  }
  return haversineMeters(from, to) * detourFactor;
}

export function bprSpeedKmh(
  freeFlowSpeedKmh: number,
  saturationRatio: number,
  alpha = BPR_ALPHA,
  beta = BPR_BETA,
): number {
  if (!Number.isFinite(freeFlowSpeedKmh) || freeFlowSpeedKmh <= 0) {
    throw new RangeError("freeFlowSpeedKmh must be positive");
  }
  if (!Number.isFinite(alpha) || alpha < 0) {
    throw new RangeError("alpha must be non-negative");
  }
  if (!Number.isFinite(beta) || beta <= 0) {
    throw new RangeError("beta must be positive");
  }

  if (!Number.isFinite(saturationRatio)) {
    throw new RangeError("saturationRatio must be finite");
  }
  const saturation = clamp(saturationRatio, 0, 1.5);
  return (
    freeFlowSpeedKmh /
    (1 + alpha * Math.pow(saturation, beta))
  );
}

export function signalWaitSeconds(
  saturationRatio: number,
): number {
  if (!Number.isFinite(saturationRatio)) {
    throw new RangeError("saturationRatio must be finite");
  }
  return 15 + 30 * clamp(saturationRatio, 0, 1.5);
}

export function segmentTravelSeconds({
  lengthMeters,
  freeFlowSpeedKmh,
  saturationRatio,
  signalCount,
  turnPenaltySeconds = 0,
}: {
  lengthMeters: number;
  freeFlowSpeedKmh: number;
  saturationRatio: number;
  signalCount: number;
  turnPenaltySeconds?: number;
}): number {
  assertNonNegative(lengthMeters, "lengthMeters");
  assertNonNegative(signalCount, "signalCount");
  assertNonNegative(turnPenaltySeconds, "turnPenaltySeconds");
  if (!Number.isInteger(signalCount)) {
    throw new RangeError("signalCount must be an integer");
  }

  const speedMetersPerSecond =
    bprSpeedKmh(freeFlowSpeedKmh, saturationRatio) / 3.6;
  return (
    lengthMeters / speedMetersPerSecond +
    signalCount * signalWaitSeconds(saturationRatio) +
    turnPenaltySeconds
  );
}

export function ewmaSpeed(
  observedSpeedKmh: number,
  historicalSpeedKmh: number,
  gamma = 0.5,
): number {
  assertNonNegative(observedSpeedKmh, "observedSpeedKmh");
  assertNonNegative(historicalSpeedKmh, "historicalSpeedKmh");
  if (gamma < 0.35 || gamma > 0.65) {
    throw new RangeError("gamma must be between 0.35 and 0.65");
  }
  return (
    gamma * observedSpeedKmh +
    (1 - gamma) * historicalSpeedKmh
  );
}

export function walkingMinutes(
  distanceMeters: number,
  detourFactor = DEFAULT_URBAN_DETOUR_FACTOR,
  slopeFactor = DEFAULT_WALKING_SLOPE_FACTOR,
): number {
  assertNonNegative(distanceMeters, "distanceMeters");
  if (
    !Number.isFinite(detourFactor) ||
    detourFactor < 1.22 ||
    detourFactor > 1.38
  ) {
    throw new RangeError("detourFactor must be between 1.22 and 1.38");
  }
  if (!Number.isFinite(slopeFactor) || slopeFactor < 1) {
    throw new RangeError("slopeFactor must be at least 1");
  }
  return (
    distanceMeters *
    detourFactor *
    slopeFactor /
    (WALK_SPEED_METERS_PER_SECOND * 60)
  );
}

export function expectedWaitMinutes(
  headwayMinutes: number,
): number {
  assertNonNegative(headwayMinutes, "headwayMinutes");
  return headwayMinutes / 2;
}

export function busWait(
  liveEtaMinutes: number | null | undefined,
  headwayMinutes: number,
): WaitEstimate {
  if (!Number.isFinite(headwayMinutes) || headwayMinutes < 0) {
    throw new RangeError("headwayMinutes must be non-negative");
  }
  if (
    liveEtaMinutes !== null &&
    liveEtaMinutes !== undefined &&
    Number.isFinite(liveEtaMinutes) &&
    liveEtaMinutes >= 0
  ) {
    return {
      minutes: liveEtaMinutes,
      confidence: "realtime",
    };
  }
  return {
    minutes: expectedWaitMinutes(headwayMinutes),
    confidence: "scheduled",
  };
}

export function lrtRideMinutes(
  distanceMeters: number,
  stopCount: number,
  cruiseSpeedKmh = LRT_CRUISE_SPEED_KMH,
): number {
  assertNonNegative(distanceMeters, "distanceMeters");
  assertNonNegative(stopCount, "stopCount");
  if (!Number.isInteger(stopCount)) {
    throw new RangeError("stopCount must be an integer");
  }
  if (!Number.isFinite(cruiseSpeedKmh) || cruiseSpeedKmh <= 0) {
    throw new RangeError("cruiseSpeedKmh must be positive");
  }
  return (
    distanceMeters / (cruiseSpeedKmh * 1_000 / 60) +
    stopCount * LRT_DWELL_SECONDS / 60
  );
}

export function feasibleTransferWaitMinutes(
  nextDepartureEtaMinutes: number,
  transferWalkMinutes: number,
  safetyBufferMinutes = 2,
  headwayMinutes: number,
): number {
  assertNonNegative(nextDepartureEtaMinutes, "nextDepartureEtaMinutes");
  assertNonNegative(transferWalkMinutes, "transferWalkMinutes");
  assertNonNegative(safetyBufferMinutes, "safetyBufferMinutes");
  if (!Number.isFinite(headwayMinutes) || headwayMinutes <= 0) {
    throw new RangeError("headwayMinutes must be positive");
  }

  const requiredMinutes = transferWalkMinutes + safetyBufferMinutes;
  if (nextDepartureEtaMinutes >= requiredMinutes) {
    return nextDepartureEtaMinutes;
  }
  const missedDepartures = Math.ceil(
    (requiredMinutes - nextDepartureEtaMinutes) / headwayMinutes,
  );
  return (
    nextDepartureEtaMinutes +
    missedDepartures * headwayMinutes
  );
}

export function routeScore(
  totalMinutes: number,
  walkingMinutesValue: number,
  transfers: number,
  etaVarianceMinutes: number,
  weights: Partial<RouteScoreWeights> = {},
): RouteScore {
  assertNonNegative(totalMinutes, "totalMinutes");
  assertNonNegative(walkingMinutesValue, "walkingMinutes");
  assertNonNegative(transfers, "transfers");
  assertNonNegative(etaVarianceMinutes, "etaVarianceMinutes");
  if (!Number.isInteger(transfers)) {
    throw new RangeError("transfers must be an integer");
  }

  const resolved = {
    ...DEFAULT_ROUTE_SCORE_WEIGHTS,
    ...weights,
  };
  for (const [name, value] of Object.entries(resolved)) {
    assertNonNegative(value, `weights.${name}`);
  }

  return {
    value:
      resolved.totalMinutes * totalMinutes +
      resolved.walkingMinutes * walkingMinutesValue +
      resolved.transfers * transfers +
      resolved.etaVarianceMinutes * etaVarianceMinutes,
    totalMinutes,
    walkingMinutes: walkingMinutesValue,
    transfers,
    etaVarianceMinutes,
  };
}

function macauClock(referenceTime: Date): {
  weekday: number;
  minuteOfDay: number;
} {
  if (Number.isNaN(referenceTime.getTime())) {
    throw new RangeError("referenceTime must be a valid Date");
  }
  // Macau has used UTC+8 without daylight-saving transitions since 1946.
  const local = new Date(referenceTime.getTime() + 8 * 60 * 60 * 1_000);
  return {
    weekday: local.getUTCDay(),
    minuteOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

export function congestionRatio(referenceTime: Date): number {
  const { weekday, minuteOfDay } = macauClock(referenceTime);
  const weekend = weekday === 0 || weekday === 6;
  const morningPeak =
    minuteOfDay >= 7 * 60 + 30 &&
    minuteOfDay < 9 * 60 + 30;
  const eveningPeak =
    minuteOfDay >= 17 * 60 + 30 &&
    minuteOfDay < 19 * 60 + 30;

  if ((morningPeak || eveningPeak) && !weekend) return 0.95;
  if (morningPeak || eveningPeak) return 0.78;
  if (minuteOfDay >= 10 * 60 && minuteOfDay < 17 * 60) return 0.55;
  if (minuteOfDay >= 19 * 60 + 30 && minuteOfDay <= 23 * 60) return 0.38;
  return 0.24;
}

export function headwayAtTime(
  windows: HeadwayWindow[],
  referenceTime: Date,
): number {
  if (windows.length === 0) {
    throw new RangeError("windows must not be empty");
  }
  const { minuteOfDay } = macauClock(referenceTime);
  const match = windows.find(
    (window) =>
      minuteOfDay >= window.startMinute &&
      minuteOfDay < window.endMinute,
  );
  const fallback = minuteOfDay < windows[0]!.startMinute
    ? windows[0]!
    : windows[windows.length - 1]!;
  const minutes = (match ?? fallback).minutes;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new RangeError("headway windows must contain positive minutes");
  }
  return minutes;
}
