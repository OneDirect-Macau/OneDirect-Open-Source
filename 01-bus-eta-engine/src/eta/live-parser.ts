import type {
  LiveRouteSnapshot,
  LiveStopObservation,
  LiveVehiclePosition,
} from "@onedirect/data-fetcher-provider-layer";
import { EtaParseError } from "./errors.js";

function parseVehicles(value: unknown): LiveVehiclePosition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string" || typeof record.id === "number"
        ? String(record.id).trim().slice(0, 48)
        : "";
    const segmentIndex = Number(record.segmentIndex);
    const speedValue = Number(record.speedKmh);
    if (!id || !Number.isInteger(segmentIndex) || segmentIndex < 0) return [];
    return [{
      id,
      segmentIndex,
      speedKmh:
        Number.isFinite(speedValue) && speedValue >= 0
          ? speedValue
          : null,
    }];
  });
}

function parseStops(value: unknown): LiveStopObservation[] {
  if (!Array.isArray(value)) {
    throw new EtaParseError("live route stops must be an array");
  }
  return value.flatMap((item, fallbackIndex) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const index = Number(record.index ?? fallbackIndex);
    const code = String(record.code ?? "").trim().toUpperCase().slice(0, 32);
    const name = String(record.name ?? "").trim().slice(0, 128);
    if (!Number.isInteger(index) || index < 0 || !code) return [];
    return [{
      index,
      code,
      name: name || code,
      vehicles: parseVehicles(record.vehicles),
    }];
  });
}

export function parseLiveRouteSnapshot(payload: unknown): LiveRouteSnapshot {
  if (!payload || typeof payload !== "object") {
    throw new EtaParseError("Live route payload must be an object");
  }
  const record = payload as Record<string, unknown>;
  const routeId = String(record.routeId ?? "").trim().toUpperCase().slice(0, 32);
  const directionIndex = Number(record.directionIndex);
  const observedAt = new Date(String(record.observedAt ?? ""));

  if (!routeId) {
    throw new EtaParseError("routeId is required");
  }
  if (!Number.isInteger(directionIndex) || directionIndex < 0) {
    throw new EtaParseError("directionIndex must be a non-negative integer");
  }
  if (Number.isNaN(observedAt.getTime())) {
    throw new EtaParseError("observedAt must be a valid date");
  }

  return {
    routeId,
    directionIndex,
    observedAt: observedAt.toISOString(),
    stops: parseStops(record.stops).sort((left, right) => left.index - right.index),
  };
}
