import type { BotConfig, TrackConfig, Vec3 } from '@/types/game';
import type { CarControls, CarKinematics } from '@/lib/physics';

/**
 * Bot AI — waypoint follower with look-ahead.
 *
 * Algorithm (per frame):
 *   1. Find the closest waypoint index `i` to the bot's current position
 *      (cached as `state.nextWaypointIdx` to avoid O(N) scan every frame).
 *   2. Advance index while the bot is "past" waypoint i along forward dir.
 *   3. Pick the target = waypoint at (i + look-ahead-steps) % N.
 *   4. Compute desired heading vector from car → target, project to XZ.
 *   5. Steer toward that heading (cross-product sign → left/right).
 *   6. Throttle = aggression, brake if turn angle is large at high speed.
 *
 * Kostya wires this into useFrame for each <Bot>; this module is pure
 * (no THREE/Rapier imports) so it is unit-testable from Vitest.
 */

/* ─────────────────────── Per-bot scratch state ─────────────────────── */

export interface BotState {
  /** Index into TrackConfig.waypoints — the *next* waypoint to chase. */
  nextWaypointIdx: number;
  /** Accumulated time for stuck-detection (reset on progress). */
  stuckTimer: number;
  /** Last sampled position; used by stuck-detection. */
  lastPos: Vec3;
}

export function makeBotState(initial: { startWaypointIdx?: number; startPos: Vec3 }): BotState {
  return {
    nextWaypointIdx: initial.startWaypointIdx ?? 0,
    stuckTimer: 0,
    lastPos: initial.startPos,
  };
}

/* ─────────────────────── Math helpers (XZ plane) ─────────────────────── */

const sqDistXZ = (a: Vec3, b: Vec3): number => {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return dx * dx + dz * dz;
};

/** Returns angle in radians ∈ [-π, π] between two XZ vectors (a → b). */
const signedAngleXZ = (a: Vec3, b: Vec3): number => {
  const ax = a[0],
    az = a[2];
  const bx = b[0],
    bz = b[2];
  const dot = ax * bx + az * bz;
  const det = ax * bz - az * bx; // right-handed cross.y
  return Math.atan2(det, dot);
};

const normalizeXZ = (v: Vec3): Vec3 => {
  const m = Math.hypot(v[0], v[2]);
  return m > 1e-6 ? [v[0] / m, 0, v[2] / m] : [0, 0, 0];
};

/* ─────────────────────── Main update ─────────────────────── */

export interface BotUpdateArgs {
  readonly bot: BotConfig;
  readonly track: TrackConfig;
  readonly kinematics: CarKinematics;
  readonly state: BotState;
  readonly dt: number;
}

export interface BotUpdateResult {
  readonly controls: CarControls;
  /** Mutated copy of state (next frame's input). */
  readonly state: BotState;
}

const WAYPOINT_REACH_RADIUS = 6; // meters; if closer than this, advance.

export function botUpdate({
  bot,
  track,
  kinematics,
  state,
  dt,
}: BotUpdateArgs): BotUpdateResult {
  const waypoints = bot.waypoints ?? track.waypoints;
  const N = waypoints.length;
  if (N === 0) {
    return { controls: { throttle: 0, brake: 1, steer: 0, handbrake: true }, state };
  }

  // 1) Advance index if we are close enough to the current target.
  let idx = state.nextWaypointIdx % N;
  if (sqDistXZ(kinematics.position, waypoints[idx]) < WAYPOINT_REACH_RADIUS ** 2) {
    idx = (idx + 1) % N;
  }

  // 2) Pick a look-ahead point: skip K waypoints based on bot.lookAheadM / segment length.
  const segLenApprox = Math.sqrt(sqDistXZ(waypoints[idx], waypoints[(idx + 1) % N])) || 1;
  const lookAheadSteps = Math.max(1, Math.round((bot.lookAheadM ?? 14) / segLenApprox));
  const target = waypoints[(idx + lookAheadSteps - 1) % N];

  // 3) Desired heading & steering decision.
  const desired = normalizeXZ([
    target[0] - kinematics.position[0],
    0,
    target[2] - kinematics.position[2],
  ]);
  const angle = signedAngleXZ(kinematics.forward, desired); // +right, -left in XZ-handedness

  // Steer proportional, clamped.
  const steer = Math.max(-1, Math.min(1, angle / (Math.PI / 4)));

  // 4) Throttle / brake: aggression baseline, lift off / brake if sharp turn at speed.
  const aggression = bot.aggression ?? 0.8;
  const absAngle = Math.abs(angle);
  const sharpTurn = absAngle > Math.PI / 6; // ~30°
  const fast = kinematics.speed > 25;

  let throttle = aggression;
  let brake = 0;
  if (sharpTurn && fast) {
    throttle *= 0.4;
    brake = 0.5;
  }

  // 5) Stuck-detection: if we barely moved for >1.5s, hit reverse-via-brake briefly.
  const movedSq = sqDistXZ(kinematics.position, state.lastPos);
  const nextStuck = movedSq < 0.04 ? state.stuckTimer + dt : 0;
  const stuck = nextStuck > 1.5;
  if (stuck) {
    throttle = 0;
    brake = 1;
  }

  return {
    controls: {
      throttle,
      brake,
      steer,
      handbrake: false,
    },
    state: {
      nextWaypointIdx: idx,
      stuckTimer: stuck ? 0 : nextStuck,
      lastPos: kinematics.position,
    },
  };
}
