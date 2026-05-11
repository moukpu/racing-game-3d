"use client";

import { useEffect, useMemo } from "react";
import { cars } from "@/content/cars";
import { gameStore, useGameStore } from "@/store/game";
import { CountdownOverlay } from "./ui/CountdownOverlay";
import { FinishOverlay, type FinishResultRow } from "./ui/FinishOverlay";
import { StartMenu } from "./ui/StartMenu";
import { HUD } from "./HUD";
import { GameCanvas } from "@/scene/GameCanvas";

/**
 * Top-level UI orchestrator. Renders the 3D scene + DOM overlays
 * according to `gameStore.state`:
 *
 *   menu       → <StartMenu/>
 *   countdown  → 3 / 2 / 1 / GO (over the canvas)
 *   racing     → HUD over canvas
 *   finished   → <FinishOverlay/> over canvas
 */
export function GameFlow() {
  const state = useGameStore((s) => s.state);
  const countdown = useGameStore((s) => s.countdown);
  const selectedCarId = useGameStore((s) => s.selectedCarId);
  const racers = useGameStore((s) => s.racers);
  const totalLaps = useGameStore((s) => s.track.laps);

  // Countdown driver — 3, 2, 1, GO, then racing.
  useEffect(() => {
    if (state !== "countdown") return;
    let cancelled = false;
    const tick = (v: number | "GO" | null, after: number, next: () => void) => {
      if (cancelled) return;
      gameStore.setCountdown(v);
      window.setTimeout(() => {
        if (!cancelled) next();
      }, after);
    };
    tick(3, 900, () =>
      tick(2, 900, () =>
        tick(1, 900, () =>
          tick("GO", 600, () => {
            if (cancelled) return;
            gameStore.setCountdown(null);
            gameStore.setState("racing");
          }),
        ),
      ),
    );
    return () => {
      cancelled = true;
    };
  }, [state]);

  // Auto-finish when player or everyone reached finished status, plus 3s grace.
  useEffect(() => {
    if (state !== "racing") return;
    const player = racers.find((r) => r.id === "player");
    if (!player) return;
    if (player.finishedAt !== null) {
      const t = window.setTimeout(() => {
        gameStore.setState("finished");
      }, 2500);
      return () => window.clearTimeout(t);
    }
  }, [state, racers]);

  const finishResults: FinishResultRow[] = useMemo(() => {
    // For results, sort by finishedAt asc (finished first), then by lap desc / time desc.
    const sorted = [...racers].sort((a, b) => {
      if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
      if (a.finishedAt !== null) return -1;
      if (b.finishedAt !== null) return 1;
      if (a.lap.lap !== b.lap.lap) return b.lap.lap - a.lap.lap;
      return b.lap.time - a.lap.time;
    });
    return sorted.map((r, i) => ({
      position: i + 1,
      name: r.kind === "player" ? "You" : r.name,
      time: r.finishedAt !== null ? formatTime(r.finishedAt) : `—`,
      bestLap: r.lap.bestLapTime !== undefined ? formatTime(r.lap.bestLapTime) : undefined,
      isPlayer: r.kind === "player",
    }));
  }, [racers]);

  return (
    <>
      {/* 3D world stays mounted; we toggle controllers via `enabled` */}
      {state !== "menu" && (
        <div style={{ position: "fixed", inset: 0 }}>
          <GameCanvas />
        </div>
      )}

      {state === "menu" && (
        <StartMenu
          cars={cars}
          selectedCarId={selectedCarId}
          onSelectCar={(id) => gameStore.setSelectedCar(id)}
          onStart={() => {
            gameStore.resetRace();
            gameStore.setState("countdown");
          }}
        />
      )}

      {state === "countdown" && <CountdownOverlay value={countdown ?? null} />}

      {state === "racing" && <HUD />}

      {state === "finished" && (
        <>
          <HUD />
          <FinishOverlay
            results={finishResults}
            title={`Race finished — ${totalLaps} laps`}
            onRestart={() => {
              gameStore.resetRace();
              gameStore.setState("countdown");
            }}
            onExit={() => {
              gameStore.resetRace();
              gameStore.setState("menu");
            }}
          />
        </>
      )}
    </>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}
