"use client";

/**
 * Shock Absorber Spring Visualizer
 * 减震器弹簧 3D 可视化组件
 * 
 * Update: Added Phase 5.1 Beam Stress Preview (Wahl Field)
 * - Computes real-time stress tau = Kw * 8PD / pi*d^3
 * - Displays Safety Factor and Max Stress
 * - Visualizes stress gradient ID-OD (Wahl distribution)
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import * as THREE from "three";
import { AutoFitControls } from "./AutoFitControls";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw, Play, Pause } from "lucide-react";
import { Slider } from "@/components/ui/slider";

import type { ShockSpringInput, ShockSpringResult } from "@/lib/spring3d/shock";
import { previewTheme } from "@/lib/three/previewTheme";
import { computeBeamStress, type BeamStressResult } from "@/lib/spring3d/shock/beamStressPreview";

// ============================================================================
// Types
// ============================================================================

interface ShockSpringVisualizerProps {
  input: ShockSpringInput;
  result: ShockSpringResult | null;
  className?: string;
}

// ============================================================================
// Constants & Presets
// ============================================================================

import { stressToRGB } from "@/lib/three/stressColor";

// ============================================================================
// Constants & Presets
// ============================================================================

const VIEW_PRESETS = {
  perspective: { position: [50, 40, 60], target: [0, 0, 0] },
  front: { position: [0, 0, 100], target: [0, 0, 0] },
  top: { position: [0, 100, 0], target: [0, 0, 0] },
  side: { position: [100, 0, 0], target: [0, 0, 0] },
} as const;

type ViewType = keyof typeof VIEW_PRESETS;

const SPRING_COLOR = "#3b82f6"; // Blue for active coils

// ============================================================================
// Components
// ============================================================================

function CameraController({ viewType, controlsRef }: { viewType: ViewType; controlsRef: React.RefObject<any> }) {
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
// Custom Tube Geometry Builder
// ============================================================================

type StressCalculator = (index: number, cosTheta: number) => number; // Returns normalized stress 0..1 relative to tauAllow

function buildTubeGeometryFromFrames(
  points: THREE.Vector3[],
  radii: number[],
  tangents: THREE.Vector3[],
  normals: THREE.Vector3[],
  binormals: THREE.Vector3[],
  circleSegments: number = 32,
  stressCalc?: StressCalculator
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  const positions: number[] = [];
  const normalsArray: number[] = [];
  const uvs: number[] = [];
  const colorsArray: number[] = [];
  const indices: number[] = [];
  
  const n = points.length;
  if (n < 2) return geometry;


  const tempColor = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const p = points[i];
    const r = radii[i];
    const normal = normals[i];
    const binormal = binormals[i];
    const u = i / (n - 1);
    
    for (let j = 0; j <= circleSegments; j++) {
      const angle = (j / circleSegments) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      let vx = p.x + normal.x * cosA * r + binormal.x * sinA * r;
      let vy = p.y + normal.y * cosA * r + binormal.y * sinA * r;
      let vz = p.z + normal.z * cosA * r + binormal.z * sinA * r;
      
      positions.push(vx, vy, vz);
      
      const nx = normal.x * cosA + binormal.x * sinA;
      const ny = normal.y * cosA + binormal.y * sinA;
      const nz = normal.z * cosA + binormal.z * sinA;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normalsArray.push(nx / len, ny / len, nz / len);
      
      uvs.push(u, j / circleSegments);

      // Initialize with Neutral Color
      colorsArray.push(1, 1, 1);
    }
  }
  
  const ringSize = circleSegments + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < circleSegments; j++) {
      const a = i * ringSize + j;
      const b = i * ringSize + j + 1;
      const c = (i + 1) * ringSize + j;
      const d = (i + 1) * ringSize + j + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }
  
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normalsArray, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colorsArray, 3));
  
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  
  console.log("ShockSpringVisualizer: Geometry Rebuilt (Structural)");
  return geometry;
}

// ============================================================================
// Spring Mesh
// ============================================================================

function ShockSpringMesh({ 
    input, 
    result, 
    compression = 0,
    showStress = false,
    currentLoad = 0,
    stressResult,
    setStressStats
}: { 
    input: ShockSpringInput, 
    result: ShockSpringResult,
    compression: number,
    showStress: boolean,
    currentLoad: number,
    stressResult: BeamStressResult | null,
    setStressStats: (s: BeamStressResult | null) => void
}) {

  // Update parent stats whenever stressResult changes
  useEffect(() => {
     if (showStress) {
         setStressStats(stressResult);
     } else {
         setStressStats(null);
     }
  }, [stressResult, showStress, setStressStats]);

  const meshRef = useRef<THREE.Mesh>(null);

  // Clipping Planes for Grinding
  const basePlanes = useMemo(() => {
    const planes: THREE.Plane[] = [];
    const { grindingPlanes } = result.derived;
    const isClip = input.grinding.mode === "visualClip" || input.grinding.mode === "exportCut";
    
    if (isClip) {
        if (input.grinding.grindStart && grindingPlanes.startZ !== null) {
            planes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), -grindingPlanes.startZ));
        }
        if (input.grinding.grindEnd && grindingPlanes.endZ !== null) {
            planes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), grindingPlanes.endZ));
        }
    }
    return planes;
  }, [result.derived.grindingPlanes, input.grinding.mode, input.grinding.grindStart, input.grinding.grindEnd]);

  // Scaled clipping planes for the material
  const [clippingPlanes, setClippingPlanes] = useState<THREE.Plane[]>([]);

  // Apply compression via Scale and clipping plane update
  useFrame(() => {
    if (!meshRef.current) return;
    const { freeLength } = result.derived;
    if (freeLength <= 0) return;

    const currentLen = Math.max(0.1, freeLength - compression);
    const ratio = currentLen / freeLength;
    
    // Scale Z to compress
    meshRef.current.scale.set(1, 1, ratio);

    // Compensate Clipping Planes: planeZLocal = zCutFree / scaleZ
    // This keeps the cut fixed in world space while the geometry scales.
    if (basePlanes.length > 0) {
        const scaledPlanes = basePlanes.map(p => {
             const newP = p.clone();
             // Normal is (0,0,1) or (0,0,-1). 
             // ax + by + cz + d = 0 => cz + d = 0 => z = -d/c
             // If we scale Z by 'ratio', the local coordinate effectively expands.
             // We need the world cut position to remain constant.
             // newD = oldD / ratio?
             // Actually, if we use local clipping, Three.js applies projection.
             // Let's use the requested formula: planeZLocal = zCutFree / scaleZ
             newP.constant = p.constant / ratio;
             return newP;
        });
        // Avoid state updates in useFrame if possible, but for clipping it's often needed unless using ref
        if (clippingPlanes.length !== scaledPlanes.length || Math.abs(clippingPlanes[0]?.constant - scaledPlanes[0]?.constant) > 0.001) {
            setClippingPlanes(scaledPlanes);
        }
    } else if (clippingPlanes.length > 0) {
        setClippingPlanes([]);
    }
  });

  const geometry = useMemo(() => {
    // Structural Rebuild Only
    const { centerline, frames, freeLength } = result.derived;
    if (freeLength <= 0) return new THREE.BufferGeometry();

    const points = centerline.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const radii = result.derived.radii;
    
    if (!centerline || !frames) return new THREE.BufferGeometry();
    if (!frames.tangents || !frames.normals || !frames.binormals) return new THREE.BufferGeometry();

    const tangents = frames.tangents.map(f => new THREE.Vector3(f.x, f.y, f.z));
    const normals = frames.normals.map(f => new THREE.Vector3(f.x, f.y, f.z));
    const binormals = frames.binormals.map(f => new THREE.Vector3(f.x, f.y, f.z));
    
    return buildTubeGeometryFromFrames(
      points,
      radii,
      tangents,
      normals,
      binormals,
      32
    );
  }, [
      result.derived.centerline, 
      result.derived.radii, 
      result.derived.freeLength,
      // Strictly structural parameters
  ]);

  // Dynamic Stress Color Update (Ring-Based)
  useEffect(() => {
      if (!meshRef.current || !geometry) return;
      const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
      if (!colorAttr) return;

      const n = result.derived.centerline.length;
      const circleSegments = 32;
      const ringSize = circleSegments + 1;

      if (showStress && stressResult) {
          for (let i = 0; i < n; i++) {
              const tauCenter = stressResult.tau[i];
              const tauAllow = stressResult.tauAllow;
              
              // Simplest: one color per ring. 
              // ID/OD gradient can be added if needed, but ring-based is safer for O(1) slider.
              const stressNorm = Math.min(1.5, tauCenter / (tauAllow || 1));
              const [r, g, b] = stressToRGB(stressNorm);

              for (let j = 0; j < ringSize; j++) {
                  const idx = (i * ringSize + j) * 3;
                  colorAttr.array[idx] = r;
                  colorAttr.array[idx+1] = g;
                  colorAttr.array[idx+2] = b;
              }
          }
          console.log("ShockSpringVisualizer: Dynamic Colors Updated (Buffer Only)");
          colorAttr.needsUpdate = true;
      } else {
          // Reset to neutral
          const neutral = new THREE.Color(SPRING_COLOR);
          for (let i = 0; i < colorAttr.count; i++) {
              colorAttr.setXYZ(i, neutral.r, neutral.g, neutral.b);
          }
          colorAttr.needsUpdate = true;
      }
  }, [showStress, stressResult, geometry, result.derived.centerline.length]); // Added result.derived.centerline.length to dependencies for safety
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={showStress ? "#ffffff" : SPRING_COLOR}
        vertexColors={true}
        roughness={0.3}
        metalness={0.8}
        clippingPlanes={clippingPlanes}
        clipShadows={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function CenterlineOverlay({ result }: { result: ShockSpringResult }) {
  const lineObj = useMemo(() => {
    const points = result.derived.centerline.map(p => new THREE.Vector3(p.x, p.y, p.z));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    return new THREE.Line(geo, material);
  }, [result]);
  return <primitive object={lineObj} />;
}

// ============================================================================
// Main Component
// ============================================================================

export function ShockSpringVisualizer({
  input,
  result,
  className = "",
}: ShockSpringVisualizerProps) {
  const [currentView, setCurrentView] = useState<ViewType>("perspective");
  const controlsRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // State
  const [simX, setSimX] = useState(0);
  const [showStress, setShowStress] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stressStats, setStressStats] = useState<BeamStressResult | null>(null);

  // Animation Loop
  useEffect(() => {
      let rafId: number;
      let startTime: number | null = null;
      
      const animate = (time: number) => {
          if (!isPlaying || !result) return;
          if (!startTime) startTime = time;
          const elapsed = (time - startTime) / 1000;
          const max = Math.max(0, result.derived.freeLength - result.derived.solidHeight);
          if (max <= 0) return;
          const cycleDuration = 2.0; 
          const phase = (elapsed % cycleDuration) / cycleDuration;
          const t = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
          setSimX(t * max);
          rafId = requestAnimationFrame(animate);
      };
      
      if (isPlaying) {
          rafId = requestAnimationFrame(animate);
      } else {
          startTime = null;
      }
      return () => cancelAnimationFrame(rafId);
  }, [isPlaying, result]);

  useEffect(() => {
    if (result && !isPlaying) setSimX(result.ride.x);
  }, [result]);

  const handleViewChange = useCallback((view: ViewType) => setCurrentView(view), []);

  const stats = useMemo(() => {
    if (!result) return null;
    const { freeLength: L0, solidHeight: Hs } = result.derived;
    const maxDeflection = Math.max(0, L0 - Hs);
    const curve = result.kxCurve;
    let force = 0;
    
    // Fast Linear Interpolation
    if (curve.length > 0) {
        if (simX <= 0) force = 0;
        else if (simX >= curve[curve.length-1].x) force = curve[curve.length-1].force;
        else {
             // Binary search is better but array is small (<100)
             for(let i=1; i<curve.length; i++) {
                 if (curve[i].x >= simX) {
                     const p1 = curve[i-1];
                     const p2 = curve[i];
                     const t = (simX - p1.x)/(p2.x - p1.x);
                     force = p1.force + (p2.force - p1.force) * t;
                     break;
                 }
             }
        }
    }
    return { Hs, Stroke: simX, Load: force, MaxStroke: maxDeflection };
  }, [result, simX]);

  // Compute Stress Result in Real-time (using useMemo for performance per P change)
  // We extract geometry once
  const beamConfig = useMemo(() => {
      if (!result) return null;
      const n = result.derived.centerline.length;
      const D = new Float32Array(n);
      const d = new Float32Array(n);
      
      for(let i=0; i<n; i++) {
          const p = result.derived.centerline[i];
          // Mean Diameter D = 2 * Mean Radius (Helix Radius)
          // R = sqrt(x^2 + y^2)
          D[i] = 2 * Math.sqrt(p.x*p.x + p.y*p.y);
          // Wire Diameter d = 2 * Wire Radius
          d[i] = 2 * result.derived.radii[i];
      }
      return { 
          D, 
          d, 
          tensileStrength: input.material.tensileStrength 
      };
  }, [result, input.material.tensileStrength]);

  const beamResult = useMemo(() => {
     if (!beamConfig || !stats) return null;
     if (!showStress) return null; // Avoid computation if off
     return computeBeamStress(stats.Load, beamConfig);
  }, [beamConfig, stats?.Load, showStress]);


  if (!result) return <div className="flex items-center justify-center p-4 text-muted-foreground">Generating Preview...</div>;

  return (
    <div className={`relative w-full h-full ${className} bg-slate-50/50 rounded-lg overflow-hidden border border-slate-200 flex flex-col`}>
      {/* Top Bar Controls */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
         {/* Stress Toggle */}
         <div className="bg-white/90 p-1.5 px-3 rounded-md shadow-sm backdrop-blur-sm border border-slate-100/50 flex items-center gap-2">
            <Checkbox 
                id="stress-mode" 
                checked={showStress} 
                onCheckedChange={(c) => setShowStress(!!c)}
                className="h-4 w-4"
            />
            <label htmlFor="stress-mode" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                Stress Colors / 应力伪色
            </label>
         </div>

         {/* Play Button */}
         <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 bg-white/90 shadow-sm backdrop-blur-sm border-slate-100/50"
            onClick={() => setIsPlaying(!isPlaying)}
         >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-slate-700 text-slate-700" /> : <Play className="h-3.5 w-3.5 fill-slate-700 text-slate-700 ml-0.5" />}
         </Button>
      </div>


      <div className="flex-1 relative min-h-0">
        <Canvas
            shadows
            camera={{ position: [50, 40, 60], fov: 45 }}
            gl={{ preserveDrawingBuffer: true, localClippingEnabled: true }}
        >
            <CameraController viewType={currentView} controlsRef={controlsRef} />
            <color attach="background" args={[previewTheme.background]} />
            <ambientLight intensity={previewTheme.lights.ambient} />
            <directionalLight position={previewTheme.lights.key.position} intensity={previewTheme.lights.key.intensity} castShadow />
            <directionalLight position={previewTheme.lights.fill.position} intensity={previewTheme.lights.fill.intensity} />
            
            <Center ref={groupRef}>
            <group rotation={[-Math.PI / 2, 0, 0]}>
                <ShockSpringMesh 
                    input={input} 
                    result={result} 
                    compression={simX} 
                    showStress={showStress}
                    currentLoad={stats?.Load || 0}

                    stressResult={beamResult}
                    setStressStats={setStressStats}
                />
                {(input as any).debug?.showCenterline && <CenterlineOverlay result={result} />}
            </group>
            </Center>
            
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[40, 32]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.1} />
            </mesh>

            <AutoFitControls ref={controlsRef} targetRef={groupRef} minDistance={10} maxDistance={300} />
            <gridHelper args={[100, 20, previewTheme.grid.major, previewTheme.grid.minor]} position={[0, -0.1, 0]} />
        </Canvas>

        {/* View Selector */}
        <div className="absolute bottom-3 left-3 flex gap-1 bg-white/80 p-1 rounded-md shadow-sm backdrop-blur-sm z-10 transition-colors">
            {(Object.keys(VIEW_PRESETS) as ViewType[]).map((view) => (
                <Button key={view} variant={currentView === view ? "default" : "ghost"} size="sm" className="h-7 px-2 text-xs capitalize" onClick={() => handleViewChange(view)}>
                    {view === "perspective" ? <RotateCcw className="h-3 w-3 mr-1" /> : null}
                    {view === "perspective" ? "3D" : view}
                </Button>
            ))}
        </div>

        {/* Status Overlay */}
        {stats && (
        <div className="absolute top-3 right-3 bg-white/90 px-3 py-2 rounded-md shadow-sm backdrop-blur-sm text-xs min-w-[140px] border border-slate-100/50 pointer-events-none">
            {/* Basic Stats */}
            <div className="space-y-1 pb-2 border-b border-slate-200/60 mb-2">
            <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold tracking-tight">STROKE</span>
                <span className="font-mono font-medium text-blue-600">{stats.Stroke.toFixed(2)} mm</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold tracking-tight">LOAD (P)</span>
                <span className="font-mono font-medium text-emerald-600">{stats.Load.toFixed(1)} N</span>
            </div>
            </div>
            
            {/* Stress Stats (Only when enabled) */}
            {stressStats && (
            <div className="space-y-1 pb-2 border-b border-slate-200/60 mb-2 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold tracking-tight">MAX τ</span>
                    <span className={`font-mono font-medium ${stressStats.maxTau > stressStats.tauAllow ? 'text-red-600' : 'text-slate-700'}`}>
                        {stressStats.maxTau.toFixed(0)} MPa
                    </span>
                </div>
                {/* DEBUG: Show Tau[0] */}
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>τ[0]</span>
                    <span className="font-mono">{stressStats.tau[0]?.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold tracking-tight">MIN SF</span>
                    <span className={`font-mono font-bold ${stressStats.minSF < 1.0 ? 'text-red-600' : stressStats.minSF < 1.2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {stressStats.minSF > 10 ? ">10" : stressStats.minSF.toFixed(2)}
                    </span>
                </div>
            </div>
            )}

            <div className="space-y-0.5">
              <div className="flex justify-between text-slate-600">
                <span>Solid (Hs):</span>
                <span className="font-mono">{stats.Hs?.toFixed(1) ?? "-"} mm</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Max Stroke:</span>
                <span className="font-mono">{stats.MaxStroke?.toFixed(1) ?? "-"} mm</span>
              </div>
            </div>
        </div>
        )}
      </div>

      {/* Simulation Slider Control */}
      {stats && (
        <div className="bg-white border-t border-slate-200 p-2 px-4 shadow-sm z-20">
            <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-slate-500 w-12 text-right">0 mm</span>
                <Slider 
                    value={[simX]} 
                    min={0} 
                    max={stats.MaxStroke > 0 ? stats.MaxStroke : 100} 
                    step={0.1}
                    onValueChange={([val]) => {
                        setSimX(val);
                        setIsPlaying(false);
                    }}
                    className="flex-1 cursor-grab active:cursor-grabbing"
                />
                <span className="text-xs font-semibold text-slate-500 w-12">{stats.MaxStroke > 0 ? stats.MaxStroke.toFixed(0) : 0} mm</span>
            </div>
        </div>
      )}
    </div>
  );
}

export default ShockSpringVisualizer;
