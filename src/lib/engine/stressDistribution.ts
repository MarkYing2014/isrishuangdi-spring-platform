/**
 * Spring Analysis Engine - Stress Distribution Model
 * 弹簧分析引擎 - 应力分布模型
 * 
 * Computes local stress at multiple sample points along coil profile
 * for stress color mapping visualization
 */

import type { SpringGeometry, CompressionSpringGeometry, ConicalSpringGeometry, TorsionSpringGeometry, ExtensionSpringGeometry } from './types';
import { calculateWahlFactor } from './stress';

const PI = Math.PI;

/**
 * Stress sample point
 */
export interface StressSamplePoint {
  /** Angular position θ (radians) */
  theta: number;
  /** Coil number (0-indexed) */
  coilNumber: number;
  /** Local mean diameter at this point (mm) */
  localDiameter: number;
  /** Local wire diameter (mm) - usually constant */
  localWireDiameter: number;
  /** Local stress (MPa) */
  localStress: number;
  /** Normalized stress (0-1) */
  normalizedStress: number;
  /** Stress color category */
  colorCategory: 'blue' | 'green' | 'yellow' | 'red';
  /** RGB color values */
  color: [number, number, number];
  /** 3D position (x, y, z) */
  position: [number, number, number];
}

/**
 * Stress distribution result
 */
export interface StressDistributionResult {
  /** All sample points */
  points: StressSamplePoint[];
  /** Maximum local stress (MPa) */
  maxStress: number;
  /** Minimum local stress (MPa) */
  minStress: number;
  /** Average stress (MPa) */
  avgStress: number;
  /** Critical zone points (normalized > 0.9) */
  criticalZoneCount: number;
  /** Hot spot locations */
  hotSpots: Array<{
    theta: number;
    coilNumber: number;
    stress: number;
    position: [number, number, number];
  }>;
}

/**
 * Color mapping thresholds
 */
export const STRESS_COLOR_THRESHOLDS = {
  BLUE_MAX: 0.4,
  GREEN_MAX: 0.7,
  YELLOW_MAX: 0.9,
  // Above 0.9 is RED
};

/**
 * Get color for normalized stress value
 */
export function getStressColor(normalizedStress: number): {
  category: 'blue' | 'green' | 'yellow' | 'red';
  rgb: [number, number, number];
} {
  if (normalizedStress < STRESS_COLOR_THRESHOLDS.BLUE_MAX) {
    // Blue: low stress
    const t = normalizedStress / STRESS_COLOR_THRESHOLDS.BLUE_MAX;
    return {
      category: 'blue',
      rgb: [0, t * 0.5, 1 - t * 0.3],
    };
  } else if (normalizedStress < STRESS_COLOR_THRESHOLDS.GREEN_MAX) {
    // Green: moderate stress
    const t = (normalizedStress - STRESS_COLOR_THRESHOLDS.BLUE_MAX) / 
              (STRESS_COLOR_THRESHOLDS.GREEN_MAX - STRESS_COLOR_THRESHOLDS.BLUE_MAX);
    return {
      category: 'green',
      rgb: [t * 0.5, 0.8 - t * 0.2, 0.3 - t * 0.3],
    };
  } else if (normalizedStress < STRESS_COLOR_THRESHOLDS.YELLOW_MAX) {
    // Yellow: elevated stress
    const t = (normalizedStress - STRESS_COLOR_THRESHOLDS.GREEN_MAX) / 
              (STRESS_COLOR_THRESHOLDS.YELLOW_MAX - STRESS_COLOR_THRESHOLDS.GREEN_MAX);
    return {
      category: 'yellow',
      rgb: [0.9 + t * 0.1, 0.8 - t * 0.4, 0],
    };
  } else {
    // Red: critical stress
    const t = Math.min(1, (normalizedStress - STRESS_COLOR_THRESHOLDS.YELLOW_MAX) / 
              (1 - STRESS_COLOR_THRESHOLDS.YELLOW_MAX));
    return {
      category: 'red',
      rgb: [1, 0.4 - t * 0.4, 0],
    };
  }
}

/**
 * Calculate local stress for compression/extension spring
 * τ(θ) = K(θ) × (8 × F × D(θ)) / (π × d³)
 */
export function calculateLocalShearStress(
  force: number,
  localDiameter: number,
  wireDiameter: number
): number {
  const C = localDiameter / wireDiameter;
  const K = calculateWahlFactor(C);
  return K * (8 * force * localDiameter) / (PI * Math.pow(wireDiameter, 3));
}

