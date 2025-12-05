/**
 * Spring Analysis Engine - Friction & Contact Model
 * 弹簧分析引擎 - 摩擦与接触模块
 * 
 * Friction loss in compression springs when coils contact
 */

import type { CompressionSpringGeometry, ConicalSpringGeometry } from './types';

/**
 * Friction analysis result
 */
export interface FrictionResult {
  /** Current deflection (mm) */
  deflection: number;
  /** Coil contact status */
  coilContactStatus: 'none' | 'partial' | 'full';
  /** Number of coils in contact */
  coilsInContact: number;
  /** Friction coefficient */
  frictionCoefficient: number;
  /** Effective stiffness (N/mm) */
  effectiveStiffness: number;
  /** Stiffness reduction factor */
  stiffnessReductionFactor: number;
  /** Energy loss per cycle (%) */
  energyLossPercent: number;
  /** Message */
  message: { en: string; zh: string };
}

/**
 * Default friction coefficients
 */
export const FRICTION_COEFFICIENTS = {
  /** Ground ends, lubricated */
  ground_lubricated: 0.08,
  /** Ground ends, dry */
  ground_dry: 0.12,
  /** Unground ends, lubricated */
  unground_lubricated: 0.10,
  /** Unground ends, dry */
  unground_dry: 0.15,
  /** Coated (zinc, nickel) */
  coated: 0.06,
  /** Stainless steel */
  stainless: 0.14,
};

/**
 * Calculate coil contact threshold
 * 计算线圈接触阈值
 * 
 * Contact begins when pitch approaches wire diameter
 */
export function calculateCoilContactThreshold(
  freeLength: number,
  wireDiameter: number,
  totalCoils: number,
  activeCoils: number
): {
  contactStartDeflection: number;
  solidDeflection: number;
  contactStartPercent: number;
} {
  // Solid height
  const solidHeight = totalCoils * wireDiameter;
  
  // Maximum deflection to solid
  const solidDeflection = freeLength - solidHeight;
  
  // Contact typically starts at ~80% of solid deflection
  // when pitch becomes close to wire diameter
  const deadCoils = totalCoils - activeCoils;
  const activeHeight = freeLength - deadCoils * wireDiameter;
  const activePitch = activeHeight / activeCoils;
  
  // Contact starts when pitch reduces to ~1.1 × wire diameter
  const contactPitch = wireDiameter * 1.1;
  const contactStartDeflection = activeCoils * (activePitch - contactPitch);
  
  return {
    contactStartDeflection: Math.max(0, contactStartDeflection),
    solidDeflection,
    contactStartPercent: (contactStartDeflection / solidDeflection) * 100,
  };
}

/**
 * Calculate number of coils in contact
 * 计算接触的线圈数
 */
export function calculateCoilsInContact(
  deflection: number,
  freeLength: number,
  wireDiameter: number,
  activeCoils: number,
  totalCoils: number
): number {
  const { contactStartDeflection, solidDeflection } = calculateCoilContactThreshold(
    freeLength,
    wireDiameter,
    totalCoils,
    activeCoils
  );
  
  if (deflection < contactStartDeflection) {
    return 0;
  }
  
  if (deflection >= solidDeflection) {
    return activeCoils;
  }
  
  // Linear interpolation of coils in contact
  const contactProgress = (deflection - contactStartDeflection) / 
                          (solidDeflection - contactStartDeflection);
  
  return Math.floor(activeCoils * contactProgress);
}

/**
 * Calculate effective stiffness with friction
 * 计算考虑摩擦的有效刚度
 * 
 * k_eff = k × (1 - μ × f(contact))
 */
export function calculateEffectiveStiffness(
  staticStiffness: number,
  frictionCoefficient: number,
  coilsInContact: number,
  activeCoils: number
): {
  effectiveStiffness: number;
  reductionFactor: number;
} {
  if (coilsInContact === 0) {
    return {
      effectiveStiffness: staticStiffness,
      reductionFactor: 1.0,
    };
  }
  
  // Contact ratio
  const contactRatio = coilsInContact / activeCoils;
  
  // Friction effect increases with contact
  // k_eff = k × (1 - μ × contactRatio)
  const reductionFactor = 1 - frictionCoefficient * contactRatio;
  const effectiveStiffness = staticStiffness * reductionFactor;
  
  return {
    effectiveStiffness: Math.max(effectiveStiffness, staticStiffness * 0.5),
    reductionFactor: Math.max(reductionFactor, 0.5),
  };
}

