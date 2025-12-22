/**
 * Torsion Spring 3D Geometry Generator
 * 
 * Engineering-accurate model with:
 * - Helical body coils
 * - Straight or bent legs at both ends
 * - Dynamic rotation based on working angle
 * - Left/right hand winding support
 */

import * as THREE from "three";

// ================================================================
// Angle Helpers
// ================================================================

const TWO_PI = Math.PI * 2;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Normalize angle to (-π, π], used to get the minimal extra rotation.
 */
function normalizeAngle(angle: number): number {
  let a = angle % TWO_PI;
  if (a <= -Math.PI) a += TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  return a;
}

/**
 * Calculate the total helix angle needed to achieve the desired leg angle.
 * 
 * Key insight: Both legs are tangent to the helix.
 * - Leg1 tangent direction at θ=0: (0, 1) → leg points opposite: (0, -1) → angle = -π/2
 * - Leg2 tangent direction at θ=θ_total: (-sin(θ), cos(θ)) → leg points same direction
 *   → leg angle = atan2(cos(θ), -sin(θ)) = π/2 - θ
 * 
 * Angle between legs = leg2_angle - leg1_angle = (π/2 - θ_total) - (-π/2) = π - θ_total
 * 
 * To get desired currentLegAngle:
 *   π - θ_total = currentLegAngle (in radians)
 *   θ_total = π - currentLegAngle
 * 
 * But we also need at least activeCoils full rotations:
 *   θ_total = 2π × activeCoils + extraAngle
 *   where extraAngle adjusts the final leg position
 */
function calculateHelixTotalAngle(
  activeCoils: number,
  freeAngle: number,
  workingAngle: number,
  windingDirection: "left" | "right"
): number {
  const dirMult = windingDirection === "right" ? 1 : -1;

  // Current angle between legs (degrees)
  const currentLegAngleDeg = freeAngle - workingAngle;
  const currentLegAngleRad = degToRad(currentLegAngleDeg);

  // Base helix angle for full coils
  const baseAngle = TWO_PI * activeCoils;

  // For a helix with θ_total:
  // - Leg1 at θ=0, tangent = (0, 1), leg direction = (0, -1), angle = -π/2
  // - Leg2 at θ=θ_total, tangent = (-sin(θ), cos(θ)), leg direction same
  //   leg2 angle = atan2(cos(θ), -sin(θ)) = π/2 - θ (mod 2π)
  //
  // Angle between legs = leg2_angle - leg1_angle
  //                    = (π/2 - θ_total) - (-π/2)
  //                    = π - θ_total (mod 2π)
  //
  // We want: π - θ_total ≡ currentLegAngleRad (mod 2π)
  // So: θ_total ≡ π - currentLegAngleRad (mod 2π)

  // Calculate the target ending angle (mod 2π)
  const targetEndAngle = normalizeAngle(Math.PI - currentLegAngleRad);

  // Current ending angle from base coils (mod 2π)
  const baseEndAngle = normalizeAngle(baseAngle);

  // Extra rotation needed
  let extraAngle = targetEndAngle - baseEndAngle;

  // Normalize to get the smallest adjustment
  extraAngle = normalizeAngle(extraAngle);

  // Total helix angle
  const totalAngle = baseAngle + extraAngle;

  return totalAngle * dirMult;
}

// ================================================================
// PART #1 — Parameters Interface
// ================================================================

export interface TorsionSpringParams {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Number of active coils */
  activeCoils: number;
  /** Body length (mm) - calculated from pitch × coils */
  bodyLength: number;
  /** Pitch between coils (mm) - must be >= wire diameter */
  pitch: number;
  /** Leg 1 length (mm) - fixed side arm */
  legLength1: number;
  /** Leg 2 length (mm) - force side arm */
  legLength2: number;
  /** Free angle between legs (degrees) - initial angle */
  freeAngle: number;
  /** Working angle deflection (degrees) - rotation from free position */
  workingAngle: number;
  /** Winding direction: 'left' or 'right' */
  windingDirection: "left" | "right";
  /** Scale factor for 3D scene */
  scale: number;
  /** Leg type: 'straight' | 'bent' | 'hook' */
  legType?: "straight" | "bent" | "hook";
}

export interface TorsionSpringState {
  /** Current angle between legs (degrees) */
  currentAngle: number;
  /** Whether spring is at rest (no deflection) */
  isAtRest: boolean;
  /** Leg positions for reference */
  leg1EndPosition: THREE.Vector3;
  leg2EndPosition: THREE.Vector3;
}

