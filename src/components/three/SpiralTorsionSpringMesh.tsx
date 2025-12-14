/**
 * Spiral Torsion Spring 3D Mesh Component
 * 螺旋扭转弹簧（带材卷绕式）Three.js 网格组件
 * 
 * 使用阿基米德螺线中心线 + 矩形截面 Sweep 生成实体
 * 用于 React Three Fiber 渲染
 */

"use client";

import { useMemo, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
import * as THREE from "three";
import {
  createSpiralTorsionSpringGeometry,
  validateSpiralTorsionGeometry,
  type SpiralTorsionGeometryParams,
} from "@/lib/spring3d/spiralTorsionGeometry";

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
  metalness = 0.05,
  roughness = 0.45,
  wireframe = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: SpiralTorsionSpringMeshProps) {
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

  // 创建几何体
  const geometry = useMemo(() => {
    if (!validation.valid) {
      // 如果参数无效，返回一个简单的占位几何体
      return new THREE.BoxGeometry(10, 10, 10);
    }
    return createSpiralTorsionSpringGeometry(params, steps);
  }, [params, steps, validation.valid]);

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={validation.valid ? color : "#ff4444"}
        metalness={metalness}
        roughness={roughness}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
      {/* 添加轮廓线，提高可读性 */}
      <Edges threshold={15} color="#1a365d" />
    </mesh>
  );
}

// ============================================================================
// FitToObject - 自动对焦相机到模型
// ============================================================================

interface FitToObjectProps {
  groupRef: React.RefObject<THREE.Group | null>;
  autoRotate?: boolean;
}

function FitToObject({ groupRef, autoRotate = false }: FitToObjectProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const obj = groupRef.current;
    if (!obj) return;

    // 计算包围盒
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 计算相机距离
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 2.0;

    // 设置相机位置（斜上方视角）
    camera.position.set(
      center.x + dist * 0.8,
      center.y - dist * 0.6,
      center.z + dist * 0.8
    );
    camera.near = maxDim / 100;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();

    // 更新控制器目标点
    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [camera, groupRef]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      autoRotate={autoRotate}
      autoRotateSpeed={1}
    />
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
}

function SpiralTorsionScene({
  innerDiameter,
  outerDiameter,
  turns,
  stripWidth,
  stripThickness,
  handedness,
  autoRotate,
  scaleFactor,
}: Required<SpiralTorsionSpringVisualizerProps>) {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <>
      {/* 背景色 */}
      <color attach="background" args={["#0b1220"]} />
      
      {/* 光照 - 按 OpenAI 建议增强 */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[200, -200, 300]} intensity={1.2} />
      <directionalLight position={[-200, 150, 120]} intensity={0.6} />
      <pointLight position={[0, 100, 50]} intensity={0.5} />
      
      {/* 螺旋扭转弹簧网格 */}
      <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
        <SpiralTorsionSpringMesh
          innerDiameter={innerDiameter}
          outerDiameter={outerDiameter}
          turns={turns}
          stripWidth={stripWidth}
          stripThickness={stripThickness}
          handedness={handedness}
          scale={scaleFactor}
          color="#6b9bd1"
          metalness={0.05}
          roughness={0.45}
        />
      </group>
      
      {/* 自动对焦相机 */}
      <FitToObject groupRef={groupRef} autoRotate={autoRotate} />
    </>
  );
}

export function SpiralTorsionSpringVisualizer({
  innerDiameter = 15,
  outerDiameter = 50,
  turns = 5,
  stripWidth = 10,
  stripThickness = 0.5,
  handedness = "cw",
  autoRotate = false,
  scaleFactor = 1, // 不再需要手动缩放，FitToObject 会自动调整
}: SpiralTorsionSpringVisualizerProps) {
  return (
    <Canvas
      camera={{ fov: 45, near: 0.1, far: 5000 }}
      style={{ width: "100%", height: "100%" }}
    >
      <SpiralTorsionScene
        innerDiameter={innerDiameter}
        outerDiameter={outerDiameter}
        turns={turns}
        stripWidth={stripWidth}
        stripThickness={stripThickness}
        handedness={handedness}
        autoRotate={autoRotate}
        scaleFactor={scaleFactor}
      />
    </Canvas>
  );
}

export default SpiralTorsionSpringMesh;
