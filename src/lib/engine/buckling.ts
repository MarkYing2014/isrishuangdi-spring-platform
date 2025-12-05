/**
 * Spring Analysis Engine - Buckling Module (Pro)
 * 弹簧分析引擎 - 屈曲模块（专业版）
 * 
 * Critical buckling analysis for compression springs
 * Includes Wahl curvature effect and load eccentricity
 */

import type { BucklingResult, CompressionSpringGeometry } from './types';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

const PI = Math.PI;

/**
 * End condition factors for buckling analysis
 * 端部条件系数
 */
export const END_CONDITION_FACTORS = {
  /** Both ends fixed (ground and squared) */
  FIXED_FIXED: 0.5,
  /** One end fixed, one end free */
  FIXED_FREE: 2.0,
  /** Both ends pinned */
  PINNED_PINNED: 1.0,
  /** One end fixed, one end guided */
  FIXED_GUIDED: 0.7,
};

/**
 * Extended buckling result with Pro features
 */
export interface BucklingResultPro extends BucklingResult {
  /** End condition coefficient Ke */
  endConditionCoefficient: number;
  /** Curvature correction factor Kc */
  curvatureCorrectionFactor: number;
  /** Load eccentricity factor */
  eccentricityFactor: number;
  /** Modified critical load (with corrections) */
  modifiedCriticalLoad: number;
  /** Buckling risk zone start deflection */
  riskZoneStartDeflection?: number;
  /** Buckling mode shape */
  bucklingMode: 'lateral' | 'torsional' | 'combined';
}

/**
 * Calculate Wahl curvature correction for buckling
 * 计算屈曲的 Wahl 曲率修正
 * 
 * Kc = 1 - 0.1 × (1/C) where C = Dm/d
 */
export function calculateCurvatureCorrectionFactor(
  meanDiameter: number,
  wireDiameter: number
): number {
  const C = meanDiameter / wireDiameter;
  // Curvature reduces effective stiffness
  const Kc = 1 - 0.1 / C;
  return Math.max(0.85, Math.min(1.0, Kc));
}

/**
 * Calculate load eccentricity factor
 * 计算载荷偏心系数
 * 
 * Eccentricity increases buckling risk
 */
export function calculateEccentricityFactor(
  eccentricityRatio: number = 0 // e/Dm ratio
): number {
  // Secant formula approximation
  // Ke = 1 / (1 + e/r × sec(π/2 × √(P/Pcr)))
  // Simplified: Ke ≈ 1 - 2 × (e/Dm)
  return Math.max(0.7, 1 - 2 * eccentricityRatio);
}

/**
 * Calculate slenderness ratio
 * 计算细长比
 * 
 * λ = L0 / Dm
 */
export function calculateSlendernessRatio(
  freeLength: number,
  meanDiameter: number
): number {
  return freeLength / meanDiameter;
}

/**
 * Calculate critical buckling load using Euler formula
 * 使用欧拉公式计算临界屈曲载荷
 * 
 * P_cr = π² × E × I / L_eff²
 * 
 * where:
 * - E = elastic modulus
 * - I = moment of inertia of wire = π × d⁴ / 64
 * - L_eff = effective length = k × L0 (k depends on end conditions)
 */
export function calculateEulerBucklingLoad(
  elasticModulus: number,
  wireDiameter: number,
  freeLength: number,
  endConditionFactor: number = END_CONDITION_FACTORS.FIXED_FIXED
): number {
  // Moment of inertia for round wire
  const I = (PI * Math.pow(wireDiameter, 4)) / 64;
  
  // Effective length
  const Leff = endConditionFactor * freeLength;
  
  // Euler critical load
  const Pcr = (PI * PI * elasticModulus * I) / (Leff * Leff);
  
  return Pcr;
}

/**
 * Calculate critical buckling load using modified Haringx formula
 * 使用修正 Haringx 公式计算临界屈曲载荷
 * 
 * This is more accurate for helical springs as it accounts for
 * the spring's shear flexibility
 * 
 * P_cr = (π² × E × I × n) / (L0² × α²)
 * 
 * where α depends on end conditions and spring geometry
 */
