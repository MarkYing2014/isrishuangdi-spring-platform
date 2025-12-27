"use client";

/**
 * Die Spring 3D Mesh Component
 * 模具弹簧 3D 网格组件
 * 
 * Uses rectangular wire extrusion along helix curve
 * Supports duty-based coloring and risk-based emissive glow
 */

import { useMemo } from "react";
import * as THREE from "three";
import { buildDieSpringGeometry } from "@/lib/spring3d/extrudeRectAlongCurve";
import { getRiskEmissive, DUTY_COLORS, type DieSpringDuty } from "@/lib/dieSpring/riskModel";

export type DieSpringEndStyleMesh = "open" | "closed" | "closed_ground";

export interface DieSpringMeshProps {
  /** Outer diameter (mm) */
  outerDiameter: number;
  /** Wire thickness t (mm) - used to calculate mean diameter */
  wireThickness: number;
  /** Wire width b (mm) - radial direction */
  wireWidth: number;
  /** Total coils */
  coils: number;
  /** Free length (mm) */
  freeLength: number;
  /** End style */
  endStyle?: DieSpringEndStyleMesh;
  /** End grind turns per end */
  endGrindTurns?: number;
  /** Scale factor */
  scale?: number;
  /** Mesh color (overrides duty color if provided) */
  color?: string;
  /** Duty rating for color (LD/MD/HD/XHD) or string for new classes */
  duty?: DieSpringDuty | string;
  /** Deflection (mm) - compression amount */
  deflection?: number;
  /** Risk factor (0-1+) for emissive glow */
  risk?: number;
  /** Show wireframe (default: false) */
  wireframe?: boolean;
}

export function DieSpringMesh({
  outerDiameter,
  wireThickness,
  wireWidth,
  coils,
  freeLength,
  deflection = 0,
  endStyle = "closed_ground",
  endGrindTurns = 0.25,
  scale = 0.05,
  color,
  duty,
  risk = 0,
  wireframe = false,
}: DieSpringMeshProps) {
  // Determine base color: explicit color > duty color (if valid legacy duty) > default
  const legacyColor = (duty && duty in DUTY_COLORS) ? DUTY_COLORS[duty as DieSpringDuty] : undefined;
  const baseColor = color ?? legacyColor ?? "#4a90d9";
  
  // Get risk-based emissive properties
  const { color: emissiveColor, intensity: emissiveIntensity } = useMemo(
    () => getRiskEmissive(risk),
    [risk]
  );
  // Calculate mean diameter: Dm = OD - t
  const meanDiameter = outerDiameter - wireThickness;

  // Calculate current length based on deflection
  const currentLength = Math.max(wireThickness * coils, freeLength - deflection);

  // Build geometry
  const geometry = useMemo(() => {
    if (meanDiameter <= 0 || coils <= 0 || currentLength <= 0) {
      return new THREE.BufferGeometry();
    }

    return buildDieSpringGeometry({
      meanDiameter,
      coils,
      // Use current compressed length
      freeLength: currentLength,
      wire_b: wireWidth,
      wire_t: wireThickness,
      scale,
      endStyle,
      endGrindTurns,
    });
  }, [meanDiameter, coils, currentLength, wireWidth, wireThickness, scale, endStyle, endGrindTurns]);

  // Center the geometry
  const centeredGeometry = useMemo(() => {
    const geom = geometry.clone();
    geom.computeBoundingBox();
    if (geom.boundingBox) {
      const center = new THREE.Vector3();
      geom.boundingBox.getCenter(center);
      // We want to keep the bottom at Z=0 (or whatever the builder does)
      // Usually builder starts at 0.
      // If we center Y (height), the spring moves up/down as it compresses.
      // Better to align bottom to 0? 
      // The original code centered EVERYTHING.
      // geom.translate(-center.x, -center.y, -center.z);
      
      // If we keep original centering, it shrinks towards center.
      geom.translate(-center.x, -center.y, -center.z);
    }
    return geom;
  }, [geometry]);

  return (
    <mesh geometry={centeredGeometry}>
      <meshStandardMaterial
        color={baseColor}
        metalness={0.25}
        roughness={0.55}
        side={THREE.DoubleSide}
        wireframe={wireframe}
        flatShading={true}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

export default DieSpringMesh;
