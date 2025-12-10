/**
 * Torsion Spring Advanced Analysis Engine
 * 扭簧高级分析引擎
 * 
 * Provides engineering calculations specific to torsion springs:
 * - Mass calculation (including legs)
 * - Natural frequency
 * - Stress distribution
 * - Fatigue analysis
 * - Dynamic analysis
 */

import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';

// ============================================================================
// Types
// ============================================================================

export interface TorsionSpringParams {
  /** Wire diameter d (mm) */
  wireDiameter: number;
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Active coils Na */
  activeCoils: number;
  /** Body length Lb (mm) */
  bodyLength: number;
  /** Leg 1 length (mm) */
  legLength1: number;
  /** Leg 2 length (mm) */
  legLength2: number;
  /** Free angle between legs (degrees) */
  freeAngle: number;
  /** Working angle (degrees) */
  workingAngle: number;
  /** Material ID */
  materialId: SpringMaterialId;
}

export interface TorsionMassResult {
  /** Total spring mass (g) */
  totalMass: number;
  /** Coil body mass (g) */
  bodyMass: number;
  /** Leg 1 mass (g) */
  leg1Mass: number;
  /** Leg 2 mass (g) */
  leg2Mass: number;
  /** Total wire length (mm) */
  totalWireLength: number;
}

export interface TorsionFrequencyResult {
  /** Natural frequency (Hz) */
  naturalFrequency: number;
  /** Angular natural frequency (rad/s) */
  angularFrequency: number;
  /** Moment of inertia (kg·mm²) */
  momentOfInertia: number;
  /** Torsional stiffness (N·mm/rad) */
  torsionalStiffness: number;
  /** Shock wave velocity (m/s) */
  shockWaveVelocity: number;
}

export interface TorsionStressPoint {
  /** Angular position (degrees) */
  theta: number;
  /** Coil number (0-based, fractional) */
  coilNumber: number;
  /** Bending stress at this point (MPa) */
  bendingStress: number;
  /** Stress ratio (stress / allowable) */
  stressRatio: number;
  /** Is this a hotspot? */
  isHotspot: boolean;
}

export interface TorsionStressDistribution {
  /** Stress points along the spring */
  points: TorsionStressPoint[];
  /** Maximum stress (MPa) */
  maxStress: number;
  /** Average stress (MPa) */
  avgStress: number;
  /** Minimum stress (MPa) */
  minStress: number;
  /** Number of critical regions (>90% of allowable) */
  criticalRegions: number;
  /** Number of hotspots */
  hotspotCount: number;
  /** Stress correction factor Ki */
  stressCorrectionFactor: number;
}

export interface TorsionDynamicResult {
  /** Temperature effect on modulus (%) */
  temperatureEffect: number;
  /** Creep factor */
  creepFactor: number;
  /** Environmental rating */
  environmentalRating: 'PASS' | 'CAUTION' | 'FAIL';
  /** Risk level */
  riskLevel: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK';
}

export interface TorsionFatigueResult {
  /** Estimated fatigue life (cycles) */
  estimatedLife: number;
  /** Safety factor */
  safetyFactor: number;
  /** Safety factor percentage */
  safetyFactorPercent: number;
  /** Mean stress (MPa) */
  meanStress: number;
  /** Alternating stress (MPa) */
  alternatingStress: number;
  /** Is within safe limits */
  isValid: boolean;
}

export interface TorsionAdvancedAnalysisResult {
  mass: TorsionMassResult;
  frequency: TorsionFrequencyResult;
  stressDistribution: TorsionStressDistribution;
  dynamic: TorsionDynamicResult;
  fatigue: TorsionFatigueResult;
  /** Overall pass/fail status */
  overallStatus: 'PASS' | 'CAUTION' | 'FAIL';
}

// ============================================================================
// Mass Calculation
// ============================================================================

/**
 * Calculate torsion spring mass including legs
 * 计算扭簧质量（包括腿）
 */
