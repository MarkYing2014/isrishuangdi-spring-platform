/**
 * ASME/SAE/DIN Standard Check Engine - Phase 6
 * ASME/SAE/DIN标准检查引擎
 * 
 * Compliance checks against industry standards
 */

import type { SpringMaterialId } from '@/lib/materials/springMaterials';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

/**
 * Standard types
 */
export type StandardType = 'ASME' | 'SAE_J157' | 'DIN_2089' | 'JIS_B2704' | 'ISO_10243';

/**
 * Check result status
 */
export type CheckStatus = 'pass' | 'warning' | 'fail';

/**
 * Individual check result
 */
export interface StandardCheckItem {
  /** Check name */
  name: string;
  /** Standard reference */
  standardRef: string;
  /** Check description */
  description: string;
  /** Status */
  status: CheckStatus;
  /** Actual value */
  actualValue: number | string;
  /** Required/limit value */
  limitValue: number | string;
  /** Margin (%) */
  margin?: number;
  /** Recommendation if failed */
  recommendation?: string;
}

/**
 * Standard check result
 */
export interface StandardCheckResult {
  /** Standard type */
  standard: StandardType;
  /** Overall compliance status */
  overallStatus: CheckStatus;
  /** Individual check results */
  checks: StandardCheckItem[];
  /** Pass count */
  passCount: number;
  /** Warning count */
  warningCount: number;
  /** Fail count */
  failCount: number;
  /** Compliance percentage */
  compliancePercent: number;
  /** Summary */
  summary: string;
}

/**
 * Spring parameters for checking
 */
export interface SpringCheckParams {
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Outer diameter (mm) */
  outerDiameter: number;
  /** Free length (mm) */
  freeLength: number;
  /** Active coils */
  activeCoils: number;
  /** Total coils */
  totalCoils: number;
  /** Spring rate (N/mm) */
  springRate: number;
  /** Maximum stress (MPa) */
  maxStress: number;
  /** Mean stress (MPa) */
  meanStress: number;
  /** Alternating stress (MPa) */
  alternatingStress: number;
  /** Safety factor */
  safetyFactor: number;
  /** Material ID */
  materialId: SpringMaterialId;
  /** Operating temperature (°C) */
  operatingTemperature?: number;
  /** Fatigue life (cycles) */
  fatigueLife?: number;
}

/**
 * ASME Spring Design Handbook limits
 */
const ASME_LIMITS = {
  minSpringIndex: 4,
  maxSpringIndex: 12,
  minActiveCoils: 3,
  maxSlendernessRatio: 4,
  minSafetyFactor: 1.2,
  maxStressRatio: 0.45, // τmax / τult
  minPitchAngle: 5, // degrees
  maxPitchAngle: 15, // degrees
};

/**
 * SAE J157 Fatigue Safety limits
 */
const SAE_J157_LIMITS = {
  minFatigueSafetyFactor: 1.1,
  maxAlternatingStressRatio: 0.5, // τalt / τendurance
  minCycleLife: 1e5,
  maxMeanStressRatio: 0.6, // τmean / τyield
};

/**
 * DIN 2089 limits
 */
const DIN_2089_LIMITS = {
  minSpringIndex: 4,
  maxSpringIndex: 20,
  minActiveCoils: 2,
  maxDeflectionRatio: 0.85, // max deflection / solid height clearance
  toleranceClass: {
    1: 0.02, // ±2%
    2: 0.05, // ±5%
    3: 0.10, // ±10%
  },
};

/**
 * Calculate spring index
 */
function calculateSpringIndex(meanDiameter: number, wireDiameter: number): number {
  return meanDiameter / wireDiameter;
}

/**
 * Calculate slenderness ratio
 */
function calculateSlendernessRatio(freeLength: number, meanDiameter: number): number {
  return freeLength / meanDiameter;
}

/**
 * Calculate pitch angle
 */
function calculatePitchAngle(
  freeLength: number,
  wireDiameter: number,
  totalCoils: number,
  meanDiameter: number
): number {
  const pitch = (freeLength - wireDiameter * 2) / (totalCoils - 2);
  const pitchAngleRad = Math.atan(pitch / (Math.PI * meanDiameter));
  return (pitchAngleRad * 180) / Math.PI;
}

/**
 * Run ASME standard checks
 */
