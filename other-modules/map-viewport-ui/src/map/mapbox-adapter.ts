import type { Coordinate } from "@onedirect/data-fetcher-provider-layer";
import type { MapTheme } from "./theme.js";

type MapboxMap = {
  setConfigProperty?: (
    importId: string,
    configName: string,
    value: string,
  ) => void;
  remove: () => void;
};

export type MapboxSdkLike = {
  accessToken?: string;
  Map: new (options: {
    container: HTMLElement;
    style: string;
    center: [number, number];
    zoom: number;
    accessToken?: string;
  }) => MapboxMap;
};

export type MapboxAdapterOptions = {
  sdk: MapboxSdkLike;
  container: HTMLElement;
  accessToken: string;
  styleLight: string;
  styleDark: string;
  center: Coordinate;
  zoom?: number;
  initialTheme?: MapTheme;
};

export type MapAdapter = {
  setTheme(theme: MapTheme): void;
  destroy(): void;
};

export function mountMapboxAdapter(options: MapboxAdapterOptions): MapAdapter {
  const {
    sdk,
    container,
    accessToken,
    styleLight,
    styleDark,
    center,
    zoom = 12,
    initialTheme = "light",
  } = options;

  if (!accessToken.trim()) {
    throw new Error("A Mapbox access token must be injected by the host application");
  }
  if (!styleLight.trim() || !styleDark.trim()) {
    throw new Error("Mapbox light and dark style identifiers are required");
  }

  const map = new sdk.Map({
    container,
    style: initialTheme === "dark" ? styleDark : styleLight,
    center: [center.lng, center.lat],
    zoom,
    accessToken,
  });

  return {
    setTheme(theme) {
      map.setConfigProperty?.(
        "basemap",
        "lightPreset",
        theme === "dark" ? "night" : "day",
      );
    },
    destroy() {
      map.remove();
    },
  };
}
