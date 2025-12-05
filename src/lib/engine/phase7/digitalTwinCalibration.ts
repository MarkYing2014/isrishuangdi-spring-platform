/**
 * Digital Twin Calibration Engine - Phase 7
 * 数字孪生校准引擎
 * 
 * Calibrates simulation models with real experimental data
 */

/**
 * Experimental data point
 */
export interface ExperimentalDataPoint {
  /** Deflection (mm) */
  deflection: number;
  /** Force (N) */
  force: number;
  /** Cycle count (optional) */
  cycles?: number;
  /** Timestamp (optional) */
  timestamp?: number;
}

/**
 * Experimental test data
 */
export interface ExperimentalTestData {
  /** Force-deflection curve data */
  forceDeflectionData: ExperimentalDataPoint[];
  /** Measured spring rate (N/mm) */
  measuredSpringRate?: number;
  /** Measured free length (mm) */
  measuredFreeLength?: number;
  /** Measured solid height (mm) */
  measuredSolidHeight?: number;
  /** Height reduction after cycles (mm) */
  heightReduction?: number;
  /** Cycles completed */
  cyclesCompleted?: number;
  /** Operating frequency (Hz) */
  frequency?: number;
  /** Test temperature (°C) */
  temperature?: number;
}

/**
 * Theoretical spring parameters
 */
export interface TheoreticalParameters {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Active coils */
  activeCoils: number;
  /** Free length (mm) */
  freeLength: number;
  /** Theoretical spring rate (N/mm) */
  theoreticalSpringRate: number;
  /** Material shear modulus (MPa) */
  shearModulus: number;
}

/**
 * Calibration deviation analysis
 */
export interface DeviationAnalysis {
  /** Spring rate deviation (%) */
  springRateDeviation: number;
  /** Free length deviation (mm) */
  freeLengthDeviation: number;
  /** Curve fit R² value */
  curveRSquared: number;
  /** Maximum force deviation (%) */
  maxForceDeviation: number;
  /** Average force deviation (%) */
  avgForceDeviation: number;
  /** Nonlinearity index */
  nonlinearityIndex: number;
  /** Hysteresis (if cyclic data) */
  hysteresis?: number;
}

/**
 * Reverse-solved parameters
 */
export interface ReverseSolvedParameters {
  /** Effective wire diameter (mm) */
  effectiveWireDiameter: number;
  /** Effective mean diameter (mm) */
  effectiveMeanDiameter: number;
  /** Effective active coils */
  effectiveActiveCoils: number;
  /** Pitch variation (mm) */
  pitchVariation: number;
  /** Coil diameter tolerance (mm) */
  coilDiameterTolerance: number;
  /** Residual stress compensation (MPa) */
  residualStressCompensation: number;
  /** Stiffness loss from micro-yielding (%) */
  stiffnessLossPercent: number;
  /** Effective shear modulus (MPa) */
  effectiveShearModulus: number;
}

/**
 * Calibration result
 */
