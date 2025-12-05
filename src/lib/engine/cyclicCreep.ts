/**
 * Spring Analysis Engine - Cyclic Creep Model
 * 弹簧分析引擎 - 循环蠕变模型
 * 
 * Calculates creep under cyclic loading conditions
 * ε_creep_cyclic = ∫ (A * σ^n) dt
 */

import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Cyclic creep parameters
 */
export interface CyclicCreepParams {
  /** Creep coefficient A */
  A: number;
  /** Stress exponent n */
  n: number;
  /** Temperature activation energy Q (J/mol) */
  Q: number;
  /** Reference temperature (K) */
  T_ref: number;
}

/**
 * Cyclic creep result
 */
export interface CyclicCreepResult {
  /** Total creep strain */
  totalCreepStrain: number;
  /** Creep strain rate (per hour) */
  creepStrainRate: number;
  /** Dimensional drift (mm) */
  dimensionalDrift: number;
  /** Drift rate (mm/1000 hours) */
  driftRate: number;
  /** Time to threshold (hours) */
  timeToThreshold: number;
  /** Recommended maintenance interval (hours) */
  maintenanceInterval: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Service stability rating */
  stabilityRating: number; // 0-100
  /** Message */
  message: { en: string; zh: string };
}

/**
 * Cyclic creep parameters by material
 */
export const CYCLIC_CREEP_PARAMS: Record<string, CyclicCreepParams> = {
  music_wire_a228: {
    A: 1e-20,
    n: 4.5,
    Q: 280000,
    T_ref: 293,
  },
  oil_tempered: {
    A: 2e-20,
    n: 4.2,
    Q: 270000,
    T_ref: 293,
  },
  chrome_silicon: {
    A: 0.5e-20,
    n: 5.0,
    Q: 300000,
    T_ref: 293,
  },
  chrome_vanadium: {
    A: 0.8e-20,
    n: 4.8,
    Q: 290000,
    T_ref: 293,
  },
  ss_302: {
    A: 3e-20,
    n: 3.8,
    Q: 250000,
    T_ref: 293,
  },
};

/**
 * Get cyclic creep parameters
 */
export function getCyclicCreepParams(materialId: SpringMaterialId): CyclicCreepParams {
  return CYCLIC_CREEP_PARAMS[materialId] ?? {
    A: 1e-20,
    n: 4.5,
    Q: 280000,
    T_ref: 293,
  };
}

/**
 * Calculate creep strain rate
 * ε̇ = A * σ^n * exp(-Q/RT)
 */
export function calculateCreepStrainRate(
  stress: number, // MPa
  temperature: number, // °C
  params: CyclicCreepParams
): number {
  const { A, n, Q, T_ref } = params;
  const R = 8.314; // Gas constant
  const T_K = temperature + 273.15;
  
  // Arrhenius temperature factor
  const tempFactor = Math.exp(-Q / (R * T_K) + Q / (R * T_ref));
  
  // Creep strain rate (per hour)
  const strainRate = A * Math.pow(stress, n) * tempFactor;
  
  return strainRate;
}

/**
 * Calculate cyclic creep under repeated loading
 */
