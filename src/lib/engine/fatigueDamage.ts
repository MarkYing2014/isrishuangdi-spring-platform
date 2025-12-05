/**
 * Spring Analysis Engine - Fatigue Damage Model
 * 弹簧分析引擎 - 疲劳损伤模型
 * 
 * Computes damage index D(θ) for fatigue hot-spot visualization
 * using Miner's rule and local stress analysis
 */

import type { StressSamplePoint, StressDistributionResult } from './stressDistribution';
import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Fatigue damage point
 */
export interface FatigueDamagePoint extends StressSamplePoint {
  /** Damage index D = ni / Ni */
  damageIndex: number;
  /** Local fatigue life Ni (cycles) */
  localFatigueLife: number;
  /** Applied cycles ni */
  appliedCycles: number;
  /** Damage category */
  damageCategory: 'safe' | 'moderate' | 'high' | 'failure';
  /** Damage color RGB */
  damageColor: [number, number, number];
  /** Local safety factor */
  localSafetyFactor: number;
}

/**
 * Fatigue damage result
 */
export interface FatigueDamageResult {
  /** All damage points */
  points: FatigueDamagePoint[];
  /** Maximum damage index */
  maxDamageIndex: number;
  /** Minimum damage index */
  minDamageIndex: number;
  /** Average damage index */
  avgDamageIndex: number;
  /** Miner sum (total accumulated damage) */
  minerSum: number;
  /** High damage zone count (D > 0.5) */
  highDamageZoneCount: number;
  /** Failure predicted zones (D > 1.0) */
  failurePredictedCount: number;
  /** Critical damage locations */
  criticalLocations: Array<{
    theta: number;
    coilNumber: number;
    damageIndex: number;
    fatigueLife: number;
    position: [number, number, number];
  }>;
  /** Overall fatigue status */
  status: 'safe' | 'warning' | 'danger' | 'failure';
  /** Status message */
  message: { en: string; zh: string };
}

/**
 * Damage color thresholds
 */
export const DAMAGE_THRESHOLDS = {
  SAFE_MAX: 0.3,      // D < 0.3: safe (green)
  MODERATE_MAX: 0.5,  // D < 0.5: moderate (yellow)
  HIGH_MAX: 1.0,      // D < 1.0: high damage (orange)
  // D >= 1.0: failure predicted (dark red)
};

/**
 * Get damage color for damage index
 */
export function getDamageColor(damageIndex: number): {
  category: 'safe' | 'moderate' | 'high' | 'failure';
  rgb: [number, number, number];
} {
  if (damageIndex < DAMAGE_THRESHOLDS.SAFE_MAX) {
    // Safe: green
    const t = damageIndex / DAMAGE_THRESHOLDS.SAFE_MAX;
    return {
      category: 'safe',
      rgb: [t * 0.3, 0.8 - t * 0.2, 0.2],
    };
  } else if (damageIndex < DAMAGE_THRESHOLDS.MODERATE_MAX) {
    // Moderate: yellow
    const t = (damageIndex - DAMAGE_THRESHOLDS.SAFE_MAX) / 
              (DAMAGE_THRESHOLDS.MODERATE_MAX - DAMAGE_THRESHOLDS.SAFE_MAX);
    return {
      category: 'moderate',
      rgb: [0.9, 0.8 - t * 0.3, 0.1],
    };
  } else if (damageIndex < DAMAGE_THRESHOLDS.HIGH_MAX) {
    // High damage: orange to red
    const t = (damageIndex - DAMAGE_THRESHOLDS.MODERATE_MAX) / 
              (DAMAGE_THRESHOLDS.HIGH_MAX - DAMAGE_THRESHOLDS.MODERATE_MAX);
    return {
      category: 'high',
      rgb: [1, 0.5 - t * 0.3, 0],
    };
  } else {
    // Failure predicted: dark red with pulse effect
    const t = Math.min(1, (damageIndex - 1) / 0.5);
    return {
      category: 'failure',
      rgb: [0.7 + t * 0.3, 0, 0],
    };
  }
}

