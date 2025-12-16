import { 
  SpringDesign, 
  CompressionSpringDesign,
  ConicalSpringDesign,
  ExtensionSpringDesign,
  TorsionSpringDesign,
  isCompressionDesign,
  isConicalDesign,
  isExtensionDesign,
  isTorsionDesign,
  LegacySpringDesign,
} from "@/lib/springTypes";
import { 
  getSpringMaterial, 
  type SpringMaterialId 
} from "@/lib/materials/springMaterials";

const PI = Math.PI;

/**
 * Input parameters for extension spring calculations.
 */
export interface ExtensionSpringInput {
  outerDiameter: number;      // OD, mm
  wireDiameter: number;       // d, mm
  activeCoils: number;        // Na
  shearModulus: number;       // G, MPa
  initialTension?: number;    // Fi, N, optional, defaults to 0
  workingDeflection: number;  // Δx, mm (extension from free length)
}

/**
 * Get mean diameter from any spring design type
 * 从任意弹簧设计类型获取中径
 */
export function getMeanDiameter(design: SpringDesign | LegacySpringDesign): number {
  if ("meanDiameter" in design && design.meanDiameter) {
    return design.meanDiameter;
  }
  if (isConicalDesign(design as SpringDesign)) {
    const conical = design as ConicalSpringDesign;
    // Use average of large and small mean diameters
    const largeMean = conical.largeOuterDiameter - conical.wireDiameter;
    const smallMean = conical.smallOuterDiameter - conical.wireDiameter;
    return (largeMean + smallMean) / 2;
  }
  if (isExtensionDesign(design as SpringDesign)) {
    const ext = design as ExtensionSpringDesign;
    return ext.meanDiameter ?? (ext.outerDiameter - ext.wireDiameter);
  }
  throw new Error("Cannot determine mean diameter for this spring design");
}

/**
 * Get active coils from any spring design type
 */
export function getActiveCoils(design: SpringDesign | LegacySpringDesign): number {
  return design.activeCoils;
}

/**
 * Ensures required geometric fields are positive numbers.
 * Serves as a lightweight guard before running engineering approximations.
 */
function validateGeometry(design: SpringDesign | LegacySpringDesign) {
  if (design.wireDiameter <= 0) {
    throw new Error("wireDiameter must be greater than zero");
  }
  const meanDiameter = getMeanDiameter(design);
  if (meanDiameter <= 0) {
    throw new Error("meanDiameter must be greater than zero");
  }
  if (design.activeCoils <= 0) {
    throw new Error("activeCoils must be greater than zero");
  }
}

/**
 * Calculates the spring index C = Dm / d.
 *
 * @param design Spring geometry definition.
 * @returns Dimensionless spring index.
 */
export function calculateSpringIndex(design: SpringDesign | LegacySpringDesign): number {
  validateGeometry(design);
  const meanDiameter = getMeanDiameter(design);
  return meanDiameter / design.wireDiameter;
}

/**
 * Calculates the Wahl correction factor based on the spring index.
 *
 * @param design Spring geometry definition.
 * @returns Wahl factor Kw for shear stress correction.
 */
