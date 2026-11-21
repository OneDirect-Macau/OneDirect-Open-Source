export type MapTheme = "light" | "dark";

export type MapThemeTokens = {
  background: string;
  land: string;
  landAlt: string;
  water: string;
  road: string;
  roadMinor: string;
  label: string;
  mutedText: string;
  panel: string;
  panelBorder: string;
  accent: string;
  mapboxLightPreset: "day" | "night";
};

const THEMES: Record<MapTheme, MapThemeTokens> = {
  light: {
    background: "#eef3f2",
    land: "#f6f7f2",
    landAlt: "#e8eeea",
    water: "#b9dce5",
    road: "#ffffff",
    roadMinor: "#d7dfdc",
    label: "#142522",
    mutedText: "#5f706b",
    panel: "rgba(250, 252, 249, 0.94)",
    panelBorder: "rgba(20, 37, 34, 0.13)",
    accent: "#e4572e",
    mapboxLightPreset: "day",
  },
  dark: {
    background: "#101822",
    land: "#172430",
    landAlt: "#1d2d39",
    water: "#0b2630",
    road: "#45545e",
    roadMinor: "#293943",
    label: "#f5f8f6",
    mutedText: "#a9b8b3",
    panel: "rgba(17, 27, 37, 0.94)",
    panelBorder: "rgba(225, 240, 235, 0.14)",
    accent: "#ff8059",
    mapboxLightPreset: "night",
  },
};

export function getMapThemeTokens(theme: MapTheme): MapThemeTokens {
  return { ...THEMES[theme] };
}
