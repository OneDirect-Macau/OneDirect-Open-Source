import type { DataProvider } from "./data-provider.js";
import { TtlCache } from "../cache/ttl-cache.js";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class CachedDataProvider implements DataProvider {
  private readonly cache: TtlCache<string, unknown>;

  constructor(
    private readonly provider: DataProvider,
    ttlMs = 30_000,
  ) {
    this.cache = new TtlCache(ttlMs);
  }

  get id(): string {
    return `${this.provider.id}+cache`;
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    if (existing !== undefined) return clone(existing as T);
    const value = await load();
    this.cache.set(key, value);
    return clone(value);
  }

  getRoutes() {
    return this.cached("routes", () => this.provider.getRoutes());
  }

  getRoute(routeId: string) {
    return this.cached(`route:${routeId}`, () => this.provider.getRoute(routeId));
  }

  getStops() {
    return this.cached("stops", () => this.provider.getStops());
  }

  getLrtLines() {
    return this.cached("lrt-lines", () => this.provider.getLrtLines());
  }

  getLrtStations() {
    return this.cached("lrt-stations", () => this.provider.getLrtStations());
  }

  getRouteGeometries() {
    return this.cached("route-geometries", () => this.provider.getRouteGeometries());
  }

  getLiveRoute(routeId: string, directionIndex: number | null = null) {
    return this.cached(`live:${routeId}:${directionIndex ?? "auto"}`, () => this.provider.getLiveRoute(routeId, directionIndex));
  }

  getLrtScheduleProfile(lineId: string) {
    return this.cached(`schedule:${lineId}`, () => this.provider.getLrtScheduleProfile(lineId));
  }

  getWalkingPath(from: Parameters<DataProvider["getWalkingPath"]>[0], to: Parameters<DataProvider["getWalkingPath"]>[1]) {
    return this.cached(`walk:${from.lat},${from.lng}:${to.lat},${to.lng}`, () => this.provider.getWalkingPath(from, to));
  }

  async reload(): Promise<void> {
    this.cache.clear();
    await this.provider.reload();
  }
}
