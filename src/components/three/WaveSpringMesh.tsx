/**
 * Wave Spring 3D Mesh Component
 * 波形弹簧 Three.js 网格组件
 * 
 * 使用正弦波中心线 + 矩形截面 Sweep 生成实体
 * 用于 React Three Fiber 渲染
 */

"use client";

import { useMemo } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { previewTheme } from "@/lib/three/previewTheme";
import {
  buildWaveSpringMeshGeometry,
  type WaveSpringGeometryInput,
  type WaveSpringStackingMode,
  type WaveSpringNestedLayer,
  type WaveSpringWinding,
} from "@/lib/spring3d/waveSpringGeometryV2";

// ============================================================================
// Types
// ============================================================================

export interface WaveSpringMeshProps {
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Strip thickness t (mm) - axial direction (thin) */
  thickness: number;
  /** Strip width b (mm) - radial direction (flat ribbon) */
  width: number;
  /** Wave amplitude A (mm) - half of peak-to-valley */
  amplitude: number;
  /** Number of waves per turn */
  waves: number;
  /** Number of turns */
  turns?: number;
  /** Phase offset (radians) */
  phase?: number;
  /** Radial pitch - increment in radius per turn for radial stacking (mm) */
  radialPitch?: number;
  /** Stacking mode: axial (default), radial (spiral outward), or nested */
  stackingMode?: WaveSpringStackingMode;
  /** For nested mode: array of layer configurations */
  nestedLayers?: WaveSpringNestedLayer[];
  /** Axial pitch - z rise per turn for helix mode (mm) */
  axialPitch?: number;
  /** Total height (mm) - alternative to axialPitch */
  totalHeight?: number;
  /** Segments per turn for smooth rendering */
  segmentsPerTurn?: number;
  /** Winding direction */
  winding?: WaveSpringWinding;
  /** Material color (default #6b9bd1) */
  color?: string;
  /** Metalness (default from theme) */
  metalness?: number;
  /** Roughness (default from theme) */
  roughness?: number;
  /** Show wireframe (default false) */
  wireframe?: boolean;
  /** Show edges (default true for white background) */
  showEdges?: boolean;
  /** Edge color */
  edgeColor?: string;
  /** Position offset */
  position?: [number, number, number];
  /** Rotation */
  rotation?: [number, number, number];
  /** Scale */
  scale?: number;
}

// ============================================================================
// Component
// ============================================================================

export function WaveSpringMesh({
  meanDiameter,
  thickness,
  width,
  amplitude,
  waves,
  turns = 1,
  phase = 0,
  radialPitch,
  stackingMode = "axial",
  nestedLayers,
  axialPitch,
  totalHeight,
  segmentsPerTurn = 220,
  winding = "CCW",
  color = "#6b9bd1",
  metalness = previewTheme.material.spring.metalness,
  roughness = previewTheme.material.spring.roughness,
  wireframe = false,
  showEdges = true,
  edgeColor = "#475569",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: WaveSpringMeshProps) {
  // Build geometry
  const geometryResult = useMemo(() => {
    const input: WaveSpringGeometryInput = {
      meanDiameter,
      thickness,
      width,
      amplitude,
      waves,
      turns,
      phase,
      radialPitch,
      axialPitch,
      totalHeight,
      stackingMode,
      nestedLayers,
      segmentsPerTurn,
      winding,
      capEnds: true,
      scale: 1, // Scale applied to mesh, not geometry
    };

    try {
      return buildWaveSpringMeshGeometry(input);
    } catch (e) {
      console.error("Failed to build wave spring geometry:", e);
      return null;
    }
  }, [meanDiameter, thickness, width, amplitude, waves, turns, phase, radialPitch, axialPitch, totalHeight, stackingMode, nestedLayers, segmentsPerTurn, winding]);

  if (!geometryResult) {
    return null;
  }

  const { geometry } = geometryResult;

  // Generate a unique key to force re-render when geometry changes
  const geometryKey = `${meanDiameter}-${thickness}-${width}-${amplitude}-${waves}-${turns}-${phase}-${radialPitch}-${axialPitch}-${totalHeight}-${stackingMode}-${segmentsPerTurn}-${winding}`;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh key={geometryKey} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          metalness={metalness}
          roughness={roughness}
          wireframe={wireframe}
          side={THREE.DoubleSide}
        />
      </mesh>
      {showEdges && (
        <Edges key={`edges-${geometryKey}`} geometry={geometry} color={edgeColor} threshold={15} />
      )}
    </group>
  );
}

export default WaveSpringMesh;
