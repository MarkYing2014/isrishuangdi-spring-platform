/**
 * Fatigue Crack Initiation Probability Model - Phase 7
 * 疲劳裂纹萌生概率模型
 * 
 * Uses Weibull distribution for probabilistic crack initiation prediction
 */

/**
 * Surface condition parameters
 */
export interface SurfaceCondition {
  /** Surface roughness Ra (μm) */
  roughnessRa: number;
  /** Shot peening applied */
  shotPeened: boolean;
  /** Shot peening intensity (Almen) */
  shotPeeningIntensity?: string;
  /** Surface treatment type */
  surfaceTreatment?: 'none' | 'zinc' | 'cadmium' | 'phosphate' | 'chrome' | 'nitriding';
}

/**
 * Environmental factors
 */
export interface EnvironmentFactors {
  /** Corrosive environment */
  corrosive: boolean;
  /** Corrosion severity (0-1) */
  corrosionSeverity: number;
  /** Operating temperature (°C) */
  temperature: number;
  /** Humidity (%) */
  humidity: number;
}

/**
 * Stress state for crack initiation
 */
export interface StressState {
  /** Mean stress (MPa) */
  meanStress: number;
  /** Alternating stress (MPa) */
  alternatingStress: number;
  /** Maximum stress (MPa) */
  maxStress: number;
  /** Residual stress from manufacturing (MPa, negative = compressive) */
  residualStress: number;
}

/**
 * Weibull parameters for material
 */
export interface WeibullParameters {
  /** Shape parameter β (scatter factor) */
  beta: number;
  /** Characteristic life η (cycles) at reference stress */
  eta: number;
  /** Reference alternating stress (MPa) */
  referenceStress: number;
  /** Stress-life exponent */
  stressExponent: number;
}

/**
 * Default Weibull parameters for spring steels
 */
export const WEIBULL_PARAMS: Record<string, WeibullParameters> = {
  music_wire: {
    beta: 2.5,
    eta: 1e7,
    referenceStress: 400,
    stressExponent: 8,
  },
  chrome_vanadium: {
    beta: 2.8,
    eta: 2e7,
    referenceStress: 450,
    stressExponent: 9,
  },
  chrome_silicon: {
    beta: 3.0,
    eta: 5e7,
    referenceStress: 500,
    stressExponent: 10,
  },
  stainless_302: {
    beta: 2.2,
    eta: 5e6,
    referenceStress: 350,
    stressExponent: 7,
  },
  inconel: {
    beta: 3.5,
    eta: 1e8,
    referenceStress: 550,
    stressExponent: 12,
  },
  default: {
    beta: 2.5,
    eta: 1e7,
    referenceStress: 400,
    stressExponent: 8,
  },
};

/**
 * Crack initiation probability result
 */
export interface CrackInitiationResult {
  /** Probability of crack initiation at given cycles */
  probabilityCurve: { cycles: number; probability: number }[];
  /** Cycles for 10% probability of crack initiation */
  B10Life: number;
  /** Cycles for 50% probability (median life) */
  B50Life: number;
  /** Cycles for 90% probability */
  B90Life: number;
  /** Characteristic life (63.2% probability) */
  characteristicLife: number;
  /** Effective Weibull parameters used */
  effectiveWeibull: WeibullParameters;
  /** Modification factors applied */
  modificationFactors: {
    surface: number;
    environment: number;
    meanStress: number;
    residualStress: number;
    temperature: number;
  };
  /** Risk assessment */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommendations */
  recommendations: string[];
}

/**
 * Calculate surface roughness factor
 * Based on Murakami's sqrt(area) model
 */
function calculateSurfaceFactor(roughnessRa: number, shotPeened: boolean): number {
  // Base factor from roughness (Ra in μm)
  // Higher roughness = lower life
  let factor = 1.0;
  
  if (roughnessRa <= 0.4) {
    factor = 1.0;  // Mirror finish
  } else if (roughnessRa <= 0.8) {
    factor = 0.95;
  } else if (roughnessRa <= 1.6) {
    factor = 0.90;
  } else if (roughnessRa <= 3.2) {
    factor = 0.85;
  } else if (roughnessRa <= 6.3) {
    factor = 0.75;
  } else {
    factor = 0.65;
  }
  
  // Shot peening benefit
  if (shotPeened) {
    factor *= 1.3;  // 30% improvement from compressive residual stress
  }
  
  return Math.min(factor, 1.5);  // Cap at 1.5x
}

/**
 * Calculate environment factor
 */
function calculateEnvironmentFactor(env: EnvironmentFactors): number {
  let factor = 1.0;
  
  // Corrosion effect
  if (env.corrosive) {
    factor *= (1 - env.corrosionSeverity * 0.5);  // Up to 50% reduction
  }
  
  // Humidity effect (above 60% starts to affect)
  if (env.humidity > 60) {
    factor *= 1 - (env.humidity - 60) / 200;  // Up to 20% reduction at 100% humidity
  }
  
  // Temperature effect
  if (env.temperature > 150) {
    factor *= 1 - (env.temperature - 150) / 500;  // Reduction above 150°C
  } else if (env.temperature < -40) {
    factor *= 0.9;  // Cold brittleness
  }
  
  return Math.max(factor, 0.3);  // Minimum 30% of base life
}

/**
 * Calculate mean stress correction factor (Goodman)
 */
function calculateMeanStressFactor(
  meanStress: number, 
  ultimateStrength: number
): number {
  if (meanStress <= 0) {
    return 1.0;  // Compressive mean stress is beneficial
  }
  
  // Goodman correction
  const factor = 1 - meanStress / ultimateStrength;
  return Math.max(factor, 0.2);
}

