import type { SearchCandidate, SearchResult } from "../search/search.js";
import { normalizeSearchQuery } from "../search/normalize.js";
import { searchCandidates } from "../search/search.js";

export type KeyboardKey = {
  value: string;
  label: string;
  enabled: boolean;
};

export type KeyboardState = {
  query: string;
  keys: KeyboardKey[];
  completions: string[];
  suggestions: SearchResult[];
  selected: SearchResult | null;
};

export const DEFAULT_KEYBOARD_VALUES = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z",
];

export function candidatePrefixes(
  candidates: SearchCandidate[],
): string[] {
  return [...new Set(
    candidates.flatMap((candidate) => [
      normalizeSearchQuery(candidate.id),
      ...candidate.routeIds.map(normalizeSearchQuery),
    ]),
  )];
}

export function buildKeyAvailability(
  query: string,
  candidates: SearchCandidate[],
  keyValues: string[] = DEFAULT_KEYBOARD_VALUES,
): KeyboardKey[] {
  const current = normalizeSearchQuery(query);
  const prefixes = candidatePrefixes(candidates);
  return keyValues.map((value) => {
    const next = current + normalizeSearchQuery(value);
    return {
      value,
      label: value,
      enabled: prefixes.some((prefix) => prefix.startsWith(next)),
    };
  });
}

export function completionSuggestions(
  query: string,
  candidates: SearchCandidate[],
  limit = 6,
): string[] {
  const current = normalizeSearchQuery(query);
  if (!current) return [];
  return candidatePrefixes(candidates)
    .filter((prefix) => prefix.startsWith(current) && prefix.length > current.length)
    .sort((left, right) => left.localeCompare(right, "zh-Hant", { numeric: true }))
    .slice(0, limit);
}

export class SmartTransitSearchController {
  private query = "";
  private selected: SearchResult | null = null;

  constructor(
    private readonly candidates: SearchCandidate[],
    private readonly onSelect?: (result: SearchResult) => void,
  ) {}

  setQuery(nextQuery: string): KeyboardState {
    this.query = nextQuery;
    this.selected = null;
    return this.getState();
  }

  append(value: string): KeyboardState {
    return this.setQuery(this.query + value);
  }

  backspace(): KeyboardState {
    return this.setQuery(this.query.slice(0, -1));
  }

  useCompletion(value: string): KeyboardState {
    return this.setQuery(value);
  }

  select(candidateId: string): SearchResult | null {
    const result =
      searchCandidates(this.candidates, this.query).find(
        (item) => item.candidate.id === candidateId,
      ) ??
      searchCandidates(this.candidates, candidateId, { limit: 1 })[0] ??
      null;
    this.selected = result;
    this.query = result?.candidate.id ?? candidateId;
    if (result) this.onSelect?.(result);
    return result;
  }

  getState(): KeyboardState {
    return {
      query: this.query,
      keys: buildKeyAvailability(this.query, this.candidates),
      completions: completionSuggestions(this.query, this.candidates),
      suggestions: searchCandidates(this.candidates, this.query),
      selected: this.selected,
    };
  }
}
