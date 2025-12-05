/**
 * Spring Analysis Engine - Creep & Permanent Set Model
 * 弹簧分析引擎 - 蠕变与永久变形模块
 * 
 * Stress relaxation, permanent set prediction, and Norton creep law
 */

import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Creep analysis result
 */
export interface CreepResult {
  /** Initial stress (MPa) */
  initialStress: number;
  /** Yield strength (MPa) */
  yieldStrength: number;
  /** Stress ratio (τ/Sy) */
  stressRatio: number;
  /** Creep strain after time t */
  creepStrain: number;
  /** Permanent set (mm) */
  permanentSet: number;
  /** Permanent set percentage */
  permanentSetPercent: number;
  /** Time to target deformation (hours) */
  timeToTargetDeformation?: number;
  /** Creep lifetime estimate (hours) */
  creepLifetime: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Message */
  message: { en: string; zh: string };
}

/**
 * Stress relaxation result
 */
export interface StressRelaxationResult {
  /** Initial stress (MPa) */
  initialStress: number;
  /** Stress after time t (MPa) */
  stressAfterTime: number;
  /** Relaxation percentage */
  relaxationPercent: number;
  /** Time (hours) */
  time: number;
}

/**
 * Creep parameters for materials
 * Norton creep law: ε̇ = K × σ^n
 */
export const CREEP_PARAMETERS: Record<string, {
  /** Norton coefficient K */
  K: number;
  /** Norton exponent n */
  n: number;
  /** Activation energy Q (J/mol) */
  Q: number;
  /** Yield strength factor */
  yieldFactor: number;
}> = {
  music_wire_a228: {
    K: 1e-18,
    n: 4.5,
    Q: 280000,
    yieldFactor: 0.85,
  },
  oil_tempered_a229: {
    K: 8e-19,
    n: 4.2,
    Q: 275000,
    yieldFactor: 0.82,
  },
  chrome_vanadium_a231: {
    K: 5e-19,
    n: 4.0,
    Q: 290000,
    yieldFactor: 0.80,
  },
  chrome_silicon_a401: {
    K: 3e-19,
    n: 3.8,
    Q: 300000,
    yieldFactor: 0.78,
  },
  stainless_302: {
    K: 2e-19,
    n: 3.5,
    Q: 310000,
    yieldFactor: 0.75,
  },
  stainless_17_7ph: {
    K: 1e-19,
    n: 3.2,
    Q: 320000,
    yieldFactor: 0.72,
  },
};

/**
 * Get creep parameters for material
 */
export function getCreepParameters(materialId: SpringMaterialId): {
  K: number;
  n: number;
  Q: number;
  yieldFactor: number;
} {
  if (materialId in CREEP_PARAMETERS) {
    return CREEP_PARAMETERS[materialId];
  }
  
  // Default conservative parameters
  return {
    K: 1e-18,
    n: 4.5,
    Q: 280000,
    yieldFactor: 0.85,
  };
}

/**
 * Calculate creep strain using power law
 * 使用幂律计算蠕变应变
 * 
 * ε_creep(t) = A × t^b
 * 
 * Where:
 * - A depends on stress and temperature
 * - b ≈ 0.3 for primary creep
 */
export function calculateCreepStrain(
  stress: number,      // MPa
  time: number,        // hours
  temperature: number, // °C
  materialId: SpringMaterialId
): number {
  const params = getCreepParameters(materialId);
  const { K, n, Q } = params;
  
  // Temperature in Kelvin
  const T_K = temperature + 273.15;
  
  // Gas constant
  const R = 8.314; // J/(mol·K)
  
  // Arrhenius temperature factor
  const tempFactor = Math.exp(-Q / (R * T_K));
  
  // Norton creep rate (per hour)
  const creepRate = K * Math.pow(stress, n) * tempFactor;
  
  // Primary creep exponent
  const b = 0.3;
  
  // Creep strain
  const A = creepRate * 3600; // Convert to per hour basis
  return A * Math.pow(time, b);
}

/**
 * Calculate permanent set
 * 计算永久变形
 * 
 * If τmax > 0.75 × Sy: permanent set occurs
 */
export function calculatePermanentSet(
  maxStress: number,
  yieldStrength: number,
  freeLength: number,
  time: number,        // hours
  temperature: number, // °C
  materialId: SpringMaterialId
): {
  permanentSet: number;
  permanentSetPercent: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
} {
  const stressRatio = maxStress / yieldStrength;
  
  // Threshold for permanent set
  const threshold = 0.75;
  
  if (stressRatio < threshold) {
    return {
      permanentSet: 0,
      permanentSetPercent: 0,
      riskLevel: 'low',
    };
  }
  
  // Calculate creep strain
  const creepStrain = calculateCreepStrain(maxStress, time, temperature, materialId);
  
  // Permanent set factor (increases with stress ratio above threshold)
  const setFactor = Math.pow((stressRatio - threshold) / (1 - threshold), 2);
  
  // Permanent set as percentage of free length
  const permanentSetPercent = creepStrain * setFactor * 100;
  const permanentSet = freeLength * permanentSetPercent / 100;
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (permanentSetPercent < 1) {
    riskLevel = 'low';
  } else if (permanentSetPercent < 3) {
    riskLevel = 'medium';
  } else if (permanentSetPercent < 5) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }
  
  return {
    permanentSet,
    permanentSetPercent,
    riskLevel,
  };
}

/**
 * Calculate time to target deformation
 * 计算达到目标变形的时间
 */
