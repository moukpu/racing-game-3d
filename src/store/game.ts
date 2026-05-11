"use client";

import { useSyncExternalStore } from "react";
import type { GameState, LapInfo, TrackConfig } from "@/types/game";
import { track } from "@/content/track";
import { defaultCarId } from "@/content/cars";
import { bots } from "@/content/bots";

/**
 * Lightweight external store backing the HUD + game-flow overlays.
 * No deps (zustand-equivalent built on `useSyncExternalStore`).
 *
 * Racer rows live in a fixed-size array (1 player + N bots). The 3D world
 * mutates per-frame numbers (speed/lap/raceTime) via the imperative setters
 * — React only re-renders the HUD when we call `notify` from those setters,
 * which we throttle to once every ~5 HUD frames inside the scene.
 */

export type RacerKind = "player" | "bot";

export interface RacerRow {
  readonly id: string;
  readonly kind: RacerKind;
  readonly name: string;
  readonly carId: string;
  /** Last sampled speed in m/s (HUD converts to km/h). */
  speed: number;
  lap: LapInfo;
  finishedAt: number | null;
}

export interface GameStore {
  readonly track: TrackConfig;
  state: GameState;
  selectedCarId: string;
  countdown: number | "GO" | null;
  raceTime: number;
  racers: RacerRow[];
}

const PLAYER_ID = "player";

function emptyLap(id: string): LapInfo {
  return { racerId: id, lap: 1, time: 0, position: 1 };
}

function makeInitialRacers(): RacerRow[] {
  const playerRow: RacerRow = {
    id: PLAYER_ID,
    kind: "player",
    name: "You",
    carId: defaultCarId,
    speed: 0,
    lap: emptyLap(PLAYER_ID),
    finishedAt: null,
  };
  const botRows: RacerRow[] = bots.map((b) => ({
    id: b.id,
    kind: "bot" as const,
    name: b.name,
    carId: b.carId,
    speed: 0,
    lap: emptyLap(b.id),
    finishedAt: null,
  }));
  return [playerRow, ...botRows];
}

const state: GameStore = {
  track,
  state: "menu",
  selectedCarId: defaultCarId,
  countdown: null,
  raceTime: 0,
  racers: makeInitialRacers(),
};

const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

export const gameStore = {
  /** Read the current snapshot. */
  get(): GameStore {
    return state;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /* ─────────────── flow control ─────────────── */
  setState(next: GameState): void {
    state.state = next;
    notify();
  },
  setSelectedCar(id: string): void {
    state.selectedCarId = id;
    notify();
  },
  setCountdown(v: number | "GO" | null): void {
    state.countdown = v;
    notify();
  },
  /* ─────────────── race tick ─────────────── */
  setRaceTime(t: number): void {
    state.raceTime = t;
    // No notify — caller decides cadence.
  },
  /* ─────────────── racer mutators (per frame) ─────────────── */
  setSpeed(racerId: string, mps: number): void {
    const row = state.racers.find((r) => r.id === racerId);
    if (!row) return;
    row.speed = mps;
  },
  setLap(racerId: string, info: LapInfo): void {
    const row = state.racers.find((r) => r.id === racerId);
    if (!row) return;
    row.lap = info;
  },
  setFinished(racerId: string, at: number): void {
    const row = state.racers.find((r) => r.id === racerId);
    if (!row || row.finishedAt !== null) return;
    row.finishedAt = at;
  },
  /** Re-sort positions by (lap desc, finishedAt asc, time asc). Cheap, do every ~0.25s. */
  recomputePositions(): void {
    const sorted = [...state.racers].sort((a, b) => {
      // Finished racers always rank above unfinished.
      if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
      if (a.finishedAt !== null) return -1;
      if (b.finishedAt !== null) return 1;
      // Then by lap, then by current lap time (more time on same lap = farther ahead).
      if (a.lap.lap !== b.lap.lap) return b.lap.lap - a.lap.lap;
      return b.lap.time - a.lap.time;
    });
    sorted.forEach((row, i) => {
      row.lap = { ...row.lap, position: i + 1 };
    });
  },
  /** Force-notify subscribers (used by scene at ~5Hz for HUD). */
  notify,
  /* ─────────────── reset / new race ─────────────── */
  resetRace(): void {
    state.countdown = null;
    state.raceTime = 0;
    state.racers = makeInitialRacers();
    state.racers[0]!.carId = state.selectedCarId;
    notify();
  },
};

/** React hook — subscribe to the store and re-render on `notify()`. */
export function useGameStore<T>(selector: (s: GameStore) => T): T {
  return useSyncExternalStore(
    gameStore.subscribe,
    () => selector(state),
    () => selector(state),
  );
}
