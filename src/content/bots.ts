import type { BotConfig } from '@/types/game';

/**
 * Three bots covering the difficulty spectrum.
 * `aggression` scales engine force in ai.botUpdate; `lookAheadM` scales
 * waypoint look-ahead (more = smoother but later braking).
 * Waypoints are inherited from the active TrackConfig unless overridden here
 * (we keep that empty in MVP so all bots run the same line; hard bot can
 * later get a tighter racing-line via an explicit waypoints array).
 */
export const bots: readonly BotConfig[] = [
  {
    id: 'novice',
    name: 'Новичок',
    difficulty: 'easy',
    carId: 'cabriolet',
    aggression: 0.55,
    lookAheadM: 18,
  },
  {
    id: 'rival',
    name: 'Соперник',
    difficulty: 'normal',
    carId: 'cabriolet',
    aggression: 0.8,
    lookAheadM: 14,
  },
  {
    id: 'champion',
    name: 'Чемпион',
    difficulty: 'hard',
    carId: 'bolid',
    aggression: 1.0,
    lookAheadM: 10,
  },
] as const;

export const botsById: Readonly<Record<string, BotConfig>> = Object.freeze(
  Object.fromEntries(bots.map((b) => [b.id, b])),
);
