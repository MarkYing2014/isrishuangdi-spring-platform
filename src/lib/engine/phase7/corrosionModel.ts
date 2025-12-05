/**
 * Corrosion Acceleration Model - Phase 7
 * 腐蚀加速模型
 * 
 * Models corrosion fatigue effects and strength degradation over time
 */

/**
 * Corrosion environment type
 */
export type CorrosionEnvironment = 
  | 'indoor_dry'
  | 'indoor_humid'
  | 'outdoor_rural'
  | 'outdoor_urban'
  | 'outdoor_industrial'
  | 'marine_splash'
  | 'marine_immersion'
  | 'chemical_mild'
  | 'chemical_severe';

/**
 * Corrosion environment parameters
 */
export interface CorrosionEnvironmentParams {
  /** Environment type */
  type: CorrosionEnvironment;
  /** Relative humidity (%) */
  humidity: number;
  /** Temperature (°C) */
  temperature: number;
  /** Salt spray exposure (hours/year) */
  saltSprayHours?: number;
  /** pH level (for chemical environments) */
  pH?: number;
  /** Chloride concentration (ppm) */
  chlorideConcentration?: number;
}

/**
 * Material corrosion resistance
 */
export interface MaterialCorrosionData {
  /** Base corrosion rate (mm/year) */
  baseCorrosionRate: number;
  /** Pitting factor */
  pittingFactor: number;
  /** Stress corrosion cracking susceptibility (0-1) */
  sccSusceptibility: number;
  /** Hydrogen embrittlement susceptibility (0-1) */
  hydrogenSusceptibility: number;
}

/**
 * Corrosion data for common spring materials
 */
export const MATERIAL_CORROSION_DATA: Record<string, MaterialCorrosionData> = {
  music_wire_a228: {
    baseCorrosionRate: 0.05,
    pittingFactor: 2.0,
    sccSusceptibility: 0.3,
    hydrogenSusceptibility: 0.4,
  },
  chrome_vanadium_a231: {
    baseCorrosionRate: 0.04,
    pittingFactor: 1.8,
    sccSusceptibility: 0.25,
    hydrogenSusceptibility: 0.35,
  },
  chrome_silicon_a401: {
    baseCorrosionRate: 0.03,
    pittingFactor: 1.5,
    sccSusceptibility: 0.2,
    hydrogenSusceptibility: 0.3,
  },
  stainless_302: {
    baseCorrosionRate: 0.005,
    pittingFactor: 3.0,  // Prone to pitting
    sccSusceptibility: 0.5,  // Chloride SCC
    hydrogenSusceptibility: 0.2,
  },
  stainless_316: {
    baseCorrosionRate: 0.002,
    pittingFactor: 2.0,
    sccSusceptibility: 0.3,
    hydrogenSusceptibility: 0.15,
  },
  stainless_17_7ph: {
    baseCorrosionRate: 0.003,
    pittingFactor: 2.5,
    sccSusceptibility: 0.4,
    hydrogenSusceptibility: 0.5,
  },
  inconel_x750: {
    baseCorrosionRate: 0.001,
    pittingFactor: 1.2,
    sccSusceptibility: 0.1,
    hydrogenSusceptibility: 0.1,
  },
  default: {
    baseCorrosionRate: 0.05,
    pittingFactor: 2.0,
    sccSusceptibility: 0.3,
    hydrogenSusceptibility: 0.4,
  },
};

/**
 * Environment severity factors
 */
const ENVIRONMENT_FACTORS: Record<CorrosionEnvironment, number> = {
  indoor_dry: 0.1,
  indoor_humid: 0.3,
  outdoor_rural: 0.5,
  outdoor_urban: 0.8,
  outdoor_industrial: 1.2,
  marine_splash: 2.5,
  marine_immersion: 3.0,
  chemical_mild: 1.5,
  chemical_severe: 4.0,
};

/**
 * Corrosion analysis result
 */
export interface CorrosionAnalysisResult {
  /** Effective corrosion rate (mm/year) */
  effectiveCorrosionRate: number;
  /** Environment severity factor */
  environmentFactor: number;
  /** Strength degradation over time */
  strengthDegradation: {
    years: number;
    remainingStrength: number;  // Fraction (0-1)
    remainingStiffness: number; // Fraction (0-1)
    remainingFatigueLife: number; // Fraction (0-1)
  }[];
  /** Corroded endurance limit (MPa) */
  corrodedEnduranceLimit: number;
  /** Original endurance limit (MPa) */
  originalEnduranceLimit: number;
  /** Corrosion fatigue factor */
  corrosionFatigueFactor: number;
  /** Time to critical thickness loss (years) */
  timeToCritical: number;
  /** Pitting risk level */
  pittingRisk: 'low' | 'medium' | 'high' | 'severe';
  /** SCC risk level */
  sccRisk: 'low' | 'medium' | 'high' | 'severe';
  /** Recommendations */
  recommendations: string[];
}

