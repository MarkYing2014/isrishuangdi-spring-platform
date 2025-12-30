"use client";

import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AutoFitControls } from "./AutoFitControls";
import { useSpringSimulationStore, type ConicalDesignMeta } from "@/lib/stores/springSimulationStore";
import { 
  buildConicalSpringGeometry,
  type ConicalSpringParams,
} from "@/lib/spring3d/conicalSpringGeometry";
import { useFeaStore } from "@/lib/stores/feaStore";
import { applyFeaColors, findMaxSigmaNodeIndex, findMaxDispNodeIndex } from "@/lib/fea/feaTypes";
import { Html } from "@react-three/drei";
import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Pause } from "lucide-react";

import { previewTheme } from "@/lib/three/previewTheme";

// View presets - camera positions for different views
// Target Y will be adjusted based on spring height
const getViewPresets = (springCenterY: number) => ({
  perspective: { position: [60, 45 + springCenterY, 60], target: [0, springCenterY, 0] },
  front: { position: [0, springCenterY, 100], target: [0, springCenterY, 0] },      // 前视图
  top: { position: [0, 100 + springCenterY, 0], target: [0, springCenterY, 0] },    // 俯视图
  side: { position: [100, springCenterY, 0], target: [0, springCenterY, 0] },       // 侧视图
} as const);

type ViewType = 'perspective' | 'front' | 'top' | 'side';

// Colors for coil states
const COLLAPSED_COLOR = "#64748b"; // Slate gray for collapsed coils
const ACTIVE_COLOR = "#2563eb";    // Blue for active coils

/**
 * Camera controller component - must be inside Canvas
 * 方案 B: 相机目标调整到弹簧中心
 */
function CameraController({ 
  viewType, 
  controlsRef,
  springCenterY = 25, // Default center height
}: { 
  viewType: ViewType; 
  controlsRef: React.RefObject<any>;
  springCenterY?: number;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    const presets = getViewPresets(springCenterY);
    const preset = presets[viewType];
    camera.position.set(...(preset.position as [number, number, number]));
    camera.lookAt(...(preset.target as [number, number, number]));
    camera.updateProjectionMatrix();
    
    setTimeout(() => {
      if (controlsRef.current) {
        controlsRef.current.target.set(...(preset.target as [number, number, number]));
        controlsRef.current.autoRotate = viewType === "perspective";
        controlsRef.current.update();
      }
    }, 10);
  }, [viewType, camera, controlsRef, springCenterY]);
  
  return null;
}

/**
 * Conical spring model using new geometry generator with closed ground ends
 * 使用新几何生成器的锥形弹簧模型，支持并紧磨平端
 */
