/**
 * CNC Machine Reverse Guidance System - Phase 7
 * CNC机床反向指导系统
 * 
 * Computes manufacturing compensation parameters for CNC coiling machines
 */

import type { CalibrationResult } from './digitalTwinCalibration';

/**
 * CNC machine type
 */
export type CNCMachineType = 
  | 'wafios'
  | 'simco'
  | 'itaya'
  | 'mec'
  | 'generic_cnc';

/**
 * CNC coiling parameters
 */
export interface CNCCoilingParams {
  /** Mandrel head diameter (mm) */
  mandrelDiameter: number;
  /** Pitch cam setting (mm/revolution) */
  pitchCamSetting: number;
  /** Wire feed rate (mm/s) */
  feedRate: number;
  /** Forming angle (degrees) */
  formingAngle: number;
  /** Coiling speed (RPM) */
  coilingSpeed: number;
  /** Wire tension (N) */
  wireTension: number;
}

/**
 * Revolution-specific correction
 */
export interface RevolutionCorrection {
  /** Revolution index (0-based) */
  revolutionIndex: number;
  /** Pitch correction (mm) */
  pitchCorrection: number;
  /** Mean diameter offset (mm) */
  dmOffset: number;
  /** Feed rate adjustment (%) */
  feedRateAdjustment: number;
  /** Cumulative angle (degrees) */
  cumulativeAngle: number;
}

/**
 * Manufacturing compensation curve
 */
export interface CompensationCurve {
  /** Target parameter */
  targetParameter: 'stiffness' | 'preload' | 'free_length';
  /** Target value */
  targetValue: number;
  /** Current value */
  currentValue: number;
  /** Required adjustment */
  requiredAdjustment: number;
  /** Compensation points */
  compensationPoints: {
    position: number;  // 0-1 along spring
    adjustment: number;
  }[];
}

/**
 * CNC guidance result
 */
export interface CNCGuidanceResult {
  /** Original CNC parameters */
  originalParams: CNCCoilingParams;
  /** Corrected CNC parameters */
  correctedParams: CNCCoilingParams;
  /** Per-revolution corrections */
  revolutionCorrections: RevolutionCorrection[];
  /** Compensation curves */
  compensationCurves: CompensationCurve[];
  /** Machine-specific instructions */
  machineInstructions: string[];
  /** JSON export for CNC control */
  cncControlJSON: object;
  /** Quality prediction */
  qualityPrediction: {
    expectedStiffnessAccuracy: number;  // %
    expectedLengthAccuracy: number;     // mm
    expectedCpk: number;
  };
}

/**
 * Spring design parameters for CNC guidance
 */
export interface SpringDesignForCNC {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Target mean diameter (mm) */
  targetMeanDiameter: number;
  /** Target active coils */
  targetActiveCoils: number;
  /** Target free length (mm) */
  targetFreeLength: number;
  /** Target spring rate (N/mm) */
  targetSpringRate: number;
  /** Target preload force (N) at installed length */
  targetPreload?: number;
  /** Installed length (mm) */
  installedLength?: number;
  /** Material shear modulus (MPa) */
  shearModulus: number;
}

/**
 * Calculate springback compensation
 */
function calculateSpringbackCompensation(
  wireDiameter: number,
  mandrelDiameter: number,
  shearModulus: number
): number {
  // Springback angle depends on wire stiffness and bending radius
  // θ_springback ≈ (E * d) / (2 * R * σ_y)
  
  const bendingRadius = mandrelDiameter / 2;
  const yieldStress = 1400;  // Typical for spring steel
  const elasticModulus = shearModulus * 2.6;  // E ≈ 2.6 * G
  
  const springbackFactor = (elasticModulus * wireDiameter) / (2 * bendingRadius * yieldStress);
  
  // Mandrel needs to be smaller to compensate
  // D_mandrel_compensated = D_target * (1 - springback_factor)
  return springbackFactor;
}

/**
 * Calculate pitch compensation for end coils
 */
