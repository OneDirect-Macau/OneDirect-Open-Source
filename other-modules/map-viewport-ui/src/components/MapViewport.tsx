import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BusFront,
  Layers3,
  LocateFixed,
  MapPin,
  Minus,
  Moon,
  Plus,
  Sun,
  TramFront,
  X,
} from "lucide-react";
import type {
  Coordinate,
  DataProvider,
  LrtLine,
  TransitStop,
} from "@onedirect/data-fetcher-provider-layer";
import {
  calculateBounds,
  clusterMapPoints,
  projectCoordinate,
  type ClusterInput,
} from "../map/clustering.js";
import {
  getMapThemeTokens,
  type MapTheme,
} from "../map/theme.js";

type MapPoint = ClusterInput & {
  name: string;
  routeIds: string[];
  code: string;
};

export type MapViewportProps = {
  provider: DataProvider;
  initialTheme?: MapTheme;
  onStopSelect?: (stop: TransitStop) => void;
  className?: string;
};

const VIEW_WIDTH = 1_000;
const VIEW_HEIGHT = 620;

function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.lat.toFixed(5)}:${coordinate.lng.toFixed(5)}`;
}

function uniqueCoordinates(
  stops: MapPoint[],
  lines: LrtLine[],
): Coordinate[] {
  const values = new Map<string, Coordinate>();
  for (const stop of stops) {
    values.set(coordinateKey(stop.coordinate), stop.coordinate);
  }
  for (const line of lines) {
    for (const coordinate of line.geometry) {
      values.set(coordinateKey(coordinate), coordinate);
    }
  }
  return [...values.values()];
}

function linePath(
  line: LrtLine,
  bounds: ReturnType<typeof calculateBounds>,
): string {
  return line.geometry
    .map((coordinate, index) => {
      const projected = projectCoordinate(
        coordinate,
        bounds,
        VIEW_WIDTH,
        VIEW_HEIGHT,
      );
      return `${index === 0 ? "M" : "L"} ${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`;
    })
    .join(" ");
}

export function MapViewport({
  provider,
  initialTheme = "light",
  onStopSelect,
  className = "",
}: MapViewportProps) {
  const [theme, setTheme] = useState<MapTheme>(initialTheme);
  const [zoom, setZoom] = useState(2);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [lines, setLines] = useState<LrtLine[]>([]);
  const [selected, setSelected] = useState<MapPoint | null>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      provider.getStops(),
      provider.getLrtStations(),
      provider.getLrtLines(),
    ])
      .then(([busStops, lrtStations, lrtLines]) => {
        if (cancelled) return;
        setPoints([
          ...busStops.map((stop) => ({
            id: stop.id,
            name: stop.name,
            code: stop.code,
            routeIds: stop.routeIds,
            coordinate: stop.coordinate,
            kind: "bus" as const,
          })),
          ...lrtStations.map((stop) => ({
            id: stop.id,
            name: stop.name,
            code: stop.code,
            routeIds: stop.routeIds,
            coordinate: stop.coordinate,
            kind: "lrt" as const,
          })),
        ]);
        setLines(lrtLines);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Map data could not be loaded",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provider]);

  useEffect(() => {
    const element = sheetRef.current;
    if (!selected || !element) {
      setSheetHeight(0);
      return undefined;
    }

    const updateHeight = () => setSheetHeight(element.getBoundingClientRect().height);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [selected]);

  const bounds = useMemo(
    () => calculateBounds(uniqueCoordinates(points, lines), 0.24),
    [lines, points],
  );
  const clusters = useMemo(
    () =>
      clusterMapPoints(points, bounds, {
        width: VIEW_WIDTH,
        height: VIEW_HEIGHT,
        zoom,
      }),
    [bounds, points, zoom],
  );
  const tokens = useMemo(() => getMapThemeTokens(theme), [theme]);

  const resetView = () => {
    setZoom(2);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const selectPoint = (point: MapPoint) => {
    setSelected(point);
    onStopSelect?.({
      id: point.id,
      code: point.code,
      name: point.name,
      coordinate: point.coordinate,
      routeIds: point.routeIds,
    });
  };

  return (
    <section
      className={`map-viewport theme-${theme} ${selected ? "is-detail-open" : ""} ${className}`.trim()}
      style={{
        "--map-background": tokens.background,
        "--map-land": tokens.land,
        "--map-land-alt": tokens.landAlt,
        "--map-water": tokens.water,
        "--map-road": tokens.road,
        "--map-road-minor": tokens.roadMinor,
        "--map-label": tokens.label,
        "--map-muted": tokens.mutedText,
        "--map-panel": tokens.panel,
        "--map-panel-border": tokens.panelBorder,
        "--map-accent": tokens.accent,
        "--detail-sheet-height": `${sheetHeight}px`,
      } as React.CSSProperties}
      aria-label="Interactive transit map"
    >
      <div className="map-topbar">
        <div className="map-brand" aria-label="OneDirect">
          <span className="map-brand-mark">OD</span>
          <span>OneDirect</span>
        </div>
        <div className="map-theme-switch" aria-label="Map theme">
          <button
            type="button"
            title="Light map"
            aria-label="Use light map"
            aria-pressed={theme === "light"}
            onClick={() => setTheme("light")}
          >
            <Sun size={16} />
          </button>
          <button
            type="button"
            title="Dark map"
            aria-label="Use dark map"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme("dark")}
          >
            <Moon size={16} />
          </button>
        </div>
      </div>

      <div
        className="map-canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="map-scene"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${1 + (zoom - 1) * 0.09})`,
          }}
        >
          <svg
            className="map-vector"
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            role="img"
            aria-label="Transit network overview"
          >
            <path
              className="map-water"
              d="M0,410 C150,350 250,455 400,396 C560,330 710,432 1000,338 L1000,620 L0,620 Z"
            />
            <path className="map-road arterial" d="M80,224 C230,260 330,180 495,226 C650,270 770,198 940,176" />
            <path className="map-road arterial" d="M165,520 C240,392 330,342 470,328 C620,313 724,270 826,106" />
            <path className="map-road minor" d="M40,124 C260,134 380,280 548,280 C720,280 802,352 976,300" />
            <path className="map-road minor" d="M275,0 C295,156 370,220 494,312 C600,390 675,510 742,620" />
            <path className="map-road minor" d="M0,304 C160,298 282,330 430,304 C590,276 720,230 1000,236" />
            <path className="map-boundary" d="M88,72 C240,26 350,94 478,54 C642,0 780,70 918,42" />
            {lines.map((line) => (
              <g key={line.id}>
                <path
                  className="lrt-line-casing"
                  d={linePath(line, bounds)}
                />
                <path
                  className="lrt-line"
                  d={linePath(line, bounds)}
                  style={{ stroke: line.color }}
                />
              </g>
            ))}
          </svg>

          <div className="map-labels" aria-hidden="true">
            <span style={{ left: "16%", top: "25%" }}>Harbor North</span>
            <span style={{ left: "45%", top: "48%" }}>Central</span>
            <span style={{ left: "72%", top: "23%" }}>Tech Park</span>
            <span style={{ left: "58%", top: "72%" }}>Garden District</span>
          </div>

          {clusters.map((cluster) => {
            const first = cluster.items[0]!;
            const isCluster = cluster.items.length > 1;
            const isMixed = new Set(cluster.items.map((item) => item.kind)).size > 1;
            return (
              <button
                key={cluster.id}
                type="button"
                className={[
                  "map-marker",
                  isCluster ? "is-cluster" : "",
                  isMixed ? "is-mixed" : first.kind,
                  selected?.id === first.id && !isCluster ? "is-selected" : "",
                ].filter(Boolean).join(" ")}
                style={{
                  left: `${(cluster.x / VIEW_WIDTH) * 100}%`,
                  top: `${(cluster.y / VIEW_HEIGHT) * 100}%`,
                }}
                title={
                  isCluster
                    ? `${cluster.items.length} stations`
                    : first.name
                }
                aria-label={
                  isCluster
                    ? `${cluster.items.length} stations. Zoom in.`
                    : `${first.name}, ${first.code}`
                }
                onClick={(event) => {
                  event.stopPropagation();
                  if (isCluster) {
                    setZoom((current) => Math.min(6, current + 1));
                    return;
                  }
                  selectPoint(first);
                }}
              >
                {isCluster ? (
                  <span>{cluster.items.length}</span>
                ) : first.kind === "lrt" ? (
                  <TramFront size={18} />
                ) : (
                  <BusFront size={18} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="map-tools" aria-label="Map controls">
        <button
          type="button"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => setZoom((current) => Math.min(6, current + 1))}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => setZoom((current) => Math.max(1, current - 1))}
        >
          <Minus size={18} />
        </button>
        <button
          type="button"
          title="Reset view"
          aria-label="Reset view"
          onClick={resetView}
        >
          <LocateFixed size={18} />
        </button>
      </div>

      <div className="map-legend" aria-label="Map legend">
        <span><BusFront size={15} /> Bus</span>
        <span><TramFront size={15} /> LRT</span>
        <span><Layers3 size={15} /> Cluster</span>
      </div>

      {loading && (
        <div className="map-status" role="status">
          <MapPin size={18} />
          Loading fixtures
        </div>
      )}
      {error && (
        <div className="map-status is-error" role="alert">
          <MapPin size={18} />
          {error}
        </div>
      )}

      {selected && (
        <aside
          ref={sheetRef}
          className="stop-sheet"
          aria-label={`${selected.name} station details`}
        >
          <div className="stop-sheet-heading">
            <span className={`stop-kind-icon ${selected.kind}`}>
              {selected.kind === "lrt" ? <TramFront size={19} /> : <BusFront size={19} />}
            </span>
            <div>
              <p>{selected.code}</p>
              <h2>{selected.name}</h2>
            </div>
            <button
              type="button"
              className="stop-sheet-close"
              title="Close station details"
              aria-label="Close station details"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="route-chips">
            {selected.routeIds.length > 0 ? (
              selected.routeIds.map((routeId) => (
                <span key={routeId}>{routeId}</span>
              ))
            ) : (
              <span className="is-muted">No active route</span>
            )}
          </div>
        </aside>
      )}
    </section>
  );
}
