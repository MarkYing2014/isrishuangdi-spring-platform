/**
 * Spring Analysis Engine - Temperature Effects Model
 * 弹簧分析引擎 - 温度效应模块
 * 
 * High temperature strength reduction and modulus decay
 */

import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Temperature effect result
 */
export interface TemperatureEffectResult {
  /** Operating temperature (°C) */
  temperature: number;
  /** Reference temperature (°C) */
  referenceTemperature: number;
  /** Temperature difference */
  deltaT: number;
  /** Allowable stress reduction factor */
  stressReductionFactor: number;
  /** Modulus reduction factor */
  modulusReductionFactor: number;
  /** Adjusted allowable stress (MPa) */
  adjustedAllowableStress: number;
  /** Adjusted shear modulus (MPa) */
  adjustedShearModulus: number;
  /** Adjusted elastic modulus (MPa) */
  adjustedElasticModulus: number;
  /** Strength loss percentage */
  strengthLossPercent: number;
  /** Modulus loss percentage */
  modulusLossPercent: number;
  /** Warning message if applicable */
  warning?: { en: string; zh: string };
}

/**
 * Temperature coefficients for common spring materials
 * 常见弹簧材料的温度系数
 */
export const TEMPERATURE_COEFFICIENTS: Record<string, {
  /** Stress reduction coefficient (per °C above reference) */
  alpha_T: number;
  /** Modulus reduction coefficient (per °C above reference) */
  beta_T: number;
  /** Maximum service temperature (°C) */
  maxServiceTemp: number;
  /** Reference temperature (°C) */
  referenceTemp: number;
}> = {
  // Music wire (ASTM A228)
  music_wire_a228: {
    alpha_T: 0.0008,
    beta_T: 0.0003,
    maxServiceTemp: 120,
    referenceTemp: 20,
  },
  // Oil tempered wire (ASTM A229)
  oil_tempered_a229: {
    alpha_T: 0.0007,
    beta_T: 0.00025,
    maxServiceTemp: 150,
    referenceTemp: 20,
  },
  // Chrome vanadium (ASTM A231)
  chrome_vanadium_a231: {
    alpha_T: 0.0006,
    beta_T: 0.0002,
    maxServiceTemp: 220,
    referenceTemp: 20,
  },
  // Chrome silicon (ASTM A401)
  chrome_silicon_a401: {
    alpha_T: 0.0005,
    beta_T: 0.00018,
    maxServiceTemp: 250,
    referenceTemp: 20,
  },
  // Stainless steel 302
  stainless_302: {
    alpha_T: 0.0004,
    beta_T: 0.00015,
    maxServiceTemp: 290,
    referenceTemp: 20,
  },
  // Stainless steel 17-7 PH
  stainless_17_7ph: {
    alpha_T: 0.00035,
    beta_T: 0.00012,
    maxServiceTemp: 315,
    referenceTemp: 20,
  },
  // Inconel X-750
  inconel_x750: {
    alpha_T: 0.0002,
    beta_T: 0.0001,
    maxServiceTemp: 650,
    referenceTemp: 20,
  },
};

/**
 * Get temperature coefficients for a material
 */
export function getTemperatureCoefficients(materialId: SpringMaterialId): {
  alpha_T: number;
  beta_T: number;
  maxServiceTemp: number;
  referenceTemp: number;
} {
  // Try exact match first
  if (materialId in TEMPERATURE_COEFFICIENTS) {
    return TEMPERATURE_COEFFICIENTS[materialId];
  }
  
  // Default coefficients for unknown materials (conservative)
  return {
    alpha_T: 0.0008,
    beta_T: 0.0003,
    maxServiceTemp: 120,
    referenceTemp: 20,
  };
}

/**
 * Calculate stress reduction factor at temperature
 * 计算温度下的应力衰减系数
 * 
 * τ_allow(T) = τ_allow(room) × (1 - α_T × ΔT)
 */
export function calculateStressReductionFactor(
  temperature: number,
  referenceTemp: number,
  alpha_T: number
): number {
  const deltaT = Math.max(0, temperature - referenceTemp);
  const factor = 1 - alpha_T * deltaT;
  return Math.max(0.3, factor); // Minimum 30% of room temp strength
}

/**
 * Calculate modulus reduction factor at temperature
 * 计算温度下的模量衰减系数
 * 
 * E(T) = E(room) × (1 - β_T × ΔT)
 * G(T) = G(room) × (1 - β_T × ΔT)
 */
