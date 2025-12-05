/**
 * Structural Health Degradation Model - Phase 7
 * 结构健康退化模型
 * 
 * Models cumulative damage and end-of-life prediction
 */

/**
 * Degradation factors
 */
export interface DegradationFactors {
  /** Corrosion rate (mm/year) */
  corrosionRate: number;
  /** Operating temperature (°C) */
  temperature: number;
  /** Mean stress (MPa) */
  meanStress: number;
  /** Alternating stress (MPa) */
  alternatingStress: number;
  /** Operating frequency (Hz) */
  frequency: number;
  /** Cycles per year */
  cyclesPerYear: number;
  /** Environment humidity (%) */
  humidity: number;
}

/**
 * Material creep properties
 */
export interface CreepProperties {
  /** Creep activation energy (J/mol) */
  activationEnergy: number;
  /** Creep exponent */
  creepExponent: number;
  /** Reference creep rate at 100°C */
  referenceCreepRate: number;
}

/**
 * Default creep properties for spring steels
 */
const CREEP_PROPERTIES: Record<string, CreepProperties> = {
  music_wire: {
    activationEnergy: 250000,
    creepExponent: 4.5,
    referenceCreepRate: 1e-10,
  },
  chrome_vanadium: {
    activationEnergy: 280000,
    creepExponent: 4.0,
    referenceCreepRate: 5e-11,
  },
  chrome_silicon: {
    activationEnergy: 300000,
    creepExponent: 3.5,
    referenceCreepRate: 2e-11,
  },
  stainless: {
    activationEnergy: 270000,
    creepExponent: 5.0,
    referenceCreepRate: 8e-11,
  },
  inconel: {
    activationEnergy: 350000,
    creepExponent: 3.0,
    referenceCreepRate: 1e-12,
  },
  default: {
    activationEnergy: 260000,
    creepExponent: 4.0,
    referenceCreepRate: 5e-11,
  },
};

/**
 * Time point in degradation curve
 */
export interface DegradationTimePoint {
  /** Time (years) */
  years: number;
  /** Remaining stiffness (fraction 0-1) */
  remainingStiffness: number;
  /** Remaining strength (fraction 0-1) */
  remainingStrength: number;
  /** Cumulative fatigue damage (0-1, 1 = failure) */
  fatigueDamage: number;
  /** Remaining fatigue life (fraction 0-1) */
  remainingFatigueLife: number;
  /** Creep strain (%) */
  creepStrain: number;
  /** Free length change (mm) */
  freeLengthChange: number;
  /** Corrosion depth (mm) */
  corrosionDepth: number;
}

/**
 * End of life prediction
 */
export interface EndOfLifePrediction {
  /** Predicted end of life (years) */
  predictedEOL: number;
  /** Limiting factor */
  limitingFactor: 'fatigue' | 'corrosion' | 'creep' | 'stiffness_loss';
  /** Confidence level (0-1) */
  confidence: number;
  /** Safety margin (years) */
  safetyMargin: number;
  /** Recommended replacement interval (years) */
  recommendedReplacement: number;
}

/**
 * Health degradation result
 */