export function calculateTimeToDeformation(
  targetDeformationPercent: number,
  stress: number,
  temperature: number,
  materialId: SpringMaterialId
): number {
  const params = getCreepParameters(materialId);
  const { K, n, Q } = params;
  
  const T_K = temperature + 273.15;
  const R = 8.314;
  const tempFactor = Math.exp(-Q / (R * T_K));
  const creepRate = K * Math.pow(stress, n) * tempFactor;
  const A = creepRate * 3600;
  const b = 0.3;
  
  // Solve: targetStrain = A × t^b for t
  const targetStrain = targetDeformationPercent / 100;
  
  if (A <= 0) return Infinity;
  
  const time = Math.pow(targetStrain / A, 1 / b);
  return time;
}

/**
 * Calculate stress relaxation over time
 * 计算应力随时间的松弛
 * 
 * σ(t) = σ₀ × exp(-t/τ)
 * 
 * Where τ is relaxation time constant
 */
export function calculateStressRelaxation(
  initialStress: number,
  time: number,        // hours
  temperature: number, // °C
  materialId: SpringMaterialId
): StressRelaxationResult {
  const params = getCreepParameters(materialId);
  const { Q } = params;
  
  const T_K = temperature + 273.15;
  const R = 8.314;
  
  // Relaxation time constant (temperature dependent)
  // Higher temperature = faster relaxation
  const tau_ref = 10000; // hours at room temp
  const tau = tau_ref * Math.exp(Q / (R * T_K) - Q / (R * 293.15));
  
  // Stress after time t
  const stressAfterTime = initialStress * Math.exp(-time / tau);
  const relaxationPercent = ((initialStress - stressAfterTime) / initialStress) * 100;
  
  return {
    initialStress,
    stressAfterTime,
    relaxationPercent,
    time,
  };
}

/**
 * Calculate complete creep analysis
 * 计算完整蠕变分析
 */
export function calculateCreepAnalysis(
  materialId: SpringMaterialId,
  maxStress: number,
  freeLength: number,
  operatingTime: number,     // hours
  operatingTemperature: number = 20
): CreepResult {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const params = getCreepParameters(materialId);
  
  // Estimate yield strength from tensile strength
  const tensileStrength = material.tensileStrength ?? material.allowShearStatic * 2;
  const yieldStrength = tensileStrength * params.yieldFactor * 0.577; // Shear yield
  
  const stressRatio = maxStress / yieldStrength;
  
  // Calculate creep strain
  const creepStrain = calculateCreepStrain(
    maxStress,
    operatingTime,
    operatingTemperature,
    materialId
  );
  
  // Calculate permanent set
  const { permanentSet, permanentSetPercent, riskLevel } = calculatePermanentSet(
    maxStress,
    yieldStrength,
    freeLength,
    operatingTime,
    operatingTemperature,
    materialId
  );
  
  // Calculate time to 2% deformation (common limit)
  const timeToTargetDeformation = calculateTimeToDeformation(
    2.0, // 2% target
    maxStress,
    operatingTemperature,
    materialId
  );
  
  // Estimate creep lifetime (time to 5% strain)
  const creepLifetime = calculateTimeToDeformation(
    5.0,
    maxStress,
    operatingTemperature,
    materialId
  );
  
  // Generate message
  let message: { en: string; zh: string };
  switch (riskLevel) {
    case 'low':
      message = {
        en: 'Low creep risk. Spring dimensions should remain stable.',
        zh: '蠕变风险低。弹簧尺寸应保持稳定。',
      };
      break;
    case 'medium':
      message = {
        en: 'Moderate creep risk. Monitor spring dimensions periodically.',
        zh: '蠕变风险中等。建议定期监测弹簧尺寸。',
      };
      break;
    case 'high':
      message = {
        en: 'High creep risk. Consider reducing stress or using higher-grade material.',
        zh: '蠕变风险高。建议降低应力或使用更高等级材料。',
      };
      break;
    case 'critical':
      message = {
        en: 'CRITICAL: Significant permanent set expected. Redesign recommended.',
        zh: '严重：预计会产生显著永久变形。建议重新设计。',
      };
      break;
  }
  
  return {
    initialStress: maxStress,
    yieldStrength,
    stressRatio,
    creepStrain,
    permanentSet,
    permanentSetPercent,
    timeToTargetDeformation: isFinite(timeToTargetDeformation) ? timeToTargetDeformation : undefined,
    creepLifetime: isFinite(creepLifetime) ? creepLifetime : 1e9,
    riskLevel,
    message,
  };
}

/**
 * Generate creep curve over time
 * 生成蠕变随时间变化曲线
 */
export function generateCreepCurve(
  stress: number,
  temperature: number,
  materialId: SpringMaterialId,
  maxTime: number = 10000, // hours
  numPoints: number = 50
): Array<{
  time: number;
  creepStrain: number;
  creepStrainPercent: number;
}> {
  const points: Array<{
    time: number;
    creepStrain: number;
    creepStrainPercent: number;
  }> = [];
  
  // Use logarithmic time scale
  for (let i = 0; i <= numPoints; i++) {
    const logTime = (Math.log10(maxTime) * i) / numPoints;
    const time = Math.pow(10, logTime);
    
    const creepStrain = calculateCreepStrain(stress, time, temperature, materialId);
    
    points.push({
      time,
      creepStrain,
      creepStrainPercent: creepStrain * 100,
    });
  }
  
  return points;
}
