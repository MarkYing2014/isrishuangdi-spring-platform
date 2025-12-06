"use client";

import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { 
  useSpringSimulationStore, 
  type TorsionDesignMeta 
} from "@/lib/stores/springSimulationStore";
import {
  buildTorsionSpringGeometry,
  type TorsionSpringParams,
} from "@/lib/spring3d/torsionSpringGeometry";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// View presets - camera positions for different views
const VIEW_PRESETS = {
  perspective: { position: [80, 60, 80], target: [0, 0, 0] },
  front: { position: [0, 0, 120], target: [0, 0, 0] },      // 前视图
  top: { position: [0, 120, 0], target: [0, 0, 0] },        // 俯视图
  side: { position: [120, 0, 0], target: [0, 0, 0] },       // 侧视图
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

// Spring colors
const BODY_COLOR = "#f59e0b"; // Amber for torsion springs
const LEG_COLOR = "#94a3b8"; // Silver for legs

/**
 * Camera controller component - must be inside Canvas
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

/**
 * Animated torsion spring model with engineering-accurate geometry
 * 
 * Features:
 * - Helical body coils
 * - Straight or bent legs
 * - Dynamic angle animation
 */
function AnimatedTorsionSpring() {
  const design = useSpringSimulationStore((state) => state.design);
  const currentDeflection = useSpringSimulationStore((state) => state.currentDeflection);

  // Type guard for torsion design
  const torsionDesign = design?.type === "torsion" ? design as TorsionDesignMeta : null;

  // Calculate scale factor for visualization
  const scale = useMemo(() => {
    if (!torsionDesign) return 1;
    const maxDim = Math.max(
      torsionDesign.meanDiameter * 1.5, 
      torsionDesign.bodyLength,
      torsionDesign.legLength1,
      torsionDesign.legLength2
    );
    return 50 / maxDim; // Normalize to ~50 units
  }, [torsionDesign]);

  // Build complete spring geometry
  const springGeometry = useMemo(() => {
    if (!torsionDesign) return null;

    const {
      wireDiameter,
      meanDiameter,
      activeCoils,
      bodyLength,
      pitch,
      legLength1,
      legLength2,
      freeAngle,
      windingDirection,
    } = torsionDesign;

    // Use pitch from design, or default to wire diameter (close-wound)
    const effectivePitch = pitch || wireDiameter;

    const params: TorsionSpringParams = {
      wireDiameter,
      meanDiameter,
      activeCoils,
      bodyLength,
      pitch: effectivePitch,
      legLength1,
      legLength2,
      freeAngle,
      workingAngle: currentDeflection, // Deflection is working angle in degrees
      windingDirection: windingDirection || "right",
      scale,
      legType: "straight",
    };

    return buildTorsionSpringGeometry(params);
  }, [torsionDesign, currentDeflection, scale]);

  if (!springGeometry || !torsionDesign) {
    return null;
  }

  const { bodyGeometry, leg1Geometry, leg2Geometry, state } = springGeometry;

  // Create materials
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: BODY_COLOR,
      metalness: 0.85,
      roughness: 0.15,
      side: THREE.DoubleSide,
    });
  }, []);

  const legMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: LEG_COLOR,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });
  }, []);

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main spring body */}
      <mesh geometry={bodyGeometry} material={bodyMaterial} />
      
      {/* Leg 1 */}
      {leg1Geometry && (
        <mesh geometry={leg1Geometry} material={legMaterial} />
      )}
      
      {/* Leg 2 */}
      {leg2Geometry && (
        <mesh geometry={leg2Geometry} material={legMaterial} />
      )}
      
      {/* Center axis indicator */}
      <mesh position={[0, 0, torsionDesign.bodyLength * scale / 2]}>
        <cylinderGeometry args={[0.5, 0.5, torsionDesign.bodyLength * scale * 1.2, 16]} />
        <meshStandardMaterial 
          color="#475569" 
          transparent 
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

/**
 * Complete torsion spring visualizer with Canvas and controls
 */
export function TorsionSpringVisualizer() {
  const { design, currentDeflection, currentLoad, currentStiffness } = useSpringSimulationStore();
  const torsionDesign = design?.type === "torsion" ? design as TorsionDesignMeta : null;
  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  if (!torsionDesign) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg">
        <p className="text-sm text-muted-foreground">暂无扭转弹簧数据</p>
      </div>
    );
  }

  // Calculate current angle
  const currentAngle = torsionDesign.freeAngle - currentDeflection;

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [80, 60, 80], fov: 45 }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 30, 20]} intensity={1.2} castShadow />
        <directionalLight position={[-15, -10, -10]} intensity={0.4} />
        <pointLight position={[0, 50, 0]} intensity={0.3} />
        
        <AnimatedTorsionSpring />
        
        <OrbitControls 
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={30}
          maxDistance={250}
          target={[0, 0, 0]}
        />
        
        {/* Ground grid */}
        <gridHelper 
          args={[100, 20, "#94a3b8", "#cbd5e1"]} 
          position={[0, -20, 0]} 
        />
      </Canvas>

      {/* View selector - bottom right */}
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

      {/* Legend overlay */}
      <div className="absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: BODY_COLOR }} />
          <span>弹簧体</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: LEG_COLOR }} />
          <span>弹簧脚</span>
        </div>
      </div>

      {/* Status overlay */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">θ:</span>
          <span className="font-medium">{currentDeflection.toFixed(1)}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">M:</span>
          <span className="font-medium">{currentLoad.toFixed(2)} N·mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">角度:</span>
          <span className="font-medium">{currentAngle.toFixed(1)}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">k:</span>
          <span className="font-medium">{currentStiffness.toFixed(3)} N·mm/°</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Na:</span>
            <span className="font-medium">{torsionDesign.activeCoils}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Dm:</span>
            <span className="font-medium">{torsionDesign.meanDiameter} mm</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">方向:</span>
            <span className="font-medium">
              {torsionDesign.windingDirection === "left" ? "左旋" : "右旋"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
