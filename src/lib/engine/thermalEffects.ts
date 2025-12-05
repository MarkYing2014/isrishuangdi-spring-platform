/**
 * Spring Analysis Engine - Thermal Effects Model
 * 弹簧分析引擎 - 热效应模型
 * 
 * Includes:
 * - Heat treatment recovery curves
 * - Temperature cycling fatigue (Coffin-Manson)
 * - Thermal relaxation
 */

import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Heat treatment recovery parameters
 */
export interface HeatTreatmentParams {
  /** Recovery coefficient R_HT */
  recoveryCoefficient: number;
  /** Maximum recovery percentage */
  maxRecoveryPercent: number;
  /** Optimal soak temperature (°C) */
  optimalSoakTemp: number;
  /** Minimum soak time (hours) */
  minSoakTime: number;
}

/**
 * Heat treatment recovery result
 */
export interface HeatTreatmentResult {
  /** Initial stiffness (N/mm) */
  initialStiffness: number;
  /** Recovered stiffness (N/mm) */
  recoveredStiffness: number;
  /** Recovery percentage */
  recoveryPercent: number;
  /** Soak time (hours) */
  soakTime: number;
  /** Soak temperature (°C) */
  soakTemperature: number;
  /** Lifetime stability factor */
  lifetimeStabilityFactor: number;
}

/**
 * Temperature cycling fatigue parameters
 */
export interface ThermalCyclingParams {
  /** Coefficient of thermal expansion α (1/°C) */
  alpha: number;
  /** Fatigue ductility coefficient ε_f' */
  fatigueductilityCoeff: number;
  /** Fatigue ductility exponent c */
  fatigueductilityExp: number;
  /** Fatigue strength coefficient σ_f' (MPa) */
  fatigueStrengthCoeff: number;
  /** Fatigue strength exponent b */
  fatigueStrengthExp: number;
}

/**
 * Temperature cycling fatigue result
 */
