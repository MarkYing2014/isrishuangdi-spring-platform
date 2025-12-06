"use client";

import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useSpringSimulationStore, type ConicalDesignMeta } from "@/lib/stores/springSimulationStore";
import { 
  buildConicalSpringGeometry,
  type ConicalSpringParams,
} from "@/lib/spring3d/conicalSpringGeometry";
import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Pause } from "lucide-react";

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
function ConicalSpringModel() {
  const { design, collapsedCoils, currentDeflection } = useSpringSimulationStore();

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
    <group>
      {/* Collapsed coils (gray) with clipping */}
      {collapsedGeometry && (
        <mesh geometry={collapsedGeometry}>
          <meshStandardMaterial 
            color={COLLAPSED_COLOR} 
            metalness={0.6} 
            roughness={0.3}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
          />
        </mesh>
      )}

      {/* Active coils (blue) with clipping for ground ends */}
      {activeGeometry && (
        <mesh geometry={activeGeometry}>
          <meshStandardMaterial 
            color={ACTIVE_COLOR} 
            metalness={0.6} 
            roughness={0.3}
            clippingPlanes={clippingPlanes}
            clipShadows={true}
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
            color={END_CAP_COLOR} 
            metalness={0.9} 
            roughness={0.1}
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
            color={END_CAP_COLOR} 
            metalness={0.9} 
            roughness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Ground plane shadow */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[endDiscs ? endDiscs.largeRadius * 1.5 : wireRadius * 15, 32]} />
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
 * Legend component showing color meanings and description
 */
function Legend() {
  return (
    <div className="absolute bottom-2 left-2 bg-black/70 rounded-md px-3 py-2 text-xs text-white max-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ACTIVE_COLOR }} />
        <span>Active coils / 工作圈</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLLAPSED_COLOR }} />
        <span>Collapsed coils / 贴底圈</span>
      </div>
      <div className="text-[10px] text-slate-300 border-t border-white/20 pt-1">
        Continuous helical tube. Grey = collapsed, Blue = active.
        <br />
        <span className="text-slate-400">连续螺旋管显示，灰色为贴底圈，蓝色为工作圈。</span>
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
    <div className="absolute top-2 right-2 bg-black/70 rounded-md px-3 py-2 text-xs text-white">
      <div>Δx = {currentDeflection.toFixed(2)} mm</div>
      <div>F = {currentLoad.toFixed(2)} N</div>
      <div>k = {currentStiffness.toFixed(2)} N/mm</div>
      <div className="mt-1 pt-1 border-t border-white/30">
        <span className="text-blue-400">{activeCoils}</span> active, 
        <span className="text-slate-400 ml-1">{collapsedCoils}</span> collapsed
      </div>
    </div>
  );
}

/**
 * Main visualizer component with Canvas
 */
export function ConicalSpringVisualizer() {
  const { mode, design, maxDeflection, setDeflection } = useSpringSimulationStore();
  const controlsRef = useRef<any>(null);
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
    <div className="relative h-full w-full rounded-lg overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900">
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
        
        <color attach="background" args={["#1e293b"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20 + springCenterY, 10]} intensity={1} castShadow />
        <directionalLight position={[-10, 10 + springCenterY, -10]} intensity={0.4} />
        <pointLight position={[0, 30 + springCenterY, 0]} intensity={0.3} />
        
        <ConicalSpringModel />
        
        <OrbitControls 
          ref={controlsRef}
          enablePan={false}
          minDistance={20}
          maxDistance={150}
          target={[0, springCenterY, 0]}
          autoRotate={currentView === "perspective"}
          autoRotateSpeed={0.5}
        />
        
        <gridHelper args={[80, 16, "#475569", "#334155"]} position={[0, -2, 0]} />
      </Canvas>
      
      {/* Animation control - top left */}
      <div className="absolute top-2 left-2">
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
      
      <Legend />
      <StatusDisplay />
    </div>
  );
}
