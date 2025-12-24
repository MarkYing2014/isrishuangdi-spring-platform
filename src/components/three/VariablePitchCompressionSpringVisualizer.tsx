"use client";

import { useEffect, useMemo, useRef, useState, useCallback, Suspense } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Edges, Environment } from "@react-three/drei";
import * as THREE from "three";
import { RotateCcw } from "lucide-react";

import { previewTheme } from "@/lib/three/previewTheme";
import { Button } from "@/components/ui/button";

import type { VariablePitchSegment } from "@/lib/springMath";
import {
  createVariablePitchCompressionSpringGeometry,
} from "@/lib/spring3d/variablePitchCompressionGeometry";

// View presets
const VIEW_PRESETS = {
  perspective: { position: [100, 60, 100], target: [0, 0, 0] },
  front: { position: [0, 0, 150], target: [0, 0, 0] },    // Z axis (spring is vertical)
  top: { position: [0, 150, 0], target: [0, 0, 0] },      // Y axis
  side: { position: [150, 0, 0], target: [0, 0, 0] },     // X axis
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

export type VariablePitchCompressionSpringVisualizerProps = {
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils0: number;
  totalCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
  deflection: number;
  autoRotate?: boolean;
  showStressColors?: boolean;
  stressUtilization?: number;
  stressBeta?: number;
  springRate?: number; // For status overlay
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function colorRampGyr(t: number): [number, number, number] {
  const x = Math.max(0, Math.min(1, t));
  if (x <= 0.5) {
    const u = x / 0.5;
    return [lerp(0.1, 1.0, u), lerp(0.8, 0.85, u), lerp(0.2, 0.05, u)];
  }
  const u = (x - 0.5) / 0.5;
  return [lerp(1.0, 1.0, u), lerp(0.85, 0.15, u), lerp(0.05, 0.05, u)];
}

function mapUtilizationToRampT(utilization: number): number {
  const u = Number.isFinite(utilization) ? Math.max(0, utilization) : 0;
  const scaled = Math.max(0, Math.min(1, u / 1.25));
  return Math.max(0, Math.min(1, Math.pow(scaled, 1.2)));
}

function applyStressColors(geometry: THREE.BufferGeometry, utilization: number, beta: number) {
  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  const normalAttr = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!posAttr || !normalAttr) return;

  const count = posAttr.count;
  const colors = new Float32Array(count * 3);
  const b = Math.max(0, Math.min(0.9, beta));
  const u0 = mapUtilizationToRampT(utilization);

  for (let i = 0; i < count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const nx = normalAttr.getX(i);
    const ny = normalAttr.getY(i);

    const invLen = 1 / Math.max(1e-9, Math.hypot(px, py));
    const dx = -px * invLen;
    const dy = -py * invLen;

    const nLen = 1 / Math.max(1e-9, Math.hypot(nx, ny));
    const nnx = nx * nLen;
    const nny = ny * nLen;

    const dot = nnx * dx + nny * dy;
    const factor = 1 + b * dot;
    const t = Math.max(0, Math.min(1, u0 * factor));

    const [r, g, bl] = colorRampGyr(t);
    colors[i * 3 + 0] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = bl;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function SpringMesh({
  wireDiameter,
  meanDiameter,
  shearModulus,
  activeCoils0,
  totalCoils,
  freeLength,
  segments,
  deflection,
  showStressColors,
  stressUtilization,
  stressBeta,
}: VariablePitchCompressionSpringVisualizerProps) {
  const utilization = useMemo(() => {
    const u = stressUtilization;
    return Number.isFinite(u) ? Math.max(0, Math.min(2, u as number)) : 0;
  }, [stressUtilization]);

  const betaUsed = useMemo(() => {
    const b = stressBeta;
    return Number.isFinite(b) ? Math.max(0, Math.min(0.9, b as number)) : 0.25;
  }, [stressBeta]);

  const { geometry, zMin, zMax } = useMemo(() => {
    const res = createVariablePitchCompressionSpringGeometry(
      {
        wireDiameter,
        meanDiameter,
        shearModulus,
        activeCoils0,
        totalCoils,
        freeLength,
        segments,
        deflection,
      },
      {
        pointsPerTurn: 24,
        radialSegments: 20,
        tubeSegmentsPerTurn: 28,
        closingTurns: 1.5,
        contactGapRatio: 0.01,
      }
    );
    if (showStressColors) {
      applyStressColors(res.geometry, utilization, betaUsed);
    }
    return res;
  }, [
    wireDiameter,
    meanDiameter,
    shearModulus,
    activeCoils0,
    totalCoils,
    freeLength,
    segments,
    deflection,
    showStressColors,
    utilization,
    betaUsed,
  ]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const d = Math.max(0.01, wireDiameter);
  const zBottom = zMin + d * 0.5;
  const zTop = zMax - d * 0.5;

  const clippingPlanes = useMemo(() => {
    const bottom = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, zBottom)
    );
    const top = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, zTop)
    );
    return [bottom, top];
  }, [zBottom, zTop]);

  const material = useMemo(() => {
    if (showStressColors) {
      return new THREE.MeshBasicMaterial({
        color: "#ffffff",
        side: THREE.DoubleSide,
        vertexColors: true,
        clippingPlanes,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#6b9bd1",
      metalness: previewTheme.material.spring.metalness,
      roughness: previewTheme.material.spring.roughness,
      side: THREE.DoubleSide,
      clippingPlanes,
    });
  }, [clippingPlanes, showStressColors]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  const capMaterial = useMemo(() => {
    if (showStressColors) {
      const [r, g, bl] = colorRampGyr(mapUtilizationToRampT(utilization));
      return new THREE.MeshBasicMaterial({
        color: new THREE.Color(r, g, bl),
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
    }

    return new THREE.MeshStandardMaterial({
      color: "#6b9bd1",
      metalness: previewTheme.material.endCap.metalness,
      roughness: previewTheme.material.endCap.roughness,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, [showStressColors, utilization]);

  const capGeom = useMemo(() => {
    const R = meanDiameter / 2;
    const rInner = Math.max(0.01, R - wireDiameter / 2);
    const rOuter = Math.max(rInner + 0.01, R + wireDiameter / 2);
    return new THREE.RingGeometry(rInner, rOuter, 96, 1);
  }, [meanDiameter, wireDiameter]);

  useEffect(() => {
    return () => {
      capGeom.dispose();
      capMaterial.dispose();
    };
  }, [capGeom, capMaterial]);

  const capEps = Math.max(0.001, d * 0.002);
  const bottomCapZ = zBottom + capEps;
  const topCapZ = zTop - capEps;

  return (
    <group rotation={[0, 0, 0]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <mesh
        geometry={capGeom}
        material={capMaterial}
        position={[0, 0, bottomCapZ]}
        rotation={[0, 0, 0]}
        receiveShadow
      />
      <mesh
        geometry={capGeom}
        material={capMaterial}
        position={[0, 0, topCapZ]}
        rotation={[Math.PI, 0, 0]}
        receiveShadow
      />
      <Edges threshold={35} color="#1a365d" />
    </group>
  );
}

export function VariablePitchCompressionSpringVisualizer(
  props: VariablePitchCompressionSpringVisualizerProps
) {
  const { showStressColors } = props;
  const [mounted, setMounted] = useState(false);
  const controlsRef = useRef<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>("perspective");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full min-h-[300px]" style={{ background: previewTheme.background }}>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 5000, position: [100, 60, 100] }}
        style={{ width: "100%", height: "100%" }}
        gl={{ localClippingEnabled: true, antialias: true }}
      >
        <CameraController viewType={currentView} controlsRef={controlsRef} />
        <Suspense fallback={null}>
          <color attach="background" args={[previewTheme.background]} />

          <ambientLight intensity={previewTheme.lights.ambient} />
          <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} castShadow />
          <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
          <pointLight position={previewTheme.lights.point.position} intensity={previewTheme.lights.point.intensity} />
          <Environment preset="studio" />

          {/* Rotate the spring to be vertical if generator uses XY plane, or stay if it uses Z up.
              Variable pitch generator usually produces Z-up geometry.
          */}
          <SpringMesh {...props} />

          <gridHelper 
            args={[200, 20, previewTheme.grid.major, previewTheme.grid.minor]} 
            position={[0, 0, 0]} 
            rotation={[Math.PI / 2, 0, 0]} // Grid on XY plane
          />

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={props.autoRotate}
            autoRotateSpeed={0.8}
            minDistance={10}
            maxDistance={1000}
          />
        </Suspense>
      </Canvas>

      {/* View selector - bottom left */}
      <div className="absolute bottom-2 left-2 flex gap-1 z-10">
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
          title="正视图 / Front View"
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
           <span className="font-semibold text-slate-700">Variable Pitch</span>
        </div>
        <div className="mt-1 text-slate-600">
           Compression
        </div>
        
        {showStressColors && (
          <div className="mt-3 space-y-2 border-t pt-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#1a7a33] via-[#ffcc00] to-[#e60000]" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0%</span>
              <span>100%</span>
            </div>
            <div className="text-[10px] text-center text-slate-400 font-mono">
              Stress FEA Preview
            </div>
          </div>
        )}
      </div>

      {/* Status overlay - top right */}
      <div className="absolute top-2 right-2 rounded bg-white/90 px-2 py-1.5 text-xs shadow space-y-0.5 z-10 min-w-[120px]">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Dm:</span>
          <span className="font-medium">{props.meanDiameter} mm</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">d:</span>
          <span className="font-medium">{props.wireDiameter} mm</span>
        </div>
        <div className="border-t border-slate-200 pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Nt:</span>
            <span className="font-medium">{props.totalCoils}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">L0:</span>
            <span className="font-medium">{props.freeLength ?? "-"} mm</span>
          </div>
          {props.springRate !== undefined && (
            <div className="flex justify-between gap-4">
                <span className="text-slate-500">Rate:</span>
                <span className="font-medium">{props.springRate.toFixed(2)} N/mm</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VariablePitchCompressionSpringVisualizer;