export interface ThermalCyclingResult {
  /** Temperature range ΔT (°C) */
  deltaT: number;
  /** Thermal strain range Δε_th */
  thermalStrainRange: number;
  /** Mechanical strain range Δε_mech */
  mechanicalStrainRange: number;
  /** Total strain range Δε_total */
  totalStrainRange: number;
  /** Thermal cycle life N_th */
  thermalCycleLife: number;
  /** Combined cycle life */
  combinedCycleLife: number;
  /** Life reduction factor */
  lifeReductionFactor: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Heat treatment parameters by material
 */
export const HEAT_TREATMENT_PARAMS: Record<string, HeatTreatmentParams> = {
  music_wire_a228: {
    recoveryCoefficient: 0.015,
    maxRecoveryPercent: 8,
    optimalSoakTemp: 230,
    minSoakTime: 0.5,
  },
  oil_tempered: {
    recoveryCoefficient: 0.012,
    maxRecoveryPercent: 6,
    optimalSoakTemp: 260,
    minSoakTime: 0.75,
  },
  chrome_silicon: {
    recoveryCoefficient: 0.018,
    maxRecoveryPercent: 10,
    optimalSoakTemp: 290,
    minSoakTime: 1.0,
  },
  chrome_vanadium: {
    recoveryCoefficient: 0.016,
    maxRecoveryPercent: 9,
    optimalSoakTemp: 280,
    minSoakTime: 0.75,
  },
  ss_302: {
    recoveryCoefficient: 0.010,
    maxRecoveryPercent: 5,
    optimalSoakTemp: 350,
    minSoakTime: 1.5,
  },
};

/**
 * Thermal cycling parameters by material
 */
export const THERMAL_CYCLING_PARAMS: Record<string, ThermalCyclingParams> = {
  music_wire_a228: {
    alpha: 11.5e-6,
    fatigueductilityCoeff: 0.35,
    fatigueductilityExp: -0.6,
    fatigueStrengthCoeff: 1200,
    fatigueStrengthExp: -0.12,
  },
  oil_tempered: {
    alpha: 11.8e-6,
    fatigueductilityCoeff: 0.32,
    fatigueductilityExp: -0.58,
    fatigueStrengthCoeff: 1100,
    fatigueStrengthExp: -0.11,
  },
  chrome_silicon: {
    alpha: 11.0e-6,
    fatigueductilityCoeff: 0.40,
    fatigueductilityExp: -0.55,
    fatigueStrengthCoeff: 1400,
    fatigueStrengthExp: -0.10,
  },
  chrome_vanadium: {
    alpha: 11.2e-6,
    fatigueductilityCoeff: 0.38,
    fatigueductilityExp: -0.57,
    fatigueStrengthCoeff: 1300,
    fatigueStrengthExp: -0.11,
  },
  ss_302: {
    alpha: 17.3e-6,
    fatigueductilityCoeff: 0.45,
    fatigueductilityExp: -0.52,
    fatigueStrengthCoeff: 900,
    fatigueStrengthExp: -0.14,
  },
};

/**
 * Get heat treatment parameters
 */
export function getHeatTreatmentParams(materialId: SpringMaterialId): HeatTreatmentParams {
  return HEAT_TREATMENT_PARAMS[materialId] ?? {
    recoveryCoefficient: 0.012,
    maxRecoveryPercent: 6,
    optimalSoakTemp: 250,
    minSoakTime: 1.0,
  };
}

/**
 * Get thermal cycling parameters
 */
export function getThermalCyclingParams(materialId: SpringMaterialId): ThermalCyclingParams {
  return THERMAL_CYCLING_PARAMS[materialId] ?? {
    alpha: 12e-6,
    fatigueductilityCoeff: 0.35,
    fatigueductilityExp: -0.6,
    fatigueStrengthCoeff: 1000,
    fatigueStrengthExp: -0.12,
  };
}

/**
 * Calculate heat treatment recovery
 * k_recovered = k_initial * (1 + R_HT * ln(1 + t))
 */
export function calculateHeatTreatmentRecovery(
  initialStiffness: number,
  soakTime: number, // hours
  soakTemperature: number, // °C
  materialId: SpringMaterialId
): HeatTreatmentResult {
  const params = getHeatTreatmentParams(materialId);
  const { recoveryCoefficient, maxRecoveryPercent, optimalSoakTemp, minSoakTime } = params;
  
  // Temperature effectiveness factor
  const tempFactor = Math.exp(-Math.pow((soakTemperature - optimalSoakTemp) / 50, 2));
  
  // Time factor (logarithmic recovery)
  const effectiveTime = Math.max(0, soakTime - minSoakTime * 0.5);
  const timeFactor = Math.log(1 + effectiveTime);
  
  // Recovery percentage
  const rawRecovery = recoveryCoefficient * timeFactor * tempFactor * 100;
  const recoveryPercent = Math.min(rawRecovery, maxRecoveryPercent);
  
  // Recovered stiffness
  const recoveredStiffness = initialStiffness * (1 + recoveryPercent / 100);
  
  // Lifetime stability factor (how stable the recovery is over time)
  const lifetimeStabilityFactor = 0.85 + 0.15 * Math.min(1, soakTime / (minSoakTime * 2));
  
  return {
    initialStiffness,
    recoveredStiffness,
    recoveryPercent,
    soakTime,
    soakTemperature,
    lifetimeStabilityFactor,
  };
}

/**
 * Calculate thermal strain range
 * Δε_th = α * ΔT
 */
export function calculateThermalStrainRange(
  deltaT: number,
  alpha: number
): number {
  return alpha * deltaT;
}

/**
 * Calculate thermal cycle life using Coffin-Manson equation
 * Δε_th/2 = ε_f' * (2N)^c + σ_f'/E * (2N)^b
 */
export function calculateThermalCycleLife(
  thermalStrainAmplitude: number,
  params: ThermalCyclingParams,
  E: number
): number {
  const { fatigueductilityCoeff, fatigueductilityExp, fatigueStrengthCoeff, fatigueStrengthExp } = params;
  
  // Solve iteratively for N
  // Δε/2 = ε_f' * (2N)^c + σ_f'/E * (2N)^b
  
  let N = 1e6; // Initial guess
  const targetStrain = thermalStrainAmplitude;
  
  for (let iter = 0; iter < 50; iter++) {
    const plasticTerm = fatigueductilityCoeff * Math.pow(2 * N, fatigueductilityExp);
    const elasticTerm = (fatigueStrengthCoeff / E) * Math.pow(2 * N, fatigueStrengthExp);
    const calculatedStrain = plasticTerm + elasticTerm;
    
    if (Math.abs(calculatedStrain - targetStrain) / targetStrain < 0.001) {
      break;
    }
    
    // Newton-Raphson adjustment
    const ratio = targetStrain / calculatedStrain;
    N = N * Math.pow(ratio, 1 / Math.abs(fatigueductilityExp));
  }
  
  return Math.max(1, Math.min(N, 1e12));
}

/**
 * Calculate temperature cycling fatigue
 */
export function calculateThermalCyclingFatigue(
  materialId: SpringMaterialId,
  minTemp: number, // °C
  maxTemp: number, // °C
  mechanicalStrainAmplitude: number
): ThermalCyclingResult {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const params = getThermalCyclingParams(materialId);
  const E = material.elasticModulus ?? 207000;
  
  const deltaT = maxTemp - minTemp;
  
  // Thermal strain range
  const thermalStrainRange = calculateThermalStrainRange(deltaT, params.alpha);
  const thermalStrainAmplitude = thermalStrainRange / 2;
  
  // Mechanical strain range
  const mechanicalStrainRange = mechanicalStrainAmplitude * 2;
  
  // Total strain range (combined)
  const totalStrainRange = Math.sqrt(
    Math.pow(thermalStrainRange, 2) + Math.pow(mechanicalStrainRange, 2)
  );
  const totalStrainAmplitude = totalStrainRange / 2;
  
  // Calculate thermal cycle life
  const thermalCycleLife = calculateThermalCycleLife(thermalStrainAmplitude, params, E);
  
  // Calculate combined cycle life
  const combinedCycleLife = calculateThermalCycleLife(totalStrainAmplitude, params, E);
  
  // Life reduction factor
  const purelyMechanicalLife = calculateThermalCycleLife(mechanicalStrainAmplitude, params, E);
  const lifeReductionFactor = combinedCycleLife / purelyMechanicalLife;
  
  // Determine risk level
  let riskLevel: ThermalCyclingResult['riskLevel'];
  if (lifeReductionFactor > 0.8) {
    riskLevel = 'low';
  } else if (lifeReductionFactor > 0.5) {
    riskLevel = 'medium';
  } else if (lifeReductionFactor > 0.2) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }
  
