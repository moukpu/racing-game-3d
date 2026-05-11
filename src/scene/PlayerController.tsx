"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import type { CarConfig, LapInfo, TrackConfig } from "@/types/game";
import { useKeyboardControls } from "@/lib/input";
import {
  applyEngineForce,
  applySteering,
  checkLap,
  sampleKinematics,
} from "@/lib/physicsImpl";
import { gameStore } from "@/store/game";

interface PlayerControllerProps {
  readonly bodyRef: { readonly current: RapierRigidBody | null };
  readonly car: CarConfig;
  readonly track: TrackConfig;
  readonly racerId: string;
  readonly enabled: boolean;
}

/**
 * Drives the player car each physics frame:
 *   1. read normalized controls from useKeyboardControls
 *   2. sample rigid-body kinematics
 *   3. apply engine + steering forces (impl in lib/physicsImpl)
 *   4. run lap detection against TrackConfig.startLine
 *   5. push speed/lap into the game store (no React re-render — HUD pulls)
 */
export function PlayerController({
  bodyRef,
  car,
  track,
  racerId,
  enabled,
}: PlayerControllerProps) {
  const controlsRef = useKeyboardControls({ enabled });
  const prevKinematicsRef = useRef<ReturnType<typeof sampleKinematics> | null>(null);
  const currentLapRef = useRef<LapInfo>({
    racerId,
    lap: 1,
    time: 0,
    position: 1,
  });
  const raceStartRef = useRef<number | null>(null);

  // Reset lap state whenever we transition into 'countdown' / 'racing'.
  useEffect(() => {
    if (!enabled) {
      raceStartRef.current = null;
      prevKinematicsRef.current = null;
      currentLapRef.current = { racerId, lap: 1, time: 0, position: 1 };
      return;
    }
  }, [enabled, racerId]);

  useFrame((threeState, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const dt = Math.min(delta, 1 / 30);
    const kin = sampleKinematics(body);

    if (enabled) {
      const c = controlsRef.current;
      applyEngineForce({ body, car, controls: c, kinematics: kin, dt });
      applySteering({ body, car, controls: c, kinematics: kin, dt });

      if (raceStartRef.current === null) raceStartRef.current = threeState.clock.elapsedTime;
      const raceTime = threeState.clock.elapsedTime - raceStartRef.current;
      gameStore.setRaceTime(raceTime);
      gameStore.setSpeed(racerId, kin.speed);

      if (prevKinematicsRef.current) {
        const result = checkLap({
          racerId,
          prevKinematics: prevKinematicsRef.current,
          kinematics: kin,
          startLine: track.startLine,
          currentLap: currentLapRef.current,
          raceTime,
          track,
        });
        currentLapRef.current = result.lapInfo;
        gameStore.setLap(racerId, result.lapInfo);
        if (result.finished) {
          gameStore.setFinished(racerId, raceTime);
        }
      }
    }

    prevKinematicsRef.current = kin;
  });

  return null;
}