export function checkASME(params: SpringCheckParams): StandardCheckResult {
  const checks: StandardCheckItem[] = [];
  const material = getSpringMaterial(params.materialId);
  const ultimateStrength = material?.tensileStrength ?? 1800;

  // Spring Index Check
  const springIndex = calculateSpringIndex(params.meanDiameter, params.wireDiameter);
  checks.push({
    name: 'Spring Index',
    standardRef: 'ASME Spring Design Handbook §3.2',
    description: 'Spring index (C = D/d) should be between 4 and 12',
    status: springIndex >= ASME_LIMITS.minSpringIndex && springIndex <= ASME_LIMITS.maxSpringIndex ? 'pass' :
      springIndex < ASME_LIMITS.minSpringIndex ? 'fail' : 'warning',
    actualValue: springIndex.toFixed(2),
    limitValue: `${ASME_LIMITS.minSpringIndex} - ${ASME_LIMITS.maxSpringIndex}`,
    margin: springIndex >= ASME_LIMITS.minSpringIndex ? 
      ((ASME_LIMITS.maxSpringIndex - springIndex) / ASME_LIMITS.maxSpringIndex) * 100 : 0,
    recommendation: springIndex < ASME_LIMITS.minSpringIndex ? 
      'Increase mean diameter or decrease wire diameter' : undefined,
  });

  // Active Coils Check
  checks.push({
    name: 'Minimum Active Coils',
    standardRef: 'ASME Spring Design Handbook §3.3',
    description: 'Minimum 3 active coils required',
    status: params.activeCoils >= ASME_LIMITS.minActiveCoils ? 'pass' : 'fail',
    actualValue: params.activeCoils,
    limitValue: `≥ ${ASME_LIMITS.minActiveCoils}`,
    recommendation: params.activeCoils < ASME_LIMITS.minActiveCoils ? 
      'Increase number of active coils' : undefined,
  });

  // Slenderness Ratio Check
  const slenderness = calculateSlendernessRatio(params.freeLength, params.meanDiameter);
  checks.push({
    name: 'Slenderness Ratio (Buckling)',
    standardRef: 'ASME Spring Design Handbook §4.1',
    description: 'L0/D ratio should not exceed 4 to avoid buckling',
    status: slenderness <= ASME_LIMITS.maxSlendernessRatio ? 'pass' : 
      slenderness <= ASME_LIMITS.maxSlendernessRatio * 1.25 ? 'warning' : 'fail',
    actualValue: slenderness.toFixed(2),
    limitValue: `≤ ${ASME_LIMITS.maxSlendernessRatio}`,
    margin: ((ASME_LIMITS.maxSlendernessRatio - slenderness) / ASME_LIMITS.maxSlendernessRatio) * 100,
    recommendation: slenderness > ASME_LIMITS.maxSlendernessRatio ? 
      'Reduce free length or increase mean diameter, or use guided operation' : undefined,
  });

  // Safety Factor Check
  checks.push({
    name: 'Static Safety Factor',
    standardRef: 'ASME Spring Design Handbook §5.2',
    description: 'Minimum safety factor of 1.2 required',
    status: params.safetyFactor >= ASME_LIMITS.minSafetyFactor ? 'pass' :
      params.safetyFactor >= 1.0 ? 'warning' : 'fail',
    actualValue: params.safetyFactor.toFixed(2),
    limitValue: `≥ ${ASME_LIMITS.minSafetyFactor}`,
    margin: ((params.safetyFactor - ASME_LIMITS.minSafetyFactor) / ASME_LIMITS.minSafetyFactor) * 100,
    recommendation: params.safetyFactor < ASME_LIMITS.minSafetyFactor ? 
      'Reduce working stress or use stronger material' : undefined,
  });

  // Stress Ratio Check
  const stressRatio = params.maxStress / ultimateStrength;
  checks.push({
    name: 'Stress Ratio',
    standardRef: 'ASME Spring Design Handbook §5.3',
    description: 'Maximum stress should not exceed 45% of ultimate strength',
    status: stressRatio <= ASME_LIMITS.maxStressRatio ? 'pass' :
      stressRatio <= ASME_LIMITS.maxStressRatio * 1.1 ? 'warning' : 'fail',
    actualValue: `${(stressRatio * 100).toFixed(1)}%`,
    limitValue: `≤ ${ASME_LIMITS.maxStressRatio * 100}%`,
    margin: ((ASME_LIMITS.maxStressRatio - stressRatio) / ASME_LIMITS.maxStressRatio) * 100,
    recommendation: stressRatio > ASME_LIMITS.maxStressRatio ? 
      'Increase wire diameter or reduce load' : undefined,
  });

  // Pitch Angle Check
  const pitchAngle = calculatePitchAngle(
    params.freeLength,
    params.wireDiameter,
    params.totalCoils,
    params.meanDiameter
  );
  checks.push({
    name: 'Pitch Angle',
    standardRef: 'ASME Spring Design Handbook §3.4',
    description: 'Pitch angle should be between 5° and 15°',
    status: pitchAngle >= ASME_LIMITS.minPitchAngle && pitchAngle <= ASME_LIMITS.maxPitchAngle ? 'pass' : 'warning',
    actualValue: `${pitchAngle.toFixed(1)}°`,
    limitValue: `${ASME_LIMITS.minPitchAngle}° - ${ASME_LIMITS.maxPitchAngle}°`,
  });

  return generateCheckResult('ASME', checks);
}