export function calculateTorsionMass(params: TorsionSpringParams): TorsionMassResult {
  const { wireDiameter, meanDiameter, activeCoils, legLength1, legLength2, materialId } = params;
  
  const material = getSpringMaterial(materialId);
  const density = material?.density || 7850; // kg/m³
  
  // Wire cross-section area (mm²)
  const wireArea = Math.PI * Math.pow(wireDiameter / 2, 2);
  
  // Coil body wire length (mm)
  // L_coil = π × Dm × Na
  const coilWireLength = Math.PI * meanDiameter * activeCoils;
  
  // Total wire length including legs
  const totalWireLength = coilWireLength + legLength1 + legLength2;
  
  // Volume (mm³)
  const coilVolume = wireArea * coilWireLength;
  const leg1Volume = wireArea * legLength1;
  const leg2Volume = wireArea * legLength2;
  const totalVolume = wireArea * totalWireLength;
  
  // Mass (g) - density is kg/m³, volume is mm³
  // 1 kg/m³ = 1e-9 kg/mm³ = 1e-6 g/mm³
  const densityGPerMm3 = density * 1e-6;
  
  return {
    totalMass: totalVolume * densityGPerMm3,
    bodyMass: coilVolume * densityGPerMm3,
    leg1Mass: leg1Volume * densityGPerMm3,
    leg2Mass: leg2Volume * densityGPerMm3,
    totalWireLength,
  };
}

// ============================================================================
// Natural Frequency Calculation
// ============================================================================

/**
 * Calculate torsion spring natural frequency
 * 计算扭簧固有频率
 * 
 * For torsion springs:
 * fn = (1/2π) × √(k_θ / J)
 * 
 * where:
 * k_θ = torsional stiffness (N·mm/rad)
 * J = moment of inertia of the rotating mass
 */
export function calculateTorsionFrequency(params: TorsionSpringParams): TorsionFrequencyResult {
  const { wireDiameter, meanDiameter, activeCoils, legLength1, legLength2, materialId } = params;
  
  const material = getSpringMaterial(materialId);
  const E = material?.elasticModulus || 206000; // MPa (N/mm²)
  const G = material?.shearModulus || 79300; // MPa
  const density = material?.density || 7850; // kg/m³
  
  // Spring rate (N·mm/rad) - 标准公式
  // k_rad = E × d⁴ / (10.8 × Dm × Na)
  // 来源: SMI Handbook, DIN EN 13906-3
  const springRatePerRad = (E * Math.pow(wireDiameter, 4)) / (10.8 * meanDiameter * activeCoils);
  
  // Calculate moment of inertia of the legs (simplified as rods rotating about one end)
  // J = (1/3) × m × L² for a rod rotating about one end
  const wireArea = Math.PI * Math.pow(wireDiameter / 2, 2); // mm²
  const densityKgPerMm3 = density * 1e-9;
  
  const leg1Mass = wireArea * legLength1 * densityKgPerMm3; // kg
  const leg2Mass = wireArea * legLength2 * densityKgPerMm3; // kg
  
  // Moment of inertia (kg·mm²)
  const J1 = (1/3) * leg1Mass * Math.pow(legLength1, 2);
  const J2 = (1/3) * leg2Mass * Math.pow(legLength2, 2);
  const totalJ = J1 + J2;
  
  // Natural frequency
  // ω = √(k/J), f = ω/(2π)
  const angularFrequency = Math.sqrt(springRatePerRad / (totalJ > 0 ? totalJ : 1e-6));
  const naturalFrequency = angularFrequency / (2 * Math.PI);
  
  // Shock wave velocity in wire
  // v = √(G/ρ)
  const shockWaveVelocity = Math.sqrt((G * 1e6) / density); // m/s
  
  return {
    naturalFrequency,
    angularFrequency,
    momentOfInertia: totalJ * 1e6, // Convert to kg·mm²
    torsionalStiffness: springRatePerRad,
    shockWaveVelocity,
  };
}

// ============================================================================
// Stress Distribution Calculation
// ============================================================================

/**
 * Calculate stress distribution along torsion spring
 * 计算扭簧应力分布
 */
