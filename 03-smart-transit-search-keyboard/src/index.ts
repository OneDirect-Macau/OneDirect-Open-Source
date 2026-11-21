export { normalizeSearchQuery } from "./search/normalize.js";
export {
  buildSearchCandidates,
  createSearchIndex,
  scoreSearchCandidate,
  searchCandidates,
  searchTransit,
  type SearchCandidate,
  type SearchKind,
  type SearchMatchType,
  type SearchOptions,
  type SearchResult,
} from "./search/search.js";
export {
  DEFAULT_KEYBOARD_VALUES,
  SmartTransitSearchController,
  buildKeyAvailability,
  candidatePrefixes,
  completionSuggestions,
  type KeyboardKey,
  type KeyboardState,
} from "./keyboard/keyboard-model.js";
