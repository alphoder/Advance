"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

/**
 * Site-wide backdrop: wireframe Monad blocks drifting left to right like a chain being produced.
 * Fixed behind all content, never intercepts input.
 */
const COUNT = 34;

function Blocks({ animate }: { animate: boolean }) {
  const blocks = useMemo(() => {
    // Deterministic layout so the backdrop doesn't jump between pages.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: COUNT }, (_, i) => ({
      x: -14 + (i / COUNT) * 28 + rnd() * 1.5,
      y: (rnd() - 0.5) * 14,
      z: -2 - rnd() * 7,
      s: 0.3 + rnd() * 0.55,
      rx: rnd() * Math.PI,
      ry: rnd() * Math.PI,
      speed: 0.18 + rnd() * 0.22,
      spin: (rnd() - 0.5) * 0.5,
      tint: i % 7 === 0 ? "#e2725b" : "#836ef9",
    }));
  }, []);
  const group = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    if (!group.current || !animate) return;
    const d = Math.min(dt, 0.05);
    group.current.children.forEach((m, i) => {
      const b = blocks[i];
      m.position.x += d * b.speed; // a new Monad block every ~0.4s: the chain keeps moving
      m.rotation.x += d * b.spin;
      m.rotation.y += d * b.spin * 0.8;
      if (m.position.x > 15) m.position.x = -15;
    });
    // Gentle parallax toward the pointer.
    state.camera.position.x += (state.pointer.x * 0.6 - state.camera.position.x) * 0.02;
    state.camera.position.y += (state.pointer.y * 0.4 - state.camera.position.y) * 0.02;
  });
  return (
    <group ref={group}>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]} rotation={[b.rx, b.ry, 0]} scale={b.s}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={b.tint} transparent opacity={0.035} depthWrite={false} />
          <Edges color={b.tint} threshold={15} />
        </mesh>
      ))}
    </group>
  );
}

export default function BlocksBackground({ reduced = false }: { reduced?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-55">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 10], fov: 50 }}
        frameloop={reduced ? "demand" : "always"}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <Blocks animate={!reduced} />
      </Canvas>
    </div>
  );
}
