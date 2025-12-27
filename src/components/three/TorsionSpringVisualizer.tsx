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
import { computeAngles, torsionAngles } from "@/lib/angle/AngleModel";
import { useFeaStore } from "@/lib/stores/feaStore";
import { applyFeaColors, findMaxSigmaNodeIndex, findMaxDispNodeIndex } from "@/lib/fea/feaTypes";
import { Html } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

import { previewTheme } from "@/lib/three/previewTheme";

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
const LEG_COLOR = previewTheme.material.endCap.color; // Silver for legs

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
function AnimatedTorsionSpring({ previewStrokeMm }: { previewStrokeMm?: number }) {
  const design = useSpringSimulationStore((state) => state.design);
  const storeDeflection = useSpringSimulationStore((state) => state.currentDeflection);
  const currentDeflection = previewStrokeMm ?? storeDeflection;
  
  // FEA store state for coloring
  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);
  const isFeaMode = colorMode !== "formula" && feaResult !== null;

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
  // Create materials - MUST be before any early returns to follow Rules of Hooks
  const bodyMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      // Use white base color when vertexColors is enabled so FEA colors show clearly
      color: isFeaMode ? 0xffffff : BODY_COLOR,
      metalness: isFeaMode ? previewTheme.material.fea.metalness : previewTheme.material.spring.metalness,
      roughness: isFeaMode ? previewTheme.material.fea.roughness : previewTheme.material.spring.roughness,
      side: THREE.DoubleSide,
      vertexColors: isFeaMode,
    });
  }, [isFeaMode]);

  const legMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: LEG_COLOR,
      metalness: previewTheme.material.endCap.metalness,
      roughness: previewTheme.material.endCap.roughness,
      side: THREE.DoubleSide,
    });
  }, []);

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
      windingDirection,
    } = torsionDesign;

    // Use pitch from design, or default to wire diameter (close-wound)
    const effectivePitch = pitch || wireDiameter;

    // Use the unified AngleModel to derive visual angles
    // θref (install) and θtarget (work) are used to define the engineering Δθ
    // For visualization, we center Δθ around θ=0
    const angleDerived = computeAngles(torsionAngles(0, currentDeflection));
    const { minDeg, maxDeg } = angleDerived.visual;

    const params: TorsionSpringParams = {
      wireDiameter,
      meanDiameter,
      activeCoils,
      bodyLength,
      pitch: effectivePitch,
      legLength1,
      legLength2,
      freeAngle: maxDeg - minDeg, // This is Δθ (magnitude)
      workingAngle: maxDeg,       // Current pose (top of range)
      windingDirection: windingDirection || "right",
      scale,
      legType: "straight",
    };

    return buildTorsionSpringGeometry(params);
  }, [torsionDesign, currentDeflection, scale]);

  // Apply FEA colors to geometry when in FEA mode
  useEffect(() => {
    if (!springGeometry?.bodyGeometry) return;
    
    if (isFeaMode && feaResult) {
      applyFeaColors(springGeometry.bodyGeometry, {
        mode: colorMode,
        feaResult,
      });
    }
  }, [springGeometry, isFeaMode, feaResult, colorMode]);

  if (!springGeometry || !torsionDesign) {
    return null;
  }

  const { bodyGeometry, leg1Geometry, leg2Geometry, state } = springGeometry;

  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      {/* Main spring body - key forces re-render when FEA mode changes */}
      <mesh key={`spring-${isFeaMode}-${colorMode}`} geometry={bodyGeometry} material={bodyMaterial} />
      
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

      {/* Max stress marker - only in FEA mode */}
      {isFeaMode && feaResult && feaResult.nodes.length > 0 && (
        <TorsionMaxStressMarker 
          feaResult={feaResult} 
          colorMode={colorMode} 
          scale={scale} 
        />
      )}
    </group>
  );
}

/**
 * Marker showing the location of maximum stress or displacement
 */
function TorsionMaxStressMarker({ 
  feaResult, 
  colorMode, 
  scale 
}: { 
  feaResult: NonNullable<ReturnType<typeof useFeaStore.getState>["feaResult"]>;
  colorMode: string;
  scale: number;
}) {
  const nodes = feaResult.nodes;
  
  const markerData = useMemo(() => {
    let nodeIndex: number;
    let value: number;
    let label: string;
    let unit: string;
    let color: string;

    switch (colorMode) {
      case "fea_sigma":
        nodeIndex = findMaxSigmaNodeIndex(nodes);
        value = nodes[nodeIndex].sigma_vm;
        label = "σ_max";
        unit = "MPa";
        color = "#ff0000";
        break;
      case "fea_disp":
        nodeIndex = findMaxDispNodeIndex(nodes);
        const node = nodes[nodeIndex];
        value = Math.sqrt(node.ux ** 2 + node.uy ** 2 + node.uz ** 2);
        label = "u_max";
        unit = "mm";
        color = "#ff6600";
        break;
      default:
        nodeIndex = findMaxSigmaNodeIndex(nodes);
        value = nodes[nodeIndex].sigma_vm;
        label = "σ_max";
        unit = "MPa";
        color = "#ff0000";
    }

    const targetNode = nodes[nodeIndex];
    return {
      position: [targetNode.x * scale, targetNode.y * scale, targetNode.z * scale] as [number, number, number],
      value,
      label,
      unit,
      color,
    };
  }, [nodes, colorMode, scale]);

  const sphereRadius = 1.5;

  return (
    <group position={markerData.position}>
      <mesh>
        <sphereGeometry args={[sphereRadius, 16, 16]} />
        <meshStandardMaterial
          color={markerData.color}
          emissive={markerData.color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Html position={[0, sphereRadius * 2, 0]} center style={{ pointerEvents: "none" }}>
        <div className="px-2 py-1 rounded bg-black/80 text-white text-xs whitespace-nowrap">
          <span className="font-medium">{markerData.label}</span>
          {" = "}
          <span className="font-mono">{markerData.value.toFixed(1)}</span>
          {markerData.unit && <span className="text-gray-300"> {markerData.unit}</span>}
        </div>
      </Html>
    </group>
  );
}

/**
 * Complete torsion spring visualizer with Canvas and controls
 */
export function TorsionSpringVisualizer({ previewStrokeMm }: { previewStrokeMm?: number }) {
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

        <color attach="background" args={[previewTheme.background]} />
        
        <ambientLight intensity={previewTheme.lights.ambient} />
        <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} castShadow />
        <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
        <pointLight position={previewTheme.lights.point.position} intensity={previewTheme.lights.point.intensity} />
        
        <AnimatedTorsionSpring previewStrokeMm={previewStrokeMm} />
        
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
          args={[100, 20, previewTheme.grid.major, previewTheme.grid.minor]} 
          position={[0, -20, 0]} 
        />
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
      <div className="absolute top-2 left-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow">
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
          <span className="text-slate-500">Δθ:</span>
          <span className="font-medium">{currentDeflection.toFixed(1)}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">M:</span>
          <span className="font-medium">{currentLoad.toFixed(2)} N·mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Engineering:</span>
          <span className="font-medium">Δθ-First</span>
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
