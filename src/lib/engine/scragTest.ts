/**
 * Scrag Test & Heat Treatment Springback Model - Phase 6
 * 预压试验与热处理回弹模型
 * 
 * Models the effects of scragging (presetting) and heat treatment on spring properties
 */

import type { SpringMaterialId } from '@/lib/materials/springMaterials';
import { getSpringMaterial } from '@/lib/materials/springMaterials';
import { getRambergOsgoodParams, calculateRambergOsgoodStrain } from './nonlinearMaterial';

/**
 * Scrag test parameters
 */
export interface ScragTestParams {
  /** Original free length (mm) */
  originalFreeLength: number;
  /** Original spring rate (N/mm) */
  originalSpringRate: number;
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Active coils */
  activeCoils: number;
  /** Scrag force applied (N) */
  scragForce: number;
  /** Scrag deflection (mm) */
  scragDeflection: number;
  /** Material ID */
  materialId: SpringMaterialId;
  /** Number of scrag cycles */
  scragCycles: number;
  /** Temperature during scrag (°C) */
  scragTemperature: number;
}

/**
 * Heat treatment parameters
 */
export interface HeatTreatmentParams {
  /** Treatment temperature (°C) */
  temperature: number;
  /** Soak time (hours) */
  soakTime: number;
  /** Cooling method */
  coolingMethod: 'air' | 'oil' | 'water' | 'furnace';
  /** Material ID */
  materialId: SpringMaterialId;
}

/**
 * Scrag test result
 */
