/**
 * Spring Analysis Engine - Extension Spring Hook Stress Analyzer
 * 弹簧分析引擎 - 拉伸弹簧钩子应力分析器
 * 
 * Hook stress calculation and fatigue safety factor
 */

import type { ExtensionSpringGeometry } from './types';
import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

const PI = Math.PI;

/**
 * Hook types
 */
export type HookType = 
  | 'machine'      // Standard machine hook
  | 'crossover'    // Crossover center hook
  | 'side'         // Side hook
  | 'extended'     // Extended hook
  | 'reduced'      // Reduced hook
  | 'v_hook'       // V-hook
  | 'double_loop'; // Double loop

/**
 * Hook stress result
 */
export interface HookStressResult {
  /** Hook type */
  hookType: HookType;
  /** Bending stress at hook (MPa) */
  bendingStress: number;
  /** Torsional stress at hook (MPa) */
  torsionalStress: number;
  /** Combined stress (von Mises) (MPa) */
  combinedStress: number;
  /** Hook stress concentration factor */
  stressConcentrationFactor: number;
  /** Hook safety factor */
  hookSafetyFactor: number;
  /** Body safety factor (for comparison) */
  bodySafetyFactor: number;
  /** Critical location */
  criticalLocation: 'hook_bend' | 'hook_transition' | 'body';
  /** Hook fatigue safety factor */
  hookFatigueSafetyFactor: number;
  /** Status */
  status: 'safe' | 'warning' | 'danger';
  /** Message */
  message: { en: string; zh: string };
}

/**
 * Hook geometry factors
 */
export const HOOK_FACTORS: Record<HookType, {
  /** Bending stress factor */
  Kb: number;
  /** Torsional stress factor */
  Kt: number;
  /** Stress concentration factor */
  Kf: number;
  /** Description */
  description: { en: string; zh: string };
}> = {
  machine: {
    Kb: 1.0,
    Kt: 1.0,
    Kf: 1.2,
    description: { en: 'Standard machine hook', zh: '标准机械钩' },
  },
  crossover: {
    Kb: 1.1,
    Kt: 1.05,
    Kf: 1.3,
    description: { en: 'Crossover center hook', zh: '交叉中心钩' },
  },
  side: {
    Kb: 1.15,
    Kt: 1.1,
    Kf: 1.35,
    description: { en: 'Side hook', zh: '侧钩' },
  },
  extended: {
    Kb: 0.95,
    Kt: 0.95,
    Kf: 1.15,
    description: { en: 'Extended hook (lower stress)', zh: '加长钩（应力较低）' },
  },
  reduced: {
    Kb: 1.25,
    Kt: 1.2,
    Kf: 1.5,
    description: { en: 'Reduced hook (higher stress)', zh: '缩短钩（应力较高）' },
  },
  v_hook: {
    Kb: 1.2,
    Kt: 1.15,
    Kf: 1.4,
    description: { en: 'V-hook', zh: 'V型钩' },
  },
  double_loop: {
    Kb: 0.9,
    Kt: 0.9,
    Kf: 1.1,
    description: { en: 'Double loop (lowest stress)', zh: '双环（应力最低）' },
  },
};

/**
 * Calculate hook bending stress
 * 计算钩子弯曲应力
 * 
 * σ_hook = 32M / (π × d³) × Kb × Kf
 * 
 * Where:
 * - M = F × r (moment from force at hook radius)
 * - r = hook radius ≈ mean diameter / 2
 */
export function calculateHookBendingStress(
  force: number,
  wireDiameter: number,
  meanDiameter: number,
  hookType: HookType = 'machine'
): number {
  const factors = HOOK_FACTORS[hookType];
  
  // Hook radius (typically same as mean coil radius)
  const hookRadius = meanDiameter / 2;
  
  // Bending moment
  const M = force * hookRadius;
  
  // Bending stress with factors
  const sigma = (32 * M) / (PI * Math.pow(wireDiameter, 3));
  
  return sigma * factors.Kb * factors.Kf;
}

/**
 * Calculate hook torsional stress
 * 计算钩子扭转应力
 * 
 * τ_hook = 8FD / (π × d³) × Kt × Kf
 */
export function calculateHookTorsionalStress(
  force: number,
  wireDiameter: number,
  meanDiameter: number,
  hookType: HookType = 'machine'
): number {
  const factors = HOOK_FACTORS[hookType];
  
  // Torsional stress (similar to body shear stress)
  const tau = (8 * force * meanDiameter) / (PI * Math.pow(wireDiameter, 3));
  
  return tau * factors.Kt * factors.Kf;
}

/**
 * Calculate combined hook stress (von Mises)
 * 计算组合钩子应力（von Mises）
 * 
 * σ_vm = √(σ² + 3τ²)
 */
export function calculateCombinedHookStress(
  bendingStress: number,
  torsionalStress: number
): number {
  return Math.sqrt(
    bendingStress * bendingStress + 3 * torsionalStress * torsionalStress
  );
}

