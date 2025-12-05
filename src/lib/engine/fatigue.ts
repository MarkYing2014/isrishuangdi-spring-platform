/**
 * Spring Analysis Engine - Fatigue Module
 * 弹簧分析引擎 - 疲劳模块
 * 
 * S-N curve based fatigue life estimation using Basquin equation
 */

import type { FatigueResult } from './types';
import { 
  getSpringMaterial, 
  type SpringMaterialId,
  type SNcurveData,
} from '@/lib/materials/springMaterials';

/**
 * Basquin equation parameters derived from S-N curve data
 * Basquin 方程参数
 * 
 * S = A × N^(-b)
 * log(N) = log(A)/b - (1/b) × log(S)
 * 
 * Or equivalently: log(N) = C - m × log(S)
 * where C = log(A)/b and m = 1/b
 */
export interface BasquinParameters {
  /** Coefficient A in S = A × N^(-b) */
  A: number;
  /** Exponent b in S = A × N^(-b) */
  b: number;
  /** Slope m = 1/b for log-log plot */
  m: number;
  /** Intercept C = log(A)/b */
  C: number;
}

/**
 * Calculate Basquin parameters from two S-N data points
 * 从两个 S-N 数据点计算 Basquin 参数
 * 
 * Given (N1, S1) and (N2, S2):
 * b = log(S1/S2) / log(N2/N1)
 * A = S1 × N1^b
 */
export function calculateBasquinParameters(snCurve: SNcurveData): BasquinParameters {
  const { N1, tau1, N2, tau2 } = snCurve;
  
  // Calculate exponent b
  const b = Math.log(tau1 / tau2) / Math.log(N2 / N1);
  
  // Calculate coefficient A
  const A = tau1 * Math.pow(N1, b);
  
  // Calculate slope and intercept for log-log form
  const m = 1 / b;
  const C = Math.log10(A) / b;
  
  return { A, b, m, C };
}

/**
 * Estimate fatigue life using Basquin equation
 * 使用 Basquin 方程估算疲劳寿命
 * 
 * N = (A / S)^(1/b)
 * 
 * @param stressAmplitude Alternating stress amplitude (MPa)
 * @param basquin Basquin parameters
 * @returns Estimated cycles to failure
 */
export function estimateCyclesFromBasquin(
  stressAmplitude: number,
  basquin: BasquinParameters
): number {
  if (stressAmplitude <= 0) {
    return Infinity;
  }
  return Math.pow(basquin.A / stressAmplitude, 1 / basquin.b);
}

/**
 * Apply Goodman mean stress correction
 * 应用 Goodman 平均应力修正
 * 
 * σ_a_eff = σ_a / (1 - σ_m / σ_uts)
 * 
 * @param stressAmplitude Alternating stress amplitude (MPa)
 * @param stressMean Mean stress (MPa)
 * @param ultimateStrength Ultimate tensile strength (MPa)
 * @returns Effective alternating stress (MPa)
 */
export function applyGoodmanCorrection(
  stressAmplitude: number,
  stressMean: number,
  ultimateStrength: number
): number {
  // Limit mean stress ratio to avoid division issues
  const meanRatio = Math.min(stressMean / ultimateStrength, 0.9);
  return stressAmplitude / (1 - meanRatio);
}

/**
 * Apply Gerber mean stress correction (less conservative than Goodman)
 * 应用 Gerber 平均应力修正
 * 
 * σ_a_eff = σ_a / (1 - (σ_m / σ_uts)²)
 */
export function applyGerberCorrection(
  stressAmplitude: number,
  stressMean: number,
  ultimateStrength: number
): number {
  const meanRatio = Math.min(stressMean / ultimateStrength, 0.95);
  return stressAmplitude / (1 - meanRatio * meanRatio);
}

/**
 * Generate S-N curve data points for plotting
 * 生成 S-N 曲线数据点用于绘图
 */
export function generateSNCurveData(
  basquin: BasquinParameters,
  minCycles: number = 1e3,
  maxCycles: number = 1e8,
  numPoints: number = 50
): Array<{ cycles: number; stress: number }> {
  const points: Array<{ cycles: number; stress: number }> = [];
  
  const logMin = Math.log10(minCycles);
  const logMax = Math.log10(maxCycles);
  const logStep = (logMax - logMin) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const logN = logMin + i * logStep;
    const N = Math.pow(10, logN);
    const S = basquin.A * Math.pow(N, -basquin.b);
    points.push({ cycles: N, stress: S });
  }
  
  return points;
}

