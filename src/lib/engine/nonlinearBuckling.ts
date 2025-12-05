/**
 * Spring Analysis Engine - Nonlinear Buckling Model
 * 弹簧分析引擎 - 非线性屈曲模型
 * 
 * Models stiffness loss as coils collapse and dynamic buckling criteria
 * k_eff(z) = k0 * (1 + β * (#bottomed_coils))
 */

import type { CompressionSpringGeometry } from './types';

/**
 * Nonlinear buckling result
 */
export interface NonlinearBucklingResult {
  /** Current deflection (mm) */
  deflection: number;
  /** Effective stiffness at this deflection (N/mm) */
  effectiveStiffness: number;
  /** Stiffness reduction factor */
  stiffnessReductionFactor: number;
  /** Number of bottomed coils */
  bottomedCoils: number;
  /** Coil collapse percentage */
  collapsePercentage: number;
  /** Effective slenderness ratio */
  effectiveSlenderness: number;
  /** Critical buckling load at this deflection (N) */
  criticalBucklingLoad: number;
  /** Working load (N) */
  workingLoad: number;
  /** Buckling safety factor */
  bucklingSafetyFactor: number;
  /** Is buckling imminent */
  isBucklingRisk: boolean;
  /** Risk level */
  riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
}

/**
 * Buckling curve point
 */
export interface BucklingCurvePoint {
  deflection: number;
  criticalLoad: number;
  workingLoad: number;
  safetyFactor: number;
  effectiveStiffness: number;
  collapsePercentage: number;
}

/**
 * End condition factors for buckling
 */
export const END_CONDITION_FACTORS: Record<string, number> = {
  'fixed-fixed': 0.5,
  'fixed-hinged': 0.707,
  'hinged-hinged': 1.0,
  'fixed-free': 2.0,
};

/**
 * Calculate number of bottomed coils at given deflection
 */
export function calculateBottomedCoils(
  deflection: number,
  freeLength: number,
  solidHeight: number,
  activeCoils: number,
  wireDiameter: number
): number {
  const currentLength = freeLength - deflection;
  const availableSpace = currentLength - solidHeight;
  
  if (availableSpace <= 0) {
    return activeCoils; // All coils bottomed
  }
  
  // Progressive coil bottoming model
  const normalPitch = (freeLength - solidHeight) / activeCoils;
  const currentPitch = availableSpace / activeCoils;
  
  // Coils start bottoming when pitch approaches wire diameter
  if (currentPitch > wireDiameter * 1.1) {
    return 0;
  }
  
  // Linear interpolation of bottomed coils
  const bottomingRatio = 1 - (currentPitch - wireDiameter) / (normalPitch - wireDiameter);
  return Math.max(0, Math.min(activeCoils, bottomingRatio * activeCoils));
}

/**
 * Calculate effective stiffness with nonlinear correction
 * k_eff(z) = k0 * (1 + β * (#bottomed_coils))
 */
export function calculateEffectiveStiffness(
  baseStiffness: number,
  bottomedCoils: number,
  activeCoils: number,
  beta: number = 0.15 // Stiffness increase per bottomed coil
): number {
  // As coils bottom, effective stiffness increases (fewer active coils)
  const effectiveActiveCoils = Math.max(1, activeCoils - bottomedCoils);
  const stiffnessRatio = activeCoils / effectiveActiveCoils;
  
  // Additional hardening from coil contact
  const contactHardening = 1 + beta * bottomedCoils;
  
  return baseStiffness * stiffnessRatio * contactHardening;
}

/**
 * Calculate effective slenderness ratio
 * λ_eff = L(z) / Dm
 */
export function calculateEffectiveSlenderness(
  currentLength: number,
  meanDiameter: number
): number {
  return currentLength / meanDiameter;
}

/**
 * Calculate critical buckling load using Johnson-Euler formula
 */
export function calculateCriticalBucklingLoad(
  effectiveSlenderness: number,
  meanDiameter: number,
  wireDiameter: number,
  shearModulus: number,
  activeCoils: number,
  endConditionFactor: number = 1.0
): number {
  // Spring constant
  const k = (shearModulus * Math.pow(wireDiameter, 4)) / 
            (8 * Math.pow(meanDiameter, 3) * activeCoils);
  
  // Critical slenderness ratio
  const lambdaCritical = Math.PI * Math.sqrt(2);
  
  // Euler buckling load
  const L_eff = effectiveSlenderness * meanDiameter * endConditionFactor;
  const I = Math.PI * Math.pow(meanDiameter, 4) / 64; // Approximate moment of inertia
  const E_eq = shearModulus / 2.6; // Equivalent modulus
  
  const P_euler = (Math.PI * Math.PI * E_eq * I) / (L_eff * L_eff);
  
  // Johnson parabolic formula for intermediate slenderness
  if (effectiveSlenderness < lambdaCritical * 2) {
    // Use spring rate based critical load
    const P_spring = k * L_eff * 0.5;
    return Math.min(P_euler, P_spring);
  }
  
  return P_euler;
}