export function calculateWahlFactor(design: SpringDesign | LegacySpringDesign): number {
  const springIndex = calculateSpringIndex(design);
  // Classical Wahl factor approximation for round-wire compression springs.
  return (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;
}

/**
 * Estimates the spring rate k (N/mm) using: k = (G * d^4) / (8 * Dm^3 * Na).
 * Only applicable to compression springs under small deflection.
 *
 * @param design Spring geometry definition.
 * @returns Spring rate in N/mm.
 */
export function calculateSpringRate(design: SpringDesign): number {
  validateGeometry(design);

  if (design.type !== "compression") {
    // Placeholder: torsion/extension require different formulations.
    return 0;
  }

  const { shearModulus, wireDiameter, meanDiameter, activeCoils } = design;
  const numerator = shearModulus * wireDiameter ** 4; // MPa ≈ N/mm²
  const denominator = 8 * meanDiameter ** 3 * activeCoils;

  return numerator / denominator;
}

/**
 * Calculates core load and stress values for a given deflection.
 *
 * @param design Spring geometry definition.
 * @param deflection Axial deflection in millimeters.
 * @returns Object containing rate k, load F, shear stress tau, spring index, and Wahl factor.
 */
export function calculateLoadAndStress(
  design: SpringDesign,
  deflection: number,
): {
  k: number;
  load: number;
  shearStress: number;
  springIndex: number;
  wahlFactor: number;
} {
  if (deflection < 0) {
    throw new Error("deflection must be non-negative");
  }

  const springIndex = calculateSpringIndex(design);
  const wahlFactor = calculateWahlFactor(design);
  const k = calculateSpringRate(design);
  const meanDiameter = getMeanDiameter(design);

  const load = k * deflection; // N, assuming linear elastic range.
  const shearStress =
    wahlFactor * ((8 * load * meanDiameter) / (PI * design.wireDiameter ** 3));

  return { k, load, shearStress, springIndex, wahlFactor };
}

/**
 * Generates a simple force-deflection curve with uniform steps.
 *
 * @param params Object containing spring design, maximum deflection, and step size.
 * @returns Array of deflection-load pairs.
 */
export function generateForceDeflectionCurve(params: {
  spring: SpringDesign;
  maxDeflection: number;
  step: number;
}): { deflection: number; load: number }[] {
  const { spring, maxDeflection, step } = params;
  if (maxDeflection <= 0) {
    throw new Error("maxDeflection must be greater than zero");
  }
  if (step <= 0) {
    throw new Error("step must be greater than zero");
  }

  const points: { deflection: number; load: number }[] = [];
  for (let deflection = 0; deflection <= maxDeflection + 1e-9; deflection += step) {
    const { load } = calculateLoadAndStress(spring, deflection);
    points.push({ deflection: Number(deflection.toFixed(6)), load });
  }
  return points;
}

export type VariablePitchSegment = {
  coils: number;
  pitch: number;
};

export type VariablePitchSegmentState = {
  index: number;
  coils: number;
  pitch: number;
  spacing: number;
  capacity: number;
  solidCoils: number;
  status: "free" | "partial" | "solid" | "invalid";
};

export function calculateVariablePitchCompressionAtDeflection(params: {
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils0: number;
  totalCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
  deflection: number;
}): {
  activeCoils: number;
  springRate: number;
  load: number;
  springIndex: number;
  wahlFactor: number;
  shearStress: number;
  deltaMax?: number;
  segmentStates: VariablePitchSegmentState[];
  issues: string[];
} {
  const {
    wireDiameter,
    meanDiameter,
    shearModulus,
    activeCoils0,
    totalCoils,
    freeLength,
    segments,
    deflection,
  } = params;

  const issues: string[] = [];

  if (wireDiameter <= 0) issues.push("Wire diameter must be > 0");
  if (meanDiameter <= 0) issues.push("Mean diameter must be > 0");
  if (shearModulus <= 0) issues.push("Shear modulus must be > 0");
  if (activeCoils0 <= 0) issues.push("Active coils must be > 0");
  if (totalCoils <= 0) issues.push("Total coils must be > 0");
  if (deflection < 0) issues.push("Deflection must be ≥ 0");

  const deltaMax =
    freeLength !== undefined && isFinite(freeLength)
      ? Math.max(0, freeLength - totalCoils * wireDiameter)
      : undefined;

  const cleanSegments = segments
    .map((s) => ({
      coils: Number(s.coils),
      pitch: Number(s.pitch),
    }))
    .filter((s) => isFinite(s.coils) && isFinite(s.pitch) && s.coils > 0);

  const sumCoils = cleanSegments.reduce((acc, s) => acc + s.coils, 0);
  if (sumCoils > activeCoils0 + 1e-6) {
    issues.push("Sum of segment coils exceeds active coils Na0");
  }

  const remainingCoils = Math.max(0, activeCoils0 - sumCoils);
  let effectiveSegments = cleanSegments.slice();

  if (remainingCoils > 1e-6) {
    if (freeLength !== undefined && isFinite(freeLength)) {
      const solidHeight = totalCoils * wireDiameter;
      const usedLen = effectiveSegments.reduce((acc, s) => acc + s.coils * s.pitch, 0);
      const restPitch = (freeLength - solidHeight - usedLen) / remainingCoils;
      if (isFinite(restPitch) && restPitch > 0) {
        effectiveSegments = effectiveSegments.concat({ coils: remainingCoils, pitch: restPitch });
      } else {
        issues.push("Cannot auto-fill remaining coils: free length constraint invalid");
      }
    } else {
      issues.push("Segment coils do not cover Na0 (remaining coils require free length to infer pitch)");
    }
  }

  const segmentStates: VariablePitchSegmentState[] = effectiveSegments.map((s, idx) => {
    const spacing = s.pitch - wireDiameter;
    const capacity = spacing > 0 ? s.coils * spacing : 0;
    return {
      index: idx,
      coils: s.coils,
      pitch: s.pitch,
      spacing,
      capacity,
      solidCoils: 0,
      status: "free",
    };
  });

  let activeCoils = activeCoils0;
  for (const st of segmentStates) {
    if (st.spacing <= 0) {
      st.status = "invalid";
      st.solidCoils = st.coils;
      activeCoils -= st.coils;
      issues.push("One or more segments have pitch ≤ wire diameter (already solid)");
    }
  }
  activeCoils = Math.max(1e-9, activeCoils);

  const validOrder = segmentStates
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s.spacing > 0)
    .sort((a, b) => a.s.pitch - b.s.pitch);

  const A = (shearModulus * wireDiameter ** 4) / (8 * meanDiameter ** 3);
  let remaining = deflection;
  let load = 0;

  for (const { s } of validOrder) {
    if (remaining <= 1e-12) break;

    const naStart = activeCoils;
    const maxDefl = s.capacity;

    if (maxDefl <= 0) continue;

    if (remaining >= maxDefl - 1e-12) {
      const naEnd = Math.max(1e-9, naStart - s.coils);
      load += A * s.spacing * Math.log(naStart / naEnd);
      s.solidCoils = s.coils;
      s.status = "solid";
      activeCoils = naEnd;
      remaining -= maxDefl;
      continue;
    }

    const coilsSolid = remaining / s.spacing;
    const naEnd = Math.max(1e-9, naStart - coilsSolid);
    load += A * s.spacing * Math.log(naStart / naEnd);
    s.solidCoils = coilsSolid;
    s.status = "partial";
    activeCoils = naEnd;
    remaining = 0;
    break;
  }

  for (const { s } of validOrder) {
    if (s.status === "free") {
      s.solidCoils = 0;
    }
  }

  const springIndex = meanDiameter / wireDiameter;
  const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;
  const springRate = A / Math.max(1e-9, activeCoils);
  const shearStress = wahlFactor * ((8 * load * meanDiameter) / (PI * wireDiameter ** 3));

  return {
    activeCoils,
    springRate,
    load,
    springIndex,
    wahlFactor,
    shearStress,
    deltaMax,
    segmentStates,
    issues,
  };
}