/**
 * Calculate local bending stress for torsion spring
 * σ(θ) = (32 × M × D(θ)) / (π × d³)
 */
export function calculateLocalBendingStress(
  moment: number,
  localDiameter: number,
  wireDiameter: number
): number {
  const C = localDiameter / wireDiameter;
  // Bending stress correction factor
  const Ki = (4 * C * C - C - 1) / (4 * C * (C - 1));
  return Ki * (32 * moment) / (PI * Math.pow(wireDiameter, 3));
}

/**
 * Calculate stress distribution for compression spring
 */
export function calculateCompressionStressDistribution(
  geometry: CompressionSpringGeometry,
  force: number,
  deflection: number,
  pointsPerCoil: number = 50
): StressDistributionResult {
  const { wireDiameter, meanDiameter, activeCoils, freeLength } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  const deadCoils = totalCoils - activeCoils;
  const deadCoilsBottom = deadCoils / 2;
  const deadCoilsTop = deadCoils / 2;
  
  const totalPoints = Math.max(200, totalCoils * pointsPerCoil);
  const points: StressSamplePoint[] = [];
  
  // Calculate solid height and current length
  const solidHeight = totalCoils * wireDiameter;
  const currentLength = freeLength - deflection;
  const scale = 1;
  
  // First pass: calculate all local stresses to find max
  const stressValues: number[] = [];
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    const coilNumber = theta / (2 * PI);
    
    // Determine if in active or dead coil region
    const isDeadCoil = coilNumber < deadCoilsBottom || coilNumber > (totalCoils - deadCoilsTop);
    
    // Local diameter is constant for cylindrical spring
    const localDiameter = meanDiameter;
    
    // Calculate local stress (dead coils have reduced stress)
    let localStress: number;
    if (isDeadCoil) {
      // Dead coils carry less stress
      localStress = calculateLocalShearStress(force * 0.3, localDiameter, wireDiameter);
    } else {
      localStress = calculateLocalShearStress(force, localDiameter, wireDiameter);
    }
    
    stressValues.push(localStress);
  }
  
  // Find max stress for normalization
  const maxStress = Math.max(...stressValues);
  const minStress = Math.min(...stressValues);
  const avgStress = stressValues.reduce((a, b) => a + b, 0) / stressValues.length;
  
  // Second pass: create sample points with normalized values
  const hotSpots: StressDistributionResult['hotSpots'] = [];
  let criticalZoneCount = 0;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    const coilNumber = theta / (2 * PI);
    
    const localStress = stressValues[i];
    const normalizedStress = maxStress > 0 ? localStress / maxStress : 0;
    
    // Get color
    const { category, rgb } = getStressColor(normalizedStress);
    
    // Calculate 3D position
    const R = (meanDiameter / 2) * scale;
    const x = R * Math.cos(theta);
    const y = R * Math.sin(theta);
    
    // Z position based on pitch and deflection
    const pitch = (currentLength - deadCoils * wireDiameter) / activeCoils;
    const deadHeight = deadCoils * wireDiameter;
    let z: number;
    
    if (coilNumber < deadCoilsBottom) {
      z = coilNumber * wireDiameter;
    } else if (coilNumber > totalCoils - deadCoilsTop) {
      z = deadHeight + activeCoils * pitch + (coilNumber - totalCoils + deadCoilsTop) * wireDiameter;
    } else {
      z = deadCoilsBottom * wireDiameter + (coilNumber - deadCoilsBottom) * pitch;
    }
    
    z *= scale;
    
    const point: StressSamplePoint = {
      theta,
      coilNumber,
      localDiameter: meanDiameter,
      localWireDiameter: wireDiameter,
      localStress,
      normalizedStress,
      colorCategory: category,
      color: rgb,
      position: [x, y, z],
    };
    
    points.push(point);
    
    // Track critical zones and hot spots
    if (normalizedStress > 0.9) {
      criticalZoneCount++;
      if (normalizedStress > 0.95) {
        hotSpots.push({
          theta,
          coilNumber,
          stress: localStress,
          position: [x, y, z],
        });
      }
    }
  }
  
  return {
    points,
    maxStress,
    minStress,
    avgStress,
    criticalZoneCount,
    hotSpots,
  };
}

/**
 * Calculate stress distribution for conical spring
 * D varies with θ
 */
