import type { TrackConfig, TrackSegment, Vec3 } from '@/types/game';

/**
 * Single MVP track: rounded oval, ~360m long, 12m wide.
 * Waypoints are placed counter-clockwise on the racing line (y=0 ground plane).
 * Bots use these directly via ai.botUpdate look-ahead.
 *
 * Layout (top-down, +x right, +z down):
 *
 *   ┌──────  6 ─ 5 ─ 4 ──────┐
 *   │ 7                    3 │
 *   │ 8                    2 │
 *   │ 9                    1 │
 *   └──────  10 ─ 11 ─ 0 ────┘    ← startLine between 0 and 11
 *
 * If you want a figure-8 later, swap this for a Catmull-Rom curve with a
 * crossover at (0, 0, 0); the contract (waypoints + width + startLine) stays.
 */
const WP: readonly Vec3[] = [
  [60, 0, 30], //  0  start
  [70, 0, 15], //  1
  [75, 0, 0], //   2
  [70, 0, -15], //  3
  [60, 0, -30], //  4
  [30, 0, -38], //  5
  [0, 0, -40], //   6  top straight mid
  [-30, 0, -38], // 7
  [-60, 0, -30], // 8
  [-75, 0, 0], //  9
  [-60, 0, 30], // 10
  [0, 0, 38], //  11
] as const;

const WIDTH = 12;

const segments: readonly TrackSegment[] = WP.map((from, i) => ({
  from,
  to: WP[(i + 1) % WP.length]!,
}));

export const track: TrackConfig = {
  id: 'oval-mvp',
  name: 'Скоростной овал',
  waypoints: WP,
  segments,
  width: WIDTH,
  startLine: {
    a: [60, 0, 38],
    b: [60, 0, 22],
    forward: [0, 0, -1],
  },
  laps: 3,
};