/**
 * Calculate temperature acceleration factor (Arrhenius)
 */
function calculateTemperatureFactor(temperature: number): number {
  const referenceTemp = 25;  // °C
  const activationEnergy = 50000;  // J/mol (typical for steel corrosion)
  const gasConstant = 8.314;  // J/(mol·K)
  
  const T1 = referenceTemp + 273.15;
  const T2 = temperature + 273.15;
  
  return Math.exp((activationEnergy / gasConstant) * (1/T1 - 1/T2));
}

/**
 * Calculate humidity factor
 */
function calculateHumidityFactor(humidity: number): number {
  if (humidity < 40) return 0.1;
  if (humidity < 60) return 0.3;
  if (humidity < 80) return 0.7;
  return 1.0 + (humidity - 80) / 50;  // Accelerates above 80%
}

/**
 * Calculate pH factor
 */
function calculatePHFactor(pH: number | undefined): number {
  if (pH === undefined) return 1.0;
  
  // Neutral pH = 7, minimum corrosion
  // Acidic (low pH) or alkaline (high pH) accelerates corrosion
  const deviation = Math.abs(pH - 7);
  return 1 + deviation * 0.3;
}

/**
 * Calculate chloride factor
 */
function calculateChlorideFactor(chlorideConcentration: number | undefined): number {
  if (chlorideConcentration === undefined) return 1.0;
  
  // Chloride significantly accelerates corrosion
  if (chlorideConcentration < 100) return 1.0;
  if (chlorideConcentration < 500) return 1.5;
  if (chlorideConcentration < 1000) return 2.0;
  if (chlorideConcentration < 5000) return 3.0;
  return 5.0;
}

/**
 * Calculate strength degradation over time
 */
function calculateStrengthDegradation(
  corrosionRate: number,
  wireDiameter: number,
  years: number
): { remainingStrength: number; remainingStiffness: number; remainingFatigueLife: number } {
  // Thickness loss
  const thicknessLoss = corrosionRate * years * 2;  // Both sides
  const remainingDiameter = Math.max(0, wireDiameter - thicknessLoss);
  
  // Strength scales with area (d²)
  const areaRatio = Math.pow(remainingDiameter / wireDiameter, 2);
  const remainingStrength = areaRatio;
  
  // Stiffness scales with d⁴
  const stiffnessRatio = Math.pow(remainingDiameter / wireDiameter, 4);
  const remainingStiffness = stiffnessRatio;
  
  // Fatigue life degrades faster due to stress concentration from pitting
  const fatigueRatio = Math.pow(areaRatio, 2);  // Squared effect
  const remainingFatigueLife = fatigueRatio;
  
  return {
    remainingStrength: Math.max(0, remainingStrength),
    remainingStiffness: Math.max(0, remainingStiffness),
    remainingFatigueLife: Math.max(0, remainingFatigueLife),
  };
}

/**
 * Analyze corrosion effects
 */
export function analyzeCorrosion(
  environment: CorrosionEnvironmentParams,
  materialId: string,
  wireDiameter: number,
  baseEnduranceLimit: number,
  maxStress: number,
  serviceYears: number = 10
): CorrosionAnalysisResult {
  // Get material corrosion data
  const materialData = MATERIAL_CORROSION_DATA[materialId] || MATERIAL_CORROSION_DATA.default;
  
  // Calculate environment factor
  const envFactor = ENVIRONMENT_FACTORS[environment.type];
  const tempFactor = calculateTemperatureFactor(environment.temperature);
  const humidityFactor = calculateHumidityFactor(environment.humidity);
  const pHFactor = calculatePHFactor(environment.pH);
  const chlorideFactor = calculateChlorideFactor(environment.chlorideConcentration);
  
  // Total environment factor
  const totalEnvFactor = envFactor * tempFactor * humidityFactor * pHFactor * chlorideFactor;
  
  // Effective corrosion rate
  const effectiveCorrosionRate = materialData.baseCorrosionRate * totalEnvFactor;
  
  // Calculate strength degradation curve
  const degradationCurve: CorrosionAnalysisResult['strengthDegradation'] = [];
  for (let year = 0; year <= serviceYears; year++) {
    const degradation = calculateStrengthDegradation(effectiveCorrosionRate, wireDiameter, year);
    degradationCurve.push({
      years: year,
      ...degradation,
    });
  }
  
  // Corrosion fatigue factor (reduces endurance limit)
  // Based on empirical data: Se_corroded = Se * (1 - k_env)
  const k_env = Math.min(0.7, totalEnvFactor * 0.1);  // Cap at 70% reduction
  const corrosionFatigueFactor = 1 - k_env;
  const corrodedEnduranceLimit = baseEnduranceLimit * corrosionFatigueFactor;
  
  // Time to critical thickness loss (10% of diameter)
  const criticalLoss = wireDiameter * 0.1;
  const timeToCritical = criticalLoss / (effectiveCorrosionRate * 2);
  
  // Risk assessments
  const pittingRisk = assessPittingRisk(materialData.pittingFactor, totalEnvFactor);
  const sccRisk = assessSCCRisk(materialData.sccSusceptibility, maxStress, environment);
  
  // Generate recommendations
  const recommendations = generateCorrosionRecommendations(
    pittingRisk,
    sccRisk,
    effectiveCorrosionRate,
    timeToCritical,
    serviceYears,
    materialId
  );
  
  return {
    effectiveCorrosionRate,
    environmentFactor: totalEnvFactor,
    strengthDegradation: degradationCurve,
    corrodedEnduranceLimit,
    originalEnduranceLimit: baseEnduranceLimit,
    corrosionFatigueFactor,
    timeToCritical,
    pittingRisk,
    sccRisk,
    recommendations,
  };
}

