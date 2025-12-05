/**
 * Spring Analysis Engine - Stress Module
 * 弹簧分析引擎 - 应力模块
 * 
 * Calculates shear stress with Wahl correction for all spring types
 */

import type { SpringGeometry, StressResult } from './types';
import { 
  getSpringMaterial, 
  getSizeFactor, 
  getTemperatureFactor,
  type SpringMaterialId 
} from '@/lib/materials/springMaterials';

const PI = Math.PI;

/**
 * Calculate Wahl stress correction factor
 * 计算 Wahl 应力修正系数
 * 
 * K_w = (4C - 1)/(4C - 4) + 0.615/C
 * 
 * @param springIndex Spring index C = Dm/d
 * @returns Wahl factor
 */
export function calculateWahlFactor(springIndex: number): number {
  if (springIndex <= 1) {
    throw new Error('Spring index must be greater than 1');
  }
  return (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;
}

/**
 * Calculate Bergsträsser stress correction factor (alternative to Wahl)
 * 计算 Bergsträsser 应力修正系数
 * 
 * K_B = (4C + 2)/(4C - 3)
 * 
 * @param springIndex Spring index C = Dm/d
 * @returns Bergsträsser factor
 */
export function calculateBergstrasserFactor(springIndex: number): number {
  if (springIndex <= 0.75) {
    throw new Error('Spring index must be greater than 0.75');
  }
  return (4 * springIndex + 2) / (4 * springIndex - 3);
}

/**
 * Calculate nominal shear stress for helical spring
 * 计算螺旋弹簧的名义剪应力
 * 
 * τ = (8 × F × Dm) / (π × d³)
 * 
 * @param force Applied force (N)
 * @param meanDiameter Mean diameter Dm (mm)
 * @param wireDiameter Wire diameter d (mm)
 * @returns Nominal shear stress (MPa)
 */
export function calculateNominalShearStress(
  force: number,
  meanDiameter: number,
  wireDiameter: number
): number {
  if (wireDiameter <= 0) {
    throw new Error('Wire diameter must be positive');
  }
  return (8 * force * meanDiameter) / (PI * Math.pow(wireDiameter, 3));
}

/**
 * Calculate bending stress for torsion spring
 * 计算扭转弹簧的弯曲应力
 * 
 * σ = (32 × M × Dm) / (π × d³)
 * 
 * For round wire, using bending stress formula
 * 
 * @param torque Applied torque M (N·mm)
 * @param meanDiameter Mean diameter Dm (mm)
 * @param wireDiameter Wire diameter d (mm)
 * @returns Bending stress (MPa)
 */
export function calculateBendingStress(
  torque: number,
  meanDiameter: number,
  wireDiameter: number
): number {
  if (wireDiameter <= 0) {
    throw new Error('Wire diameter must be positive');
  }
  // For torsion springs, the stress is primarily bending
  // σ = 32M / (πd³) for round wire
  // With curvature correction: K_i = (4C² - C - 1) / (4C(C - 1)) for inner fiber
  const springIndex = meanDiameter / wireDiameter;
  const Ki = (4 * springIndex * springIndex - springIndex - 1) / 
             (4 * springIndex * (springIndex - 1));
  
  const nominalBendingStress = (32 * torque) / (PI * Math.pow(wireDiameter, 3));
  return Ki * nominalBendingStress;
}

/**
 * Calculate stress for conical spring at a specific coil
 * 计算锥形弹簧在特定线圈处的应力
 * 
 * @param force Applied force (N)
 * @param localDiameter Local mean diameter at coil (mm)
 * @param wireDiameter Wire diameter d (mm)
 * @returns Shear stress at that coil (MPa)
 */
export function calculateConicalCoilStress(
  force: number,
  localDiameter: number,
  wireDiameter: number
): number {
  const springIndex = localDiameter / wireDiameter;
  const wahlFactor = calculateWahlFactor(springIndex);
  const nominalStress = calculateNominalShearStress(force, localDiameter, wireDiameter);
  return wahlFactor * nominalStress;
}

/**
 * Calculate complete stress result for a spring
 * 计算弹簧的完整应力结果
 */
export function calculateStress(
  geometry: SpringGeometry,
  force: number,
  temperature: number = 20
): StressResult {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  let meanDiameter: number;
  let tauNominal: number;
  let bendingStress: number | undefined;

  // Calculate mean diameter based on spring type
  if (geometry.type === 'conical') {
    // For conical springs, use average mean diameter
    const largeMean = geometry.largeOuterDiameter - geometry.wireDiameter;
    const smallMean = geometry.smallOuterDiameter - geometry.wireDiameter;
    meanDiameter = (largeMean + smallMean) / 2;
    
    // For stress calculation, use the large end (highest stress)
    tauNominal = calculateNominalShearStress(force, largeMean, geometry.wireDiameter);
  } else if (geometry.type === 'torsion') {
    meanDiameter = geometry.meanDiameter;
    // For torsion springs, force is actually torque
    bendingStress = calculateBendingStress(force, meanDiameter, geometry.wireDiameter);
    // Also calculate equivalent shear stress for comparison
    tauNominal = bendingStress * 0.577; // von Mises conversion
  } else {
    meanDiameter = geometry.meanDiameter;
    tauNominal = calculateNominalShearStress(force, meanDiameter, geometry.wireDiameter);
  }

  // Calculate spring index and Wahl factor
  const springIndex = meanDiameter / geometry.wireDiameter;
  const wahlFactor = calculateWahlFactor(springIndex);

  // Get correction factors
  const surfaceFactor = material.surfaceFactor ?? 1.0;
  const sizeFactor = getSizeFactor(geometry.wireDiameter);
  const tempFactor = getTemperatureFactor(temperature, geometry.materialId);

  // Total correction factor
  const totalCorrectionFactor = wahlFactor * surfaceFactor * sizeFactor * tempFactor;

  // Effective stress
  const tauEffective = tauNominal * totalCorrectionFactor;

  return {
    tauNominal,
    wahlFactor,
    surfaceFactor,
    sizeFactor,
    tempFactor,
    totalCorrectionFactor,
    tauEffective,
    bendingStress,
  };
}

/**
 * Calculate stress at minimum and maximum deflection
 * 计算最小和最大位移处的应力
 */
export function calculateStressRange(
  geometry: SpringGeometry,
  springRate: number,
  minDeflection: number,
  maxDeflection: number,
  temperature: number = 20,
  initialTension: number = 0
): {
  stressMin: StressResult;
  stressMax: StressResult;
  stressMean: number;
  stressAmplitude: number;
  stressRatio: number;
} {
  // Calculate forces
  const forceMin = springRate * minDeflection + initialTension;
  const forceMax = springRate * maxDeflection + initialTension;

  // Calculate stresses
  const stressMin = calculateStress(geometry, forceMin, temperature);
  const stressMax = calculateStress(geometry, forceMax, temperature);

  // Calculate mean and amplitude
  const stressMean = (stressMax.tauEffective + stressMin.tauEffective) / 2;
  const stressAmplitude = (stressMax.tauEffective - stressMin.tauEffective) / 2;
  const stressRatio = stressMin.tauEffective / stressMax.tauEffective;

  return {
    stressMin,
    stressMax,
    stressMean,
    stressAmplitude,
    stressRatio,
  };
}

/**
 * Calculate maximum stress for conical spring (at large end)
 * 计算锥形弹簧的最大应力（在大端）
 */
export function calculateConicalMaxStress(
  geometry: SpringGeometry & { type: 'conical' },
  force: number,
  temperature: number = 20
): StressResult {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  // Maximum stress occurs at the large end
  const largeMeanDiameter = geometry.largeOuterDiameter - geometry.wireDiameter;
  const tauNominal = calculateNominalShearStress(force, largeMeanDiameter, geometry.wireDiameter);

  const springIndex = largeMeanDiameter / geometry.wireDiameter;
  const wahlFactor = calculateWahlFactor(springIndex);

  const surfaceFactor = material.surfaceFactor ?? 1.0;
  const sizeFactor = getSizeFactor(geometry.wireDiameter);
  const tempFactor = getTemperatureFactor(temperature, geometry.materialId);

  const totalCorrectionFactor = wahlFactor * surfaceFactor * sizeFactor * tempFactor;
  const tauEffective = tauNominal * totalCorrectionFactor;

  return {
    tauNominal,
    wahlFactor,
    surfaceFactor,
    sizeFactor,
    tempFactor,
    totalCorrectionFactor,
    tauEffective,
  };
}