function ConicalSpringModel({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const { design, collapsedCoils, currentDeflection } = useSpringSimulationStore();

  // FEA store state for coloring
  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);
  const isFeaMode = colorMode !== "formula" && feaResult !== null;

  // Type guard for conical design
  const conicalDesign = design?.type === "conical" ? design as ConicalDesignMeta : null;

  // Calculate scale factor for visualization
  const scale = useMemo(() => {
    if (!conicalDesign) return 1;
    const maxDim = Math.max(conicalDesign.largeOuterDiameter, conicalDesign.freeLength);
    return 50 / maxDim; // Normalize to ~50 units
  }, [conicalDesign]);

  // Generate spring geometry using new generator
  const springGeometry = useMemo(() => {
    if (!conicalDesign) return null;

    const {
      wireDiameter,
      largeOuterDiameter,
      smallOuterDiameter,
      activeCoils,
      freeLength,
    } = conicalDesign;

    const params: ConicalSpringParams = {
      wireDiameter,
      largeOuterDiameter,
      smallOuterDiameter,
      freeLength,
      activeCoils,
      endType: 'closed_ground', // 并紧磨平端
      currentDeflection,
      collapsedCoils,
      scale,
    };

    return buildConicalSpringGeometry(params);
  }, [conicalDesign, collapsedCoils, currentDeflection, scale]);

  // Apply FEA colors to geometry when in FEA mode
  useEffect(() => {
    if (!springGeometry?.activeGeometry) return;
    
    if (isFeaMode && feaResult) {
      applyFeaColors(springGeometry.activeGeometry, {
        mode: colorMode,
        feaResult,
      });
      // Also color collapsed geometry if present
      if (springGeometry.collapsedGeometry) {
        applyFeaColors(springGeometry.collapsedGeometry, {
          mode: colorMode,
          feaResult,
        });
      }
    }
  }, [springGeometry, isFeaMode, feaResult, colorMode]);

  if (!design || !springGeometry) {
    return null;
  }

  const { 
    activeGeometry, 
    collapsedGeometry, 
    totalHeight,
    wireRadius,
    clipPlanes,
    endDiscs,
  } = springGeometry;

  // 方案 A: 不使用 yOffset，弹簧从 Y=0 开始向上生长
  // 裁剪平面和端面位置直接使用几何计算的值

  // Metallic spring material color
  const SPRING_COLOR = "#b8860b"; // Dark golden rod - like real spring steel
  const END_CAP_COLOR = "#94a3b8"; // Silver for ground ends

  // 直接使用几何生成的裁剪平面（不需要调整）
  const clippingPlanes = clipPlanes ? [clipPlanes.bottom, clipPlanes.top] : [];

  return (
    <group ref={groupRef}>
      {/* Collapsed coils (gray) with clipping - key forces re-render when FEA mode changes */}
      {collapsedGeometry && (
        <mesh key={`collapsed-${isFeaMode}-${colorMode}`} geometry={collapsedGeometry}>
          <meshStandardMaterial 
            color={isFeaMode ? 0xffffff : COLLAPSED_COLOR}
            metalness={isFeaMode ? previewTheme.material.fea.metalness : previewTheme.material.spring.metalness}
            roughness={isFeaMode ? previewTheme.material.fea.roughness : previewTheme.material.spring.roughness}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
            vertexColors={isFeaMode}
          />
        </mesh>
      )}

      {/* Active coils (blue) with clipping for ground ends - key forces re-render when FEA mode changes */}
      {activeGeometry && (
        <mesh key={`active-${isFeaMode}-${colorMode}`} geometry={activeGeometry}>
          <meshStandardMaterial 
            color={isFeaMode ? 0xffffff : ACTIVE_COLOR}
            metalness={isFeaMode ? previewTheme.material.fea.metalness : previewTheme.material.spring.metalness}
            roughness={isFeaMode ? previewTheme.material.fea.roughness : previewTheme.material.spring.roughness}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
            vertexColors={isFeaMode}
          />
        </mesh>
      )}

      {/* Bottom ground flat surface (ring) - 像压缩弹簧一样 */}
      {endDiscs && (
        <mesh position={[0, endDiscs.bottomPosition, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            endDiscs.largeRadius - endDiscs.wireRadius * 2, 
            endDiscs.largeRadius, 
            32
          ]} />
          <meshStandardMaterial 
            color={previewTheme.material.endCap.color} 
            metalness={previewTheme.material.endCap.metalness}
            roughness={previewTheme.material.endCap.roughness}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Top ground flat surface (ring) */}
      {endDiscs && (
        <mesh position={[0, endDiscs.topPosition, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            endDiscs.smallRadius - endDiscs.wireRadius * 2, 
            endDiscs.smallRadius, 
            32
          ]} />
          <meshStandardMaterial 
            color={previewTheme.material.endCap.color} 
            metalness={previewTheme.material.endCap.metalness}
            roughness={previewTheme.material.endCap.roughness}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Ground plane shadow */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[endDiscs ? endDiscs.largeRadius * 1.5 : wireRadius * 15, 32]} />
        <meshStandardMaterial 
          color={previewTheme.material.groundShadow.color}
          transparent 
          opacity={previewTheme.material.groundShadow.opacity}
        />
      </mesh>

      {/* Max stress marker - only in FEA mode */}
      {isFeaMode && feaResult && feaResult.nodes.length > 0 && (
        <ConicalMaxStressMarker 
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
function ConicalMaxStressMarker({ 
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
    // Conical spring uses Y as vertical axis
    return {
      position: [targetNode.x * scale, targetNode.z * scale, targetNode.y * scale] as [number, number, number],
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
 * Legend component showing color meanings and description
 */
function Legend() {
  return (
    <div className="absolute top-2 left-2 bg-white/90 rounded-md px-2 py-1.5 text-xs text-slate-900 shadow">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ACTIVE_COLOR }} />
        <span>工作圈</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLLAPSED_COLOR }} />
        <span>贴底圈</span>
      </div>
    </div>
  );
}

/**
 * Status display showing current state
 */
function StatusDisplay() {
  const { currentDeflection, collapsedCoils, activeCoils, currentLoad, currentStiffness } = useSpringSimulationStore();
  
  return (
    <div className="absolute top-2 right-2 bg-white/90 rounded-md px-3 py-2 text-xs text-slate-900 shadow">
      <div>Δx = {currentDeflection.toFixed(2)} mm</div>
      <div>F = {currentLoad.toFixed(2)} N</div>
      <div>k = {currentStiffness.toFixed(2)} N/mm</div>
      <div className="mt-1 pt-1 border-t border-slate-200">
        <span className="text-blue-600">{activeCoils}</span> active, 
        <span className="text-slate-500 ml-1">{collapsedCoils}</span> collapsed
      </div>
    </div>
  );
}

export interface ConicalSpringVisualizerProps {
  hideControls?: boolean;
}

/**
 * Main visualizer component with Canvas
 */
export function ConicalSpringVisualizer(props: ConicalSpringVisualizerProps) {
  const { mode, design, maxDeflection, setDeflection } = useSpringSimulationStore();
  const controlsRef = useRef<any>(null);
  const springGroupRef = useRef<THREE.Group>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");
  
  // 动画控制状态
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const directionRef = useRef<1 | -1>(1); // 1 = 压缩, -1 = 释放

  // 方案 B: 计算弹簧中心高度用于相机目标
  const conicalDesign = design?.type === "conical" ? design as ConicalDesignMeta : null;
  const springCenterY = useMemo(() => {
    if (!conicalDesign) return 25;
    const maxDim = Math.max(conicalDesign.largeOuterDiameter, conicalDesign.freeLength);
    const scale = 50 / maxDim;
    // 弹簧高度的一半作为中心
    return (conicalDesign.freeLength * scale) / 2;
  }, [conicalDesign]);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  // 动画循环
  useEffect(() => {
    if (!isAnimating || maxDeflection <= 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }
      
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      
      // 限制 deltaTime 防止跳帧
      const clampedDelta = Math.min(deltaTime, 100);
      
      // 动画速度：每秒移动 maxDeflection 的 25%（稍慢一点更平滑）
      const speed = maxDeflection * 0.25;
      const delta = (clampedDelta / 1000) * speed * directionRef.current;
      
      const { currentDeflection } = useSpringSimulationStore.getState();
      let newDeflection = currentDeflection + delta;
      
      // 到达边界时反向
      if (newDeflection >= maxDeflection * 0.95) {
        newDeflection = maxDeflection * 0.95; // 不要完全到底
        directionRef.current = -1;
      } else if (newDeflection <= maxDeflection * 0.05) {
        newDeflection = maxDeflection * 0.05; // 不要完全释放
        directionRef.current = 1;
      }
      
      setDeflection(newDeflection);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, maxDeflection, setDeflection]);

  // 切换动画播放/暂停
  const toggleAnimation = useCallback(() => {
    setIsAnimating(prev => !prev);
  }, []);

  if (mode !== "conical-nonlinear" || !design) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg">
        <p className="text-sm text-muted-foreground text-center px-4">
          Generate nonlinear curve first to enable 3D visualization.
          <br />
          <span className="text-slate-400">请先计算非线性曲线以启用 3D 可视化。</span>
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [60, 45 + springCenterY, 60], fov: 50 }}
        gl={{ 
          antialias: true,
          preserveDrawingBuffer: true,
          localClippingEnabled: true, // Enable clipping for ground ends
        }}
        frameloop="always"
        dpr={[1, 2]}
      >
        <CameraController 
          viewType={currentView} 
          controlsRef={controlsRef} 
          springCenterY={springCenterY}
        />
        
        <color attach="background" args={[previewTheme.background]} />
        <ambientLight intensity={previewTheme.lights.ambient} />
        <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} castShadow />
        <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
        <pointLight position={previewTheme.lights.point.position} intensity={previewTheme.lights.point.intensity} />
        
        <ConicalSpringModel groupRef={springGroupRef} />
        
        <AutoFitControls 
          ref={controlsRef}
          targetRef={springGroupRef}
          minDistance={20}
          maxDistance={250}
          autoRotate={currentView === "perspective"}
          autoRotateSpeed={0.5}
        />
        
        <gridHelper args={[80, 16, previewTheme.grid.major, previewTheme.grid.minor]} position={[0, -2, 0]} />
      </Canvas>
      
      {/* Animation control - top center (Hidden if external controls active) */}
      {!props.hideControls && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <Button
            variant={isAnimating ? "default" : "secondary"}
            size="sm"
            className="h-8 px-3 text-xs gap-1"
            onClick={toggleAnimation}
            title={isAnimating ? "暂停动画 / Pause" : "播放动画 / Play"}
          >
            {isAnimating ? (
              <>
                <Pause className="h-3 w-3" />
                暂停
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                播放
              </>
            )}
          </Button>
        </div>
      )}

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
      
      <Legend />
      <StatusDisplay />
    </div>
  );
}