export function invertVariablePitchCompressionForce(params: {
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils0: number;
  totalCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
  load: number;
}): {
  deflection: number;
  issues: string[];
} {
  const { load } = params;
  const issues: string[] = [];
  if (load < 0) issues.push("Load must be ≥ 0");
  if (!isFinite(load)) issues.push("Load must be finite");
  if (issues.length) return { deflection: 0, issues };

  let lo = 0;
  let hi = 1;
  let hiRes = calculateVariablePitchCompressionAtDeflection({ ...params, deflection: hi });

  const deltaMax = hiRes.deltaMax;
  if (deltaMax !== undefined && deltaMax > 0) {
    hi = deltaMax;
    hiRes = calculateVariablePitchCompressionAtDeflection({ ...params, deflection: hi });
  } else {
    while (hiRes.load < load && hi < 1e6) {
      hi *= 2;
      hiRes = calculateVariablePitchCompressionAtDeflection({ ...params, deflection: hi });
      if (hiRes.issues.length) break;
    }
  }

  if (hiRes.load < load - 1e-9) {
    issues.push("Target load exceeds curve range");
    return { deflection: hi, issues };
  }

  for (let iter = 0; iter < 60; iter++) {
    const mid = 0.5 * (lo + hi);
    const res = calculateVariablePitchCompressionAtDeflection({ ...params, deflection: mid });
    if (res.load >= load) hi = mid;
    else lo = mid;
    if (Math.abs(hi - lo) <= 1e-6) break;
  }

  return { deflection: hi, issues };
}

export function generateVariablePitchForceDeflectionCurve(params: {
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils0: number;
  totalCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
  maxDeflection: number;
  step: number;
}): {
  deflection: number;
  load: number;
  springRate?: number;
  shearStress?: number;
  activeCoils?: number;
}[] {
  const { maxDeflection, step } = params;
  if (maxDeflection <= 0 || step <= 0) return [];

  const points: {
    deflection: number;
    load: number;
    springRate?: number;
    shearStress?: number;
    activeCoils?: number;
  }[] = [];
  for (let deflection = 0; deflection <= maxDeflection + 1e-9; deflection += step) {
    const res = calculateVariablePitchCompressionAtDeflection({
      ...params,
      deflection,
    });
    points.push({
      deflection: Number(deflection.toFixed(6)),
      load: res.load,
      springRate: res.springRate,
      shearStress: res.shearStress,
      activeCoils: res.activeCoils,
    });
  }
  return points;
}

