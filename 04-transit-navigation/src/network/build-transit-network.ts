import type {
  Coordinate,
  DataProvider,
  LrtLine,
  RouteGeometryMap,
  TransitRoute,
  TransitStop,
} from "@onedirect/data-fetcher-provider-layer";

export type NetworkStop = {
  id: string;
  code: string;
  name: string;
  coordinate: Coordinate;
  order: number;
};

export type TransitService = {
  id: string;
  mode: "bus" | "lrt";
  routeId: string | null;
  lineId: string | null;
  label: string;
  color: string;
  directionIndex: number;
  stops: NetworkStop[];
  geometry: Coordinate[];
};

export type TransitNetwork = {
  services: TransitService[];
};

function busServices(
  routes: TransitRoute[],
  geometries: RouteGeometryMap,
): TransitService[] {
  return routes.flatMap((route) =>
    route.directions.flatMap((direction) => {
      const stops = direction.stops.map((stop, order) => ({
        id: stop.id,
        code: stop.code,
        name: stop.name,
        coordinate: stop.coordinate,
        order,
      }));
      if (stops.length < 2) return [];
      return [{
        id: `bus:${route.id}:${direction.index}`,
        mode: "bus" as const,
        routeId: route.id,
        lineId: null,
        label: `${route.label} · ${direction.name}`,
        color: route.color,
        directionIndex: direction.index,
        stops,
        geometry:
          geometries[route.id]?.[direction.index] ??
          stops.map((stop) => stop.coordinate),
      }];
    }),
  );
}

function lrtServices(
  lines: LrtLine[],
  stations: TransitStop[],
): TransitService[] {
  const stationById = new Map(stations.map((station) => [station.id, station]));
  return lines.flatMap((line) => {
    const forward = line.stationIds.flatMap((stationId) => {
      const station = stationById.get(stationId);
      if (!station) return [];
      return [{
        id: station.id,
        code: station.code,
        name: station.name,
        coordinate: station.coordinate,
      }];
    });
    if (forward.length < 2) return [];

    return [forward, [...forward].reverse()].map((ordered, directionIndex) => ({
      id: `lrt:${line.id}:${directionIndex}`,
      mode: "lrt" as const,
      routeId: null,
      lineId: line.id,
      label: `${line.label} · ${directionIndex === 0 ? "Forward" : "Reverse"}`,
      color: line.color,
      directionIndex,
      stops: ordered.map((stop, order) => ({ ...stop, order })),
      geometry:
        directionIndex === 0
          ? line.geometry
          : [...line.geometry].reverse(),
    }));
  });
}

export function buildTransitNetwork({
  routes,
  lrtLines,
  lrtStations,
  routeGeometries,
}: {
  routes: TransitRoute[];
  lrtLines: LrtLine[];
  lrtStations: TransitStop[];
  routeGeometries: RouteGeometryMap;
}): TransitNetwork {
  return {
    services: [
      ...busServices(routes, routeGeometries),
      ...lrtServices(lrtLines, lrtStations),
    ],
  };
}

export async function loadTransitNetwork(
  provider: DataProvider,
): Promise<TransitNetwork> {
  const [routes, lrtLines, lrtStations, routeGeometries] = await Promise.all([
    provider.getRoutes(),
    provider.getLrtLines(),
    provider.getLrtStations(),
    provider.getRouteGeometries(),
  ]);
  return buildTransitNetwork({
    routes,
    lrtLines,
    lrtStations,
    routeGeometries,
  });
}
