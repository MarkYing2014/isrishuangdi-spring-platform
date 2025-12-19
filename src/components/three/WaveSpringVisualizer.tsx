/**
 * Wave Spring 3D Visualizer
 * 波形弹簧 3D 可视化组件
 * 
 * 白背景主题，与其他弹簧可视化组件风格一致
 */

"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { previewTheme } from "@/lib/three/previewTheme";
import { WaveSpringMesh } from "./WaveSpringMesh";

// ============================================================================
// Types
// ============================================================================

export interface WaveSpringVisualizerProps {
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Strip thickness t (mm) - radial direction */
  thickness: number;
  /** Strip width b (mm) - axial direction */
  width: number;
  /** Wave amplitude A (mm) - half of peak-to-valley */
  amplitude: number;
  /** Number of waves per turn */
  waves: number;
  /** Number of turns (V1: typically 1) */
  turns?: number;
  /** Phase offset (radians) */
  phase?: number;
  /** Spring color */
  color?: string;
  /** Container className */
  className?: string;
}

// ============================================================================
// Camera Controller
// ============================================================================

function CameraController({ 
  meanDiameter,
  controlsRef 
}: { 
  meanDiameter: number;
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    // Position camera based on spring size
    const distance = meanDiameter * 2.5;
    camera.position.set(distance * 0.8, distance * 0.5, distance * 0.8);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [meanDiameter, camera, controlsRef]);
  
  return null;
}

// ============================================================================
// Scene Lighting
// ============================================================================

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={previewTheme.lights.ambient} />
      <directionalLight
        position={previewTheme.lights.key.position as unknown as THREE.Vector3Tuple}
        intensity={previewTheme.lights.key.intensity}
        castShadow
      />
      <directionalLight
        position={previewTheme.lights.fill.position as unknown as THREE.Vector3Tuple}
        intensity={previewTheme.lights.fill.intensity}
      />
      <pointLight
        position={previewTheme.lights.point.position as unknown as THREE.Vector3Tuple}
        intensity={previewTheme.lights.point.intensity}
      />
    </>
  );
}

// ============================================================================
// Scene Grid
// ============================================================================

function SceneGrid({ size }: { size: number }) {
  return (
    <Grid
      args={[size * 2, size * 2]}
      cellSize={size / 10}
      cellThickness={0.5}
      cellColor={previewTheme.grid.minor}
      sectionSize={size / 2}
      sectionThickness={1}
      sectionColor={previewTheme.grid.major}
      fadeDistance={size * 3}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={false}
      position={[0, 0, -5]}
      rotation={[0, 0, 0]}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WaveSpringVisualizer({
  meanDiameter,
  thickness,
  width,
  amplitude,
  waves,
  turns = 1,
  phase = 0,
  color = "#6b9bd1",
  className = "",
}: WaveSpringVisualizerProps) {
  const controlsRef = useRef<any>(null);

  // Calculate scale for visualization
  const scale = useMemo(() => {
    const maxDim = Math.max(meanDiameter * 1.5, amplitude * 4);
    return 30 / maxDim; // Normalize to ~30 units
  }, [meanDiameter, amplitude]);

  const gridSize = meanDiameter * 1.5;

  return (
    <div className={`w-full h-full min-h-[300px] ${className}`}>
      <Canvas
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [50, 30, 50],
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: previewTheme.background }}
      >
        {/* Background color */}
        <color attach="background" args={[previewTheme.background]} />

        {/* Camera controller */}
        <CameraController 
          meanDiameter={meanDiameter} 
          controlsRef={controlsRef} 
        />

        {/* Lighting */}
        <SceneLighting />

        {/* Grid */}
        <SceneGrid size={gridSize} />

        {/* Wave Spring Mesh */}
        <WaveSpringMesh
          meanDiameter={meanDiameter}
          thickness={thickness}
          width={width}
          amplitude={amplitude}
          waves={waves}
          turns={turns}
          phase={phase}
          color={color}
          scale={scale}
          showEdges={true}
        />

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={10}
          maxDistance={200}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

export default WaveSpringVisualizer;