/**
 * Assess pitting corrosion risk
 */
function assessPittingRisk(
  pittingFactor: number, 
  envFactor: number
): 'low' | 'medium' | 'high' | 'severe' {
  const risk = pittingFactor * envFactor;
  if (risk < 1) return 'low';
  if (risk < 3) return 'medium';
  if (risk < 6) return 'high';
  return 'severe';
}

/**
 * Assess stress corrosion cracking risk
 */
function assessSCCRisk(
  sccSusceptibility: number,
  maxStress: number,
  environment: CorrosionEnvironmentParams
): 'low' | 'medium' | 'high' | 'severe' {
  // SCC requires: susceptible material + tensile stress + corrosive environment
  const stressFactor = maxStress / 1000;  // Normalize to ~1 for typical spring stress
  const envFactor = ENVIRONMENT_FACTORS[environment.type];
  
  // Chloride SCC for stainless steels
  const chlorideFactor = environment.chlorideConcentration ? 
    Math.min(2, environment.chlorideConcentration / 1000) : 0;
  
  const risk = sccSusceptibility * stressFactor * (envFactor + chlorideFactor);
  
  if (risk < 0.2) return 'low';
  if (risk < 0.5) return 'medium';
  if (risk < 1.0) return 'high';
  return 'severe';
}

/**
 * Generate corrosion recommendations
 */
function generateCorrosionRecommendations(
  pittingRisk: string,
  sccRisk: string,
  corrosionRate: number,
  timeToCritical: number,
  serviceYears: number,
  materialId: string
): string[] {
  const recommendations: string[] = [];
  
  if (timeToCritical < serviceYears) {
    recommendations.push(
      `Critical thickness loss expected in ${timeToCritical.toFixed(1)} years - ` +
      `consider protective coating or material upgrade`
    );
  }
  
  if (pittingRisk === 'high' || pittingRisk === 'severe') {
    recommendations.push('High pitting risk - consider zinc/cadmium plating or stainless steel upgrade');
  }
  
  if (sccRisk === 'high' || sccRisk === 'severe') {
    recommendations.push('Stress corrosion cracking risk - reduce stress or use SCC-resistant alloy');
    if (materialId.includes('stainless')) {
      recommendations.push('For stainless steel: consider duplex or super-austenitic grades');
    }
  }
  
  if (corrosionRate > 0.1) {
    recommendations.push('High corrosion rate - protective coating strongly recommended');
    recommendations.push('Consider: zinc plating, phosphate coating, or epoxy coating');
  }
  
  if (corrosionRate > 0.05 && !materialId.includes('stainless')) {
    recommendations.push('Consider upgrading to stainless steel for improved corrosion resistance');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Corrosion risk is acceptable for planned service life');
  }
  
  return recommendations;
}

/**
 * Calculate remaining life at specific service time
 */
export function getRemainingLifeAtTime(
  result: CorrosionAnalysisResult,
  years: number
): { remainingStrength: number; remainingStiffness: number; remainingFatigueLife: number } | null {
  const point = result.strengthDegradation.find(d => d.years === Math.round(years));
  if (point) {
    return {
      remainingStrength: point.remainingStrength,
      remainingStiffness: point.remainingStiffness,
      remainingFatigueLife: point.remainingFatigueLife,
    };
  }
  
  // Interpolate
  const lower = result.strengthDegradation.filter(d => d.years <= years).pop();
  const upper = result.strengthDegradation.find(d => d.years > years);
  
  if (!lower || !upper) return null;
  
  const ratio = (years - lower.years) / (upper.years - lower.years);
  return {
    remainingStrength: lower.remainingStrength + ratio * (upper.remainingStrength - lower.remainingStrength),
    remainingStiffness: lower.remainingStiffness + ratio * (upper.remainingStiffness - lower.remainingStiffness),
    remainingFatigueLife: lower.remainingFatigueLife + ratio * (upper.remainingFatigueLife - lower.remainingFatigueLife),
  };
}
