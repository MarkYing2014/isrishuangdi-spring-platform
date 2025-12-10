"use client";

import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { 
  useSpringSimulationStore, 
  type ExtensionDesignMeta 
} from "@/lib/stores/springSimulationStore";
import {
  buildExtensionSpringGeometry,
  type ExtensionSpringParams,
} from "@/lib/spring3d/extensionSpringGeometry";
import { Button } from "@/components/ui/button";
import { Eye, RotateCcw } from "lucide-react";

// View presets - camera positions for different views
const VIEW_PRESETS = {
  perspective: { position: [60, 40, 80], target: [0, 0, 25] },
  front: { position: [0, 0, 100], target: [0, 0, 25] },      // 前视图 - 沿 Z 轴看
  top: { position: [0, 100, 25], target: [0, 0, 25] },       // 俯视图 - 从上往下看
  side: { position: [100, 0, 25], target: [0, 0, 25] },      // 侧视图 - 沿 X 轴看
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

// Spring colors
const SPRING_COLOR = "#22c55e"; // Green for extension springs
const HOOK_COLOR = "#94a3b8"; // Silver for hooks

/**
 * Animated extension spring model with engineering-accurate geometry
 * 
 * Features:
 * - Close-wound helical body
 * - Hook geometry at both ends
 * - Dynamic extension animation
 */
function AnimatedExtensionSpring() {
  const design = useSpringSimulationStore((state) => state.design);
  const currentDeflection = useSpringSimulationStore((state) => state.currentDeflection);

  // Type guard for extension design
  const extensionDesign = design?.type === "extension" ? design as ExtensionDesignMeta : null;

  // Calculate scale factor for visualization
  const scale = useMemo(() => {
    if (!extensionDesign) return 1;
    const maxDim = Math.max(extensionDesign.outerDiameter * 1.5, extensionDesign.bodyLength);
    return 50 / maxDim; // Normalize to ~50 units
  }, [extensionDesign]);

  // Build complete spring geometry
  const springGeometry = useMemo(() => {
    if (!extensionDesign) return null;

    const {
      wireDiameter,
      outerDiameter,
      activeCoils,
      bodyLength,
      freeLengthInsideHooks,
      hookType,
    } = extensionDesign;

    const params: ExtensionSpringParams = {
      wireDiameter,
      outerDiameter,
      activeCoils,
      bodyLength,
      freeLengthInsideHooks,
      currentExtension: currentDeflection,
      scale,
      hookType,
    };

    return buildExtensionSpringGeometry(params);
  }, [extensionDesign, currentDeflection, scale]);

  // Create materials - MUST be before any conditional returns to maintain hooks order
  const springMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: SPRING_COLOR,
      metalness: 0.85,
      roughness: 0.15,
      side: THREE.DoubleSide,
    });
  }, []);

  const hookMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: HOOK_COLOR,
      metalness: 0.9,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });
  }, []);

  // Early return AFTER all hooks to maintain consistent hook order
  if (!springGeometry || !extensionDesign) {
    return null;
  }

  const { bodyGeometry, topHookGeometry, bottomHookGeometry, state } = springGeometry;

  return (
    <group>
      {/* Main spring body */}
      <mesh geometry={bodyGeometry} material={springMaterial} />
      
      {/* Bottom hook */}
      {bottomHookGeometry && (
        <mesh geometry={bottomHookGeometry} material={hookMaterial} />
      )}
      
      {/* Top hook */}
      {topHookGeometry && (
        <mesh geometry={topHookGeometry} material={hookMaterial} />
      )}
      
      {/* Ground plane shadow */}
      <mesh position={[0, 0, -2]} rotation={[0, 0, 0]}>
        <circleGeometry args={[extensionDesign.outerDiameter * scale * 0.8, 32]} />
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
 * Complete extension spring visualizer with Canvas and controls
 */
export function ExtensionSpringVisualizer() {
  const { design, currentDeflection, currentLoad, currentStiffness, initialTension } = useSpringSimulationStore();
  const extensionDesign = design?.type === "extension" ? design as ExtensionDesignMeta : null;
  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  if (!extensionDesign) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900 rounded-lg">
        <p className="text-sm text-slate-400">暂无拉伸弹簧数据</p>
      </div>
    );
  }

  // Calculate spring state
  const extendedLength = extensionDesign.bodyLength + currentDeflection;

  return (
    <div className="relative h-full w-full">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [60, 40, 80], fov: 45 }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 30, 20]} intensity={1.2} castShadow />
        <directionalLight position={[-15, -10, -10]} intensity={0.4} />
        <pointLight position={[0, 50, 0]} intensity={0.3} />
        
        <AnimatedExtensionSpring />
        
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

      {/* Legend overlay */}
      <div className="absolute top-2 left-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SPRING_COLOR }} />
          <span>弹簧体</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: HOOK_COLOR }} />
          <span>挂钩</span>
        </div>
      </div>

      {/* Status overlay */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Δx:</span>
          <span className="font-medium text-blue-600">{currentDeflection.toFixed(1)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">F:</span>
          <span className="font-medium text-green-600">{currentLoad.toFixed(2)} N</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">L:</span>
          <span className="font-medium">{extendedLength.toFixed(1)} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">k:</span>
          <span className="font-medium">{currentStiffness.toFixed(2)} N/mm</span>
        </div>
      </div>
    </div>
  );
}
