/**
 * Spring Analysis Engine - Force Curve Module
 * 弹簧分析引擎 - 力曲线模块
 * 
 * Generates force-deflection curves for all spring types
 */

import type {
  SpringGeometry,
  CompressionSpringGeometry,
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
  ForceDeflectionPoint,
} from './types';
import { getSpringMaterial } from '@/lib/materials/springMaterials';
import { calculateWahlFactor, calculateNominalShearStress } from './stress';

const PI = Math.PI;

/**
 * Calculate spring rate for compression spring
 * 计算压缩弹簧刚度
 * 
 * k = (G × d⁴) / (8 × Dm³ × Na)
 */
export function calculateCompressionSpringRate(
  geometry: CompressionSpringGeometry
): number {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter, activeCoils } = geometry;
  const G = material.shearModulus;

  return (G * Math.pow(wireDiameter, 4)) / 
         (8 * Math.pow(meanDiameter, 3) * activeCoils);
}

/**
 * Calculate spring rate for extension spring
 * 计算拉伸弹簧刚度
 * 
 * Same formula as compression spring
 */
export function calculateExtensionSpringRate(
  geometry: ExtensionSpringGeometry
): number {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter, activeCoils } = geometry;
  const G = material.shearModulus;

  return (G * Math.pow(wireDiameter, 4)) / 
         (8 * Math.pow(meanDiameter, 3) * activeCoils);
}

/**
 * Calculate spring rate for torsion spring
 * 计算扭转弹簧刚度
 * 
 * k = (E × d⁴) / (64 × Dm × Na) [N·mm/deg]
 * 
 * Or in radians: k = (E × d⁴) / (10.8 × Dm × Na)
 */
export function calculateTorsionSpringRate(
  geometry: TorsionSpringGeometry
): number {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, meanDiameter, activeCoils } = geometry;
  const E = material.elasticModulus ?? 207000;

  // Rate in N·mm per degree
  return (E * Math.pow(wireDiameter, 4)) / 
         (64 * meanDiameter * activeCoils * (180 / PI));
}

/**
 * Calculate initial spring rate for conical spring
 * 计算锥形弹簧初始刚度
 * 
 * k = (G × d⁴) / (2 × Na × (D1 + D2) × (D1² + D2²))
 */
export function calculateConicalSpringRate(
  geometry: ConicalSpringGeometry
): number {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, largeOuterDiameter, smallOuterDiameter, activeCoils } = geometry;
  const G = material.shearModulus;

  const D1 = largeOuterDiameter - wireDiameter; // Large mean diameter
  const D2 = smallOuterDiameter - wireDiameter; // Small mean diameter

  return (G * Math.pow(wireDiameter, 4)) / 
         (2 * activeCoils * (D1 + D2) * (D1 * D1 + D2 * D2));
}

/**
 * Calculate spring rate for any spring type
 * 计算任意类型弹簧的刚度
 */
export function calculateSpringRate(geometry: SpringGeometry): number {
  switch (geometry.type) {
    case 'compression':
      return calculateCompressionSpringRate(geometry);
    case 'extension':
      return calculateExtensionSpringRate(geometry);
    case 'torsion':
      return calculateTorsionSpringRate(geometry);
    case 'conical':
      return calculateConicalSpringRate(geometry);
    default:
      throw new Error(`Unknown spring type: ${(geometry as SpringGeometry).type}`);
  }
}

/**
 * Generate force-deflection curve for compression spring
 * 生成压缩弹簧的力-位移曲线
 */
export function generateCompressionForceCurve(
  geometry: CompressionSpringGeometry,
  maxDeflection: number,
  numPoints: number = 50
): ForceDeflectionPoint[] {
  const springRate = calculateCompressionSpringRate(geometry);
  const { wireDiameter, meanDiameter } = geometry;
  const springIndex = meanDiameter / wireDiameter;
  const wahlFactor = calculateWahlFactor(springIndex);

  const points: ForceDeflectionPoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const deflection = (maxDeflection * i) / numPoints;
    const force = springRate * deflection;
    
    // Calculate stress at this point
    const tauNominal = calculateNominalShearStress(force, meanDiameter, wireDiameter);
    const stress = wahlFactor * tauNominal;

    points.push({
      deflection: Number(deflection.toFixed(3)),
      force: Number(force.toFixed(3)),
      stiffness: springRate,
      stress: Number(stress.toFixed(2)),
    });
  }

  return points;
}

/**
 * Generate force-deflection curve for extension spring
 * 生成拉伸弹簧的力-位移曲线
 */
export function generateExtensionForceCurve(
  geometry: ExtensionSpringGeometry,
  maxDeflection: number,
  numPoints: number = 50
): ForceDeflectionPoint[] {
  const springRate = calculateExtensionSpringRate(geometry);
  const { wireDiameter, meanDiameter, initialTension } = geometry;
  const springIndex = meanDiameter / wireDiameter;
  const wahlFactor = calculateWahlFactor(springIndex);

  const points: ForceDeflectionPoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const deflection = (maxDeflection * i) / numPoints;
    const force = initialTension + springRate * deflection;
    
    const tauNominal = calculateNominalShearStress(force, meanDiameter, wireDiameter);
    const stress = wahlFactor * tauNominal;

    points.push({
      deflection: Number(deflection.toFixed(3)),
      force: Number(force.toFixed(3)),
      stiffness: springRate,
      stress: Number(stress.toFixed(2)),
    });
  }

  return points;
}

/**
 * Generate torque-angle curve for torsion spring
 * 生成扭转弹簧的扭矩-角度曲线
 */