export function calculateModulusReductionFactor(
  temperature: number,
  referenceTemp: number,
  beta_T: number
): number {
  const deltaT = Math.max(0, temperature - referenceTemp);
  const factor = 1 - beta_T * deltaT;
  return Math.max(0.5, factor); // Minimum 50% of room temp modulus
}

/**
 * Calculate complete temperature effects
 * 计算完整温度效应
 */
export function calculateTemperatureEffects(
  materialId: SpringMaterialId,
  operatingTemperature: number
): TemperatureEffectResult {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const coeffs = getTemperatureCoefficients(materialId);
  const { alpha_T, beta_T, maxServiceTemp, referenceTemp } = coeffs;

  const deltaT = operatingTemperature - referenceTemp;

  // Calculate reduction factors
  const stressReductionFactor = calculateStressReductionFactor(
    operatingTemperature,
    referenceTemp,
    alpha_T
  );

  const modulusReductionFactor = calculateModulusReductionFactor(
    operatingTemperature,
    referenceTemp,
    beta_T
  );

  // Calculate adjusted properties
  const adjustedAllowableStress = material.allowShearStatic * stressReductionFactor;
  const adjustedShearModulus = material.shearModulus * modulusReductionFactor;
  const adjustedElasticModulus = (material.elasticModulus ?? 207000) * modulusReductionFactor;

  // Calculate loss percentages
  const strengthLossPercent = (1 - stressReductionFactor) * 100;
  const modulusLossPercent = (1 - modulusReductionFactor) * 100;

  // Generate warning if applicable
  let warning: { en: string; zh: string } | undefined;
  
  if (operatingTemperature > maxServiceTemp) {
    warning = {
      en: `WARNING: Operating temperature ${operatingTemperature}°C exceeds maximum service temperature ${maxServiceTemp}°C for this material`,
      zh: `警告：工作温度 ${operatingTemperature}°C 超过该材料的最高使用温度 ${maxServiceTemp}°C`,
    };
  } else if (operatingTemperature > maxServiceTemp * 0.85) {
    warning = {
      en: `CAUTION: Operating temperature ${operatingTemperature}°C is approaching maximum service temperature ${maxServiceTemp}°C`,
      zh: `注意：工作温度 ${operatingTemperature}°C 接近最高使用温度 ${maxServiceTemp}°C`,
    };
  }

  return {
    temperature: operatingTemperature,
    referenceTemperature: referenceTemp,
    deltaT,
    stressReductionFactor,
    modulusReductionFactor,
    adjustedAllowableStress,
    adjustedShearModulus,
    adjustedElasticModulus,
    strengthLossPercent,
    modulusLossPercent,
    warning,
  };
}

/**
 * Generate temperature decay curve data
 * 生成温度衰减曲线数据
 */
export function generateTemperatureDecayCurve(
  materialId: SpringMaterialId,
  minTemp: number = 20,
  maxTemp: number = 300,
  numPoints: number = 30
): Array<{
  temperature: number;
  stressReductionFactor: number;
  modulusReductionFactor: number;
  strengthLossPercent: number;
}> {
  const coeffs = getTemperatureCoefficients(materialId);
  const { alpha_T, beta_T, referenceTemp } = coeffs;

  const points: Array<{
    temperature: number;
    stressReductionFactor: number;
    modulusReductionFactor: number;
    strengthLossPercent: number;
  }> = [];

  const step = (maxTemp - minTemp) / numPoints;

  for (let i = 0; i <= numPoints; i++) {
    const temp = minTemp + i * step;
    const stressFactor = calculateStressReductionFactor(temp, referenceTemp, alpha_T);
    const modulusFactor = calculateModulusReductionFactor(temp, referenceTemp, beta_T);

    points.push({
      temperature: temp,
      stressReductionFactor: stressFactor,
      modulusReductionFactor: modulusFactor,
      strengthLossPercent: (1 - stressFactor) * 100,
    });
  }

  return points;
}

/**
 * Adjust spring rate for temperature
 * 调整温度下的弹簧刚度
 * 
 * k(T) = k(room) × (G(T) / G(room))
 */
export function adjustSpringRateForTemperature(
  roomTempSpringRate: number,
  modulusReductionFactor: number
): number {
  return roomTempSpringRate * modulusReductionFactor;
}