export function calculateConicalStressDistribution(
  geometry: ConicalSpringGeometry,
  force: number,
  deflection: number,
  pointsPerCoil: number = 50
): StressDistributionResult {
  const { wireDiameter, largeOuterDiameter, smallOuterDiameter, activeCoils, freeLength } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  
  const largeMeanDiameter = largeOuterDiameter - wireDiameter;
  const smallMeanDiameter = smallOuterDiameter - wireDiameter;
  
  const totalPoints = Math.max(200, totalCoils * pointsPerCoil);
  const points: StressSamplePoint[] = [];
  const stressValues: number[] = [];
  
  // First pass: calculate stresses
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    const coilNumber = theta / (2 * PI);
    
    // Linear interpolation of diameter along coil
    const coilProgress = coilNumber / totalCoils;
    const localDiameter = largeMeanDiameter - (largeMeanDiameter - smallMeanDiameter) * coilProgress;
    
    // Calculate local stress
    const localStress = calculateLocalShearStress(force, localDiameter, wireDiameter);
    stressValues.push(localStress);
  }
  
  const maxStress = Math.max(...stressValues);
  const minStress = Math.min(...stressValues);
  const avgStress = stressValues.reduce((a, b) => a + b, 0) / stressValues.length;
  
  // Second pass: create points
  const hotSpots: StressDistributionResult['hotSpots'] = [];
  let criticalZoneCount = 0;
  const currentLength = freeLength - deflection;
  const scale = 1;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    const coilNumber = theta / (2 * PI);
    const coilProgress = coilNumber / totalCoils;
    
    const localDiameter = largeMeanDiameter - (largeMeanDiameter - smallMeanDiameter) * coilProgress;
    const localStress = stressValues[i];
    const normalizedStress = maxStress > 0 ? localStress / maxStress : 0;
    
    const { category, rgb } = getStressColor(normalizedStress);
    
    // 3D position for conical spring
    const R = (localDiameter / 2) * scale;
    const x = R * Math.cos(theta);
    const y = R * Math.sin(theta);
    const z = (currentLength * coilProgress) * scale;
    
    points.push({
      theta,
      coilNumber,
      localDiameter,
      localWireDiameter: wireDiameter,
      localStress,
      normalizedStress,
      colorCategory: category,
      color: rgb,
      position: [x, y, z],
    });
    
    if (normalizedStress > 0.9) {
      criticalZoneCount++;
      if (normalizedStress > 0.95) {
        hotSpots.push({ theta, coilNumber, stress: localStress, position: [x, y, z] });
      }
    }
  }
  
  return { points, maxStress, minStress, avgStress, criticalZoneCount, hotSpots };
}

/**
 * Calculate stress distribution for torsion spring
 */
export function calculateTorsionStressDistribution(
  geometry: TorsionSpringGeometry,
  moment: number,
  angularDeflection: number,
  pointsPerCoil: number = 50
): StressDistributionResult {
  const { wireDiameter, meanDiameter, activeCoils, bodyLength } = geometry;
  const totalCoils = activeCoils;
  
  const totalPoints = Math.max(200, totalCoils * pointsPerCoil);
  const points: StressSamplePoint[] = [];
  const stressValues: number[] = [];
  
  // First pass
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    
    const localStress = calculateLocalBendingStress(moment, meanDiameter, wireDiameter);
    stressValues.push(localStress);
  }
  
  const maxStress = Math.max(...stressValues);
  const minStress = Math.min(...stressValues);
  const avgStress = stressValues.reduce((a, b) => a + b, 0) / stressValues.length;
  
  // Second pass
  const hotSpots: StressDistributionResult['hotSpots'] = [];
  let criticalZoneCount = 0;
  const scale = 1;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    const coilNumber = theta / (2 * PI);
    
    const localStress = stressValues[i];
    const normalizedStress = maxStress > 0 ? localStress / maxStress : 0;
    const { category, rgb } = getStressColor(normalizedStress);
    
    const R = (meanDiameter / 2) * scale;
    const x = R * Math.cos(theta);
    const y = R * Math.sin(theta);
    const z = (bodyLength * t) * scale;
    
    points.push({
      theta,
      coilNumber,
      localDiameter: meanDiameter,
      localWireDiameter: wireDiameter,
      localStress,
      normalizedStress,
      colorCategory: category,
      color: rgb,
      position: [x, y, z],
    });
    
    if (normalizedStress > 0.9) {
      criticalZoneCount++;
      if (normalizedStress > 0.95) {
        hotSpots.push({ theta, coilNumber, stress: localStress, position: [x, y, z] });
      }
    }
  }
  
  return { points, maxStress, minStress, avgStress, criticalZoneCount, hotSpots };
}