export function generateTorsionForceCurve(
  geometry: TorsionSpringGeometry,
  maxAngle: number, // degrees
  numPoints: number = 50
): ForceDeflectionPoint[] {
  const springRate = calculateTorsionSpringRate(geometry);
  const { wireDiameter, meanDiameter } = geometry;

  const points: ForceDeflectionPoint[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const angle = (maxAngle * i) / numPoints;
    const torque = springRate * angle;
    
    // Bending stress for torsion spring
    const springIndex = meanDiameter / wireDiameter;
    const Ki = (4 * springIndex * springIndex - springIndex - 1) / 
               (4 * springIndex * (springIndex - 1));
    const stress = Ki * (32 * torque) / (PI * Math.pow(wireDiameter, 3));

    points.push({
      deflection: Number(angle.toFixed(2)), // angle in degrees
      force: Number(torque.toFixed(3)), // torque in N·mm
      stiffness: springRate,
      stress: Number(stress.toFixed(2)),
    });
  }

  return points;
}

/**
 * Generate nonlinear force-deflection curve for conical spring
 * 生成锥形弹簧的非线性力-位移曲线
 */
export function generateConicalForceCurve(
  geometry: ConicalSpringGeometry,
  maxDeflection: number,
  numPoints: number = 50
): ForceDeflectionPoint[] {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const { wireDiameter, largeOuterDiameter, smallOuterDiameter, activeCoils, freeLength } = geometry;
  const G = material.shearModulus;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;

  // Calculate solid height and pitch
  const solidHeight = totalCoils * wireDiameter;
  const totalDeflectionCapacity = freeLength - solidHeight;
  const pitch = totalDeflectionCapacity / activeCoils;

  // Mean diameters
  const D1 = largeOuterDiameter - wireDiameter;
  const D2 = smallOuterDiameter - wireDiameter;

  // Clamp max deflection
  const effectiveMaxDeflection = Math.min(maxDeflection, totalDeflectionCapacity);

  const points: ForceDeflectionPoint[] = [];
  let cumulativeLoad = 0;
  let prevDeflection = 0;

  for (let i = 0; i <= numPoints; i++) {
    const deflection = (effectiveMaxDeflection * i) / numPoints;

    // Calculate collapsed coils
    let collapsed = Math.floor(deflection / pitch);
    collapsed = Math.min(collapsed, activeCoils - 1);

    const activeCoilsRemaining = activeCoils - collapsed;

    // Effective diameters for remaining coils
    const collapseRatio = collapsed / activeCoils;
    const D1_eff = D1 - (D1 - D2) * collapseRatio;
    const D2_eff = D2;

    // Current stiffness
    const k = (G * Math.pow(wireDiameter, 4)) / 
              (2 * activeCoilsRemaining * (D1_eff + D2_eff) * (D1_eff * D1_eff + D2_eff * D2_eff));

    // Incremental load
    if (i > 0) {
      const deltaX = deflection - prevDeflection;
      cumulativeLoad += k * deltaX;
    }

    // Calculate stress at large end (maximum stress)
    const springIndex = D1_eff / wireDiameter;
    const wahlFactor = calculateWahlFactor(springIndex);
    const tauNominal = calculateNominalShearStress(cumulativeLoad, D1_eff, wireDiameter);
    const stress = wahlFactor * tauNominal;

    points.push({
      deflection: Number(deflection.toFixed(3)),
      force: Number(cumulativeLoad.toFixed(3)),
      stiffness: Number(k.toFixed(4)),
      stress: Number(stress.toFixed(2)),
      activeCoils: activeCoilsRemaining,
      collapsedCoils: collapsed,
    });

    prevDeflection = deflection;
  }

  return points;
}

/**
 * Generate force-deflection curve for any spring type
 * 生成任意类型弹簧的力-位移曲线
 */
export function generateForceCurve(
  geometry: SpringGeometry,
  maxDeflection: number,
  numPoints: number = 50
): ForceDeflectionPoint[] {
  switch (geometry.type) {
    case 'compression':
      return generateCompressionForceCurve(geometry, maxDeflection, numPoints);
    case 'extension':
      return generateExtensionForceCurve(geometry, maxDeflection, numPoints);
    case 'torsion':
      return generateTorsionForceCurve(geometry, maxDeflection, numPoints);
    case 'conical':
      return generateConicalForceCurve(geometry, maxDeflection, numPoints);
    default:
      throw new Error(`Unknown spring type: ${(geometry as SpringGeometry).type}`);
  }
}

/**
 * Interpolate force at a specific deflection from curve
 * 从曲线中插值特定位移处的力
 */
export function interpolateForceAtDeflection(
  curve: ForceDeflectionPoint[],
  targetDeflection: number
): ForceDeflectionPoint | null {
  if (curve.length === 0) return null;
  if (targetDeflection <= curve[0].deflection) return curve[0];
  if (targetDeflection >= curve[curve.length - 1].deflection) return curve[curve.length - 1];

  // Find surrounding points
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].deflection >= targetDeflection) {
      const p1 = curve[i - 1];
      const p2 = curve[i];
      const t = (targetDeflection - p1.deflection) / (p2.deflection - p1.deflection);

      return {
        deflection: targetDeflection,
        force: p1.force + t * (p2.force - p1.force),
        stiffness: p1.stiffness + t * (p2.stiffness - p1.stiffness),
        stress: p1.stress !== undefined && p2.stress !== undefined
          ? p1.stress + t * (p2.stress - p1.stress)
          : undefined,
        activeCoils: p2.activeCoils,
        collapsedCoils: p2.collapsedCoils,
      };
    }
  }

  return null;
}