/**
 * Calculate local fatigue life using Basquin equation
 * N = (τ_e / τ_a)^(1/b)
 * 
 * With Goodman correction for mean stress
 */
export function calculateLocalFatigueLife(
  stressAmplitude: number,
  meanStress: number,
  materialId: SpringMaterialId
): number {
  const material = getSpringMaterial(materialId);
  if (!material) return 1e9;
  
  const { snCurve, tensileStrength } = material;
  const Su = tensileStrength ?? 1500; // Ultimate strength
  
  // Goodman correction: τ_a_corrected = τ_a / (1 - τ_m / Su)
  const goodmanFactor = 1 - meanStress / Su;
  if (goodmanFactor <= 0) return 1; // Immediate failure
  
  const correctedAmplitude = stressAmplitude / goodmanFactor;
  
  // Basquin equation: N = (τ_e / τ_a)^(1/b)
  // Using S-N curve data to determine b
  const { N1, tau1, N2, tau2 } = snCurve;
  const b = Math.log(tau1 / tau2) / Math.log(N2 / N1);
  
  // Endurance limit (at N2 cycles)
  const enduranceLimit = tau2;
  
  if (correctedAmplitude <= enduranceLimit) {
    return 1e9; // Infinite life
  }
  
  // Calculate fatigue life
  const N = N2 * Math.pow(enduranceLimit / correctedAmplitude, 1 / b);
  
  return Math.max(1, Math.min(N, 1e9));
}

/**
 * Calculate fatigue damage distribution
 */
export function calculateFatigueDamage(
  stressDistribution: StressDistributionResult,
  materialId: SpringMaterialId,
  appliedCycles: number,
  minStress: number,
  maxStress: number
): FatigueDamageResult {
  const damagePoints: FatigueDamagePoint[] = [];
  
  // Calculate stress amplitude and mean
  const stressAmplitude = (maxStress - minStress) / 2;
  const meanStress = (maxStress + minStress) / 2;
  
  let totalDamage = 0;
  let highDamageZoneCount = 0;
  let failurePredictedCount = 0;
  const criticalLocations: FatigueDamageResult['criticalLocations'] = [];
  
  for (const point of stressDistribution.points) {
    // Scale stress amplitude by local normalized stress
    const localAmplitude = stressAmplitude * point.normalizedStress;
    const localMean = meanStress * point.normalizedStress;
    
    // Calculate local fatigue life
    const localFatigueLife = calculateLocalFatigueLife(localAmplitude, localMean, materialId);
    
    // Calculate damage index D = ni / Ni
    const damageIndex = appliedCycles / localFatigueLife;
    
    // Get damage color
    const { category, rgb } = getDamageColor(damageIndex);
    
    // Calculate local safety factor
    const localSafetyFactor = localFatigueLife / appliedCycles;
    
    const damagePoint: FatigueDamagePoint = {
      ...point,
      damageIndex,
      localFatigueLife,
      appliedCycles,
      damageCategory: category,
      damageColor: rgb,
      localSafetyFactor,
    };
    
    damagePoints.push(damagePoint);
    totalDamage += damageIndex;
    
    // Track high damage and failure zones
    if (damageIndex > 0.5) {
      highDamageZoneCount++;
    }
    if (damageIndex >= 1.0) {
      failurePredictedCount++;
      criticalLocations.push({
        theta: point.theta,
        coilNumber: point.coilNumber,
        damageIndex,
        fatigueLife: localFatigueLife,
        position: point.position,
      });
    }
  }
  
  // Calculate statistics
  const damageIndices = damagePoints.map(p => p.damageIndex);
  const maxDamageIndex = Math.max(...damageIndices);
  const minDamageIndex = Math.min(...damageIndices);
  const avgDamageIndex = damageIndices.reduce((a, b) => a + b, 0) / damageIndices.length;
  const minerSum = totalDamage / damagePoints.length; // Average Miner sum
  
  // Determine overall status
  let status: FatigueDamageResult['status'];
  let message: { en: string; zh: string };
  
  if (failurePredictedCount > 0) {
    status = 'failure';
    message = {
      en: `FAILURE PREDICTED: ${failurePredictedCount} locations exceed damage limit (D ≥ 1.0)`,
      zh: `预测失效：${failurePredictedCount} 个位置超过损伤极限 (D ≥ 1.0)`,
    };
  } else if (highDamageZoneCount > 0 || maxDamageIndex > 0.5) {
    status = 'danger';
    message = {
      en: `HIGH DAMAGE RISK: ${highDamageZoneCount} high damage zones detected (D > 0.5)`,
      zh: `高损伤风险：检测到 ${highDamageZoneCount} 个高损伤区域 (D > 0.5)`,
    };
  } else if (maxDamageIndex > 0.3) {
    status = 'warning';
    message = {
      en: `Moderate fatigue damage accumulation (max D = ${maxDamageIndex.toFixed(3)})`,
      zh: `中等疲劳损伤累积 (最大 D = ${maxDamageIndex.toFixed(3)})`,
    };
  } else {
    status = 'safe';
    message = {
      en: `Fatigue damage within safe limits (max D = ${maxDamageIndex.toFixed(3)})`,
      zh: `疲劳损伤在安全范围内 (最大 D = ${maxDamageIndex.toFixed(3)})`,
    };
  }
  
  return {
    points: damagePoints,
    maxDamageIndex,
    minDamageIndex,
    avgDamageIndex,
    minerSum,
    highDamageZoneCount,
    failurePredictedCount,
    criticalLocations,
    status,
    message,
  };
}