/**
 * Calculates spring rate, load, and stress for an extension spring.
 * Uses the same helical spring formula as compression springs for the body coils.
 * Total load = initial tension + k * deflection.
 *
 * @param input Extension spring parameters.
 * @returns Object containing calculated values.
 */
export function calculateExtensionSpring(input: ExtensionSpringInput): {
  meanDiameter: number;
  springIndex: number;
  wahlFactor: number;
  springRate: number;
  initialTension: number;
  workingDeflection: number;
  elasticLoad: number;
  totalLoad: number;
  shearStress: number;
} {
  const {
    outerDiameter,
    wireDiameter,
    activeCoils,
    shearModulus,
    initialTension = 0,
    workingDeflection,
  } = input;

  // Validate inputs
  if (wireDiameter <= 0) {
    throw new Error("Wire diameter must be greater than zero");
  }
  if (outerDiameter <= wireDiameter) {
    throw new Error("Outer diameter must be greater than wire diameter");
  }
  if (activeCoils <= 0) {
    throw new Error("Active coils must be greater than zero");
  }
  if (shearModulus <= 0) {
    throw new Error("Shear modulus must be greater than zero");
  }
  if (workingDeflection < 0) {
    throw new Error("Working deflection must be non-negative");
  }
  if (initialTension < 0) {
    throw new Error("Initial tension must be non-negative");
  }

  // Calculate mean diameter: Dm = OD - d
  const meanDiameter = outerDiameter - wireDiameter;

  // Calculate spring index C = Dm / d
  const springIndex = meanDiameter / wireDiameter;

  // Calculate Wahl factor
  const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;

  // Calculate spring rate k = (G * d^4) / (8 * Dm^3 * Na)
  const springRate = (shearModulus * Math.pow(wireDiameter, 4)) /
    (8 * Math.pow(meanDiameter, 3) * activeCoils);

  // Calculate loads
  const elasticLoad = springRate * workingDeflection;
  const totalLoad = initialTension + elasticLoad;

  // Calculate shear stress using total load
  // τ = Kw * (8 * F * Dm) / (π * d³)
  const shearStress = wahlFactor * (8 * totalLoad * meanDiameter) /
    (PI * Math.pow(wireDiameter, 3));

  return {
    meanDiameter,
    springIndex,
    wahlFactor,
    springRate,
    initialTension,
    workingDeflection,
    elasticLoad,
    totalLoad,
    shearStress,
  };
}

/**
 * Input parameters for conical spring nonlinear analysis.
 */
export interface ConicalSpringNonlinearInput {
  wireDiameter: number;        // d, mm
  largeOuterDiameter: number;  // D1_out, large end outer diameter, mm
  smallOuterDiameter: number;  // D2_out, small end outer diameter, mm
  activeCoils: number;         // Na
  shearModulus: number;        // G, MPa
  freeLength: number;          // L0, free length, mm
  maxDeflection: number;       // Maximum deflection to analyze, mm
  samplePoints?: number;       // Number of curve sample points, default 50
}

/**
 * A single point on the conical spring nonlinear force-deflection curve.
 */
export interface ConicalNonlinearCurvePoint {
  x: number;            // Current deflection (mm)
  k: number;            // Current segment stiffness (N/mm)
  load: number;         // Current load (N)
  activeCoils: number;  // Coils still participating in deformation
  collapsedCoils: number; // Number of coils that have bottomed out
}

/**
 * Result of conical spring nonlinear analysis.
 */
export interface ConicalNonlinearResult {
  curve: ConicalNonlinearCurvePoint[];
  solidHeight: number;           // H_solid = Na * d
  totalDeflectionCapacity: number; // X_total = L0 - H_solid
  pitch: number;                 // Deflection per coil collapse
  exceededSolidHeight: boolean;  // True if maxDeflection > X_total
  clampedMaxDeflection: number;  // Actual max deflection used (clamped to X_total)
}

/**
 * Calculates the nonlinear force-deflection curve for a conical compression spring.
 * 
 * Conical springs exhibit nonlinear behavior because as the spring compresses,
 * the larger coils bottom out first (telescope), reducing the effective number
 * of active coils and increasing the instantaneous stiffness.
 * 
 * The pitch calculation is based on free length L0:
 * - Solid height H_solid = Na * d
 * - Total deflection capacity X_total = L0 - H_solid
 * - Pitch per coil = X_total / Na
 * 
 * @param input Conical spring parameters
 * @returns Result object containing curve points and metadata
 */
