import type {
  Coordinate,
  DataProvider,
} from "@onedirect/data-fetcher-provider-layer";
import {
  loadTransitNetwork,
  type NetworkStop,
  type TransitService,
} from "../network/build-transit-network.js";
import {
  DEFAULT_URBAN_DETOUR_FACTOR,
  DEFAULT_WALKING_SLOPE_FACTOR,
  busWait,
  congestionRatio,
  expectedWaitMinutes,
  feasibleTransferWaitMinutes,
  haversineMeters,
  headwayAtTime,
  lrtRideMinutes,
  routeScore,
  segmentTravelSeconds,
  walkingMinutes as mathWalkingMinutes,
  type RouteScoreWeights,
  type WaitConfidence,
  type WaitEstimate,
} from "./navigation-math.js";

const BUS_FREE_FLOW_SPEED_KMH = 18.6;
const BUS_SIGNAL_SPACING_METERS = 450;
const BUS_TURN_PENALTY_SECONDS = 10;
const BUS_HEADWAY_MINUTES = 8;
const LRT_HEADWAY_MINUTES = 6;
const MAX_ORIGIN_ACCESS_METERS = 1_400;
const MAX_DESTINATION_ACCESS_METERS = 1_600;
const MAX_TRANSFER_WALK_METERS = 350;

export type JourneyEndpoint = {
  name: string;
  coordinate: Coordinate;
};

export type JourneyLeg = {
  type: "walk" | "bus" | "lrt";
  label: string;
  minutes: number;
  distanceMeters: number;
  from: JourneyEndpoint;
  to: JourneyEndpoint;
  coordinates?: Coordinate[];
  waitMinutes?: number;
  waitConfidence?: WaitConfidence;
  trafficSaturationRatio?: number;
};

export type JourneyOption = {
  id: string;
  kind: "direct" | "transfer";
  totalMinutes: number;
  waitMinutes: number;
  walkMinutes: number;
  ridingMinutes: number;
  transferCount: number;
  transferBufferMinutes: number;
  congestionRatio: number;
  etaVarianceMinutes: number;
  score: number;
  badges: string[];
  legs: JourneyLeg[];
};

export type JourneySearchOptions = {
  limit?: number;
  referenceTime?: Date;
  congestionRatio?: number;
  urbanDetourFactor?: number;
  walkingSlopeFactor?: number;
  transferSafetyBufferMinutes?: number;
  routeScoreWeights?: Partial<RouteScoreWeights>;
  liveWaitMinutes?: (
    serviceId: string,
    stopId: string,
  ) => number | null | undefined;
};

type Position = {
  stop: NetworkStop;
  walkMeters: number;
};

type TransferCandidate = {
  firstService: TransitService;
  secondService: TransitService;
  boarding: Position;
  transfer: Position;
  secondBoarding: Position;
  alight: Position;
  transferWalkMeters: number;
};

type PlanningContext = {
  referenceTime: Date;
  congestion: number;
  urbanDetourFactor: number;
  walkingSlopeFactor: number;
  transferSafetyBufferMinutes: number;
  routeScoreWeights: Partial<RouteScoreWeights>;
  liveWaitMinutes?: JourneySearchOptions["liveWaitMinutes"];
};

type TransitLegResult = {
  leg: JourneyLeg;
  ridingMinutes: number;
  waitMinutes: number;
};