export interface CalibrationResult {
  /** Deviation analysis */
  deviationAnalysis: DeviationAnalysis;
  /** Reverse-solved parameters */
  reverseSolvedParameters: ReverseSolvedParameters;
  /** Calibrated force-deflection curve */
  calibratedCurve: ExperimentalDataPoint[];
  /** Confidence level (0-1) */
  confidenceLevel: number;
  /** Calibration quality */
  calibrationQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
  /** Identified issues */
  identifiedIssues: string[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Curve fitting using least squares
 */
function fitLinearCurve(data: ExperimentalDataPoint[]): { slope: number; intercept: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (const point of data) {
    sumX += point.deflection;
    sumY += point.force;
    sumXY += point.deflection * point.force;
    sumX2 += point.deflection * point.deflection;
    sumY2 += point.force * point.force;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // R² calculation
  const yMean = sumY / n;
  let ssTotal = 0, ssResidual = 0;
  
  for (const point of data) {
    const yPredicted = slope * point.deflection + intercept;
    ssTotal += Math.pow(point.force - yMean, 2);
    ssResidual += Math.pow(point.force - yPredicted, 2);
  }
  
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
  
  return { slope, intercept, rSquared };
}

/**
 * Calculate nonlinearity index
 */
function calculateNonlinearity(data: ExperimentalDataPoint[], linearSlope: number): number {
  if (data.length < 3) return 0;
  
  let maxDeviation = 0;
  const maxForce = Math.max(...data.map(d => d.force));
  
  for (const point of data) {
    const linearForce = linearSlope * point.deflection;
    const deviation = Math.abs(point.force - linearForce) / maxForce;
    maxDeviation = Math.max(maxDeviation, deviation);
  }
  
  return maxDeviation;
}

/**
 * Detect hysteresis from cyclic data
 */
function detectHysteresis(data: ExperimentalDataPoint[]): number {
  // Simple hysteresis detection - compare loading vs unloading
  // Assumes data contains both loading and unloading phases
  
  if (data.length < 10) return 0;
  
  const midIndex = Math.floor(data.length / 2);
  const loadingData = data.slice(0, midIndex);
  const unloadingData = data.slice(midIndex).reverse();
  
  let totalDiff = 0;
  const numCompare = Math.min(loadingData.length, unloadingData.length);
  
  for (let i = 0; i < numCompare; i++) {
    const loadPoint = loadingData[i];
    // Find closest unloading point by deflection
    const unloadPoint = unloadingData.reduce((closest, p) => 
      Math.abs(p.deflection - loadPoint.deflection) < Math.abs(closest.deflection - loadPoint.deflection) ? p : closest
    );
    
    if (Math.abs(unloadPoint.deflection - loadPoint.deflection) < 0.5) {
      totalDiff += Math.abs(loadPoint.force - unloadPoint.force);
    }
  }
  
  const avgForce = data.reduce((sum, p) => sum + p.force, 0) / data.length;
  return avgForce > 0 ? (totalDiff / numCompare) / avgForce : 0;
}

/**
 * Reverse solve spring parameters from experimental data
 */
function reverseSolveParameters(
  experimental: ExperimentalTestData,
  theoretical: TheoreticalParameters,
  measuredSpringRate: number
): ReverseSolvedParameters {
  const { wireDiameter, meanDiameter, activeCoils, shearModulus } = theoretical;
  
  // Spring rate formula: k = G*d^4 / (8*D^3*Na)
  // Solve for effective parameters
  
  const theoreticalK = theoretical.theoreticalSpringRate;
  const actualK = measuredSpringRate;
  const kRatio = actualK / theoreticalK;
  
  // Stiffness loss from micro-yielding
  const stiffnessLossPercent = kRatio < 1 ? (1 - kRatio) * 100 : 0;
  
  // Effective shear modulus (accounts for material variation)
  const effectiveShearModulus = shearModulus * kRatio;
  
  // Reverse solve wire diameter (most sensitive parameter)
  // k ∝ d^4, so d_eff = d * (k_actual/k_theory)^0.25
  const effectiveWireDiameter = wireDiameter * Math.pow(kRatio, 0.25);
  
  // Reverse solve mean diameter
  // k ∝ 1/D^3, so D_eff = D * (k_theory/k_actual)^(1/3)
  const effectiveMeanDiameter = meanDiameter * Math.pow(1/kRatio, 1/3);
  
  // Effective active coils
  // k ∝ 1/Na, so Na_eff = Na / k_ratio
  const effectiveActiveCoils = activeCoils / kRatio;
  
  // Pitch variation (from free length deviation)
  const theoreticalPitch = (theoretical.freeLength - wireDiameter * 2) / activeCoils;
  const measuredPitch = experimental.measuredFreeLength ? 
    (experimental.measuredFreeLength - wireDiameter * 2) / activeCoils : theoreticalPitch;
  const pitchVariation = measuredPitch - theoreticalPitch;
  
  // Coil diameter tolerance
  const coilDiameterTolerance = effectiveMeanDiameter - meanDiameter;
  
  // Residual stress compensation (estimated from stiffness loss)
  // Higher stiffness loss suggests tensile residual stress
  const residualStressCompensation = stiffnessLossPercent > 0 ? 
    -stiffnessLossPercent * 10 : 0;  // Rough estimate: 10 MPa per 1% loss
  
  return {
    effectiveWireDiameter,
    effectiveMeanDiameter,
    effectiveActiveCoils,
    pitchVariation,
    coilDiameterTolerance,
    residualStressCompensation,
    stiffnessLossPercent,
    effectiveShearModulus,
  };
}

/**
 * Calibrate digital twin with experimental data
 */
export function calibrateDigitalTwin(
  experimental: ExperimentalTestData,
  theoretical: TheoreticalParameters
): CalibrationResult {
  const { forceDeflectionData } = experimental;
  
  // Fit experimental curve
  const fit = fitLinearCurve(forceDeflectionData);
  const measuredSpringRate = experimental.measuredSpringRate || fit.slope;
  
  // Calculate deviations
  const springRateDeviation = ((measuredSpringRate - theoretical.theoreticalSpringRate) / 
    theoretical.theoreticalSpringRate) * 100;
  
  const freeLengthDeviation = experimental.measuredFreeLength ? 
    experimental.measuredFreeLength - theoretical.freeLength : 0;
  
  // Calculate force deviations
  let maxForceDeviation = 0;
  let totalForceDeviation = 0;
  
  for (const point of forceDeflectionData) {
    const theoreticalForce = theoretical.theoreticalSpringRate * point.deflection;
    const deviation = Math.abs((point.force - theoreticalForce) / theoreticalForce) * 100;
    maxForceDeviation = Math.max(maxForceDeviation, deviation);
    totalForceDeviation += deviation;
  }
  
  const avgForceDeviation = totalForceDeviation / forceDeflectionData.length;
  
  // Nonlinearity and hysteresis
  const nonlinearityIndex = calculateNonlinearity(forceDeflectionData, measuredSpringRate);
  const hysteresis = detectHysteresis(forceDeflectionData);
  
  const deviationAnalysis: DeviationAnalysis = {
    springRateDeviation,
    freeLengthDeviation,
    curveRSquared: fit.rSquared,
    maxForceDeviation,
    avgForceDeviation,
    nonlinearityIndex,
    hysteresis,
  };
  
  // Reverse solve parameters
  const reverseSolvedParameters = reverseSolveParameters(
    experimental,
    theoretical,
    measuredSpringRate
  );
  
  // Generate calibrated curve
  const calibratedCurve: ExperimentalDataPoint[] = [];
  const maxDeflection = Math.max(...forceDeflectionData.map(d => d.deflection));
  
  for (let i = 0; i <= 50; i++) {
    const deflection = (maxDeflection / 50) * i;
    const force = measuredSpringRate * deflection + fit.intercept;
    calibratedCurve.push({ deflection, force });
  }
  
  // Determine calibration quality
  let calibrationQuality: CalibrationResult['calibrationQuality'];
  let confidenceLevel: number;
  
  if (fit.rSquared > 0.99 && Math.abs(springRateDeviation) < 3) {
    calibrationQuality = 'excellent';
    confidenceLevel = 0.95;
  } else if (fit.rSquared > 0.95 && Math.abs(springRateDeviation) < 5) {
    calibrationQuality = 'good';
    confidenceLevel = 0.85;
  } else if (fit.rSquared > 0.90 && Math.abs(springRateDeviation) < 10) {
    calibrationQuality = 'acceptable';
    confidenceLevel = 0.70;
  } else {
    calibrationQuality = 'poor';
    confidenceLevel = 0.50;
  }
  
  // Identify issues
  const identifiedIssues: string[] = [];
  
  if (Math.abs(springRateDeviation) > 5) {
    identifiedIssues.push(`Spring rate deviation of ${springRateDeviation.toFixed(1)}% exceeds tolerance`);
  }
  if (nonlinearityIndex > 0.05) {
    identifiedIssues.push('Significant nonlinearity detected - possible coil clash or material yielding');
  }
  if (hysteresis && hysteresis > 0.03) {
    identifiedIssues.push('Hysteresis detected - friction or material damping present');
  }
  if (reverseSolvedParameters.stiffnessLossPercent > 5) {
    identifiedIssues.push(`Stiffness loss of ${reverseSolvedParameters.stiffnessLossPercent.toFixed(1)}% - micro-yielding suspected`);
  }
  if (Math.abs(freeLengthDeviation) > 1) {
    identifiedIssues.push(`Free length deviation of ${freeLengthDeviation.toFixed(2)}mm`);
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (reverseSolvedParameters.coilDiameterTolerance > 0.1) {
    recommendations.push(`Adjust mandrel diameter by ${(-reverseSolvedParameters.coilDiameterTolerance).toFixed(3)}mm`);
  }
  if (Math.abs(reverseSolvedParameters.pitchVariation) > 0.1) {
    recommendations.push(`Adjust pitch cam by ${(-reverseSolvedParameters.pitchVariation).toFixed(3)}mm`);
  }
  if (reverseSolvedParameters.stiffnessLossPercent > 3) {
    recommendations.push('Consider stress relief heat treatment to recover stiffness');
  }
  if (nonlinearityIndex > 0.03) {
    recommendations.push('Check for coil clash - may need to increase pitch or reduce deflection');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Spring performance matches design specifications');
  }
  
  return {
    deviationAnalysis,
    reverseSolvedParameters,
    calibratedCurve,
    confidenceLevel,
    calibrationQuality,
    identifiedIssues,
    recommendations,
  };
}

/**
 * Parse CSV force-deflection data
 */
export function parseForceDeflectionCSV(csvContent: string): ExperimentalDataPoint[] {
  const lines = csvContent.trim().split('\n');
  const data: ExperimentalDataPoint[] = [];
  
  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('deflection') || 
    lines[0].toLowerCase().includes('force') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t;]/);
    if (parts.length >= 2) {
      const deflection = parseFloat(parts[0]);
      const force = parseFloat(parts[1]);
      
      if (!isNaN(deflection) && !isNaN(force)) {
        data.push({ deflection, force });
      }
    }
  }
  
  return data;
}

/**
 * Export calibration report
 */
export function exportCalibrationReport(result: CalibrationResult): string {
  return `
================================================================================
DIGITAL TWIN CALIBRATION REPORT
Generated by ISRI-SHUANGDI Spring Engineering Platform
================================================================================

CALIBRATION QUALITY: ${result.calibrationQuality.toUpperCase()}
Confidence Level: ${(result.confidenceLevel * 100).toFixed(0)}%

--------------------------------------------------------------------------------
DEVIATION ANALYSIS
--------------------------------------------------------------------------------
Spring Rate Deviation: ${result.deviationAnalysis.springRateDeviation.toFixed(2)}%
Free Length Deviation: ${result.deviationAnalysis.freeLengthDeviation.toFixed(3)} mm
Curve Fit R²: ${result.deviationAnalysis.curveRSquared.toFixed(4)}
Max Force Deviation: ${result.deviationAnalysis.maxForceDeviation.toFixed(2)}%
Avg Force Deviation: ${result.deviationAnalysis.avgForceDeviation.toFixed(2)}%
Nonlinearity Index: ${result.deviationAnalysis.nonlinearityIndex.toFixed(4)}
${result.deviationAnalysis.hysteresis ? `Hysteresis: ${(result.deviationAnalysis.hysteresis * 100).toFixed(2)}%` : ''}

--------------------------------------------------------------------------------
REVERSE-SOLVED PARAMETERS
--------------------------------------------------------------------------------
Effective Wire Diameter: ${result.reverseSolvedParameters.effectiveWireDiameter.toFixed(4)} mm
Effective Mean Diameter: ${result.reverseSolvedParameters.effectiveMeanDiameter.toFixed(4)} mm
Effective Active Coils: ${result.reverseSolvedParameters.effectiveActiveCoils.toFixed(2)}
Pitch Variation: ${result.reverseSolvedParameters.pitchVariation.toFixed(4)} mm
Coil Diameter Tolerance: ${result.reverseSolvedParameters.coilDiameterTolerance.toFixed(4)} mm
Residual Stress Compensation: ${result.reverseSolvedParameters.residualStressCompensation.toFixed(1)} MPa
Stiffness Loss: ${result.reverseSolvedParameters.stiffnessLossPercent.toFixed(2)}%
Effective Shear Modulus: ${result.reverseSolvedParameters.effectiveShearModulus.toFixed(0)} MPa

--------------------------------------------------------------------------------
IDENTIFIED ISSUES
--------------------------------------------------------------------------------
${result.identifiedIssues.length > 0 ? result.identifiedIssues.map(i => `• ${i}`).join('\n') : '• No significant issues identified'}

--------------------------------------------------------------------------------
RECOMMENDATIONS
--------------------------------------------------------------------------------
${result.recommendations.map(r => `• ${r}`).join('\n')}

================================================================================
`;
}
