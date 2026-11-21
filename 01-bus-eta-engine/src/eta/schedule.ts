import type {
  LrtArrivalSchedule,
  LrtHeadwayWindow,
  LrtScheduleProfile,
  LrtScheduleRequest,
} from "@onedirect/data-fetcher-provider-layer";

const DEFAULT_UTC_OFFSET_MINUTES = 8 * 60;
const SERVICE_START_MINUTE = 6 * 60 + 30;
const WEEKDAY_SERVICE_END_MINUTE = 23 * 60 + 15;
const WEEKEND_SERVICE_END_MINUTE = 23 * 60 + 59;

type Clock = {
  dayIndex: number;
  minuteOfDay: number;
  secondOfDay: number;
};

function localClock(date: Date, utcOffsetMinutes: number): Clock {
  const shifted = new Date(date.getTime() + utcOffsetMinutes * 60_000);
  return {
    dayIndex: shifted.getUTCDay(),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    secondOfDay:
      shifted.getUTCHours() * 3_600 +
      shifted.getUTCMinutes() * 60 +
      shifted.getUTCSeconds(),
  };
}

function serviceType(
  dayIndex: number,
): "weekday" | "friday" | "weekend" {
  if (dayIndex === 5) return "friday";
  if (dayIndex === 0 || dayIndex === 6) return "weekend";
  return "weekday";
}

function formatClock(minutes: number): string {
  const normalized = Math.max(0, Math.floor(minutes));
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(
    normalized % 60,
  ).padStart(2, "0")}`;
}

function headwayAt(
  windows: LrtHeadwayWindow[],
  minuteOfDay: number,
): number {
  return (
    windows.find(
      (window) =>
        minuteOfDay >= window.startMinute &&
        minuteOfDay < window.endMinute,
    )?.minutes ??
    windows.at(-1)?.minutes ??
    10
  );
}

function scheduledAtIso(
  now: Date,
  minuteOfDay: number,
  utcOffsetMinutes: number,
): string {
  const local = new Date(now.getTime() + utcOffsetMinutes * 60_000);
  const midnightUtc =
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
    ) -
    utcOffsetMinutes * 60_000;

  return new Date(midnightUtc + minuteOfDay * 60_000).toISOString();
}

function directionStationIndex(
  profile: LrtScheduleProfile,
  direction: number,
  stationIndex: number,
  stationCount: number,
): number {
  const bounded = Math.max(0, Math.min(stationIndex, stationCount - 1));
  return profile.reverseDirections.includes(direction)
    ? stationCount - 1 - bounded
    : bounded;
}

function departureMinutes(
  profile: LrtScheduleProfile,
  windows: LrtHeadwayWindow[],
  direction: number,
  stationIndex: number,
  stationCount: number,
  serviceEndMinute: number,
): number[] {
  const reversedIndex = directionStationIndex(
    profile,
    direction,
    stationIndex,
    stationCount,
  );
  const stationOffset =
    stationCount > 1
      ? (profile.travelMinutes * reversedIndex) / (stationCount - 1)
      : 0;
  const departures: number[] = [];

  for (
    let minute = SERVICE_START_MINUTE + stationOffset;
    minute <= serviceEndMinute;
    minute += headwayAt(windows, minute)
  ) {
    departures.push(Math.round(minute * 100) / 100);
  }
  return departures;
}

export function calculateLrtSchedule(
  profile: LrtScheduleProfile | null,
  request: LrtScheduleRequest,
  options: {
    utcOffsetMinutes?: number;
    limit?: number;
  } = {},
): LrtArrivalSchedule | null {
  if (!profile || profile.lineId !== request.lineId) return null;
  if (!Number.isInteger(request.stationCount) || request.stationCount < 2) {
    throw new RangeError("stationCount must be an integer of at least 2");
  }
  if (!Number.isInteger(request.stationIndex) || request.stationIndex < 0) {
    throw new RangeError("stationIndex must be a non-negative integer");
  }
  if (request.direction !== 0 && request.direction !== 1) {
    throw new RangeError("direction must be 0 or 1");
  }

  const now = request.now ?? new Date();
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be valid");
  const utcOffsetMinutes =
    options.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES;
  const limit = options.limit ?? 3;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }

  const clock = localClock(now, utcOffsetMinutes);
  const type = serviceType(clock.dayIndex);
  const windows =
    type === "weekday" ? profile.weekdayHeadway : profile.weekendHeadway;
  const serviceEndMinute =
    type === "weekday"
      ? WEEKDAY_SERVICE_END_MINUTE
      : WEEKEND_SERVICE_END_MINUTE;
  const departures = departureMinutes(
    profile,
    windows,
    request.direction,
    request.stationIndex,
    request.stationCount,
    serviceEndMinute,
  );

  const next = departures
    .filter((minute) => minute * 60 >= clock.secondOfDay)
    .slice(0, limit)
    .map((minute) => ({
      scheduledAt: scheduledAtIso(now, minute, utcOffsetMinutes),
      minutes: Math.max(
        0,
        Math.ceil((minute * 60 - clock.secondOfDay) / 60),
      ),
    }));

  return {
    lineId: request.lineId,
    stationId: request.stationId,
    direction: request.direction,
    serviceType: type,
    isRealtime: false,
    source: "mock-headway-profile",
    serviceStart: formatClock(SERVICE_START_MINUTE),
    serviceEnd: formatClock(serviceEndMinute),
    headwayMinutes: headwayAt(windows, clock.minuteOfDay),
    next,
  };
}
