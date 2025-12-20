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
  /** Duty rating for color (LD/MD/HD/XHD) */
  duty?: DieSpringDuty;
  /** Risk value 0~1+ for emissive glow */
  risk?: number;
  /** Show wireframe */
  wireframe?: boolean;
}

export function DieSpringMesh({
  outerDiameter,
  wireThickness,
  wireWidth,
  coils,
  freeLength,
  endStyle = "closed_ground",
  endGrindTurns = 0.25,
  scale = 0.05,
  color,
  duty,
  risk = 0,
  wireframe = false,
}: DieSpringMeshProps) {
  // Determine base color: explicit color > duty color > default
  const baseColor = color ?? (duty ? DUTY_COLORS[duty] : "#4a90d9");
  
  // Get risk-based emissive properties
  const { color: emissiveColor, intensity: emissiveIntensity } = useMemo(
    () => getRiskEmissive(risk),
    [risk]
  );
  // Calculate mean diameter: Dm = OD - t
  const meanDiameter = outerDiameter - wireThickness;

  // Build geometry
  const geometry = useMemo(() => {
    if (meanDiameter <= 0 || coils <= 0 || freeLength <= 0) {
      return new THREE.BufferGeometry();
    }

    return buildDieSpringGeometry({
      meanDiameter,
      coils,
      freeLength,
      wire_b: wireWidth,
      wire_t: wireThickness,
      scale,
      endStyle,
      endGrindTurns,
    });
  }, [meanDiameter, coils, freeLength, wireWidth, wireThickness, scale, endStyle, endGrindTurns]);

  // Center the geometry
  const centeredGeometry = useMemo(() => {
    const geom = geometry.clone();
    geom.computeBoundingBox();
    if (geom.boundingBox) {
      const center = new THREE.Vector3();
      geom.boundingBox.getCenter(center);
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
