import type { DataProvider } from "./data-provider.js";

export class FallbackDataProvider implements DataProvider {
  readonly id: string;
  private active = new Set<string>();

  constructor(
    private readonly primary: DataProvider,
    private readonly fallback: DataProvider,
  ) {
    this.id = `${primary.id}+${fallback.id}`;
    this.active.add(primary.id);
  }

  private async run<T>(
    method: string,
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    try {
      const value = await primary();
      this.active.add(`${this.primary.id}:${method}`);
      return value;
    } catch {
      this.active.add(`${this.fallback.id}:${method}`);
      return fallback();
    }
  }

  activeSources(): string[] {
    return [...this.active].sort();
  }

  getRoutes() {
    return this.run("routes", () => this.primary.getRoutes(), () => this.fallback.getRoutes());
  }

  getRoute(routeId: string) {
    return this.run("route", () => this.primary.getRoute(routeId), () => this.fallback.getRoute(routeId));
  }

  getStops() {
    return this.run("stops", () => this.primary.getStops(), () => this.fallback.getStops());
  }

  getLrtLines() {
    return this.run("lrt-lines", () => this.primary.getLrtLines(), () => this.fallback.getLrtLines());
  }

  getLrtStations() {
    return this.run("lrt-stations", () => this.primary.getLrtStations(), () => this.fallback.getLrtStations());
  }

  getRouteGeometries() {
    return this.run("route-geometries", () => this.primary.getRouteGeometries(), () => this.fallback.getRouteGeometries());
  }

  getLiveRoute(routeId: string, directionIndex: number | null = null) {
    return this.run("live-route", () => this.primary.getLiveRoute(routeId, directionIndex), () => this.fallback.getLiveRoute(routeId, directionIndex));
  }

  getLrtScheduleProfile(lineId: string) {
    return this.run("lrt-schedule", () => this.primary.getLrtScheduleProfile(lineId), () => this.fallback.getLrtScheduleProfile(lineId));
  }

  getWalkingPath(from: Parameters<DataProvider["getWalkingPath"]>[0], to: Parameters<DataProvider["getWalkingPath"]>[1]) {
    return this.run("walking-path", () => this.primary.getWalkingPath(from, to), () => this.fallback.getWalkingPath(from, to));
  }

  async reload(): Promise<void> {
    await Promise.allSettled([this.primary.reload(), this.fallback.reload()]);
  }
}