/**
 * Run SAE J157 fatigue safety checks
 */
export function checkSAE_J157(params: SpringCheckParams): StandardCheckResult {
  const checks: StandardCheckItem[] = [];
  const material = getSpringMaterial(params.materialId);
  const enduranceLimit = material?.snCurve?.tau2 ?? 400;
  const yieldStrength = (material?.allowShearStatic ?? 560) * 1.5;

  // Fatigue Safety Factor
  const fatigueSF = enduranceLimit / params.alternatingStress;
  checks.push({
    name: 'Fatigue Safety Factor',
    standardRef: 'SAE J157 §4.1',
    description: 'Minimum fatigue safety factor of 1.1 required',
    status: fatigueSF >= SAE_J157_LIMITS.minFatigueSafetyFactor ? 'pass' :
      fatigueSF >= 1.0 ? 'warning' : 'fail',
    actualValue: fatigueSF.toFixed(2),
    limitValue: `≥ ${SAE_J157_LIMITS.minFatigueSafetyFactor}`,
    margin: ((fatigueSF - SAE_J157_LIMITS.minFatigueSafetyFactor) / SAE_J157_LIMITS.minFatigueSafetyFactor) * 100,
    recommendation: fatigueSF < SAE_J157_LIMITS.minFatigueSafetyFactor ? 
      'Reduce alternating stress or apply shot peening' : undefined,
  });

  // Alternating Stress Ratio
  const altStressRatio = params.alternatingStress / enduranceLimit;
  checks.push({
    name: 'Alternating Stress Ratio',
    standardRef: 'SAE J157 §4.2',
    description: 'Alternating stress should not exceed 50% of endurance limit for infinite life',
    status: altStressRatio <= SAE_J157_LIMITS.maxAlternatingStressRatio ? 'pass' :
      altStressRatio <= 1.0 ? 'warning' : 'fail',
    actualValue: `${(altStressRatio * 100).toFixed(1)}%`,
    limitValue: `≤ ${SAE_J157_LIMITS.maxAlternatingStressRatio * 100}%`,
  });

  // Mean Stress Ratio
  const meanStressRatio = params.meanStress / yieldStrength;
  checks.push({
    name: 'Mean Stress Ratio',
    standardRef: 'SAE J157 §4.3',
    description: 'Mean stress should not exceed 60% of yield strength',
    status: meanStressRatio <= SAE_J157_LIMITS.maxMeanStressRatio ? 'pass' :
      meanStressRatio <= 0.8 ? 'warning' : 'fail',
    actualValue: `${(meanStressRatio * 100).toFixed(1)}%`,
    limitValue: `≤ ${SAE_J157_LIMITS.maxMeanStressRatio * 100}%`,
  });

  // Minimum Cycle Life
  if (params.fatigueLife !== undefined) {
    checks.push({
      name: 'Minimum Fatigue Life',
      standardRef: 'SAE J157 §5.1',
      description: 'Minimum 100,000 cycles required for automotive applications',
      status: params.fatigueLife >= SAE_J157_LIMITS.minCycleLife ? 'pass' : 'fail',
      actualValue: params.fatigueLife.toExponential(2),
      limitValue: `≥ ${SAE_J157_LIMITS.minCycleLife.toExponential(0)}`,
    });
  }

  // Goodman Diagram Check
  const goodmanRatio = params.alternatingStress / enduranceLimit + 
    params.meanStress / (material?.tensileStrength ?? 1800);
  checks.push({
    name: 'Goodman Criterion',
    standardRef: 'SAE J157 §4.4',
    description: 'Combined stress ratio per Goodman diagram should be < 1',
    status: goodmanRatio < 1.0 ? 'pass' : 'fail',
    actualValue: goodmanRatio.toFixed(3),
    limitValue: '< 1.0',
    recommendation: goodmanRatio >= 1.0 ? 
      'Reduce stress amplitude or mean stress' : undefined,
  });

  return generateCheckResult('SAE_J157', checks);
}

/**
 * Run DIN 2089 checks
 */
