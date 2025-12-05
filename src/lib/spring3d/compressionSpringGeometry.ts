/**
 * Compression Spring 3D Geometry Generator
 * 
 * Engineering-accurate model with:
 * - Dead coils at both ends (ground & closed)
 * - Segmented pitch (dead vs active regions)
 * - Parametric centerline generation
 * - Dynamic compression based on Δx
 * - Clipping planes for ground ends
 */

import * as THREE from "three";

// ================================================================
// PART #1 — Parameters Interface
// ================================================================

export interface CompressionSpringParams {
  /** Total number of coils (turns) */
  totalCoils: number;
  /** Number of active coils */
  activeCoils: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Free length (mm) */
  freeLength: number;
  /** Current deflection Δx (mm) */
  currentDeflection: number;
  /** Scale factor for 3D scene */
  scale: number;
}

export interface CompressionSpringState {
  /** Current force F = k × Δx */
  force: number;
  /** Current stiffness */
  stiffness: number;
  /** Number of bottomed (collapsed) coils */
  bottomedCoils: number;
  /** Current compressed length */
  compressedLength: number;
  /** Solid height (minimum possible length) */
  solidHeight: number;
  /** Whether spring has reached solid height */
  isAtSolidHeight: boolean;
}

// ================================================================
// PART #2 — Centerline Curve Generator
// ================================================================

/**
 * Generate the parametric centerline curve for compression spring
 * Uses segmented pitch: dead coils at ends, active coils in middle
 */
export function generateCompressionCenterline(
  params: CompressionSpringParams
): { points: THREE.Vector3[]; minZ: number; maxZ: number } {
  const {
    totalCoils,
    activeCoils,
    meanDiameter,
    wireDiameter,
    freeLength,
    currentDeflection,
    scale,
  } = params;

  // Dead coils calculation
  const deadCoils = totalCoils - activeCoils;
  const deadCoilsPerEnd = deadCoils / 2;

  // Scaled dimensions
  const R = (meanDiameter / 2) * scale;
  const d = wireDiameter * scale;
  const L0 = freeLength * scale;
  const Δx = currentDeflection * scale;

  // Pitch calculations
  const pitchDead = d; // Dead coil pitch ≈ wire diameter
  const deadHeight = deadCoils * pitchDead;
  const Hb = L0 - deadHeight; // Active region height (free state)
  
  // Compressed active height
  const HbCompressed = Math.max(Hb - Δx, activeCoils * pitchDead);
  const pitchActiveCompressed = HbCompressed / activeCoils;

  // Sampling parameters
  const numSamples = 800;
  const totalAngle = 2 * Math.PI * totalCoils;

  const points: THREE.Vector3[] = [];
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const θ = t * totalAngle;
    const n = θ / (2 * Math.PI); // Current turn number

    // Calculate Z based on which segment we're in
    let z: number;

    if (n <= deadCoilsPerEnd) {
      // Case A: Bottom dead coils
      z = pitchDead * n;
    } else if (n >= totalCoils - deadCoilsPerEnd) {
      // Case C: Top dead coils
      const nDeadTop = n - (totalCoils - deadCoilsPerEnd);
      const bottomDeadHeight = deadCoilsPerEnd * pitchDead;
      z = bottomDeadHeight + HbCompressed + nDeadTop * pitchDead;
    } else {
      // Case B: Active coils (compressed)
      const nActive = n - deadCoilsPerEnd;
      const bottomDeadHeight = deadCoilsPerEnd * pitchDead;
      z = bottomDeadHeight + pitchActiveCompressed * nActive;
    }

    // X/Y parametric
    const x = R * Math.cos(θ);
    const y = R * Math.sin(θ);

    points.push(new THREE.Vector3(x, y, z));

    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  return { points, minZ, maxZ };
}

// ================================================================
// PART #3 — Clipping Planes Factory
// ================================================================

export interface ClipPlanes {
  bottom: THREE.Plane;
  top: THREE.Plane;
}

/**
 * Create clipping planes for ground ends
 * @param minZ - Minimum Z of centerline
 * @param maxZ - Maximum Z of centerline
 * @param grindDepth - Depth to grind (typically 0.3 * wire diameter)
 */
export function createClipPlanes(
  minZ: number,
  maxZ: number,
  grindDepth: number
): ClipPlanes {
  // Bottom plane: normal pointing up (+Z), clips below minZ + grindDepth
  const bottom = new THREE.Plane(
    new THREE.Vector3(0, 0, 1),
    -(minZ + grindDepth)
  );

  // Top plane: normal pointing down (-Z), clips above maxZ - grindDepth
  const top = new THREE.Plane(
    new THREE.Vector3(0, 0, -1),
    maxZ - grindDepth
  );

  return { bottom, top };
}