export function calculateTorsionStressDistribution(
  params: TorsionSpringParams,
  torque: number // N·mm
): TorsionStressDistribution {
  const { wireDiameter, meanDiameter, activeCoils, materialId } = params;
  
  const material = getSpringMaterial(materialId);
  const allowableStress = material?.tensileStrength ? material.tensileStrength * 0.7 : 1200; // MPa
  
  // Spring index
  const C = meanDiameter / wireDiameter;
  
  // Stress correction factor for inner fiber (Wahl factor for bending)
  // Ki = (4C² - C - 1) / (4C(C - 1))
  const Ki = (4 * C * C - C - 1) / (4 * C * (C - 1));
  
  // Base bending stress
  // σ = 32 × M / (π × d³)
  const baseBendingStress = (32 * torque) / (Math.PI * Math.pow(wireDiameter, 3));
  
  // Corrected stress
  const correctedStress = baseBendingStress * Ki;
  
  // Generate stress points along the spring
  const numPoints = Math.ceil(activeCoils * 36); // 36 points per coil (every 10°)
  const points: TorsionStressPoint[] = [];
  
  let maxStress = 0;
  let minStress = Infinity;
  let totalStress = 0;
  let criticalCount = 0;
  let hotspotCount = 0;
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const theta = t * 360 * activeCoils;
    const coilNumber = t * activeCoils;
    
    // Stress varies slightly along the coil due to friction and contact
    // Simplified model: stress is highest at the inner diameter
    // Add small variation based on position
    const positionFactor = 1 + 0.02 * Math.sin(theta * Math.PI / 180);
    const stress = correctedStress * positionFactor;
    
    const stressRatio = stress / allowableStress;
    const isHotspot = stressRatio > 0.9;
    
    if (isHotspot) hotspotCount++;
    if (stressRatio > 0.9) criticalCount++;
    
    maxStress = Math.max(maxStress, stress);
    minStress = Math.min(minStress, stress);
    totalStress += stress;
    
    points.push({
      theta: theta % 360,
      coilNumber,
      bendingStress: stress,
      stressRatio,
      isHotspot,
    });
  }
  
  return {
    points,
    maxStress,
    avgStress: totalStress / points.length,
    minStress,
    criticalRegions: criticalCount,
    hotspotCount,
    stressCorrectionFactor: Ki,
  };
}

// ============================================================================
// Dynamic Analysis
// ============================================================================

/**
 * Perform dynamic analysis for torsion spring
 * 扭簧动力学分析
 */
export function analyzeTorsionDynamics(
  params: TorsionSpringParams,
  operatingTemperature: number = 20 // °C
): TorsionDynamicResult {
  const { materialId } = params;
  
  const material = getSpringMaterial(materialId);
  
  // Temperature effect on elastic modulus
  // Approximately -0.03% per °C above 20°C
  const tempDiff = operatingTemperature - 20;
  const temperatureEffect = tempDiff * 0.03;
  
  // Creep factor (simplified)
  // Higher temperature = more creep
  const creepFactor = 1 + Math.max(0, tempDiff) * 0.001;
  
  // Environmental rating
  let environmentalRating: 'PASS' | 'CAUTION' | 'FAIL' = 'PASS';
  if (operatingTemperature > 150) {
    environmentalRating = 'FAIL';
  } else if (operatingTemperature > 100) {
    environmentalRating = 'CAUTION';
  }
  
  // Risk level based on material and temperature
  let riskLevel: 'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK' = 'LOW RISK';
  if (environmentalRating === 'FAIL') {
    riskLevel = 'HIGH RISK';
  } else if (environmentalRating === 'CAUTION') {
    riskLevel = 'MEDIUM RISK';
  }
  
  return {
    temperatureEffect,
    creepFactor,
    environmentalRating,
    riskLevel,
  };
}

// ============================================================================
// Fatigue Analysis
// ============================================================================

/**
 * Calculate fatigue life for torsion spring
 * 扭簧疲劳寿命计算
 */
