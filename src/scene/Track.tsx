"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { TrackConfig } from "@/types/game";

interface TrackProps {
  readonly track: TrackConfig;
}

const ROAD_SAMPLES = 240;
const ROAD_Y = 0.02;
const KERB_OFFSET = 0.4;
const KERB_Y = 0.05;
const GRASS_SIZE = 240;

/**
 * Road geometry: ribbon lofted along a closed Catmull-Rom curve through the
 * configured waypoints. Width comes from `track.width`. Kerbs are striped
 * ribbons offset to either side; grass is a large plane underneath.
 *
 * Static colliders use a cuboid for the central ground plane only — cars are
 * kept on the track by physics friction + AI/player input rather than walls.
 * The track has invisible side-walls to stop catastrophic flyaways.
 */
function buildRoadGeometry(track: TrackConfig): THREE.BufferGeometry {
  const pts = track.waypoints.map(([x, , z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.4);

  const positions: number[] = [];
  const uvs: number[] = [];
  const half = track.width / 2;

  for (let i = 0; i <= ROAD_SAMPLES; i++) {
    const t = (i % ROAD_SAMPLES) / ROAD_SAMPLES;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    // Perpendicular in XZ plane.
    const rx = tan.z;
    const rz = -tan.x;
    positions.push(p.x - rx * half, ROAD_Y, p.z - rz * half);
    positions.push(p.x + rx * half, ROAD_Y, p.z + rz * half);
    const v = t * 40;
    uvs.push(0, v, 1, v);
  }

  const indices: number[] = [];
  for (let i = 0; i < ROAD_SAMPLES; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2);
    indices.push(a + 1, a + 3, a + 2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function buildKerbGeometry(
  track: TrackConfig,
  side: "left" | "right",
): THREE.BufferGeometry {
  const pts = track.waypoints.map(([x, , z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, "catmullrom", 0.4);
  const positions: number[] = [];
  const uvs: number[] = [];
  const half = track.width / 2;
  const sign = side === "right" ? 1 : -1;

  for (let i = 0; i <= ROAD_SAMPLES; i++) {
    const t = (i % ROAD_SAMPLES) / ROAD_SAMPLES;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const rx = tan.z * sign;
    const rz = -tan.x * sign;
    positions.push(p.x + rx * half, KERB_Y, p.z + rz * half);
    positions.push(p.x + rx * (half + KERB_OFFSET), KERB_Y, p.z + rz * (half + KERB_OFFSET));
    const u = t * ROAD_SAMPLES * 0.5;
    uvs.push(u, 0, u, 1);
  }

  const indices: number[] = [];
  for (let i = 0; i < ROAD_SAMPLES; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function buildKerbStripeTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 8;
  const ctx = c.getContext("2d")!;
  const stripe = 16;
  for (let x = 0; x < c.width; x += stripe) {
    ctx.fillStyle = (x / stripe) % 2 === 0 ? "#ffffff" : "#d92424";
    ctx.fillRect(x, 0, stripe, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function buildAsphaltTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  // Base dark gray.
  ctx.fillStyle = "#1c1c20";
  ctx.fillRect(0, 0, c.width, c.height);
  // Pebble noise.
  const img = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 26;
    img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n));
    img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1]! + n));
    img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);
  // Center white dashes.
  ctx.fillStyle = "#f1ede0";
  for (let y = 16; y < c.height; y += 64) {
    ctx.fillRect(c.width / 2 - 3, y, 6, 28);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.anisotropy = 8;
  return tex;
}

function buildGrassTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1b2a16";
  ctx.fillRect(0, 0, c.width, c.height);
  // Speckles to break flatness.
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const l = 20 + Math.random() * 40;
    ctx.fillStyle = `rgba(${30 + l}, ${50 + l}, ${20 + l}, 0.6)`;
    ctx.fillRect(x, y, 1, 1 + Math.random() * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(GRASS_SIZE / 8, GRASS_SIZE / 8);
  tex.anisotropy = 4;
  return tex;
}

export function Track({ track }: TrackProps) {
  const roadGeo = useMemo(() => buildRoadGeometry(track), [track]);
  const kerbLeft = useMemo(() => buildKerbGeometry(track, "left"), [track]);
  const kerbRight = useMemo(() => buildKerbGeometry(track, "right"), [track]);
  const asphalt = useMemo(buildAsphaltTexture, []);
  const grass = useMemo(buildGrassTexture, []);
  const kerb = useMemo(buildKerbStripeTexture, []);

  // Start line: a thin checkered rectangle between startLine.a and .b.
  const startLineEl = useMemo(() => {
    const ax = track.startLine.a[0];
    const az = track.startLine.a[2];
    const bx = track.startLine.b[0];
    const bz = track.startLine.b[2];
    const mid: [number, number, number] = [(ax + bx) / 2, 0.04, (az + bz) / 2];
    const width = Math.hypot(bx - ax, bz - az);
    const height = 1.6;
    const angleY = Math.atan2(bz - az, bx - ax);
    return { mid, width, height, angleY };
  }, [track.startLine]);

  const startTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 16;
    const ctx = c.getContext("2d")!;
    const sq = 8;
    for (let y = 0; y < c.height; y += sq) {
      for (let x = 0; x < c.width; x += sq) {
        const on = (x / sq + y / sq) % 2 === 0;
        ctx.fillStyle = on ? "#fafaf6" : "#0c0c10";
        ctx.fillRect(x, y, sq, sq);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 1);
    tex.anisotropy = 8;
    return tex;
  }, []);

  return (
    <group>
      {/* Grass — physics ground + visuals */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[GRASS_SIZE / 2, 0.5, GRASS_SIZE / 2]}
          position={[0, -0.5, 0]}
          friction={0.9}
        />
        <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[GRASS_SIZE, GRASS_SIZE]} />
          <meshStandardMaterial map={grass} color="#5a7c3c" roughness={1} />
        </mesh>
      </RigidBody>

      {/* Road ribbon */}
      <mesh receiveShadow geometry={roadGeo}>
        <meshStandardMaterial map={asphalt} color="#2a2a30" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Kerbs (visual only — no collider, they're decorative edges) */}
      <mesh geometry={kerbLeft}>
        <meshStandardMaterial map={kerb} roughness={0.6} />
      </mesh>
      <mesh geometry={kerbRight}>
        <meshStandardMaterial map={kerb} roughness={0.6} />
      </mesh>

      {/* Start line */}
      <mesh
        position={startLineEl.mid}
        rotation={[-Math.PI / 2, 0, -startLineEl.angleY + Math.PI / 2]}
        receiveShadow
      >
        <planeGeometry args={[startLineEl.width, startLineEl.height]} />
        <meshStandardMaterial map={startTex} roughness={0.7} />
      </mesh>

      {/* Decor: lightposts every Nth waypoint */}
      {track.waypoints.map((wp, i) =>
        i % 2 === 0 ? <LightPost key={i} x={wp[0]} z={wp[2]} dirOut={1} /> : null,
      )}
    </group>
  );
}

function LightPost({ x, z, dirOut }: { x: number; z: number; dirOut: number }) {
  const offset = 12;
  const sign = Math.sign(x || dirOut);
  return (
    <group position={[x + sign * offset, 0, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.18, 4, 8]} />
        <meshStandardMaterial color="#1a1a20" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial
          color="#fff7c0"
          emissive="#ffd97a"
          emissiveIntensity={2}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
