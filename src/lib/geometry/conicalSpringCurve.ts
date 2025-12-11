import * as THREE from "three";

/**
 * Parameters for generating conical spring helix geometry.
 */
export interface ConicalSpringGeometryParams {
  largeRadius: number;      // Large end mean radius (bottom)
  smallRadius: number;      // Small end mean radius (top)
  freeLength: number;       // Free length L0 (scene height)
  activeCoils: number;      // Number of active coils Na
  totalCoils?: number;      // Total coils Nt (default: Na + 2 for dead coils)
  wireDiameter?: number;    // Wire diameter d (for dead coil pitch)
  samples?: number;         // Number of sample points, default 200
  currentDeflection?: number; // Current compression amount
  collapsedCoils?: number;  // Number of collapsed coils (for reference)
}

/**
 * Result of helix generation with split points for collapsed/active sections.
 */
export interface ConicalHelixResult {
  allPoints: THREE.Vector3[];
  collapsedPoints: THREE.Vector3[];
  activePoints: THREE.Vector3[];
  collapsedRatio: number;
}

/**
 * Generates points for a conical helix spring from bottom (large end) to top (small end).
 * 
 * Algorithm (simplified, consistent with FreeCAD):
 * - Conical springs typically have all active coils, no dead coil segmentation
 * - All coils use uniform pitch: pitch = L0 / totalCoils
 * - Radius interpolates linearly along z (large end → small end)
 * - This avoids pitch discontinuity at dead/active coil boundaries for smoother last coil
 * 
 * The helix is parameterized by t ∈ [0, 1]:
 * - t = 0: bottom (large radius)
 * - t = 1: top (small radius)
 * 
 * @param params Geometry parameters
 * @returns Array of Vector3 points representing the helix
 */
export function generateConicalHelixPoints(
  params: ConicalSpringGeometryParams
): THREE.Vector3[] {
  const {
    largeRadius,
    smallRadius,
    freeLength,
    activeCoils,
    totalCoils = activeCoils,  // Default: no dead coils for conical springs
    samples = 400,
  } = params;

  const L0 = freeLength;
  const Nt = totalCoils;

  // Uniform pitch (no dead coil segmentation)
  const pitch = Nt > 0 ? L0 / Nt : L0;

  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const theta = 2 * Math.PI * Nt * t;
    const n = Nt * t;  // Current coil number (0 to Nt)
    const y = n * pitch;  // Uniform pitch, linear distribution

    // Axial progress 0~1 for radius interpolation
    const u = L0 > 1e-6 ? y / L0 : 0;
    // Radius linear interpolation: bottom large → top small
    const r = largeRadius + (smallRadius - largeRadius) * u;

    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);

    points.push(new THREE.Vector3(x, y, z));
  }

  return points;
}

/**
 * Generates conical helix points with compression applied.
 * 
 * When coils collapse, the bottom coils stack together while
 * the remaining active coils distribute in the remaining height.
 * 
 * @param params Geometry parameters including deflection info
 * @returns Object containing all points and split arrays for coloring
 */
export function generateCompressedConicalHelix(
  params: ConicalSpringGeometryParams & {
    wireDiameter: number;
    collapsedCoils: number;
  }
): ConicalHelixResult {
  const {
    largeRadius,
    smallRadius,
    freeLength,
    activeCoils,
    samples = 200,
    currentDeflection = 0,
    wireDiameter,
    collapsedCoils,
  } = params;

  const points: THREE.Vector3[] = [];
  
  // Calculate compressed geometry
  const totalCoils = activeCoils;
  const collapsed = Math.min(Math.max(collapsedCoils, 0), totalCoils - 1);
  const collapsedRatio = collapsed / totalCoils;
  
  // Height of collapsed coils (stacked at wire diameter spacing)
  const collapsedHeight = collapsed * wireDiameter;
  
  // Remaining height for active coils
  const currentHeight = freeLength - currentDeflection;
  const activeHeight = Math.max(currentHeight - collapsedHeight, wireDiameter);

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    
    // Determine which section this point belongs to
    let y: number;
    
    if (t <= collapsedRatio && collapsed > 0) {
      // Collapsed section: compress to bottom
      // Map t ∈ [0, collapsedRatio] to y ∈ [0, collapsedHeight]
      const localT = t / collapsedRatio;
      y = localT * collapsedHeight;
    } else {
      // Active section: distribute in remaining height
      // Map t ∈ [collapsedRatio, 1] to y ∈ [collapsedHeight, currentHeight]
      const localT = collapsedRatio < 1 
        ? (t - collapsedRatio) / (1 - collapsedRatio)
        : 0;
      y = collapsedHeight + localT * activeHeight;
    }

    // Radius varies linearly from largeRadius (bottom) to smallRadius (top)
    const r = largeRadius + (smallRadius - largeRadius) * t;

    // Total rotation angle: 2π * activeCoils
    const theta = 2 * Math.PI * activeCoils * t;

    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta);

    points.push(new THREE.Vector3(x, y, z));
  }

  // Split points for two-color rendering
  const splitIndex = Math.floor(samples * collapsedRatio);
  
  // Ensure minimum points for valid curves
  const collapsedPoints = splitIndex > 1 
    ? points.slice(0, splitIndex + 1) 
    : [];
  
  // Overlap by 1 point to avoid gaps
  const activePoints = splitIndex > 0 
    ? points.slice(Math.max(splitIndex - 1, 0))
    : points;

  return {
    allPoints: points,
    collapsedPoints,
    activePoints,
    collapsedRatio,
  };
}

/**
 * Creates a CatmullRomCurve3 from points, handling edge cases.
 */
export function createHelixCurve(points: THREE.Vector3[]): THREE.CatmullRomCurve3 | null {
  if (points.length < 2) return null;
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}
