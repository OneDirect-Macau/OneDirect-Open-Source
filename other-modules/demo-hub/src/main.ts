import {
  CachedDataProvider,
  FallbackDataProvider,
  MockDataProvider,
  TtlCache,
} from "@onedirect/data-fetcher-provider-layer";
import {
  deriveEtaState,
  estimateSnapshotArrivals,
  matchLiveRoute,
  parseEtaPayload,
} from "@onedirect/bus-eta-engine";
import {
  SmartTransitSearchController,
  createSearchIndex,
} from "@onedirect/smart-transit-search-keyboard";
import {
  calculateJourneyOptions,
  findBestJourney,
  prepareJourneyGeometry,
} from "@onedirect/transit-navigation";
import "./styles.css";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Missing app root");

const mock = new MockDataProvider();
const fallback = new MockDataProvider(5);
const provider = new CachedDataProvider(
  new FallbackDataProvider(fallback, mock),
  30_000,
);

function formatEtaResult() {
  const live = new MockDataProvider();
  void live.getRoute("B12").then(async (route) => {
    const snapshot = await live.getLiveRoute("B12", 0);
    if (!route || !snapshot) return;
    const match = matchLiveRoute(route, snapshot);
    if (!match) return;
    const direction = route.directions[match.directionIndex]!;
    const estimates = estimateSnapshotArrivals(direction, snapshot);
    const eta = parseEtaPayload({
      routeId: "B12",
      stopId: estimates[3]?.stopId,
      direction: match.directionIndex,
      generatedAt: snapshot.observedAt,
      arrivals: estimates[3]?.arrivals ?? [],
      source: "mock-demo",
    });
    const state = deriveEtaState(eta, {
      now: new Date(Date.parse(snapshot.observedAt) + 30_000),
    });
    const target = document.querySelector("#eta-result");
    if (target) {
      target.innerHTML = `
        <strong>${direction.name}</strong>
        <span>${estimates[3]?.name ?? "Unknown stop"}</span>
        <span>${state.state} · ${state.minutes ?? "—"} min</span>
      `;
    }
  });
}

function setupSearch() {
  const input = document.querySelector<HTMLInputElement>("#search-input");
  const suggestions = document.querySelector<HTMLElement>("#search-results");
  const keypad = document.querySelector<HTMLElement>("#search-keypad");
  if (!input || !suggestions || !keypad) return;

  void createSearchIndex(provider).then((candidates) => {
    const controller = new SmartTransitSearchController(candidates);

    const render = () => {
      const state = controller.getState();
      input.value = state.query;
      suggestions.innerHTML = state.suggestions.length
        ? state.suggestions
            .slice(0, 6)
            .map(
              (item) =>
                `<button type="button" data-select="${item.candidate.id}">
                  <strong>${item.candidate.title}</strong>
                  <span>${item.candidate.kind} · ${item.matchType} · ${item.score}</span>
                </button>`,
            )
            .join("")
        : `<p class="muted">輸入路線或站點名稱開始搜尋。</p>`;
      keypad.innerHTML = state.keys
        .filter((key) => /[0-9A-Z]/u.test(key.value))
        .map(
          (key) =>
            `<button type="button" data-key="${key.value}" ${key.enabled ? "" : "disabled"}>${key.label}</button>`,
        )
        .join("");
    };

    input.addEventListener("input", () => {
      controller.setQuery(input.value);
      render();
    });
    keypad.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-key]");
      if (!button || button.disabled) return;
      controller.append(button.dataset.key!);
      render();
    });
    suggestions.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("[data-select]");
      if (!button) return;
      const result = controller.select(button.dataset.select!);
      if (result) {
        suggestions.innerHTML = `
          <div class="selected-result">
            <strong>${result.candidate.title}</strong>
            <span>${result.candidate.subtitle}</span>
          </div>`;
      }
    });
    render();
  });
}

function setupNavigation() {
  const button = document.querySelector<HTMLButtonElement>("#run-navigation");
  const output = document.querySelector<HTMLElement>("#navigation-result");
  if (!button || !output) return;

  button.addEventListener("click", () => {
    void calculateJourneyOptions(
      provider,
      { lat: 22.1513, lng: 113.5489 },
      { lat: 22.1569, lng: 113.5663 },
      { limit: 4 },
    ).then(async (journeys) => {
      const best = findBestJourney(journeys);
      if (!best) {
        output.innerHTML = `<p class="muted">沒有可用路線。</p>`;
        return;
      }
      const prepared = await prepareJourneyGeometry(provider, best);
      output.innerHTML = prepared.legs
        .map(
          (leg) =>
            `<div class="journey-leg">
              <span class="leg-type">${leg.type}</span>
              <strong>${leg.label}</strong>
              <span>${leg.minutes} min · ${leg.from.name} → ${leg.to.name}</span>
            </div>`,
        )
        .join("");
    });
  });
}