/**
 * Calculate nonlinear buckling at given deflection
 */
export function calculateNonlinearBuckling(
  geometry: CompressionSpringGeometry,
  baseStiffness: number,
  deflection: number,
  shearModulus: number,
  endCondition: string = 'fixed-hinged'
): NonlinearBucklingResult {
  const { wireDiameter, meanDiameter, activeCoils, freeLength } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  const solidHeight = totalCoils * wireDiameter;
  
  // Calculate bottomed coils
  const bottomedCoils = calculateBottomedCoils(
    deflection, freeLength, solidHeight, activeCoils, wireDiameter
  );
  
  // Calculate effective stiffness
  const effectiveStiffness = calculateEffectiveStiffness(
    baseStiffness, bottomedCoils, activeCoils
  );
  
  // Stiffness reduction factor (inverse - higher means stiffer)
  const stiffnessReductionFactor = effectiveStiffness / baseStiffness;
  
  // Coil collapse percentage
  const collapsePercentage = (bottomedCoils / activeCoils) * 100;
  
  // Current length and effective slenderness
  const currentLength = freeLength - deflection;
  const effectiveSlenderness = calculateEffectiveSlenderness(currentLength, meanDiameter);
  
  // End condition factor
  const endConditionFactor = END_CONDITION_FACTORS[endCondition] ?? 1.0;
  
  // Critical buckling load
  const criticalBucklingLoad = calculateCriticalBucklingLoad(
    effectiveSlenderness,
    meanDiameter,
    wireDiameter,
    shearModulus,
    activeCoils - bottomedCoils,
    endConditionFactor
  );
  
  // Working load
  const workingLoad = effectiveStiffness * deflection;
  
  // Buckling safety factor
  const bucklingSafetyFactor = criticalBucklingLoad / Math.max(workingLoad, 0.1);
  
  // Determine risk
  const isBucklingRisk = workingLoad > criticalBucklingLoad;
  
  let riskLevel: NonlinearBucklingResult['riskLevel'];
  if (isBucklingRisk) {
    riskLevel = 'critical';
  } else if (bucklingSafetyFactor < 1.5) {
    riskLevel = 'danger';
  } else if (bucklingSafetyFactor < 2.5) {
    riskLevel = 'warning';
  } else {
    riskLevel = 'safe';
  }
  
  return {
    deflection,
    effectiveStiffness,
    stiffnessReductionFactor,
    bottomedCoils,
    collapsePercentage,
    effectiveSlenderness,
    criticalBucklingLoad,
    workingLoad,
    bucklingSafetyFactor,
    isBucklingRisk,
    riskLevel,
  };
}

/**
 * Generate buckling curve vs deflection
 */
export function generateBucklingCurve(
  geometry: CompressionSpringGeometry,
  baseStiffness: number,
  shearModulus: number,
  maxDeflection: number,
  endCondition: string = 'fixed-hinged',
  numPoints: number = 50
): BucklingCurvePoint[] {
  const points: BucklingCurvePoint[] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const deflection = (maxDeflection * i) / numPoints;
    const result = calculateNonlinearBuckling(
      geometry, baseStiffness, deflection, shearModulus, endCondition
    );
    
    points.push({
      deflection,
      criticalLoad: result.criticalBucklingLoad,
      workingLoad: result.workingLoad,
      safetyFactor: result.bucklingSafetyFactor,
      effectiveStiffness: result.effectiveStiffness,
      collapsePercentage: result.collapsePercentage,
    });
  }
  
  return points;
}

/**
 * Find critical deflection where buckling occurs
 */
export function findCriticalDeflection(
  geometry: CompressionSpringGeometry,
  baseStiffness: number,
  shearModulus: number,
  endCondition: string = 'fixed-hinged'
): {
  criticalDeflection: number;
  criticalLoad: number;
  safeDeflection: number;
} {
  const { freeLength, wireDiameter, activeCoils } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  const solidHeight = totalCoils * wireDiameter;
  const maxDeflection = freeLength - solidHeight;
  
  let criticalDeflection = maxDeflection;
  let criticalLoad = 0;
  
  // Binary search for critical point
  let low = 0;
  let high = maxDeflection;
  
  for (let iter = 0; iter < 50; iter++) {
    const mid = (low + high) / 2;
    const result = calculateNonlinearBuckling(
      geometry, baseStiffness, mid, shearModulus, endCondition
    );
    
    if (result.isBucklingRisk) {
      criticalDeflection = mid;
      criticalLoad = result.workingLoad;
      high = mid;
    } else {
      low = mid;
    }
    
    if (high - low < 0.01) break;
  }
  
  // Safe deflection is 80% of critical
  const safeDeflection = criticalDeflection * 0.8;
  
  return {
    criticalDeflection,
    criticalLoad,
    safeDeflection,
  };
}