export interface ScragTestResult {
  /** New free length after scrag (mm) */
  newFreeLength: number;
  /** Permanent set (mm) */
  permanentSet: number;
  /** Permanent set percentage (%) */
  permanentSetPercent: number;
  /** New spring rate (N/mm) */
  newSpringRate: number;
  /** Spring rate change (%) */
  springRateChange: number;
  /** Residual plastic strain */
  residualPlasticStrain: number;
  /** Stress at scrag deflection (MPa) */
  scragStress: number;
  /** Yield occurred during scrag */
  yieldOccurred: boolean;
  /** Stabilization achieved */
  stabilizationAchieved: boolean;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Heat treatment result
 */
export interface HeatTreatmentResult {
  /** Modulus recovery factor */
  modulusRecoveryFactor: number;
  /** New elastic modulus (MPa) */
  newElasticModulus: number;
  /** Stress relief percentage (%) */
  stressReliefPercent: number;
  /** Hardness change (HRC) */
  hardnessChange: number;
  /** Fatigue life improvement factor */
  fatigueLifeImprovement: number;
  /** Dimensional stability improvement */
  dimensionalStabilityImprovement: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Combined scrag + heat treatment result
 */
export interface SpringbackModelResult {
  /** Scrag test results */
  scragResult: ScragTestResult;
  /** Heat treatment results */
  heatTreatmentResult: HeatTreatmentResult;
  /** Final free length (mm) */
  finalFreeLength: number;
  /** Final spring rate (N/mm) */
  finalSpringRate: number;
  /** Total permanent set (mm) */
  totalPermanentSet: number;
  /** Recommended design compensation */
  designCompensation: {
    freeLengthCompensation: number;
    coilCompensation: number;
    pitchCompensation: number;
  };
}

/**
 * Calculate scrag stress using spring formula
 */
export function calculateScragStress(
  scragForce: number,
  wireDiameter: number,
  meanDiameter: number
): number {
  const springIndex = meanDiameter / wireDiameter;
  const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;
  
  // Shear stress: τ = 8 * F * D / (π * d³) * K
  const stress = (8 * scragForce * meanDiameter) / (Math.PI * Math.pow(wireDiameter, 3)) * wahlFactor;
  
  return stress;
}

/**
 * Calculate plastic strain using Ramberg-Osgood model
 */
export function calculatePlasticStrain(
  stress: number,
  materialId: SpringMaterialId
): number {
  const roParams = getRambergOsgoodParams(materialId);
  const strainResult = calculateRambergOsgoodStrain(stress, roParams);
  
  return Math.max(0, strainResult.plasticStrain);
}

/**
 * Calculate permanent set from plastic strain
 */
export function calculatePermanentSet(
  plasticStrain: number,
  activeCoils: number,
  meanDiameter: number,
  wireDiameter: number
): number {
  // Wire length in active coils
  const wireLength = Math.PI * meanDiameter * activeCoils;
  
  // Permanent set is related to plastic strain and geometry
  // Approximation: δ_permanent ≈ ε_plastic * L_wire * sin(helix_angle)
  const helixAngle = Math.atan(wireDiameter / (Math.PI * meanDiameter));
  const permanentSet = plasticStrain * wireLength * Math.sin(helixAngle);
  
  return permanentSet;
}

/**
 * Calculate spring rate change after scrag
 */
export function calculateSpringRateChange(
  originalRate: number,
  permanentSet: number,
  originalFreeLength: number,
  activeCoils: number
): { newRate: number; changePercent: number } {
  // Spring rate change due to geometry change
  // k ∝ d⁴ / (D³ * Na)
  // After scrag, effective pitch decreases slightly
  
  const pitchReductionFactor = 1 - permanentSet / (originalFreeLength * 0.5);
  const newRate = originalRate * Math.pow(pitchReductionFactor, 0.1); // Small effect
  
  const changePercent = ((newRate - originalRate) / originalRate) * 100;
  
  return { newRate, changePercent };
}

/**
 * Simulate scrag test
 */
export function simulateScragTest(params: ScragTestParams): ScragTestResult {
  const {
    originalFreeLength,
    originalSpringRate,
    wireDiameter,
    meanDiameter,
    activeCoils,
    scragForce,
    scragDeflection,
    materialId,
    scragCycles,
    scragTemperature,
  } = params;

  // Get material properties
  const material = getSpringMaterial(materialId);
  const allowableStress = material?.allowShearStatic ?? 560;
  const yieldStress = allowableStress * 1.5;

  // Calculate scrag stress
  const scragStress = calculateScragStress(scragForce, wireDiameter, meanDiameter);

  // Check if yield occurred
  const yieldOccurred = scragStress > yieldStress * 0.9;

  // Calculate plastic strain
  const plasticStrain = calculatePlasticStrain(scragStress, materialId);

  // Calculate permanent set
  let permanentSet = calculatePermanentSet(plasticStrain, activeCoils, meanDiameter, wireDiameter);

  // Multiple cycles increase permanent set (diminishing returns)
  const cyclesFactor = 1 + 0.1 * Math.log(scragCycles + 1);
  permanentSet *= cyclesFactor;

  // Temperature effect on permanent set
  const tempFactor = 1 + (scragTemperature - 20) * 0.001;
  permanentSet *= tempFactor;

  // New free length
  const newFreeLength = originalFreeLength - permanentSet;
  const permanentSetPercent = (permanentSet / originalFreeLength) * 100;

  // Spring rate change
  const { newRate, changePercent } = calculateSpringRateChange(
    originalSpringRate,
    permanentSet,
    originalFreeLength,
    activeCoils
  );

  // Check stabilization (typically after 3-5 cycles with <0.5% additional set)
  const stabilizationAchieved = scragCycles >= 3 && permanentSetPercent < 2;

  // Recommendations
  const recommendations: string[] = [];

  if (!yieldOccurred) {
    recommendations.push('Scrag stress below yield - consider increasing scrag force for better presetting');
  }

  if (permanentSetPercent > 3) {
    recommendations.push('High permanent set - verify design allows for this deformation');
  }

  if (!stabilizationAchieved && scragCycles < 3) {
    recommendations.push('Increase scrag cycles to achieve dimensional stability');
  }

  if (scragTemperature > 100) {
    recommendations.push('Hot scragging detected - verify material properties at temperature');
  }

  return {
    newFreeLength,
    permanentSet,
    permanentSetPercent,
    newSpringRate: newRate,
    springRateChange: changePercent,
    residualPlasticStrain: plasticStrain,
    scragStress,
    yieldOccurred,
    stabilizationAchieved,
    recommendations,
  };
}

/**
 * Simulate heat treatment effects
 */
export function simulateHeatTreatment(params: HeatTreatmentParams): HeatTreatmentResult {
  const {
    temperature,
    soakTime,
    coolingMethod,
    materialId,
  } = params;

  // Get material properties
  const material = getSpringMaterial(materialId);
  const baseModulus = material?.elasticModulus ?? 207000;

  // Modulus recovery based on temperature and time
  // Higher temperature and longer time = more recovery
  const tempFactor = Math.min(1.0, temperature / 350);
  const timeFactor = Math.min(1.0, Math.log(soakTime + 1) / Math.log(5));
  const modulusRecoveryFactor = 1 + 0.02 * tempFactor * timeFactor;

  const newElasticModulus = baseModulus * modulusRecoveryFactor;

  // Stress relief percentage
  const stressReliefPercent = Math.min(95, 50 + 30 * tempFactor + 15 * timeFactor);

  // Hardness change (slight decrease with stress relief)
  const hardnessChange = -2 * tempFactor * timeFactor;

  // Fatigue life improvement from stress relief
  const fatigueLifeImprovement = 1 + 0.2 * (stressReliefPercent / 100);

  // Dimensional stability improvement
  const coolingFactors: Record<string, number> = {
    furnace: 1.0,
    air: 0.9,
    oil: 0.8,
    water: 0.7,
  };
  const dimensionalStabilityImprovement = 1 + 0.15 * tempFactor * (coolingFactors[coolingMethod] ?? 0.9);

  // Recommendations
  const recommendations: string[] = [];

  if (temperature < 200) {
    recommendations.push('Low treatment temperature - stress relief may be incomplete');
  }

  if (temperature > 400) {
    recommendations.push('High temperature may affect material hardness and strength');
  }

  if (soakTime < 0.5) {
    recommendations.push('Short soak time - consider extending for better stress relief');
  }

  if (coolingMethod === 'water' && temperature > 300) {
    recommendations.push('Water quench from high temperature may cause distortion');
  }

  return {
    modulusRecoveryFactor,
    newElasticModulus,
    stressReliefPercent,
    hardnessChange,
    fatigueLifeImprovement,
    dimensionalStabilityImprovement,
    recommendations,
  };
}

/**
 * Combined springback model (scrag + heat treatment)
 */
export function calculateSpringbackModel(
  scragParams: ScragTestParams,
  heatTreatmentParams: HeatTreatmentParams
): SpringbackModelResult {
  // Run scrag test simulation
  const scragResult = simulateScragTest(scragParams);

  // Run heat treatment simulation
  const heatTreatmentResult = simulateHeatTreatment(heatTreatmentParams);

  // Final properties after both processes
  // Heat treatment may cause slight additional relaxation
  const heatTreatmentRelaxation = scragResult.permanentSet * 0.05 * (heatTreatmentParams.temperature / 300);
  
  const finalFreeLength = scragResult.newFreeLength - heatTreatmentRelaxation;
  const finalSpringRate = scragResult.newSpringRate * heatTreatmentResult.modulusRecoveryFactor;
  const totalPermanentSet = scragResult.permanentSet + heatTreatmentRelaxation;

  // Calculate design compensation to achieve target after manufacturing
  const designCompensation = {
    freeLengthCompensation: totalPermanentSet * 1.1, // Add 10% margin
    coilCompensation: totalPermanentSet / (scragParams.wireDiameter * 1.5), // Approximate coil adjustment
    pitchCompensation: totalPermanentSet / scragParams.activeCoils,
  };

  return {
    scragResult,
    heatTreatmentResult,
    finalFreeLength,
    finalSpringRate,
    totalPermanentSet,
    designCompensation,
  };
}
