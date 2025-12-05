/**
 * Manufacturing Compensation Engine - Phase 6
 * 制造补偿引擎
 * 
 * Computes compensated design geometry so that final spring meets target parameters AFTER manufacturing
 */

import type { SpringMaterialId } from '@/lib/materials/springMaterials';
import { simulateCoilingProcess, type CoilingProcessResult } from './coilingProcess';
import { calculateSpringbackModel, type SpringbackModelResult } from './scragTest';

/**
 * Target spring parameters
 */
export interface TargetSpringParams {
  /** Target free length (mm) */
  targetFreeLength: number;
  /** Target spring rate (N/mm) */
  targetSpringRate: number;
  /** Target mean diameter (mm) */
  targetMeanDiameter: number;
  /** Target active coils */
  targetActiveCoils: number;
  /** Target pitch (mm) */
  targetPitch: number;
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Material ID */
  materialId: SpringMaterialId;
}

/**
 * Manufacturing process parameters
 */
export interface ManufacturingProcessParams {
  /** Mandrel diameter (mm) */
  mandrelDiameter: number;
  /** Feed rate (mm/s) */
  feedRate: number;
  /** Pitch cam angle (degrees) */
  pitchCamAngle: number;
  /** Heat treatment temperature (°C) */
  heatTreatmentTemp: number;
  /** Heat treatment soak time (hours) */
  heatTreatmentTime: number;
  /** Cooling method */
  coolingMethod: 'air' | 'oil' | 'water' | 'furnace';
  /** Scrag force (N) */
  scragForce: number;
  /** Scrag cycles */
  scragCycles: number;
  /** Shot peening applied */
  shotPeeningApplied: boolean;
}

/**
 * Compensated design parameters (raw/pre-process values)
 */
export interface CompensatedDesignParams {
  /** Raw total coils (before processing) */
  rawTotalCoils: number;
  /** Raw active coils */
  rawActiveCoils: number;
  /** Raw mean diameter (mm) */
  rawMeanDiameter: number;
  /** Raw pitch (mm) */
  rawPitch: number;
  /** Raw free length (mm) */
  rawFreeLength: number;
  /** Mandrel diameter to use (mm) */
  mandrelDiameter: number;
  /** Compensated pitch cam setting (degrees) */
  pitchCamSetting: number;
}

/**
 * Manufacturing compensation result
 */
export interface ManufacturingCompensationResult {
  /** Target parameters */
  targetParams: TargetSpringParams;
  /** Compensated design parameters */
  compensatedDesign: CompensatedDesignParams;
  /** Coiling process simulation result */
  coilingResult: CoilingProcessResult;
  /** Springback model result */
  springbackResult: SpringbackModelResult;
  /** Predicted final parameters */
  predictedFinalParams: {
    freeLength: number;
    springRate: number;
    meanDiameter: number;
    pitch: number;
  };
  /** Prediction accuracy (%) */
  predictionAccuracy: number;
  /** Compensation factors applied */
  compensationFactors: {
    freeLengthFactor: number;
    diameterFactor: number;
    pitchFactor: number;
    coilsFactor: number;
  };
  /** Manufacturing notes */
  manufacturingNotes: string[];
}

/**
 * Calculate springback compensation factor for mean diameter
 */
export function calculateDiameterCompensation(
  targetMeanDiameter: number,
  wireDiameter: number,
  springbackAngle: number
): number {
  // Springback causes diameter to increase
  // Compensation factor to achieve target after springback
  const springbackFactor = 1 + springbackAngle / 360;
  return 1 / springbackFactor;
}

/**
 * Calculate pitch compensation factor
 */
export function calculatePitchCompensation(
  targetPitch: number,
  feedRate: number,
  relaxationFactor: number
): number {
  // Pitch relaxes after forming
  // Need to over-wind to achieve target pitch
  return 1 / relaxationFactor;
}

/**
 * Calculate free length compensation
 */
export function calculateFreeLengthCompensation(
  targetFreeLength: number,
  permanentSet: number,
  heatTreatmentRelaxation: number
): number {
  // Total length reduction from scrag and heat treatment
  const totalReduction = permanentSet + heatTreatmentRelaxation;
  
  // Compensation: add extra length to achieve target after processing
  return (targetFreeLength + totalReduction) / targetFreeLength;
}

/**
 * Calculate coils compensation
 */
export function calculateCoilsCompensation(
  targetActiveCoils: number,
  pitchCompensationFactor: number
): number {
  // If pitch is compensated, may need slight coil adjustment
  // Generally coils don't change much, but pitch affects effective coils
  return 1 + (pitchCompensationFactor - 1) * 0.1;
}

/**
 * Main manufacturing compensation calculation
 */