export function calculateConicalSpringNonlinear(
  input: ConicalSpringNonlinearInput
): ConicalNonlinearResult {
  const {
    wireDiameter: d,
    largeOuterDiameter: D1_out,
    smallOuterDiameter: D2_out,
    activeCoils: n0,
    shearModulus: G,
    freeLength: L0,
    maxDeflection: maxX,
    samplePoints = 50,
  } = input;

  // Validate inputs
  if (d <= 0) throw new Error("Wire diameter must be greater than zero");
  if (D1_out <= d) throw new Error("Large outer diameter must be greater than wire diameter");
  if (D2_out <= d) throw new Error("Small outer diameter must be greater than wire diameter");
  if (D1_out <= D2_out) throw new Error("Large diameter must be greater than small diameter");
  if (n0 <= 0) throw new Error("Active coils must be greater than zero");
  if (n0 < 2) throw new Error("Active coils must be at least 2 for nonlinear analysis");
  if (G <= 0) throw new Error("Shear modulus must be greater than zero");
  if (L0 <= 0) throw new Error("Free length must be greater than zero");
  if (maxX < 0) throw new Error("Max deflection must be non-negative");

  // Calculate mean diameters at each end
  const D1 = D1_out - d; // Large end mean diameter
  const D2 = D2_out - d; // Small end mean diameter

  // Calculate solid height: H_solid = Na * d
  const solidHeight = n0 * d;
  
  // Total deflection capacity: X_total = L0 - H_solid
  const totalDeflectionCapacity = L0 - solidHeight;
  
  if (totalDeflectionCapacity <= 0) {
    throw new Error(
      `Free length is too short compared to solid height. ` +
      `L0=${L0}mm, H_solid=${solidHeight.toFixed(2)}mm (Na×d=${n0}×${d}). ` +
      `自由长度过短，无法压缩。`
    );
  }

  // Pitch per coil: deflection needed to collapse one coil
  // Using Na for equal pitch distribution
  const pitch = totalDeflectionCapacity / n0;

  // Check if maxDeflection exceeds total capacity
  const exceededSolidHeight = maxX > totalDeflectionCapacity;
  
  // Clamp maxX to not exceed total deflection capacity
  const effectiveMaxX = Math.min(maxX, totalDeflectionCapacity);

  const curvePoints: ConicalNonlinearCurvePoint[] = [];
  let cumulativeLoad = 0;
  let prevCollapsed = 0;
  let prevX = 0;

  // Sample the deflection range
  for (let i = 0; i <= samplePoints; i++) {
    const x = effectiveMaxX * (i / samplePoints);

    // Determine how many coils have collapsed (bottomed out)
    // Larger coils collapse first in a conical spring
    let collapsed = Math.floor(x / pitch);
    collapsed = Math.min(collapsed, n0 - 1); // At least 1 coil must remain active

    // Effective number of active coils
    const n_eff = n0 - collapsed;

    // Calculate instantaneous stiffness for current active coils
    // Using conical spring formula: k = G * d^4 / (2 * n * (D1 + D2) * (D1^2 + D2^2))
    // For progressive collapse, we interpolate the diameters based on which coils remain
    
    // As coils collapse, the remaining coils have smaller average diameter
    // Linear interpolation of mean diameters for remaining coils
    const collapseRatio = collapsed / n0;
    const D1_eff = D1 - (D1 - D2) * collapseRatio; // Effective large diameter shrinks
    const D2_eff = D2; // Small end stays the same
    
    // Conical spring stiffness formula
    const k = (G * Math.pow(d, 4)) / 
      (2 * n_eff * (D1_eff + D2_eff) * (Math.pow(D1_eff, 2) + Math.pow(D2_eff, 2)));

    // Calculate load using piecewise linear approximation
    if (i > 0) {
      const deltaX = x - prevX;
      cumulativeLoad += k * deltaX;
    }

    curvePoints.push({
      x: Number(x.toFixed(3)),
      k: Number(k.toFixed(4)),
      load: Number(cumulativeLoad.toFixed(3)),
      activeCoils: n_eff,
      collapsedCoils: collapsed,
    });

    prevCollapsed = collapsed;
    prevX = x;
  }

  return {
    curve: curvePoints,
    solidHeight,
    totalDeflectionCapacity,
    pitch,
    exceededSolidHeight,
    clampedMaxDeflection: effectiveMaxX,
  };
}