/**
 * Calculate energy loss due to friction
 * 计算摩擦能量损失
 */
export function calculateFrictionEnergyLoss(
  frictionCoefficient: number,
  coilsInContact: number,
  activeCoils: number,
  deflection: number,
  force: number
): number {
  if (coilsInContact === 0) return 0;
  
  const contactRatio = coilsInContact / activeCoils;
  
  // Energy loss per cycle (hysteresis)
  // Approximation: loss ≈ μ × contactRatio × work done
  const work = 0.5 * force * deflection;
  const energyLoss = frictionCoefficient * contactRatio * work;
  
  return (energyLoss / work) * 100; // Percentage
}

/**
 * Calculate complete friction analysis
 * 计算完整摩擦分析
 */
export function calculateFriction(
  geometry: CompressionSpringGeometry | ConicalSpringGeometry,
  staticStiffness: number,
  deflection: number,
  frictionCoefficient: number = FRICTION_COEFFICIENTS.ground_dry
): FrictionResult {
  const { wireDiameter, activeCoils } = geometry;
  const freeLength = 'freeLength' in geometry ? geometry.freeLength : 50;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  
  // Calculate coils in contact
  const coilsInContact = calculateCoilsInContact(
    deflection,
    freeLength,
    wireDiameter,
    activeCoils,
    totalCoils
  );
  
  // Calculate effective stiffness
  const { effectiveStiffness, reductionFactor } = calculateEffectiveStiffness(
    staticStiffness,
    frictionCoefficient,
    coilsInContact,
    activeCoils
  );
  
  // Calculate force at deflection
  const force = staticStiffness * deflection;
  
  // Calculate energy loss
  const energyLossPercent = calculateFrictionEnergyLoss(
    frictionCoefficient,
    coilsInContact,
    activeCoils,
    deflection,
    force
  );
  
  // Determine contact status
  let coilContactStatus: 'none' | 'partial' | 'full';
  if (coilsInContact === 0) {
    coilContactStatus = 'none';
  } else if (coilsInContact >= activeCoils) {
    coilContactStatus = 'full';
  } else {
    coilContactStatus = 'partial';
  }
  
  // Generate message
  let message: { en: string; zh: string };
  switch (coilContactStatus) {
    case 'none':
      message = {
        en: 'No coil contact. Spring operating in linear range.',
        zh: '无线圈接触。弹簧在线性范围内工作。',
      };
      break;
    case 'partial':
      message = {
        en: `${coilsInContact} coils in contact. Stiffness reduced by ${((1 - reductionFactor) * 100).toFixed(1)}%`,
        zh: `${coilsInContact} 圈接触。刚度降低 ${((1 - reductionFactor) * 100).toFixed(1)}%`,
      };
      break;
    case 'full':
      message = {
        en: 'All coils in contact (solid height). Maximum friction effect.',
        zh: '所有线圈接触（固体高度）。最大摩擦效应。',
      };
      break;
  }
  
  return {
    deflection,
    coilContactStatus,
    coilsInContact,
    frictionCoefficient,
    effectiveStiffness,
    stiffnessReductionFactor: reductionFactor,
    energyLossPercent,
    message,
  };
}

/**
 * Generate friction curve over deflection range
 * 生成位移范围内的摩擦曲线
 */
export function generateFrictionCurve(
  geometry: CompressionSpringGeometry | ConicalSpringGeometry,
  staticStiffness: number,
  maxDeflection: number,
  frictionCoefficient: number = FRICTION_COEFFICIENTS.ground_dry,
  numPoints: number = 50
): Array<{
  deflection: number;
  effectiveStiffness: number;
  coilsInContact: number;
  reductionFactor: number;
}> {
  const points: Array<{
    deflection: number;
    effectiveStiffness: number;
    coilsInContact: number;
    reductionFactor: number;
  }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const deflection = (maxDeflection * i) / numPoints;
    const result = calculateFriction(geometry, staticStiffness, deflection, frictionCoefficient);
    
    points.push({
      deflection,
      effectiveStiffness: result.effectiveStiffness,
      coilsInContact: result.coilsInContact,
      reductionFactor: result.stiffnessReductionFactor,
    });
  }
  
  return points;
}