/**
 * Calculate residual stress benefit factor
 */
function calculateResidualStressFactor(residualStress: number): number {
  if (residualStress >= 0) {
    return 1.0;  // Tensile residual stress - no benefit
  }
  
  // Compressive residual stress benefit
  // Each 100 MPa compressive stress adds ~10% life
  const benefit = 1 + Math.abs(residualStress) / 1000;
  return Math.min(benefit, 2.0);  // Cap at 2x improvement
}

/**
 * Weibull cumulative distribution function
 * P(N) = 1 - exp(-(N/η)^β)
 */
function weibullCDF(cycles: number, eta: number, beta: number): number {
  if (cycles <= 0) return 0;
  return 1 - Math.exp(-Math.pow(cycles / eta, beta));
}

/**
 * Inverse Weibull CDF - find cycles for given probability
 */
function weibullInverse(probability: number, eta: number, beta: number): number {
  if (probability <= 0) return 0;
  if (probability >= 1) return Infinity;
  return eta * Math.pow(-Math.log(1 - probability), 1 / beta);
}

/**
 * Calculate crack initiation probability
 */
export function calculateCrackInitiationProbability(
  stressState: StressState,
  surfaceCondition: SurfaceCondition,
  environment: EnvironmentFactors,
  materialType: string = 'default',
  ultimateStrength: number = 1600
): CrackInitiationResult {
  // Get base Weibull parameters
  const baseParams = WEIBULL_PARAMS[materialType] || WEIBULL_PARAMS.default;
  
  // Calculate modification factors
  const surfaceFactor = calculateSurfaceFactor(
    surfaceCondition.roughnessRa, 
    surfaceCondition.shotPeened
  );
  const envFactor = calculateEnvironmentFactor(environment);
  const meanStressFactor = calculateMeanStressFactor(stressState.meanStress, ultimateStrength);
  const residualFactor = calculateResidualStressFactor(stressState.residualStress);
  const tempFactor = environment.temperature > 100 ? 
    Math.exp(-0.001 * (environment.temperature - 100)) : 1.0;
  
  // Calculate effective stress amplitude
  const effectiveStress = stressState.alternatingStress / meanStressFactor;
  
  // Adjust characteristic life based on stress level
  // Using stress-life relationship: N = N_ref * (σ_ref / σ)^m
  const stressRatio = baseParams.referenceStress / effectiveStress;
  const baseLife = baseParams.eta * Math.pow(stressRatio, baseParams.stressExponent);
  
  // Apply all modification factors to characteristic life
  const totalFactor = surfaceFactor * envFactor * residualFactor * tempFactor;
  const effectiveEta = baseLife * totalFactor;
  
  // Effective Weibull parameters
  const effectiveWeibull: WeibullParameters = {
    ...baseParams,
    eta: effectiveEta,
  };
  
  // Calculate probability curve
  const probabilityCurve: { cycles: number; probability: number }[] = [];
  const maxCycles = effectiveEta * 10;
  const numPoints = 100;
  
  for (let i = 0; i <= numPoints; i++) {
    const cycles = (maxCycles / numPoints) * i;
    const probability = weibullCDF(cycles, effectiveEta, baseParams.beta);
    probabilityCurve.push({ cycles, probability });
  }
  
  // Calculate B-life values
  const B10Life = weibullInverse(0.10, effectiveEta, baseParams.beta);
  const B50Life = weibullInverse(0.50, effectiveEta, baseParams.beta);
  const B90Life = weibullInverse(0.90, effectiveEta, baseParams.beta);
  
  // Risk assessment
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (B10Life > 1e7) {
    riskLevel = 'low';
  } else if (B10Life > 1e6) {
    riskLevel = 'medium';
  } else if (B10Life > 1e5) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (surfaceFactor < 0.9) {
    recommendations.push('Consider improving surface finish to reduce crack initiation sites');
  }
  if (!surfaceCondition.shotPeened && riskLevel !== 'low') {
    recommendations.push('Shot peening recommended to introduce beneficial compressive residual stress');
  }
  if (envFactor < 0.8) {
    recommendations.push('Consider protective coating or material upgrade for corrosive environment');
  }
  if (meanStressFactor < 0.7) {
    recommendations.push('High mean stress detected - consider design changes to reduce preload');
  }
  if (stressState.alternatingStress > baseParams.referenceStress) {
    recommendations.push('Alternating stress exceeds reference - consider increasing wire diameter or reducing deflection');
  }
  
  return {
    probabilityCurve,
    B10Life,
    B50Life,
    B90Life,
    characteristicLife: effectiveEta,
    effectiveWeibull,
    modificationFactors: {
      surface: surfaceFactor,
      environment: envFactor,
      meanStress: meanStressFactor,
      residualStress: residualFactor,
      temperature: tempFactor,
    },
    riskLevel,
    recommendations,
  };
}

/**
 * Calculate probability of failure at specific cycle count
 */
export function getProbabilityAtCycles(
  result: CrackInitiationResult,
  targetCycles: number
): number {
  return weibullCDF(
    targetCycles, 
    result.effectiveWeibull.eta, 
    result.effectiveWeibull.beta
  );
}

/**
 * Calculate cycles for target reliability
 */
export function getCyclesForReliability(
  result: CrackInitiationResult,
  targetReliability: number  // e.g., 0.99 for 99% reliability
): number {
  const failureProbability = 1 - targetReliability;
  return weibullInverse(
    failureProbability,
    result.effectiveWeibull.eta,
    result.effectiveWeibull.beta
  );
}
