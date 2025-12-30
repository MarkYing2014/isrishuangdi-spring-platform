/**
 * Wave Spring 3D Visualizer
 * 波形弹簧 3D 可视化组件
 * 
 * 白背景主题，与其他弹簧可视化组件风格一致
 */

"use client";

import React, { useMemo, useRef, useState, useCallback, useEffect, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Grid, Environment } from "@react-three/drei";
import * as THREE from "three";
import { AutoFitControls } from "./AutoFitControls";
import { previewTheme } from "@/lib/three/previewTheme";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { WaveSpringMesh } from "./WaveSpringMesh";
import { Download, Loader2 } from "lucide-react";
import { useCadExportStore } from "@/lib/stores/cadExportStore";
import { downloadTextFile } from "@/lib/utils/downloadTextFile";

// View presets
const VIEW_PRESETS = {
  perspective: { position: [50, 40, 50], target: [0, 0, 0] },
  front: { position: [0, 0, 100], target: [0, 0, 0] },    // Z axis
  top: { position: [0, 100, 0], target: [0, 0, 0] },      // Y axis
  side: { position: [100, 0, 0], target: [0, 0, 0] },     // X axis
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

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
  
  // New props for analysis overlay
  springRate?: number;
  solidHeight?: number;
  loadAtWorkingHeight?: number;
}

// ============================================================================
// Camera Controller
// ============================================================================

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
  springRate,
  solidHeight,
  loadAtWorkingHeight,
}: WaveSpringVisualizerProps) {
  const controlsRef = useRef<any>(null);
  const springGroupRef = useRef<THREE.Group>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const { isExporting, exportWaveCad } = useCadExportStore();

  const handleExport = useCallback(async () => {
      const result = await exportWaveCad();
      if (result.ok && result.content) {
          downloadTextFile(result.filename, result.content);
      } else {
          console.error("Export failed:", result.warnings);
          // Optional: Show toast
      }
  }, [exportWaveCad]);

  // Calculate scale for visualization
  const scale = useMemo(() => {
    const maxDim = Math.max(meanDiameter, amplitude * 2);
    return maxDim > 0 ? 30 / maxDim : 1; 
  }, [meanDiameter, amplitude]);

  const gridSize = Math.max(meanDiameter * 2, 50);

  return (
    <div className={`relative w-full h-full min-h-[300px] ${className}`}>
      <Canvas
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [50, 40, 50],
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: previewTheme.background }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        
        <Suspense fallback={null}>
          {/* Background color */}
          <color attach="background" args={[previewTheme.background]} />

          {/* Lighting */}
          <SceneLighting />
          
           <Environment preset="studio" />

          {/* Grid */}
          <SceneGrid size={gridSize} />

          {/* Wave Spring Mesh */}
          <group ref={springGroupRef}>
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
          </group>

          {/* Orbit Controls */}
          <AutoFitControls
            ref={controlsRef}
            targetRef={springGroupRef}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={300}
          />
        </Suspense>
      </Canvas>

      {/* View selector - bottom left */}
      <div className="absolute bottom-2 left-2 flex gap-1">
        <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={handleExport}
            disabled={isExporting}
            title="Export to CadQuery Script"
        >
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Export CAD
        </Button>
        <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
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
           <span className="font-semibold text-slate-700">Wave Spring</span>
        </div>
        <div className="mt-1 text-slate-600">
           {turns > 1 ? `Multi-Turn (${turns})` : "Single Turn"}
        </div>
      </div>

       {/* Status overlay - top right */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5 z-10">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Dm:</span>
          <span className="font-medium">{meanDiameter.toFixed(1)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Amp:</span>
          <span className="font-medium">{amplitude.toFixed(2)} mm</span>
        </div>
         <div className="flex justify-between gap-4">
          <span className="text-slate-500">b×t:</span>
          <span className="font-medium">{width}×{thickness}</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Nw:</span>
            <span className="font-medium">{waves}</span>
          </div>
          {loadAtWorkingHeight !== undefined && (
            <div className="flex justify-between gap-4">
                <span className="text-slate-500">Load:</span>
                <span className="font-medium">{loadAtWorkingHeight.toFixed(0)} N</span>
            </div>
          )}
          {springRate !== undefined && (
             <div className="flex justify-between gap-4">
                <span className="text-slate-500">Rate:</span>
                <span className="font-medium">{springRate.toFixed(1)} N/mm</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WaveSpringVisualizer;
