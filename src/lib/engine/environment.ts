/**
 * Spring Analysis Engine - Environmental Effects Model
 * 弹簧分析引擎 - 环境效应模块
 * 
 * Corrosion, salt spray, and environmental fatigue reduction
 */

import { type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Environment types
 */
export type EnvironmentType = 
  | 'indoor'
  | 'outdoor'
  | 'humid'
  | 'salt_spray'
  | 'acidic'
  | 'alkaline'
  | 'marine'
  | 'industrial';

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  type: EnvironmentType;
  label: { en: string; zh: string };
  description: { en: string; zh: string };
  /** Base corrosion factor */
  corrosionFactor: number;
  /** Fatigue reduction factor */
  fatigueReductionFactor: number;
  /** Stress corrosion cracking risk */
  sccRisk: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Environment definitions
 */
export const ENVIRONMENTS: Record<EnvironmentType, EnvironmentConfig> = {
  indoor: {
    type: 'indoor',
    label: { en: 'Indoor', zh: '室内' },
    description: { 
      en: 'Controlled indoor environment, low humidity',
      zh: '受控室内环境，低湿度',
    },
    corrosionFactor: 1.00,
    fatigueReductionFactor: 1.00,
    sccRisk: 'none',
  },
  outdoor: {
    type: 'outdoor',
    label: { en: 'Outdoor', zh: '室外' },
    description: {
      en: 'Outdoor exposure, normal weather conditions',
      zh: '室外暴露，正常天气条件',
    },
    corrosionFactor: 0.90,
    fatigueReductionFactor: 0.90,
    sccRisk: 'low',
  },
  humid: {
    type: 'humid',
    label: { en: 'Humid', zh: '潮湿' },
    description: {
      en: 'High humidity environment (>70% RH)',
      zh: '高湿度环境 (>70% RH)',
    },
    corrosionFactor: 0.85,
    fatigueReductionFactor: 0.85,
    sccRisk: 'medium',
  },
  salt_spray: {
    type: 'salt_spray',
    label: { en: 'Salt Spray', zh: '盐雾' },
    description: {
      en: 'Salt spray exposure (>5% NaCl)',
      zh: '盐雾暴露 (>5% NaCl)',
    },
    corrosionFactor: 0.70,
    fatigueReductionFactor: 0.65,
    sccRisk: 'high',
  },
  acidic: {
    type: 'acidic',
    label: { en: 'Acidic', zh: '酸性' },
    description: {
      en: 'Acidic environment (pH < 5)',
      zh: '酸性环境 (pH < 5)',
    },
    corrosionFactor: 0.60,
    fatigueReductionFactor: 0.55,
    sccRisk: 'high',
  },
  alkaline: {
    type: 'alkaline',
    label: { en: 'Alkaline', zh: '碱性' },
    description: {
      en: 'Alkaline environment (pH > 9)',
      zh: '碱性环境 (pH > 9)',
    },
    corrosionFactor: 0.75,
    fatigueReductionFactor: 0.70,
    sccRisk: 'medium',
  },
  marine: {
    type: 'marine',
    label: { en: 'Marine', zh: '海洋' },
    description: {
      en: 'Marine/coastal environment',
      zh: '海洋/沿海环境',
    },
    corrosionFactor: 0.65,
    fatigueReductionFactor: 0.60,
    sccRisk: 'high',
  },
  industrial: {
    type: 'industrial',
    label: { en: 'Industrial', zh: '工业' },
    description: {
      en: 'Industrial environment with pollutants',
      zh: '含污染物的工业环境',
    },
    corrosionFactor: 0.80,
    fatigueReductionFactor: 0.75,
    sccRisk: 'medium',
  },
};

/**
 * Material corrosion resistance ratings
 */
export const MATERIAL_CORROSION_RESISTANCE: Record<string, {
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  modifier: number;
}> = {
  music_wire_a228: { rating: 'poor', modifier: 1.0 },
  oil_tempered_a229: { rating: 'poor', modifier: 1.0 },
  chrome_vanadium_a231: { rating: 'fair', modifier: 1.1 },
  chrome_silicon_a401: { rating: 'fair', modifier: 1.15 },
  stainless_302: { rating: 'good', modifier: 1.4 },
  stainless_17_7ph: { rating: 'excellent', modifier: 1.6 },
  phosphor_bronze: { rating: 'excellent', modifier: 1.5 },
  beryllium_copper: { rating: 'excellent', modifier: 1.55 },
};

/**
 * Environmental effect result
 */
export interface EnvironmentEffectResult {
  /** Environment type */
  environment: EnvironmentType;
  /** Environment label */
  environmentLabel: { en: string; zh: string };
  /** Base corrosion factor */
  baseCorrosionFactor: number;
  /** Material resistance modifier */
  materialModifier: number;
  /** Effective corrosion factor */
  effectiveCorrosionFactor: number;
  /** Fatigue reduction factor */
  fatigueReductionFactor: number;
  /** Adjusted endurance limit (MPa) */
  adjustedEnduranceLimit: number;
  /** Stress corrosion cracking risk */
  sccRisk: 'none' | 'low' | 'medium' | 'high';
  /** Recommendations */
  recommendations: string[];
  /** Warning message */
  warning?: { en: string; zh: string };
}

/**
 * Get environment configuration
 */
export function getEnvironment(type: EnvironmentType): EnvironmentConfig {
  return ENVIRONMENTS[type];
}

/**
 * Get all environment options
 */
export function getEnvironmentOptions(): Array<{
  value: EnvironmentType;
  labelEn: string;
  labelZh: string;
}> {
  return Object.entries(ENVIRONMENTS).map(([key, config]) => ({
    value: key as EnvironmentType,
    labelEn: config.label.en,
    labelZh: config.label.zh,
  }));
}

/**
 * Get material corrosion resistance
 */
export function getMaterialCorrosionResistance(materialId: SpringMaterialId): {
  rating: 'poor' | 'fair' | 'good' | 'excellent';
  modifier: number;
} {
  if (materialId in MATERIAL_CORROSION_RESISTANCE) {
    return MATERIAL_CORROSION_RESISTANCE[materialId];
  }
  return { rating: 'poor', modifier: 1.0 };
}

/**
 * Calculate environmental effects on fatigue
 * 计算环境对疲劳的影响
 * 
 * Se_corroded = Se_corrected × k_corrosion × k_material
 */
export function calculateEnvironmentEffects(
  materialId: SpringMaterialId,
  environmentType: EnvironmentType,
  baseEnduranceLimit: number
): EnvironmentEffectResult {
  const env = getEnvironment(environmentType);
  const materialResistance = getMaterialCorrosionResistance(materialId);
  
  // Calculate effective corrosion factor
  // Better material resistance improves the factor
  const effectiveCorrosionFactor = Math.min(
    1.0,
    env.corrosionFactor * materialResistance.modifier
  );
  
  // Fatigue reduction
  const fatigueReductionFactor = Math.min(
    1.0,
    env.fatigueReductionFactor * (materialResistance.modifier * 0.8 + 0.2)
  );
  
  // Adjusted endurance limit
  const adjustedEnduranceLimit = baseEnduranceLimit * fatigueReductionFactor;
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (materialResistance.rating === 'poor' && env.corrosionFactor < 0.9) {
    recommendations.push('Consider using corrosion-resistant material (stainless steel)');
    recommendations.push('Apply protective coating (zinc, nickel, or epoxy)');
  }
  
  if (env.sccRisk === 'high') {
    recommendations.push('Monitor for stress corrosion cracking');
    recommendations.push('Consider shot peening to introduce compressive residual stress');
  }
  
  if (env.type === 'salt_spray' || env.type === 'marine') {
    recommendations.push('Use marine-grade stainless steel (316 or 17-7 PH)');
    recommendations.push('Regular inspection and maintenance required');
  }
  
  // Warning for severe environments
  let warning: { en: string; zh: string } | undefined;
  if (effectiveCorrosionFactor < 0.7) {
    warning = {
      en: `WARNING: Severe environmental degradation expected. Fatigue life reduced by ${((1 - fatigueReductionFactor) * 100).toFixed(0)}%`,
      zh: `警告：预计会有严重的环境退化。疲劳寿命降低 ${((1 - fatigueReductionFactor) * 100).toFixed(0)}%`,
    };
  }
  
  return {
    environment: environmentType,
    environmentLabel: env.label,
    baseCorrosionFactor: env.corrosionFactor,
    materialModifier: materialResistance.modifier,
    effectiveCorrosionFactor,
    fatigueReductionFactor,
    adjustedEnduranceLimit,
    sccRisk: env.sccRisk,
    recommendations,
    warning,
  };
}

/**
 * Calculate corrosion rate
 * 计算腐蚀速率 (mm/year)
 */
export function calculateCorrosionRate(
  materialId: SpringMaterialId,
  environmentType: EnvironmentType
): number {
  const env = getEnvironment(environmentType);
  const materialResistance = getMaterialCorrosionResistance(materialId);
  
  // Base corrosion rates (mm/year) for carbon steel
  const baseRates: Record<EnvironmentType, number> = {
    indoor: 0.01,
    outdoor: 0.05,
    humid: 0.08,
    salt_spray: 0.15,
    acidic: 0.25,
    alkaline: 0.12,
    marine: 0.18,
    industrial: 0.10,
  };
  
  const baseRate = baseRates[environmentType];
  
  // Adjust for material resistance
  return baseRate / materialResistance.modifier;
}

/**
 * Estimate wire diameter loss over time
 * 估算线径随时间的损失
 */
export function estimateWireDiameterLoss(
  materialId: SpringMaterialId,
  environmentType: EnvironmentType,
  years: number
): {
  diameterLoss: number;
  percentLoss: number;
  wireDiameter: number;
} & { originalDiameter?: number } {
  const corrosionRate = calculateCorrosionRate(materialId, environmentType);
  
  // Diameter loss from both sides
  const diameterLoss = corrosionRate * years * 2;
  
  return {
    diameterLoss,
    percentLoss: 0, // Will be calculated with original diameter
    wireDiameter: 0, // Will be calculated with original diameter
  };
}

/**
 * Generate corrosion effect table for report
 */
export function generateCorrosionEffectTable(
  materialId: SpringMaterialId
): Array<{
  environment: EnvironmentType;
  label: string;
  corrosionFactor: number;
  fatigueReduction: number;
  corrosionRate: number;
}> {
  return Object.keys(ENVIRONMENTS).map((envType) => {
    const env = ENVIRONMENTS[envType as EnvironmentType];
    const effects = calculateEnvironmentEffects(
      materialId,
      envType as EnvironmentType,
      100 // Normalized
    );
    const corrosionRate = calculateCorrosionRate(materialId, envType as EnvironmentType);
    
    return {
      environment: envType as EnvironmentType,
      label: env.label.en,
      corrosionFactor: effects.effectiveCorrosionFactor,
      fatigueReduction: effects.fatigueReductionFactor,
      corrosionRate,
    };
  });
}
