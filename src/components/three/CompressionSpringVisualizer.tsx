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
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

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
const END_CAP_COLOR = "#94a3b8"; // Silver for ground ends

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
function AnimatedCompressionSpring() {
  const design = useSpringSimulationStore((state) => state.design);
  const currentDeflection = useSpringSimulationStore((state) => state.currentDeflection);
  const currentStiffness = useSpringSimulationStore((state) => state.currentStiffness);

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

  if (!springGeometry || !compressionDesign) {
    return null;
  }

  const { tubeGeometry, clipPlanes, endDiscs, state } = springGeometry;

  // Create material with clipping planes
  const springMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: state.isAtSolidHeight ? SPRING_COLOR_BOTTOMED : SPRING_COLOR,
      metalness: 0.85,
      roughness: 0.15,
      side: THREE.DoubleSide,
      clippingPlanes: [clipPlanes.bottom, clipPlanes.top],
      clipShadows: true,
    });
    return mat;
  }, [clipPlanes, state.isAtSolidHeight]);

  return (
    <group>
      {/* Main spring tube with clipping */}
      <mesh geometry={tubeGeometry} material={springMaterial} />
      
      {/* Bottom ground end disc */}
      <mesh position={[0, 0, endDiscs.bottomPosition]}>
        <ringGeometry args={[endDiscs.innerRadius, endDiscs.outerRadius, 32]} />
        <meshStandardMaterial 
          color={END_CAP_COLOR} 
          metalness={0.9} 
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Top ground end disc */}
      <mesh position={[0, 0, endDiscs.topPosition]}>
        <ringGeometry args={[endDiscs.innerRadius, endDiscs.outerRadius, 32]} />
        <meshStandardMaterial 
          color={END_CAP_COLOR} 
          metalness={0.9} 
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Ground plane shadow */}
      <mesh position={[0, 0, -0.5]} rotation={[0, 0, 0]}>
        <circleGeometry args={[endDiscs.outerRadius * 1.5, 32]} />
        <meshStandardMaterial 
          color="#1e293b" 
          transparent 
          opacity={0.15}
        />
      </mesh>
    </group>
  );
}

/**
 * Complete compression spring visualizer with Canvas and controls
 * Matches ConicalSpringVisualizer styling for consistency
 */
export function CompressionSpringVisualizer() {
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
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 30, 20]} intensity={1.2} castShadow />
        <directionalLight position={[-15, -10, -10]} intensity={0.4} />
        <pointLight position={[0, 50, 0]} intensity={0.3} />
        
        <AnimatedCompressionSpring />
        
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
          args={[80, 16, "#94a3b8", "#cbd5e1"]} 
          position={[0, 0, 0]} 
          rotation={[Math.PI / 2, 0, 0]}
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