function setupSystemFlow() {
  const stage = document.querySelector<HTMLElement>("#flow-stage");
  const toggle = document.querySelector<HTMLButtonElement>("#flow-toggle");
  const previous = document.querySelector<HTMLButtonElement>("#flow-prev");
  const next = document.querySelector<HTMLButtonElement>("#flow-next");
  const title = document.querySelector<HTMLElement>("#flow-title");
  const detail = document.querySelector<HTMLElement>("#flow-detail");
  const counter = document.querySelector<HTMLElement>("#flow-counter");
  const progress = document.querySelector<HTMLElement>("#flow-progress");
  const progressFill = document.querySelector<HTMLElement>("#flow-progress-fill");
  if (
    !stage ||
    !toggle ||
    !previous ||
    !next ||
    !title ||
    !detail ||
    !counter ||
    !progress ||
    !progressFill
  ) {
    return;
  }

  const steps = [
    {
      title: "The host sends one typed request",
      detail:
        "A UI, API, or CLI asks for routes, stops, and geometry without coupling itself to a data vendor.",
      nodes: ["input"],
      link: "request",
    },
    {
      title: "02 applies the data boundary",
      detail:
        "The provider layer owns contracts, cache, retry, and fallback while the host controls the real data source.",
      nodes: ["provider"],
      link: "fanout",
    },
    {
      title: "Three pure engines transform the data",
      detail:
        "ETA, search, and navigation stay independent. Each engine receives typed data and returns deterministic output.",
      nodes: ["eta", "search", "navigation"],
      link: "fanout",
    },
    {
      title: "Typed results return to the host",
      detail:
        "The demo renders results without importing vendor-specific network or authentication logic.",
      nodes: ["output"],
      link: "output",
    },
  ] as const;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let stepIndex = 0;
  let playing = !reducedMotion;
  let timer: number | null = null;

  const stopTimer = () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  };

  const renderStep = () => {
    const step = steps[stepIndex]!;
    stage.dataset.step = String(stepIndex);
    stage.dataset.playing = String(playing);
    title.textContent = step.title;
    detail.textContent = step.detail;
    counter.textContent = `${String(stepIndex + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
    toggle.textContent = playing ? "Pause" : "Play";
    toggle.setAttribute("aria-pressed", String(playing));

    stage.querySelectorAll<HTMLElement>("[data-flow-node]").forEach((node) => {
      node.classList.toggle(
        "is-active",
        step.nodes.some((nodeId) => nodeId === node.dataset.flowNode),
      );
    });
    stage.querySelectorAll<HTMLElement>("[data-flow-link]").forEach((link) => {
      link.classList.toggle("is-active", link.dataset.flowLink === step.link);
    });

    const percentage = ((stepIndex + 1) / steps.length) * 100;
    progressFill.style.width = `${percentage}%`;
    progress.setAttribute("aria-valuenow", String(stepIndex + 1));
  };

  const startTimer = () => {
    stopTimer();
    if (!playing) return;
    timer = window.setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length;
      renderStep();
    }, 2_800);
  };

  const move = (direction: number) => {
    stepIndex =
      (stepIndex + direction + steps.length) % steps.length;
    renderStep();
    startTimer();
  };

  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  toggle.addEventListener("click", () => {
    playing = !playing;
    renderStep();
    startTimer();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopTimer();
    } else {
      startTimer();
    }
  });

  renderStep();
  startTimer();
}

async function setupProviderPanel() {
  const [routes, stops, geometries] = await Promise.all([
    provider.getRoutes(),
    provider.getStops(),
    provider.getRouteGeometries(),
  ]);
  const output = document.querySelector("#provider-result");
  if (!output) return;
  output.innerHTML = `
    <span>Provider: <strong>${provider.id}</strong></span>
    <span>Routes: <strong>${routes.length}</strong></span>
    <span>Stops: <strong>${stops.length}</strong></span>
    <span>Route geometries: <strong>${Object.keys(geometries).length}</strong></span>
    <span>TTL cache: <strong>${new TtlCache(30_000).ttlMs} ms</strong></span>
  `;
}

app.innerHTML = `
  <header class="app-header">
    <div>
      <p class="eyebrow">OneDirect Open Source</p>
      <h1>Core Function Demo</h1>
      <p>Mock data only. No external endpoint or token is used.</p>
    </div>
    <span class="status-pill">Offline fixtures</span>
  </header>

  <nav class="tabs" aria-label="Demo sections">
    <a href="#how-it-works">How it works</a>
    <a href="#provider">Provider</a>
    <a href="#eta">Bus ETA</a>
    <a href="#search">Search Keyboard</a>
    <a href="#navigation">Navigation</a>
  </nav>

  <section id="how-it-works" class="panel flow-panel">
    <div class="flow-heading">
      <div>
        <p class="eyebrow">System walkthrough</p>
        <h2>How OneDirect works</h2>
        <p class="flow-summary">One provider boundary feeds three independent transit engines.</p>
      </div>
      <div class="flow-controls" aria-label="Animation controls">
        <button type="button" id="flow-prev">Previous</button>
        <button type="button" id="flow-toggle" aria-pressed="true">Pause</button>
        <button type="button" id="flow-next">Next</button>
      </div>
    </div>

    <div id="flow-stage" class="flow-stage" data-step="0" data-playing="true">
      <div class="flow-board">
        <div class="flow-node flow-input" data-flow-node="input">
          <span class="flow-node-kicker">Host</span>
          <strong>UI / API / CLI</strong>
          <span>One typed transit request</span>
        </div>

        <div class="flow-link" data-flow-link="request" aria-hidden="true">
          <span class="flow-packet"></span>
          <span class="flow-link-label">request</span>
        </div>

        <div class="flow-node flow-provider" data-flow-node="provider">
          <span class="flow-node-kicker">02</span>
          <strong>Data Provider</strong>
          <span>contracts · cache · retry · fallback</span>
        </div>

        <div class="flow-link" data-flow-link="fanout" aria-hidden="true">
          <span class="flow-packet"></span>
          <span class="flow-link-label">normalized</span>
        </div>

        <div class="flow-engine-stack">
          <div class="flow-node flow-engine" data-flow-node="eta">
            <span class="flow-node-kicker">01</span>
            <strong>Bus ETA</strong>
            <span>direction match + arrival estimate</span>
          </div>
          <div class="flow-node flow-engine" data-flow-node="search">
            <span class="flow-node-kicker">03</span>
            <strong>Smart Search</strong>
            <span>ranking + keyboard state</span>
          </div>
          <div class="flow-node flow-engine" data-flow-node="navigation">
            <span class="flow-node-kicker">04</span>
            <strong>Navigation</strong>
            <span>direct + one-transfer journeys</span>
          </div>
        </div>

        <div class="flow-link" data-flow-link="output" aria-hidden="true">
          <span class="flow-packet"></span>
          <span class="flow-link-label">typed</span>
        </div>

        <div class="flow-node flow-output" data-flow-node="output">
          <span class="flow-node-kicker">Output</span>
          <strong>Typed results</strong>
          <span>ETA · suggestions · journey legs</span>
        </div>
      </div>

      <div class="flow-caption" aria-live="polite">
        <span id="flow-counter" class="flow-counter">01 / 04</span>
        <div>
          <strong id="flow-title">The host sends one typed request</strong>
          <p id="flow-detail">A UI, API, or CLI asks for routes, stops, and geometry without coupling itself to a data vendor.</p>
        </div>
      </div>
      <div id="flow-progress" class="flow-progress" role="progressbar" aria-label="Walkthrough progress" aria-valuemin="1" aria-valuemax="4" aria-valuenow="1">
        <span id="flow-progress-fill"></span>
      </div>
    </div>
  </section>

  <section id="provider" class="panel">
    <div class="panel-heading">
      <div><p class="eyebrow">02</p><h2>Data Provider</h2></div>
      <button type="button" id="refresh-provider">Refresh</button>
    </div>
    <div id="provider-result" class="result-grid"></div>
  </section>

  <section id="eta" class="panel">
    <div class="panel-heading">
      <div><p class="eyebrow">01</p><h2>Bus ETA</h2></div>
      <button type="button" id="run-eta">Run ETA</button>
    </div>
    <div id="eta-result" class="result-stack"><p class="muted">固定 mock live snapshot，計算下游站點 ETA。</p></div>
  </section>

  <section id="search" class="panel">
    <div class="panel-heading">
      <div><p class="eyebrow">03</p><h2>Smart Transit Search</h2></div>
    </div>
    <label class="field-label" for="search-input">Route or stop</label>
    <input id="search-input" autocomplete="off" placeholder="例如 B1 或 Harbor" />
    <div id="search-keypad" class="keypad" aria-label="Virtual keyboard"></div>
    <div id="search-results" class="search-results"></div>
  </section>

  <section id="navigation" class="panel">
    <div class="panel-heading">
      <div><p class="eyebrow">04</p><h2>Transit Navigation</h2></div>
      <button type="button" id="run-navigation">Find route</button>
    </div>
    <p class="muted">起點 Harbor North，終點 Tech Park。</p>
    <div id="navigation-result" class="result-stack"></div>
  </section>
`;

document.querySelector("#run-eta")?.addEventListener("click", formatEtaResult);
document.querySelector("#refresh-provider")?.addEventListener("click", () => {
  void provider.reload().then(setupProviderPanel);
});
setupSystemFlow();
void setupProviderPanel();
setupSearch();
setupNavigation();