/**
 * Get fatigue rating based on estimated cycles
 * 根据估算循环次数获取疲劳等级
 */
export function getFatigueRating(
  estimatedCycles: number
): {
  rating: FatigueResult['rating'];
  message: { en: string; zh: string };
} {
  if (!isFinite(estimatedCycles) || estimatedCycles >= 1e7) {
    return {
      rating: 'infinite',
      message: { en: 'Infinite Life (N ≥ 10⁷)', zh: '无限寿命 (N ≥ 10⁷)' },
    };
  } else if (estimatedCycles >= 1e6) {
    return {
      rating: 'high',
      message: { en: 'High Cycle (10⁶ ≤ N < 10⁷)', zh: '高周疲劳 (10⁶ ≤ N < 10⁷)' },
    };
  } else if (estimatedCycles >= 1e5) {
    return {
      rating: 'medium',
      message: { en: 'Medium Cycle (10⁵ ≤ N < 10⁶)', zh: '中周疲劳 (10⁵ ≤ N < 10⁶)' },
    };
  } else if (estimatedCycles >= 1e4) {
    return {
      rating: 'low',
      message: { en: 'Low Cycle (10⁴ ≤ N < 10⁵)', zh: '低周疲劳 (10⁴ ≤ N < 10⁵)' },
    };
  } else {
    return {
      rating: 'very_low',
      message: { en: 'Very Low Cycle (N < 10⁴)', zh: '极低周疲劳 (N < 10⁴)' },
    };
  }
}

/**
 * Calculate complete fatigue analysis
 * 计算完整疲劳分析
 */
export function calculateFatigue(
  materialId: SpringMaterialId,
  stressMax: number,
  stressMin: number,
  correctionMethod: 'goodman' | 'gerber' = 'goodman'
): FatigueResult {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  // Calculate stress parameters
  const tauMean = (stressMax + stressMin) / 2;
  const tauAlt = (stressMax - stressMin) / 2;
  const stressRatio = stressMin / stressMax;

  // Get Basquin parameters
  const basquin = calculateBasquinParameters(material.snCurve);

  // Apply mean stress correction
  const ultimateStrength = material.tensileStrength ?? material.allowShearStatic * 2;
  const tauAltEffective = correctionMethod === 'goodman'
    ? applyGoodmanCorrection(tauAlt, tauMean, ultimateStrength)
    : applyGerberCorrection(tauAlt, tauMean, ultimateStrength);

  // Estimate fatigue life
  let estimatedCycles: number;
  
  if (tauAltEffective <= 0) {
    estimatedCycles = Infinity;
  } else if (tauAltEffective >= material.snCurve.tau1) {
    // Very high stress - extrapolate below N1
    estimatedCycles = Math.max(estimateCyclesFromBasquin(tauAltEffective, basquin), 100);
  } else if (tauAltEffective <= material.snCurve.tau2) {
    // Below endurance limit - infinite life
    estimatedCycles = Infinity;
  } else {
    // Interpolate on S-N curve
    estimatedCycles = estimateCyclesFromBasquin(tauAltEffective, basquin);
  }

  // Calculate safety factor for infinite life
  const infiniteLifeSafetyFactor = material.snCurve.tau2 / (tauAltEffective || 1);

  // Get rating
  const { rating, message } = getFatigueRating(estimatedCycles);

  // Generate S-N curve data for plotting
  const snCurveData = generateSNCurveData(basquin);

  return {
    tauMean,
    tauAlt,
    stressRatio,
    estimatedCycles: isFinite(estimatedCycles) ? Math.round(estimatedCycles) : Infinity,
    infiniteLifeSafetyFactor,
    rating,
    message,
    snCurveData,
  };
}

/**
 * Calculate required stress amplitude for target life
 * 计算目标寿命所需的应力幅值
 */
export function calculateRequiredStressForLife(
  materialId: SpringMaterialId,
  targetCycles: number
): number {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const basquin = calculateBasquinParameters(material.snCurve);
  return basquin.A * Math.pow(targetCycles, -basquin.b);
}
