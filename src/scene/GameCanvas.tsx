"use client";

import { forwardRef, Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import { Physics, type RapierRigidBody } from "@react-three/rapier";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

import { bots } from "@/content/bots";
import { carsById } from "@/content/cars";
import type { CarConfig, Vec3 } from "@/types/game";
import { useGameStore } from "@/store/game";

import { Track } from "./Track";
import { Car, type CarHandle } from "./Car";
import { PlayerController } from "./PlayerController";
import { BotController } from "./BotController";
import { CameraRig } from "./CameraRig";
import { PositionsTicker } from "./PositionsTicker";

const PLAYER_RACER_ID = "player";

/**
 * Root <Canvas>. Mounted once at scene boot; never re-mounts on game-state
 * changes (we toggle `enabled` flags inside controllers instead). That keeps
 * the Physics world hot and avoids ~1s respawn freezes between menu/race.
 */
export function GameCanvas() {
  const track = useGameStore((s) => s.track);
  const selectedCarId = useGameStore((s) => s.selectedCarId);
  const gameState = useGameStore((s) => s.state);

  const playerCar: CarConfig = carsById[selectedCarId] ?? carsById["cabriolet"]!;
  const playerRef = useRef<CarHandle>(null);
  // Refs to all bot bodies (stable per-bot).
  const botRefs = useRef<Record<string, CarHandle | null>>({});

  const enabledRacing = gameState === "racing";

  // Player starts at startLine.b (pole position), bots stagger behind.
  const grid = useMemo(() => {
    const a = track.startLine.a;
    const b = track.startLine.b;
    const midX = (a[0] + b[0]) / 2;
    const midZ = (a[2] + b[2]) / 2;
    // Forward into the track (race direction).
    const fwd = track.startLine.forward;
    // Right vector (perpendicular to forward, in XZ).
    const rx = fwd[2];
    const rz = -fwd[0];
    const ROW_SPACING = 3.2;
    const COL_SPACING = 2.2;

    const spots: { pos: Vec3; yaw: number }[] = [];
    const racers = 1 + bots.length;
    const yaw = Math.atan2(fwd[0], fwd[2]);
    for (let i = 0; i < racers; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2 === 0 ? -1 : 1;
      const offsetFwd = -row * ROW_SPACING - 1; // negative = behind line into start area
      const offsetRight = col * COL_SPACING * 0.5;
      const x = midX + fwd[0] * offsetFwd + rx * offsetRight;
      const z = midZ + fwd[2] * offsetFwd + rz * offsetRight;
      spots.push({ pos: [x, 0.0, z], yaw });
    }
    return spots;
  }, [track]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [grid[0]!.pos[0] - 6, 4, grid[0]!.pos[2] + 6], fov: 58 }}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
    >
      <color attach="background" args={["#0a0c12"]} />
      <fog attach="fog" args={["#0a0c12", 80, 220]} />

      {/* Sky / sun */}
      <Sky
        distance={4500}
        sunPosition={[120, 60, 80]}
        inclination={0.45}
        azimuth={0.25}
        turbidity={8}
        rayleigh={1.5}
      />

      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#bcd4ff", "#1a221a", 0.55]} />
      <directionalLight
        castShadow
        position={[60, 70, 30]}
        intensity={1.8}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0005}
      />

      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} timeStep="vary">
          <Track track={track} />

          {/* Player */}
          <Car
            ref={playerRef}
            car={playerCar}
            position={grid[0]!.pos}
            yaw={grid[0]!.yaw}
            isPlayer
          />
          <PlayerControllerBridge
            handle={playerRef}
            car={playerCar}
            enabled={enabledRacing}
          />

          {/* Bots */}
          {bots.map((bot, i) => {
            const spot = grid[i + 1] ?? grid[0]!;
            const car = carsById[bot.carId] ?? carsById["cabriolet"]!;
            return (
              <BotSpawn
                key={bot.id}
                ref={(h) => {
                  botRefs.current[bot.id] = h;
                }}
                car={car}
                botId={bot.id}
                position={spot.pos}
                yaw={spot.yaw}
              />
            );
          })}
          {bots.map((bot) => (
            <BotControllerBridge
              key={`ctrl-${bot.id}`}
              bot={bot}
              car={carsById[bot.carId] ?? carsById["cabriolet"]!}
              handleRef={{ get: () => botRefs.current[bot.id] ?? null }}
              enabled={enabledRacing}
            />
          ))}

          {/* Re-rank positions every ~250ms */}
          <PositionsTicker active={enabledRacing} />
        </Physics>

        <CameraRigBridge handle={playerRef} />
      </Suspense>

      <EffectComposer multisampling={4} enableNormalPass>
        <Bloom intensity={0.35} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}

/* ─────────────── small bridges: pass body refs into controllers ─────────────── */

interface CarHandleRef {
  readonly current: CarHandle | null;
}

function PlayerControllerBridge({
  handle,
  car,
  enabled,
}: {
  readonly handle: CarHandleRef;
  readonly car: CarConfig;
  readonly enabled: boolean;
}) {
  const track = useGameStore((s) => s.track);
  // Bridge: PlayerController needs a body ref, but CarHandle is a method-bag.
  // Build a stable proxy ref that returns body on access.
  const bodyRef = useMemo(
    () =>
      ({
        get current(): RapierRigidBody | null {
          return handle.current?.body() ?? null;
        },
      }) satisfies { current: RapierRigidBody | null },
    [handle],
  );
  return (
    <PlayerController
      bodyRef={bodyRef}
      car={car}
      track={track}
      racerId={PLAYER_RACER_ID}
      enabled={enabled}
    />
  );
}

function BotControllerBridge({
  bot,
  car,
  handleRef,
  enabled,
}: {
  readonly bot: (typeof bots)[number];
  readonly car: CarConfig;
  readonly handleRef: { get: () => CarHandle | null };
  readonly enabled: boolean;
}) {
  const track = useGameStore((s) => s.track);
  const bodyRef = useMemo(
    () =>
      ({
        get current(): RapierRigidBody | null {
          return handleRef.get()?.body() ?? null;
        },
      }) satisfies { current: RapierRigidBody | null },
    [handleRef],
  );
  return (
    <BotController
      bodyRef={bodyRef}
      bot={bot}
      car={car}
      track={track}
      enabled={enabled}
    />
  );
}

function CameraRigBridge({ handle }: { readonly handle: CarHandleRef }) {
  const bodyRef = useMemo(
    () =>
      ({
        get current(): RapierRigidBody | null {
          return handle.current?.body() ?? null;
        },
      }) satisfies { current: RapierRigidBody | null },
    [handle],
  );
  return <CameraRig target={bodyRef} />;
}

/* ─────────────── bot spawn — wraps <Car> so we can imperatively expose handle ─────────────── */

interface BotSpawnProps {
  readonly car: CarConfig;
  readonly position: Vec3;
  readonly yaw: number;
  readonly botId: string;
}

const BotSpawn = forwardRef<CarHandle, BotSpawnProps>(function BotSpawn(
  { car, position, yaw },
  ref,
) {
  return (
    <Car
      ref={(h) => {
        if (typeof ref === "function") ref(h);
        else if (ref) (ref as { current: CarHandle | null }).current = h;
      }}
      car={car}
      position={position}
      yaw={yaw}
    />
  );
});