  return {
    deltaT,
    thermalStrainRange,
    mechanicalStrainRange,
    totalStrainRange,
    thermalCycleLife,
    combinedCycleLife,
    lifeReductionFactor,
    riskLevel,
  };
}

/**
 * Generate thermal relaxation curve
 */
export function generateThermalRelaxationCurve(
  initialStress: number,
  temperature: number, // °C
  materialId: SpringMaterialId,
  maxTime: number = 10000, // hours
  numPoints: number = 50
): Array<{
  time: number;
  stress: number;
  relaxationPercent: number;
}> {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  // Temperature-dependent relaxation rate
  const T_K = temperature + 273.15;
  const Q = 280000; // Activation energy (J/mol)
  const R = 8.314;
  const tempFactor = Math.exp(-Q / (R * T_K));
  
  // Relaxation time constant
  const tau = 5000 / (tempFactor * 1e15); // hours
  
  const points: Array<{
    time: number;
    stress: number;
    relaxationPercent: number;
  }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = (maxTime * i) / numPoints;
    const stress = initialStress * Math.exp(-t / tau);
    const relaxationPercent = ((initialStress - stress) / initialStress) * 100;
    
    points.push({
      time: t,
      stress,
      relaxationPercent,
    });
  }
  
  return points;
}

/**
 * Generate heat treatment recovery curve
 */
export function generateHeatTreatmentCurve(
  initialStiffness: number,
  soakTemperature: number,
  materialId: SpringMaterialId,
  maxTime: number = 10, // hours
  numPoints: number = 50
): Array<{
  time: number;
  stiffness: number;
  recoveryPercent: number;
}> {
  const points: Array<{
    time: number;
    stiffness: number;
    recoveryPercent: number;
  }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = (maxTime * i) / numPoints;
    const result = calculateHeatTreatmentRecovery(initialStiffness, t, soakTemperature, materialId);
    
    points.push({
      time: t,
      stiffness: result.recoveredStiffness,
      recoveryPercent: result.recoveryPercent,
    });
  }
  
  return points;
}
