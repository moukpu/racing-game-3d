"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import type { CarConfig, Vec3 } from "@/types/game";

export interface CarHandle {
  /** Rapier rigid body — null until first render. */
  readonly body: () => RapierRigidBody | null;
  /** Three.js Object3D for camera follow / debug. */
  readonly object: () => THREE.Object3D | null;
}

export interface CarVisualProps {
  readonly car: CarConfig;
  readonly position: Vec3;
  readonly yaw: number;
  readonly isPlayer?: boolean;
}

// Car body half-extents (x = width/2, y = height/2, z = length/2).
const CAR_HALF: Readonly<Vec3> = [0.9, 0.4, 2.0];
const WHEEL_RADIUS = 0.36;
const WHEEL_WIDTH = 0.28;

/**
 * Primitive low-poly car: chassis box, cabin trapezoid (compressed box),
 * 4 wheel cylinders, headlights & tail lights.
 * Stylized but proportionate — better than a flat cube; better than nothing.
 *
 * Physics: one CuboidCollider sized to CAR_HALF; wheels are visual-only
 * (we use arcade impulses in `physicsImpl.ts`, not wheel joints).
 */
export const Car = forwardRef<CarHandle, CarVisualProps>(function Car(
  { car, position, yaw, isPlayer = false },
  ref,
) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const objRef = useRef<THREE.Group>(null);

  useImperativeHandle(
    ref,
    () => ({
      body: () => bodyRef.current,
      object: () => objRef.current,
    }),
    [],
  );

  const tone = useMemo(() => {
    const base = new THREE.Color(car.color);
    const dim = base.clone().multiplyScalar(0.55);
    const trim = base.clone().offsetHSL(0, -0.2, -0.1);
    return {
      base: `#${base.getHexString()}`,
      dim: `#${dim.getHexString()}`,
      trim: `#${trim.getHexString()}`,
    };
  }, [car.color]);

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      mass={car.mass}
      position={[position[0], position[1] + CAR_HALF[1] + WHEEL_RADIUS, position[2]]}
      rotation={[0, yaw, 0]}
      linearDamping={0.35}
      angularDamping={1.2}
      enabledRotations={[false, true, false]}
      type="dynamic"
      ccd
    >
      <CuboidCollider
        args={[CAR_HALF[0], CAR_HALF[1], CAR_HALF[2]]}
        friction={1.6}
        restitution={0.15}
      />
      <group ref={objRef}>
        {/* Chassis */}
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[CAR_HALF[0] * 2, CAR_HALF[1] * 2 * 0.7, CAR_HALF[2] * 2]} />
          <meshStandardMaterial
            color={tone.base}
            metalness={0.55}
            roughness={0.35}
            emissive={isPlayer ? tone.base : "#000000"}
            emissiveIntensity={isPlayer ? 0.05 : 0}
          />
        </mesh>
        {/* Cabin */}
        <mesh castShadow position={[0, CAR_HALF[1] * 0.95, -0.15]}>
          <boxGeometry args={[CAR_HALF[0] * 1.5, CAR_HALF[1] * 1.0, CAR_HALF[2] * 1.05]} />
          <meshStandardMaterial color="#0d0d12" metalness={0.7} roughness={0.25} />
        </mesh>
        {/* Spoiler */}
        <mesh castShadow position={[0, CAR_HALF[1] * 0.85, CAR_HALF[2] - 0.05]}>
          <boxGeometry args={[CAR_HALF[0] * 1.85, 0.08, 0.35]} />
          <meshStandardMaterial color={tone.trim} metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Headlights */}
        <mesh position={[-CAR_HALF[0] * 0.55, 0.0, -CAR_HALF[2] - 0.01]}>
          <boxGeometry args={[0.35, 0.16, 0.05]} />
          <meshStandardMaterial color="#ffe9b0" emissive="#fff6cf" emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[CAR_HALF[0] * 0.55, 0.0, -CAR_HALF[2] - 0.01]}>
          <boxGeometry args={[0.35, 0.16, 0.05]} />
          <meshStandardMaterial color="#ffe9b0" emissive="#fff6cf" emissiveIntensity={1.6} />
        </mesh>
        {/* Tail lights */}
        <mesh position={[-CAR_HALF[0] * 0.55, 0.05, CAR_HALF[2] + 0.01]}>
          <boxGeometry args={[0.35, 0.13, 0.04]} />
          <meshStandardMaterial color="#ff2a2a" emissive="#ff5050" emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[CAR_HALF[0] * 0.55, 0.05, CAR_HALF[2] + 0.01]}>
          <boxGeometry args={[0.35, 0.13, 0.04]} />
          <meshStandardMaterial color="#ff2a2a" emissive="#ff5050" emissiveIntensity={1.2} />
        </mesh>
        {/* Wheels (visual only) */}
        {(
          [
            [-CAR_HALF[0] - 0.02, -CAR_HALF[1] + 0.05, -CAR_HALF[2] + 0.5],
            [CAR_HALF[0] + 0.02, -CAR_HALF[1] + 0.05, -CAR_HALF[2] + 0.5],
            [-CAR_HALF[0] - 0.02, -CAR_HALF[1] + 0.05, CAR_HALF[2] - 0.5],
            [CAR_HALF[0] + 0.02, -CAR_HALF[1] + 0.05, CAR_HALF[2] - 0.5],
          ] as const
        ).map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 14]} />
            <meshStandardMaterial color="#0e0e12" roughness={0.85} metalness={0.1} />
          </mesh>
        ))}
        {/* Driver-side mini-arrow on roof, helps player identify themselves */}
        {isPlayer && (
          <mesh position={[0, CAR_HALF[1] * 1.55, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.22, 0.4, 4]} />
            <meshStandardMaterial
              color="#9aff66"
              emissive="#76ff33"
              emissiveIntensity={1.4}
            />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
});

export { CAR_HALF };
