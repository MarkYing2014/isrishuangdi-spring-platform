"use client";

import { ComponentProps, memo } from "react";

/**
 * Placeholder for the multi-arm coiling head assembly.
 * Later we will port the articulated motion path logic from the existing Vite + Three.js project.
 */
export const CoilerArms = memo(function CoilerArms(props: ComponentProps<"group">) {
  return (
    <group {...props}>
      <mesh position={[-0.15, 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.15, 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.2, 0.05, 0.08]} />
        <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Future work: animate arm swivel, mandrel rotation, and guide rollers from real machine data. */}
    </group>
  );
});
