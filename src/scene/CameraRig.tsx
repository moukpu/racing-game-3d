"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";

interface CameraRigProps {
  readonly target: { readonly current: RapierRigidBody | null };
  readonly distance?: number;
  readonly height?: number;
  readonly damp?: number;
}

const TMP_POS = new THREE.Vector3();
const TMP_LOOK = new THREE.Vector3();
const TMP_OFFSET = new THREE.Vector3();
const TMP_QUAT = new THREE.Quaternion();
const FORWARD = new THREE.Vector3(0, 0, -1);

/**
 * Smooth third-person chase camera. Reads the player's rigid body translation
 * + rotation every frame and lerps the camera toward a position behind the car
 * (relative to its yaw).
 *
 * `damp` is "1 - retention per frame at 60fps" — bigger = snappier.
 */
export function CameraRig({
  target,
  distance = 6.5,
  height = 3.0,
  damp = 0.08,
}: CameraRigProps) {
  const { camera } = useThree();
  const lookAtRef = useRef(new THREE.Vector3());

  useFrame(() => {
    const body = target.current;
    if (!body) return;
    const t = body.translation();
    const rot = body.rotation();
    TMP_QUAT.set(rot.x, rot.y, rot.z, rot.w);

    // Behind = -forward * distance, offset up.
    TMP_OFFSET.copy(FORWARD).applyQuaternion(TMP_QUAT).multiplyScalar(-distance);
    TMP_OFFSET.y += height;

    TMP_POS.set(t.x + TMP_OFFSET.x, t.y + TMP_OFFSET.y, t.z + TMP_OFFSET.z);
    camera.position.lerp(TMP_POS, damp);

    // Look slightly ahead of the car.
    TMP_LOOK.copy(FORWARD).applyQuaternion(TMP_QUAT).multiplyScalar(4);
    TMP_LOOK.set(t.x + TMP_LOOK.x, t.y + 0.8, t.z + TMP_LOOK.z);
    lookAtRef.current.lerp(TMP_LOOK, damp * 1.2);
    camera.lookAt(lookAtRef.current);
  });

  return null;
}