/**
 * Extracts the stage transition points from a nonlinear curve.
 * These are the points where coils collapse and stiffness changes.
 */
export function extractConicalStageTransitions(
  curve: ConicalNonlinearCurvePoint[]
): { stage: number; deflection: number; activeCoils: number; stiffness: number }[] {
  const stages: { stage: number; deflection: number; activeCoils: number; stiffness: number }[] = [];
  let prevCollapsed = -1;
  let stageNum = 0;

  for (const point of curve) {
    if (point.collapsedCoils !== prevCollapsed) {
      stages.push({
        stage: stageNum,
        deflection: point.x,
        activeCoils: point.activeCoils,
        stiffness: point.k,
      });
      prevCollapsed = point.collapsedCoils;
      stageNum++;
    }
  }

  return stages;
}

/**
 * Demo helper to ensure formulas run without throwing at runtime.
 * Useful for quick manual verification until a full test harness is added.
 */
export function runSpringMathDemo() {
  const sampleSpring: SpringDesign = {
    type: "compression",
    wireDiameter: 3.2,
    meanDiameter: 24,
    activeCoils: 8,
    shearModulus: 79000,
  };

  const response = calculateLoadAndStress(sampleSpring, 5);
  const curve = generateForceDeflectionCurve({
    spring: sampleSpring,
    maxDeflection: 10,
    step: 2.5,
  });

  return { response, curve };
}

// ============================================================================
// STRESS CORRECTION, SAFETY FACTOR, AND FATIGUE LIFE CALCULATIONS
// 应力修正、安全系数和疲劳寿命计算
// ============================================================================

/**
 * Parameters for stress correction calculation
 * 应力修正计算参数
 */
export interface StressCorrectionParams {
  /** Nominal shear stress (before corrections), MPa */
  tauNominal: number;
  /** Wahl curvature correction factor K_w */
  wahlFactor: number;
  /** Surface roughness factor K_surface (default 1.0) */
  surfaceFactor?: number;
  /** Size factor K_size (default 1.0) */
  sizeFactor?: number;
  /** Temperature factor K_temp (default 1.0) */
  tempFactor?: number;
}

/**
 * Result of stress correction calculation
 * 应力修正计算结果
 */
export interface StressCorrectionResult {
  /** Original nominal stress, MPa */
  tauNominal: number;
  /** Effective stress after all corrections, MPa */
  tauEffective: number;
  /** Total correction factor K_total */
  kTotal: number;
  /** Individual factors breakdown */
  factors: {
    wahl: number;
    surface: number;
    size: number;
    temp: number;
  };
}

/**
 * Apply stress correction factors to nominal shear stress
 * 对名义剪应力应用修正系数
 * 
 * τ_effective = τ_nominal × K_w × K_surface × K_size × K_temp
 * 
 * @param params Stress correction parameters
 * @returns Corrected stress result
 */
export function applyStressCorrections(params: StressCorrectionParams): StressCorrectionResult {
  const { 
    tauNominal, 
    wahlFactor, 
    surfaceFactor = 1.0, 
    sizeFactor = 1.0, 
    tempFactor = 1.0 
  } = params;

  const kTotal = wahlFactor * surfaceFactor * sizeFactor * tempFactor;
  const tauEffective = tauNominal * kTotal;

  return {
    tauNominal,
    tauEffective,
    kTotal,
    factors: {
      wahl: wahlFactor,
      surface: surfaceFactor,
      size: sizeFactor,
      temp: tempFactor,
    },
  };
}

/**
 * Static safety factor result
 * 静态安全系数结果
 */
export interface SafetyFactorResult {
  materialId: SpringMaterialId;
  /** Effective shear stress, MPa */
  tauEffective: number;
  /** Allowable static shear stress, MPa */
  tauAllowStatic: number;
  /** Static safety factor SF = τ_allow / τ_effective */
  sfStatic: number;
  /** Safety status */
  status: "safe" | "warning" | "danger";
  /** Status description */
  statusText: {
    en: string;
    zh: string;
  };
}

/**
 * Calculate static safety factor
 * 计算静态安全系数
 * 
 * SF = τ_allow_static / τ_effective
 * 
 * @param params Material ID and effective stress
 * @returns Safety factor result with status
 */