export function calculateCyclicCreep(
  maxStress: number, // MPa
  minStress: number, // MPa
  temperature: number, // °C
  operatingHours: number,
  cyclesPerHour: number,
  freeLength: number, // mm
  materialId: SpringMaterialId,
  creepThreshold: number = 0.002 // 0.2% strain threshold
): CyclicCreepResult {
  const params = getCyclicCreepParams(materialId);
  
  // Average stress for creep calculation
  const avgStress = (maxStress + minStress) / 2;
  const stressAmplitude = (maxStress - minStress) / 2;
  
  // Base creep strain rate
  const baseStrainRate = calculateCreepStrainRate(avgStress, temperature, params);
  
  // Cyclic enhancement factor (cycling accelerates creep)
  const cyclicFactor = 1 + 0.1 * Math.log10(1 + cyclesPerHour);
  
  // Stress amplitude enhancement
  const amplitudeFactor = 1 + 0.5 * (stressAmplitude / avgStress);
  
  // Effective creep strain rate
  const creepStrainRate = baseStrainRate * cyclicFactor * amplitudeFactor;
  
  // Total creep strain
  const totalCreepStrain = creepStrainRate * operatingHours;
  
  // Dimensional drift
  const dimensionalDrift = totalCreepStrain * freeLength;
  const driftRate = (creepStrainRate * 1000) * freeLength; // mm per 1000 hours
  
  // Time to threshold
  const timeToThreshold = creepThreshold / creepStrainRate;
  
  // Recommended maintenance interval (80% of time to threshold)
  const maintenanceInterval = timeToThreshold * 0.8;
  
  // Determine risk level
  let riskLevel: CyclicCreepResult['riskLevel'];
  let stabilityRating: number;
  
  if (totalCreepStrain >= creepThreshold) {
    riskLevel = 'critical';
    stabilityRating = 10;
  } else if (totalCreepStrain >= creepThreshold * 0.7) {
    riskLevel = 'high';
    stabilityRating = 30;
  } else if (totalCreepStrain >= creepThreshold * 0.3) {
    riskLevel = 'medium';
    stabilityRating = 60;
  } else {
    riskLevel = 'low';
    stabilityRating = 90;
  }
  
  // Generate message
  let message: { en: string; zh: string };
  if (riskLevel === 'critical') {
    message = {
      en: `CRITICAL: Dimensional drift risk. Creep strain ${(totalCreepStrain * 100).toFixed(3)}% exceeds threshold.`,
      zh: `严重：尺寸漂移风险。蠕变应变 ${(totalCreepStrain * 100).toFixed(3)}% 超过阈值。`,
    };
  } else if (riskLevel === 'high') {
    message = {
      en: `HIGH RISK: Approaching creep limit. Maintenance recommended within ${maintenanceInterval.toFixed(0)} hours.`,
      zh: `高风险：接近蠕变极限。建议在 ${maintenanceInterval.toFixed(0)} 小时内维护。`,
    };
  } else if (riskLevel === 'medium') {
    message = {
      en: `Moderate creep accumulation. Monitor dimensional stability.`,
      zh: `中等蠕变累积。监控尺寸稳定性。`,
    };
  } else {
    message = {
      en: `Low creep risk. Service stability is good.`,
      zh: `低蠕变风险。服役稳定性良好。`,
    };
  }
  
  return {
    totalCreepStrain,
    creepStrainRate,
    dimensionalDrift,
    driftRate,
    timeToThreshold,
    maintenanceInterval,
    riskLevel,
    stabilityRating,
    message,
  };
}

/**
 * Generate creep accumulation curve
 */
export function generateCreepCurve(
  maxStress: number,
  minStress: number,
  temperature: number,
  cyclesPerHour: number,
  freeLength: number,
  materialId: SpringMaterialId,
  maxHours: number = 10000,
  numPoints: number = 50
): Array<{
  hours: number;
  creepStrain: number;
  dimensionalDrift: number;
}> {
  const points: Array<{
    hours: number;
    creepStrain: number;
    dimensionalDrift: number;
  }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const hours = (maxHours * i) / numPoints;
    const result = calculateCyclicCreep(
      maxStress, minStress, temperature, hours, cyclesPerHour, freeLength, materialId
    );
    
    points.push({
      hours,
      creepStrain: result.totalCreepStrain,
      dimensionalDrift: result.dimensionalDrift,
    });
  }
  
  return points;
}

/**
 * Calculate contact stress multiplier for end zones
 */
export function calculateContactStressMultiplier(
  isEndZone: boolean,
  isHookRegion: boolean,
  coilContactRatio: number // 0-1
): number {
  let multiplier = 1.0;
  
  if (isEndZone) {
    multiplier += 0.15; // 15% increase at end coils
  }
  
  if (isHookRegion) {
    multiplier += 0.20; // 20% increase at hooks
  }
  
  if (coilContactRatio > 0) {
    multiplier += 0.1 * coilContactRatio; // Up to 10% for coil contact
  }
  
  return multiplier;
}
