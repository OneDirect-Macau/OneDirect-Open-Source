import type { DataProvider } from "./data-provider.js";
import type {
  Coordinate,
  LiveRouteSnapshot,
  LrtLine,
  LrtScheduleProfile,
  RouteGeometryMap,
  TransitRoute,
  TransitStop,
  WalkingPath,
} from "../contracts/index.js";
import routesJson from "../data/routes.json" with { type: "json" };
import stopsJson from "../data/stops.json" with { type: "json" };
import lrtLinesJson from "../data/lrt-lines.json" with { type: "json" };
import lrtStationsJson from "../data/lrt-stations.json" with { type: "json" };
import liveRouteJson from "../data/live-route.json" with { type: "json" };
import lrtProfilesJson from "../data/lrt-schedule-profiles.json" with { type: "json" };
import walkingPathJson from "../data/walking-path.json" with { type: "json" };
import routeGeometriesJson from "../data/route-geometries.json" with { type: "json" };

const routes = routesJson as unknown as TransitRoute[];
const stops = stopsJson as unknown as TransitStop[];
const lrtLines = lrtLinesJson as unknown as LrtLine[];
const lrtStations = lrtStationsJson as unknown as TransitStop[];
const liveRoute = liveRouteJson as unknown as LiveRouteSnapshot;
const lrtProfiles = lrtProfilesJson as unknown as Record<
  string,
  LrtScheduleProfile
>;
const walkingPath = walkingPathJson as unknown as WalkingPath;
const routeGeometries =
  routeGeometriesJson as unknown as RouteGeometryMap;

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class MockDataProvider implements DataProvider {
  readonly id: string = "mock-static-v1";

  constructor(private readonly latencyMs = 0) {}

  private async settle(): Promise<void> {
    if (this.latencyMs <= 0) return;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, this.latencyMs);
    });
  }

  async getRoutes(): Promise<TransitRoute[]> {
    await this.settle();
    return clone(routes);
  }

  async getRoute(routeId: string): Promise<TransitRoute | null> {
    await this.settle();
    const route = routes.find((item) => item.id === routeId);
    return route ? clone(route) : null;
  }

  async getStops(): Promise<TransitStop[]> {
    await this.settle();
    return clone(stops);
  }

  async getLrtLines(): Promise<LrtLine[]> {
    await this.settle();
    return clone(lrtLines);
  }

  async getLrtStations(): Promise<TransitStop[]> {
    await this.settle();
    return clone(lrtStations);
  }

  async getRouteGeometries(): Promise<RouteGeometryMap> {
    await this.settle();
    return clone(routeGeometries);
  }

  async getLiveRoute(
    routeId: string,
    directionIndex: number | null = null,
  ): Promise<LiveRouteSnapshot | null> {
    await this.settle();
    if (
      liveRoute.routeId !== routeId ||
      (directionIndex !== null &&
        liveRoute.directionIndex !== directionIndex)
    ) {
      return null;
    }
    return clone(liveRoute);
  }

  async getLrtScheduleProfile(
    lineId: string,
  ): Promise<LrtScheduleProfile | null> {
    await this.settle();
    const profile = lrtProfiles[lineId];
    return profile ? clone(profile) : null;
  }

  async getWalkingPath(
    from: Coordinate,
    to: Coordinate,
  ): Promise<WalkingPath | null> {
    await this.settle();
    return {
      ...clone(walkingPath),
      from: clone(from),
      to: clone(to),
    };
  }

  async reload(): Promise<void> {
    await this.settle();
  }
}
