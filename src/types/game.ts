/**
 * Core game types for racing-game-3d.
 * Single source of truth for cars, bots, track, run-state, lap accounting.
 * Imported by content/* (mocks), lib/* (physics/ai/input helpers) and components/* (Kostya).
 */

/** RGB hex color string, e.g. "#ff3344". */
export type HexColor = `#${string}`;

/** 3D vector tuple — matches THREE.Vector3 constructor signature and Rapier point shape. */
export type Vec3 = readonly [x: number, y: number, z: number];

/* ─────────────────────── Cars ─────────────────────── */

/**
 * Static config for a playable car preset.
 * `mass` in kg, `maxSpeed` in m/s, `accel` in m/s² (longitudinal target).
 * Tuning lives in src/content/cars.ts; physics applies forces derived from these
 * via lib/physics.ts (Kostya implements).
 */
export interface CarConfig {
  readonly id: string;
  readonly name: string;
  readonly mass: number;
  readonly maxSpeed: number;
  readonly accel: number;
  readonly color: HexColor;
  /** Path to GLB/GLTF, or null while we are using a primitive placeholder body. */
  readonly modelUrl: string | null;
  /** Optional tuning knobs — defaults applied in physics.ts if absent. */
  readonly steeringAngleRad?: number;
  readonly brakeForce?: number;
  readonly dragCoeff?: number;
}

/* ─────────────────────── Bots ─────────────────────── */

export type BotDifficulty = 'easy' | 'normal' | 'hard';

/**
 * AI opponent definition.
 * `waypoints` is an ordered, closed loop of points (last connects back to first).
 * If omitted, bot reuses the active TrackConfig.waypoints; per-bot waypoints
 * let us seed "racing lines" (cut apex, defensive line) for harder bots.
 */
export interface BotConfig {
  readonly id: string;
  readonly name: string;
  readonly difficulty: BotDifficulty;
  readonly carId: CarConfig['id'];
  readonly waypoints?: readonly Vec3[];
  /** 0..1, multiplier applied to engine force in ai.botUpdate. */
  readonly aggression?: number;
  /** Meters of look-ahead along the racing line; bigger = smoother but late braking. */
  readonly lookAheadM?: number;
}

/* ─────────────────────── Track ─────────────────────── */

/**
 * A track segment is a straight or curved piece between two waypoints.
 * For MVP we approximate with linear segments between waypoints;
 * later we can switch to Catmull-Rom without breaking the contract.
 */
export interface TrackSegment {
  readonly from: Vec3;
  readonly to: Vec3;
  /** Optional explicit width override (otherwise TrackConfig.width is used). */
  readonly width?: number;
}

/** Line crossed to count a lap. Defined as a horizontal segment at y = startLine.y. */
export interface StartLine {
  readonly a: Vec3;
  readonly b: Vec3;
  /** Direction in which crossing counts as a forward lap (unit XZ vector). */
  readonly forward: Vec3;
}

export interface TrackConfig {
  readonly id: string;
  readonly name: string;
  /** Ordered closed loop of waypoints; segments are auto-derived (i → i+1, last → first). */
  readonly waypoints: readonly Vec3[];
  readonly segments: readonly TrackSegment[];
  readonly width: number;
  readonly startLine: StartLine;
  /** Total laps to finish the race. */
  readonly laps: number;
}

/* ─────────────────────── Game-state machine ─────────────────────── */

/**
 * Top-level state machine for the race session.
 *   menu       → main menu / car select
 *   countdown  → 3-2-1-GO before inputs are accepted
 *   racing     → physics + input + AI running
 *   finished   → all racers crossed final lap; show results
 */
export type GameState = 'menu' | 'countdown' | 'racing' | 'finished';

/**
 * Per-racer lap snapshot. Updated by lib/physics.ts:checkLap each frame
 * the start line is crossed.
 *   lap      — 1-indexed (lap === TrackConfig.laps + 1 means "done")
 *   time     — seconds since race start; for "current lap" use raceTime - lapStart
 *   position — 1-indexed grid position vs. other racers (1 = leader)
 */
export interface LapInfo {
  readonly racerId: string;
  readonly lap: number;
  readonly time: number;
  readonly position: number;
  readonly bestLapTime?: number;
}
