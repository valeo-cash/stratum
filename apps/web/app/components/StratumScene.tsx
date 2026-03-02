"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, invalidate } from "@react-three/fiber";
import * as THREE from "three";

const DOT_COUNT = 300;
const DOT_RADIUS = 0.035;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function generatePositions() {
  const chaos: THREE.Vector3[] = [];
  const organized: THREE.Vector3[] = [];
  const compressed: THREE.Vector3[] = [];
  const slab: THREE.Vector3[] = [];

  for (let i = 0; i < DOT_COUNT; i++) {
    const r1 = seededRandom(i * 3);
    const r2 = seededRandom(i * 3 + 1);
    const r3 = seededRandom(i * 3 + 2);

    const theta = r1 * Math.PI * 2;
    const phi = Math.acos(2 * r2 - 1);
    const radius = 2.8 * Math.cbrt(r3);
    chaos.push(new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    ));

    const cols = 18;
    const row = Math.floor(i / cols);
    const col = i % cols;
    organized.push(new THREE.Vector3(
      (col - cols / 2) * 0.18,
      (row - Math.floor(DOT_COUNT / cols) / 2) * 0.18,
      0,
    ));

    const visibleCount = Math.floor(DOT_COUNT * 0.12);
    if (i < visibleCount) {
      const a = seededRandom(i * 11) * Math.PI * 2;
      const cr = 0.5 * Math.sqrt(seededRandom(i * 13));
      compressed.push(new THREE.Vector3(cr * Math.cos(a), cr * Math.sin(a), 0));
    } else {
      compressed.push(new THREE.Vector3(
        organized[i].x * 0.05,
        organized[i].y * 0.05,
        12,
      ));
    }

    const sC = 20, sR = 5;
    const sL = Math.ceil(DOT_COUNT / (sC * sR));
    const sp = DOT_RADIUS * 2.8;
    const li = Math.floor(i / (sC * sR));
    const si = i % (sC * sR);
    const sr = Math.floor(si / sC);
    const sc = si % sC;
    slab.push(new THREE.Vector3(
      (sc - (sC - 1) / 2) * sp,
      (sr - (sR - 1) / 2) * sp,
      (li - (sL - 1) / 2) * sp,
    ));
  }

  return { chaos, organized, compressed, slab };
}

function Dots({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const positions = useMemo(() => generatePositions(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastProgress = useRef(-1);

  useFrame(() => {
    if (!meshRef.current) return;
    if (Math.abs(progress - lastProgress.current) < 0.0001) return;
    lastProgress.current = progress;

    for (let i = 0; i < DOT_COUNT; i++) {
      let from: THREE.Vector3;
      let to: THREE.Vector3;
      let t: number;
      let scale = 1;

      if (progress < 0.3) {
        from = positions.chaos[i];
        to = positions.organized[i];
        t = progress / 0.3;
      } else if (progress < 0.55) {
        from = positions.organized[i];
        to = positions.compressed[i];
        t = (progress - 0.3) / 0.25;
        const visible = Math.floor(DOT_COUNT * 0.12);
        if (i >= visible) scale = 1 - t;
      } else {
        from = positions.compressed[i];
        to = positions.slab[i];
        t = Math.min((progress - 0.55) / 0.35, 1);
        const visible = Math.floor(DOT_COUNT * 0.12);
        if (i >= visible) scale = t;
      }

      const eased = 1 - Math.pow(1 - Math.min(t, 1), 3);
      dummy.position.lerpVectors(from, to, eased);
      dummy.scale.setScalar(Math.max(scale, 0.001));
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const opacity = progress < 0.55 ? 0.5 : 0.5 + (progress - 0.55) * 0.6;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DOT_COUNT]}>
      <sphereGeometry args={[DOT_RADIUS, 8, 8]} />
      <meshBasicMaterial color="#003FFF" transparent opacity={Math.min(opacity, 0.85)} />
    </instancedMesh>
  );
}

function GlowSlab({ progress }: { progress: number }) {
  const opacity = progress > 0.78 ? Math.min((progress - 0.78) / 0.12, 1) * 0.1 : 0;
  if (opacity < 0.001) return null;

  const sp = DOT_RADIUS * 2.8;
  const w = 19 * sp + DOT_RADIUS * 4;
  const h = 4 * sp + DOT_RADIUS * 4;
  const d = 2 * sp + DOT_RADIUS * 4;

  return (
    <mesh>
      <boxGeometry args={[w, h, d]} />
      <meshBasicMaterial color="#3B82F6" transparent opacity={opacity} />
    </mesh>
  );
}

export default function StratumScene({ progress }: { progress: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
      dpr={[1, 1.5]}
    >
      <group rotation={[0.15, -0.2, 0]}>
        <Dots progress={progress} />
        <GlowSlab progress={progress} />
      </group>
    </Canvas>
  );
}
