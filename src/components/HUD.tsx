"use client";

import { SpeedoMeter } from "./ui/SpeedoMeter";
import { LapCounter } from "./ui/LapCounter";
import { useGameStore } from "@/store/game";
import { carsById } from "@/content/cars";

const MPS_TO_KMH = 3.6;
const PLAYER_ID = "player";

/**
 * Game HUD — speed (bottom-right) + lap/position (top-right) overlay.
 * Reads only the player row from the store; updates ~5×/s via the
 * PositionsTicker.notify() inside the scene.
 */
export function HUD() {
  const player = useGameStore(
    (s) => s.racers.find((r) => r.id === PLAYER_ID) ?? null,
  );
  const totalLaps = useGameStore((s) => s.track.laps);
  const totalRacers = useGameStore((s) => s.racers.length);

  if (!player) return null;
  const car = carsById[player.carId] ?? carsById["cabriolet"]!;

  return (
    <div
      aria-hidden={false}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        padding: "var(--space-5)",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-4)",
        zIndex: 10,
      }}
    >
      {/* Top-right: lap counter */}
      <div style={{ gridColumn: "2", gridRow: "1", justifySelf: "end" }}>
        <LapCounter
          currentLap={player.lap.lap}
          totalLaps={totalLaps}
          position={player.lap.position}
          totalRacers={totalRacers}
        />
      </div>

      {/* Bottom-right: speedometer */}
      <div style={{ gridColumn: "2", gridRow: "3", justifySelf: "end" }}>
        <SpeedoMeter
          speed={player.speed * MPS_TO_KMH}
          maxSpeed={car.maxSpeed * MPS_TO_KMH}
          unit="KM/H"
        />
      </div>

      {/* Bottom-left: control hint */}
      <div
        style={{
          gridColumn: "1",
          gridRow: "3",
          alignSelf: "end",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--fs-2xs)",
          color: "var(--color-text-muted)",
          letterSpacing: "var(--tracking-wider)",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        WASD / arrows · space = handbrake
      </div>
    </div>
  );
}