function calculatePitchCompensation(
  targetPitch: number,
  wireDiameter: number,
  activeCoils: number,
  position: number  // 0-1 along spring
): number {
  // End coils need tighter pitch (dead coils)
  // Transition zone needs gradual adjustment
  
  const deadCoilZone = 1.5 / activeCoils;  // 1.5 coils at each end
  
  if (position < deadCoilZone) {
    // Bottom dead coils - pitch = wire diameter
    const transitionFactor = position / deadCoilZone;
    return wireDiameter + (targetPitch - wireDiameter) * transitionFactor;
  } else if (position > 1 - deadCoilZone) {
    // Top dead coils
    const transitionFactor = (1 - position) / deadCoilZone;
    return wireDiameter + (targetPitch - wireDiameter) * transitionFactor;
  }
  
  return targetPitch;
}

/**
 * Generate CNC guidance from calibration data
 */
export function generateCNCGuidance(
  design: SpringDesignForCNC,
  calibration: CalibrationResult | null,
  machineType: CNCMachineType = 'generic_cnc'
): CNCGuidanceResult {
  const { wireDiameter, targetMeanDiameter, targetActiveCoils, targetFreeLength, targetSpringRate, shearModulus } = design;
  
  // Calculate base pitch
  const totalCoils = targetActiveCoils + 2;  // 2 dead coils
  const basePitch = (targetFreeLength - wireDiameter * 2) / targetActiveCoils;
  
  // Calculate springback compensation
  const springbackFactor = calculateSpringbackCompensation(wireDiameter, targetMeanDiameter - wireDiameter, shearModulus);
  
  // Original CNC parameters (without compensation)
  const originalParams: CNCCoilingParams = {
    mandrelDiameter: targetMeanDiameter - wireDiameter,
    pitchCamSetting: basePitch,
    feedRate: 20,  // Default
    formingAngle: 15,  // Default
    coilingSpeed: 100,  // RPM
    wireTension: wireDiameter * 5,  // Approximate
  };
  
  // Apply calibration corrections if available
  let dmCorrection = 0;
  let pitchCorrection = 0;
  let stiffnessCorrection = 0;
  
  if (calibration) {
    dmCorrection = -calibration.reverseSolvedParameters.coilDiameterTolerance;
    pitchCorrection = -calibration.reverseSolvedParameters.pitchVariation;
    stiffnessCorrection = calibration.reverseSolvedParameters.stiffnessLossPercent / 100;
  }
  
  // Compensated mandrel diameter
  const compensatedMandrel = originalParams.mandrelDiameter * (1 - springbackFactor) + dmCorrection;
  
  // Corrected CNC parameters
  const correctedParams: CNCCoilingParams = {
    mandrelDiameter: compensatedMandrel,
    pitchCamSetting: basePitch + pitchCorrection,
    feedRate: originalParams.feedRate * (1 + stiffnessCorrection * 0.5),
    formingAngle: originalParams.formingAngle,
    coilingSpeed: originalParams.coilingSpeed,
    wireTension: originalParams.wireTension,
  };
  
  // Generate per-revolution corrections
  const revolutionCorrections: RevolutionCorrection[] = [];
  
  for (let rev = 0; rev < totalCoils; rev++) {
    const position = rev / totalCoils;
    const pitchAtPosition = calculatePitchCompensation(basePitch, wireDiameter, targetActiveCoils, position);
    
    // Additional corrections from calibration
    const localPitchCorrection = pitchCorrection * (1 + 0.1 * Math.sin(position * Math.PI));
    const localDmOffset = dmCorrection * (1 + 0.05 * Math.cos(position * Math.PI * 2));
    
    revolutionCorrections.push({
      revolutionIndex: rev,
      pitchCorrection: pitchAtPosition - basePitch + localPitchCorrection,
      dmOffset: localDmOffset,
      feedRateAdjustment: stiffnessCorrection * 100 * (1 - 0.5 * Math.abs(position - 0.5)),
      cumulativeAngle: rev * 360,
    });
  }
  
  // Generate compensation curves
  const compensationCurves: CompensationCurve[] = [];
  
  // Stiffness compensation
  if (calibration) {
    const currentStiffness = targetSpringRate * (1 - calibration.reverseSolvedParameters.stiffnessLossPercent / 100);
    compensationCurves.push({
      targetParameter: 'stiffness',
      targetValue: targetSpringRate,
      currentValue: currentStiffness,
      requiredAdjustment: targetSpringRate - currentStiffness,
      compensationPoints: [
        { position: 0, adjustment: 0 },
        { position: 0.25, adjustment: stiffnessCorrection * 0.5 },
        { position: 0.5, adjustment: stiffnessCorrection },
        { position: 0.75, adjustment: stiffnessCorrection * 0.5 },
        { position: 1, adjustment: 0 },
      ],
    });
  }
  
  // Preload compensation
  if (design.targetPreload && design.installedLength) {
    const deflection = targetFreeLength - design.installedLength;
    const currentPreload = targetSpringRate * deflection;
    compensationCurves.push({
      targetParameter: 'preload',
      targetValue: design.targetPreload,
      currentValue: currentPreload,
      requiredAdjustment: design.targetPreload - currentPreload,
      compensationPoints: [
        { position: 0, adjustment: 0 },
        { position: 1, adjustment: (design.targetPreload - currentPreload) / targetSpringRate },
      ],
    });
  }
  
  // Generate machine-specific instructions
  const machineInstructions = generateMachineInstructions(
    machineType,
    originalParams,
    correctedParams,
    revolutionCorrections
  );
  
  // Generate CNC control JSON
  const cncControlJSON = {
    version: '1.0',
    generator: 'ISRI-SHUANGDI Phase 7',
    timestamp: new Date().toISOString(),
    machineType,
    springDesign: {
      wireDiameter,
      targetMeanDiameter,
      targetActiveCoils,
      targetFreeLength,
      targetSpringRate,
    },
    cncParameters: correctedParams,
    revolutionProgram: revolutionCorrections.map(rc => ({
      rev: rc.revolutionIndex,
      pitch: basePitch + rc.pitchCorrection,
      dm: targetMeanDiameter + rc.dmOffset,
      feedAdj: rc.feedRateAdjustment,
    })),
    compensationCurves: compensationCurves.map(cc => ({
      param: cc.targetParameter,
      target: cc.targetValue,
      current: cc.currentValue,
      points: cc.compensationPoints,
    })),
  };
  
  // Quality prediction
  const qualityPrediction = {
    expectedStiffnessAccuracy: calibration ? 
      Math.max(95, 100 - Math.abs(calibration.deviationAnalysis.springRateDeviation) * 0.5) : 97,
    expectedLengthAccuracy: calibration ?
      Math.max(0.1, Math.abs(calibration.deviationAnalysis.freeLengthDeviation) * 0.3) : 0.2,
    expectedCpk: calibration?.calibrationQuality === 'excellent' ? 1.67 :
      calibration?.calibrationQuality === 'good' ? 1.33 :
      calibration?.calibrationQuality === 'acceptable' ? 1.0 : 0.67,
  };
  
  return {
    originalParams,
    correctedParams,
    revolutionCorrections,
    compensationCurves,
    machineInstructions,
    cncControlJSON,
    qualityPrediction,
  };
}

