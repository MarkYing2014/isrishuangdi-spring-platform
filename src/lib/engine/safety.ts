/**
 * Spring Analysis Engine - Safety Factor Module
 * 弹簧分析引擎 - 安全系数模块
 * 
 * Calculates static and dynamic safety factors
 */

import type { SafetyResult } from './types';
import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Safety factor thresholds
 * 安全系数阈值
 */
export const SAFETY_THRESHOLDS = {
  /** Minimum safe factor */
  SAFE: 1.5,
  /** Warning threshold */
  WARNING: 1.2,
  /** Danger threshold */
  DANGER: 1.0,
};

/**
 * Get safety status based on safety factor value
 * 根据安全系数值获取安全状态
 */
export function getSafetyStatus(
  safetyFactor: number
): {
  status: SafetyResult['status'];
  message: { en: string; zh: string };
} {
  if (safetyFactor >= SAFETY_THRESHOLDS.SAFE) {
    return {
      status: 'safe',
      message: { 
        en: `Safe (SF ≥ ${SAFETY_THRESHOLDS.SAFE})`, 
        zh: `安全 (SF ≥ ${SAFETY_THRESHOLDS.SAFE})` 
      },
    };
  } else if (safetyFactor >= SAFETY_THRESHOLDS.WARNING) {
    return {
      status: 'warning',
      message: { 
        en: `Marginal (${SAFETY_THRESHOLDS.WARNING} ≤ SF < ${SAFETY_THRESHOLDS.SAFE})`, 
        zh: `临界 (${SAFETY_THRESHOLDS.WARNING} ≤ SF < ${SAFETY_THRESHOLDS.SAFE})` 
      },
    };
  } else {
    return {
      status: 'danger',
      message: { 
        en: `Unsafe (SF < ${SAFETY_THRESHOLDS.WARNING})`, 
        zh: `不安全 (SF < ${SAFETY_THRESHOLDS.WARNING})` 
      },
    };
  }
}

/**
 * Calculate static safety factor
 * 计算静态安全系数
 * 
 * SF = τ_allow / τ_effective
 */
export function calculateStaticSafetyFactor(
  materialId: SpringMaterialId,
  effectiveStress: number
): SafetyResult {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const allowableStress = material.allowShearStatic;
  const staticSafetyFactor = allowableStress / effectiveStress;

  const { status, message } = getSafetyStatus(staticSafetyFactor);

  return {
    staticSafetyFactor,
    allowableStress,
    status,
    message,
  };
}

/**
 * Calculate safety factor against yield
 * 计算屈服安全系数
 * 
 * For spring steels, yield stress ≈ 0.85 × tensile strength
 */
export function calculateYieldSafetyFactor(
  materialId: SpringMaterialId,
  effectiveStress: number
): number {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const tensileStrength = material.tensileStrength ?? material.allowShearStatic * 2;
  const yieldStrength = tensileStrength * 0.85;
  // Shear yield ≈ 0.577 × tensile yield (von Mises)
  const shearYield = yieldStrength * 0.577;

  return shearYield / effectiveStress;
}

/**
 * Calculate safety factor for fatigue
 * 计算疲劳安全系数
 * 
 * SF_fatigue = τ_endurance / τ_alt_effective
 */
export function calculateFatigueSafetyFactor(
  materialId: SpringMaterialId,
  effectiveAlternatingStress: number
): number {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  // Endurance limit is tau2 from S-N curve
  const enduranceLimit = material.snCurve.tau2;
  return enduranceLimit / effectiveAlternatingStress;
}

/**
 * Calculate combined safety assessment
 * 计算综合安全评估
 */
export function calculateCombinedSafety(
  materialId: SpringMaterialId,
  effectiveStress: number,
  effectiveAlternatingStress?: number
): {
  static: SafetyResult;
  yield: number;
  fatigue?: number;
  overall: SafetyResult['status'];
} {
  const staticResult = calculateStaticSafetyFactor(materialId, effectiveStress);
  const yieldSF = calculateYieldSafetyFactor(materialId, effectiveStress);
  
  let fatigueSF: number | undefined;
  if (effectiveAlternatingStress !== undefined && effectiveAlternatingStress > 0) {
    fatigueSF = calculateFatigueSafetyFactor(materialId, effectiveAlternatingStress);
  }

  // Determine overall status (worst case)
  let overall: SafetyResult['status'] = 'safe';
  
  if (staticResult.status === 'danger' || yieldSF < SAFETY_THRESHOLDS.WARNING) {
    overall = 'danger';
  } else if (staticResult.status === 'warning' || yieldSF < SAFETY_THRESHOLDS.SAFE) {
    overall = 'warning';
  }
  
  if (fatigueSF !== undefined) {
    if (fatigueSF < SAFETY_THRESHOLDS.WARNING) {
      overall = 'danger';
    } else if (fatigueSF < SAFETY_THRESHOLDS.SAFE && overall !== 'danger') {
      overall = 'warning';
    }
  }

  return {
    static: staticResult,
    yield: yieldSF,
    fatigue: fatigueSF,
    overall,
  };
}

/**
 * Get color code for safety status
 * 获取安全状态的颜色代码
 */
export function getSafetyColor(status: SafetyResult['status']): string {
  switch (status) {
    case 'safe':
      return '#22c55e'; // green-500
    case 'warning':
      return '#f59e0b'; // amber-500
    case 'danger':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get Tailwind CSS class for safety status
 * 获取安全状态的 Tailwind CSS 类
 */
export function getSafetyColorClass(status: SafetyResult['status']): string {
  switch (status) {
    case 'safe':
      return 'bg-green-500 text-white';
    case 'warning':
      return 'bg-amber-500 text-white';
    case 'danger':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}
