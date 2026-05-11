/**
 * Concrete implementation of the physics contracts declared in
 * `src/lib/physics.ts`.
 *
 * Why a separate file: `physics.ts` uses `export declare const` to keep its
 * Rapier WASM dependency out of edge / test builds. The real impl lives here
 * and is imported by `<Car>` / `<Bot>` / lap-tracking only.
 *
 * Algorithms are arcade-style — we cheat physics for game-feel:
 *   • engine force = car.mass · car.accel · throttle, clamped at maxSpeed
 *   • brake = strong linear damping in forward direction
 *   • steering = direct yaw torque scaled by current speed (no wheel joints)
 */

import type { RapierRigidBody } from "@react-three/rapier";
import type {
  CarConfig,
  LapInfo,
  StartLine,
  TrackConfig,
  Vec3,
} from "@/types/game";
import type {
  ApplyEngineForceArgs,
  ApplySteeringArgs,
  CarKinematics,
  CheckLapArgs,
  CheckLapResult,
} from "@/lib/physics";

/* ─────────────── kinematic sampling ─────────────── */

/** Sample position / forward / velocity from a Rapier rigid body. */
export function sampleKinematics(body: RapierRigidBody): CarKinematics {
  const t = body.translation();
  const v = body.linvel();
  const rot = body.rotation();
  // Forward = body local -Z, transformed by rotation quaternion.
  // For a unit quat (x,y,z,w): rotate (0,0,-1) → ( -2(xz + wy), -2(yz - wx), -(1 - 2(xx + yy)) )
  const fx = -2 * (rot.x * rot.z + rot.w * rot.y);
  const fz = -(1 - 2 * (rot.x * rot.x + rot.y * rot.y));
  const speed = Math.hypot(v.x, v.y, v.z);
  return {
    position: [t.x, t.y, t.z],
    forward: [fx, 0, fz],
    velocity: [v.x, v.y, v.z],
    speed,
  };
}

/* ─────────────── force application ─────────────── */

const DRAG_LINEAR = 0.6;

export function applyEngineForce({
  body,
  car,
  controls,
  kinematics,
  dt,
}: ApplyEngineForceArgs & { readonly body: RapierRigidBody }): void {
  const [fx, , fz] = kinematics.forward;
  const fwdSpeed = kinematics.velocity[0] * fx + kinematics.velocity[2] * fz;

  // Soft speed cap — fade throttle as we approach maxSpeed.
  const speedRatio = Math.min(1, Math.abs(fwdSpeed) / car.maxSpeed);
  const throttleEff = controls.throttle * (1 - speedRatio * 0.85);
  const engine = car.mass * car.accel * throttleEff;

  // Braking acts opposite to forward velocity.
  const brakeMag = (car.brakeForce ?? 14000) * controls.brake;
  const brakeSign = fwdSpeed > 0 ? -1 : 1;
  const brakeFx = brakeMag * brakeSign;

  // Linear drag (air resistance), proportional to speed.
  const dragK = (car.dragCoeff ?? 0.3) * DRAG_LINEAR;
  const dragX = -kinematics.velocity[0] * dragK * car.mass * 0.02;
  const dragZ = -kinematics.velocity[2] * dragK * car.mass * 0.02;

  // Handbrake — extra strong opposing force.
  const handMag = controls.handbrake ? (car.brakeForce ?? 14000) * 0.8 : 0;
  const handFx = handMag * (fwdSpeed > 0 ? -1 : 1);

  const totalFx = engine * fx + brakeFx * fx + handFx * fx + dragX;
  const totalFz = engine * fz + brakeFx * fz + handFx * fz + dragZ;

  body.resetForces(false);
  body.addForce({ x: totalFx, y: 0, z: totalFz }, true);
  void dt;
}

export function applySteering({
  body,
  car,
  controls,
  kinematics,
  dt,
}: ApplySteeringArgs & { readonly body: RapierRigidBody }): void {
  const angle = car.steeringAngleRad ?? 0.55;
  // Low-speed steering is reduced (avoids in-place spin); ramp from 0.2 at v=0
  // to 1.0 at v=10 m/s.
  const speedFactor = Math.min(1, 0.2 + kinematics.speed / 10);
  const torqueY = controls.steer * angle * speedFactor * car.mass * 12;

  // Kill residual lateral drift each frame for grip-feel.
  const [fx, , fz] = kinematics.forward;
  const vx = kinematics.velocity[0];
  const vz = kinematics.velocity[2];
  // Right vector = (forward.z, 0, -forward.x).
  const rx = fz;
  const rz = -fx;
  const lateral = vx * rx + vz * rz;
  const gripK = 0.85;
  const corrX = -lateral * rx * gripK * car.mass * 0.05;
  const corrZ = -lateral * rz * gripK * car.mass * 0.05;

  body.resetTorques(false);
  body.addTorque({ x: 0, y: torqueY, z: 0 }, true);
  body.addForce({ x: corrX, y: 0, z: corrZ }, true);
  void dt;
}

/* ─────────────── lap accounting ─────────────── */

/** Sign of side of `pos` relative to start-line segment, with forward dir. */
function lineSide(pos: Vec3, line: StartLine): number {
  // Project (pos - line.a) onto forward (XZ); positive = past the line.
  const dx = pos[0] - line.a[0];
  const dz = pos[2] - line.a[2];
  return dx * line.forward[0] + dz * line.forward[2];
}

/** Are we inside the start-line strip width-wise (XZ projection)? */
function withinSegment(pos: Vec3, line: StartLine): boolean {
  const sx = line.b[0] - line.a[0];
  const sz = line.b[2] - line.a[2];
  const len2 = sx * sx + sz * sz;
  if (len2 < 1e-6) return false;
  const px = pos[0] - line.a[0];
  const pz = pos[2] - line.a[2];
  const t = (px * sx + pz * sz) / len2;
  return t >= 0 && t <= 1;
}

export function checkLap({
  racerId,
  prevKinematics,
  kinematics,
  startLine,
  currentLap,
  raceTime,
  track,
}: CheckLapArgs): CheckLapResult {
  const prevSide = lineSide(prevKinematics.position, startLine);
  const nextSide = lineSide(kinematics.position, startLine);

  // Forward crossing: prev was behind (≤0), next is past (>0).
  const crossed =
    prevSide <= 0 &&
    nextSide > 0 &&
    withinSegment(kinematics.position, startLine);

  if (!crossed) {
    return {
      lapInfo: { ...currentLap, time: raceTime, racerId },
      crossed: false,
      finished: false,
    };
  }

  // Lap delta — only count if it's been ≥3s since last lap (debounce).
  const lapDelta = raceTime - currentLap.time;
  if (lapDelta < 3 && currentLap.lap > 1) {
    return {
      lapInfo: { ...currentLap, time: raceTime, racerId },
      crossed: false,
      finished: false,
    };
  }

  const nextLap = currentLap.lap + 1;
  const finished = nextLap > track.laps;
  const bestLapTime =
    currentLap.bestLapTime === undefined || lapDelta < currentLap.bestLapTime
      ? lapDelta
      : currentLap.bestLapTime;

  return {
    lapInfo: {
      racerId,
      lap: finished ? track.laps : nextLap,
      time: raceTime,
      position: currentLap.position,
      bestLapTime: currentLap.lap > 0 ? bestLapTime : undefined,
    },
    crossed: true,
    finished,
  };
}

/* ─────────────── small re-exports for car factory ─────────────── */

export type { CarConfig, LapInfo, TrackConfig, Vec3 };
