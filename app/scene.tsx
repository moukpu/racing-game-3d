"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import { Suspense } from "react";

function SpinningCube() {
  return (
    <RigidBody colliders="cuboid" restitution={0.4}>
      <mesh castShadow position={[0, 2, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff3b30" />
      </mesh>
    </RigidBody>
  );
}

function Ground() {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[20, 1, 20]} />
        <meshStandardMaterial color="#1f1f24" />
      </mesh>
    </RigidBody>
  );
}

export default function Scene() {
  return (
    <Canvas shadows camera={{ position: [4, 4, 6], fov: 50 }}>
      <color attach="background" args={["#07070b"]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[5, 8, 5]}
        intensity={1.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]}>
          <SpinningCube />
          <Ground />
        </Physics>
      </Suspense>
      <OrbitControls />
    </Canvas>
  );
}