export interface HealthDegradationResult {
  /** Degradation curve over service life */
  degradationCurve: DegradationTimePoint[];
  /** End of life prediction */
  endOfLife: EndOfLifePrediction;
  /** Current health status (if service time provided) */
  currentHealth?: {
    overallHealth: number;  // 0-100%
    stiffnessHealth: number;
    fatigueHealth: number;
    corrosionHealth: number;
  };
  /** Maintenance recommendations */
  maintenanceSchedule: {
    interval: number;  // years
    actions: string[];
  }[];
  /** Risk timeline */
  riskTimeline: {
    years: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
}

/**
 * Calculate creep strain rate
 * Using Norton-Bailey creep law: ε̇ = A * σ^n * exp(-Q/RT)
 */
function calculateCreepRate(
  stress: number,  // MPa
  temperature: number,  // °C
  creepProps: CreepProperties
): number {
  const R = 8.314;  // Gas constant J/(mol·K)
  const T = temperature + 273.15;  // Kelvin
  
  const { activationEnergy, creepExponent, referenceCreepRate } = creepProps;
  
  // Reference temperature 100°C
  const T_ref = 373.15;
  
  // Creep rate
  const rate = referenceCreepRate * 
    Math.pow(stress / 500, creepExponent) *  // Normalized to 500 MPa
    Math.exp((activationEnergy / R) * (1/T_ref - 1/T));
  
  return rate;  // strain per second
}

/**
 * Calculate fatigue damage increment (Miner's rule)
 */
function calculateFatigueDamage(
  alternatingStress: number,
  meanStress: number,
  cycles: number,
  ultimateStrength: number,
  enduranceLimit: number
): number {
  // Goodman correction for mean stress
  const effectiveStress = alternatingStress / (1 - meanStress / ultimateStrength);
  
  // S-N curve: N = (σ_e / σ_a)^m * N_e
  // where N_e = 10^6 (endurance limit cycles), m ≈ 8
  const m = 8;
  const N_e = 1e6;
  
  if (effectiveStress <= enduranceLimit) {
    return 0;  // Below endurance limit, infinite life
  }
  
  const N_f = N_e * Math.pow(enduranceLimit / effectiveStress, m);
  
  // Damage fraction
  return cycles / N_f;
}

/**
 * Calculate corrosion-induced stiffness loss
 */
function calculateCorrosionStiffnessLoss(
  wireDiameter: number,
  corrosionDepth: number
): number {
  // Stiffness ∝ d^4
  const effectiveDiameter = Math.max(0, wireDiameter - 2 * corrosionDepth);
  const stiffnessRatio = Math.pow(effectiveDiameter / wireDiameter, 4);
  return 1 - stiffnessRatio;
}

/**
 * Calculate temperature-induced relaxation
 */
function calculateRelaxation(
  temperature: number,
  stress: number,
  time: number,  // hours
  materialType: string
): number {
  // Relaxation follows logarithmic law
  // σ(t) = σ_0 * (1 - k * log(1 + t/t_0))
  
  // Temperature factor
  const tempFactor = temperature > 100 ? 
    Math.exp(0.01 * (temperature - 100)) : 1;
  
  // Material factor
  const materialFactor = {
    music_wire: 1.0,
    chrome_vanadium: 0.8,
    chrome_silicon: 0.6,
    stainless: 0.9,
    inconel: 0.4,
  }[materialType] || 1.0;
  
  // Relaxation coefficient
  const k = 0.02 * tempFactor * materialFactor;
  const t_0 = 100;  // Reference time (hours)
  
  // Relaxation fraction
  return k * Math.log(1 + time / t_0);
}

/**
 * Model structural health degradation over service life
 */
export function modelHealthDegradation(
  wireDiameter: number,
  freeLength: number,
  springRate: number,
  ultimateStrength: number,
  enduranceLimit: number,
  factors: DegradationFactors,
  materialType: string = 'default',
  serviceYears: number = 20,
  currentServiceYears?: number
): HealthDegradationResult {
  const creepProps = CREEP_PROPERTIES[materialType] || CREEP_PROPERTIES.default;
  
  // Generate degradation curve
  const degradationCurve: DegradationTimePoint[] = [];
  const numPoints = Math.min(serviceYears * 4, 100);  // Quarterly points
  
  let cumulativeFatigueDamage = 0;
  let cumulativeCreepStrain = 0;
  let cumulativeCorrosion = 0;
  
  for (let i = 0; i <= numPoints; i++) {
    const years = (serviceYears / numPoints) * i;
    const hoursPerYear = 8760;
    const totalHours = years * hoursPerYear;
    
    // Corrosion depth
    cumulativeCorrosion = factors.corrosionRate * years;
    
    // Stiffness loss from corrosion
    const corrosionStiffnessLoss = calculateCorrosionStiffnessLoss(wireDiameter, cumulativeCorrosion);
    
    // Creep strain
    const creepRate = calculateCreepRate(factors.meanStress, factors.temperature, creepProps);
    cumulativeCreepStrain = creepRate * totalHours * 3600 * 100;  // Convert to %
    
    // Relaxation
    const relaxation = calculateRelaxation(
      factors.temperature, 
      factors.meanStress, 
      totalHours,
      materialType
    );
    
    // Fatigue damage
    const cyclesThisYear = factors.cyclesPerYear;
    const yearlyDamage = calculateFatigueDamage(
      factors.alternatingStress,
      factors.meanStress,
      cyclesThisYear,
      ultimateStrength,
      enduranceLimit
    );
    cumulativeFatigueDamage += yearlyDamage * (serviceYears / numPoints);
    
    // Combined stiffness loss
    const creepStiffnessLoss = cumulativeCreepStrain / 10;  // ~10% strain = total loss
    const totalStiffnessLoss = Math.min(1, corrosionStiffnessLoss + creepStiffnessLoss + relaxation);
    
    // Strength loss (from corrosion)
    const strengthLoss = calculateCorrosionStiffnessLoss(wireDiameter, cumulativeCorrosion) * 0.5;
    
    // Free length change (from creep and relaxation)
    const freeLengthChange = freeLength * (cumulativeCreepStrain / 100 + relaxation * 0.5);
    
    degradationCurve.push({
      years,
      remainingStiffness: Math.max(0, 1 - totalStiffnessLoss),
      remainingStrength: Math.max(0, 1 - strengthLoss),
      fatigueDamage: Math.min(1, cumulativeFatigueDamage),
      remainingFatigueLife: Math.max(0, 1 - cumulativeFatigueDamage),
      creepStrain: cumulativeCreepStrain,
      freeLengthChange,
      corrosionDepth: cumulativeCorrosion,
    });
  }
  
  // Determine end of life
  const endOfLife = predictEndOfLife(degradationCurve, wireDiameter);
  
  // Current health status
  let currentHealth;
  if (currentServiceYears !== undefined) {
    const currentPoint = degradationCurve.find(p => p.years >= currentServiceYears) || 
      degradationCurve[degradationCurve.length - 1];
    
    currentHealth = {
      overallHealth: Math.min(
        currentPoint.remainingStiffness,
        currentPoint.remainingFatigueLife,
        1 - currentPoint.corrosionDepth / (wireDiameter * 0.1)
      ) * 100,
      stiffnessHealth: currentPoint.remainingStiffness * 100,
      fatigueHealth: currentPoint.remainingFatigueLife * 100,
      corrosionHealth: Math.max(0, (1 - currentPoint.corrosionDepth / (wireDiameter * 0.1))) * 100,
    };
  }
  
  // Maintenance schedule
  const maintenanceSchedule = generateMaintenanceSchedule(endOfLife, factors);
  
  // Risk timeline
  const riskTimeline = generateRiskTimeline(degradationCurve, endOfLife);
  
  return {
    degradationCurve,
    endOfLife,
    currentHealth,
    maintenanceSchedule,
    riskTimeline,
  };
}

/**
 * Predict end of life
 */
function predictEndOfLife(
  curve: DegradationTimePoint[],
  wireDiameter: number
): EndOfLifePrediction {
  // Find when each limit is reached
  let fatigueEOL = Infinity;
  let corrosionEOL = Infinity;
  let creepEOL = Infinity;
  let stiffnessEOL = Infinity;
  
  for (const point of curve) {
    // Fatigue failure at damage = 1
    if (point.fatigueDamage >= 1 && fatigueEOL === Infinity) {
      fatigueEOL = point.years;
    }
    
    // Corrosion limit at 10% of wire diameter
    if (point.corrosionDepth >= wireDiameter * 0.1 && corrosionEOL === Infinity) {
      corrosionEOL = point.years;
    }
    
    // Creep limit at 2% strain
    if (point.creepStrain >= 2 && creepEOL === Infinity) {
      creepEOL = point.years;
    }
    
    // Stiffness loss limit at 20%
    if (point.remainingStiffness <= 0.8 && stiffnessEOL === Infinity) {
      stiffnessEOL = point.years;
    }
  }
  
  // Find minimum (limiting factor)
  const eolValues = [
    { years: fatigueEOL, factor: 'fatigue' as const },
    { years: corrosionEOL, factor: 'corrosion' as const },
    { years: creepEOL, factor: 'creep' as const },
    { years: stiffnessEOL, factor: 'stiffness_loss' as const },
  ];
  
  const limiting = eolValues.reduce((min, curr) => 
    curr.years < min.years ? curr : min
  );
  
  // Confidence based on how well-defined the limit is
  const confidence = limiting.years < Infinity ? 0.8 : 0.5;
  
  // Safety margin (20% of EOL)
  const safetyMargin = limiting.years * 0.2;
  
  // Recommended replacement (80% of EOL)
  const recommendedReplacement = limiting.years * 0.8;
  
  return {
    predictedEOL: limiting.years,
    limitingFactor: limiting.factor,
    confidence,
    safetyMargin,
    recommendedReplacement,
  };
}

/**
 * Generate maintenance schedule
 */
function generateMaintenanceSchedule(
  eol: EndOfLifePrediction,
  factors: DegradationFactors
): { interval: number; actions: string[] }[] {
  const schedule: { interval: number; actions: string[] }[] = [];
  
  // Annual inspection
  schedule.push({
    interval: 1,
    actions: [
      'Visual inspection for corrosion and damage',
      'Check free length and installed height',
      'Verify spring rate (load test)',
    ],
  });
  
  // Based on limiting factor
  if (eol.limitingFactor === 'corrosion') {
    schedule.push({
      interval: 2,
      actions: [
        'Detailed corrosion inspection',
        'Reapply protective coating if needed',
        'Check for pitting corrosion',
      ],
    });
  }
  
  if (eol.limitingFactor === 'fatigue') {
    schedule.push({
      interval: Math.max(1, eol.predictedEOL / 4),
      actions: [
        'Fatigue crack inspection (dye penetrant)',
        'Check for surface defects',
        'Measure permanent set',
      ],
    });
  }
  
  if (factors.temperature > 150) {
    schedule.push({
      interval: 0.5,
      actions: [
        'Check for thermal relaxation',
        'Measure load at installed height',
        'Inspect for heat discoloration',
      ],
    });
  }
  
  // Pre-replacement inspection
  schedule.push({
    interval: eol.recommendedReplacement,
    actions: [
      'Comprehensive end-of-life assessment',
      'Schedule replacement',
      'Document final condition',
    ],
  });
  
  return schedule.sort((a, b) => a.interval - b.interval);
}

/**
 * Generate risk timeline
 */
function generateRiskTimeline(
  curve: DegradationTimePoint[],
  eol: EndOfLifePrediction
): { years: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'; description: string }[] {
  const timeline: { years: number; riskLevel: 'low' | 'medium' | 'high' | 'critical'; description: string }[] = [];
  
  // Initial period - low risk
  timeline.push({
    years: 0,
    riskLevel: 'low',
    description: 'New spring - all parameters within specification',
  });
  
  // Find transition points
  for (const point of curve) {
    // 10% stiffness loss
    if (point.remainingStiffness <= 0.9 && !timeline.some(t => t.description.includes('stiffness'))) {
      timeline.push({
        years: point.years,
        riskLevel: 'medium',
        description: '10% stiffness loss - increased monitoring recommended',
      });
    }
    
    // 50% fatigue life consumed
    if (point.fatigueDamage >= 0.5 && !timeline.some(t => t.description.includes('fatigue'))) {
      timeline.push({
        years: point.years,
        riskLevel: 'medium',
        description: '50% fatigue life consumed - plan for replacement',
      });
    }
    
    // 80% fatigue life consumed
    if (point.fatigueDamage >= 0.8 && !timeline.some(t => t.description.includes('80%'))) {
      timeline.push({
        years: point.years,
        riskLevel: 'high',
        description: '80% fatigue life consumed - replacement recommended',
      });
    }
  }
  
  // End of life
  if (eol.predictedEOL < Infinity) {
    timeline.push({
      years: eol.predictedEOL,
      riskLevel: 'critical',
      description: `End of life due to ${eol.limitingFactor} - replacement required`,
    });
  }
  
  return timeline.sort((a, b) => a.years - b.years);
}

/**
 * Calculate remaining useful life
 */
export function calculateRemainingLife(
  result: HealthDegradationResult,
  currentYears: number
): number {
  return Math.max(0, result.endOfLife.predictedEOL - currentYears);
}
