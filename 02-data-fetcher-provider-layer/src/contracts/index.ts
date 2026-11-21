export type TransitMode = "bus" | "lrt";

export type Coordinate = {
  lat: number;
  lng: number;
};

export type RouteStop = {
  id: string;
  code: string;
  name: string;
  coordinate: Coordinate;
};

export type RouteDirection = {
  index: number;
  name: string;
  stops: RouteStop[];
};

export type TransitRoute = {
  id: string;
  label: string;
  description: string;
  mode: TransitMode;
  color: string;
  directions: RouteDirection[];
};

export type TransitStop = {
  id: string;
  code: string;
  name: string;
  coordinate: Coordinate;
  routeIds: string[];
};

export type LrtLine = {
  id: string;
  label: string;
  color: string;
  stationIds: string[];
  geometry: Coordinate[];
};

export type LiveVehiclePosition = {
  id: string;
  segmentIndex: number;
  speedKmh: number | null;
};

export type LiveStopObservation = {
  index: number;
  code: string;
  name: string;
  vehicles: LiveVehiclePosition[];
};

export type LiveRouteSnapshot = {
  routeId: string;
  directionIndex: number;
  observedAt: string;
  stops: LiveStopObservation[];
};

export type EtaArrival = {
  minutes: number;
  estimatedAt: string;
};

export type EtaSnapshot = {
  routeId: string;
  stopId: string | null;
  direction: number | null;
  generatedAt: string;
  isRealtime: boolean;
  source: string;
  arrivals: EtaArrival[];
};

export type LrtHeadwayWindow = {
  startMinute: number;
  endMinute: number;
  minutes: number;
};

export type LrtScheduleProfile = {
  lineId: string;
  travelMinutes: number;
  reverseDirections: number[];
  weekdayHeadway: LrtHeadwayWindow[];
  weekendHeadway: LrtHeadwayWindow[];
};

export type LrtScheduleRequest = {
  lineId: string;
  stationId: string;
  direction: number;
  stationIndex: number;
  stationCount: number;
  now?: Date;
};

export type LrtArrival = {
  scheduledAt: string;
  minutes: number;
};

export type LrtArrivalSchedule = {
  lineId: string;
  stationId: string;
  direction: number;
  serviceType: "weekday" | "friday" | "weekend";
  isRealtime: false;
  source: string;
  serviceStart: string;
  serviceEnd: string;
  headwayMinutes: number;
  next: LrtArrival[];
};

export type WalkingPath = {
  from: Coordinate;
  to: Coordinate;
  coordinates: Coordinate[];
  distanceMeters: number;
  durationMinutes: number;
};

export type RouteGeometryMap = Record<string, Coordinate[][]>;