export function calculateHaringxBucklingLoad(
  geometry: CompressionSpringGeometry,
  elasticModulus: number,
  shearModulus: number,
  endConditionFactor: number = END_CONDITION_FACTORS.FIXED_FIXED
): number {
  const { wireDiameter, meanDiameter, activeCoils, freeLength } = geometry;
  
  // Spring index
  const C = meanDiameter / wireDiameter;
  
  // Moment of inertia
  const I = (PI * Math.pow(wireDiameter, 4)) / 64;
  
  // Effective number of coils for buckling
  const n = activeCoils;
  
  // Helix angle factor
  const alpha = PI * meanDiameter * n / freeLength;
  
  // Shear correction factor
  const Ks = 1 + 2 / (C * C);
  
  // Modified critical load
  const Pcr = (PI * PI * elasticModulus * I * n) / 
              (freeLength * freeLength * endConditionFactor * endConditionFactor * Ks);
  
  return Pcr;
}

/**
 * Calculate critical deflection at which buckling occurs
 * 计算发生屈曲的临界压缩量
 * 
 * For compression springs, buckling typically occurs when:
 * - Slenderness ratio λ > 4 (approximately)
 * - Deflection exceeds critical value
 */
export function calculateCriticalDeflection(
  freeLength: number,
  meanDiameter: number,
  endConditionFactor: number = END_CONDITION_FACTORS.FIXED_FIXED
): number {
  const lambda = freeLength / meanDiameter;
  
  // Empirical formula for critical deflection ratio
  // Based on spring design handbooks
  const criticalRatio = 0.812 * Math.sqrt(1 - (endConditionFactor * PI / lambda) ** 2);
  
  // If lambda is too small, no buckling
  if (lambda <= endConditionFactor * PI) {
    return freeLength; // Can compress fully without buckling
  }
  
  return freeLength * criticalRatio;
}

/**
 * Check if spring is at risk of buckling
 * 检查弹簧是否有屈曲风险
 */
export function checkBucklingRisk(
  slendernessRatio: number,
  endConditionFactor: number = END_CONDITION_FACTORS.FIXED_FIXED
): {
  atRisk: boolean;
  criticalSlenderness: number;
  recommendations: string[];
} {
  // Critical slenderness ratio depends on end conditions
  // For fixed-fixed: λ_cr ≈ 4
  // For fixed-free: λ_cr ≈ 2
  const criticalSlenderness = 4 / endConditionFactor;
  
  const atRisk = slendernessRatio > criticalSlenderness;
  
  const recommendations: string[] = [];
  if (atRisk) {
    recommendations.push('Consider using a guide rod or tube to prevent buckling');
    recommendations.push('Reduce free length or increase mean diameter');
    recommendations.push('Use nested springs (one inside another)');
    recommendations.push('Change end conditions to increase stability');
  }
  
  return {
    atRisk,
    criticalSlenderness,
    recommendations,
  };
}

/**
 * Calculate complete buckling analysis
 * 计算完整屈曲分析
 */
export function calculateBuckling(
  geometry: CompressionSpringGeometry,
  workingLoad: number,
  endConditionFactor: number = END_CONDITION_FACTORS.FIXED_FIXED
): BucklingResult {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter, freeLength } = geometry;
  const elasticModulus = material.elasticModulus ?? 207000; // Default for steel

  // Calculate slenderness ratio
  const slendernessRatio = calculateSlendernessRatio(freeLength, meanDiameter);

  // Calculate critical buckling load
  const criticalLoad = calculateEulerBucklingLoad(
    elasticModulus,
    wireDiameter,
    freeLength,
    endConditionFactor
  );

  // Calculate buckling safety factor
  const bucklingSafetyFactor = criticalLoad / workingLoad;

  // Check risk and get recommendations
  const { atRisk, recommendations } = checkBucklingRisk(slendernessRatio, endConditionFactor);

  // Determine status
  let status: BucklingResult['status'];
  let message: { en: string; zh: string };

  if (bucklingSafetyFactor >= 2.0 && !atRisk) {
    status = 'safe';
    message = {
      en: 'No buckling risk (SF ≥ 2.0)',
      zh: '无屈曲风险 (SF ≥ 2.0)',
    };
  } else if (bucklingSafetyFactor >= 1.5) {
    status = 'warning';
    message = {
      en: 'Marginal buckling safety (1.5 ≤ SF < 2.0)',
      zh: '屈曲安全临界 (1.5 ≤ SF < 2.0)',
    };
  } else {
    status = 'danger';
    message = {
      en: 'High buckling risk (SF < 1.5)',
      zh: '高屈曲风险 (SF < 1.5)',
    };
  }

  return {
    slendernessRatio,
    criticalLoad,
    workingLoad,
    bucklingSafetyFactor,
    status,
    message,
    recommendations: status !== 'safe' ? recommendations : undefined,
  };
}

