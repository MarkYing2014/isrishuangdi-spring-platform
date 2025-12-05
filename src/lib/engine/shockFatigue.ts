/**
 * Spring Analysis Engine - Random Shock Fatigue Model
 * 弹簧分析引擎 - 随机冲击疲劳模型
 * 
 * Evaluates fatigue damage from random shock load series
 */

import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

/**
 * Shock load data point
 */
export interface ShockLoad {
  /** Load magnitude (N) */
  force: number;
  /** Optional timestamp */
  timestamp?: number;
  /** Optional duration (ms) */
  duration?: number;
}

/**
 * Shock fatigue result for single load
 */
export interface ShockFatiguePoint {
  /** Applied force (N) */
  force: number;
  /** Resulting stress (MPa) */
  stress: number;
  /** Fatigue life at this stress (cycles) */
  fatigueLife: number;
  /** Damage contribution (1/Ni) */
  damageContribution: number;
  /** Is critical (stress > 0.8 * allowable) */
  isCritical: boolean;
}

/**
 * Complete shock fatigue result
 */
export interface ShockFatigueResult {
  /** Individual shock results */
  shockResults: ShockFatiguePoint[];
  /** Total Miner damage sum */
  totalDamage: number;
  /** Number of shocks analyzed */
  shockCount: number;
  /** Maximum shock stress (MPa) */
  maxStress: number;
  /** Average shock stress (MPa) */
  avgStress: number;
  /** Critical shock count */
  criticalCount: number;
  /** Remaining life factor (1 - damage) */
  remainingLifeFactor: number;
  /** Pass/Fail status */
  status: 'pass' | 'warning' | 'fail';
  /** Status message */
  message: { en: string; zh: string };
}

/**
 * Calculate stress from shock load
 */
export function calculateShockStress(
  force: number,
  wireDiameter: number,
  meanDiameter: number,
  dynamicFactor: number = 1.3 // Impact amplification
): number {
  const C = meanDiameter / wireDiameter;
  // Wahl factor
  const Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
  
  // Shear stress with dynamic amplification
  const tau = Kw * (8 * force * meanDiameter) / (Math.PI * Math.pow(wireDiameter, 3));
  
  return tau * dynamicFactor;
}

/**
 * Calculate fatigue life for given stress
 */
export function calculateFatigueLifeAtStress(
  stress: number,
  materialId: SpringMaterialId
): number {
  const material = getSpringMaterial(materialId);
  if (!material) return 1;

  const { snCurve, allowShearStatic } = material;
  const { N1, tau1, N2, tau2 } = snCurve;
  
  // If stress below endurance limit
  if (stress <= tau2) {
    return 1e9; // Infinite life
  }
  
  // If stress above static limit
  if (stress >= allowShearStatic) {
    return 1; // Immediate failure
  }
  
  // Basquin equation
  const b = Math.log(tau1 / tau2) / Math.log(N2 / N1);
  const N = N2 * Math.pow(tau2 / stress, 1 / b);
  
  return Math.max(1, Math.min(N, 1e9));
}

/**
 * Evaluate random shock fatigue
 */
export function evaluateShockFatigue(
  shockLoads: ShockLoad[],
  wireDiameter: number,
  meanDiameter: number,
  materialId: SpringMaterialId,
  damageThreshold: number = 1.0
): ShockFatigueResult {
  const material = getSpringMaterial(materialId);
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }

  const allowableStress = material.allowShearStatic;
  const shockResults: ShockFatiguePoint[] = [];
  let totalDamage = 0;
  let maxStress = 0;
  let sumStress = 0;
  let criticalCount = 0;
  
  for (const shock of shockLoads) {
    const stress = calculateShockStress(shock.force, wireDiameter, meanDiameter);
    const fatigueLife = calculateFatigueLifeAtStress(stress, materialId);
    const damageContribution = 1 / fatigueLife;
    const isCritical = stress > 0.8 * allowableStress;
    
    shockResults.push({
      force: shock.force,
      stress,
      fatigueLife,
      damageContribution,
      isCritical,
    });
    
    totalDamage += damageContribution;
    maxStress = Math.max(maxStress, stress);
    sumStress += stress;
    if (isCritical) criticalCount++;
  }
  
  const avgStress = shockLoads.length > 0 ? sumStress / shockLoads.length : 0;
  const remainingLifeFactor = Math.max(0, 1 - totalDamage);
  
  // Determine status
  let status: ShockFatigueResult['status'];
  let message: { en: string; zh: string };
  
  if (totalDamage >= damageThreshold) {
    status = 'fail';
    message = {
      en: `FAIL: Miner damage sum (${totalDamage.toFixed(3)}) exceeds threshold (${damageThreshold})`,
      zh: `失败：Miner 损伤和 (${totalDamage.toFixed(3)}) 超过阈值 (${damageThreshold})`,
    };
  } else if (totalDamage > damageThreshold * 0.7 || criticalCount > shockLoads.length * 0.1) {
    status = 'warning';
    message = {
      en: `WARNING: High shock fatigue risk. Damage = ${totalDamage.toFixed(3)}, ${criticalCount} critical shocks`,
      zh: `警告：高冲击疲劳风险。损伤 = ${totalDamage.toFixed(3)}，${criticalCount} 次临界冲击`,
    };
  } else {
    status = 'pass';
    message = {
      en: `PASS: Shock fatigue within limits. Damage = ${totalDamage.toFixed(4)}`,
      zh: `通过：冲击疲劳在限值内。损伤 = ${totalDamage.toFixed(4)}`,
    };
  }
  
  return {
    shockResults,
    totalDamage,
    shockCount: shockLoads.length,
    maxStress,
    avgStress,
    criticalCount,
    remainingLifeFactor,
    status,
    message,
  };
}

/**
 * Parse shock loads from CSV string
 * Format: one force value per line
 */
export function parseShockLoadsCSV(csvContent: string): ShockLoad[] {
  const lines = csvContent.trim().split('\n');
  const loads: ShockLoad[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    
    const parts = line.split(',');
    const force = parseFloat(parts[0]);
    
    if (!isNaN(force)) {
      loads.push({
        force,
        timestamp: parts[1] ? parseFloat(parts[1]) : i,
        duration: parts[2] ? parseFloat(parts[2]) : undefined,
      });
    }
  }
  
  return loads;
}

/**
 * Generate random shock load sequence for testing
 */
export function generateRandomShockSequence(
  meanForce: number,
  stdDev: number,
  count: number
): ShockLoad[] {
  const loads: ShockLoad[] = [];
  
  for (let i = 0; i < count; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const force = Math.max(0, meanForce + z * stdDev);
    loads.push({ force, timestamp: i });
  }
  
  return loads;
}

/**
 * Calculate shock fatigue statistics
 */
export function calculateShockStatistics(shockLoads: ShockLoad[]): {
  mean: number;
  stdDev: number;
  max: number;
  min: number;
  count: number;
} {
  if (shockLoads.length === 0) {
    return { mean: 0, stdDev: 0, max: 0, min: 0, count: 0 };
  }
  
  const forces = shockLoads.map(s => s.force);
  const mean = forces.reduce((a, b) => a + b, 0) / forces.length;
  const variance = forces.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / forces.length;
  
  return {
    mean,
    stdDev: Math.sqrt(variance),
    max: Math.max(...forces),
    min: Math.min(...forces),
    count: forces.length,
  };
}
