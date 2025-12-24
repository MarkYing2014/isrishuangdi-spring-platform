import React, { useMemo } from "react";
import * as THREE from "three";

interface DiskSpringMeshProps {
  outerDiameter: number;   // De
  innerDiameter: number;   // Di
  thickness: number;       // t
  freeConeHeight: number;  // h0
  currentDeflection: number; // s (total)
  nP: number;              // parallelCount
  nS: number;              // seriesCount
  color?: string;
}

/**
 * Renders a single Disk (Belleville) Spring or a Stack
 */
export const DiskSpringMesh: React.FC<DiskSpringMeshProps> = ({
  outerDiameter,
  innerDiameter,
  thickness,
  freeConeHeight,
  currentDeflection,
  nP,
  nS,
  color = "#3b82f6"
}) => {
  // Single disk deflection s_single
  const s = currentDeflection / nS;
  const h = Math.max(0, freeConeHeight - s);

  // Geometry for a single disk
  // We use a LatheGeometry or a custom BufferGeometry. 
  // A conical ring can be represented by two concentric circles at different heights.
  const diskGeometry = useMemo(() => {
    const pts = [];
    const segments = 64;
    
    // Cross-section points (in X-Y plane, then revolved)
    // Inner bottom, outer bottom, outer top, inner top.
    // For a simplified thin disk:
    // Radius values
    const rO = outerDiameter / 2;
    const rI = innerDiameter / 2;
    
    // We'll create a profile of 4 points representing the thickness
    // Point 1: Inner bottom
    pts.push(new THREE.Vector2(rI, 0));
    // Point 2: Outer bottom
    pts.push(new THREE.Vector2(rO, 0));
    // Point 3: Outer top (shifted by h and thickness)
    pts.push(new THREE.Vector2(rO, thickness));
    // Point 4: Inner top
    pts.push(new THREE.Vector2(rI, thickness + h)); 
    // Wait, the peak is usually at the inner diameter for a disk spring.
    // Actually, h is the height of the cone.
    
    // Profile for Lathe: [x, y]
    // We want a profile that looks like a slanted rectangle
    const profile = [
      new THREE.Vector2(rI, h),       // Inner top (peak)
      new THREE.Vector2(rO, 0),       // Outer bottom
      new THREE.Vector2(rO, thickness), // Outer top (thickened)
      new THREE.Vector2(rI, h + thickness), // Inner top (thickened)
      new THREE.Vector2(rI, h),       // Close
    ];

    return new THREE.LatheGeometry(profile, segments);
  }, [outerDiameter, innerDiameter, thickness, h]);

  const disks = useMemo(() => {
    const list = [];
    const stackGap = 0.1; // Small visual gap for parallel disks
    
    let currentZ = 0;
    
    for (let sIdx = 0; sIdx < nS; sIdx++) {
      const isFlipped = sIdx % 2 !== 0; // Series stacking alternates direction
      
      for (let pIdx = 0; pIdx < nP; pIdx++) {
        list.push({
          id: `s${sIdx}-p${pIdx}`,
          position: [0, 0, currentZ],
          rotation: isFlipped ? [Math.PI, 0, 0] : [0, 0, 0],
          // When flipped, we need to adjust the Z to keep the contact point
          offsetZ: isFlipped ? h + thickness : 0 
        });
        currentZ += stackGap + thickness;
      }
      // After each series group, we move Z to the next contact point
      // If not p-stacking, next contact point is h + thickness away
      // For V1, we just increment Z simply.
    }
    
    return list;
  }, [nP, nS, h, thickness]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}> {/* Align Z with Up for Three.js */}
      {disks.map((d) => (
        <mesh 
          key={d.id} 
          geometry={diskGeometry} 
          position={[0, 0, d.position[2] + (d.rotation[0] === Math.PI ? h + thickness : 0)]}
          rotation={d.rotation as any}
        >
          <meshStandardMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
};