/**
 * Calculate buckling curve for plotting
 * 计算屈曲曲线用于绘图
 * 
 * Returns deflection vs. critical load curve
 */
export function generateBucklingCurve(
  geometry: CompressionSpringGeometry,
  springRate: number,
  numPoints: number = 20
): Array<{ deflection: number; load: number; criticalLoad: number; safe: boolean }> {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, freeLength } = geometry;
  const totalCoils = geometry.totalCoils ?? geometry.activeCoils + 2;
  const solidHeight = totalCoils * wireDiameter;
  const maxDeflection = freeLength - solidHeight;
  const elasticModulus = material.elasticModulus ?? 207000;

  const points: Array<{ deflection: number; load: number; criticalLoad: number; safe: boolean }> = [];

  for (let i = 0; i <= numPoints; i++) {
    const deflection = (maxDeflection * i) / numPoints;
    const currentLength = freeLength - deflection;
    const load = springRate * deflection;

    // Recalculate critical load for current compressed length
    const criticalLoad = calculateEulerBucklingLoad(
      elasticModulus,
      wireDiameter,
      currentLength,
      END_CONDITION_FACTORS.FIXED_FIXED
    );

    points.push({
      deflection,
      load,
      criticalLoad,
      safe: load < criticalLoad,
    });
  }

  return points;
}

/**
 * Calculate Pro buckling analysis with Wahl correction and eccentricity
 * 计算专业版屈曲分析（含 Wahl 修正和偏心）
 * 
 * P_cr_mod = P_cr × Ke × Kc × Kecc
 */
