"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import type { BotConfig, CarConfig, LapInfo, TrackConfig } from "@/types/game";
import { botUpdate, makeBotState, type BotState } from "@/lib/ai";
import {
  applyEngineForce,
  applySteering,
  checkLap,
  sampleKinematics,
} from "@/lib/physicsImpl";
import { gameStore } from "@/store/game";

interface BotControllerProps {
  readonly bodyRef: { readonly current: RapierRigidBody | null };
  readonly bot: BotConfig;
  readonly car: CarConfig;
  readonly track: TrackConfig;
  readonly enabled: boolean;
}

/** Drives a single bot using Misha's `botUpdate` AI helper. */
export function BotController({
  bodyRef,
  bot,
  car,
  track,
  enabled,
}: BotControllerProps) {
  const stateRef = useRef<BotState>(
    makeBotState({ startPos: [0, 0, 0], startWaypointIdx: 0 }),
  );
  const prevKinematicsRef = useRef<ReturnType<typeof sampleKinematics> | null>(null);
  const currentLapRef = useRef<LapInfo>({
    racerId: bot.id,
    lap: 1,
    time: 0,
    position: 1,
  });
  const raceStartRef = useRef<number | null>(null);

  useFrame((threeState, delta) => {
    const body = bodyRef.current;
    if (!body) return;

    const dt = Math.min(delta, 1 / 30);
    const kin = sampleKinematics(body);

    if (enabled) {
      const { controls, state } = botUpdate({
        bot,
        track,
        kinematics: kin,
        state: stateRef.current,
        dt,
      });
      stateRef.current = state;
      applyEngineForce({ body, car, controls, kinematics: kin, dt });
      applySteering({ body, car, controls, kinematics: kin, dt });

      if (raceStartRef.current === null) raceStartRef.current = threeState.clock.elapsedTime;
      const raceTime = threeState.clock.elapsedTime - raceStartRef.current;
      gameStore.setSpeed(bot.id, kin.speed);

      if (prevKinematicsRef.current) {
        const result = checkLap({
          racerId: bot.id,
          prevKinematics: prevKinematicsRef.current,
          kinematics: kin,
          startLine: track.startLine,
          currentLap: currentLapRef.current,
          raceTime,
          track,
        });
        currentLapRef.current = result.lapInfo;
        gameStore.setLap(bot.id, result.lapInfo);
        if (result.finished) {
          gameStore.setFinished(bot.id, raceTime);
        }
      }
    }

    prevKinematicsRef.current = kin;
  });

  return null;
}
