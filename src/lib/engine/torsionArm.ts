/**
 * Spring Analysis Engine - Torsion Spring Arm Angle & Support Effect
 * 弹簧分析引擎 - 扭转弹簧臂角度与支撑效应
 * 
 * Arm angle solver and support angle stress multiplier
 */

import type { TorsionSpringGeometry } from './types';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

const PI = Math.PI;

/**
 * Torsion arm analysis result
 */
export interface TorsionArmResult {
  /** Applied torque (N·mm) */
  appliedTorque: number;
  /** Angular deflection (degrees) */
  angularDeflection: number;
  /** Spring rate (N·mm/deg) */
  springRate: number;
  /** Support angle (degrees) */
  supportAngle: number;
  /** Support angle stress multiplier */
  supportMultiplier: number;
  /** Adjusted bending stress (MPa) */
  adjustedBendingStress: number;
  /** Arm tip force (N) */
  armTipForce: number;
  /** Coil diameter change (mm) */
  coilDiameterChange: number;
  /** New inside diameter (mm) */
  newInsideDiameter: number;
  /** Arbor clearance warning */
  arborClearanceWarning?: { en: string; zh: string };
  /** Message */
  message: { en: string; zh: string };
}

/**
 * Support angle configurations
 */
export type SupportAngleType = 
  | 'perpendicular'  // 90° - standard
  | 'acute'          // < 90°
  | 'obtuse'         // > 90°
  | 'tangent';       // Tangent to coil

/**
 * Calculate support angle stress multiplier
 * 计算支撑角度应力乘数
 * 
 * When support angle ≠ 90°, stress distribution changes
 * k_support = f(angle)
 */
export function calculateSupportMultiplier(
  supportAngle: number // degrees
): number {
  // Normalize to 0-180 range
  const angle = Math.abs(supportAngle % 180);
  
  // At 90°, multiplier = 1.0 (ideal)
  // Deviation from 90° increases stress
  const deviation = Math.abs(angle - 90);
  
  // Empirical formula: stress increases with deviation
  // k_support = 1 + 0.005 × deviation + 0.0001 × deviation²
  const multiplier = 1 + 0.005 * deviation + 0.0001 * deviation * deviation;
  
  return Math.min(multiplier, 1.5); // Cap at 1.5
}

/**
 * Calculate torsion spring rate
 * 计算扭转弹簧刚度
 * 
 * k = (E × d⁴) / (64 × Dm × Na) [N·mm/rad]
 * k_deg = k / (180/π) [N·mm/deg]
 */
export function calculateTorsionSpringRate(
  wireDiameter: number,
  meanDiameter: number,
  activeCoils: number,
  elasticModulus: number
): number {
  // Rate in N·mm per radian
  const k_rad = (elasticModulus * Math.pow(wireDiameter, 4)) / 
                (64 * meanDiameter * activeCoils);
  
  // Convert to N·mm per degree
  return k_rad * (PI / 180);
}

/**
 * Calculate bending stress in torsion spring
 * 计算扭转弹簧弯曲应力
 * 
 * σ = Ki × (32 × M) / (π × d³)
 * 
 * Where Ki is the stress correction factor for curvature
 */
export function calculateTorsionBendingStress(
  torque: number,
  wireDiameter: number,
  meanDiameter: number
): {
  nominalStress: number;
  correctionFactor: number;
  correctedStress: number;
} {
  // Spring index
  const C = meanDiameter / wireDiameter;
  
  // Stress correction factor for inner fiber (Wahl for bending)
  // Ki = (4C² - C - 1) / (4C × (C - 1))
  const Ki = (4 * C * C - C - 1) / (4 * C * (C - 1));
  
  // Nominal bending stress
  const nominalStress = (32 * torque) / (PI * Math.pow(wireDiameter, 3));
  
  // Corrected stress
  const correctedStress = Ki * nominalStress;
  
  return {
    nominalStress,
    correctionFactor: Ki,
    correctedStress,
  };
}

/**
 * Calculate coil diameter change during deflection
 * 计算变形时线圈直径变化
 * 
 * When torsion spring winds up, diameter decreases
 * ΔD = (d × θ) / (π × Na)
 */
export function calculateCoilDiameterChange(
  wireDiameter: number,
  angularDeflection: number, // degrees
  activeCoils: number
): number {
  // Convert to radians
  const theta_rad = angularDeflection * (PI / 180);
  
  // Diameter change (negative = decrease)
  return -(wireDiameter * theta_rad) / (PI * activeCoils);
}

/**
 * Calculate arm tip force
 * 计算臂端力
 * 
 * F = M / L
 * Where L is the arm length
 */
export function calculateArmTipForce(
  torque: number,
  armLength: number
): number {
  if (armLength <= 0) return 0;
  return torque / armLength;
}

