/**
 * AI Material Recommendation Engine - Phase 6
 * AI材料推荐引擎
 * 
 * Automatically proposes candidate materials when design fails constraints
 */

import { SPRING_MATERIALS, type SpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Design requirements for material selection
 */
export interface MaterialRequirements {
  /** Desired fatigue life (cycles) */
  desiredFatigueLife: number;
  /** Operating temperature (°C) */
  operatingTemperature: number;
  /** Corrosion environment */
  corrosionEnvironment: 'none' | 'mild' | 'moderate' | 'severe' | 'marine' | 'chemical';
  /** Target spring rate (N/mm) */
  targetSpringRate: number;
  /** Maximum working stress (MPa) */
  maxWorkingStress: number;
  /** Wire diameter (mm) */
  wireDiameter: number;
  /** Mean diameter (mm) */
  meanDiameter: number;
  /** Budget constraint */
  budgetLevel: 'low' | 'medium' | 'high' | 'unlimited';
}

/**
 * Material performance prediction
 */
export interface MaterialPerformance {
  /** Predicted safety factor */
  safetyFactor: number;
  /** Predicted fatigue life (cycles) */
  predictedFatigueLife: number;
  /** Temperature suitability score (0-100) */
  temperatureSuitability: number;
  /** Corrosion resistance score (0-100) */
  corrosionResistance: number;
  /** Cost effectiveness score (0-100) */
  costEffectiveness: number;
  /** Overall suitability score (0-100) */
  overallScore: number;
  /** Meets all requirements */
  meetsRequirements: boolean;
  /** Warnings */
  warnings: string[];
}

/**
 * Material recommendation
 */
export interface MaterialRecommendation {
  /** Material */
  material: SpringMaterial;
  /** Performance prediction */
  performance: MaterialPerformance;
  /** Ranking position */
  rank: number;
  /** Recommendation reason */
  reason: string;
  /** Suggested modifications */
  suggestions: string[];
}

/**
 * Material recommendation result
 */
export interface MaterialRecommendationResult {
  /** Current material analysis */
  currentMaterialAnalysis: MaterialPerformance | null;
  /** Top recommendations */
  recommendations: MaterialRecommendation[];
  /** Design feasibility with any material */
  designFeasible: boolean;
  /** Summary */
  summary: string;
  /** General suggestions */
  generalSuggestions: string[];
}

/**
 * Extended material database with additional properties
 */
const EXTENDED_MATERIAL_PROPERTIES: Record<string, {
  maxTemperature: number;
  corrosionRating: number;
  relativeCost: number;
  fatigueCoefficient: number;
  thermalStability: number;
}> = {
  music_wire_a228: {
    maxTemperature: 120,
    corrosionRating: 2,
    relativeCost: 1.0,
    fatigueCoefficient: 1.0,
    thermalStability: 0.7,
  },
  oil_tempered_a229: {
    maxTemperature: 150,
    corrosionRating: 2,
    relativeCost: 0.9,
    fatigueCoefficient: 0.95,
    thermalStability: 0.75,
  },
  chrome_vanadium_a231: {
    maxTemperature: 220,
    corrosionRating: 3,
    relativeCost: 1.3,
    fatigueCoefficient: 1.1,
    thermalStability: 0.85,
  },
  chrome_silicon_a401: {
    maxTemperature: 250,
    corrosionRating: 3,
    relativeCost: 1.5,
    fatigueCoefficient: 1.15,
    thermalStability: 0.9,
  },
  stainless_302: {
    maxTemperature: 290,
    corrosionRating: 7,
    relativeCost: 2.5,
    fatigueCoefficient: 0.85,
    thermalStability: 0.85,
  },
  stainless_316: {
    maxTemperature: 290,
    corrosionRating: 8,
    relativeCost: 3.0,
    fatigueCoefficient: 0.8,
    thermalStability: 0.85,
  },
  stainless_17_7ph: {
    maxTemperature: 320,
    corrosionRating: 7,
    relativeCost: 4.0,
    fatigueCoefficient: 1.05,
    thermalStability: 0.9,
  },
  inconel_x750: {
    maxTemperature: 700,
    corrosionRating: 9,
    relativeCost: 15.0,
    fatigueCoefficient: 1.2,
    thermalStability: 0.98,
  },
  phosphor_bronze: {
    maxTemperature: 100,
    corrosionRating: 6,
    relativeCost: 3.5,
    fatigueCoefficient: 0.7,
    thermalStability: 0.6,
  },
  beryllium_copper: {
    maxTemperature: 200,
    corrosionRating: 7,
    relativeCost: 8.0,
    fatigueCoefficient: 0.9,
    thermalStability: 0.8,
  },
};

/**
 * Get extended properties for a material
 */
function getExtendedProperties(materialId: string) {
  return EXTENDED_MATERIAL_PROPERTIES[materialId] || {
    maxTemperature: 150,
    corrosionRating: 3,
    relativeCost: 1.5,
    fatigueCoefficient: 1.0,
    thermalStability: 0.8,
  };
}

/**
 * Calculate temperature suitability score
 */
function calculateTemperatureSuitability(
  operatingTemp: number,
  maxTemp: number,
  thermalStability: number
): number {
  if (operatingTemp > maxTemp) return 0;
  
  const margin = (maxTemp - operatingTemp) / maxTemp;
  const score = margin * thermalStability * 100;
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate corrosion resistance score
 */
function calculateCorrosionScore(
  environment: MaterialRequirements['corrosionEnvironment'],
  materialRating: number
): number {
  const environmentRequirement: Record<string, number> = {
    none: 1,
    mild: 3,
    moderate: 5,
    severe: 7,
    marine: 8,
    chemical: 9,
  };

  const required = environmentRequirement[environment] || 3;
  
  if (materialRating >= required) {
    return 100 - (materialRating - required) * 5; // Slight penalty for over-spec
  } else {
    return Math.max(0, (materialRating / required) * 80); // Penalty for under-spec
  }
}

/**
 * Calculate cost effectiveness score
 */
function calculateCostScore(
  relativeCost: number,
  budgetLevel: MaterialRequirements['budgetLevel']
): number {
  const budgetMultiplier: Record<string, number> = {
    low: 1.0,
    medium: 2.0,
    high: 5.0,
    unlimited: 20.0,
  };

  const budget = budgetMultiplier[budgetLevel] || 2.0;
  
  if (relativeCost <= budget) {
    return 100 - (relativeCost / budget) * 30;
  } else {
    return Math.max(0, 70 - (relativeCost - budget) * 20);
  }
}

/**
 * Predict fatigue life for a material
 */
function predictFatigueLife(
  material: SpringMaterial,
  maxStress: number,
  fatigueCoefficient: number
): number {
  const enduranceLimit = material.snCurve?.tau2 || 400;
  const adjustedEndurance = enduranceLimit * fatigueCoefficient;
  
  if (maxStress <= adjustedEndurance) {
    return 1e8; // Infinite life
  }
  
  const stressRatio = maxStress / adjustedEndurance;
  const basquinExponent = -0.1; // Typical value
  
  return Math.pow(stressRatio, 1 / basquinExponent) * 1e6;
}

/**
 * Evaluate material performance for given requirements
 */
export function evaluateMaterialPerformance(
  material: SpringMaterial,
  requirements: MaterialRequirements
): MaterialPerformance {
  const extProps = getExtendedProperties(material.id);
  const warnings: string[] = [];

  // Safety factor
  const allowableStress = material.allowShearStatic;
  const safetyFactor = allowableStress / requirements.maxWorkingStress;

  // Fatigue life prediction
  const predictedFatigueLife = predictFatigueLife(
    material,
    requirements.maxWorkingStress,
    extProps.fatigueCoefficient
  );

  // Temperature suitability
  const temperatureSuitability = calculateTemperatureSuitability(
    requirements.operatingTemperature,
    extProps.maxTemperature,
    extProps.thermalStability
  );

  if (requirements.operatingTemperature > extProps.maxTemperature * 0.8) {
    warnings.push(`Operating near temperature limit (max: ${extProps.maxTemperature}°C)`);
  }

  // Corrosion resistance
  const corrosionResistance = calculateCorrosionScore(
    requirements.corrosionEnvironment,
    extProps.corrosionRating
  );

  if (corrosionResistance < 50) {
    warnings.push('Corrosion resistance may be insufficient for environment');
  }

  // Cost effectiveness
  const costEffectiveness = calculateCostScore(extProps.relativeCost, requirements.budgetLevel);

  // Overall score (weighted average)
  const weights = {
    safety: 0.25,
    fatigue: 0.25,
    temperature: 0.2,
    corrosion: 0.2,
    cost: 0.1,
  };

  const safetyScore = Math.min(100, safetyFactor * 50);
  const fatigueScore = predictedFatigueLife >= requirements.desiredFatigueLife ? 100 :
    (predictedFatigueLife / requirements.desiredFatigueLife) * 100;

  const overallScore = 
    weights.safety * safetyScore +
    weights.fatigue * fatigueScore +
    weights.temperature * temperatureSuitability +
    weights.corrosion * corrosionResistance +
    weights.cost * costEffectiveness;

  // Check if meets all requirements
  const meetsRequirements = 
    safetyFactor >= 1.2 &&
    predictedFatigueLife >= requirements.desiredFatigueLife &&
    temperatureSuitability >= 50 &&
    corrosionResistance >= 50;

  if (safetyFactor < 1.0) {
    warnings.push('Safety factor below 1.0 - design will fail');
  } else if (safetyFactor < 1.2) {
    warnings.push('Safety factor below recommended minimum of 1.2');
  }

  if (predictedFatigueLife < requirements.desiredFatigueLife) {
    warnings.push(`Predicted fatigue life (${predictedFatigueLife.toExponential(1)}) below requirement`);
  }

  return {
    safetyFactor,
    predictedFatigueLife,
    temperatureSuitability,
    corrosionResistance,
    costEffectiveness,
    overallScore,
    meetsRequirements,
    warnings,
  };
}

/**
 * Generate recommendation reason
 */
function generateRecommendationReason(
  material: SpringMaterial,
  performance: MaterialPerformance,
  requirements: MaterialRequirements
): string {
  const reasons: string[] = [];

  if (performance.safetyFactor >= 1.5) {
    reasons.push('excellent safety margin');
  } else if (performance.safetyFactor >= 1.2) {
    reasons.push('adequate safety factor');
  }

  if (performance.predictedFatigueLife >= requirements.desiredFatigueLife * 2) {
    reasons.push('superior fatigue performance');
  }

  if (performance.temperatureSuitability >= 80) {
    reasons.push('well-suited for operating temperature');
  }

  if (performance.corrosionResistance >= 80) {
    reasons.push('excellent corrosion resistance');
  }

  if (performance.costEffectiveness >= 70) {
    reasons.push('cost-effective choice');
  }

  if (reasons.length === 0) {
    reasons.push('best available option given constraints');
  }

  return `${material.nameEn} recommended for: ${reasons.join(', ')}.`;
}

/**
 * Generate suggestions for material use
 */
function generateSuggestions(
  material: SpringMaterial,
  performance: MaterialPerformance,
  requirements: MaterialRequirements
): string[] {
  const suggestions: string[] = [];
  const extProps = getExtendedProperties(material.id);

  if (performance.safetyFactor < 1.5) {
    suggestions.push('Consider increasing wire diameter to improve safety factor');
  }

  if (requirements.operatingTemperature > extProps.maxTemperature * 0.7) {
    suggestions.push('Apply stress relief heat treatment for temperature stability');
  }

  if (performance.corrosionResistance < 70 && requirements.corrosionEnvironment !== 'none') {
    suggestions.push('Consider protective coating (zinc, nickel, or epoxy)');
  }

  if (performance.predictedFatigueLife < requirements.desiredFatigueLife * 1.5) {
    suggestions.push('Shot peening recommended to improve fatigue life');
  }

  return suggestions;
}

/**
 * Main material recommendation function
 */
export function recommendMaterials(
  requirements: MaterialRequirements,
  currentMaterialId?: SpringMaterialId
): MaterialRecommendationResult {
  // Evaluate current material if provided
  let currentMaterialAnalysis: MaterialPerformance | null = null;
  if (currentMaterialId) {
    const currentMaterial = SPRING_MATERIALS.find(m => m.id === currentMaterialId);
    if (currentMaterial) {
      currentMaterialAnalysis = evaluateMaterialPerformance(currentMaterial, requirements);
    }
  }

  // Evaluate all materials
  const evaluations: { material: SpringMaterial; performance: MaterialPerformance }[] = [];
  
  for (const material of SPRING_MATERIALS) {
    const performance = evaluateMaterialPerformance(material, requirements);
    evaluations.push({ material, performance });
  }

  // Sort by overall score
  evaluations.sort((a, b) => b.performance.overallScore - a.performance.overallScore);

  // Generate recommendations (top 5)
  const recommendations: MaterialRecommendation[] = evaluations.slice(0, 5).map((eval_, index) => ({
    material: eval_.material,
    performance: eval_.performance,
    rank: index + 1,
    reason: generateRecommendationReason(eval_.material, eval_.performance, requirements),
    suggestions: generateSuggestions(eval_.material, eval_.performance, requirements),
  }));

  // Check if design is feasible with any material
  const designFeasible = evaluations.some(e => e.performance.meetsRequirements);

  // Generate summary
  let summary: string;
  if (designFeasible) {
    const bestMaterial = recommendations[0].material;
    summary = `Design is feasible. Best material: ${bestMaterial.nameEn} (${bestMaterial.nameZh}) ` +
      `with overall score of ${recommendations[0].performance.overallScore.toFixed(0)}/100.`;
  } else {
    summary = 'No material fully meets all requirements. Consider modifying design parameters ' +
      'or relaxing constraints. Top recommendations shown with best available performance.';
  }

  // General suggestions
  const generalSuggestions: string[] = [];
  
  if (!designFeasible) {
    if (requirements.maxWorkingStress > 800) {
      generalSuggestions.push('Working stress is very high - consider increasing wire diameter');
    }
    if (requirements.desiredFatigueLife > 1e7) {
      generalSuggestions.push('High fatigue life requirement - ensure stress is below endurance limit');
    }
    if (requirements.operatingTemperature > 200) {
      generalSuggestions.push('High temperature application - consider Inconel or high-temp alloys');
    }
    if (requirements.corrosionEnvironment === 'severe' || requirements.corrosionEnvironment === 'marine') {
      generalSuggestions.push('Severe corrosion environment - stainless steel or coated wire recommended');
    }
  }

  return {
    currentMaterialAnalysis,
    recommendations,
    designFeasible,
    summary,
    generalSuggestions,
  };
}

/**
 * Quick material check - returns pass/fail with best alternative
 */
export function quickMaterialCheck(
  materialId: SpringMaterialId,
  requirements: MaterialRequirements
): {
  passes: boolean;
  currentScore: number;
  bestAlternative: SpringMaterialId | null;
  bestAlternativeScore: number;
  improvementPossible: number;
} {
  const result = recommendMaterials(requirements, materialId);
  
  const currentScore = result.currentMaterialAnalysis?.overallScore ?? 0;
  const passes = result.currentMaterialAnalysis?.meetsRequirements ?? false;
  
  const bestRec = result.recommendations[0];
  const bestAlternative = bestRec.material.id !== materialId ? bestRec.material.id : 
    (result.recommendations[1]?.material.id ?? null);
  const bestAlternativeScore = bestRec.material.id !== materialId ? bestRec.performance.overallScore :
    (result.recommendations[1]?.performance.overallScore ?? currentScore);
  
  const improvementPossible = bestAlternativeScore - currentScore;

  return {
    passes,
    currentScore,
    bestAlternative,
    bestAlternativeScore,
    improvementPossible,
  };
}
