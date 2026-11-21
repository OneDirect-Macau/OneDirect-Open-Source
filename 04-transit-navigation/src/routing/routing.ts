import type {
  Coordinate,
  DataProvider,
} from "@onedirect/data-fetcher-provider-layer";
import {
  loadTransitNetwork,
  type NetworkStop,
  type TransitNetwork,
  type TransitService,
} from "../network/build-transit-network.js";

const WALK_SPEED_METERS_PER_MINUTE = 78;
const BUS_SPEED_METERS_PER_MINUTE = 310;
const LRT_SPEED_METERS_PER_MINUTE = 520;
const BUS_WAIT_MINUTES = 4;
const LRT_WAIT_MINUTES = 3;
const MAX_ORIGIN_ACCESS_METERS = 1_400;
const MAX_DESTINATION_ACCESS_METERS = 1_600;
const MAX_TRANSFER_WALK_METERS = 500;
const EARTH_RADIUS_METERS = 6_371_000;

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
};

export type JourneyOption = {
  id: string;
  kind: "direct" | "transfer";
  totalMinutes: number;
  waitMinutes: number;
  walkMinutes: number;
  transferCount: number;
  badges: string[];
  legs: JourneyLeg[];
};

export type JourneySearchOptions = {
  limit?: number;
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

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

export function distanceInMeters(from: Coordinate, to: Coordinate): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(to.lng - from.lng);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

function minutesForMeters(meters: number, speed: number): number {
  return Math.max(1, Math.ceil(meters / speed));
}

function waitMinutes(service: TransitService): number {
  return service.mode === "lrt" ? LRT_WAIT_MINUTES : BUS_WAIT_MINUTES;
}

function rideMinutes(service: TransitService, meters: number): number {
  return minutesForMeters(
    meters,
    service.mode === "lrt"
      ? LRT_SPEED_METERS_PER_MINUTE
      : BUS_SPEED_METERS_PER_MINUTE,
  );
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

function transitLeg(
  service: TransitService,
  from: NetworkStop,
  to: NetworkStop,
): JourneyLeg {
  const distanceMeters = segmentMeters(service, from.order, to.order);
  return {
    type: service.mode,
    label: service.label,
    minutes: rideMinutes(service, distanceMeters),
    distanceMeters: Math.round(distanceMeters),
    from: { name: from.name, coordinate: from.coordinate },
    to: { name: to.name, coordinate: to.coordinate },
    coordinates: service.stops
      .slice(from.order, to.order + 1)
      .map((stop) => stop.coordinate),
  };
}

function walkLeg(
  label: string,
  distanceMeters: number,
  from: JourneyEndpoint,
  to: JourneyEndpoint,
): JourneyLeg {
  return {
    type: "walk",
    label,
    minutes: minutesForMeters(distanceMeters, WALK_SPEED_METERS_PER_MINUTE),
    distanceMeters: Math.round(distanceMeters),
    from,
    to,
    coordinates: [from.coordinate, to.coordinate],
  };
}

function toJourney(
  kind: "direct" | "transfer",
  index: number,
  origin: Coordinate,
  destination: Coordinate,
  boarding: Position,
  alight: Position,
  transit: JourneyLeg[],
  transferWalkMeters = 0,
): JourneyOption {
  const legs: JourneyLeg[] = [
    walkLeg(
      "Walk to boarding stop",
      boarding.walkMeters,
      { name: "Origin", coordinate: origin },
      { name: boarding.stop.name, coordinate: boarding.stop.coordinate },
    ),
    ...transit,
    walkLeg(
      "Walk to destination",
      alight.walkMeters,
      { name: alight.stop.name, coordinate: alight.stop.coordinate },
      { name: "Destination", coordinate: destination },
    ),
  ];
  const wait = transit.reduce(
    (total, leg) =>
      total +
      (leg.type === "lrt" ? LRT_WAIT_MINUTES : BUS_WAIT_MINUTES),
    0,
  );
  const walkMinutes = legs
    .filter((leg) => leg.type === "walk")
    .reduce((total, leg) => total + leg.minutes, 0);
  const transitMinutes = legs
    .filter((leg) => leg.type !== "walk")
    .reduce((total, leg) => total + leg.minutes, 0);

  return {
    id: `${kind}-${transit.map((leg) => leg.label).join("-")}-${index}`,
    kind,
    totalMinutes: walkMinutes + wait + transitMinutes,
    waitMinutes: wait,
    walkMinutes,
    transferCount: kind === "transfer" ? 1 : 0,
    badges: transit.map((leg) => leg.label.split(" · ")[0]!),
    legs,
  };
}

function directCandidates(
  services: TransitService[],
  origin: Coordinate,
  destination: Coordinate,
): Array<{
  service: TransitService;
  boarding: Position;
  alight: Position;
}> {
  return services.flatMap((service) => {
    const boarding = nearestStop(service, origin, MAX_ORIGIN_ACCESS_METERS);
    if (!boarding) return [];
    const alight = nearestStop(
      service,
      destination,
      MAX_DESTINATION_ACCESS_METERS,
      boarding.stop.order,
    );
    return alight ? [{ service, boarding, alight }] : [];
  });
}

function transferCandidates(
  services: TransitService[],
  origin: Coordinate,
  destination: Coordinate,
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

  const direct = directCandidates(services, origin, destination).map(
    ({ service, boarding, alight }, index) =>
      toJourney(
        "direct",
        index,
        origin,
        destination,
        boarding,
        alight,
        [transitLeg(service, boarding.stop, alight.stop)],
      ),
  );
  const transfers = transferCandidates(services, origin, destination).map(
    (candidate, index) => {
      const firstLeg = transitLeg(
        candidate.firstService,
        candidate.boarding.stop,
        candidate.transfer.stop,
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
      );
      const secondLeg = transitLeg(
        candidate.secondService,
        candidate.secondBoarding.stop,
        candidate.alight.stop,
      );
      const journey = toJourney(
        "transfer",
        index,
        origin,
        destination,
        candidate.boarding,
        candidate.alight,
        [firstLeg, secondLeg],
        candidate.transferWalkMeters,
      );
      journey.legs.splice(2, 0, transferWalk);
      journey.totalMinutes += transferWalk.minutes;
      journey.walkMinutes += transferWalk.minutes;
      return journey;
    },
  );

  return [...direct, ...transfers]
    .sort(
      (left, right) =>
        left.totalMinutes - right.totalMinutes ||
        left.transferCount - right.transferCount ||
        left.id.localeCompare(right.id),
    )
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
