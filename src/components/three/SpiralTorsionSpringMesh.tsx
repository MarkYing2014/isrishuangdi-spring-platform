/**
 * Spiral Torsion Spring 3D Mesh Component
 * 螺旋扭转弹簧（带材卷绕式）Three.js 网格组件
 * 
 * 使用阿基米德螺线中心线 + 矩形截面 Sweep 生成实体
 * 用于 React Three Fiber 渲染
 */

"use client";

import { useRef, useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Edges, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useFeaStore } from "@/lib/stores/feaStore";
import { applyFeaColors } from "@/lib/fea/feaTypes";
import { previewTheme } from "@/lib/three/previewTheme";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
  createSpiralTorsionSpringGeometry,
  validateSpiralTorsionGeometry,
  type SpiralTorsionGeometryParams,
} from "@/lib/spring3d/spiralTorsionGeometry";

// View presets
const VIEW_PRESETS = {
  perspective: { position: [0, 60, 80], target: [0, 0, 0] },
  front: { position: [0, 0, 100], target: [0, 0, 0] },    // Z axis
  top: { position: [0, 100, 0], target: [0, 0, 0] },      // Y axis
  side: { position: [100, 0, 0], target: [0, 0, 0] },     // X axis
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

/**
 * Camera controller component
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

// ============================================================================
// Types
// ============================================================================

export interface SpiralTorsionSpringMeshProps {
  /** 内径 Di (mm) */
  innerDiameter: number;
  /** 外径 Do (mm) */
  outerDiameter: number;
  /** 圈数 N (revolutions) */
  turns: number;
  /** 带材宽度 b (mm) */
  stripWidth: number;
  /** 带材厚度 t (mm) */
  stripThickness: number;
  /** 绕向：cw = 顺时针，ccw = 逆时针 */
  handedness?: "cw" | "ccw";
  /** 拉伸步数（默认 800） */
  steps?: number;
  /** 材质颜色（默认 #4a90d9） */
  color?: string;
  /** 金属度（默认 0.6） */
  metalness?: number;
  /** 粗糙度（默认 0.3） */
  roughness?: number;
  /** 是否显示线框（默认 false） */
  wireframe?: boolean;
  /** 位置偏移 */
  position?: [number, number, number];
  /** 旋转 */
  rotation?: [number, number, number];
  /** 缩放 */
  scale?: number;
}

// ============================================================================
// Component
// ============================================================================

