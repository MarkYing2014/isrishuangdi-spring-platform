"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Edges } from "@react-three/drei";
import * as THREE from "three";
import { previewTheme } from "@/lib/three/previewTheme";
import { 
  TorsionalSpringSystemDesign, 
  TorsionalSystemResult,
  TorsionalSpringGroup
} from "@/lib/torsional/torsionalSystemTypes";
import { 
  buildCompressionSpringGeometry 
} from "@/lib/spring3d/compressionSpringGeometry";

function SingleTorsionalSpringMesh({ 
  group, 
  systemTheta, 
  globalScale 
}: { 
  group: TorsionalSpringGroup; 
  systemTheta: number; 
  globalScale: number; 
}) {
  const { d, Dm, n, R, theta_start, L_free, L_solid, clearance } = group;

  // Calculate current deflection for this specific spring
  const activeDeltaTheta = Math.max(0, systemTheta - theta_start);
  const maxDeltaTheta = (L_free - L_solid - clearance) / R * (180 / Math.PI);
  const clampedDeltaTheta = Math.min(activeDeltaTheta, maxDeltaTheta);
  
  // Circumferential compression x = R * Δθ (rad)
  const currentDeflection = R * clampedDeltaTheta * (Math.PI / 180);

  const springGeometry = useMemo(() => {
    // Standard visual coils
    const totalCoils = 12; 
    const activeCoils = 10;

    return buildCompressionSpringGeometry({
      totalCoils,
      activeCoils,
      meanDiameter: Dm,
      wireDiameter: d,
      freeLength: L_free,
      currentDeflection,
      scale: globalScale,
    }, 1.0); 
  }, [d, Dm, L_free, currentDeflection, globalScale]);

  if (!springGeometry) return null;

  // Angle of the whole group's rotation in the assembly
  const groupRotation = -theta_start * (Math.PI / 180);

  return (
    <group rotation={[0, groupRotation, 0]}>
      {Array.from({ length: n }).map((_, i) => {
        const stepAngle = (2 * Math.PI) / n;
        const angle = i * stepAngle;
        
        return (
          <mesh 
            key={i}
            geometry={springGeometry.tubeGeometry} 
            position={[
              R * globalScale * Math.cos(angle), 
              -L_free * globalScale / 2, // Center vertically
              R * globalScale * Math.sin(angle)
            ]}
            rotation={[-Math.PI / 2, 0, 0]} // Rotate Z-axis geometry to Y-axis
          >
            <meshStandardMaterial 
              color={clampedDeltaTheta >= maxDeltaTheta ? "#ef4444" : "#e2e8f0"} 
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Hub Component (Spring Pack Plates)
 */
function TorsionalHub({ design, globalScale }: { design: TorsionalSpringSystemDesign, globalScale: number }) {
  const maxR = design.groups.length > 0 ? Math.max(...design.groups.map(g => g.R + g.Dm/2)) : 100;
  const minR = design.groups.length > 0 ? Math.min(...design.groups.map(g => g.R - g.Dm/2)) : 50;
  
  const plateThickness = 3 * globalScale;
  const springHeight = design.groups.length > 0 ? design.groups[0].L_free : 60;
  const heightOffset = (springHeight * globalScale) / 2;

  return (
    <group>
      {/* Bottom Plate - Horizontal */}
      <mesh position={[0, -heightOffset - plateThickness/2, 0]}>
        <cylinderGeometry args={[(maxR + 15) * globalScale, (maxR + 15) * globalScale, plateThickness, 64]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.2} />
      </mesh>
      
      {/* Top Plate (Rotates with referenceAngle) - Slightly Transparent to see springs */}
      <group rotation={[0, -design.referenceAngle * Math.PI / 180, 0]}>
        <mesh position={[0, heightOffset + plateThickness/2, 0]}>
            <cylinderGeometry args={[(maxR + 15) * globalScale, (maxR + 15) * globalScale, plateThickness, 64]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
        </mesh>
      </group>

      {/* Internal Central Axis */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[minR * 0.6 * globalScale, minR * 0.6 * globalScale, (springHeight + 20) * globalScale, 32]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function TorsionalSystemVisualizer({ 
  design, 
  result 
}: { 
  design?: TorsionalSpringSystemDesign; 
  result?: TorsionalSystemResult;
}) {
  const globalScale = 0.5;

  if (!design) return <div className="h-full w-full bg-white flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-slate-400">Loading CAD...</div>;

  return (
    <div className="h-full w-full relative bg-white">
      <Canvas camera={{ position: [70, 70, 70], fov: 40 }}>
        <ambientLight intensity={1.5} />
        <spotLight position={[100, 200, 100]} angle={0.25} penumbra={1} intensity={30000} />
        <pointLight position={[-100, 100, -100]} intensity={10000} />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 1.0]} />

        <group>
           <TorsionalHub design={design} globalScale={globalScale} />
           {design.groups.map((group) => (
             <SingleTorsionalSpringMesh 
                key={group.id} 
                group={group} 
                systemTheta={design.referenceAngle} 
                globalScale={globalScale} 
             />
           ))}
        </group>

        <OrbitControls makeDefault minDistance={30} maxDistance={200} />
        <gridHelper args={[200, 40, "#f1f5f9", "#f8fafc"]} position={[0, -60, 0]} />
      </Canvas>
    </div>
  );
}
