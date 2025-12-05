/**
 * Cost & Yield AI Predictor - Phase 7
 * 成本与良率AI预测器
 * 
 * Predicts manufacturing cost, scrap rate, and process capability
 */

/**
 * Material grade for cost calculation
 */
export type MaterialGrade = 
  | 'music_wire'
  | 'hard_drawn'
  | 'oil_tempered'
  | 'chrome_vanadium'
  | 'chrome_silicon'
  | 'stainless_302'
  | 'stainless_316'
  | 'stainless_17_7ph'
  | 'inconel'
  | 'titanium'
  | 'beryllium_copper';

/**
 * Surface treatment type
 */
export type SurfaceTreatment = 
  | 'none'
  | 'zinc_plate'
  | 'zinc_yellow'
  | 'cadmium'
  | 'phosphate'
  | 'black_oxide'
  | 'passivate'
  | 'powder_coat'
  | 'epoxy';

/**
 * Cost prediction input
 */
export interface CostPredictionInput {
  /** Material grade */
  materialGrade: MaterialGrade;
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Active coils */
  activeCoils: number;
  /** Free length (mm) */
  freeLength: number;
  /** Tolerance class */
  toleranceClass: 'standard' | 'precision' | 'ultra_precision';
  /** Surface treatment */
  surfaceTreatment: SurfaceTreatment;
  /** Shot peening */
  shotPeening: boolean;
  /** Shot peening intensity */
  shotPeeningIntensity?: 'light' | 'standard' | 'heavy';
  /** Stress relief */
  stressRelief: boolean;
  /** Batch volume */
  batchVolume: number;
  /** End type */
  endType: 'open' | 'closed' | 'ground' | 'closed_ground';
}

/**
 * Material cost data ($/kg)
 */
const MATERIAL_COSTS: Record<MaterialGrade, number> = {
  music_wire: 3.5,
  hard_drawn: 2.5,
  oil_tempered: 4.0,
  chrome_vanadium: 5.5,
  chrome_silicon: 6.0,
  stainless_302: 8.0,
  stainless_316: 12.0,
  stainless_17_7ph: 25.0,
  inconel: 80.0,
  titanium: 120.0,
  beryllium_copper: 45.0,
};

/**
 * Material density (kg/m³)
 */
const MATERIAL_DENSITY: Record<MaterialGrade, number> = {
  music_wire: 7850,
  hard_drawn: 7850,
  oil_tempered: 7850,
  chrome_vanadium: 7850,
  chrome_silicon: 7850,
  stainless_302: 7900,
  stainless_316: 8000,
  stainless_17_7ph: 7800,
  inconel: 8200,
  titanium: 4500,
  beryllium_copper: 8250,
};

/**
 * Surface treatment costs ($/piece base + $/kg)
 */
const TREATMENT_COSTS: Record<SurfaceTreatment, { base: number; perKg: number }> = {
  none: { base: 0, perKg: 0 },
  zinc_plate: { base: 0.02, perKg: 1.5 },
  zinc_yellow: { base: 0.03, perKg: 2.0 },
  cadmium: { base: 0.05, perKg: 4.0 },
  phosphate: { base: 0.01, perKg: 0.8 },
  black_oxide: { base: 0.02, perKg: 1.0 },
  passivate: { base: 0.02, perKg: 1.2 },
  powder_coat: { base: 0.10, perKg: 3.0 },
  epoxy: { base: 0.08, perKg: 2.5 },
};

/**
 * Tolerance multipliers
 */
const TOLERANCE_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  precision: 1.5,
  ultra_precision: 2.5,
};

/**
 * Cost breakdown
 */
export interface CostBreakdown {
  /** Material cost per piece ($) */
  materialCost: number;
  /** Labor cost per piece ($) */
  laborCost: number;
  /** Machine cost per piece ($) */
  machineCost: number;
  /** Surface treatment cost ($) */
  treatmentCost: number;
  /** Shot peening cost ($) */
  shotPeeningCost: number;
  /** Grinding cost (if applicable) ($) */
  grindingCost: number;
  /** Quality inspection cost ($) */
  inspectionCost: number;
  /** Setup cost amortized ($) */
  setupCostPerPiece: number;
  /** Total cost per piece ($) */
  totalCostPerPiece: number;
  /** Total batch cost ($) */
  totalBatchCost: number;
}

/**
 * Yield prediction
 */
export interface YieldPrediction {
  /** Expected yield (%) */
  expectedYield: number;
  /** Expected scrap rate (%) */
  scrapRate: number;
  /** First pass yield (%) */
  firstPassYield: number;
  /** Rework rate (%) */
  reworkRate: number;
  /** Process capability index (Cpk) */
  cpk: number;
  /** Process performance index (Ppk) */
  ppk: number;
  /** Defects per million opportunities */
  dpmo: number;
  /** Sigma level */
  sigmaLevel: number;
}