/**
 * Generate damage vertex colors for Three.js
 */
export function generateDamageVertexColors(
  damageResult: FatigueDamageResult,
  pulsePhase: number = 0 // 0-1 for animation
): Float32Array {
  const colors = new Float32Array(damageResult.points.length * 3);
  
  for (let i = 0; i < damageResult.points.length; i++) {
    const point = damageResult.points[i];
    let [r, g, b] = point.damageColor;
    
    // Add pulse effect for failure zones
    if (point.damageCategory === 'failure') {
      const pulse = 0.3 * Math.sin(pulsePhase * Math.PI * 2);
      r = Math.min(1, r + pulse);
    }
    
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }
  
  return colors;
}

/**
 * Get tooltip data for a damage point
 */
export function getDamagePointTooltip(
  point: FatigueDamagePoint,
  language: 'en' | 'zh' = 'en'
): string {
  if (language === 'zh') {
    return `位置: θ = ${(point.theta * 180 / Math.PI).toFixed(1)}°, 圈数 = ${point.coilNumber.toFixed(2)}
局部应力: ${point.localStress.toFixed(1)} MPa
疲劳寿命: ${point.localFatigueLife > 1e8 ? '∞' : point.localFatigueLife.toExponential(2)} 次
损伤指数: ${point.damageIndex.toFixed(4)}
安全系数: ${point.localSafetyFactor > 100 ? '>100' : point.localSafetyFactor.toFixed(2)}`;
  }
  
  return `Location: θ = ${(point.theta * 180 / Math.PI).toFixed(1)}°, Coil = ${point.coilNumber.toFixed(2)}
Local Stress: ${point.localStress.toFixed(1)} MPa
Fatigue Life: ${point.localFatigueLife > 1e8 ? '∞' : point.localFatigueLife.toExponential(2)} cycles
Damage Index: ${point.damageIndex.toFixed(4)}
Safety Factor: ${point.localSafetyFactor > 100 ? '>100' : point.localSafetyFactor.toFixed(2)}`;
}
