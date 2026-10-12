"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";

const BlocksBackground = dynamic(() => import("./three/blocks-background"), { ssr: false });

export function Backdrop() {
  const reduce = useReducedMotion();
  return <BlocksBackground reduced={Boolean(reduce)} />;
}
