"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useSpringSimulationStore, type ConicalDesignMeta } from "@/lib/stores/springSimulationStore";
import { 
  generateCompressedConicalHelix, 
  createHelixCurve 
} from "@/lib/geometry/conicalSpringCurve";

// Colors for coil states
const COLLAPSED_COLOR = "#64748b"; // Slate gray for collapsed coils
const ACTIVE_COLOR = "#2563eb";    // Blue for active coils

/**
 * Conical spring model using continuous TubeGeometry
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

  // Generate helix geometry data
  const helixData = useMemo(() => {
    if (!conicalDesign) return null;

    const {
      wireDiameter,
      largeOuterDiameter,
      smallOuterDiameter,
      activeCoils: totalCoils,
      freeLength,
    } = conicalDesign;

    // Calculate radii (mean radius = (OD - d) / 2)
    const largeRadius = ((largeOuterDiameter - wireDiameter) / 2) * scale;
    const smallRadius = ((smallOuterDiameter - wireDiameter) / 2) * scale;
    const scaledFreeLength = freeLength * scale;
    const scaledWireDiameter = wireDiameter * scale;

    // Generate compressed helix points
    const result = generateCompressedConicalHelix({
      largeRadius,
      smallRadius,
      freeLength: scaledFreeLength,
      activeCoils: totalCoils,
      samples: 300, // High sample count for smooth curve
      currentDeflection: currentDeflection * scale,
      wireDiameter: scaledWireDiameter,
      collapsedCoils,
    });

    return {
      ...result,
      wireRadius: scaledWireDiameter / 2,
      scaledFreeLength,
    };
  }, [design, collapsedCoils, currentDeflection, scale]);

  // Create tube geometries for collapsed and active sections
  const { collapsedGeom, activeGeom } = useMemo(() => {
    if (!helixData) return { collapsedGeom: null, activeGeom: null };

    const { collapsedPoints, activePoints, wireRadius } = helixData;
    
    let collapsedGeom: THREE.TubeGeometry | null = null;
    let activeGeom: THREE.TubeGeometry | null = null;

    // Create collapsed section geometry (if any collapsed coils)
    if (collapsedPoints.length >= 2) {
      const collapsedCurve = createHelixCurve(collapsedPoints);
      if (collapsedCurve) {
        collapsedGeom = new THREE.TubeGeometry(
          collapsedCurve,
          Math.max(collapsedPoints.length * 2, 50),
          wireRadius,
          12,
          false
        );
      }
    }

    // Create active section geometry
    if (activePoints.length >= 2) {
      const activeCurve = createHelixCurve(activePoints);
      if (activeCurve) {
        activeGeom = new THREE.TubeGeometry(
          activeCurve,
          Math.max(activePoints.length * 2, 100),
          wireRadius,
          12,
          false
        );
      }
    }

    return { collapsedGeom, activeGeom };
  }, [helixData]);

  if (!design || !helixData) {
    return null;
  }

  // Position to center the spring vertically
  const yOffset = -helixData.scaledFreeLength / 2;

  return (
    <group position={[0, yOffset, 0]}>
      {/* Collapsed coils (gray) */}
      {collapsedGeom && (
        <mesh geometry={collapsedGeom}>
          <meshStandardMaterial 
            color={COLLAPSED_COLOR} 
            metalness={0.5} 
            roughness={0.4}
          />
        </mesh>
      )}

      {/* Active coils (blue) */}
      {activeGeom && (
        <mesh geometry={activeGeom}>
          <meshStandardMaterial 
            color={ACTIVE_COLOR} 
            metalness={0.5} 
            roughness={0.3}
          />
        </mesh>
      )}

      {/* Ground plane (thin disc) */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[helixData.wireRadius * 15, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
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
  const { mode, design } = useSpringSimulationStore();

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
        camera={{ position: [60, 45, 60], fov: 50 }}
        gl={{ 
          antialias: true,
          preserveDrawingBuffer: true,
        }}
        frameloop="always"
        dpr={[1, 2]}
      >
        <color attach="background" args={["#1e293b"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.4} />
        <pointLight position={[0, 30, 0]} intensity={0.3} />
        
        <ConicalSpringModel />
        
        <OrbitControls 
          enablePan={false}
          minDistance={20}
          maxDistance={150}
          target={[0, 0, 0]}
          autoRotate
          autoRotateSpeed={0.5}
        />
        
        <gridHelper args={[80, 16, "#475569", "#334155"]} position={[0, -28, 0]} />
      </Canvas>
      
      <Legend />
      <StatusDisplay />
    </div>
  );
}