export function calculateSafetyFactorStatic(params: {
  materialId: SpringMaterialId;
  tauEffective: number;
}): SafetyFactorResult {
  const material = getSpringMaterial(params.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${params.materialId}`);
  }

  const tauAllow = material.allowShearStatic;
  const sf = tauAllow / params.tauEffective;

  let status: SafetyFactorResult["status"];
  let statusText: SafetyFactorResult["statusText"];

  if (sf >= 1.5) {
    status = "safe";
    statusText = { en: "Safe (SF ≥ 1.5)", zh: "安全 (SF ≥ 1.5)" };
  } else if (sf >= 1.1) {
    status = "warning";
    statusText = { en: "Marginal (1.1 ≤ SF < 1.5)", zh: "临界 (1.1 ≤ SF < 1.5)" };
  } else {
    status = "danger";
    statusText = { en: "Unsafe (SF < 1.1)", zh: "不安全 (SF < 1.1)" };
  }

  return {
    materialId: material.id,
    tauEffective: params.tauEffective,
    tauAllowStatic: tauAllow,
    sfStatic: sf,
    status,
    statusText,
  };
}

/**
 * Fatigue life estimation result
 * 疲劳寿命估算结果
 */
export interface FatigueLifeResult {
  materialId: SpringMaterialId;
  /** Mean stress, MPa */
  tauMean: number;
  /** Alternating stress amplitude, MPa */
  tauAlt: number;
  /** Estimated fatigue life in cycles */
  estimatedCycles: number;
  /** Safety factor relative to infinite life (N2) */
  sfInfiniteLife: number;
  /** Life rating */
  rating: "infinite" | "high" | "medium" | "low" | "very_low";
  /** Rating description */
  ratingText: {
    en: string;
    zh: string;
  };
}

/**
 * Estimate fatigue life using Basquin equation with simplified Goodman correction
 * 使用 Basquin 方程和简化 Goodman 修正估算疲劳寿命
 * 
 * Basquin equation: log(N) = A - m × log(τ_alt)
 * where A and m are derived from S-N curve data points
 * 
 * @param params Material ID and stress range
 * @returns Fatigue life estimation result
 */
export function estimateFatigueLife(params: {
  materialId: SpringMaterialId;
  /** Maximum effective shear stress (with corrections), MPa */
  tauMax: number;
  /** Minimum effective shear stress (with corrections), MPa */
  tauMin: number;
}): FatigueLifeResult {
  const material = getSpringMaterial(params.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${params.materialId}`);
  }

  // Calculate mean and alternating stress
  const tauMean = (params.tauMax + params.tauMin) / 2;
  const tauAlt = (params.tauMax - params.tauMin) / 2;

  // Get S-N curve data
  const { N1, tau1, N2, tau2 } = material.snCurve;

  // Basquin equation: log(N) = A - m × log(τ)
  // Using two points: (N1, tau1) and (N2, tau2)
  // m = (log(N1) - log(N2)) / (log(tau2) - log(tau1))
  // A = log(N1) + m × log(tau1)
  
  const logN1 = Math.log10(N1);
  const logN2 = Math.log10(N2);
  const logTau1 = Math.log10(tau1);
  const logTau2 = Math.log10(tau2);

  const m = (logN1 - logN2) / (logTau2 - logTau1);
  const A = logN1 + m * logTau1;

  // Apply simplified Goodman correction for mean stress effect
  // τ_alt_eff = τ_alt / (1 - τ_mean / τ_uts)
  const tauUts = material.tensileStrength ?? material.allowShearStatic * 2;
  const meanStressRatio = Math.min(tauMean / tauUts, 0.9); // Cap at 0.9 to avoid division issues
  const tauAltEffective = tauAlt / (1 - meanStressRatio);

  // Calculate estimated cycles
  let estimatedCycles: number;
  if (tauAltEffective <= 0) {
    estimatedCycles = Infinity;
  } else if (tauAltEffective >= tau1) {
    // Very high stress, extrapolate below N1
    const logN = A - m * Math.log10(tauAltEffective);
    estimatedCycles = Math.max(Math.pow(10, logN), 100);
  } else if (tauAltEffective <= tau2) {
    // Below endurance limit, infinite life
    estimatedCycles = Infinity;
  } else {
    // Interpolate on S-N curve
    const logN = A - m * Math.log10(tauAltEffective);
    estimatedCycles = Math.pow(10, logN);
  }

  // Safety factor for infinite life (relative to tau2 at N2)
  const sfInfiniteLife = tau2 / (tauAltEffective || 1);

  // Determine rating
  let rating: FatigueLifeResult["rating"];
  let ratingText: FatigueLifeResult["ratingText"];

  if (estimatedCycles >= 1e7 || !isFinite(estimatedCycles)) {
    rating = "infinite";
    ratingText = { en: "Infinite Life (N ≥ 10⁷)", zh: "无限寿命 (N ≥ 10⁷)" };
  } else if (estimatedCycles >= 1e6) {
    rating = "high";
    ratingText = { en: "High Cycle (10⁶ ≤ N < 10⁷)", zh: "高周疲劳 (10⁶ ≤ N < 10⁷)" };
  } else if (estimatedCycles >= 1e5) {
    rating = "medium";
    ratingText = { en: "Medium Cycle (10⁵ ≤ N < 10⁶)", zh: "中周疲劳 (10⁵ ≤ N < 10⁶)" };
  } else if (estimatedCycles >= 1e4) {
    rating = "low";
    ratingText = { en: "Low Cycle (10⁴ ≤ N < 10⁵)", zh: "低周疲劳 (10⁴ ≤ N < 10⁵)" };
  } else {
    rating = "very_low";
    ratingText = { en: "Very Low Cycle (N < 10⁴)", zh: "极低周疲劳 (N < 10⁴)" };
  }

  return {
    materialId: material.id,
    tauMean,
    tauAlt,
    estimatedCycles: isFinite(estimatedCycles) ? Math.round(estimatedCycles) : Infinity,
    sfInfiniteLife,
    rating,
    ratingText,
  };
}

