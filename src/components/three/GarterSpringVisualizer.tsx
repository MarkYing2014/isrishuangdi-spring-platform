import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Stage, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GarterSpringDesign } from "@/lib/springTypes/garter";
import { buildGarterCenterlinePoints, splitByJointGap, calculateGarterCurveParams, calculateJointTransform } from "./garterSpringMath";
import { deltaDLimitMM } from "@/lib/policy/garterSpringPolicy";

interface Props {
  geometry: GarterSpringDesign;
  color?: string;
  installedDiameter?: number;
}

export function GarterSpringVisualizer({ geometry, color = "#a3a3a3", installedDiameter }: Props) {
  // Use installed diameter if provided (simulating stretch), otherwise free
  const D_ring = installedDiameter ?? geometry.ringFreeDiameter ?? 100;
  const D_free = geometry.ringFreeDiameter ?? 100;

  // Decompose dependencies to avoid re-running on new object ref
  const wireDiameter = geometry.wireDiameter || 1;
  const meanDiameter = geometry.meanDiameter || 8;
  const turns = geometry.totalCoils ?? geometry.activeCoils ?? 100;
  const joint = geometry.jointType || "hook";
  
  // Status Color Logic (Factory V1 Policy)
  const statusColor = useMemo(() => {
      const deltaD = Math.abs(D_ring - D_free);
      const limit = deltaDLimitMM(D_free);
      const ratio = deltaD / limit;

      // Reverse install check
      if (D_ring < D_free) return "#ef4444"; // Red (Fail)

      if (ratio > 1.0) return "#ef4444"; // Red (Fail)
      if (ratio > 0.8) return "#f97316"; // Orange (Warn)
      return "#3b82f6"; // Blue (Pass/Safe - Engineering Industrial Look)
  }, [D_ring, D_free]);

  // Output Data (Declarative)
  const { coilParams, jointData } = useMemo(() => {
     // ... (keep existing input logic)
     const inputs = {
        wireDiameter,
        coilMeanDiameter: meanDiameter,
        ringDiameter: D_ring,
        turnsAroundRing: turns,
        jointType: joint,
        jointGapAngleDeg: 8 
     };

     const segs = Math.min(2000, Math.max(800, inputs.turnsAroundRing * 10));
     const rawPoints = buildGarterCenterlinePoints(inputs, segs);

     const { keepPoints, A, B } = splitByJointGap(rawPoints, inputs.jointGapAngleDeg);

     const cParams = calculateGarterCurveParams(keepPoints, inputs.wireDiameter);
     const jTransform = calculateJointTransform(A, B, inputs.wireDiameter);
     
     return { coilParams: cParams, jointData: jTransform };
  }, [wireDiameter, meanDiameter, D_ring, turns, joint]); 

  return (
    <div className="h-[300px] w-full rounded-xl bg-slate-50 border overflow-hidden relative">
      {/* Summary Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none space-y-1">
          <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-md text-xs font-mono border shadow-sm text-slate-700 flex items-center gap-2">
             <span className="font-bold text-slate-900">3D Preview</span>
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
          </div>
          <div className="bg-white/80 backdrop-blur px-3 py-2 rounded-md text-[10px] space-y-1 border shadow-sm text-slate-600">
             <div className="flex justify-between gap-4">
               <span>D_free: {geometry.ringFreeDiameter}</span>
               <span>D_inst: {D_ring.toFixed(1)}</span>
             </div>
             <div className="flex justify-between gap-4">
               <span>ΔD: {(D_ring - (geometry.ringFreeDiameter ?? 0)).toFixed(1)}</span>
               <span className={geometry.jointType === "hook" ? "text-blue-600 font-bold" : ""}>
                 Joint: {geometry.jointType ?? "hook"}
               </span>
             </div>
             <div>N: {geometry.activeCoils}  Dm: {geometry.meanDiameter}  d: {geometry.wireDiameter}</div>
             <div className="border-t pt-1 mt-1 text-slate-400">Policy: Garter Factory (V1)</div>
          </div>
      </div>

      <Canvas shadows camera={{ position: [0, 0, (D_ring || 100) * 2], fov: 45 }}>
         <ambientLight intensity={0.5} />
         <pointLight position={[100, 100, 100]} intensity={1} castShadow />
         <group>
           {/* Coil - Dynamic Status Color */}
           {coilParams && (
               <mesh castShadow receiveShadow>
                   <tubeGeometry args={[coilParams.curve, coilParams.tubularSegments, coilParams.radius, coilParams.radialSegments, coilParams.isClosed]} />
                   <meshStandardMaterial color={statusColor} roughness={0.4} metalness={0.6} />
               </mesh>
           )}

           {/* Joint - Highlight Red Translucent */}
           {jointData && (
             <group>
                <mesh position={jointData.position} quaternion={jointData.quaternion}>
                    <cylinderGeometry args={[jointData.radius, jointData.radius, jointData.length, 12]} />
                    <meshStandardMaterial 
                        color="#ef4444" 
                        transparent 
                        opacity={0.6} 
                        roughness={0.2} 
                    />
                </mesh>
             </group>
           )}
         </group>
         <OrbitControls makeDefault minDistance={10} maxDistance={1000} />
      </Canvas>
    </div>
  );
}