export function calculateManufacturingCompensation(
  targetParams: TargetSpringParams,
  processParams: ManufacturingProcessParams
): ManufacturingCompensationResult {
  const {
    targetFreeLength,
    targetSpringRate,
    targetMeanDiameter,
    targetActiveCoils,
    targetPitch,
    wireDiameter,
    materialId,
  } = targetParams;

  const {
    mandrelDiameter,
    feedRate,
    pitchCamAngle,
    heatTreatmentTemp,
    heatTreatmentTime,
    coolingMethod,
    scragForce,
    scragCycles,
  } = processParams;

  // Step 1: Simulate coiling process
  const coilingResult = simulateCoilingProcess({
    wireDiameter,
    mandrelDiameter,
    feedRate,
    pitchCamAngle,
    materialId,
    targetMeanDiameter,
    targetPitch,
  });

  // Step 2: Calculate scrag and heat treatment effects
  const scragDeflection = scragForce / targetSpringRate;
  const springbackResult = calculateSpringbackModel(
    {
      originalFreeLength: targetFreeLength * 1.05, // Start with extra length
      originalSpringRate: targetSpringRate,
      wireDiameter,
      meanDiameter: targetMeanDiameter,
      activeCoils: targetActiveCoils,
      scragForce,
      scragDeflection,
      materialId,
      scragCycles,
      scragTemperature: 20,
    },
    {
      temperature: heatTreatmentTemp,
      soakTime: heatTreatmentTime,
      coolingMethod,
      materialId,
    }
  );

  // Step 3: Calculate compensation factors
  const diameterFactor = calculateDiameterCompensation(
    targetMeanDiameter,
    wireDiameter,
    coilingResult.springbackAngle
  );

  const pitchRelaxationFactor = 1.02 + 0.01 * (feedRate / 30);
  const pitchFactor = calculatePitchCompensation(
    targetPitch,
    feedRate,
    pitchRelaxationFactor
  );

  const freeLengthFactor = calculateFreeLengthCompensation(
    targetFreeLength,
    springbackResult.scragResult.permanentSet,
    springbackResult.totalPermanentSet - springbackResult.scragResult.permanentSet
  );

  const coilsFactor = calculateCoilsCompensation(targetActiveCoils, pitchFactor);

  // Step 4: Calculate compensated design parameters
  const rawMeanDiameter = targetMeanDiameter * diameterFactor;
  const rawPitch = targetPitch * pitchFactor;
  const rawFreeLength = targetFreeLength * freeLengthFactor;
  const rawActiveCoils = targetActiveCoils * coilsFactor;
  const rawTotalCoils = rawActiveCoils + 2; // Add dead coils

  const compensatedDesign: CompensatedDesignParams = {
    rawTotalCoils,
    rawActiveCoils,
    rawMeanDiameter,
    rawPitch,
    rawFreeLength,
    mandrelDiameter: coilingResult.compensatedMandrelDiameter,
    pitchCamSetting: pitchCamAngle * pitchFactor,
  };

  // Step 5: Predict final parameters after processing
  const predictedFinalParams = {
    freeLength: rawFreeLength / freeLengthFactor,
    springRate: targetSpringRate * (Math.pow(rawMeanDiameter / targetMeanDiameter, -3)),
    meanDiameter: rawMeanDiameter / diameterFactor,
    pitch: rawPitch / pitchFactor,
  };

  // Step 6: Calculate prediction accuracy
  const freeLengthError = Math.abs(predictedFinalParams.freeLength - targetFreeLength) / targetFreeLength;
  const springRateError = Math.abs(predictedFinalParams.springRate - targetSpringRate) / targetSpringRate;
  const diameterError = Math.abs(predictedFinalParams.meanDiameter - targetMeanDiameter) / targetMeanDiameter;
  const pitchError = Math.abs(predictedFinalParams.pitch - targetPitch) / targetPitch;
  
  const avgError = (freeLengthError + springRateError + diameterError + pitchError) / 4;
  const predictionAccuracy = (1 - avgError) * 100;

  // Step 7: Generate manufacturing notes
  const manufacturingNotes: string[] = [];

  if (coilingResult.springbackAngle > 15) {
    manufacturingNotes.push(`High springback (${coilingResult.springbackAngle.toFixed(1)}°) - verify mandrel compensation`);
  }

  if (springbackResult.scragResult.permanentSetPercent > 2) {
    manufacturingNotes.push(`Significant permanent set (${springbackResult.scragResult.permanentSetPercent.toFixed(1)}%) - adjust raw free length`);
  }

  if (freeLengthFactor > 1.05) {
    manufacturingNotes.push(`Large free length compensation (${((freeLengthFactor - 1) * 100).toFixed(1)}%) required`);
  }

  if (diameterFactor < 0.95) {
    manufacturingNotes.push(`Significant diameter compensation needed - use smaller mandrel`);
  }

  manufacturingNotes.push(`Use mandrel diameter: ${compensatedDesign.mandrelDiameter.toFixed(2)} mm`);
  manufacturingNotes.push(`Set pitch cam to: ${compensatedDesign.pitchCamSetting.toFixed(1)}°`);
  manufacturingNotes.push(`Wind ${compensatedDesign.rawTotalCoils.toFixed(1)} total coils`);

  return {
    targetParams,
    compensatedDesign,
    coilingResult,
    springbackResult,
    predictedFinalParams,
    predictionAccuracy,
    compensationFactors: {
      freeLengthFactor,
      diameterFactor,
      pitchFactor,
      coilsFactor,
    },
    manufacturingNotes,
  };
}

