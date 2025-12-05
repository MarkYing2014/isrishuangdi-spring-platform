/**
 * Coiling Process Simulator - Phase 6
 * 绕簧工艺仿真器
 * 
 * Models residual stresses induced during wire coiling on CNC spring forming machines
 */

import type { SpringMaterialId } from '@/lib/materials/springMaterials';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

/**
 * Coiling process parameters
 */
export interface CoilingProcessParams {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mandrel diameter for coiling (mm) */
  mandrelDiameter: number;
  /** Feed rate (mm/s) */
  feedRate: number;
  /** Pitch cam angle (degrees) */
  pitchCamAngle: number;
  /** Material ID */
  materialId: SpringMaterialId;
  /** Target mean diameter (mm) */
  targetMeanDiameter: number;
  /** Target pitch (mm) */
  targetPitch: number;
}

/**
 * Coiling process result
 */
export interface CoilingProcessResult {
  /** Residual bending stress from coiling (MPa) */
  residualBendingStress: number;
  /** Residual torsional stress (MPa) */
  residualTorsionalStress: number;
  /** Total residual stress (MPa) */
  totalResidualStress: number;
  /** Bending radius during coiling (mm) */
  bendingRadius: number;
  /** Springback angle (degrees) */
  springbackAngle: number;
  /** Compensated mandrel diameter (mm) */
  compensatedMandrelDiameter: number;
  /** Compensated pitch setting (mm) */
  compensatedPitch: number;
  /** Stress distribution along wire cross-section */
  stressDistribution: {
    position: number; // -1 to 1 (inner to outer)
    stress: number;   // MPa
  }[];
  /** Impact on fatigue life factor */
  fatigueLifeReductionFactor: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Default coiling parameters for different wire sizes
 */
export const DEFAULT_COILING_PARAMS: Record<string, Partial<CoilingProcessParams>> = {
  small: { // d < 2mm
    feedRate: 50,
    pitchCamAngle: 15,
  },
  medium: { // 2mm <= d < 6mm
    feedRate: 30,
    pitchCamAngle: 20,
  },
  large: { // d >= 6mm
    feedRate: 15,
    pitchCamAngle: 25,
  },
};

/**
 * Calculate residual bending stress from elastic bending formulation
 * σ_residual = E * d / (2 * Rm)
 */
export function calculateResidualBendingStress(
  wireDiameter: number,
  bendingRadius: number,
  elasticModulus: number
): number {
  if (bendingRadius <= 0) return 0;
  return (elasticModulus * wireDiameter) / (2 * bendingRadius);
}

/**
 * Calculate springback angle based on material properties
 * Springback occurs when elastic strain recovers after forming
 */
export function calculateSpringbackAngle(
  wireDiameter: number,
  bendingRadius: number,
  yieldStrength: number,
  elasticModulus: number
): number {
  // Springback ratio K = 1 - (3*Sy*Rm)/(E*d) + (Sy*Rm)^3/(E*d)^3
  const ratio = (yieldStrength * bendingRadius) / (elasticModulus * wireDiameter);
  const K = 1 - 3 * ratio + Math.pow(ratio, 3);
  
  // Springback angle in degrees
  const springbackAngle = (1 - K) * 360 / (2 * Math.PI);
  return Math.max(0, springbackAngle);
}

/**
 * Calculate compensated mandrel diameter to achieve target mean diameter
 */
export function calculateCompensatedMandrelDiameter(
  targetMeanDiameter: number,
  wireDiameter: number,
  springbackAngle: number,
  elasticModulus: number,
  yieldStrength: number
): number {
  // Compensation factor based on springback
  const springbackFactor = 1 + springbackAngle / 360;
  
  // Compensated mandrel diameter
  const compensatedDm = (targetMeanDiameter - wireDiameter) / springbackFactor;
  
  return Math.max(wireDiameter * 2, compensatedDm);
}

/**
 * Calculate stress distribution across wire cross-section during coiling
 */
export function calculateCoilingStressDistribution(
  wireDiameter: number,
  bendingRadius: number,
  elasticModulus: number,
  yieldStrength: number,
  numPoints: number = 21
): { position: number; stress: number }[] {
  const distribution: { position: number; stress: number }[] = [];
  
  for (let i = 0; i < numPoints; i++) {
    const position = -1 + (2 * i) / (numPoints - 1); // -1 to 1
    const y = position * wireDiameter / 2; // Distance from neutral axis
    
    // Elastic bending stress: σ = E * y / Rm
    let stress = (elasticModulus * y) / bendingRadius;
    
    // Cap at yield strength (plastic region)
    if (Math.abs(stress) > yieldStrength) {
      stress = Math.sign(stress) * yieldStrength;
    }
    
    distribution.push({ position, stress });
  }
  
  return distribution;
}

/**
 * Calculate fatigue life reduction factor due to residual stress
 */
export function calculateFatigueLifeReductionFactor(
  residualStress: number,
  ultimateStrength: number,
  enduranceLimit: number
): number {
  // Using modified Goodman relation
  // Residual tensile stress reduces fatigue life
  if (residualStress <= 0) {
    // Compressive residual stress improves fatigue life
    return 1 + Math.abs(residualStress) / (2 * enduranceLimit);
  }
  
  // Tensile residual stress reduces fatigue life
  const factor = 1 - residualStress / ultimateStrength;
  return Math.max(0.1, factor);
}

/**
 * Main coiling process simulation
 */
export function simulateCoilingProcess(params: CoilingProcessParams): CoilingProcessResult {
  const {
    wireDiameter,
    mandrelDiameter,
    feedRate,
    pitchCamAngle,
    materialId,
    targetMeanDiameter,
    targetPitch,
  } = params;

  // Get material properties
  const material = getSpringMaterial(materialId);
  const E = material?.elasticModulus ?? 206000; // MPa
  const Sy = material?.allowShearStatic ? material.allowShearStatic * 1.5 : 1400; // Approximate yield
  const Su = material?.tensileStrength ?? 1800; // MPa
  const Se = material?.snCurve?.tau2 ?? 500; // MPa

  // Calculate bending radius (mandrel radius + wire radius)
  const bendingRadius = mandrelDiameter / 2 + wireDiameter / 2;

  // Calculate residual bending stress
  const residualBendingStress = calculateResidualBendingStress(
    wireDiameter,
    bendingRadius,
    E
  );

  // Calculate residual torsional stress from pitch forming
  // Approximation based on pitch angle and feed rate
  const pitchAngleRad = (pitchCamAngle * Math.PI) / 180;
  const residualTorsionalStress = 0.1 * residualBendingStress * Math.tan(pitchAngleRad);

  // Total residual stress (von Mises combination)
  const totalResidualStress = Math.sqrt(
    Math.pow(residualBendingStress, 2) + 3 * Math.pow(residualTorsionalStress, 2)
  );

  // Calculate springback
  const springbackAngle = calculateSpringbackAngle(wireDiameter, bendingRadius, Sy, E);

  // Calculate compensated mandrel diameter
  const compensatedMandrelDiameter = calculateCompensatedMandrelDiameter(
    targetMeanDiameter,
    wireDiameter,
    springbackAngle,
    E,
    Sy
  );

  // Calculate compensated pitch (accounting for relaxation)
  const pitchRelaxationFactor = 1.02 + 0.01 * (feedRate / 30);
  const compensatedPitch = targetPitch * pitchRelaxationFactor;

  // Calculate stress distribution
  const stressDistribution = calculateCoilingStressDistribution(
    wireDiameter,
    bendingRadius,
    E,
    Sy
  );

  // Calculate fatigue life reduction factor
  const fatigueLifeReductionFactor = calculateFatigueLifeReductionFactor(
    residualBendingStress,
    Su,
    Se
  );

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (residualBendingStress > 0.3 * Sy) {
    recommendations.push('Consider stress relief heat treatment after coiling');
  }
  
  if (springbackAngle > 10) {
    recommendations.push('High springback detected - verify mandrel compensation');
  }
  
  if (mandrelDiameter < wireDiameter * 3) {
    recommendations.push('Mandrel diameter may be too small - risk of wire damage');
  }
  
  if (feedRate > 50 && wireDiameter > 3) {
    recommendations.push('Reduce feed rate for better dimensional accuracy');
  }

  return {
    residualBendingStress,
    residualTorsionalStress,
    totalResidualStress,
    bendingRadius,
    springbackAngle,
    compensatedMandrelDiameter,
    compensatedPitch,
    stressDistribution,
    fatigueLifeReductionFactor,
    recommendations,
  };
}

/**
 * Calculate effective stress including residual stress from coiling
 * τ_effective = τmax + σ_residual
 */
export function calculateEffectiveStressWithResidual(
  maxShearStress: number,
  residualStress: number
): number {
  // Convert residual bending stress to equivalent shear stress
  // Using von Mises: τ_eq = σ / √3
  const equivalentShearResidual = residualStress / Math.sqrt(3);
  
  return maxShearStress + equivalentShearResidual;
}

/**
 * Re-evaluate fatigue life with residual stress using Goodman-Basquin
 */
export function reevaluateFatigueWithResidual(
  stressAmplitude: number,
  meanStress: number,
  residualStress: number,
  ultimateStrength: number,
  fatigueStrengthCoeff: number,
  fatigueStrengthExponent: number
): {
  originalLife: number;
  adjustedLife: number;
  lifeReductionPercent: number;
} {
  // Original Basquin equation: N = (σa / σf')^(1/b)
  const originalLife = Math.pow(stressAmplitude / fatigueStrengthCoeff, 1 / fatigueStrengthExponent);
  
  // Adjusted mean stress with residual
  const adjustedMeanStress = meanStress + residualStress;
  
  // Goodman correction for mean stress
  const goodmanFactor = 1 - adjustedMeanStress / ultimateStrength;
  const adjustedAmplitude = stressAmplitude / Math.max(0.1, goodmanFactor);
  
  // Adjusted fatigue life
  const adjustedLife = Math.pow(adjustedAmplitude / fatigueStrengthCoeff, 1 / fatigueStrengthExponent);
  
  // Life reduction percentage
  const lifeReductionPercent = ((originalLife - adjustedLife) / originalLife) * 100;
  
  return {
    originalLife,
    adjustedLife,
    lifeReductionPercent: Math.max(0, lifeReductionPercent),
  };
}
