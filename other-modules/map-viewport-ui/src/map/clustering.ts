import type { Coordinate } from "@onedirect/data-fetcher-provider-layer";

export type MapBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type ClusterInput = {
  id: string;
  coordinate: Coordinate;
  kind: "bus" | "lrt";
};

export type ProjectedPoint<T extends ClusterInput = ClusterInput> = {
  item: T;
  x: number;
  y: number;
};

export type PointCluster<T extends ClusterInput = ClusterInput> = {
  id: string;
  x: number;
  y: number;
  items: T[];
};

export type ClusterOptions = {
  width?: number;
  height?: number;
  zoom?: number;
  baseThresholdPx?: number;
  paddingRatio?: number;
};

export function calculateBounds(
  coordinates: Coordinate[],
  paddingRatio = 0.12,
): MapBounds {
  const valid = coordinates.filter(
    (coordinate) =>
      Number.isFinite(coordinate.lat) &&
      Number.isFinite(coordinate.lng),
  );
  if (valid.length === 0) {
    return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const coordinate of valid) {
    minLat = Math.min(minLat, coordinate.lat);
    maxLat = Math.max(maxLat, coordinate.lat);
    minLng = Math.min(minLng, coordinate.lng);
    maxLng = Math.max(maxLng, coordinate.lng);
  }

  const latSpan = Math.max(0.002, maxLat - minLat);
  const lngSpan = Math.max(0.002, maxLng - minLng);
  const latPadding = latSpan * Math.max(0, paddingRatio);
  const lngPadding = lngSpan * Math.max(0, paddingRatio);

  return {
    minLat: minLat - latPadding,
    maxLat: maxLat + latPadding,
    minLng: minLng - lngPadding,
    maxLng: maxLng + lngPadding,
  };
}

export function projectCoordinate(
  coordinate: Coordinate,
  bounds: MapBounds,
  width = 1_000,
  height = 620,
): { x: number; y: number } {
  const lngSpan = Math.max(Number.EPSILON, bounds.maxLng - bounds.minLng);
  const latSpan = Math.max(Number.EPSILON, bounds.maxLat - bounds.minLat);
  return {
    x: ((coordinate.lng - bounds.minLng) / lngSpan) * width,
    y: height - ((coordinate.lat - bounds.minLat) / latSpan) * height,
  };
}

export function clusterMapPoints<T extends ClusterInput>(
  points: T[],
  bounds: MapBounds,
  options: ClusterOptions = {},
): PointCluster<T>[] {
  const width = options.width ?? 1_000;
  const height = options.height ?? 620;
  const zoom = options.zoom ?? 1;
  const baseThreshold = options.baseThresholdPx ?? 76;
  const threshold = baseThreshold / Math.max(1, zoom * 0.82);
  const projected = points
    .map((item) => ({
      item,
      ...projectCoordinate(item.coordinate, bounds, width, height),
    }))
    .sort((left, right) => left.item.id.localeCompare(right.item.id));
  const clusters: Array<{
    id: string;
    x: number;
    y: number;
    sumX: number;
    sumY: number;
    items: T[];
  }> = [];

  for (const point of projected) {
    const target = clusters.find(
      (cluster) => Math.hypot(cluster.x - point.x, cluster.y - point.y) <= threshold,
    );
    if (!target) {
      clusters.push({
        id: `cluster-${point.item.id}`,
        x: point.x,
        y: point.y,
        sumX: point.x,
        sumY: point.y,
        items: [point.item],
      });
      continue;
    }

    target.items.push(point.item);
    target.sumX += point.x;
    target.sumY += point.y;
    target.x = target.sumX / target.items.length;
    target.y = target.sumY / target.items.length;
    target.id = `cluster-${target.items[0]!.id}`;
  }

  return clusters.map(({ id, x, y, items }) => ({ id, x, y, items }));
}
