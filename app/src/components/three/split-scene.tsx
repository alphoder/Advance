"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * The product as a scene: payments stream in from the left, hit the coin (the earner's Advance
 * address), and split. Purple flows to the Monad pool (repayment), terracotta flows to the earner.
 * Translucent cubes drifting behind are Monad blocks.
 */
const NAVY = new THREE.Color("#c9d2f0");
const MONAD = new THREE.Color("#836ef9");
const TERRA = new THREE.Color("#e2725b");

const inflow = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-7, -1.2, -1), new THREE.Vector3(-4.2, -0.2, 0.4), new THREE.Vector3(-1.8, 0.15, 0.2), new THREE.Vector3(0, 0, 0),
]);
const toPool = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.6, 0.6, 0.3), new THREE.Vector3(3.2, 1.7, -0.2), new THREE.Vector3(4.4, 2.1, -0.6),
]);
const toYou = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.6, -0.55, 0.4), new THREE.Vector3(3.1, -1.5, 0.6), new THREE.Vector3(4.3, -1.9, 0.4),
]);

const COUNT = 1100;

function Streams({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const seeds = Array.from({ length: COUNT }, (_, i) => ({
      t: Math.random(),
      // 20% of every payment repays the advance: one in five particles takes the purple lane.
      lane: i % 5 === 0 ? 0 : 1,
      speed: 0.055 + Math.random() * 0.035,
      jitter: new THREE.Vector3((Math.random() - 0.5) * 0.28, (Math.random() - 0.5) * 0.28, (Math.random() - 0.5) * 0.28),
    }));
    return { positions, colors, seeds };
  }, []);

  const p = new THREE.Vector3();
  const c = new THREE.Color();
  useFrame((_, dt) => {
    const geo = ref.current?.geometry;
    if (!geo) return;
    const step = animate ? Math.min(dt, 0.05) : 0;
    seeds.forEach((s, i) => {
      s.t = (s.t + step * s.speed) % 1;
      if (s.t < 0.5) {
        inflow.getPoint(s.t * 2, p);
        c.copy(NAVY);
      } else {
        const k = (s.t - 0.5) * 2;
        (s.lane === 0 ? toPool : toYou).getPoint(k, p);
        c.copy(NAVY).lerp(s.lane === 0 ? MONAD : TERRA, Math.min(1, k * 2.5));
      }
      const spread = s.t < 0.5 ? 1 - s.t * 1.6 : (s.t - 0.5) * 1.2;
      positions[i * 3] = p.x + s.jitter.x * spread;
      positions[i * 3 + 1] = p.y + s.jitter.y * spread;
      positions[i * 3 + 2] = p.z + s.jitter.z * spread;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    });
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

function Coin({ animate }: { animate: boolean }) {
  // Flips around the vertical axis: the purple face (repayment) and terracotta face (earner) alternate.
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (ref.current && animate) ref.current.rotation.y += dt * 0.7; });
  return (
    <group ref={ref} rotation={[0.25, 0.6, 0]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.95, 0.95, 0.22, 72]} />
          <meshStandardMaterial color="#1f2937" metalness={0.85} roughness={0.28} emissive="#262b3d" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.68, 0.04, 16, 96]} />
          <meshStandardMaterial color="#836ef9" emissive="#836ef9" emissiveIntensity={1.6} />
        </mesh>
        <mesh position={[0, -0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.68, 0.04, 16, 96]} />
          <meshStandardMaterial color="#e2725b" emissive="#e2725b" emissiveIntensity={1.4} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.95, 0.025, 12, 96]} />
          <meshStandardMaterial color="#c9d2f0" metalness={1} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function Endpoint({ position, color, kind }: { position: [number, number, number]; color: string; kind: "ring" | "orb" }) {
  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={0.6}>
      <group position={position}>
        {kind === "ring" ? (
          <mesh rotation={[0.6, 0.3, 0]}>
            <torusGeometry args={[0.42, 0.09, 24, 80]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} metalness={0.4} roughness={0.3} />
          </mesh>
        ) : (
          <mesh>
            <icosahedronGeometry args={[0.38, 1]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} flatShading metalness={0.3} roughness={0.4} />
          </mesh>
        )}
      </group>
    </Float>
  );
}

/** Camera eases toward the pointer: decorative depth, damped so it never feels twitchy. */
function Rig({ animate }: { animate: boolean }) {
  const { camera, pointer } = useThree();
  useFrame(() => {
    if (!animate) return;
    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function SplitScene({ reduced = false, amount = 100 }: { reduced?: boolean; amount?: number }) {
  const animate = !reduced;
  return (
    <div className="relative size-full">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 11.5], fov: 42 }}
        frameloop={animate ? "always" : "demand"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        aria-label="A payment splitting: 20 percent repays the advance, 80 percent reaches the earner"
      >
        <ambientLight intensity={0.35} />
        <pointLight position={[3, 3, 4]} intensity={40} color="#836ef9" />
        <pointLight position={[3, -3, 4]} intensity={30} color="#e2725b" />
        <pointLight position={[-4, 1, 5]} intensity={20} color="#9fb3ff" />
        <group position={[-0.9, 0, 0]} scale={0.92}>
          <Streams animate={animate} />
          <Coin animate={animate} />
          <Endpoint position={[4.6, 2.2, -0.6]} color="#a594ff" kind="ring" />
          <Endpoint position={[4.5, -2, 0.4]} color="#f08a72" kind="orb" />
        </group>
        <Rig animate={animate} />
      </Canvas>
      {/* Labels live in the DOM (crisp text, no canvas portals). Positions match the endpoints above. */}
      <SceneLabel className="left-[2%] top-[54%]" title={`Client pays $${amount}`} sub="AUSD on Monad" />
      <SceneLabel className="right-[4%] top-[13%]" title={`$${amount * 0.2} repays`} sub="to the Monad pool" tone="monad" />
      <SceneLabel className="right-[5%] bottom-[14%]" title={`$${amount * 0.8} to you`} sub="same transaction" tone="terra" />
    </div>
  );
}

function SceneLabel({ className, title, sub, tone }: { className: string; title: string; sub: string; tone?: "monad" | "terra" }) {
  const color = tone === "monad" ? "text-monad-hi" : tone === "terra" ? "text-terra" : "text-ink";
  return (
    <div className={`pointer-events-none absolute hidden rounded-xl border border-line bg-bg-2/80 px-3 py-1.5 backdrop-blur sm:block ${className}`}>
      <div className={`font-mono text-[13.5px] font-semibold ${color}`}>{title}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
  );
}