// ================================================================
// PART #2 — Body Centerline Generator
// ================================================================

/**
 * Generate the parametric centerline curve for torsion spring body
 * 
 * Key insight: To control the angle between legs, we adjust the total helix angle.
 * Both legs are tangent to the helix, so by changing where the helix ends,
 * we control the direction of leg2 (and thus the angle between legs).
 * 
 * Parameters:
 * - activeCoils: base number of coils
 * - freeAngle: initial angle between legs (degrees)
 * - workingAngle: current deflection from free position (degrees)
 * - pitch: distance between coils
 */
export function generateTorsionBodyCenterline(
  params: TorsionSpringParams
): { points: THREE.Vector3[]; startPoint: THREE.Vector3; endPoint: THREE.Vector3; startAngle: number; endAngle: number } {
  const {
    meanDiameter,
    activeCoils,
    freeAngle,
    workingAngle,
    pitch,
    windingDirection,
    scale,
  } = params;

  // Scaled dimensions
  const R = (meanDiameter / 2) * scale;

  // Use pitch to calculate body length
  const scaledPitch = pitch * scale;

  // Calculate the total helix angle to achieve desired leg angle
  // This is the key: we adjust the helix ending angle to control leg2 direction
  const totalAngle = calculateHelixTotalAngle(activeCoils, freeAngle, workingAngle, windingDirection);

  // Body length is based on the actual rotation (may be slightly more/less than activeCoils)
  const actualCoils = Math.abs(totalAngle) / TWO_PI;
  const L = scaledPitch * actualCoils;

  // Sampling parameters - more samples for smoother curve
  const numSamples = Math.max(400, Math.ceil(actualCoils * 60));

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const θ = t * totalAngle; // totalAngle already includes direction

    // Z position (height along spring axis)
    const z = t * L;

    // X/Y parametric (circular helix)
    const x = R * Math.cos(θ);
    const y = R * Math.sin(θ);

    points.push(new THREE.Vector3(x, y, z));
  }

  const startPoint = points[0].clone();
  const endPoint = points[points.length - 1].clone();

  return {
    points,
    startPoint,
    endPoint,
    startAngle: 0,
    endAngle: totalAngle, // Already includes direction from calculateHelixTotalAngle
  };
}

// ================================================================
// PART #3 — Leg Geometry Generator
// ================================================================

export interface LegGeometry {
  points: THREE.Vector3[];
  endPosition: THREE.Vector3;
}

/**
 * Generate leg geometry for torsion spring
 * 
 * Key concept for torsion spring legs:
 * - Leg1 (fixed side): extends from coil start, direction based on helix tangent
 * - Leg2 (force side): extends from coil end, rotated by working angle
 * - The angle between legs = freeAngle - workingAngle
 * 
 * For a helix: x = R*cos(θ), y = R*sin(θ)
 * Tangent direction: (-sin(θ), cos(θ))
 * 
 * Leg directions are calculated to achieve the correct angle between them.
 */
