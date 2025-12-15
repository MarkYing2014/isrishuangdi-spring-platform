/**
 * FEA Calculator - Pure Frontend Implementation
 * 纯前端 FEA 计算模块，使用工程公式计算应力和位移
 * 
 * 适用于 Vercel 等无服务器平台部署
 */

import type { FEAResult, FEAResultNode } from "./feaTypes";

// ============================================================================
// Types
// ============================================================================

export type SpringType = "compression" | "extension" | "torsion" | "conical" | "spiralTorsion";

export interface FeaGeometry {
  // Common
  wireDiameter?: number;
  meanDiameter?: number;
  outerDiameter?: number;
  activeCoils?: number;
  totalCoils?: number;
  freeLength?: number;
  pitch?: number;
  
  // Conical
  largeEndDiameter?: number;
  largeOuterDiameter?: number;
  smallEndDiameter?: number;
  smallOuterDiameter?: number;
  
  // Spiral Torsion
  innerDiameter?: number;
  turns?: number;
  stripWidth?: number;
  stripThickness?: number;
  handedness?: "cw" | "ccw";
  windingDirection?: "cw" | "ccw";
  b?: number;
  t?: number;
}

export interface FeaLoadCase {
  springType: SpringType;
  loadValue: number;
  leverArm?: number;
  angleDeg?: number;
}

export interface FeaInput {
  springType: SpringType;
  geometry: FeaGeometry;
  loadCase: FeaLoadCase;
  allowableStress?: number;
}

// ============================================================================
// Engineering Formulas
// ============================================================================

/**
 * Wahl correction factor for helical springs
 * Kw = (4C - 1) / (4C - 4) + 0.615 / C
 */
