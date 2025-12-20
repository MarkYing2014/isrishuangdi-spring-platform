"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  generateCompressionCenterline,
  createClipPlanes,
  calculateEndDiscs,
  type CompressionSpringParams,
} from "@/lib/spring3d/compressionSpringGeometry";
import { previewTheme } from "@/lib/three/previewTheme";

export interface SuspensionSpringMeshProps {
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  totalCoils: number;
  freeLength: number;
  currentDeflection: number;
  stressRatio: number;
  solidHeight: number;
  scale?: number;
}

function getStressColor(ratio: number): THREE.Color {
  if (ratio <= 0.6) {
    return new THREE.Color(0x22c55e);
  } else if (ratio <= 0.8) {
    const t = (ratio - 0.6) / 0.2;
    const color = new THREE.Color();
    color.lerpColors(new THREE.Color(0x22c55e), new THREE.Color(0xeab308), t);
    return color;
  } else {
    const t = Math.min(1, (ratio - 0.8) / 0.2);
    const color = new THREE.Color();
    color.lerpColors(new THREE.Color(0xeab308), new THREE.Color(0xef4444), t);
    return color;
  }
}

export function SuspensionSpringMesh({
  wireDiameter,
  meanDiameter,
  activeCoils,
  totalCoils,
  freeLength,
  currentDeflection,
  stressRatio,
  solidHeight,
  scale = 1,
}: SuspensionSpringMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const compressedLength = freeLength - currentDeflection;
  const isNearSolid = compressedLength <= solidHeight * 1.1;
  const isAtSolid = compressedLength <= solidHeight * 1.01;

  const geometry = useMemo(() => {
    const params: CompressionSpringParams = {
      totalCoils,
      activeCoils,
      meanDiameter,
      wireDiameter,
      freeLength,
      currentDeflection,
      scale,
    };

    const { points, minZ, maxZ } = generateCompressionCenterline(params);

    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
    const wireRadius = (wireDiameter / 2) * scale;
    const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 2, wireRadius, 16, false);

    const grindDepth = wireRadius * 0.3;
    const clipPlanes = createClipPlanes(minZ, maxZ, grindDepth);
    const endDiscs = calculateEndDiscs(minZ, maxZ, grindDepth, meanDiameter, wireDiameter, scale);

    return { tubeGeometry, clipPlanes, endDiscs };
  }, [wireDiameter, meanDiameter, activeCoils, totalCoils, freeLength, currentDeflection, scale]);

  const springColor = useMemo(() => getStressColor(stressRatio), [stressRatio]);

  useFrame((state) => {
    if (materialRef.current && isNearSolid) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.3 + 0.3;
      materialRef.current.emissiveIntensity = isAtSolid ? 0.5 + pulse : pulse * 0.5;
    } else if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0;
    }
  });

  const { tubeGeometry, clipPlanes, endDiscs } = geometry;

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
          clippingPlanes={[clipPlanes.bottom, clipPlanes.top]}
          clipShadows
        />
      </mesh>

      <mesh position={[0, 0, endDiscs.bottomPosition]}>
        <ringGeometry args={[endDiscs.innerRadius, endDiscs.outerRadius, 32]} />
        <meshStandardMaterial
          color={previewTheme.material.endCap.color}
          metalness={previewTheme.material.endCap.metalness}
          roughness={previewTheme.material.endCap.roughness}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0, endDiscs.topPosition]}>
        <ringGeometry args={[endDiscs.innerRadius, endDiscs.outerRadius, 32]} />
        <meshStandardMaterial
          color={previewTheme.material.endCap.color}
          metalness={previewTheme.material.endCap.metalness}
          roughness={previewTheme.material.endCap.roughness}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0, -0.5]} rotation={[0, 0, 0]}>
        <circleGeometry args={[endDiscs.outerRadius * 1.5, 32]} />
        <meshStandardMaterial
          color={previewTheme.material.groundShadow.color}
          transparent
          opacity={previewTheme.material.groundShadow.opacity}
        />
      </mesh>
    </group>
  );
}
