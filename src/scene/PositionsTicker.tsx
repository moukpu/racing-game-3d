"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { gameStore } from "@/store/game";

/**
 * Recomputes racer positions (1st/2nd/3rd...) every ~250ms while racing
 * and pushes a notify() so HUD re-renders.
 *
 * Running this from inside <Physics> is intentional — `useFrame` is paused
 * when the canvas is hidden / unmounted, so this is auto-paused too.
 */
export function PositionsTicker({ active }: { readonly active: boolean }) {
  const acc = useRef(0);
  useFrame((_, delta) => {
    if (!active) return;
    acc.current += delta;
    if (acc.current < 0.25) return;
    acc.current = 0;
    gameStore.recomputePositions();
    gameStore.notify();
  });
  return null;
}