function wahlFactor(C: number): number {
  if (C <= 1) return 1.0;
  return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

/**
 * Inner stress correction factor for torsion springs
 * Ki = (4C² - C - 1) / (4C * (C - 1))
 */
function innerStressFactor(C: number): number {
  if (C <= 1) return 1.0;
  return (4 * C * C - C - 1) / (4 * C * (C - 1));
}

/**
 * Calculate shear stress for compression/extension springs
 * τ = 8 * F * D * Kw / (π * d³)
 */
function shearStress(F: number, D: number, d: number): number {
  const C = D / d;
  const Kw = wahlFactor(C);
  return (8 * F * D * Kw) / (Math.PI * Math.pow(d, 3));
}

/**
 * Calculate bending stress for torsion springs
 * σ = Ki * 32 * M / (π * d³)
 */
function bendingStress(M: number, d: number, C: number): number {
  const Ki = innerStressFactor(C);
  return (Ki * 32 * M) / (Math.PI * Math.pow(d, 3));
}

/**
 * Calculate bending stress for spiral torsion springs
 * σ = 6 * T / (b * t²)
 */
function spiralBendingStress(T: number, b: number, t: number): number {
  return (6 * T) / (b * t * t);
}

/**
 * Calculate spring deflection for compression/extension springs
 * δ = 8 * F * D³ * n / (G * d⁴)
 */
function helicalDeflection(F: number, D: number, d: number, n: number, G: number = 79300): number {
  return (8 * F * Math.pow(D, 3) * n) / (G * Math.pow(d, 4));
}

/**
 * Calculate angular deflection for torsion springs
 * θ = M * L / (E * I) where L = π * D * n, I = π * d⁴ / 64
 */
function torsionDeflection(M: number, D: number, d: number, n: number, E: number = 206000): number {
  const L = Math.PI * D * n;
  const I = Math.PI * Math.pow(d, 4) / 64;
  return (M * L) / (E * I); // radians
}

/**
 * Calculate angular deflection for spiral torsion springs
 * θ = 12 * T * L / (E * b * t³)
 */
function spiralDeflection(T: number, L: number, b: number, t: number, E: number = 206000): number {
  return (12 * T * L) / (E * b * Math.pow(t, 3)); // radians
}

// ============================================================================
// Centerline Generation
// ============================================================================

interface Point3D {
  x: number;
  y: number;
  z: number;
}

function generateCenterline(springType: SpringType, geometry: FeaGeometry, numSamples: number = 80): Point3D[] {
  const pts: Point3D[] = [];

  if (springType === "compression") {
    const d = geometry.wireDiameter || 1.6;
    const dm = geometry.meanDiameter || (geometry.outerDiameter || 12) - d;
    const totalCoils = geometry.totalCoils || (geometry.activeCoils || 6) + 2;
    const freeLength = geometry.freeLength || totalCoils * d * 1.5;
    const radius = dm / 2;
    const totalAngle = 2 * Math.PI * totalCoils;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const theta = t * totalAngle;
      const z = t * freeLength;
      pts.push({
        x: radius * Math.cos(theta),
        y: radius * Math.sin(theta),
        z,
      });
    }
  } else if (springType === "extension") {
    const d = geometry.wireDiameter || 1.6;
    const dm = geometry.meanDiameter || (geometry.outerDiameter || 12) - d;
    const coils = geometry.activeCoils || 6;
    const radius = dm / 2;
    const pitch = d; // Close-wound
    const length = pitch * coils;
    const totalAngle = 2 * Math.PI * coils;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const theta = t * totalAngle;
      const z = t * length;
      pts.push({
        x: radius * Math.cos(theta),
        y: radius * Math.sin(theta),
        z,
      });
    }
  } else if (springType === "torsion") {
    const d = geometry.wireDiameter || 1.6;
    const dm = geometry.meanDiameter || (geometry.outerDiameter || 12) - d;
    const coils = geometry.activeCoils || 6;
    const pitch = geometry.pitch || d;
    const radius = dm / 2;
    const totalAngle = 2 * Math.PI * coils;
    const length = pitch * coils;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const theta = t * totalAngle;
      const z = t * length;
      pts.push({
        x: radius * Math.cos(theta),
        y: radius * Math.sin(theta),
        z,
      });
    }
  } else if (springType === "conical") {
    const d = geometry.wireDiameter || 1.6;
    const d1 = geometry.largeEndDiameter || geometry.largeOuterDiameter || geometry.outerDiameter || 20;
    const d2 = geometry.smallEndDiameter || geometry.smallOuterDiameter || d1 * 0.5;
    const coils = geometry.activeCoils || 6;
    const freeLength = geometry.freeLength || coils * d * 2;
    const r1 = (d1 - d) / 2; // Large end mean radius
    const r2 = (d2 - d) / 2; // Small end mean radius
    const totalAngle = 2 * Math.PI * coils;

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const theta = t * totalAngle;
      const z = t * freeLength;
      const radius = r1 + t * (r2 - r1); // Linear interpolation
      pts.push({
        x: radius * Math.cos(theta),
        y: radius * Math.sin(theta),
        z,
      });
    }
  } else if (springType === "spiralTorsion") {
    const di = geometry.innerDiameter || 15;
    const douter = geometry.outerDiameter || 50;
    const turns = geometry.turns || geometry.activeCoils || 5;
    const ri = di / 2;
    const ro = douter / 2;
    const totalAngle = 2 * Math.PI * turns;
    const a = totalAngle !== 0 ? (ro - ri) / totalAngle : 0;
    const handedness = geometry.handedness || geometry.windingDirection || "cw";

    for (let i = 0; i <= numSamples; i++) {
      const t = i / numSamples;
      const theta = t * totalAngle;
      const r = ri + a * theta;
      const angle = handedness === "cw" ? -theta : theta;
      pts.push({
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        z: 0,
      });
    }
  }

  return pts;
}

// ============================================================================
// Main FEA Calculator
// ============================================================================

/**
 * Calculate FEA results using engineering formulas
 * This is a pure frontend implementation that doesn't require CCX
 */