export function calculateTorsionFatigue(
  params: TorsionSpringParams,
  installTorque: number, // N·mm at install angle
  workingTorque: number  // N·mm at working angle
): TorsionFatigueResult {
  const { wireDiameter, meanDiameter, materialId } = params;
  
  const material = getSpringMaterial(materialId);
  const tensileStrength = material?.tensileStrength || 1700; // MPa
  const allowableStress = tensileStrength * 0.7;
  
  // Spring index
  const C = meanDiameter / wireDiameter;
  const Ki = (4 * C * C - C - 1) / (4 * C * (C - 1));
  
  // Calculate stresses
  const stressAtInstall = (32 * installTorque * Ki) / (Math.PI * Math.pow(wireDiameter, 3));
  const stressAtWorking = (32 * workingTorque * Ki) / (Math.PI * Math.pow(wireDiameter, 3));
  
  // Mean and alternating stress
  const meanStress = (stressAtInstall + stressAtWorking) / 2;
  const alternatingStress = Math.abs(stressAtWorking - stressAtInstall) / 2;
  
  // Goodman diagram approach for fatigue
  // Se = endurance limit ≈ 0.5 × tensile strength for steel
  const enduranceLimit = tensileStrength * 0.5;
  
  // Modified Goodman equation
  // σa/Se + σm/Su = 1/SF
  // SF = 1 / (σa/Se + σm/Su)
  const safetyFactor = 1 / ((alternatingStress / enduranceLimit) + (meanStress / tensileStrength));
  
  // Estimate fatigue life using S-N curve approximation
  // N = (Se/σa)^b where b ≈ 6-10 for steel
  const b = 8;
  let estimatedLife: number;
  
  if (alternatingStress < enduranceLimit * 0.5) {
    estimatedLife = 1e9; // Infinite life
  } else {
    estimatedLife = Math.pow(enduranceLimit / alternatingStress, b) * 1e6;
  }
  
  // Cap at 1e9
  estimatedLife = Math.min(estimatedLife, 1e9);
  
  return {
    estimatedLife,
    safetyFactor,
    safetyFactorPercent: safetyFactor * 100,
    meanStress,
    alternatingStress,
    isValid: safetyFactor >= 1.0,
  };
}

// ============================================================================
// Complete Advanced Analysis
// ============================================================================

/**
 * Run complete advanced analysis for torsion spring
 * 运行扭簧完整高级分析
 */
export function runTorsionAdvancedAnalysis(
  params: TorsionSpringParams,
  operatingTemperature: number = 20
): TorsionAdvancedAnalysisResult {
  const { wireDiameter, meanDiameter, activeCoils, freeAngle, workingAngle, materialId } = params;
  
  const material = getSpringMaterial(materialId);
  const E = material?.elasticModulus || 206000;
  
  // Calculate spring rate
  const springRate = (E * Math.pow(wireDiameter, 4)) / (64 * meanDiameter * activeCoils);
  
  // Calculate torques
  const installAngle = freeAngle > 0 ? freeAngle * 0.1 : 10; // 10% of free angle as install
  const installTorque = springRate * installAngle;
  const workingTorque = springRate * workingAngle;
  
  // Run all analyses
  const mass = calculateTorsionMass(params);
  const frequency = calculateTorsionFrequency(params);
  const stressDistribution = calculateTorsionStressDistribution(params, workingTorque);
  const dynamic = analyzeTorsionDynamics(params, operatingTemperature);
  const fatigue = calculateTorsionFatigue(params, installTorque, workingTorque);
  
  // Determine overall status
  let overallStatus: 'PASS' | 'CAUTION' | 'FAIL' = 'PASS';
  
  if (!fatigue.isValid || dynamic.environmentalRating === 'FAIL') {
    overallStatus = 'FAIL';
  } else if (fatigue.safetyFactor < 1.5 || dynamic.environmentalRating === 'CAUTION') {
    overallStatus = 'CAUTION';
  }
  
  return {
    mass,
    frequency,
    stressDistribution,
    dynamic,
    fatigue,
    overallStatus,
  };
}
