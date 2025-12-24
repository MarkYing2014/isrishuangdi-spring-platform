"use client";

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { RotateCcw, Info } from "lucide-react";

import { previewTheme } from "@/lib/three/previewTheme";
import { Button } from "@/components/ui/button";
import { DiskSpringMesh } from "./DiskSpringMesh";

// View presets
const VIEW_PRESETS = {
  perspective: { position: [100, 60, 100], target: [0, 0, 0] },
  front: { position: [0, 150, 0], target: [0, 0, 0] },    // Top-down for disk
  top: { position: [0, 150, 0], target: [0, 0, 0] },
  side: { position: [150, 0, 0], target: [0, 0, 0] },
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

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

export type DiskSpringVisualizerProps = {
  outerDiameter: number;
  innerDiameter: number;
  thickness: number;
  freeConeHeight: number;
  deflection: number;
  nP: number;
  nS: number;
  autoRotate?: boolean;
  showStressColors?: boolean;
  stressUtilization?: number;
  springRate?: number;
};

export function DiskSpringVisualizer(props: DiskSpringVisualizerProps) {
  const [mounted, setMounted] = useState(false);
  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const statusColor = useMemo(() => {
    if (!props.showStressColors) return "#3b82f6";
    const u = props.stressUtilization || 0;
    if (u > 0.8) return "#ef4444"; // Red
    if (u > 0.5) return "#eab308"; // Yellow
    return "#22c55e"; // Green
  }, [props.showStressColors, props.stressUtilization]);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full min-h-[300px]" style={{ background: previewTheme.background }}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 5000, position: [100, 60, 100] }}
        style={{ width: "100%", height: "100%" }}
        gl={{ localClippingEnabled: true, antialias: true }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        <Suspense fallback={null}>
          <color attach="background" args={[previewTheme.background]} />

          <ambientLight intensity={previewTheme.lights.ambient} />
          <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} castShadow />
          <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
          <Environment preset="studio" />

          <DiskSpringMesh 
            outerDiameter={props.outerDiameter}
            innerDiameter={props.innerDiameter}
            thickness={props.thickness}
            freeConeHeight={props.freeConeHeight}
            currentDeflection={props.deflection}
            nP={props.nP}
            nS={props.nS}
            color={statusColor}
          />

          <gridHelper 
            args={[200, 20, previewTheme.grid.major, previewTheme.grid.minor]} 
            position={[0, -10, 0]} 
          />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={props.autoRotate}
            autoRotateSpeed={0.8}
            minDistance={10}
            maxDistance={1000}
          />
        </Suspense>
      </Canvas>

      {/* View selector */}
      <div className="absolute bottom-2 left-2 flex gap-1 z-10">
        <Button
          variant={currentView === "perspective" ? "default" : "secondary"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleViewChange("perspective")}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          3D
        </Button>
        <Button
          variant={currentView === "front" ? "default" : "secondary"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleViewChange("front")}
        >
          顶
        </Button>
        <Button
          variant={currentView === "side" ? "default" : "secondary"}
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => handleViewChange("side")}
        >
          侧
        </Button>
      </div>

      {/* Legend overlay */}
      <div className="absolute top-2 left-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow z-10">
        <div className="flex items-center gap-2">
           <span className="font-semibold text-slate-700">Disk / Belleville</span>
        </div>
        <div className="mt-1 text-slate-600">
           DIN 2092/2093
        </div>
        
        {props.showStressColors && (
          <div className="mt-2 space-y-1">
            <div className="items-center flex gap-1.5">
              <div className="bg-[#ef4444] h-3 rounded-sm w-3" />
              <span className="text-[10px] text-slate-500">{"> 80% Utilization"}</span>
            </div>
            <div className="items-center flex gap-1.5">
              <div className="bg-[#eab308] h-3 rounded-sm w-3" />
              <span className="text-[10px] text-slate-500">50-80% Utilization</span>
            </div>
            <div className="items-center flex gap-1.5">
              <div className="bg-[#22c55e] h-3 rounded-sm w-3" />
              <span className="text-[10px] text-slate-500">{"< 50% Utilization"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status overlay */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5 z-10 min-w-[120px]">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">De:</span>
          <span className="font-medium">{props.outerDiameter} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Di:</span>
          <span className="font-medium">{props.innerDiameter} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">t:</span>
          <span className="font-medium">{props.thickness} mm</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4 font-semibold">
            <span className="text-slate-500">Total Force:</span>
            <span className="text-blue-600">{(props.deflection * (props.springRate || 0)).toFixed(1)} N</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiskSpringVisualizer;