/**
 * Calculate hook safety factor
 * 计算钩子安全系数
 */
export function calculateHookSafetyFactor(
  combinedStress: number,
  allowableStress: number
): number {
  if (combinedStress <= 0) return Infinity;
  return allowableStress / combinedStress;
}

/**
 * Calculate complete hook stress analysis
 * 计算完整钩子应力分析
 */
export function calculateHookStress(
  geometry: ExtensionSpringGeometry,
  force: number,
  bodyShearStress: number,
  hookType: HookType = 'machine'
): HookStressResult {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter } = geometry;
  const allowableStress = material.allowShearStatic;
  
  // Calculate hook stresses
  const bendingStress = calculateHookBendingStress(
    force,
    wireDiameter,
    meanDiameter,
    hookType
  );
  
  const torsionalStress = calculateHookTorsionalStress(
    force,
    wireDiameter,
    meanDiameter,
    hookType
  );
  
  const combinedStress = calculateCombinedHookStress(bendingStress, torsionalStress);
  
  // Calculate safety factors
  const hookSafetyFactor = calculateHookSafetyFactor(combinedStress, allowableStress);
  const bodySafetyFactor = calculateHookSafetyFactor(bodyShearStress, allowableStress);
  
  // Determine critical location
  let criticalLocation: 'hook_bend' | 'hook_transition' | 'body';
  if (hookSafetyFactor < bodySafetyFactor * 0.9) {
    criticalLocation = bendingStress > torsionalStress ? 'hook_bend' : 'hook_transition';
  } else {
    criticalLocation = 'body';
  }
  
  // Hook fatigue safety factor (typically lower than static)
  const hookFatigueSafetyFactor = hookSafetyFactor * 0.7; // Conservative estimate
  
  // Determine status
  let status: 'safe' | 'warning' | 'danger';
  const minSF = Math.min(hookSafetyFactor, bodySafetyFactor);
  if (minSF >= 1.5) {
    status = 'safe';
  } else if (minSF >= 1.2) {
    status = 'warning';
  } else {
    status = 'danger';
  }
  
  // Generate message
  let message: { en: string; zh: string };
  if (criticalLocation === 'body') {
    message = {
      en: `Body is critical. Hook SF = ${hookSafetyFactor.toFixed(2)}, Body SF = ${bodySafetyFactor.toFixed(2)}`,
      zh: `本体为关键位置。钩子 SF = ${hookSafetyFactor.toFixed(2)}，本体 SF = ${bodySafetyFactor.toFixed(2)}`,
    };
  } else {
    message = {
      en: `Hook is critical (${criticalLocation}). Hook SF = ${hookSafetyFactor.toFixed(2)} < Body SF = ${bodySafetyFactor.toFixed(2)}`,
      zh: `钩子为关键位置（${criticalLocation === 'hook_bend' ? '弯曲处' : '过渡处'}）。钩子 SF = ${hookSafetyFactor.toFixed(2)} < 本体 SF = ${bodySafetyFactor.toFixed(2)}`,
    };
  }
  
  return {
    hookType,
    bendingStress,
    torsionalStress,
    combinedStress,
    stressConcentrationFactor: HOOK_FACTORS[hookType].Kf,
    hookSafetyFactor,
    bodySafetyFactor,
    criticalLocation,
    hookFatigueSafetyFactor,
    status,
    message,
  };
}

/**
 * Get hook type options
 */
export function getHookTypeOptions(): Array<{
  value: HookType;
  labelEn: string;
  labelZh: string;
}> {
  return Object.entries(HOOK_FACTORS).map(([key, factors]) => ({
    value: key as HookType,
    labelEn: factors.description.en,
    labelZh: factors.description.zh,
  }));
}

/**
 * Recommend hook type based on safety requirements
 */
export function recommendHookType(
  geometry: ExtensionSpringGeometry,
  force: number,
  targetSafetyFactor: number = 1.5
): {
  recommendedType: HookType;
  achievedSafetyFactor: number;
  alternatives: HookType[];
} {
  const hookTypes: HookType[] = ['double_loop', 'extended', 'machine', 'crossover', 'side', 'v_hook', 'reduced'];
  
  let recommendedType: HookType = 'machine';
  let achievedSafetyFactor = 0;
  const alternatives: HookType[] = [];
  
  for (const hookType of hookTypes) {
    const result = calculateHookStress(geometry, force, 0, hookType);
    
    if (result.hookSafetyFactor >= targetSafetyFactor) {
      if (achievedSafetyFactor === 0) {
        recommendedType = hookType;
        achievedSafetyFactor = result.hookSafetyFactor;
      } else {
        alternatives.push(hookType);
      }
    }
  }
  
  return {
    recommendedType,
    achievedSafetyFactor,
    alternatives,
  };
}
