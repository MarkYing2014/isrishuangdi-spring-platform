"use client";

/**
 * Die Spring 3D Visualizer
 * 模具弹簧 3D 可视化器
 * 
 * Complete scene with camera, lights, and controls
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { DieSpringMesh } from "./DieSpringMesh";
import type { DieSpringDuty } from "@/lib/dieSpring/riskModel";

export type DieSpringEndStyleVis = "open" | "closed" | "closed_ground";

export interface DieSpringVisualizerProps {
  /** Outer diameter (mm) */
  outerDiameter: number;
  /** Wire thickness t (mm) */
  wireThickness: number;
  /** Wire width b (mm) */
  wireWidth: number;
  /** Total coils */
  coils: number;
  /** Free length (mm) */
  freeLength: number;
  /** End style */
  endStyle?: DieSpringEndStyleVis;
  /** End grind turns per end */
  endGrindTurns?: number;
  /** Duty rating for color (LD/MD/HD/XHD) */
  duty?: DieSpringDuty;
  /** Risk value 0~1+ for emissive glow */
  risk?: number;
  /** Auto rotate */
  autoRotate?: boolean;
  /** Background color */
  backgroundColor?: string;
  /** Spring color (overrides duty color) */
  springColor?: string;
}

export function DieSpringVisualizer({
  outerDiameter,
  wireThickness,
  wireWidth,
  coils,
  freeLength,
  endStyle = "closed_ground",
  endGrindTurns = 0.25,
  duty,
  risk = 0,
  autoRotate = true,
  backgroundColor = "#ffffff",
  springColor,
}: DieSpringVisualizerProps) {
  // Calculate scale based on geometry size
  const maxDim = Math.max(outerDiameter, freeLength);
  const scale = maxDim > 0 ? 2 / maxDim : 0.05;

  return (
    <div className="w-full h-full min-h-[300px]" style={{ background: backgroundColor }}>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />
          
          {/* Environment for reflections */}
          <Environment preset="studio" />

          {/* Die Spring Mesh */}
          <DieSpringMesh
            outerDiameter={outerDiameter}
            wireThickness={wireThickness}
            wireWidth={wireWidth}
            coils={coils}
            freeLength={freeLength}
            endStyle={endStyle}
            endGrindTurns={endGrindTurns}
            scale={scale}
            color={springColor}
            duty={duty}
            risk={risk}
          />

          {/* Controls */}
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={1}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default DieSpringVisualizer;
