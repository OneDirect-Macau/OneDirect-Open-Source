import type { EtaArrival, EtaSnapshot } from "@onedirect/data-fetcher-provider-layer";
import { EtaParseError } from "./errors.js";

function requiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new EtaParseError(`${field} must be a non-empty string`);
  }
  return value.trim().slice(0, maxLength);
}

function optionalString(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new EtaParseError("Optional identifier must be a string or number");
  }
  return String(value).trim().slice(0, maxLength) || null;
}

function parseDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? value : new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) {
    throw new EtaParseError(`${field} must be a valid date`);
  }
  return date;
}

function parseArrivals(
  value: unknown,
  generatedAt: Date,
): EtaArrival[] {
  if (!Array.isArray(value)) {
    throw new EtaParseError("arrivals must be an array");
  }

  const uniqueMinutes = new Map<number, EtaArrival>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const minutes = Number(record.minutes);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 360) continue;

    const normalizedMinutes = Math.round(minutes);
    const parsedEstimatedAt = new Date(String(record.estimatedAt ?? ""));
    const estimatedAt = Number.isNaN(parsedEstimatedAt.getTime())
      ? new Date(
          generatedAt.getTime() + normalizedMinutes * 60_000,
        ).toISOString()
      : parsedEstimatedAt.toISOString();

    if (!uniqueMinutes.has(normalizedMinutes)) {
      uniqueMinutes.set(normalizedMinutes, {
        minutes: normalizedMinutes,
        estimatedAt,
      });
    }
  }

  return [...uniqueMinutes.values()]
    .sort((left, right) => left.minutes - right.minutes)
    .slice(0, 3);
}

export function parseEtaPayload(payload: unknown): EtaSnapshot {
  if (!payload || typeof payload !== "object") {
    throw new EtaParseError("ETA payload must be an object");
  }
  const record = payload as Record<string, unknown>;
  const routeId = requiredString(record.routeId, "routeId", 32);
  const generatedAt = parseDate(record.generatedAt, "generatedAt");
  const directionValue = Number(record.direction);
  const direction =
    record.direction === null ||
    record.direction === undefined ||
    !Number.isFinite(directionValue)
      ? null
      : directionValue === 1
        ? 1
        : 0;

  return {
    routeId,
    stopId: optionalString(record.stopId, 32),
    direction,
    generatedAt: generatedAt.toISOString(),
    isRealtime: record.isRealtime === true,
    source: optionalString(record.source, 64) ?? "unknown",
    arrivals: parseArrivals(record.arrivals, generatedAt),
  };
}
