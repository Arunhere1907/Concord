/**
 * Shared simulation logic for stadium state mutations
 * Used by both client (App.tsx) and server (server.ts)
 */

import type { StadiumState, Gate, Zone, TransitOption } from "../src/types";

/**
 * Apply a single simulation tick to the stadium state
 * Mutates gate loads, zone counts, and transit ETAs randomly
 *
 * @param state - Current stadium state
 * @returns New stadium state with simulated changes
 */
export function applySimulationTick(state: StadiumState): StadiumState {
  // 1. Mutate Gate loads slightly
  const gates: Gate[] = state.gates.map(gate => {
    const delta = Math.floor(Math.random() * 9) - 4; // -4 to +4% change
    const newLoad = Math.max(10, Math.min(100, gate.currentLoad + delta));

    let status: "open" | "warning" | "closed" = "open";
    if (newLoad >= 85) status = "warning";
    if (gate.status === "closed") status = "closed"; // preserve manual closures

    return { ...gate, currentLoad: newLoad, status };
  });

  // 2. Mutate Zone counts
  const zones: Zone[] = state.zones.map(zone => {
    const countDelta = Math.floor(Math.random() * 300) - 100;
    const newCount = Math.max(1000, Math.min(zone.capacity, zone.currentCount + countDelta));

    let status: "normal" | "congested" | "critical" = "normal";
    const loadFactor = newCount / zone.capacity;
    if (loadFactor >= 0.85) status = "critical";
    else if (loadFactor >= 0.7) status = "congested";

    return { ...zone, currentCount: newCount, status };
  });

  // 3. Mutate Transit eta and status
  const transitOptions: TransitOption[] = state.transitOptions.map(t => {
    const etaDelta = Math.floor(Math.random() * 3) - 1; // -1 to +1 min
    const newEta = Math.max(1, t.etaMinutes + etaDelta);

    let status = t.status;
    if (t.capacity > 80) status = "crowded";
    else if (Math.random() > 0.85) status = "delayed";
    else status = "normal";

    return {
      ...t,
      etaMinutes: newEta,
      nextDeparture: `${newEta} mins`,
      status,
    };
  });

  return {
    ...state,
    gates,
    zones,
    transitOptions,
  };
}
