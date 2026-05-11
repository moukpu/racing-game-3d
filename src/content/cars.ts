import type { CarConfig } from '@/types/game';

/**
 * Three preset cars, balanced rock-paper-scissors:
 *   bolid       — top-speed/accel, light, fragile (low brake).
 *   cabriolet   — all-rounder, mid-weight.
 *   muscle      — heavy & punchy off the line, low top speed, late braker.
 *
 * Numbers are tuned for Rapier with 1 unit = 1 meter; maxSpeed in m/s
 * (≈ 360 km/h for bolid, ≈ 252 km/h for cabrio, ≈ 216 km/h for muscle).
 */
export const cars: readonly CarConfig[] = [
  {
    id: 'bolid',
    name: 'Болид',
    mass: 700,
    maxSpeed: 100,
    accel: 18,
    color: '#ff2d2d',
    modelUrl: null,
    steeringAngleRad: 0.55,
    brakeForce: 12000,
    dragCoeff: 0.28,
  },
  {
    id: 'cabriolet',
    name: 'Кабриолет',
    mass: 1100,
    maxSpeed: 70,
    accel: 11,
    color: '#3aa1ff',
    modelUrl: null,
    steeringAngleRad: 0.6,
    brakeForce: 16000,
    dragCoeff: 0.32,
  },
  {
    id: 'muscle',
    name: 'Маслкар',
    mass: 1500,
    maxSpeed: 60,
    accel: 14,
    color: '#ffb300',
    modelUrl: null,
    steeringAngleRad: 0.5,
    brakeForce: 22000,
    dragCoeff: 0.42,
  },
] as const;

export const carsById: Readonly<Record<string, CarConfig>> = Object.freeze(
  Object.fromEntries(cars.map((c) => [c.id, c])),
);

export const defaultCarId = 'cabriolet' as const;
