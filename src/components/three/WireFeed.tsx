"use client";

import { memo } from "react";

/**
 * Simplified wire feed placeholder. Future work will integrate driven rollers,
 * wire straightening, and feed rate control imported from the dedicated coiler
 * simulation repo.
 */
export const WireFeed = memo(function WireFeed() {
  return (
    <group position={[0, 0, -0.6]}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.4, 0.2, 0.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.2} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.2, 0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.2, -0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Wire straightening + feed speed control will be animated here later. */}
    </group>
  );
});
