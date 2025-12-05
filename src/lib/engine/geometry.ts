/**
 * Spring Analysis Engine - Geometry Module
 * 弹簧分析引擎 - 几何模块
 * 
 * Calculates geometric properties for all spring types
 */

import type {
  SpringGeometry,
  CompressionSpringGeometry,
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
  GeometryResult,
} from './types';

/**
 * Calculate spring index C = Dm / d
 * 计算弹簧指数 C = Dm / d
 */
export function calculateSpringIndex(meanDiameter: number, wireDiameter: number): number {
  if (wireDiameter <= 0) {
    throw new Error('Wire diameter must be positive');
  }
  return meanDiameter / wireDiameter;
}

/**
 * Calculate mean diameter from outer diameter
 * 从外径计算中径
 */
export function calculateMeanDiameter(outerDiameter: number, wireDiameter: number): number {
  return outerDiameter - wireDiameter;
}

/**
 * Calculate solid height for compression spring
 * 计算压缩弹簧的固体高度
 */
export function calculateSolidHeight(
  totalCoils: number,
  wireDiameter: number,
  endType: CompressionSpringGeometry['endType'] = 'closed_ground'
): number {
  // For ground ends, solid height ≈ Nt × d
  // For unground ends, add extra wire diameter
  switch (endType) {
    case 'closed_ground':
      return totalCoils * wireDiameter;
    case 'closed_unground':
      return (totalCoils + 1) * wireDiameter;
    case 'open':
      return (totalCoils + 1) * wireDiameter;
    case 'open_ground':
      return totalCoils * wireDiameter;
    default:
      return totalCoils * wireDiameter;
  }
}

/**
 * Calculate pitch from free length
 * 从自由长度计算节距
 */
export function calculatePitch(
  freeLength: number,
  activeCoils: number,
  wireDiameter: number,
  totalCoils: number
): number {
  // Active body height = L0 - dead coil height
  const deadCoils = totalCoils - activeCoils;
  const deadHeight = deadCoils * wireDiameter;
  const activeHeight = freeLength - deadHeight;
  return activeHeight / activeCoils;
}

/**
 * Calculate coil gap
 * 计算线圈间隙
 */
export function calculateCoilGap(pitch: number, wireDiameter: number): number {
  return pitch - wireDiameter;
}

/**
 * Calculate geometry for compression spring
 * 计算压缩弹簧几何参数
 */
export function calculateCompressionGeometry(
  geometry: CompressionSpringGeometry
): GeometryResult {
  const { wireDiameter, meanDiameter, activeCoils, freeLength, endType } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  
  const springIndex = calculateSpringIndex(meanDiameter, wireDiameter);
  const solidHeight = calculateSolidHeight(totalCoils, wireDiameter, endType);
  const pitch = geometry.pitch ?? calculatePitch(freeLength, activeCoils, wireDiameter, totalCoils);
  const coilGap = calculateCoilGap(pitch, wireDiameter);

  return {
    springIndex,
    meanDiameter,
    wireDiameter,
    activeCoils,
    totalCoils,
    solidHeight,
    freeLength,
    pitch,
    coilGap,
  };
}

/**
 * Calculate geometry for extension spring
 * 计算拉伸弹簧几何参数
 */
export function calculateExtensionGeometry(
  geometry: ExtensionSpringGeometry
): GeometryResult {
  const { wireDiameter, meanDiameter, activeCoils, bodyLength } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils;
  
  const springIndex = calculateSpringIndex(meanDiameter, wireDiameter);
  // Extension springs have coils touching in free state
  const pitch = wireDiameter;
  const coilGap = 0;

  return {
    springIndex,
    meanDiameter,
    wireDiameter,
    activeCoils,
    totalCoils,
    freeLength: bodyLength,
    pitch,
    coilGap,
  };
}

/**
 * Calculate geometry for torsion spring
 * 计算扭转弹簧几何参数
 */