export function checkDIN_2089(params: SpringCheckParams): StandardCheckResult {
  const checks: StandardCheckItem[] = [];

  // Spring Index Check
  const springIndex = calculateSpringIndex(params.meanDiameter, params.wireDiameter);
  checks.push({
    name: 'Spring Index (Wickelverhältnis)',
    standardRef: 'DIN 2089-1 §5.1',
    description: 'Spring index should be between 4 and 20',
    status: springIndex >= DIN_2089_LIMITS.minSpringIndex && springIndex <= DIN_2089_LIMITS.maxSpringIndex ? 'pass' : 'warning',
    actualValue: springIndex.toFixed(2),
    limitValue: `${DIN_2089_LIMITS.minSpringIndex} - ${DIN_2089_LIMITS.maxSpringIndex}`,
  });

  // Minimum Active Coils
  checks.push({
    name: 'Minimum Active Coils (Federnde Windungen)',
    standardRef: 'DIN 2089-1 §5.2',
    description: 'Minimum 2 active coils required',
    status: params.activeCoils >= DIN_2089_LIMITS.minActiveCoils ? 'pass' : 'fail',
    actualValue: params.activeCoils,
    limitValue: `≥ ${DIN_2089_LIMITS.minActiveCoils}`,
  });

  // Solid Height Clearance
  const solidHeight = params.totalCoils * params.wireDiameter;
  const maxDeflection = params.freeLength - solidHeight;
  const deflectionRatio = maxDeflection / params.freeLength;
  checks.push({
    name: 'Deflection Capacity',
    standardRef: 'DIN 2089-1 §6.1',
    description: 'Maximum deflection should not exceed 85% of available travel',
    status: deflectionRatio <= DIN_2089_LIMITS.maxDeflectionRatio ? 'pass' : 'warning',
    actualValue: `${(deflectionRatio * 100).toFixed(1)}%`,
    limitValue: `≤ ${DIN_2089_LIMITS.maxDeflectionRatio * 100}%`,
  });

  // Tolerance Class Check (assuming Class 2)
  const toleranceClass = 2;
  const springRateTolerance = DIN_2089_LIMITS.toleranceClass[toleranceClass as keyof typeof DIN_2089_LIMITS.toleranceClass];
  checks.push({
    name: 'Spring Rate Tolerance',
    standardRef: 'DIN 2089-2 §3',
    description: `Tolerance Class ${toleranceClass}: ±${springRateTolerance * 100}%`,
    status: 'pass', // Informational
    actualValue: `Class ${toleranceClass}`,
    limitValue: `±${springRateTolerance * 100}%`,
  });

  // End Configuration
  checks.push({
    name: 'End Configuration',
    standardRef: 'DIN 2089-1 §4.2',
    description: 'Ground and closed ends recommended for precision applications',
    status: params.totalCoils > params.activeCoils ? 'pass' : 'warning',
    actualValue: params.totalCoils > params.activeCoils ? 'Closed ends' : 'Open ends',
    limitValue: 'Closed & ground preferred',
  });

  return generateCheckResult('DIN_2089', checks);
}

/**
 * Generate check result summary
 */
function generateCheckResult(standard: StandardType, checks: StandardCheckItem[]): StandardCheckResult {
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  
  const compliancePercent = (passCount / checks.length) * 100;
  
  let overallStatus: CheckStatus;
  if (failCount > 0) {
    overallStatus = 'fail';
  } else if (warningCount > 0) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'pass';
  }

  const summary = overallStatus === 'pass' 
    ? `Design fully complies with ${standard} requirements.`
    : overallStatus === 'warning'
    ? `Design meets ${standard} requirements with ${warningCount} warning(s).`
    : `Design fails ${failCount} ${standard} requirement(s). Review recommendations.`;

  return {
    standard,
    overallStatus,
    checks,
    passCount,
    warningCount,
    failCount,
    compliancePercent,
    summary,
  };
}

/**
 * Run all standard checks
 */
export function runAllStandardChecks(params: SpringCheckParams): {
  asme: StandardCheckResult;
  sae: StandardCheckResult;
  din: StandardCheckResult;
  overallCompliance: CheckStatus;
  summary: string;
} {
  const asme = checkASME(params);
  const sae = checkSAE_J157(params);
  const din = checkDIN_2089(params);

  let overallCompliance: CheckStatus;
  if (asme.overallStatus === 'fail' || sae.overallStatus === 'fail' || din.overallStatus === 'fail') {
    overallCompliance = 'fail';
  } else if (asme.overallStatus === 'warning' || sae.overallStatus === 'warning' || din.overallStatus === 'warning') {
    overallCompliance = 'warning';
  } else {
    overallCompliance = 'pass';
  }

  const summary = `Standards Compliance: ASME ${asme.overallStatus.toUpperCase()}, ` +
    `SAE J157 ${sae.overallStatus.toUpperCase()}, DIN 2089 ${din.overallStatus.toUpperCase()}`;

  return {
    asme,
    sae,
    din,
    overallCompliance,
    summary,
  };
}
