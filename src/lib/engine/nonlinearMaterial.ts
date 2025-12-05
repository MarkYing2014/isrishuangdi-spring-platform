/**
 * Spring Analysis Engine - Nonlinear Material Model (Ramberg-Osgood)
 * 弹簧分析引擎 - 非线性材料模型（Ramberg-Osgood）
 * 
 * Implements elastic-plastic stress interpretation for high stress regions
 * ε = σ/E + K*(σ)^n
 */

import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Ramberg-Osgood material parameters
 */
export interface RambergOsgoodParams {
  /** Young's modulus E (MPa) */
  E: number;
  /** Strength coefficient K */
  K: number;
  /** Strain hardening exponent n */
  n: number;
  /** Yield strength Sy (MPa) */
  Sy: number;
  /** Transition ratio (σ/Sy) for nonlinear activation */
  transitionRatio: number;
}

/**
 * Nonlinear stress result
 */
export interface NonlinearStressResult {
  /** Linear elastic stress (MPa) */
  linearStress: number;
  /** Nonlinear corrected stress (MPa) */
  nonlinearStress: number;
  /** Total strain */
  totalStrain: number;
  /** Elastic strain component */
  elasticStrain: number;
  /** Plastic strain component */
  plasticStrain: number;
  /** Is in nonlinear region */
  isNonlinear: boolean;
  /** Stress ratio σ/Sy */
  stressRatio: number;
  /** Correction factor applied */
  correctionFactor: number;
}

/**
 * Ramberg-Osgood parameters for common spring materials
 */
export const RAMBERG_OSGOOD_PARAMS: Record<string, Omit<RambergOsgoodParams, 'E' | 'Sy'>> = {
  music_wire_a228: {
    K: 0.002,
    n: 15,
    transitionRatio: 0.75,
  },
  oil_tempered: {
    K: 0.0025,
    n: 12,
    transitionRatio: 0.72,
  },
  chrome_silicon: {
    K: 0.0018,
    n: 18,
    transitionRatio: 0.78,
  },
  chrome_vanadium: {
    K: 0.002,
    n: 16,
    transitionRatio: 0.76,
  },
  ss_302: {
    K: 0.003,
    n: 10,
    transitionRatio: 0.70,
  },
  phosphor_bronze: {
    K: 0.004,
    n: 8,
    transitionRatio: 0.65,
  },
};

/**
 * Get Ramberg-Osgood parameters for material
 */
export function getRambergOsgoodParams(materialId: SpringMaterialId): RambergOsgoodParams {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const baseParams = RAMBERG_OSGOOD_PARAMS[materialId] ?? {
    K: 0.002,
    n: 15,
    transitionRatio: 0.75,
  };

  // Estimate yield strength from allowable shear stress
  // Sy ≈ τ_allow / 0.577 (von Mises)
  const Sy = material.allowShearStatic / 0.577;

  return {
    E: material.elasticModulus ?? 207000,
    Sy,
    ...baseParams,
  };
}

/**
 * Calculate total strain using Ramberg-Osgood equation
 * ε = σ/E + K*(σ/E)^n
 */
export function calculateRambergOsgoodStrain(
  stress: number,
  params: RambergOsgoodParams
): {
  totalStrain: number;
  elasticStrain: number;
  plasticStrain: number;
} {
  const { E, K, n } = params;
  
  const elasticStrain = stress / E;
  const plasticStrain = K * Math.pow(stress / E, n);
  const totalStrain = elasticStrain + plasticStrain;
  
  return {
    totalStrain,
    elasticStrain,
    plasticStrain,
  };
}

/**
 * Calculate nonlinear stress correction
 * When stress exceeds transition ratio * Sy, apply nonlinear correction
 */
export function calculateNonlinearStress(
  linearStress: number,
  materialId: SpringMaterialId
): NonlinearStressResult {
  const params = getRambergOsgoodParams(materialId);
  const { E, Sy, transitionRatio } = params;
  
  const stressRatio = linearStress / Sy;
  const isNonlinear = stressRatio > transitionRatio;
  
  if (!isNonlinear) {
    // Linear region - no correction needed
    const elasticStrain = linearStress / E;
    return {
      linearStress,
      nonlinearStress: linearStress,
      totalStrain: elasticStrain,
      elasticStrain,
      plasticStrain: 0,
      isNonlinear: false,
      stressRatio,
      correctionFactor: 1.0,
    };
  }
  
  // Nonlinear region - apply Ramberg-Osgood
  const { totalStrain, elasticStrain, plasticStrain } = calculateRambergOsgoodStrain(linearStress, params);
  
  // Calculate effective stress considering plastic strain
  // The "true" stress is higher due to strain hardening
  const strainHardeningFactor = 1 + (plasticStrain / elasticStrain) * 0.5;
  const nonlinearStress = linearStress * strainHardeningFactor;
  
  return {
    linearStress,
    nonlinearStress,
    totalStrain,
    elasticStrain,
    plasticStrain,
    isNonlinear: true,
    stressRatio,
    correctionFactor: strainHardeningFactor,
  };
}