/**
 * Preload calculation result
 * 预紧计算结果
 */
export interface PreloadResult {
  /** Preload deflection, mm */
  preloadDeflection: number;
  /** Preload force, N */
  preloadForce: number;
  /** Working force at specified deflection, N */
  workingForce: number;
  /** Preload ratio (F0 / F_work) */
  preloadRatio: number;
}

/**
 * Calculate preload (initial compression/tension)
 * 计算预紧（初压缩/初拉力）
 * 
 * @param params Spring rate, preload deflection, and working deflection
 * @returns Preload calculation result
 */
export function calculatePreload(params: {
  /** Spring rate, N/mm */
  springRate: number;
  /** Preload deflection x0, mm */
  preloadDeflection: number;
  /** Working deflection, mm */
  workingDeflection: number;
}): PreloadResult {
  const { springRate, preloadDeflection, workingDeflection } = params;

  const preloadForce = springRate * preloadDeflection;
  const workingForce = springRate * workingDeflection;
  const preloadRatio = workingForce > 0 ? preloadForce / workingForce : 0;

  return {
    preloadDeflection,
    preloadForce,
    workingForce,
    preloadRatio,
  };
}

/**
 * Combined stress analysis result
 * 综合应力分析结果
 */
export interface StressAnalysisResult {
  /** Stress correction result */
  stressCorrection: StressCorrectionResult;
  /** Static safety factor result */
  safetyFactor: SafetyFactorResult;
  /** Fatigue life result (if min/max stress provided) */
  fatigueLife?: FatigueLifeResult;
}

/**
 * Perform complete stress analysis
 * 执行完整应力分析
 * 
 * @param params Analysis parameters
 * @returns Combined stress analysis result
 */
export function performStressAnalysis(params: {
  materialId: SpringMaterialId;
  tauNominal: number;
  wahlFactor: number;
  surfaceFactor?: number;
  sizeFactor?: number;
  tempFactor?: number;
  /** For fatigue analysis: minimum stress ratio (τ_min / τ_max) */
  stressRatio?: number;
}): StressAnalysisResult {
  const {
    materialId,
    tauNominal,
    wahlFactor,
    surfaceFactor,
    sizeFactor,
    tempFactor,
    stressRatio,
  } = params;

  // Apply stress corrections
  const stressCorrection = applyStressCorrections({
    tauNominal,
    wahlFactor,
    surfaceFactor,
    sizeFactor,
    tempFactor,
  });

  // Calculate static safety factor
  const safetyFactor = calculateSafetyFactorStatic({
    materialId,
    tauEffective: stressCorrection.tauEffective,
  });

  // Calculate fatigue life if stress ratio provided
  let fatigueLife: FatigueLifeResult | undefined;
  if (stressRatio !== undefined && stressRatio >= 0 && stressRatio < 1) {
    const tauMax = stressCorrection.tauEffective;
    const tauMin = tauMax * stressRatio;
    fatigueLife = estimateFatigueLife({
      materialId,
      tauMax,
      tauMin,
    });
  }

  return {
    stressCorrection,
    safetyFactor,
    fatigueLife,
  };
}