export function SpiralTorsionSpringMesh({
  innerDiameter,
  outerDiameter,
  turns,
  stripWidth,
  stripThickness,
  handedness = "cw",
  steps = 800,
  color = "#6b9bd1",
  metalness = previewTheme.material.spring.metalness,
  roughness = previewTheme.material.spring.roughness,
  wireframe = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: SpiralTorsionSpringMeshProps) {
  const feaResult = useFeaStore((s) => s.feaResult);
  const colorMode = useFeaStore((s) => s.colorMode);
  const isFeaMode = colorMode !== "formula" && feaResult !== null;

  // 构建几何参数
  const params: SpiralTorsionGeometryParams = useMemo(() => ({
    innerDiameter,
    outerDiameter,
    turns,
    stripWidth,
    stripThickness,
    handedness,
    zOffset: 0,
  }), [innerDiameter, outerDiameter, turns, stripWidth, stripThickness, handedness]);

  // 验证几何参数
  const validation = useMemo(() => validateSpiralTorsionGeometry(params), [params]);

  // 创建几何体并应用 FEA 颜色
  const geometry = useMemo(() => {
    if (!validation.valid) {
      return new THREE.BoxGeometry(10, 10, 10);
    }
    const geom = createSpiralTorsionSpringGeometry(params, steps);
    
    // 在创建几何体时就应用 FEA 颜色
    if (isFeaMode && feaResult) {
      applyFeaColors(geom, {
        mode: colorMode,
        feaResult,
      });
    }
    
    return geom;
  }, [params, steps, validation.valid, isFeaMode, feaResult, colorMode]);

  const meshRef = useRef<THREE.Mesh>(null);

  // 使用 key 强制在 FEA 模式切换时重新创建 mesh 和材质
  const meshKey = `mesh-${isFeaMode ? 'fea' : 'normal'}-${colorMode}-${feaResult ? 'hasResult' : 'noResult'}`;

  return (
    <mesh
      key={meshKey}
      ref={meshRef}
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={validation.valid ? (isFeaMode ? "#ffffff" : color) : "#ff4444"}
        metalness={isFeaMode ? previewTheme.material.fea.metalness : metalness}
        roughness={isFeaMode ? previewTheme.material.fea.roughness : roughness}
        wireframe={wireframe}
        side={THREE.DoubleSide}
        vertexColors={isFeaMode}
      />
      {/* 添加轮廓线，提高可读性 */}
      <Edges threshold={15} color="#1a365d" />
    </mesh>
  );
}



// ============================================================================
// Visualizer Component (with controls)
// ============================================================================

export interface SpiralTorsionSpringVisualizerProps {
  /** 内径 Di (mm) */
  innerDiameter?: number;
  /** 外径 Do (mm) */
  outerDiameter?: number;
  /** 圈数 N (revolutions) */
  turns?: number;
  /** 带材宽度 b (mm) */
  stripWidth?: number;
  /** 带材厚度 t (mm) */
  stripThickness?: number;
  /** 绕向 */
  handedness?: "cw" | "ccw";
  /** 是否自动旋转 */
  autoRotate?: boolean;
  /** 缩放因子（用于适配视口） */
  scaleFactor?: number;
  
  // New props for status overlay
  springRate?: number;
  torque?: number;
}

export function SpiralTorsionSpringVisualizer({
  innerDiameter = 15,
  outerDiameter = 50,
  turns = 5,
  stripWidth = 10,
  stripThickness = 0.5,
  handedness = "cw",
  autoRotate = false,
  scaleFactor = 1,
  springRate,
  torque,
}: SpiralTorsionSpringVisualizerProps) {
  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[300px]" style={{ background: previewTheme.background }}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 5000, position: [0, 60, 80] }}
        gl={{ antialias: true, alpha: true }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        
        <Suspense fallback={null}>
          <color attach="background" args={[previewTheme.background]} />
          
          <ambientLight intensity={previewTheme.lights.ambient} />
          <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} castShadow />
          <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
          <pointLight position={previewTheme.lights.point.position} intensity={previewTheme.lights.point.intensity} />
          
          <Environment preset="studio" />

          {/* 螺旋扭转弹簧网格 - Rotate to lie flat on grid usually, but preset puts it on side.
              In Standard preview (Compression), Y is Up. 
              Spiral Torsion is planar. Usually lies on XZ plane?
              Mesh generator creates it in XY plane generally. 
              Let's rotate it -90 X to lie flat on XZ grid if we use standard Y-up grid.
          */}
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <SpiralTorsionSpringMesh
              innerDiameter={innerDiameter}
              outerDiameter={outerDiameter}
              turns={turns}
              stripWidth={stripWidth}
              stripThickness={stripThickness}
              handedness={handedness}
              scale={scaleFactor}
              color="#6b9bd1"
              metalness={previewTheme.material.spring.metalness}
              roughness={previewTheme.material.spring.roughness}
            />
          </group>

          <gridHelper 
            args={[200, 20, previewTheme.grid.major, previewTheme.grid.minor]} 
            position={[0, -stripWidth/2, 0]} 
          />
          
          <OrbitControls 
            ref={controlsRef}
            autoRotate={autoRotate}
            autoRotateSpeed={1}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={10}
            maxDistance={500}
          />
        </Suspense>
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
      <div className="absolute top-2 left-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow z-10">
        <div className="flex items-center gap-2">
           <span className="font-semibold text-slate-700">Spiral Torsion</span>
        </div>
        <div className="mt-1 text-slate-600">
           {handedness === "cw" ? "CW (Right)" : "CCW (Left)"}
        </div>
      </div>

      {/* Status overlay - top right */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5 z-10">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">OD:</span>
          <span className="font-medium">{outerDiameter ?? "-"} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">ID:</span>
          <span className="font-medium">{innerDiameter ?? "-"} mm</span>
        </div>
         <div className="flex justify-between gap-4">
          <span className="text-slate-500">b×t:</span>
          <span className="font-medium">{stripWidth}×{stripThickness}</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Nt:</span>
            <span className="font-medium">{turns}</span>
          </div>
          {springRate !== undefined && (
             <div className="flex justify-between gap-4">
                <span className="text-slate-500">Rate:</span>
                <span className="font-medium">{springRate.toFixed(2)} Nmm/°</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SpiralTorsionSpringMesh;