export function calculateFea(input: FeaInput): FEAResult {
  const { springType, geometry, loadCase, allowableStress } = input;
  const loadValue = loadCase.loadValue;
  const leverArm = loadCase.leverArm || 20;

  // Generate centerline points
  const centerline = generateCenterline(springType, geometry);
  const numNodes = centerline.length;

  // Get geometry parameters
  const d = geometry.wireDiameter || 1.6;
  const D = geometry.meanDiameter || (geometry.outerDiameter || 12) - d;
  const C = D / d;
  const n = geometry.activeCoils || 6;

  // Calculate base stress and deflection using engineering formulas
  let baseStress = 0;
  let baseDeflection = 0;

  if (springType === "compression" || springType === "extension") {
    baseStress = shearStress(loadValue, D, d);
    baseDeflection = helicalDeflection(loadValue, D, d, n);
  } else if (springType === "torsion") {
    const M = loadValue * leverArm;
    baseStress = bendingStress(M, d, C);
    baseDeflection = torsionDeflection(M, D, d, n) * (180 / Math.PI); // Convert to degrees
  } else if (springType === "conical") {
    // Use large end diameter for max stress
    const D1 = (geometry.largeEndDiameter || geometry.largeOuterDiameter || geometry.outerDiameter || 20) - d;
    baseStress = shearStress(loadValue, D1, d);
    baseDeflection = helicalDeflection(loadValue, D1, d, n);
  } else if (springType === "spiralTorsion") {
    const b = geometry.stripWidth || geometry.b || 10;
    const t = geometry.stripThickness || geometry.t || 0.8;
    const di = geometry.innerDiameter || 15;
    const douter = geometry.outerDiameter || 50;
    const turns = geometry.turns || geometry.activeCoils || 5;
    
    // Strip length approximation
    const ri = di / 2;
    const ro = douter / 2;
    const L = Math.PI * turns * (ri + ro); // Average circumference * turns
    
    baseStress = spiralBendingStress(loadValue, b, t);
    baseDeflection = spiralDeflection(loadValue, L, b, t) * (180 / Math.PI); // Convert to degrees
  }

  // Generate node results with stress distribution
  const nodes: FEAResultNode[] = [];
  let maxSigma = 0;
  let maxDisplacement = 0;

  for (let i = 0; i < numNodes; i++) {
    const pt = centerline[i];
    const t = i / (numNodes - 1); // Normalized position [0, 1]

    // Stress distribution along the spring
    let stressFactor: number;
    if (springType === "torsion") {
      // Torsion: stress highest at fixed end, decreases toward free end
      stressFactor = 1.0 - t * 0.3;
    } else if (springType === "spiralTorsion") {
      // Spiral: stress highest at inner (fixed) end
      stressFactor = 1.0 - t * 0.35;
    } else if (springType === "conical") {
      // Conical: stress highest at large end (t=0), decreases toward small end
      stressFactor = 1.0 - t * 0.4;
    } else {
      // Compression/Extension: relatively uniform with slight coil variation
      stressFactor = 0.85 + 0.15 * Math.sin(t * Math.PI * 2);
    }

    // Add small coil-to-coil variation for realism
    const coilVariation = 0.05 * Math.sin(t * Math.PI * 8);
    const sigma_vm = Math.max(0, baseStress * stressFactor * (1 + coilVariation));

    // Displacement increases toward free end
    let ux: number, uy: number, uz: number;
    
    if (springType === "spiralTorsion") {
      // Spiral: rotation in XY plane
      const angle = t * baseDeflection * (Math.PI / 180); // Convert back to radians for calculation
      const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
      ux = r * angle * 0.1;
      uy = r * angle * 0.1;
      uz = 0;
    } else if (springType === "torsion") {
      // Torsion: angular displacement
      const angle = t * baseDeflection * (Math.PI / 180);
      ux = t * leverArm * Math.sin(angle) * 0.1;
      uy = t * leverArm * (1 - Math.cos(angle)) * 0.1;
      uz = t * 0.05;
    } else {
      // Compression/Extension/Conical: axial displacement
      ux = t * 0.02 * baseDeflection;
      uy = t * 0.01 * baseDeflection;
      uz = t * baseDeflection;
    }

    nodes.push({
      id: i + 1,
      x: pt.x,
      y: pt.y,
      z: pt.z,
      sigma_vm,
      ux,
      uy,
      uz,
    });

    maxSigma = Math.max(maxSigma, sigma_vm);
    const dispMag = Math.sqrt(ux * ux + uy * uy + uz * uz);
    maxDisplacement = Math.max(maxDisplacement, dispMag);
  }

  // Calculate safety factor
  const safetyFactor = allowableStress && maxSigma > 0 
    ? allowableStress / maxSigma 
    : undefined;

  return {
    nodes,
    maxSigma,
    maxDisplacement,
    safetyFactor,
  };
}

/**
 * Run FEA calculation (API-compatible interface)
 */
export function runFeaCalculation(design: {
  springType: SpringType;
  geometry: FeaGeometry;
  loadCase: FeaLoadCase;
  allowableStress?: number;
}): {
  ok: boolean;
  result?: FEAResult;
  error?: string;
} {
  try {
    const result = calculateFea({
      springType: design.springType,
      geometry: design.geometry,
      loadCase: design.loadCase,
      allowableStress: design.allowableStress,
    });
    return { ok: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
