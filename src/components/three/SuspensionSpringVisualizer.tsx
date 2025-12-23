"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { SuspensionSpringMesh } from "./SuspensionSpringMesh";
import { StressSpringModel, StressColorLegend } from "./StressSpringModel";
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
}: SuspensionSpringVisualizerProps) {
  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const scale = 50 / Math.max(meanDiameter * 1.5, freeLength);
  const compressedLength = freeLength - currentDeflection;
  const isNearSolid = compressedLength <= solidHeight * 1.1;
  const isAtSolid = compressedLength <= solidHeight * 1.01;

  const getStatusColor = () => {
    if (stressRatio >= 1.0) return "text-red-600";
    if (stressRatio >= 0.8) return "text-amber-600";
    return "text-green-600";
  };

  const getStressColorHex = () => {
    if (stressRatio <= 0.6) return "#22c55e";
    if (stressRatio <= 0.8) return "#eab308";
    return "#ef4444";
  };

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

        {showStressContour && feaForce && feaForce > 0 ? (
          <StressSpringModel
            wireDiameter={wireDiameter}
            meanDiameter={meanDiameter}
            activeCoils={activeCoils}
            pitch={(freeLength - wireDiameter * totalCoils) / activeCoils}
            totalCoils={totalCoils}
            axialForce={feaForce}
            showStress={true}
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

        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={20}
          maxDistance={200}
          target={[0, 0, 25]}
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

      <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: getStressColorHex() }}
          />
          <span>
            应力比: <span className={getStatusColor()}>{(stressRatio * 100).toFixed(0)}%</span>
          </span>
        </div>
        {isNearSolid && (
          <div className="mt-1 text-amber-600 font-medium">
            ⚠ {isAtSolid ? "已达固体高度" : "接近固体高度"}
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Δx:</span>
          <span className="font-medium">{currentDeflection.toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">F:</span>
          <span className="font-medium">{currentLoad.toFixed(1)} N</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">L:</span>
          <span className="font-medium">{compressedLength.toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">k:</span>
          <span className="font-medium">{springRate.toFixed(2)} N/mm</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Hs:</span>
            <span className="font-medium">{solidHeight.toFixed(1)} mm</span>
          </div>
        </div>
      </div>

      {/* Stress Color Legend when contour is active */}
      {showStressContour && feaForce && feaForce > 0 && (() => {
        // Calculate stress range for legend
        const c = meanDiameter / wireDiameter;
        const K = (4 * c - 1) / (4 * c - 4) + 0.615 / c;
        const tauMax = (8 * feaForce * K * meanDiameter) / (Math.PI * Math.pow(wireDiameter, 3));
        const tauMin = tauMax * 0.2; // Dead coil minimum
        
        return (
          <div className="absolute bottom-14 left-2 right-2 rounded bg-white/95 px-2 py-2 shadow">
            <StressColorLegend
              minStress={tauMin}
              maxStress={tauMax}
              isZh={isZh}
            />
          </div>
        );
      })()}
    </div>
  );
}
