"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Instance, Instances, Html } from "@react-three/drei";
import * as THREE from "three";
import { 
  TorsionalSpringSystemDesign, 
  TorsionalSystemResult,
  TorsionalSpringGroup
} from "@/lib/torsional/torsionalSystemTypes";
import { 
  buildCompressionSpringGeometry 
} from "@/lib/spring3d/compressionSpringGeometry";

/**
 * Lightweight Helical Spring Geometry
 * na: active coils, na + 1: total coils (0.5 dense end turn each)
 */
function buildLightweightSpringGeometry(d: number, Dm: number, L_current: number, Na: number, scale: number) {
  const totalCoils = Na + 1; 
  const segments = 120; // High enough for visual, low enough for performance
  const radialSegments = 8;
  const R = (Dm / 2) * scale;
  const wireR = (d / 2) * scale;
  
  const points: THREE.Vector3[] = [];
  const L_scaled = L_current * scale;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * totalCoils * 2 * Math.PI;
    
    const x = R * Math.cos(angle);
    const y = R * Math.sin(angle);
    
    let z: number;
    const turnPos = t * totalCoils;
    
    // Pitch compression logic
    if (turnPos <= 0.5) {
       z = turnPos * d * scale;
    } else if (turnPos >= totalCoils - 0.5) {
       const tTop = turnPos - (totalCoils - 0.5);
       z = L_scaled - (0.5 - tTop) * d * scale;
    } else {
       const tActive = (turnPos - 0.5) / (totalCoils - 1);
       const activeHeight = L_scaled - d * scale;
       z = 0.5 * d * scale + tActive * activeHeight;
    }
    
    points.push(new THREE.Vector3(x, y, z - L_scaled/2));
  }
  
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segments, wireR, radialSegments, false);
  return geo;
}

/**
 * Carrier Plate with Windows
 */