export function calculateBucklingPro(
  geometry: CompressionSpringGeometry,
  workingLoad: number,
  springRate: number,
  endConditionFactor: number = END_CONDITION_FACTORS.FIXED_FIXED,
  eccentricityRatio: number = 0
): BucklingResultPro {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter, freeLength } = geometry;
  const elasticModulus = material.elasticModulus ?? 207000;

  // Calculate base buckling load
  const baseCriticalLoad = calculateEulerBucklingLoad(
    elasticModulus,
    wireDiameter,
    freeLength,
    endConditionFactor
  );

  // Calculate correction factors
  const Kc = calculateCurvatureCorrectionFactor(meanDiameter, wireDiameter);
  const Kecc = calculateEccentricityFactor(eccentricityRatio);

  // Modified critical load
  const modifiedCriticalLoad = baseCriticalLoad * Kc * Kecc;

  // Calculate slenderness ratio
  const slendernessRatio = calculateSlendernessRatio(freeLength, meanDiameter);

  // Calculate buckling safety factor using modified load
  const bucklingSafetyFactor = modifiedCriticalLoad / workingLoad;

  // Determine buckling mode
  let bucklingMode: 'lateral' | 'torsional' | 'combined';
  const C = meanDiameter / wireDiameter;
  if (slendernessRatio > 5 && C > 8) {
    bucklingMode = 'lateral';
  } else if (slendernessRatio < 3) {
    bucklingMode = 'torsional';
  } else {
    bucklingMode = 'combined';
  }

  // Calculate risk zone start deflection
  let riskZoneStartDeflection: number | undefined;
  if (bucklingSafetyFactor < 2.0) {
    // Find deflection where SF drops below 1.5
    const targetLoad = modifiedCriticalLoad / 1.5;
    riskZoneStartDeflection = targetLoad / springRate;
  }

  // Check risk and get recommendations
  const { atRisk, recommendations } = checkBucklingRisk(slendernessRatio, endConditionFactor);

  // Determine status
  let status: BucklingResult['status'];
  let message: { en: string; zh: string };

  if (bucklingSafetyFactor >= 2.0 && !atRisk) {
    status = 'safe';
    message = {
      en: `No buckling risk (SF = ${bucklingSafetyFactor.toFixed(2)} ≥ 2.0). Mode: ${bucklingMode}`,
      zh: `无屈曲风险 (SF = ${bucklingSafetyFactor.toFixed(2)} ≥ 2.0)。模式：${bucklingMode === 'lateral' ? '横向' : bucklingMode === 'torsional' ? '扭转' : '组合'}`,
    };
  } else if (bucklingSafetyFactor >= 1.5) {
    status = 'warning';
    message = {
      en: `Marginal buckling safety (SF = ${bucklingSafetyFactor.toFixed(2)}). Kc = ${Kc.toFixed(3)}, Kecc = ${Kecc.toFixed(3)}`,
      zh: `屈曲安全临界 (SF = ${bucklingSafetyFactor.toFixed(2)})。Kc = ${Kc.toFixed(3)}，Kecc = ${Kecc.toFixed(3)}`,
    };
  } else {
    status = 'danger';
    message = {
      en: `HIGH BUCKLING RISK (SF = ${bucklingSafetyFactor.toFixed(2)} < 1.5). Risk zone starts at Δx = ${riskZoneStartDeflection?.toFixed(1) ?? 'N/A'} mm`,
      zh: `高屈曲风险 (SF = ${bucklingSafetyFactor.toFixed(2)} < 1.5)。风险区从 Δx = ${riskZoneStartDeflection?.toFixed(1) ?? 'N/A'} mm 开始`,
    };
  }

  return {
    slendernessRatio,
    criticalLoad: baseCriticalLoad,
    workingLoad,
    bucklingSafetyFactor,
    status,
    message,
    recommendations: status !== 'safe' ? recommendations : undefined,
    endConditionCoefficient: endConditionFactor,
    curvatureCorrectionFactor: Kc,
    eccentricityFactor: Kecc,
    modifiedCriticalLoad,
    riskZoneStartDeflection,
    bucklingMode,
  };
}

/**
 * Generate buckling safety factor vs deflection curve
 * 生成屈曲安全系数与位移关系曲线
 */
export function generateBucklingSafetyFactorCurve(
  geometry: CompressionSpringGeometry,
  springRate: number,
  numPoints: number = 50
): Array<{
  deflection: number;
  load: number;
  safetyFactor: number;
  inRiskZone: boolean;
}> {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter, freeLength } = geometry;
  const totalCoils = geometry.totalCoils ?? geometry.activeCoils + 2;
  const solidHeight = totalCoils * wireDiameter;
  const maxDeflection = freeLength - solidHeight;
  const elasticModulus = material.elasticModulus ?? 207000;

  const Kc = calculateCurvatureCorrectionFactor(meanDiameter, wireDiameter);

  const points: Array<{
    deflection: number;
    load: number;
    safetyFactor: number;
    inRiskZone: boolean;
  }> = [];

  for (let i = 0; i <= numPoints; i++) {
    const deflection = (maxDeflection * i) / numPoints;
    const currentLength = freeLength - deflection;
    const load = springRate * deflection;

    // Critical load at current length with corrections
    const baseCriticalLoad = calculateEulerBucklingLoad(
      elasticModulus,
      wireDiameter,
      currentLength,
      END_CONDITION_FACTORS.FIXED_FIXED
    );
    const modifiedCriticalLoad = baseCriticalLoad * Kc;

    const safetyFactor = load > 0 ? modifiedCriticalLoad / load : Infinity;

    points.push({
      deflection,
      load,
      safetyFactor: Math.min(safetyFactor, 10), // Cap for plotting
      inRiskZone: safetyFactor < 1.5,
    });
  }

  return points;
}
