"use client";

/**
 * Die Spring 3D Visualizer
 * 模具弹簧 3D 可视化器
 * 
 * Complete scene with camera, lights, and controls
 */

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { DieSpringMesh } from "./DieSpringMesh";
import type { DieSpringDuty } from "@/lib/dieSpring/riskModel";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { previewTheme } from "@/lib/three/previewTheme";

// View presets - copied from CompressionSpringVisualizer
const VIEW_PRESETS = {
  perspective: { position: [3, 2, 3], target: [0, 0, 0] },
  front: { position: [0, 0, 5], target: [0, 0, 0] },      // Z axis view
  top: { position: [0, 5, 0], target: [0, 0, 0] },       // Y axis view
  side: { position: [5, 0, 0], target: [0, 0, 0] },      // X axis view
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

const SPRING_COLOR = "#3b82f6"; // Placeholder, normally duty color
const END_CAP_COLOR = previewTheme.material.endCap.color;

/**
 * Camera controller component
 */
function CameraController({ 
  viewType, 
  controlsRef 
}: { 
  viewType: ViewType; 
  controlsRef: React.RefObject<any>;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    const preset = VIEW_PRESETS[viewType];
    camera.position.set(...(preset.position as [number, number, number]));
    camera.lookAt(...(preset.target as [number, number, number]));
    camera.updateProjectionMatrix();
    
    setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.target.set(...(preset.target as [number, number, number]));
        controlsRef.current.update();
      }
    }, 10);
  }, [viewType, camera, controlsRef]);
  
  return null;
}

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
  /** Duty rating for color (LD/MD/HD/XHD) or string for new classes */
  duty?: DieSpringDuty | string;
  /** Risk value 0~1+ for emissive glow */
  risk?: number;
  /** Auto rotate */
  autoRotate?: boolean;
  /** Background color */
  backgroundColor?: string;
  /** Spring color (overrides duty color) */
  springColor?: string;
  
  // New props for status overlay
  springRate?: number;
  solidHeight?: number;
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
  springRate,
  solidHeight,
}: DieSpringVisualizerProps) {
  // Calculate scale based on geometry size
  const maxDim = Math.max(outerDiameter, freeLength);
  const scale = maxDim > 0 ? 2 / maxDim : 0.05;

  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const totalCoils = coils; // Simplified
  const activeCoils = coils - 2; // Approximate for die springs

  return (
    <div className="relative w-full h-full min-h-[300px]" style={{ background: backgroundColor }}>
      <Canvas
        camera={{ position: [3, 2, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        
        <Suspense fallback={null}>
          {/* Lighting match CompressionSpringVisualizer */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <directionalLight position={[-5, -5, -5]} intensity={0.3} />
          
          <Environment preset="studio" />

          {/* Die Spring Mesh - Rotate to stand upright */}
          <group rotation={[Math.PI / 2, 0, 0]}>
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
          </group>

          <OrbitControls
            ref={controlsRef}
            autoRotate={autoRotate}
            autoRotateSpeed={1}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />

           {/* Ground grid */}
           <gridHelper 
              args={[10, 20, previewTheme.grid.major, previewTheme.grid.minor]} 
              position={[0, -freeLength * scale / 2, 0]} // Roughly center? Or base.
              // Actually DieSpringMesh usually centers itself or sits at origin. 
              // Let's assume standard grid at 0,0,0
            />
        </Suspense>
      </Canvas>

      {/* View selector - bottom left */}
      <div className="absolute bottom-2 left-2 flex gap-1">
        <Button
          variant={currentView === "perspective" ? "default" : "secondary"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleViewChange("perspective")}
          title="透视图 / Perspective"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          3D
        </Button>
        <Button
          variant={currentView === "front" ? "default" : "secondary"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleViewChange("front")}
          title="前视图 / Front View"
        >
          前
        </Button>
        <Button
          variant={currentView === "top" ? "default" : "secondary"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleViewChange("top")}
          title="俯视图 / Top View"
        >
          顶
        </Button>
        <Button
          variant={currentView === "side" ? "default" : "secondary"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleViewChange("side")}
          title="侧视图 / Side View"
        >
          侧
        </Button>
      </div>

      {/* Legend overlay - top left */}
      <div className="absolute top-2 left-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow z-10">
        <div className="flex items-center gap-2">
          {/* Use the duty color if available */}
           <span className="font-semibold text-slate-700">ISO 10243</span>
        </div>
        <div className="mt-1 text-slate-600">
           {duty} Duty
        </div>
      </div>

      {/* Status overlay - top right */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5 z-10">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">OD:</span>
          <span className="font-medium">{outerDiameter} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">L0:</span>
          <span className="font-medium">{freeLength} mm</span>
        </div>
         <div className="flex justify-between gap-4">
          <span className="text-slate-500">b×t:</span>
          <span className="font-medium">{wireWidth}×{wireThickness}</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Nt:</span>
            <span className="font-medium">{coils}</span>
          </div>
          {solidHeight !== undefined && (
            <div className="flex justify-between gap-4">
                <span className="text-slate-500">Hs:</span>
                <span className="font-medium">{solidHeight.toFixed(1)} mm</span>
            </div>
          )}
          {springRate !== undefined && (
             <div className="flex justify-between gap-4">
                <span className="text-slate-500">R:</span>
                <span className="font-medium">{springRate.toFixed(1)} N/mm</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DieSpringVisualizer;