function CarrierPlate({ 
  radius, 
  innerRadius, 
  thickness, 
  color, 
  opacity = 1,
  groups
}: { 
  radius: number, 
  innerRadius: number, 
  thickness: number, 
  color: string,
  opacity?: number,
  groups: TorsionalSpringGroup[]
}) {
  return (
    <group>
      {/* Plane is XY by default, no rotation needed for Disk face to be XY */}
      <mesh position={[0, 0, 0]}>
        <ringGeometry args={[innerRadius, radius, 64]} />
        <meshStandardMaterial 
          color={color} 
          metalness={0.7} 
          roughness={0.2} 
          transparent={opacity < 1}
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/**
 * Rivet Ring
 */
function RivetRing({ count, radius, color, height }: { count: number, radius: number, color: string, height: number }) {
  const geo = useMemo(() => new THREE.CylinderGeometry(2, 2, height, 8), [height]);
  return (
    <Instances geometry={geo}>
      <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      {Array.from({ length: count }).map((_, i) => (
        <Instance 
          key={i} 
          position={[radius * Math.cos((i * 2 * Math.PI) / count), 0, radius * Math.sin((i * 2 * Math.PI) / count)]} 
        />
      ))}
    </Instances>
  );
}

/**
 * placeSpringAndPost
 * Calculates the final world position and alignment for a spring/pillar pair.
 * Coordinate System: XY-Plane for disks, +Z for assembly axis.
 */
function placeSpringAndPost(R: number, angle: number, z: number, scale: number): { position: [number, number, number]; rotation: [number, number, number] } {
  const x = R * scale * Math.cos(angle);
  const y = R * scale * Math.sin(angle);
  return {
    position: [x, y, z],
    rotation: [0, 0, 0] // Already along Z in local space (orthogonal to XY)
  };
}

function SpringGroupInstances({ 
  group, 
  result, 
  globalScale,
  onHover,
  stageColor
}: { 
  group: TorsionalSpringGroup, 
  result?: TorsionalSystemResult,
  globalScale: number,
  onHover: (id: string | null) => void,
  stageColor?: string
}) {
  const groupRes = result?.perGroup.find(p => p.groupId === group.id);
  const deltaX = groupRes?.springDeltaX ?? 0;
  const currentL = group.L_free - deltaX;
  const utilization = groupRes?.utilization ?? 0;
  
  // OEM Stage vs State Logic:
  // - Stage = Design Attribute (fixed color per group)
  // - State = Operating Attribute (COAST / WORKING / LIMIT / STOP)
  const isActive = deltaX > 0;
  const isThisGroupStopping = (groupRes?.isStopping ?? false) || utilization > 1.0;
  
  // State determines visual treatment:
  // - COAST: Semi-transparent (not engaged)
  // - WORKING: Full opacity, Stage color
  // - STOP: Only THIS group turns red (not others)
  const baseColor = stageColor || "#cbd5e1";
  const displayColor = isThisGroupStopping ? "#ef4444" : baseColor;
  const displayOpacity = isActive ? 1.0 : 0.4;

  const helixGeo = useMemo(() => {
    const geo = buildLightweightSpringGeometry(group.d, group.Dm, currentL, 8, globalScale);
    return geo;
  }, [group.d, group.Dm, currentL, globalScale]);

  const pillarGeo = useMemo(() => {
    const springID = group.Dm - group.d;
    // Acceptance (E): Hard constraint to avoid wire interference
    const maxPillarRadius = (springID / 2) - 1.0; 
    const postRadius = Math.min(0.35 * (springID / 2), maxPillarRadius) * globalScale;
    
    const geo = new THREE.CylinderGeometry(postRadius, postRadius, (group.L_free + 10) * globalScale, 16);
    geo.rotateX(Math.PI / 2); // Axis Orthogonality (B)
    return geo;
  }, [group.Dm, group.d, group.L_free, globalScale]);

  // Acceptance (C): Shared Geometry Disposal
  useEffect(() => {
    return () => {
      if (helixGeo) helixGeo.dispose();
      if (pillarGeo) pillarGeo.dispose();
    };
  }, [helixGeo, pillarGeo]);

  return (
    <group rotation={[0, 0, -group.theta_start * Math.PI / 180]}>
      {Array.from({ length: group.n }).map((_, i) => {
        const angle = (i * 2 * Math.PI) / group.n;
        const { position, rotation } = placeSpringAndPost(group.R, angle, 0, globalScale);
        const stableKey = `${group.id}-spring-${i}`; // Acceptance (A)
        
        return (
          <group key={stableKey} position={position} rotation={rotation}>
             {/* Guide Pillar */}
             <mesh 
               geometry={pillarGeo} 
               dispose={null}
             >
               <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
             </mesh>

             {/* Helical Spring - Stage Color + State Opacity */}
             <mesh 
               geometry={helixGeo} 
               dispose={null}
               onPointerEnter={() => onHover(`${group.id}-${i}`)}
               onPointerLeave={() => onHover(null)}
             >
               <meshStandardMaterial 
                 color={displayColor} 
                 metalness={0.9} 
                 roughness={0.05}
                 transparent={displayOpacity < 1}
                 opacity={displayOpacity}
               />
             </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function TorsionalSystemVisualizer({ 
  design, 
  result,
  exploded = false
}: { 
  design?: TorsionalSpringSystemDesign; 
  result?: TorsionalSystemResult;
  exploded?: boolean;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const globalScale = 0.8;
  const explodeSpacing = 40 * globalScale;
  const explodeFactor = exploded ? 1 : 0;

  if (!design) return <div className="h-full w-full bg-slate-50 flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-slate-400">Loading Assembly...</div>;

  const maxHeight = design.groups.length > 0 ? Math.max(...design.groups.map(g => g.L_free)) : 60;
  const gapZ = (maxHeight + 10) * globalScale;

  return (
    <div className="h-full w-full relative bg-white">
      <Canvas camera={{ position: [150, 150, 200], fov: 40 }} shadows>
        <ambientLight intensity={1.5} />
        <spotLight position={[100, 100, 250]} angle={0.25} penumbra={1} intensity={50000} />
        <pointLight position={[-150, -150, 150]} intensity={20000} />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 1.0]} />

        <group key={design.id ?? 'default'}>
           {/* Static Bottom Plate (Fixed at Z = -gapZ/2) */}
           <group position={[0, 0, -gapZ/2]}>
             <CarrierPlate 
               radius={(design.outerOD / 2) * globalScale} 
               innerRadius={(design.innerID / 2) * globalScale}
               thickness={design.carrierThickness * globalScale}
               color="#cbd5e1"
               groups={design.groups}
             />
           </group>

           {/* Rotating Top Plate (Fixed at Z = +gapZ/2, rotates around Z) */}
           <group 
             position={[0, 0, gapZ/2 + (40 * globalScale * explodeFactor)]} 
             rotation={[0, 0, -design.referenceAngle * Math.PI / 180]}
           >
             <CarrierPlate 
               radius={(design.outerOD / 2) * globalScale} 
               innerRadius={(design.innerID / 2) * globalScale}
               thickness={design.carrierThickness * globalScale}
               color="#f8fafc"
               opacity={exploded ? 0.9 : 0.6}
               groups={design.groups}
             />
           </group>

           {/* Spring Groups (Axial Z) */}
           {design.groups.map((group, i) => {
             // OEM Explode Pattern: S1=0, S2=15, S3=30
             const explodeZ = i * 15 * globalScale * explodeFactor;
             return (
               <group key={group.id} position={[0, 0, explodeZ]}>
                 <SpringGroupInstances 
                   group={group} 
                   result={result} 
                   globalScale={globalScale}
                   onHover={setHoveredId}
                   stageColor={group.stageColor}
                 />
               </group>
             );
           })}

           {/* Central Hub Shaft (Axial Z) */}
           <mesh position={[0, 0, 0]}>
             <primitive object={new THREE.CylinderGeometry((design.innerID/2 - 2) * globalScale, (design.innerID/2 - 2) * globalScale, (gapZ + 20), 32).rotateX(Math.PI/2)} attach="geometry" />
             <meshStandardMaterial color="#0f172a" metalness={1} roughness={0} />
           </mesh>
        </group>

        <OrbitControls makeDefault minDistance={50} maxDistance={600} />
        
        {hoveredId && (
          <Html position={[0, 0, gapZ + 20]} center>
            <div className={`text-white text-[10px] px-2 py-1 rounded border font-mono shadow-xl whitespace-nowrap ${result?.isPastStop ? 'bg-rose-900/90 border-rose-500' : 'bg-slate-900/90 border-slate-700'}`}>
              {result?.isPastStop ? "L_solid: CONTACT" : `L_actual: ${((result?.perGroup.find(p=> hoveredId.startsWith(p.groupId))?.springDeltaX ?? 0)).toFixed(2)}mm`}
            </div>
          </Html>
        )}
      </Canvas>
      {/* VisualizerLegendCard */}
      <div className="absolute top-4 left-4 z-10 space-y-2 pointer-events-none">
          <div className={`backdrop-blur-md border p-3 rounded-xl shadow-xl space-y-1.5 w-44 transition-colors ${result?.isPastStop ? 'bg-rose-50/80 border-rose-200' : 'bg-white/80 border-slate-200'}`}>
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                  <span>Work Angle</span>
                  <span className={`font-mono ${result?.isPastStop ? 'text-rose-600' : 'text-slate-900'}`}>{design.referenceAngle.toFixed(1)}°</span>
              </div>
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400 border-t pt-1.5">
                  <span>Torque</span>
                  <span className={`font-mono ${result?.isPastStop ? 'text-rose-600 font-bold' : 'text-blue-600'}`}>
                    {result?.isPastStop ? "RIGID STOP" : `${result?.totalTorque.load.toFixed(1)} Nm`}
                  </span>
              </div>
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                  <span>Stiffness</span>
                  <span className="text-slate-600 font-mono">
                    {result?.isPastStop ? "INFINITE" : `${result?.totalStiffness.toFixed(0)} Nm/°`}
                  </span>
              </div>
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400 border-t pt-1.5">
                  <span>Active Groups</span>
                  <span className="text-emerald-600 font-mono">{result?.perGroup.filter(p=>p.force > 0).length}</span>
              </div>
              
              {result?.isPastStop && (
                <div className="bg-rose-600 text-white text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm text-center animate-pulse">
                  System Bottomed Out
                </div>
              )}
              
              {exploded && (
                <div className="bg-amber-100 text-amber-700 text-[6px] font-bold uppercase tracking-widest px-1 py-0.5 rounded-sm text-center italic">
                  Not to scale in Z
                </div>
              )}
          </div>
      </div>
    </div>
  );
}
