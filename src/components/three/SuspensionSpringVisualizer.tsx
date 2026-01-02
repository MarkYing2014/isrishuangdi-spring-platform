"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AutoFitControls } from "./AutoFitControls";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { SuspensionSpringMesh } from "./SuspensionSpringMesh";
import { StressSpringModel } from "./StressSpringModel";
import { StressColorLegend } from "@/components/ui/engineering/StressColorLegend";
import { cn } from "@/lib/utils";
import { previewTheme } from "@/lib/three/previewTheme";

const VIEW_PRESETS = {
  perspective: { position: [60, 40, 80], target: [0, 0, 25] },
  front: { position: [0, 0, 100], target: [0, 0, 25] },
  top: { position: [0, 100, 25], target: [0, 0, 25] },
  side: { position: [100, 0, 25], target: [0, 0, 25] },
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

function CameraController({
  viewType,
  controlsRef,
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

import type { PitchProfile, DiameterProfile } from "@/lib/springTypes";

export interface SuspensionSpringVisualizerProps {
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  totalCoils: number;
  freeLength: number;
  currentDeflection: number;
  stressRatio: number;
  solidHeight: number;
  currentLoad: number;
  springRate: number;
  pitchProfile?: PitchProfile;
  diameterProfile?: DiameterProfile;
  // FEA stress visualization
  feaForce?: number;          // FEA reaction force (N) for stress calculation
  showStressContour?: boolean; // Toggle stress contour display
  isZh?: boolean;             // Language for legend
  displayMode?: "geometry" | "engineering";
  tensileStrength?: number; // Added Su for stress normalization
}

export function SuspensionSpringVisualizer({
  wireDiameter,
  meanDiameter,
  activeCoils,
  totalCoils,
  freeLength,
  currentDeflection,
  stressRatio,
  solidHeight,
  currentLoad,
  springRate,
  pitchProfile,
  diameterProfile,
  feaForce,
  showStressContour = false,
  isZh = false,
  displayMode = "geometry",
  tensileStrength,
}: SuspensionSpringVisualizerProps) {
  const controlsRef = useRef<any>(null);
  const springGroupRef = useRef<THREE.Group>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const scale = 50 / Math.max(meanDiameter * 1.5, freeLength);
  const compressedLength = freeLength - currentDeflection;
  const isNearSolid = compressedLength <= solidHeight * 1.1;
  const isAtSolid = compressedLength <= solidHeight * 1.01;

  const statusColor = stressRatio >= 1.0 ? "text-red-600" : stressRatio >= 0.8 ? "text-amber-600" : "text-green-600";

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [60, 40, 80], fov: 45 }}
        gl={{ localClippingEnabled: true }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        <color attach="background" args={[previewTheme.background]} />
        <ambientLight intensity={previewTheme.lights.ambient} />
        <directionalLight
          position={previewTheme.lights.key.position}
          intensity={previewTheme.lights.key.intensity}
          castShadow
        />
        <directionalLight
          position={previewTheme.lights.fill.position}
          intensity={previewTheme.lights.fill.intensity}
        />
        <pointLight
          position={previewTheme.lights.point.position}
          intensity={previewTheme.lights.point.intensity}
        />

        <group ref={springGroupRef}>
          {showStressContour && feaForce && feaForce > 0 ? (
            <StressSpringModel
              wireDiameter={wireDiameter}
              meanDiameter={meanDiameter}
              activeCoils={activeCoils}
              pitch={(freeLength - wireDiameter * totalCoils) / activeCoils}
              totalCoils={totalCoils}
              axialForce={feaForce ?? 0}
              showStress={true}
              // Consistent normalization limit
              maxStress={(tensileStrength || 1600) * 0.5}
              scale={scale}
              showCoilBind={true}
            />
          ) : (
            <SuspensionSpringMesh
              wireDiameter={wireDiameter}
              activeCoils={activeCoils}
              totalCoils={totalCoils}
              freeLength={freeLength}
              currentDeflection={currentDeflection}
              stressRatio={stressRatio}
              solidHeight={solidHeight}
              scale={scale}
              pitchProfile={pitchProfile}
              diameterProfile={diameterProfile}
            />
          )}
        </group>

        <AutoFitControls
          ref={controlsRef}
          targetRef={springGroupRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={20}
          maxDistance={300}
        />

        <gridHelper
          args={[80, 16, previewTheme.grid.major, previewTheme.grid.minor]}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Canvas>

      <div className="absolute bottom-2 right-2 flex gap-1">
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

      <div className="absolute bottom-2 left-2 pointer-events-auto">
        <StressColorLegend isZh={isZh} className="w-[160px]" />
        <div className="mt-1 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-[10px] border border-slate-200">
           {isZh ? "当前应力比: " : "Current Ratio: "}
           <span className={cn("font-bold", statusColor)}>{(stressRatio * 100).toFixed(0)}%</span>
        </div>
        {isNearSolid && (
          <div className="mt-1 bg-white/90 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-amber-600 font-bold border border-amber-200">
            ⚠ {isAtSolid ? (isZh ? "已达固体高度" : "Solid Height") : (isZh ? "接近固体高度" : "Near Solid")}
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 rounded bg-white/90 px-3 py-2 text-[11px] shadow-sm border border-slate-100 min-w-[130px] space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 font-semibold uppercase tracking-tighter">Δx:</span>
          <span className="font-mono font-bold text-blue-600">{(currentDeflection || 0).toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 font-semibold uppercase tracking-tighter">F:</span>
          <span className="font-mono font-bold text-emerald-600">{(currentLoad || 0).toFixed(1)} N</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 font-semibold uppercase tracking-tighter">L:</span>
          <span className="font-mono text-slate-700">{(compressedLength || freeLength).toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500 font-semibold uppercase tracking-tighter">k:</span>
          <span className="font-mono text-slate-700">{(springRate || 0).toFixed(2)} N/mm</span>
        </div>
        <div className="border-t border-slate-200/60 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 font-semibold uppercase tracking-tighter">Hs:</span>
            <span className="font-mono text-slate-500">{(solidHeight || 0).toFixed(1)} mm</span>
          </div>
        </div>
      </div>

      {/* Unified legend is now permanently displayed in bottom-left overlay */}
    </div>
  );
}