/**
 * Calculate complete torsion arm analysis
 * 计算完整扭转臂分析
 */
export function calculateTorsionArm(
  geometry: TorsionSpringGeometry,
  angularDeflection: number, // degrees
  supportAngle: number = 90, // degrees
  arborDiameter?: number // optional arbor diameter for clearance check
): TorsionArmResult {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter, activeCoils, legLength1 } = geometry;
  const elasticModulus = material.elasticModulus ?? 207000;
  
  // Calculate spring rate
  const springRate = calculateTorsionSpringRate(
    wireDiameter,
    meanDiameter,
    activeCoils,
    elasticModulus
  );
  
  // Calculate applied torque
  const appliedTorque = springRate * angularDeflection;
  
  // Calculate support multiplier
  const supportMultiplier = calculateSupportMultiplier(supportAngle);
  
  // Calculate bending stress
  const { correctedStress } = calculateTorsionBendingStress(
    appliedTorque,
    wireDiameter,
    meanDiameter
  );
  
  // Adjust for support angle
  const adjustedBendingStress = correctedStress * supportMultiplier;
  
  // Calculate arm tip force
  const armTipForce = calculateArmTipForce(appliedTorque, legLength1);
  
  // Calculate coil diameter change
  const coilDiameterChange = calculateCoilDiameterChange(
    wireDiameter,
    angularDeflection,
    activeCoils
  );
  
  // New inside diameter
  const currentID = meanDiameter - wireDiameter;
  const newInsideDiameter = currentID + coilDiameterChange;
  
  // Check arbor clearance
  let arborClearanceWarning: { en: string; zh: string } | undefined;
  if (arborDiameter !== undefined && newInsideDiameter < arborDiameter * 1.1) {
    arborClearanceWarning = {
      en: `WARNING: Inside diameter (${newInsideDiameter.toFixed(2)} mm) approaching arbor diameter (${arborDiameter} mm)`,
      zh: `警告：内径 (${newInsideDiameter.toFixed(2)} mm) 接近芯轴直径 (${arborDiameter} mm)`,
    };
  }
  
  // Generate message
  let message: { en: string; zh: string };
  if (supportAngle === 90) {
    message = {
      en: `Standard 90° support. Bending stress = ${adjustedBendingStress.toFixed(1)} MPa`,
      zh: `标准 90° 支撑。弯曲应力 = ${adjustedBendingStress.toFixed(1)} MPa`,
    };
  } else {
    message = {
      en: `Non-standard ${supportAngle}° support. Stress multiplier = ${supportMultiplier.toFixed(3)}`,
      zh: `非标准 ${supportAngle}° 支撑。应力乘数 = ${supportMultiplier.toFixed(3)}`,
    };
  }
  
  return {
    appliedTorque,
    angularDeflection,
    springRate,
    supportAngle,
    supportMultiplier,
    adjustedBendingStress,
    armTipForce,
    coilDiameterChange,
    newInsideDiameter,
    arborClearanceWarning,
    message,
  };
}

/**
 * Calculate torque for target angular deflection
 * 计算目标角度变形所需扭矩
 */
export function calculateRequiredTorque(
  geometry: TorsionSpringGeometry,
  targetAngle: number // degrees
): number {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const elasticModulus = material.elasticModulus ?? 207000;
  const springRate = calculateTorsionSpringRate(
    geometry.wireDiameter,
    geometry.meanDiameter,
    geometry.activeCoils,
    elasticModulus
  );
  
  return springRate * targetAngle;
}

/**
 * Calculate angular deflection for target torque
 * 计算目标扭矩所需角度变形
 */
export function calculateRequiredAngle(
  geometry: TorsionSpringGeometry,
  targetTorque: number // N·mm
): number {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const elasticModulus = material.elasticModulus ?? 207000;
  const springRate = calculateTorsionSpringRate(
    geometry.wireDiameter,
    geometry.meanDiameter,
    geometry.activeCoils,
    elasticModulus
  );
  
  if (springRate <= 0) return 0;
  return targetTorque / springRate;
}

/**
 * Generate torque-angle curve
 * 生成扭矩-角度曲线
 */
export function generateTorqueAngleCurve(
  geometry: TorsionSpringGeometry,
  maxAngle: number,
  supportAngle: number = 90,
  numPoints: number = 50
): Array<{
  angle: number;
  torque: number;
  stress: number;
  insideDiameter: number;
}> {
  const points: Array<{
    angle: number;
    torque: number;
    stress: number;
    insideDiameter: number;
  }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const angle = (maxAngle * i) / numPoints;
    const result = calculateTorsionArm(geometry, angle, supportAngle);
    
    points.push({
      angle,
      torque: result.appliedTorque,
      stress: result.adjustedBendingStress,
      insideDiameter: result.newInsideDiameter,
    });
  }
  
  return points;
}