/**
 * Iterative compensation refinement
 * Runs multiple iterations to improve accuracy
 */
export function refineCompensation(
  targetParams: TargetSpringParams,
  processParams: ManufacturingProcessParams,
  maxIterations: number = 5,
  tolerancePercent: number = 1
): ManufacturingCompensationResult {
  let result = calculateManufacturingCompensation(targetParams, processParams);
  let iteration = 0;

  while (iteration < maxIterations && result.predictionAccuracy < (100 - tolerancePercent)) {
    // Adjust target params based on prediction error
    const adjustedTarget: TargetSpringParams = {
      ...targetParams,
      targetFreeLength: targetParams.targetFreeLength * 
        (targetParams.targetFreeLength / result.predictedFinalParams.freeLength),
      targetMeanDiameter: targetParams.targetMeanDiameter * 
        (targetParams.targetMeanDiameter / result.predictedFinalParams.meanDiameter),
      targetPitch: targetParams.targetPitch * 
        (targetParams.targetPitch / result.predictedFinalParams.pitch),
    };

    result = calculateManufacturingCompensation(adjustedTarget, processParams);
    iteration++;
  }

  if (iteration > 0) {
    result.manufacturingNotes.push(`Compensation refined over ${iteration} iterations`);
  }

  return result;
}

/**
 * Generate manufacturing work order from compensation result
 */
export function generateWorkOrder(result: ManufacturingCompensationResult): {
  coilingInstructions: string[];
  heatTreatmentInstructions: string[];
  scragInstructions: string[];
  qualityCheckpoints: string[];
} {
  const { compensatedDesign, coilingResult, springbackResult, targetParams } = result;

  const coilingInstructions = [
    `Wire diameter: ${targetParams.wireDiameter.toFixed(2)} mm`,
    `Mandrel diameter: ${compensatedDesign.mandrelDiameter.toFixed(2)} mm`,
    `Total coils to wind: ${compensatedDesign.rawTotalCoils.toFixed(1)}`,
    `Pitch cam setting: ${compensatedDesign.pitchCamSetting.toFixed(1)}°`,
    `Target raw free length: ${compensatedDesign.rawFreeLength.toFixed(2)} mm`,
    `Expected springback: ${coilingResult.springbackAngle.toFixed(1)}°`,
  ];

  const heatTreatmentInstructions = [
    `Temperature: ${springbackResult.heatTreatmentResult.newElasticModulus > 0 ? 'As specified' : 'N/A'}`,
    `Expected stress relief: ${springbackResult.heatTreatmentResult.stressReliefPercent.toFixed(0)}%`,
    `Cooling method: As specified`,
  ];

  const scragInstructions = [
    `Scrag force: ${springbackResult.scragResult.scragStress > 0 ? 'As specified' : 'N/A'} N`,
    `Expected permanent set: ${springbackResult.scragResult.permanentSet.toFixed(2)} mm`,
    `Cycles: ${springbackResult.scragResult.stabilizationAchieved ? 'Until stable' : 'Minimum 3'}`,
  ];

  const qualityCheckpoints = [
    `Post-coiling free length: ${compensatedDesign.rawFreeLength.toFixed(2)} ± 0.5 mm`,
    `Post-coiling mean diameter: ${compensatedDesign.rawMeanDiameter.toFixed(2)} ± 0.2 mm`,
    `Final free length: ${targetParams.targetFreeLength.toFixed(2)} ± 0.3 mm`,
    `Final spring rate: ${targetParams.targetSpringRate.toFixed(2)} ± 5% N/mm`,
    `Final mean diameter: ${targetParams.targetMeanDiameter.toFixed(2)} ± 0.1 mm`,
  ];

  return {
    coilingInstructions,
    heatTreatmentInstructions,
    scragInstructions,
    qualityCheckpoints,
  };
}