function displayMinutes(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.max(1, Math.ceil(minutes));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function createPlanningContext(
  options: JourneySearchOptions,
): PlanningContext {
  const referenceTime = options.referenceTime ?? new Date();
  const congestion = options.congestionRatio ??
    congestionRatio(referenceTime);
  if (!Number.isFinite(congestion) || congestion < 0 || congestion > 1.5) {
    throw new RangeError("congestionRatio must be between 0 and 1.5");
  }

  const urbanDetourFactor =
    options.urbanDetourFactor ?? DEFAULT_URBAN_DETOUR_FACTOR;
  if (
    !Number.isFinite(urbanDetourFactor) ||
    urbanDetourFactor < 1.22 ||
    urbanDetourFactor > 1.38
  ) {
    throw new RangeError("urbanDetourFactor must be between 1.22 and 1.38");
  }

  const walkingSlopeFactor =
    options.walkingSlopeFactor ?? DEFAULT_WALKING_SLOPE_FACTOR;
  if (!Number.isFinite(walkingSlopeFactor) || walkingSlopeFactor < 1) {
    throw new RangeError("walkingSlopeFactor must be at least 1");
  }

  const transferSafetyBufferMinutes =
    options.transferSafetyBufferMinutes ?? 2;
  if (
    !Number.isFinite(transferSafetyBufferMinutes) ||
    transferSafetyBufferMinutes < 0
  ) {
    throw new RangeError(
      "transferSafetyBufferMinutes must be non-negative",
    );
  }

  return {
    referenceTime,
    congestion,
    urbanDetourFactor,
    walkingSlopeFactor,
    transferSafetyBufferMinutes,
    routeScoreWeights: options.routeScoreWeights ?? {},
    liveWaitMinutes: options.liveWaitMinutes,
  };
}

function isMacauWeekend(referenceTime: Date): boolean {
  const macau = new Date(referenceTime.getTime() + 8 * 60 * 60 * 1_000);
  return macau.getUTCDay() === 0 || macau.getUTCDay() === 6;
}

function serviceHeadwayMinutes(
  service: TransitService,
  referenceTime: Date,
): number {
  if (service.mode === "lrt" && service.scheduleProfile) {
    const windows = isMacauWeekend(referenceTime)
      ? service.scheduleProfile.weekendHeadway
      : service.scheduleProfile.weekdayHeadway;
    if (windows.length > 0) {
      return headwayAtTime(windows, referenceTime);
    }
  }
  if (
    service.headwayMinutes !== undefined &&
    Number.isFinite(service.headwayMinutes) &&
    service.headwayMinutes > 0
  ) {
    return service.headwayMinutes;
  }
  return service.mode === "lrt"
    ? LRT_HEADWAY_MINUTES
    : BUS_HEADWAY_MINUTES;
}

function waitEstimate(
  service: TransitService,
  stop: NetworkStop,
  context: PlanningContext,
): WaitEstimate {
  const headway = serviceHeadwayMinutes(
    service,
    context.referenceTime,
  );
  const liveWait = service.mode === "bus"
    ? context.liveWaitMinutes?.(service.id, stop.id)
    : null;
  return busWait(liveWait, headway);
}

function rideMinutes(
  service: TransitService,
  distanceMeters: number,
  stopCount: number,
  congestion: number,
): number {
  if (service.mode === "lrt") {
    return lrtRideMinutes(distanceMeters, stopCount);
  }
  return segmentTravelSeconds({
    lengthMeters: distanceMeters,
    freeFlowSpeedKmh: BUS_FREE_FLOW_SPEED_KMH,
    saturationRatio: congestion,
    signalCount: Math.ceil(
      distanceMeters / BUS_SIGNAL_SPACING_METERS,
    ),
    turnPenaltySeconds:
      distanceMeters > 800 ? BUS_TURN_PENALTY_SECONDS : 0,
  }) / 60;
}

function etaVarianceMinutes(
  services: TransitService[],
  transferCount: number,
  congestion: number,
): number {
  const modeVariance = services.reduce(
    (total, service) =>
      total + (service.mode === "lrt" ? 2 : 5),
    0,
  );
  return congestion * (modeVariance + transferCount * 2.5);
}

export function distanceInMeters(
  from: Coordinate,
  to: Coordinate,
): number {
  return haversineMeters(from, to);
}

function nearestStop(
  service: TransitService,
  coordinate: Coordinate,
  maxMeters: number,
  afterIndex = -1,
): Position | null {
  let best: Position | null = null;
  for (let index = afterIndex + 1; index < service.stops.length; index += 1) {
    const stop = service.stops[index]!;
    const walkMeters = distanceInMeters(coordinate, stop.coordinate);
    if (!Number.isFinite(walkMeters) || walkMeters > maxMeters) continue;
    if (!best || walkMeters < best.walkMeters) {
      best = { stop, walkMeters };
    }
  }
  return best;
}

function segmentMeters(
  service: TransitService,
  startOrder: number,
  endOrder: number,
): number {
  let total = 0;
  for (let index = startOrder; index < endOrder; index += 1) {
    total += distanceInMeters(
      service.stops[index]!.coordinate,
      service.stops[index + 1]!.coordinate,
    );
  }
  return total;
}

function walkLeg(
  label: string,
  distanceMeters: number,
  from: JourneyEndpoint,
  to: JourneyEndpoint,
  context: PlanningContext,
): JourneyLeg {
  return {
    type: "walk",
    label,
    minutes: displayMinutes(
      mathWalkingMinutes(
        distanceMeters,
        context.urbanDetourFactor,
        context.walkingSlopeFactor,
      ),
    ),
    distanceMeters: Math.round(distanceMeters),
    from,
    to,
    coordinates: [from.coordinate, to.coordinate],
  };
}

function transitLeg(
  service: TransitService,
  from: NetworkStop,
  to: NetworkStop,
  wait: WaitEstimate,
  context: PlanningContext,
): TransitLegResult {
  const distanceMeters = segmentMeters(service, from.order, to.order);
  const stopCount = Math.max(0, to.order - from.order);
  const ridingMinutes = rideMinutes(
    service,
    distanceMeters,
    stopCount,
    context.congestion,
  );
  return {
    ridingMinutes,
    waitMinutes: wait.minutes,
    leg: {
      type: service.mode,
      label: service.label,
      minutes: displayMinutes(ridingMinutes),
      distanceMeters: Math.round(distanceMeters),
      from: { name: from.name, coordinate: from.coordinate },
      to: { name: to.name, coordinate: to.coordinate },
      coordinates: service.stops
        .slice(from.order, to.order + 1)
        .map((stop) => stop.coordinate),
      waitMinutes: roundToTenth(wait.minutes),
      waitConfidence: wait.confidence,
      trafficSaturationRatio: service.mode === "bus"
        ? context.congestion
        : context.congestion * 0.35,
    },
  };
}

function assembleJourney({
  id,
  kind,
  legs,
  ridingMinutes,
  waitMinutes,
  walkingMinutes,
  transferBufferMinutes,
  congestion,
  etaVariance,
  context,
  badges,
}: {
  id: string;
  kind: "direct" | "transfer";
  legs: JourneyLeg[];
  ridingMinutes: number;
  waitMinutes: number;
  walkingMinutes: number;
  transferBufferMinutes: number;
  congestion: number;
  etaVariance: number;
  context: PlanningContext;
  badges: string[];
}): JourneyOption {
  const transferCount = kind === "transfer" ? 1 : 0;
  const totalRaw =
    walkingMinutes + waitMinutes + ridingMinutes;
  const walkDisplay = displayMinutes(walkingMinutes);
  const waitDisplay = displayMinutes(waitMinutes);
  const rideDisplay = displayMinutes(ridingMinutes);

  return {
    id,
    kind,
    totalMinutes: walkDisplay + waitDisplay + rideDisplay,
    waitMinutes: waitDisplay,
    walkMinutes: walkDisplay,
    ridingMinutes: rideDisplay,
    transferCount,
    transferBufferMinutes: roundToTenth(transferBufferMinutes),
    congestionRatio: congestion,
    etaVarianceMinutes: roundToTenth(etaVariance),
    score: routeScore(
      totalRaw,
      walkingMinutes,
      transferCount,
      etaVariance,
      context.routeScoreWeights,
    ).value,
    badges,
    legs,
  };
}

function directCandidates(
  services: TransitService[],
  origin: Coordinate,
  destination: Coordinate,
  context: PlanningContext,
): JourneyOption[] {
  return services.flatMap((service) => {
    const boarding = nearestStop(
      service,
      origin,
      MAX_ORIGIN_ACCESS_METERS,
    );
    if (!boarding) return [];
    const alight = nearestStop(
      service,
      destination,
      MAX_DESTINATION_ACCESS_METERS,
      boarding.stop.order,
    );
    if (!alight) return [];

    const wait = waitEstimate(service, boarding.stop, context);
    const transit = transitLeg(
      service,
      boarding.stop,
      alight.stop,
      wait,
      context,
    );
    const walkTo = walkLeg(
      "Walk to boarding stop",
      boarding.walkMeters,
      { name: "Origin", coordinate: origin },
      {
        name: boarding.stop.name,
        coordinate: boarding.stop.coordinate,
      },
      context,
    );
    const walkFrom = walkLeg(
      "Walk to destination",
      alight.walkMeters,
      {
        name: alight.stop.name,
        coordinate: alight.stop.coordinate,
      },
      { name: "Destination", coordinate: destination },
      context,
    );
    const variance = etaVarianceMinutes(
      [service],
      0,
      context.congestion,
    );

    return [assembleJourney({
      id: [
        "direct",
        service.id,
        boarding.stop.id,
        alight.stop.id,
      ].join(":"),
      kind: "direct",
      legs: [walkTo, transit.leg, walkFrom],
      ridingMinutes: transit.ridingMinutes,
      waitMinutes: transit.waitMinutes,
      walkingMinutes: boarding.walkMeters + alight.walkMeters,
      transferBufferMinutes: 0,
      congestion: context.congestion,
      etaVariance: variance,
      context,
      badges: [service.label.split(" · ")[0]!],
    })];
  });
}

function transferCandidates(
  services: TransitService[],
  origin: Coordinate,
  destination: Coordinate,
  context: PlanningContext,
): TransferCandidate[] {
  const candidates: TransferCandidate[] = [];
  for (const firstService of services) {
    const boarding = nearestStop(
      firstService,
      origin,
      MAX_ORIGIN_ACCESS_METERS,
    );
    if (!boarding) continue;

    for (
      let transferIndex = boarding.stop.order + 1;
      transferIndex < firstService.stops.length;
      transferIndex += 1
    ) {
      const transfer = {
        stop: firstService.stops[transferIndex]!,
        walkMeters: 0,
      };
      for (const secondService of services) {
        if (secondService.id === firstService.id) continue;
        const secondBoarding = nearestStop(
          secondService,
          transfer.stop.coordinate,
          MAX_TRANSFER_WALK_METERS,
        );
        if (!secondBoarding) continue;
        const alight = nearestStop(
          secondService,
          destination,
          MAX_DESTINATION_ACCESS_METERS,
          secondBoarding.stop.order,
        );
        if (!alight) continue;
        candidates.push({
          firstService,
          secondService,
          boarding,
          transfer,
          secondBoarding,
          alight,
          transferWalkMeters: secondBoarding.walkMeters,
        });
      }
    }
  }
  return candidates;
}

function transferJourneys(
  candidates: TransferCandidate[],
  origin: Coordinate,
  destination: Coordinate,
  context: PlanningContext,
): JourneyOption[] {
  return candidates.map((candidate) => {
    const firstWait = waitEstimate(
      candidate.firstService,
      candidate.boarding.stop,
      context,
    );
    const secondHeadway = serviceHeadwayMinutes(
      candidate.secondService,
      context.referenceTime,
    );
    const secondLiveEta = candidate.secondService.mode === "bus"
      ? context.liveWaitMinutes?.(
        candidate.secondService.id,
        candidate.secondBoarding.stop.id,
      )
      : null;
    const validSecondLiveEta =
      secondLiveEta !== null &&
      secondLiveEta !== undefined &&
      Number.isFinite(secondLiveEta) &&
      secondLiveEta >= 0
        ? secondLiveEta
        : null;
    const scheduledSecondWait = expectedWaitMinutes(secondHeadway);
    const transferWalkMinutes = mathWalkingMinutes(
      candidate.transferWalkMeters,
      context.urbanDetourFactor,
      context.walkingSlopeFactor,
    );
    const secondWaitMinutes = feasibleTransferWaitMinutes(
      validSecondLiveEta ?? scheduledSecondWait,
      transferWalkMinutes,
      context.transferSafetyBufferMinutes,
      secondHeadway,
    );
    const secondWait: WaitEstimate = {
      minutes: secondWaitMinutes,
      confidence: validSecondLiveEta !== null
        ? "realtime"
        : "scheduled",
    };

    const firstTransit = transitLeg(
      candidate.firstService,
      candidate.boarding.stop,
      candidate.transfer.stop,
      firstWait,
      context,
    );
    const secondTransit = transitLeg(
      candidate.secondService,
      candidate.secondBoarding.stop,
      candidate.alight.stop,
      secondWait,
      context,
    );
    const walkTo = walkLeg(
      "Walk to boarding stop",
      candidate.boarding.walkMeters,
      { name: "Origin", coordinate: origin },
      {
        name: candidate.boarding.stop.name,
        coordinate: candidate.boarding.stop.coordinate,
      },
      context,
    );
    const transferWalk = walkLeg(
      "Walk transfer",
      candidate.transferWalkMeters,
      {
        name: candidate.transfer.stop.name,
        coordinate: candidate.transfer.stop.coordinate,
      },
      {
        name: candidate.secondBoarding.stop.name,
        coordinate: candidate.secondBoarding.stop.coordinate,
      },
      context,
    );
    const walkFrom = walkLeg(
      "Walk to destination",
      candidate.alight.walkMeters,
      {
        name: candidate.alight.stop.name,
        coordinate: candidate.alight.stop.coordinate,
      },
      { name: "Destination", coordinate: destination },
      context,
    );
    const variance = etaVarianceMinutes(
      [candidate.firstService, candidate.secondService],
      1,
      context.congestion,
    );

    return assembleJourney({
      id: [
        "transfer",
        candidate.firstService.id,
        candidate.secondService.id,
        candidate.transfer.stop.id,
        candidate.secondBoarding.stop.id,
      ].join(":"),
      kind: "transfer",
      legs: [
        walkTo,
        firstTransit.leg,
        transferWalk,
        secondTransit.leg,
        walkFrom,
      ],
      ridingMinutes:
        firstTransit.ridingMinutes + secondTransit.ridingMinutes,
      waitMinutes:
        firstTransit.waitMinutes + secondTransit.waitMinutes,
      walkingMinutes:
        candidate.boarding.walkMeters +
        candidate.transferWalkMeters +
        candidate.alight.walkMeters,
      transferBufferMinutes: Math.max(
        0,
        secondWaitMinutes - transferWalkMinutes,
      ),
      congestion: context.congestion,
      etaVariance: variance,
      context,
      badges: [
        candidate.firstService.label.split(" · ")[0]!,
        candidate.secondService.label.split(" · ")[0]!,
      ],
    });
  });
}

export function buildJourneyOptionsFromServices(
  services: TransitService[],
  origin: Coordinate,
  destination: Coordinate,
  options: JourneySearchOptions = {},
): JourneyOption[] {
  const limit = options.limit ?? 8;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }

  const context = createPlanningContext(options);
  const directs = directCandidates(
    services,
    origin,
    destination,
    context,
  );
  const transfers = transferJourneys(
    transferCandidates(services, origin, destination, context),
    origin,
    destination,
    context,
  );
  const seen = new Set<string>();

  return [...directs, ...transfers]
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.totalMinutes - right.totalMinutes ||
        left.transferCount - right.transferCount ||
        left.id.localeCompare(right.id),
    )
    .filter((journey) => {
      if (seen.has(journey.id)) return false;
      seen.add(journey.id);
      return true;
    })
    .slice(0, limit);
}

export async function calculateJourneyOptions(
  provider: DataProvider,
  origin: Coordinate,
  destination: Coordinate,
  options: JourneySearchOptions = {},
): Promise<JourneyOption[]> {
  const network = await loadTransitNetwork(provider);
  return buildJourneyOptionsFromServices(
    network.services,
    origin,
    destination,
    options,
  );
}

export async function prepareJourneyGeometry(
  provider: DataProvider,
  journey: JourneyOption,
): Promise<JourneyOption> {
  const legs = await Promise.all(
    journey.legs.map(async (leg) => {
      if (leg.type !== "walk") return leg;
      const path = await provider.getWalkingPath(
        leg.from.coordinate,
        leg.to.coordinate,
      );
      return {
        ...leg,
        coordinates:
          path?.coordinates?.length && path.coordinates.length > 1
            ? path.coordinates
            : [leg.from.coordinate, leg.to.coordinate],
      };
    }),
  );
  return { ...journey, legs };
}

export function findBestJourney(
  journeys: JourneyOption[],
): JourneyOption | null {
  return journeys[0] ?? null;
}
