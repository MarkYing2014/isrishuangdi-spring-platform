"use client";

import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { 
  useSpringSimulationStore, 
  type CompressionDesignMeta 
} from "@/lib/stores/springSimulationStore";
import {
  buildCompressionSpringGeometry,
  type CompressionSpringParams,
} from "@/lib/spring3d/compressionSpringGeometry";
import { useFeaStore } from "@/lib/stores/feaStore";
import { applyFeaColors, findMaxSigmaNodeIndex, findMaxDispNodeIndex } from "@/lib/fea/feaTypes";
import { Html } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

import { previewTheme } from "@/lib/three/previewTheme";

// View presets - camera positions for different views
const VIEW_PRESETS = {
  perspective: { position: [60, 40, 80], target: [0, 0, 25] },
  front: { position: [0, 0, 100], target: [0, 0, 25] },      // 前视图 - 沿 Z 轴看
  top: { position: [0, 100, 25], target: [0, 0, 25] },       // 俯视图 - 从上往下看
  side: { position: [100, 0, 25], target: [0, 0, 25] },      // 侧视图 - 沿 X 轴看
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

// Spring colors
const SPRING_COLOR = "#3b82f6"; // Blue for active coils
const SPRING_COLOR_BOTTOMED = "#64748b"; // Gray for bottomed coils
const END_CAP_COLOR = previewTheme.material.endCap.color; // Silver for ground ends

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
  
  // Update camera when view type changes
  useEffect(() => {
    const preset = VIEW_PRESETS[viewType];
    camera.position.set(...(preset.position as [number, number, number]));
    camera.lookAt(...(preset.target as [number, number, number]));
    camera.updateProjectionMatrix();
    
    // Update OrbitControls target after a small delay to ensure it's mounted
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
 * Animated compression spring model with engineering-accurate geometry
 * 
 * Features:
 * - Dead coils at both ends (ground & closed)
 * - Segmented pitch (dead vs active regions)
 * - Clipping planes for ground ends
 * - Dynamic compression animation
 */
function AnimatedCompressionSpring({ previewStrokeMm }: { previewStrokeMm?: number }) {
  const design = useSpringSimulationStore((state) => state.design);
  const storeDeflection = useSpringSimulationStore((state) => state.currentDeflection);
  const currentDeflection = previewStrokeMm ?? storeDeflection;
  const currentStiffness = useSpringSimulationStore((state) => state.currentStiffness);

  // FEA store state for coloring
  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);
  const isFeaMode = colorMode !== "formula" && feaResult !== null;

  // Type guard for compression design
  const compressionDesign = design?.type === "compression" ? design as CompressionDesignMeta : null;

  // Calculate scale factor for visualization
  const scale = useMemo(() => {
    if (!compressionDesign) return 1;
    const maxDim = Math.max(compressionDesign.meanDiameter * 1.5, compressionDesign.freeLength);
    return 50 / maxDim; // Normalize to ~50 units
  }, [compressionDesign]);

  // Build complete spring geometry with clipping planes
  const springGeometry = useMemo(() => {
    if (!compressionDesign) return null;

    const {
      wireDiameter,
      meanDiameter,
      activeCoils,
      freeLength,
    } = compressionDesign;

    // Total coils = active coils + 2 dead coils (1 at each end for ground ends)
    const totalCoils = activeCoils + 2;

    const params: CompressionSpringParams = {
      totalCoils,
      activeCoils,
      meanDiameter,
      wireDiameter,
      freeLength,
      currentDeflection,
      scale,
    };

    return buildCompressionSpringGeometry(params, currentStiffness);
  }, [compressionDesign, currentDeflection, currentStiffness, scale]);

  // Create material with clipping planes - must be called unconditionally
  const springMaterial = useMemo(() => {
    if (!springGeometry) return null;
    const { clipPlanes, state } = springGeometry;
    const mat = new THREE.MeshStandardMaterial({
      // Use white base color when vertexColors is enabled so FEA colors show clearly
      color: isFeaMode ? 0xffffff : (state.isAtSolidHeight ? SPRING_COLOR_BOTTOMED : SPRING_COLOR),
      metalness: isFeaMode ? previewTheme.material.fea.metalness : previewTheme.material.spring.metalness,
      roughness: isFeaMode ? previewTheme.material.fea.roughness : previewTheme.material.spring.roughness,
      side: THREE.DoubleSide,
      clippingPlanes: [clipPlanes.bottom, clipPlanes.top],
      clipShadows: true,
      vertexColors: isFeaMode,
    });
    return mat;
  }, [springGeometry, isFeaMode]);

  // Apply FEA colors to geometry when in FEA mode
  useEffect(() => {
    if (!springGeometry?.tubeGeometry) return;
    
    if (isFeaMode && feaResult) {
      applyFeaColors(springGeometry.tubeGeometry, {
        mode: colorMode,
        feaResult,
      });
    }
  }, [springGeometry, isFeaMode, feaResult, colorMode]);

  // Early return after all hooks
  if (!springGeometry || !compressionDesign || !springMaterial) {
    return null;
  }

  const { tubeGeometry, endDiscs } = springGeometry;

  return (
    <group>
      {/* Main spring tube with clipping - key forces re-render when FEA mode changes */}
      <mesh key={`spring-${isFeaMode}-${colorMode}`} geometry={tubeGeometry} material={springMaterial} />
      
      {/* Bottom ground end disc */}
      <mesh position={[0, 0, endDiscs.bottomPosition]}>
        <ringGeometry args={[endDiscs.innerRadius, endDiscs.outerRadius, 32]} />
        <meshStandardMaterial 
          color={END_CAP_COLOR} 
          metalness={previewTheme.material.endCap.metalness}
          roughness={previewTheme.material.endCap.roughness}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Top ground end disc */}
      <mesh position={[0, 0, endDiscs.topPosition]}>
        <ringGeometry args={[endDiscs.innerRadius, endDiscs.outerRadius, 32]} />
        <meshStandardMaterial 
          color={END_CAP_COLOR} 
          metalness={previewTheme.material.endCap.metalness}
          roughness={previewTheme.material.endCap.roughness}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Ground plane shadow */}
      <mesh position={[0, 0, -0.5]} rotation={[0, 0, 0]}>
        <circleGeometry args={[endDiscs.outerRadius * 1.5, 32]} />
        <meshStandardMaterial 
          color={previewTheme.material.groundShadow.color}
          transparent 
          opacity={previewTheme.material.groundShadow.opacity}
        />
      </mesh>

      {/* Max stress marker - only in FEA mode */}
      {isFeaMode && feaResult && feaResult.nodes.length > 0 && (
        <MaxStressMarker 
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
function MaxStressMarker({ 
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
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[sphereRadius * 1.2, sphereRadius * 1.5, 32]} />
        <meshBasicMaterial
          color={markerData.color}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
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
 * Complete compression spring visualizer with Canvas and controls
 * Matches ConicalSpringVisualizer styling for consistency
 */
export function CompressionSpringVisualizer({ previewStrokeMm }: { previewStrokeMm?: number }) {
  const { design, currentDeflection, currentLoad, currentStiffness } = useSpringSimulationStore();
  const compressionDesign = design?.type === "compression" ? design as CompressionDesignMeta : null;

  // Note: useLanguage would require this to be a client component with LanguageProvider
  // For now, we'll use bilingual labels or just show technical symbols
  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  if (!compressionDesign) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg">
        <p className="text-sm text-muted-foreground">暂无压簧数据</p>
      </div>
    );
  }

  // Calculate spring state
  const totalCoils = compressionDesign.activeCoils + 2;
  const deadCoils = 2;
  const solidHeight = totalCoils * compressionDesign.wireDiameter;
  const compressedLength = compressionDesign.freeLength - currentDeflection;
  const isAtSolidHeight = compressedLength <= solidHeight * 1.01;

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [60, 40, 80], fov: 45 }}
        gl={{ localClippingEnabled: true }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />

        <color attach="background" args={[previewTheme.background]} />
        
        <ambientLight intensity={previewTheme.lights.ambient} />
        <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} castShadow />
        <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
        <pointLight position={previewTheme.lights.point.position} intensity={previewTheme.lights.point.intensity} />
        
        <AnimatedCompressionSpring previewStrokeMm={previewStrokeMm} />
        
        <OrbitControls 
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={20}
          maxDistance={200}
          target={[0, 0, 25]}
        />
        
        {/* Ground grid */}
        <gridHelper 
          args={[80, 16, previewTheme.grid.major, previewTheme.grid.minor]} 
          position={[0, 0, 0]} 
          rotation={[Math.PI / 2, 0, 0]}
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
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SPRING_COLOR }} />
          <span>有效圈</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: END_CAP_COLOR }} />
          <span>并紧圈</span>
        </div>
        {isAtSolidHeight && (
          <div className="mt-1 text-amber-600 font-medium">
            ⚠ 已达固体高度
          </div>
        )}
      </div>

      {/* Status overlay - uses technical symbols (international) */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Δx:</span>
          <span className="font-medium">{currentDeflection.toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">F:</span>
          <span className="font-medium">{currentLoad.toFixed(2)} N</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">L:</span>
          <span className="font-medium">{compressedLength.toFixed(2)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">k:</span>
          <span className="font-medium">{currentStiffness.toFixed(2)} N/mm</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Nt:</span>
            <span className="font-medium">{totalCoils}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Na:</span>
            <span className="font-medium">{compressionDesign.activeCoils}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Nc:</span>
            <span className="font-medium">{deadCoils}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Hs:</span>
            <span className="font-medium">{solidHeight.toFixed(1)} mm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
