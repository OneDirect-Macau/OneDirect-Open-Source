import type { EtaSnapshot } from "@onedirect/data-fetcher-provider-layer";

export type EtaDisplayState =
  | "arriving"
  | "approaching"
  | "scheduled"
  | "stale"
  | "unavailable";

export type EtaState = {
  state: EtaDisplayState;
  minutes: number | null;
  label: string;
  ageSeconds: number;
};

export type EtaStateOptions = {
  now?: Date;
  staleAfterSeconds?: number;
};

const LABELS: Record<EtaDisplayState, string> = {
  arriving: "Arriving",
  approaching: "Approaching",
  scheduled: "Scheduled",
  stale: "Data stale",
  unavailable: "Unavailable",
};

export function deriveEtaState(
  snapshot: EtaSnapshot,
  options: EtaStateOptions = {},
): EtaState {
  const now = options.now ?? new Date();
  const staleAfterSeconds = options.staleAfterSeconds ?? 120;
  if (!Number.isFinite(staleAfterSeconds) || staleAfterSeconds < 0) {
    throw new RangeError("staleAfterSeconds must be a non-negative number");
  }

  const generatedAt = Date.parse(snapshot.generatedAt);
  if (Number.isNaN(generatedAt)) {
    throw new RangeError("snapshot.generatedAt must be a valid date");
  }

  const ageSeconds = Math.max(0, Math.floor((now.getTime() - generatedAt) / 1_000));
  const firstArrival = snapshot.arrivals[0];
  if (!firstArrival) {
    return {
      state: "unavailable",
      minutes: null,
      label: LABELS.unavailable,
      ageSeconds,
    };
  }
  if (ageSeconds > staleAfterSeconds) {
    return {
      state: "stale",
      minutes: firstArrival.minutes,
      label: LABELS.stale,
      ageSeconds,
    };
  }

  const elapsedWholeMinutes = Math.floor(ageSeconds / 60);
  const minutes = Math.max(0, firstArrival.minutes - elapsedWholeMinutes);
  const state: EtaDisplayState =
    minutes === 0
      ? "arriving"
      : minutes <= 2
        ? "approaching"
        : "scheduled";

  return {
    state,
    minutes,
    label: LABELS[state],
    ageSeconds,
  };
}