export function generateLegGeometry(
  params: TorsionSpringParams,
  isLeg1: boolean,
  bodyEndPoint: THREE.Vector3,
  bodyEndAngle: number
): LegGeometry {
  const {
    meanDiameter,
    legLength1,
    legLength2,
    freeAngle,
    workingAngle,
    windingDirection,
    scale,
  } = params;


  const legLength = (isLeg1 ? legLength1 : legLength2) * scale;

  const points: THREE.Vector3[] = [];

  // Direction multiplier for winding
  const dirMult = windingDirection === "right" ? 1 : -1;




  // The position on the helix at this point
  const posX = bodyEndPoint.x;
  const posY = bodyEndPoint.y;
  const posZ = bodyEndPoint.z;

  // Calculate leg direction based on helix tangent at the connection point
  // For helix: x = R*cos(θ), y = R*sin(θ)
  // Tangent direction: dx/dθ = -R*sin(θ), dy/dθ = R*cos(θ)
  // Normalized tangent: (-sin(θ), cos(θ))
  //
  // BOTH legs extend along the tangent direction:
  // - Leg1: OPPOSITE to helix travel (backward from start)
  // - Leg2: SAME as helix travel (forward from end)
  //
  // The angle between legs is controlled by the helix total angle,
  // NOT by rotating the legs. This ensures both legs are always tangent.

  let legDirX: number;
  let legDirY: number;

  if (isLeg1) {
    // Leg1 at start of coil (θ = 0)
    // Tangent at θ=0: (-sin(0), cos(0)) = (0, 1)
    const tangentX = 0;
    const tangentY = 1;

    // Leg1 extends OPPOSITE to helix travel (backward from start)
    // For right-hand: opposite of (0, 1) is (0, -1)
    legDirX = -tangentX * dirMult;
    legDirY = -tangentY * dirMult;
  } else {
    // Leg2 at end of coil - use the actual bodyEndAngle passed in
    // This angle was calculated by calculateHelixTotalAngle to achieve
    // the desired angle between legs
    const helixEndAngle = bodyEndAngle;

    // Tangent at helix end: (-sin(θ), cos(θ))
    const tangentX = -Math.sin(helixEndAngle);
    const tangentY = Math.cos(helixEndAngle);

    // Leg2 extends in SAME direction as helix travel (forward from end)
    // For right-hand winding, tangent direction is the travel direction
    const sign = windingDirection === "right" ? 1 : -1;
    legDirX = tangentX * sign;
    legDirY = tangentY * sign;
  }

  // Generate straight leg points along leg direction
  // Start from the body connection point and extend outward
  const numSegments = 30;

  // First point: exactly at body connection
  points.push(new THREE.Vector3(posX, posY, posZ));

  // Remaining points: extend along leg direction
  for (let i = 1; i <= numSegments; i++) {
    const t = i / numSegments;
    const x = posX + t * legLength * legDirX;
    const y = posY + t * legLength * legDirY;
    const z = posZ; // Legs stay in the same Z plane as their connection point
    points.push(new THREE.Vector3(x, y, z));
  }

  const endPosition = points.length > 0
    ? points[points.length - 1].clone()
    : bodyEndPoint.clone();

  return { points, endPosition };
}

// ================================================================
// PART #4 — Complete Geometry Builder
// ================================================================

export interface TorsionSpringGeometry {
  bodyGeometry: THREE.TubeGeometry;
  leg1Geometry: THREE.TubeGeometry | null;
  leg2Geometry: THREE.TubeGeometry | null;
  totalHeight: number;
  state: TorsionSpringState;
}

/**
 * Build complete torsion spring geometry
 * 
 * The angle between legs is controlled by adjusting the helix total angle.
 * Both legs remain tangent to the helix at their connection points.
 */
export function buildTorsionSpringGeometry(
  params: TorsionSpringParams
): TorsionSpringGeometry {
  const { wireDiameter, freeAngle, workingAngle, scale } = params;

  // Generate body centerline - this calculates the adjusted helix angle
  const { points, startPoint, endPoint, startAngle, endAngle } = generateTorsionBodyCenterline(params);

  // Create body curve
  const bodyCurve = new THREE.CatmullRomCurve3(points);

  // Wire radius for tube
  const wireRadius = (wireDiameter / 2) * scale;

  // Create body tube geometry
  const bodyGeometry = new THREE.TubeGeometry(
    bodyCurve,
    points.length - 1,
    wireRadius,
    16,
    false
  );

  // Generate legs using the actual helix angles
  // Leg1 at start (angle = 0), Leg2 at end (angle = endAngle from helix calculation)
  const leg1 = generateLegGeometry(params, true, startPoint, startAngle);
  const leg2 = generateLegGeometry(params, false, endPoint, endAngle);

  let leg1Geometry: THREE.TubeGeometry | null = null;
  let leg2Geometry: THREE.TubeGeometry | null = null;

  if (leg1.points.length > 2) {
    const leg1Curve = new THREE.CatmullRomCurve3(leg1.points);
    leg1Geometry = new THREE.TubeGeometry(
      leg1Curve,
      leg1.points.length - 1,
      wireRadius,
      16,
      false
    );
  }

  if (leg2.points.length > 2) {
    const leg2Curve = new THREE.CatmullRomCurve3(leg2.points);
    leg2Geometry = new THREE.TubeGeometry(
      leg2Curve,
      leg2.points.length - 1,
      wireRadius,
      16,
      false
    );
  }

  // Calculate state
  const currentAngle = freeAngle - workingAngle;
  const isAtRest = workingAngle <= 0;

  // Find min/max Z for total height
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  return {
    bodyGeometry,
    leg1Geometry,
    leg2Geometry,
    totalHeight: maxZ - minZ,
    state: {
      currentAngle,
      isAtRest,
      leg1EndPosition: leg1.endPosition,
      leg2EndPosition: leg2.endPosition,
    },
  };
}