export function calculateTorsionGeometry(
  geometry: TorsionSpringGeometry
): GeometryResult {
  const { wireDiameter, meanDiameter, activeCoils, bodyLength } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils;
  
  const springIndex = calculateSpringIndex(meanDiameter, wireDiameter);
  // Torsion springs typically have coils touching
  const pitch = wireDiameter;

  return {
    springIndex,
    meanDiameter,
    wireDiameter,
    activeCoils,
    totalCoils,
    freeLength: bodyLength,
    pitch,
    coilGap: 0,
  };
}

/**
 * Calculate geometry for conical spring
 * 计算锥形弹簧几何参数
 */
export function calculateConicalGeometry(
  geometry: ConicalSpringGeometry
): GeometryResult {
  const { wireDiameter, largeOuterDiameter, smallOuterDiameter, activeCoils, freeLength } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  
  // Calculate mean diameters at each end
  const largeMeanDiameter = largeOuterDiameter - wireDiameter;
  const smallMeanDiameter = smallOuterDiameter - wireDiameter;
  
  // Average mean diameter for spring index
  const meanDiameter = (largeMeanDiameter + smallMeanDiameter) / 2;
  const springIndex = calculateSpringIndex(meanDiameter, wireDiameter);
  
  // Solid height for conical spring
  const solidHeight = totalCoils * wireDiameter;
  
  // Calculate pitch
  const deadCoils = totalCoils - activeCoils;
  const deadHeight = deadCoils * wireDiameter;
  const activeHeight = freeLength - deadHeight;
  const pitch = activeHeight / activeCoils;

  return {
    springIndex,
    meanDiameter,
    wireDiameter,
    activeCoils,
    totalCoils,
    solidHeight,
    freeLength,
    pitch,
    coilGap: pitch - wireDiameter,
  };
}

/**
 * Calculate geometry for any spring type
 * 计算任意类型弹簧的几何参数
 */
export function calculateGeometry(geometry: SpringGeometry): GeometryResult {
  switch (geometry.type) {
    case 'compression':
      return calculateCompressionGeometry(geometry);
    case 'extension':
      return calculateExtensionGeometry(geometry);
    case 'torsion':
      return calculateTorsionGeometry(geometry);
    case 'conical':
      return calculateConicalGeometry(geometry);
    default:
      throw new Error(`Unknown spring type: ${(geometry as SpringGeometry).type}`);
  }
}

/**
 * Validate spring geometry
 * 验证弹簧几何参数
 */
export function validateGeometry(geometry: SpringGeometry): string[] {
  const warnings: string[] = [];
  
  // Common validations
  if (geometry.wireDiameter <= 0) {
    warnings.push('Wire diameter must be positive');
  }
  if (geometry.activeCoils <= 0) {
    warnings.push('Active coils must be positive');
  }
  
  // Calculate spring index
  let meanDiameter: number;
  if (geometry.type === 'conical') {
    meanDiameter = ((geometry.largeOuterDiameter - geometry.wireDiameter) + 
                    (geometry.smallOuterDiameter - geometry.wireDiameter)) / 2;
  } else {
    meanDiameter = geometry.meanDiameter;
  }
  
  const springIndex = meanDiameter / geometry.wireDiameter;
  
  // Spring index recommendations
  if (springIndex < 4) {
    warnings.push(`Spring index C=${springIndex.toFixed(1)} is too low (<4). Difficult to manufacture.`);
  } else if (springIndex > 12) {
    warnings.push(`Spring index C=${springIndex.toFixed(1)} is high (>12). May buckle or tangle.`);
  }
  
  // Type-specific validations
  if (geometry.type === 'compression') {
    const totalCoils = geometry.totalCoils ?? geometry.activeCoils + 2;
    const solidHeight = totalCoils * geometry.wireDiameter;
    if (geometry.freeLength <= solidHeight) {
      warnings.push(`Free length (${geometry.freeLength}mm) must be greater than solid height (${solidHeight.toFixed(1)}mm)`);
    }
  }
  
  if (geometry.type === 'conical') {
    if (geometry.largeOuterDiameter <= geometry.smallOuterDiameter) {
      warnings.push('Large diameter must be greater than small diameter');
    }
  }
  
  return warnings;
}