/**
 * Calculate SWT (Smith-Watson-Topper) fatigue parameter with nonlinear correction
 * SWT = σ_max * ε_a * E
 */
export function calculateSWTParameter(
  maxStress: number,
  strainAmplitude: number,
  E: number
): number {
  return Math.sqrt(maxStress * strainAmplitude * E);
}

/**
 * Calculate nonlinear fatigue life using SWT approach
 */
export function calculateNonlinearFatigueLife(
  maxStress: number,
  minStress: number,
  materialId: SpringMaterialId
): {
  linearLife: number;
  nonlinearLife: number;
  swtParameter: number;
  reductionFactor: number;
} {
  const params = getRambergOsgoodParams(materialId);
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const { E, Sy } = params;
  
  // Calculate strain amplitudes
  const stressAmplitude = (maxStress - minStress) / 2;
  const meanStress = (maxStress + minStress) / 2;
  
  // Linear strain amplitude
  const linearStrainAmplitude = stressAmplitude / E;
  
  // Nonlinear strain amplitude (if in plastic region)
  const maxResult = calculateNonlinearStress(maxStress, materialId);
  const minResult = calculateNonlinearStress(Math.abs(minStress), materialId);
  
  const nonlinearStrainAmplitude = (maxResult.totalStrain - minResult.totalStrain) / 2;
  
  // SWT parameter
  const swtParameter = calculateSWTParameter(maxStress, nonlinearStrainAmplitude, E);
  
  // Estimate fatigue life using Basquin relation
  const { snCurve } = material;
  const b = Math.log(snCurve.tau1 / snCurve.tau2) / Math.log(snCurve.N2 / snCurve.N1);
  
  // Linear life estimate
  const linearLife = snCurve.N2 * Math.pow(snCurve.tau2 / stressAmplitude, 1 / b);
  
  // Nonlinear life (reduced due to plastic strain)
  const plasticReduction = maxResult.isNonlinear ? 
    Math.pow(1 + maxResult.plasticStrain / maxResult.elasticStrain, -2) : 1;
  const nonlinearLife = linearLife * plasticReduction;
  
  return {
    linearLife: Math.min(linearLife, 1e9),
    nonlinearLife: Math.min(nonlinearLife, 1e9),
    swtParameter,
    reductionFactor: plasticReduction,
  };
}

/**
 * Calculate nonlinear safety factor
 */
export function calculateNonlinearSafetyFactor(
  workingStress: number,
  materialId: SpringMaterialId
): {
  linearSF: number;
  nonlinearSF: number;
  yieldMargin: number;
} {
  const params = getRambergOsgoodParams(materialId);
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const { Sy } = params;
  const allowableStress = material.allowShearStatic;
  
  // Linear safety factor
  const linearSF = allowableStress / workingStress;
  
  // Nonlinear correction
  const stressResult = calculateNonlinearStress(workingStress, materialId);
  const effectiveStress = stressResult.nonlinearStress;
  
  // Nonlinear safety factor (considering strain hardening)
  const nonlinearSF = allowableStress / effectiveStress;
  
  // Yield margin
  const yieldMargin = (Sy - workingStress) / Sy;
  
  return {
    linearSF,
    nonlinearSF,
    yieldMargin,
  };
}

/**
 * Apply nonlinear correction to stress distribution
 */
export function applyNonlinearCorrection(
  stressValues: number[],
  materialId: SpringMaterialId
): Array<{
  original: number;
  corrected: number;
  isNonlinear: boolean;
  plasticStrain: number;
}> {
  return stressValues.map(stress => {
    const result = calculateNonlinearStress(stress, materialId);
    return {
      original: stress,
      corrected: result.nonlinearStress,
      isNonlinear: result.isNonlinear,
      plasticStrain: result.plasticStrain,
    };
  });
}