/**
 * Generate machine-specific instructions
 */
function generateMachineInstructions(
  machineType: CNCMachineType,
  original: CNCCoilingParams,
  corrected: CNCCoilingParams,
  revCorrections: RevolutionCorrection[]
): string[] {
  const instructions: string[] = [];
  
  instructions.push(`=== CNC COILING MACHINE SETUP - ${machineType.toUpperCase()} ===`);
  instructions.push('');
  
  // Mandrel setup
  instructions.push('1. MANDREL SETUP:');
  instructions.push(`   Original mandrel diameter: ${original.mandrelDiameter.toFixed(3)} mm`);
  instructions.push(`   Compensated mandrel diameter: ${corrected.mandrelDiameter.toFixed(3)} mm`);
  instructions.push(`   Adjustment: ${(corrected.mandrelDiameter - original.mandrelDiameter).toFixed(4)} mm`);
  instructions.push('');
  
  // Pitch cam setup
  instructions.push('2. PITCH CAM SETUP:');
  instructions.push(`   Base pitch setting: ${original.pitchCamSetting.toFixed(3)} mm/rev`);
  instructions.push(`   Compensated pitch: ${corrected.pitchCamSetting.toFixed(3)} mm/rev`);
  instructions.push('');
  
  // Feed rate
  instructions.push('3. FEED RATE:');
  instructions.push(`   Base feed rate: ${original.feedRate.toFixed(1)} mm/s`);
  instructions.push(`   Adjusted feed rate: ${corrected.feedRate.toFixed(1)} mm/s`);
  instructions.push('');
  
  // Revolution-by-revolution program
  instructions.push('4. REVOLUTION PROGRAM:');
  instructions.push('   Rev | Pitch Adj (mm) | Dm Offset (mm) | Feed Adj (%)');
  instructions.push('   ----|----------------|----------------|-------------');
  
  for (const rc of revCorrections) {
    instructions.push(
      `   ${rc.revolutionIndex.toString().padStart(3)} | ` +
      `${rc.pitchCorrection >= 0 ? '+' : ''}${rc.pitchCorrection.toFixed(4).padStart(13)} | ` +
      `${rc.dmOffset >= 0 ? '+' : ''}${rc.dmOffset.toFixed(4).padStart(13)} | ` +
      `${rc.feedRateAdjustment >= 0 ? '+' : ''}${rc.feedRateAdjustment.toFixed(1).padStart(11)}`
    );
  }
  
  instructions.push('');
  
  // Machine-specific notes
  if (machineType === 'wafios') {
    instructions.push('5. WAFIOS-SPECIFIC NOTES:');
    instructions.push('   - Program pitch curve in FMU controller');
    instructions.push('   - Use automatic springback compensation mode');
    instructions.push('   - Set wire guide position for optimal coil formation');
  } else if (machineType === 'simco') {
    instructions.push('5. SIMCO-SPECIFIC NOTES:');
    instructions.push('   - Enter pitch values in cam profile editor');
    instructions.push('   - Verify servo motor calibration');
    instructions.push('   - Check wire straightener settings');
  } else {
    instructions.push('5. GENERAL NOTES:');
    instructions.push('   - Verify all measurements before production');
    instructions.push('   - Run test pieces and measure');
    instructions.push('   - Fine-tune based on actual results');
  }
  
  return instructions;
}

