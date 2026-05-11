'use client';

import { useEffect, useRef } from 'react';
import type { CarControls } from '@/lib/physics';

/**
 * Keyboard layout:
 *   ArrowUp    / W  → throttle
 *   ArrowDown  / S  → brake (also reverse if speed ≈ 0; handled in physics)
 *   ArrowLeft  / A  → steer left   (-1)
 *   ArrowRight / D  → steer right  (+1)
 *   Space            → handbrake
 *
 * The hook returns a ref to a mutable CarControls object updated on
 * keydown / keyup. We intentionally avoid React state to keep this on the
 * game loop's tight per-frame path — read via `controlsRef.current` inside
 * useFrame.
 */

const KEYS = {
  throttle: new Set(['ArrowUp', 'KeyW']),
  brake: new Set(['ArrowDown', 'KeyS']),
  left: new Set(['ArrowLeft', 'KeyA']),
  right: new Set(['ArrowRight', 'KeyD']),
  handbrake: new Set(['Space']),
} as const;

export interface UseKeyboardControlsOptions {
  /** If false, keys are ignored (use during 'menu' / 'finished'). */
  readonly enabled?: boolean;
}

export function useKeyboardControls(
  options: UseKeyboardControlsOptions = {},
): React.MutableRefObject<CarControls> {
  const { enabled = true } = options;

  const controlsRef = useRef<CarControls>({
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
  });

  // Track raw key state to derive analog steer / throttle (mirror keys average to 0).
  const pressedRef = useRef({ up: false, down: false, left: false, right: false, space: false });

  useEffect(() => {
    if (!enabled) {
      controlsRef.current = { throttle: 0, brake: 0, steer: 0, handbrake: false };
      return;
    }

    const recompute = () => {
      const p = pressedRef.current;
      controlsRef.current = {
        throttle: p.up ? 1 : 0,
        brake: p.down ? 1 : 0,
        steer: (p.right ? 1 : 0) - (p.left ? 1 : 0),
        handbrake: p.space,
      };
    };

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      const p = pressedRef.current;
      if (KEYS.throttle.has(e.code)) p.up = down;
      else if (KEYS.brake.has(e.code)) p.down = down;
      else if (KEYS.left.has(e.code)) p.left = down;
      else if (KEYS.right.has(e.code)) p.right = down;
      else if (KEYS.handbrake.has(e.code)) p.space = down;
      else return;
      // Prevent page scroll on arrow / space while in game.
      e.preventDefault();
      recompute();
    };

    const onDown = onKey(true);
    const onUp = onKey(false);
    window.addEventListener('keydown', onDown, { passive: false });
    window.addEventListener('keyup', onUp, { passive: false });
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [enabled]);

  return controlsRef;
}