/**
 * Risk factors
 */
export interface RiskFactors {
  /** Wire curvature risk (0-1) */
  wireCurvatureRisk: number;
  /** Tolerance tightness risk (0-1) */
  toleranceTightnessRisk: number;
  /** Fatigue risk (0-1) */
  fatigueRisk: number;
  /** Surface defect risk (0-1) */
  surfaceDefectRisk: number;
  /** Dimensional risk (0-1) */
  dimensionalRisk: number;
  /** Overall risk score (0-100) */
  overallRiskScore: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Cost and yield prediction result
 */
export interface CostYieldPredictionResult {
  /** Cost breakdown */
  costBreakdown: CostBreakdown;
  /** Yield prediction */
  yieldPrediction: YieldPrediction;
  /** Risk factors */
  riskFactors: RiskFactors;
  /** Required inspection precision (mm) */
  requiredInspectionPrecision: number;
  /** Recommended batch size for optimal cost */
  recommendedBatchSize: number;
  /** Break-even quantity */
  breakEvenQuantity: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Calculate spring wire length
 */
function calculateWireLength(
  meanDiameter: number,
  activeCoils: number,
  wireDiameter: number
): number {
  const totalCoils = activeCoils + 2;  // Dead coils
  const coilCircumference = Math.PI * meanDiameter;
  return totalCoils * coilCircumference;
}

/**
 * Calculate spring weight
 */
function calculateWeight(
  wireDiameter: number,
  wireLength: number,
  density: number
): number {
  const wireArea = Math.PI * Math.pow(wireDiameter / 2, 2);  // mm²
  const volume = wireArea * wireLength;  // mm³
  return (volume / 1e9) * density;  // kg
}

/**
 * Calculate spring index complexity factor
 */
function calculateComplexityFactor(
  wireDiameter: number,
  meanDiameter: number,
  activeCoils: number
): number {
  const springIndex = meanDiameter / wireDiameter;
  
  let factor = 1.0;
  
  // Spring index effects
  if (springIndex < 4) {
    factor *= 1.5;  // Very tight coils - difficult
  } else if (springIndex < 6) {
    factor *= 1.2;
  } else if (springIndex > 15) {
    factor *= 1.3;  // Very loose - stability issues
  }
  
  // Coil count effects
  if (activeCoils < 3) {
    factor *= 1.3;  // Few coils - precision critical
  } else if (activeCoils > 20) {
    factor *= 1.2;  // Many coils - handling issues
  }
  
  // Wire diameter effects
  if (wireDiameter < 0.5) {
    factor *= 1.5;  // Fine wire - difficult handling
  } else if (wireDiameter > 10) {
    factor *= 1.3;  // Heavy wire - forming forces
  }
  
  return factor;
}

/**
 * Predict process capability
 */
function predictProcessCapability(
  toleranceClass: string,
  complexityFactor: number,
  batchVolume: number
): { cpk: number; ppk: number; dpmo: number; sigmaLevel: number } {
  // Base Cpk for each tolerance class
  const baseCpk: Record<string, number> = {
    standard: 1.33,
    precision: 1.0,
    ultra_precision: 0.8,
  };
  
  let cpk = baseCpk[toleranceClass] || 1.33;
  
  // Adjust for complexity
  cpk /= complexityFactor;
  
  // Adjust for batch volume (learning curve)
  if (batchVolume > 10000) {
    cpk *= 1.1;  // Process stabilizes
  } else if (batchVolume < 100) {
    cpk *= 0.9;  // Less process optimization
  }
  
  // Ppk is typically slightly lower than Cpk
  const ppk = cpk * 0.95;
  
  // Calculate DPMO from Cpk
  // DPMO ≈ 1,000,000 * (1 - Φ(3*Cpk))
  // Simplified approximation
  const dpmo = Math.max(1, 1000000 * Math.exp(-3 * cpk * cpk));
  
  // Sigma level
  const sigmaLevel = 3 * cpk;
  
  return { cpk, ppk, dpmo, sigmaLevel };
}

/**
 * Calculate risk factors
 */
function calculateRiskFactors(
  input: CostPredictionInput,
  complexityFactor: number
): RiskFactors {
  const springIndex = input.meanDiameter / input.wireDiameter;
  
  // Wire curvature risk
  let wireCurvatureRisk = 0;
  if (springIndex < 4) {
    wireCurvatureRisk = 0.8;
  } else if (springIndex < 6) {
    wireCurvatureRisk = 0.4;
  } else if (springIndex > 15) {
    wireCurvatureRisk = 0.5;
  } else {
    wireCurvatureRisk = 0.2;
  }
  
  // Tolerance tightness risk
  const toleranceTightnessRisk = {
    standard: 0.1,
    precision: 0.4,
    ultra_precision: 0.7,
  }[input.toleranceClass] || 0.2;
  
  // Fatigue risk (based on material and treatment)
  let fatigueRisk = 0.3;
  if (input.shotPeening) {
    fatigueRisk *= 0.5;
  }
  if (['inconel', 'chrome_silicon'].includes(input.materialGrade)) {
    fatigueRisk *= 0.7;
  }
  
  // Surface defect risk
  let surfaceDefectRisk = 0.2;
  if (input.wireDiameter < 1) {
    surfaceDefectRisk = 0.4;
  }
  if (input.surfaceTreatment !== 'none') {
    surfaceDefectRisk += 0.1;  // Treatment can introduce defects
  }
  
  // Dimensional risk
  const dimensionalRisk = Math.min(0.9, complexityFactor * 0.3);
  
  // Overall risk score
  const overallRiskScore = (
    wireCurvatureRisk * 20 +
    toleranceTightnessRisk * 25 +
    fatigueRisk * 20 +
    surfaceDefectRisk * 15 +
    dimensionalRisk * 20
  );
  
  // Risk level
  let riskLevel: RiskFactors['riskLevel'];
  if (overallRiskScore < 25) {
    riskLevel = 'low';
  } else if (overallRiskScore < 50) {
    riskLevel = 'medium';
  } else if (overallRiskScore < 75) {
    riskLevel = 'high';
  } else {
    riskLevel = 'critical';
  }
  
  return {
    wireCurvatureRisk,
    toleranceTightnessRisk,
    fatigueRisk,
    surfaceDefectRisk,
    dimensionalRisk,
    overallRiskScore,
    riskLevel,
  };
}

/**
 * Predict manufacturing cost and yield
 */
export function predictCostAndYield(input: CostPredictionInput): CostYieldPredictionResult {
  const {
    materialGrade,
    wireDiameter,
    meanDiameter,
    activeCoils,
    freeLength,
    toleranceClass,
    surfaceTreatment,
    shotPeening,
    shotPeeningIntensity,
    stressRelief,
    batchVolume,
    endType,
  } = input;
  
  // Calculate wire properties
  const wireLength = calculateWireLength(meanDiameter, activeCoils, wireDiameter);
  const density = MATERIAL_DENSITY[materialGrade] || 7850;
  const weight = calculateWeight(wireDiameter, wireLength, density);
  
  // Complexity factor
  const complexityFactor = calculateComplexityFactor(wireDiameter, meanDiameter, activeCoils);
  
  // Material cost
  const materialCostPerKg = MATERIAL_COSTS[materialGrade] || 5;
  const materialCost = weight * materialCostPerKg * 1.1;  // 10% scrap allowance
  
  // Labor cost (base rate * complexity * tolerance)
  const baseLabor = 0.05;  // $/piece base
  const laborCost = baseLabor * complexityFactor * TOLERANCE_MULTIPLIERS[toleranceClass];
  
  // Machine cost
  const machineRate = 0.50;  // $/minute
  const cycleTime = 0.1 + activeCoils * 0.02;  // minutes per piece
  const machineCost = machineRate * cycleTime * complexityFactor;
  
  // Surface treatment cost
  const treatmentData = TREATMENT_COSTS[surfaceTreatment];
  const treatmentCost = treatmentData.base + weight * treatmentData.perKg;
  
  // Shot peening cost
  let shotPeeningCost = 0;
  if (shotPeening) {
    const intensityMultiplier = {
      light: 0.8,
      standard: 1.0,
      heavy: 1.3,
    }[shotPeeningIntensity || 'standard'];
    shotPeeningCost = 0.03 * intensityMultiplier + weight * 2;
  }
  
  // Grinding cost (for ground ends)
  let grindingCost = 0;
  if (endType === 'ground' || endType === 'closed_ground') {
    grindingCost = 0.02 + wireDiameter * 0.01;
  }
  
  // Stress relief cost
  let stressReliefCost = 0;
  if (stressRelief) {
    stressReliefCost = 0.01 + weight * 0.5;
  }
  
  // Inspection cost
  const inspectionCost = {
    standard: 0.01,
    precision: 0.03,
    ultra_precision: 0.08,
  }[toleranceClass] || 0.02;
  
  // Setup cost
  const setupCost = 150 + complexityFactor * 50;  // Base setup cost
  const setupCostPerPiece = setupCost / batchVolume;
  
  // Total cost
  const totalCostPerPiece = 
    materialCost + 
    laborCost + 
    machineCost + 
    treatmentCost + 
    shotPeeningCost + 
    grindingCost + 
    stressReliefCost +
    inspectionCost + 
    setupCostPerPiece;
  
  const totalBatchCost = totalCostPerPiece * batchVolume + setupCost;
  
  const costBreakdown: CostBreakdown = {
    materialCost,
    laborCost,
    machineCost,
    treatmentCost,
    shotPeeningCost,
    grindingCost,
    inspectionCost,
    setupCostPerPiece,
    totalCostPerPiece,
    totalBatchCost,
  };
  
  // Yield prediction
  const processCapability = predictProcessCapability(toleranceClass, complexityFactor, batchVolume);
  
  // Expected yield based on Cpk
  const expectedYield = Math.min(99.9, 100 * (1 - processCapability.dpmo / 1000000));
  const scrapRate = 100 - expectedYield;
  const firstPassYield = expectedYield * 0.95;  // Some rework
  const reworkRate = expectedYield - firstPassYield;
  
  const yieldPrediction: YieldPrediction = {
    expectedYield,
    scrapRate,
    firstPassYield,
    reworkRate,
    ...processCapability,
  };
  
  // Risk factors
  const riskFactors = calculateRiskFactors(input, complexityFactor);
  
  // Required inspection precision
  const requiredInspectionPrecision = {
    standard: 0.1,
    precision: 0.05,
    ultra_precision: 0.01,
  }[toleranceClass] || 0.1;
  
  // Recommended batch size (minimize cost per piece)
  const recommendedBatchSize = Math.max(100, Math.ceil(setupCost / (totalCostPerPiece * 0.1)));
  
  // Break-even quantity
  const variableCost = totalCostPerPiece - setupCostPerPiece;
  const breakEvenQuantity = Math.ceil(setupCost / variableCost);
  
  // Recommendations
  const recommendations = generateCostRecommendations(
    input,
    costBreakdown,
    yieldPrediction,
    riskFactors
  );
  
  return {
    costBreakdown,
    yieldPrediction,
    riskFactors,
    requiredInspectionPrecision,
    recommendedBatchSize,
    breakEvenQuantity,
    recommendations,
  };
}

/**
 * Generate cost optimization recommendations
 */
function generateCostRecommendations(
  input: CostPredictionInput,
  cost: CostBreakdown,
  yield_: YieldPrediction,
  risk: RiskFactors
): string[] {
  const recommendations: string[] = [];
  
  // Batch size optimization
  if (input.batchVolume < 500) {
    recommendations.push(`Consider increasing batch size to ${Math.ceil(input.batchVolume * 2)} to reduce setup cost per piece`);
  }
  
  // Material cost
  if (cost.materialCost > cost.totalCostPerPiece * 0.4) {
    recommendations.push('Material cost is high - consider alternative grades or wire diameter optimization');
  }
  
  // Tolerance relaxation
  if (input.toleranceClass === 'ultra_precision' && yield_.cpk > 1.5) {
    recommendations.push('Process capability exceeds requirements - consider relaxing tolerances to reduce cost');
  }
  
  // Shot peening
  if (!input.shotPeening && risk.fatigueRisk > 0.4) {
    recommendations.push('Consider shot peening to improve fatigue life and reduce warranty risk');
  }
  
  // Surface treatment
  if (input.surfaceTreatment === 'cadmium') {
    recommendations.push('Consider zinc plating as environmentally-friendly alternative to cadmium');
  }
  
  // Yield improvement
  if (yield_.scrapRate > 3) {
    recommendations.push(`High scrap rate (${yield_.scrapRate.toFixed(1)}%) - review process controls and tooling`);
  }
  
  // Risk mitigation
  if (risk.riskLevel === 'high' || risk.riskLevel === 'critical') {
    recommendations.push('High manufacturing risk - consider design review or prototype testing');
  }
  
  if (risk.wireCurvatureRisk > 0.5) {
    recommendations.push('Adjust spring index to reduce wire curvature stress during coiling');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Manufacturing parameters are well-optimized for cost and quality');
  }
  
  return recommendations;
}

/**
 * Compare cost across different batch sizes
 */
export function compareBatchCosts(
  input: CostPredictionInput,
  batchSizes: number[]
): Map<number, CostBreakdown> {
  const results = new Map<number, CostBreakdown>();
  
  for (const size of batchSizes) {
    const result = predictCostAndYield({ ...input, batchVolume: size });
    results.set(size, result.costBreakdown);
  }
  
  return results;
}

/**
 * Find optimal batch size for target cost
 */
export function findOptimalBatchSize(
  input: CostPredictionInput,
  targetCostPerPiece: number
): number {
  let low = 10;
  let high = 100000;
  
  while (high - low > 10) {
    const mid = Math.floor((low + high) / 2);
    const result = predictCostAndYield({ ...input, batchVolume: mid });
    
    if (result.costBreakdown.totalCostPerPiece > targetCostPerPiece) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return high;
}