/**
 * Export CNC guidance as JSON file
 */
export function exportCNCGuidanceJSON(result: CNCGuidanceResult): string {
  return JSON.stringify(result.cncControlJSON, null, 2);
}

/**
 * Export CNC guidance as machine program
 */
export function exportCNCProgram(
  result: CNCGuidanceResult,
  machineType: CNCMachineType
): string {
  let program = '';
  
  if (machineType === 'wafios' || machineType === 'generic_cnc') {
    // G-code style program
    program += `; Spring Coiling Program\n`;
    program += `; Generated by ISRI-SHUANGDI Phase 7\n`;
    program += `; Date: ${new Date().toISOString()}\n\n`;
    
    program += `G90 ; Absolute positioning\n`;
    program += `M03 S${result.correctedParams.coilingSpeed} ; Start spindle\n`;
    program += `G01 F${result.correctedParams.feedRate} ; Set feed rate\n\n`;
    
    for (const rc of result.revolutionCorrections) {
      const pitch = result.correctedParams.pitchCamSetting + rc.pitchCorrection;
      program += `; Revolution ${rc.revolutionIndex}\n`;
      program += `G01 Z${(rc.revolutionIndex * pitch).toFixed(4)} ; Pitch: ${pitch.toFixed(4)}\n`;
    }
    
    program += `\nM05 ; Stop spindle\n`;
    program += `M30 ; End program\n`;
  }
  
  return program;
}
