/**
 * Physics contracts for racing-game-3d.
 *
 * Signatures only — implementation lives in components/Car.tsx and a Rapier
 * world bootstrapped by <GameCanvas>. Kostya owns the implementation; this
 * file fixes the surface so AI, HUD and game-state machine can compile
 * against a stable API.
 *
 * Stack assumption: @react-three/rapier (RigidBody refs) + three.js math.
 */

import type { CarConfig, LapInfo, StartLine, TrackConfig, Vec3 } from '@/types/game';

/* ─────────────────────── Opaque rigid-body handle ─────────────────────── */

/**
 * We intentionally don't import Rapier types here so this module can be
 * consumed from edge / server contexts (e.g. tests) without pulling WASM.
 * Concrete type is `RapierRigidBody` in @react-three/rapier; cast at use.
 */
export interface RigidBodyHandle {
  /** Set by physics impl; opaque to callers. */
  readonly __rapierRigidBody: true;
}

/** Snapshot of a car's kinematic state, sampled once per frame. */
export interface CarKinematics {
  readonly position: Vec3;
  /** Forward unit vector in world space (XZ-projected). */
  readonly forward: Vec3;
  /** Linear velocity in m/s. */
  readonly velocity: Vec3;
  /** Scalar speed in m/s (= |velocity|). */
  readonly speed: number;
}

/* ─────────────────────── Per-frame control inputs ─────────────────────── */

/**
 * Normalized control sample, produced by lib/input.ts (player) or
 * lib/ai.ts:botUpdate (bots).
 *   throttle  ∈ [0, 1]
 *   brake     ∈ [0, 1]
 *   steer     ∈ [-1, 1]   (negative = left)
 *   handbrake ∈ {true,false}
 */
export interface CarControls {
  readonly throttle: number;
  readonly brake: number;
  readonly steer: number;
  readonly handbrake: boolean;
}

export const NEUTRAL_CONTROLS: CarControls = Object.freeze({
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
});

/* ─────────────────────── Body creation ─────────────────────── */

export interface CreateCarBodyArgs {
  readonly car: CarConfig;
  readonly position: Vec3;
  /** Yaw in radians around +Y axis (0 = facing -Z, matches three.js camera default). */
  readonly yaw: number;
}

/**
 * Spawn a dynamic rigid body for a car at `position` with `yaw`.
 * Implementation should attach a box collider sized for the car preset and
 * set linear/angular damping based on dragCoeff.
 */
export type CreateCarBody = (args: CreateCarBodyArgs) => RigidBodyHandle;

/* ─────────────────────── Per-frame force application ─────────────────────── */

export interface ApplyEngineForceArgs {
  readonly body: RigidBodyHandle;
  readonly car: CarConfig;
  readonly controls: Pick<CarControls, 'throttle' | 'brake' | 'handbrake'>;
  readonly kinematics: CarKinematics;
  /** Seconds since last frame, clamped to ≤ 1/30. */
  readonly dt: number;
}

/**
 * Apply longitudinal engine force + braking + (handbrake) to the body.
 * Force magnitude derives from `car.accel * car.mass * throttle`, clamped so
 * speed never exceeds car.maxSpeed (soft drag).
 */
export type ApplyEngineForce = (args: ApplyEngineForceArgs) => void;

export interface ApplySteeringArgs {
  readonly body: RigidBodyHandle;
  readonly car: CarConfig;
  readonly controls: Pick<CarControls, 'steer'>;
  readonly kinematics: CarKinematics;
  readonly dt: number;
}

/**
 * Apply yaw torque scaled by `car.steeringAngleRad` and current speed.
 * At very low speed steering is reduced (no infinite spin in place).
 */
export type ApplySteering = (args: ApplySteeringArgs) => void;

/* ─────────────────────── Lap accounting ─────────────────────── */

export interface CheckLapArgs {
  readonly racerId: string;
  readonly prevKinematics: CarKinematics;
  readonly kinematics: CarKinematics;
  readonly startLine: StartLine;
  readonly currentLap: LapInfo;
  /** Seconds since race start. */
  readonly raceTime: number;
  readonly track: Pick<TrackConfig, 'laps'>;
}

export interface CheckLapResult {
  /** New lap snapshot — same as `currentLap` if no crossing this frame. */
  readonly lapInfo: LapInfo;
  /** True iff the racer crossed the line forward this frame. */
  readonly crossed: boolean;
  /** True iff this crossing took the racer past TrackConfig.laps. */
  readonly finished: boolean;
}

/**
 * Detect a forward line-cross between `prevKinematics.position` and
 * `kinematics.position`, increment `lap`, write `bestLapTime` when beaten.
 * Pure function — no side effects, easy to unit-test from Vitest.
 */
export type CheckLap = (args: CheckLapArgs) => CheckLapResult;

/* ─────────────────────── Helper signatures (no impl) ─────────────────────── */

export declare const createCarBody: CreateCarBody;
export declare const applyEngineForce: ApplyEngineForce;
export declare const applySteering: ApplySteering;
export declare const checkLap: CheckLap;