// ================================================================
// PART #4 — End Face Disc Builder
// ================================================================

export interface EndDiscs {
  bottomPosition: number;
  topPosition: number;
  outerRadius: number;
  innerRadius: number;
}

/**
 * Calculate positions for end face discs (ground flat ends)
 */
export function calculateEndDiscs(
  minZ: number,
  maxZ: number,
  grindDepth: number,
  meanDiameter: number,
  wireDiameter: number,
  scale: number
): EndDiscs {
  const R = (meanDiameter / 2) * scale;
  const wireRadius = (wireDiameter / 2) * scale;

  return {
    bottomPosition: minZ + grindDepth,
    topPosition: maxZ - grindDepth,
    outerRadius: R + wireRadius,
    innerRadius: R - wireRadius,
  };
}

// ================================================================
// PART #5 — Physics Model
// ================================================================

/**
 * Calculate spring physics state based on current deflection
 */
export function calculateSpringState(
  params: CompressionSpringParams,
  springRate: number
): CompressionSpringState {
  const {
    totalCoils,
    activeCoils,
    wireDiameter,
    freeLength,
    currentDeflection,
  } = params;

  const deadCoils = totalCoils - activeCoils;
  
  // Solid height: all coils at wire diameter pitch
  const solidHeight = totalCoils * wireDiameter;
  
  // Maximum possible deflection
  const maxDeflection = freeLength - solidHeight;
  
  // Clamp deflection
  const clampedDeflection = Math.min(currentDeflection, maxDeflection);
  
  // Current compressed length
  const compressedLength = freeLength - clampedDeflection;
  
  // Check if at solid height
  const isAtSolidHeight = compressedLength <= solidHeight * 1.01;
  
  // Calculate bottomed coils (coils that have reached pitch = d)
  const activeHeight = freeLength - deadCoils * wireDiameter;
  const compressedActiveHeight = activeHeight - clampedDeflection;
  const minActiveHeight = activeCoils * wireDiameter;
  
  let bottomedCoils = 0;
  if (compressedActiveHeight <= minActiveHeight) {
    bottomedCoils = activeCoils;
  } else {
    // Proportional bottoming
    const compressionRatio = clampedDeflection / (activeHeight - minActiveHeight);
    bottomedCoils = Math.floor(compressionRatio * activeCoils);
  }
  
  // Force calculation (linear for now, could be nonlinear near solid height)
  let force = springRate * clampedDeflection;
  
  // Increase stiffness rapidly near solid height
  if (isAtSolidHeight) {
    force = springRate * maxDeflection * 2; // Effectively infinite stiffness
  }
  
  return {
    force,
    stiffness: springRate,
    bottomedCoils,
    compressedLength,
    solidHeight,
    isAtSolidHeight,
  };
}

// ================================================================
// PART #6 — Complete Geometry Builder
// ================================================================

export interface CompressionSpringGeometry {
  tubeGeometry: THREE.TubeGeometry;
  clipPlanes: ClipPlanes;
  endDiscs: EndDiscs;
  totalHeight: number;
  state: CompressionSpringState;
}

/**
 * Build complete compression spring geometry
 */
export function buildCompressionSpringGeometry(
  params: CompressionSpringParams,
  springRate: number
): CompressionSpringGeometry {
  const { wireDiameter, meanDiameter, scale } = params;
  
  // Generate centerline
  const { points, minZ, maxZ } = generateCompressionCenterline(params);
  
  // Create curve
  const curve = new THREE.CatmullRomCurve3(points);
  
  // Wire radius for tube
  const wireRadius = (wireDiameter / 2) * scale;
  
  // Create tube geometry
  const tubeGeometry = new THREE.TubeGeometry(
    curve,
    points.length - 1,
    wireRadius,
    16,
    false
  );
  
  // Grind depth for clipping (0.3 × wire diameter)
  const grindDepth = wireRadius * 0.6;
  
  // Create clipping planes
  const clipPlanes = createClipPlanes(minZ, maxZ, grindDepth);
  
  // Calculate end disc positions
  const endDiscs = calculateEndDiscs(
    minZ,
    maxZ,
    grindDepth,
    meanDiameter,
    wireDiameter,
    scale
  );
  
  // Calculate physics state
  const state = calculateSpringState(params, springRate);
  
  return {
    tubeGeometry,
    clipPlanes,
    endDiscs,
    totalHeight: maxZ - minZ,
    state,
  };
}
