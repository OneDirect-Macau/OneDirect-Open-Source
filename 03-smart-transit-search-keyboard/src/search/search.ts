import type {
  DataProvider,
  LrtLine,
  TransitRoute,
  TransitStop,
} from "@onedirect/data-fetcher-provider-layer";
import { normalizeSearchQuery } from "./normalize.js";

export type SearchKind = "route" | "stop" | "lrt-line" | "lrt-station";

export type SearchCandidate = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  aliases: string[];
  routeIds: string[];
};

export type SearchMatchType =
  | "exact-id"
  | "prefix-id"
  | "contains-id"
  | "exact-name"
  | "contains-name";

export type SearchResult = {
  candidate: SearchCandidate;
  score: number;
  matchType: SearchMatchType;
};

export type SearchOptions = {
  limit?: number;
  kinds?: SearchKind[];
};

function normalizedCandidateValues(candidate: SearchCandidate): Array<{
  value: string;
  isId: boolean;
}> {
  return [
    { value: normalizeSearchQuery(candidate.id), isId: true },
    ...candidate.routeIds.map((routeId) => ({
      value: normalizeSearchQuery(routeId),
      isId: true,
    })),
    { value: normalizeSearchQuery(candidate.title), isId: false },
    { value: normalizeSearchQuery(candidate.subtitle), isId: false },
    ...candidate.aliases.map((alias) => ({
      value: normalizeSearchQuery(alias),
      isId: false,
    })),
  ].filter((item) => item.value);
}

export function scoreSearchCandidate(
  candidate: SearchCandidate,
  query: string,
): { score: number; matchType: SearchMatchType } | null {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return null;
  let best: { score: number; matchType: SearchMatchType } | null = null;

  for (const item of normalizedCandidateValues(candidate)) {
    let candidateScore: { score: number; matchType: SearchMatchType } | null = null;
    if (item.value === normalizedQuery) {
      candidateScore = {
        score: item.isId ? 1_000 : 900,
        matchType: item.isId ? "exact-id" : "exact-name",
      };
    } else if (item.isId && item.value.startsWith(normalizedQuery)) {
      candidateScore = { score: 820, matchType: "prefix-id" };
    } else if (item.isId && item.value.includes(normalizedQuery)) {
      candidateScore = { score: 560, matchType: "contains-id" };
    } else if (item.value.includes(normalizedQuery)) {
      candidateScore = { score: 420, matchType: "contains-name" };
    }

    if (candidateScore && (!best || candidateScore.score > best.score)) {
      best = candidateScore;
    }
  }

  return best;
}

export function searchCandidates(
  candidates: SearchCandidate[],
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const limit = options.limit ?? 12;
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }
  const kinds = options.kinds ? new Set(options.kinds) : null;

  return candidates
    .filter((candidate) => !kinds || kinds.has(candidate.kind))
    .flatMap((candidate) => {
      const score = scoreSearchCandidate(candidate, query);
      return score ? [{ candidate, ...score }] : [];
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.candidate.id.localeCompare(right.candidate.id, "zh-Hant", {
          numeric: true,
        }),
    )
    .slice(0, limit);
}

export function buildSearchCandidates({
  routes,
  stops,
  lrtLines,
  lrtStations,
}: {
  routes: TransitRoute[];
  stops: TransitStop[];
  lrtLines: LrtLine[];
  lrtStations: TransitStop[];
}): SearchCandidate[] {
  return [
    ...routes.map((route) => ({
      id: route.id,
      kind: "route" as const,
      title: `${route.label} · ${route.description}`,
      subtitle: route.directions.map((direction) => direction.name).join(" / "),
      aliases: [route.description, ...route.directions.map((direction) => direction.name)],
      routeIds: [route.id],
    })),
    ...stops.map((stop) => ({
      id: stop.code,
      kind: "stop" as const,
      title: stop.name,
      subtitle: stop.routeIds.length ? `Routes ${stop.routeIds.join(", ")}` : "Bus stop",
      aliases: [...stop.routeIds],
      routeIds: stop.routeIds,
    })),
    ...lrtLines.map((line) => ({
      id: line.id,
      kind: "lrt-line" as const,
      title: line.label,
      subtitle: `LRT line · ${line.stationIds.length} stations`,
      aliases: line.stationIds,
      routeIds: [line.id],
    })),
    ...lrtStations.map((station) => ({
      id: station.code,
      kind: "lrt-station" as const,
      title: station.name,
      subtitle: `LRT station · ${station.routeIds.join(", ")}`,
      aliases: [...station.routeIds],
      routeIds: station.routeIds,
    })),
  ];
}

export async function createSearchIndex(
  provider: DataProvider,
): Promise<SearchCandidate[]> {
  const [routes, stops, lrtLines, lrtStations] = await Promise.all([
    provider.getRoutes(),
    provider.getStops(),
    provider.getLrtLines(),
    provider.getLrtStations(),
  ]);
  return buildSearchCandidates({ routes, stops, lrtLines, lrtStations });
}

export async function searchTransit(
  provider: DataProvider,
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  return searchCandidates(await createSearchIndex(provider), query, options);
}
