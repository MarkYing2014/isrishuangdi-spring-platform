/**
 * Diffusion Coating Simulation - Phase 7
 * 扩散涂层仿真
 * 
 * Simulates coating thickness, diffusion penetration, and corrosion protection
 */

/**
 * Coating type
 */
export type CoatingType = 
  | 'zinc_electroplate'
  | 'zinc_hot_dip'
  | 'cadmium'
  | 'phosphate'
  | 'chrome'
  | 'nickel'
  | 'epoxy'
  | 'powder_coat'
  | 'nitriding'
  | 'carburizing'
  | 'dlc'  // Diamond-like carbon
  | 'none';

/**
 * Coating properties
 */
export interface CoatingProperties {
  /** Coating type */
  type: CoatingType;
  /** Nominal thickness (μm) */
  thickness: number;
  /** Diffusion coefficient (mm²/s) */
  diffusionCoefficient: number;
  /** Passivation thickness (μm) - minimum for protection */
  passivationThickness: number;
  /** Corrosion protection factor (multiplier for life) */
  protectionFactor: number;
  /** Hardness (HV) */
  hardness: number;
  /** Friction coefficient */
  frictionCoefficient: number;
  /** Max operating temperature (°C) */
  maxTemperature: number;
  /** Hydrogen embrittlement risk */
  hydrogenRisk: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Coating database
 */
export const COATING_DATABASE: Record<CoatingType, Omit<CoatingProperties, 'type' | 'thickness'>> = {
  zinc_electroplate: {
    diffusionCoefficient: 1e-14,
    passivationThickness: 5,
    protectionFactor: 3,
    hardness: 70,
    frictionCoefficient: 0.5,
    maxTemperature: 250,
    hydrogenRisk: 'medium',
  },
  zinc_hot_dip: {
    diffusionCoefficient: 5e-15,
    passivationThickness: 20,
    protectionFactor: 5,
    hardness: 50,
    frictionCoefficient: 0.6,
    maxTemperature: 300,
    hydrogenRisk: 'low',
  },
  cadmium: {
    diffusionCoefficient: 2e-14,
    passivationThickness: 8,
    protectionFactor: 8,
    hardness: 60,
    frictionCoefficient: 0.3,
    maxTemperature: 230,
    hydrogenRisk: 'high',
  },
  phosphate: {
    diffusionCoefficient: 1e-13,
    passivationThickness: 3,
    protectionFactor: 1.5,
    hardness: 200,
    frictionCoefficient: 0.15,
    maxTemperature: 200,
    hydrogenRisk: 'none',
  },
  chrome: {
    diffusionCoefficient: 5e-16,
    passivationThickness: 2,
    protectionFactor: 10,
    hardness: 900,
    frictionCoefficient: 0.4,
    maxTemperature: 500,
    hydrogenRisk: 'high',
  },
  nickel: {
    diffusionCoefficient: 1e-15,
    passivationThickness: 5,
    protectionFactor: 6,
    hardness: 500,
    frictionCoefficient: 0.4,
    maxTemperature: 400,
    hydrogenRisk: 'medium',
  },
  epoxy: {
    diffusionCoefficient: 1e-12,
    passivationThickness: 50,
    protectionFactor: 4,
    hardness: 80,
    frictionCoefficient: 0.3,
    maxTemperature: 120,
    hydrogenRisk: 'none',
  },
  powder_coat: {
    diffusionCoefficient: 5e-13,
    passivationThickness: 40,
    protectionFactor: 5,
    hardness: 100,
    frictionCoefficient: 0.35,
    maxTemperature: 150,
    hydrogenRisk: 'none',
  },
  nitriding: {
    diffusionCoefficient: 1e-11,
    passivationThickness: 100,
    protectionFactor: 4,
    hardness: 1000,
    frictionCoefficient: 0.3,
    maxTemperature: 500,
    hydrogenRisk: 'low',
  },
  carburizing: {
    diffusionCoefficient: 5e-11,
    passivationThickness: 200,
    protectionFactor: 3,
    hardness: 700,
    frictionCoefficient: 0.4,
    maxTemperature: 400,
    hydrogenRisk: 'low',
  },
  dlc: {
    diffusionCoefficient: 1e-17,
    passivationThickness: 1,
    protectionFactor: 15,
    hardness: 3000,
    frictionCoefficient: 0.1,
    maxTemperature: 300,
    hydrogenRisk: 'none',
  },
  none: {
    diffusionCoefficient: 0,
    passivationThickness: 0,
    protectionFactor: 1,
    hardness: 0,
    frictionCoefficient: 0.5,
    maxTemperature: 1000,
    hydrogenRisk: 'none',
  },
};

/**
 * Coating simulation parameters
 */
export interface CoatingSimulationParams {
  /** Coating type */
  coatingType: CoatingType;
  /** Applied thickness (μm) */
  appliedThickness: number;
  /** Operating temperature (°C) */
  operatingTemperature: number;
  /** Exposure time (hours) */
  exposureTime: number;
  /** Environment aggressiveness (0-1) */
  environmentAggressiveness: number;
}

/**
 * Coating simulation result
 */
export interface CoatingSimulationResult {
  /** Coating properties used */
  coatingProperties: CoatingProperties;
  /** Diffusion penetration depth (μm) */
  diffusionPenetrationDepth: number;
  /** Remaining effective thickness (μm) */
  remainingThickness: number;
  /** Protection status */
  protectionStatus: 'full' | 'partial' | 'compromised' | 'failed';
  /** Corrosion risk level */
  corrosionRisk: 'low' | 'medium' | 'high' | 'critical';
  /** Fatigue life modification factor */
  fatigueLifeFactor: number;
  /** Time to coating failure (hours) */
  timeToFailure: number;
  /** Coating degradation curve */
  degradationCurve: {
    time: number;  // hours
    remainingThickness: number;  // μm
    protectionLevel: number;  // 0-1
  }[];
  /** Hydrogen embrittlement warning */
  hydrogenWarning: boolean;
  /** Temperature warning */
  temperatureWarning: boolean;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Calculate diffusion penetration depth
 * Using Fick's second law: dp = sqrt(D * t)
 */
function calculateDiffusionDepth(
  diffusionCoefficient: number,  // mm²/s
  time: number,  // hours
  temperature: number  // °C
): number {
  // Convert time to seconds
  const timeSeconds = time * 3600;
  
  // Temperature-adjusted diffusion coefficient (Arrhenius)
  const referenceTemp = 25;
  const activationEnergy = 100000;  // J/mol (typical for metal diffusion)
  const gasConstant = 8.314;
  
  const T1 = referenceTemp + 273.15;
  const T2 = temperature + 273.15;
  const tempFactor = Math.exp((activationEnergy / gasConstant) * (1/T1 - 1/T2));
  
  const effectiveD = diffusionCoefficient * tempFactor;
  
  // Diffusion depth in mm, convert to μm
  const depthMm = Math.sqrt(effectiveD * timeSeconds);
  return depthMm * 1000;  // μm
}

/**
 * Calculate coating degradation rate
 */
function calculateDegradationRate(
  coatingType: CoatingType,
  temperature: number,
  environmentAggressiveness: number
): number {
  // Base degradation rate (μm/1000 hours)
  const baseRates: Record<CoatingType, number> = {
    zinc_electroplate: 0.5,
    zinc_hot_dip: 0.3,
    cadmium: 0.2,
    phosphate: 1.0,
    chrome: 0.05,
    nickel: 0.1,
    epoxy: 2.0,
    powder_coat: 1.5,
    nitriding: 0.01,
    carburizing: 0.02,
    dlc: 0.005,
    none: 0,
  };
  
  const baseRate = baseRates[coatingType];
  
  // Temperature acceleration
  const tempFactor = temperature > 100 ? Math.pow(1.1, (temperature - 100) / 50) : 1;
  
  // Environment acceleration
  const envFactor = 1 + environmentAggressiveness * 2;
  
  return baseRate * tempFactor * envFactor;
}

/**
 * Simulate coating behavior
 */
export function simulateCoating(params: CoatingSimulationParams): CoatingSimulationResult {
  const { coatingType, appliedThickness, operatingTemperature, exposureTime, environmentAggressiveness } = params;
  
  // Get coating properties
  const baseProps = COATING_DATABASE[coatingType];
  const coatingProperties: CoatingProperties = {
    type: coatingType,
    thickness: appliedThickness,
    ...baseProps,
  };
  
  // Calculate diffusion penetration
  const diffusionPenetrationDepth = calculateDiffusionDepth(
    baseProps.diffusionCoefficient,
    exposureTime,
    operatingTemperature
  );
  
  // Calculate degradation
  const degradationRate = calculateDegradationRate(coatingType, operatingTemperature, environmentAggressiveness);
  const thicknessLoss = degradationRate * (exposureTime / 1000);
  const remainingThickness = Math.max(0, appliedThickness - thicknessLoss);
  
  // Determine protection status
  let protectionStatus: CoatingSimulationResult['protectionStatus'];
  let corrosionRisk: CoatingSimulationResult['corrosionRisk'];
  
  if (remainingThickness >= baseProps.passivationThickness) {
    if (diffusionPenetrationDepth < remainingThickness * 0.5) {
      protectionStatus = 'full';
      corrosionRisk = 'low';
    } else {
      protectionStatus = 'partial';
      corrosionRisk = 'medium';
    }
  } else if (remainingThickness > 0) {
    protectionStatus = 'compromised';
    corrosionRisk = 'high';
  } else {
    protectionStatus = 'failed';
    corrosionRisk = 'critical';
  }
  
  // Calculate fatigue life factor
  let fatigueLifeFactor = baseProps.protectionFactor;
  if (protectionStatus === 'partial') {
    fatigueLifeFactor *= 0.7;
  } else if (protectionStatus === 'compromised') {
    fatigueLifeFactor *= 0.3;
  } else if (protectionStatus === 'failed') {
    fatigueLifeFactor = 0.5;  // Worse than uncoated due to stress concentration
  }
  
  // Time to coating failure
  const timeToFailure = appliedThickness / degradationRate * 1000;  // hours
  
  // Generate degradation curve
  const degradationCurve: CoatingSimulationResult['degradationCurve'] = [];
  const maxTime = Math.max(exposureTime * 2, timeToFailure * 1.5);
  const numPoints = 50;
  
  for (let i = 0; i <= numPoints; i++) {
    const time = (maxTime / numPoints) * i;
    const loss = degradationRate * (time / 1000);
    const remaining = Math.max(0, appliedThickness - loss);
    const protection = remaining >= baseProps.passivationThickness ? 
      remaining / appliedThickness : 
      (remaining / baseProps.passivationThickness) * 0.5;
    
    degradationCurve.push({
      time,
      remainingThickness: remaining,
      protectionLevel: Math.min(1, protection),
    });
  }
  
  // Warnings
  const hydrogenWarning = baseProps.hydrogenRisk === 'high' || 
    (baseProps.hydrogenRisk === 'medium' && appliedThickness > 20);
  const temperatureWarning = operatingTemperature > baseProps.maxTemperature * 0.9;
  
  // Recommendations
  const recommendations = generateCoatingRecommendations(
    coatingType,
    protectionStatus,
    corrosionRisk,
    hydrogenWarning,
    temperatureWarning,
    timeToFailure,
    exposureTime
  );
  
  return {
    coatingProperties,
    diffusionPenetrationDepth,
    remainingThickness,
    protectionStatus,
    corrosionRisk,
    fatigueLifeFactor,
    timeToFailure,
    degradationCurve,
    hydrogenWarning,
    temperatureWarning,
    recommendations,
  };
}

/**
 * Generate coating recommendations
 */
function generateCoatingRecommendations(
  coatingType: CoatingType,
  protectionStatus: string,
  corrosionRisk: string,
  hydrogenWarning: boolean,
  temperatureWarning: boolean,
  timeToFailure: number,
  exposureTime: number
): string[] {
  const recommendations: string[] = [];
  
  if (protectionStatus === 'compromised' || protectionStatus === 'failed') {
    recommendations.push('Coating protection is degraded - consider recoating or material upgrade');
  }
  
  if (timeToFailure < exposureTime * 1.5) {
    recommendations.push(`Coating expected to fail in ${(timeToFailure/1000).toFixed(1)}k hours - plan for maintenance`);
  }
  
  if (hydrogenWarning) {
    recommendations.push('Hydrogen embrittlement risk - consider baking after plating or alternative coating');
    if (coatingType === 'cadmium') {
      recommendations.push('Cadmium plating requires careful hydrogen bake-out (190°C for 8-24 hours)');
    }
  }
  
  if (temperatureWarning) {
    recommendations.push('Operating temperature near coating limit - consider high-temperature coating');
    recommendations.push('Alternatives: nitriding, chrome plating, or ceramic coating');
  }
  
  if (coatingType === 'none' && corrosionRisk !== 'low') {
    recommendations.push('No coating applied - consider protective treatment for corrosive environment');
  }
  
  if (corrosionRisk === 'critical') {
    recommendations.push('Critical corrosion risk - immediate action required');
    recommendations.push('Consider: thicker coating, duplex coating system, or corrosion-resistant alloy');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Coating performance is satisfactory for current conditions');
  }
  
  return recommendations;
}

/**
 * Compare coating options
 */
export function compareCoatings(
  coatingTypes: CoatingType[],
  thickness: number,
  temperature: number,
  exposureTime: number,
  environmentAggressiveness: number
): Map<CoatingType, CoatingSimulationResult> {
  const results = new Map<CoatingType, CoatingSimulationResult>();
  
  for (const type of coatingTypes) {
    const result = simulateCoating({
      coatingType: type,
      appliedThickness: thickness,
      operatingTemperature: temperature,
      exposureTime,
      environmentAggressiveness,
    });
    results.set(type, result);
  }
  
  return results;
}

/**
 * Recommend optimal coating
 */
export function recommendCoating(
  temperature: number,
  environmentAggressiveness: number,
  fatigueRequirement: 'low' | 'medium' | 'high',
  hydrogenSensitive: boolean
): CoatingType {
  // Filter out coatings that don't meet temperature requirement
  const validCoatings = Object.entries(COATING_DATABASE)
    .filter(([type, props]) => {
      if (type === 'none') return false;
      if (props.maxTemperature < temperature) return false;
      if (hydrogenSensitive && props.hydrogenRisk === 'high') return false;
      return true;
    });
  
  // Score coatings
  let bestCoating: CoatingType = 'zinc_electroplate';
  let bestScore = 0;
  
  for (const [type, props] of validCoatings) {
    let score = props.protectionFactor * 10;
    
    // Bonus for fatigue requirement
    if (fatigueRequirement === 'high') {
      score += props.hardness / 100;
    }
    
    // Penalty for environment mismatch
    if (environmentAggressiveness > 0.7 && props.protectionFactor < 5) {
      score *= 0.5;
    }
    
    // Bonus for low hydrogen risk
    if (props.hydrogenRisk === 'none') {
      score += 10;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCoating = type as CoatingType;
    }
  }
  
  return bestCoating;
}