/**
 * Calculate stress distribution for extension spring
 */
export function calculateExtensionStressDistribution(
  geometry: ExtensionSpringGeometry,
  force: number,
  deflection: number,
  pointsPerCoil: number = 50
): StressDistributionResult {
  const { wireDiameter, meanDiameter, activeCoils, bodyLength } = geometry;
  const totalCoils = activeCoils;
  
  const totalPoints = Math.max(200, totalCoils * pointsPerCoil);
  const points: StressSamplePoint[] = [];
  const stressValues: number[] = [];
  
  // First pass
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    const coilNumber = theta / (2 * PI);
    
    // Hook regions have higher stress concentration
    const isNearHook = coilNumber < 0.5 || coilNumber > totalCoils - 0.5;
    const stressMultiplier = isNearHook ? 1.3 : 1.0;
    
    const localStress = calculateLocalShearStress(force, meanDiameter, wireDiameter) * stressMultiplier;
    stressValues.push(localStress);
  }
  
  const maxStress = Math.max(...stressValues);
  const minStress = Math.min(...stressValues);
  const avgStress = stressValues.reduce((a, b) => a + b, 0) / stressValues.length;
  
  // Second pass
  const hotSpots: StressDistributionResult['hotSpots'] = [];
  let criticalZoneCount = 0;
  const scale = 1;
  const currentLength = bodyLength + deflection;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i / totalPoints;
    const theta = t * 2 * PI * totalCoils;
    const coilNumber = theta / (2 * PI);
    
    const localStress = stressValues[i];
    const normalizedStress = maxStress > 0 ? localStress / maxStress : 0;
    const { category, rgb } = getStressColor(normalizedStress);
    
    const R = (meanDiameter / 2) * scale;
    const x = R * Math.cos(theta);
    const y = R * Math.sin(theta);
    const z = (currentLength * t) * scale;
    
    points.push({
      theta,
      coilNumber,
      localDiameter: meanDiameter,
      localWireDiameter: wireDiameter,
      localStress,
      normalizedStress,
      colorCategory: category,
      color: rgb,
      position: [x, y, z],
    });
    
    if (normalizedStress > 0.9) {
      criticalZoneCount++;
      if (normalizedStress > 0.95) {
        hotSpots.push({ theta, coilNumber, stress: localStress, position: [x, y, z] });
      }
    }
  }
  
  return { points, maxStress, minStress, avgStress, criticalZoneCount, hotSpots };
}

/**
 * Calculate stress distribution for any spring type
 */
export function calculateStressDistribution(
  geometry: SpringGeometry,
  force: number,
  deflection: number,
  pointsPerCoil: number = 50
): StressDistributionResult {
  switch (geometry.type) {
    case 'compression':
      return calculateCompressionStressDistribution(
        geometry as CompressionSpringGeometry,
        force,
        deflection,
        pointsPerCoil
      );
    case 'conical':
      return calculateConicalStressDistribution(
        geometry as ConicalSpringGeometry,
        force,
        deflection,
        pointsPerCoil
      );
    case 'torsion':
      return calculateTorsionStressDistribution(
        geometry as TorsionSpringGeometry,
        force, // This is actually moment for torsion
        deflection, // This is angular deflection
        pointsPerCoil
      );
    case 'extension':
      return calculateExtensionStressDistribution(
        geometry as ExtensionSpringGeometry,
        force,
        deflection,
        pointsPerCoil
      );
    default:
      throw new Error(`Unknown spring type: ${(geometry as SpringGeometry).type}`);
  }
}

/**
 * Generate vertex colors array for Three.js geometry
 */
export function generateVertexColors(
  stressDistribution: StressDistributionResult
): Float32Array {
  const colors = new Float32Array(stressDistribution.points.length * 3);
  
  for (let i = 0; i < stressDistribution.points.length; i++) {
    const point = stressDistribution.points[i];
    colors[i * 3] = point.color[0];
    colors[i * 3 + 1] = point.color[1];
    colors[i * 3 + 2] = point.color[2];
  }
  
  return colors;
}
