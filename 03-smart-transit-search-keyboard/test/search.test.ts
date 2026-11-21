import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockDataProvider } from "@onedirect/data-fetcher-provider-layer";
import {
  SmartTransitSearchController,
  buildKeyAvailability,
  createSearchIndex,
  normalizeSearchQuery,
  searchCandidates,
  searchTransit,
  type SearchCandidate,
} from "../src/index.js";
import fixture from "../src/fixtures/search-cases.json" with { type: "json" };

const fixtureCandidates = fixture as SearchCandidate[];

describe("smart transit search", () => {
  it("normalizes full-width input", () => {
    assert.equal(normalizeSearchQuery("  ＡＰ １ "), "ap1");
  });

  it("ranks exact route IDs before description matches", () => {
    const results = searchCandidates(fixtureCandidates, "AP1");
    assert.equal(results[0]?.candidate.id, "AP1");
    assert.equal(results[0]?.matchType, "exact-id");
  });

  it("searches routes and stops through the provider", async () => {
    const provider = new MockDataProvider();
    const routes = await searchTransit(provider, "B1");
    const stops = await searchTransit(provider, "Harbor");

    assert.ok(routes.some((result) => result.candidate.id === "B12"));
    assert.ok(stops.some((result) => result.candidate.title === "Harbor North"));
  });
});

describe("smart keyboard model", () => {
  it("disables keys that cannot continue a route prefix", () => {
    const keys = buildKeyAvailability("B1", fixtureCandidates, ["1", "2", "9"]);
    assert.equal(keys.find((key) => key.value === "1")?.enabled, false);
    assert.equal(keys.find((key) => key.value === "2")?.enabled, true);
    assert.equal(keys.find((key) => key.value === "9")?.enabled, false);
  });

  it("builds suggestions, completions, append and backspace states", async () => {
    const provider = new MockDataProvider();
    const candidates = await createSearchIndex(provider);
    const controller = new SmartTransitSearchController(candidates);

    const afterB = controller.append("B");
    assert.ok(afterB.suggestions.length > 0);
    assert.ok(afterB.completions.some((value) => value.startsWith("b")));
    assert.equal(controller.backspace().query, "");
  });
});
