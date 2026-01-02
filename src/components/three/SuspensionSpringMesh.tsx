"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  buildSuspensionSpringGeometry,
} from "@/lib/spring3d/suspensionSpringGeometry";
import type { PitchProfile, DiameterProfile } from "@/lib/springTypes";
import { previewTheme } from "@/lib/three/previewTheme";
import { stressToRGB } from "@/lib/three/stressColor";

export interface SuspensionSpringMeshProps {
  wireDiameter: number;
  activeCoils: number;
  totalCoils: number;
  freeLength: number;
  currentDeflection: number;
  stressRatio: number;
  solidHeight: number;
  scale?: number;
  pitchProfile?: PitchProfile;
  diameterProfile?: DiameterProfile;
}

// DELETED local getStressColor - using shared stressToRGB

export function SuspensionSpringMesh({
  wireDiameter,
  activeCoils,
  totalCoils,
  freeLength,
  currentDeflection,
  stressRatio,
  solidHeight,
  scale = 1,
  pitchProfile,
  diameterProfile,
}: SuspensionSpringMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const compressedLength = freeLength - currentDeflection;
  const isNearSolid = compressedLength <= solidHeight * 1.1;
  const isAtSolid = compressedLength <= solidHeight * 1.01;

  const geometry = useMemo(() => {
    // Default profiles if not provided
    const effectivePitchProfile: PitchProfile = pitchProfile ?? { mode: "uniform" };
    const effectiveDiameterProfile: DiameterProfile = diameterProfile ?? { mode: "constant", DmStart: 100 }; // Fallback Dm if not provided? Actually Dm is usually passed.
    // Wait, DmStart should likely default to meanDiameter if passed?
    // SuspensionSpringMeshProps doesn't have meanDiameter anymore.
    // We should rely on DiameterProfile being fully populated by the caller (Visualizer).
    
    const result = buildSuspensionSpringGeometry({
      wireDiameter,
      activeCoils,
      totalCoils,
      freeLength,
      pitchProfile: effectivePitchProfile,
      diameterProfile: effectiveDiameterProfile,
      targetHeight: compressedLength, 
    });

    // Scale geometry
    if (scale !== 1) {
      result.geometry.scale(scale, scale, scale);
    }
    
    return {
      tubeGeometry: result.geometry,
      // Minimal dummy end discs to satisfy return type structure if needed, or we just use tubeGeometry
      endDiscs: { bottomPosition: 0, topPosition: 0, innerRadius: 0, outerRadius: 0 } 
    };
  }, [wireDiameter, activeCoils, totalCoils, freeLength, currentDeflection, scale, pitchProfile, diameterProfile]);

  const springColor = useMemo(() => stressToRGB(stressRatio), [stressRatio]);

  // Force material color update when stressRatio changes
  React.useEffect(() => {
    if (materialRef.current) {
      const newColor = stressToRGB(stressRatio);
      materialRef.current.color.copy(newColor);
      materialRef.current.needsUpdate = true;
    }
  }, [stressRatio]);

  useFrame((state) => {
    if (materialRef.current && isNearSolid) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.3 + 0.3;
      materialRef.current.emissiveIntensity = isAtSolid ? 0.5 + pulse : pulse * 0.5;
    } else if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0;
    }
  });

  const { tubeGeometry } = geometry;

  return (
    <group>
      <mesh ref={meshRef} geometry={tubeGeometry}>
        <meshStandardMaterial
          ref={materialRef}
          color={springColor}
          emissive={isNearSolid ? new THREE.Color(0xff0000) : springColor}
          emissiveIntensity={0}
          metalness={0.3}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Shadows/Guides */}
      <mesh position={[0, 0, -0.5]} rotation={[0, 0, 0]}>
        <circleGeometry args={[100 * scale, 32]} />
        <meshStandardMaterial
          color={previewTheme.material.groundShadow.color}
          transparent
          opacity={previewTheme.material.groundShadow.opacity}
        />
      </mesh>
    </group>
  );
}
