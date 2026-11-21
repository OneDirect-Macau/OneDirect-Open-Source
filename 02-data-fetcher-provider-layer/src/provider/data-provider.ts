import type {
  LiveRouteSnapshot,
  LrtLine,
  LrtScheduleProfile,
  RouteGeometryMap,
  TransitRoute,
  TransitStop,
  WalkingPath,
  Coordinate,
} from "../contracts/index.js";

export interface DataProvider {
  readonly id: string;

  getRoutes(): Promise<TransitRoute[]>;
  getRoute(routeId: string): Promise<TransitRoute | null>;
  getStops(): Promise<TransitStop[]>;
  getLrtLines(): Promise<LrtLine[]>;
  getLrtStations(): Promise<TransitStop[]>;
  getRouteGeometries(): Promise<RouteGeometryMap>;
  getLiveRoute(
    routeId: string,
    directionIndex?: number | null,
  ): Promise<LiveRouteSnapshot | null>;
  getLrtScheduleProfile(
    lineId: string,
  ): Promise<LrtScheduleProfile | null>;
  getWalkingPath(
    from: Coordinate,
    to: Coordinate,
  ): Promise<WalkingPath | null>;
  reload(): Promise<void>;
}
