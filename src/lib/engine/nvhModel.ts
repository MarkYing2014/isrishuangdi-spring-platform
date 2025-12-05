/**
 * Spring Analysis Engine - NVH (Noise, Vibration, Harshness) Model
 * 弹簧分析引擎 - NVH（噪声、振动、粗糙度）模型
 * 
 * Predicts acoustic energy and noise risk from coil contact
 */

import type { SpringGeometry, CompressionSpringGeometry } from './types';

/**
 * NVH analysis result
 */
export interface NVHResult {
  /** Estimated acoustic energy index */
  acousticEnergyIndex: number;
  /** Estimated noise level (dB) */
  estimatedNoiseLevel: number;
  /** Friction noise component */
  frictionNoiseIndex: number;
  /** Impact noise component */
  impactNoiseIndex: number;
  /** Harmonic squeal risk */
  harmonicSquealRisk: 'low' | 'medium' | 'high';
  /** Coil contact frequency */
  coilContactFrequency: number;
  /** Natural frequency (Hz) */
  naturalFrequency: number;
  /** Risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Recommendations */
  recommendations: string[];
  /** Message */
  message: { en: string; zh: string };
}

/**
 * Coil contact analysis
 */
export interface CoilContactAnalysis {
  /** Is coil contact occurring */
  hasCoilContact: boolean;
  /** Number of coils in contact */
  contactingCoils: number;
  /** Contact force (N) */
  contactForce: number;
  /** Contact pressure (MPa) */
  contactPressure: number;
  /** Friction energy per cycle */
  frictionEnergyPerCycle: number;
}

/**
 * Calculate coil gap at given deflection
 */
export function calculateCoilGap(
  freeLength: number,
  solidHeight: number,
  activeCoils: number,
  deflection: number
): number {
  const currentLength = freeLength - deflection;
  const availableSpace = currentLength - solidHeight;
  const gapPerCoil = availableSpace / activeCoils;
  return Math.max(0, gapPerCoil);
}

/**
 * Analyze coil contact
 */
export function analyzeCoilContact(
  geometry: CompressionSpringGeometry,
  deflection: number,
  springRate: number,
  frictionCoeff: number = 0.15
): CoilContactAnalysis {
  const { wireDiameter, activeCoils, freeLength } = geometry;
  const totalCoils = geometry.totalCoils ?? activeCoils + 2;
  const solidHeight = totalCoils * wireDiameter;
  
  const currentLength = freeLength - deflection;
  const coilGap = calculateCoilGap(freeLength, solidHeight, activeCoils, deflection);
  
  // Check if coils are contacting
  const hasCoilContact = coilGap <= wireDiameter * 0.1;
  
  if (!hasCoilContact) {
    return {
      hasCoilContact: false,
      contactingCoils: 0,
      contactForce: 0,
      contactPressure: 0,
      frictionEnergyPerCycle: 0,
    };
  }
  
  // Calculate contacting coils
  const compressionRatio = deflection / (freeLength - solidHeight);
  const contactingCoils = Math.min(activeCoils, Math.floor(compressionRatio * activeCoils * 1.5));
  
  // Contact force
  const force = springRate * deflection;
  const contactForce = force * (contactingCoils / activeCoils);
  
  // Contact pressure (Hertzian approximation)
  const contactWidth = wireDiameter * 0.1;
  const contactLength = Math.PI * (geometry.meanDiameter ?? 20);
  const contactArea = contactWidth * contactLength * contactingCoils;
  const contactPressure = contactForce / contactArea;
  
  // Friction energy per cycle
  const slideDistance = coilGap * 0.5; // Approximate slide distance
  const frictionEnergyPerCycle = frictionCoeff * contactForce * slideDistance;
  
  return {
    hasCoilContact: true,
    contactingCoils,
    contactForce,
    contactPressure,
    frictionEnergyPerCycle,
  };
}

/**
 * Calculate NVH prediction
 * E_nvh ∝ µ * F_contact^2 * fn
 */
export function calculateNVH(
  geometry: SpringGeometry,
  deflection: number,
  springRate: number,
  naturalFrequency: number,
  operatingFrequency: number,
  frictionCoeff: number = 0.15
): NVHResult {
  // Only compression springs have coil contact NVH
  if (geometry.type !== 'compression') {
    return {
      acousticEnergyIndex: 0,
      estimatedNoiseLevel: 0,
      frictionNoiseIndex: 0,
      impactNoiseIndex: 0,
      harmonicSquealRisk: 'low',
      coilContactFrequency: 0,
      naturalFrequency,
      riskLevel: 'low',
      recommendations: [],
      message: {
        en: 'NVH analysis not applicable for this spring type',
        zh: 'NVH 分析不适用于此弹簧类型',
      },
    };
  }
  
  const compGeometry = geometry as CompressionSpringGeometry;
  const contactAnalysis = analyzeCoilContact(compGeometry, deflection, springRate, frictionCoeff);
  
  if (!contactAnalysis.hasCoilContact) {
    return {
      acousticEnergyIndex: 0,
      estimatedNoiseLevel: 20, // Ambient
      frictionNoiseIndex: 0,
      impactNoiseIndex: 0,
      harmonicSquealRisk: 'low',
      coilContactFrequency: 0,
      naturalFrequency,
      riskLevel: 'low',
      recommendations: [],
      message: {
        en: 'No coil contact detected. NVH risk is minimal.',
        zh: '未检测到线圈接触。NVH 风险最小。',
      },
    };
  }
  
  // Calculate acoustic energy index
  // E_nvh ∝ µ * F_contact^2 * fn
  const acousticEnergyIndex = frictionCoeff * 
    Math.pow(contactAnalysis.contactForce, 2) * 
    naturalFrequency / 1e6;
  
  // Friction noise component
  const frictionNoiseIndex = frictionCoeff * contactAnalysis.contactForce * 
    contactAnalysis.contactingCoils / 100;
  
  // Impact noise component (from coil clash)
  const impactNoiseIndex = contactAnalysis.contactForce * operatingFrequency / 1000;
  
  // Estimate noise level (dB) - empirical formula
  const baseNoise = 40; // dB ambient
  const estimatedNoiseLevel = baseNoise + 
    10 * Math.log10(1 + acousticEnergyIndex) +
    5 * Math.log10(1 + frictionNoiseIndex) +
    3 * Math.log10(1 + impactNoiseIndex);
  
  // Harmonic squeal risk
  const frequencyRatio = operatingFrequency / naturalFrequency;
  let harmonicSquealRisk: NVHResult['harmonicSquealRisk'] = 'low';
  if (Math.abs(frequencyRatio - 1) < 0.1 || Math.abs(frequencyRatio - 0.5) < 0.1) {
    harmonicSquealRisk = 'high';
  } else if (Math.abs(frequencyRatio - 1) < 0.2 || Math.abs(frequencyRatio - 0.5) < 0.2) {
    harmonicSquealRisk = 'medium';
  }
  
  // Coil contact frequency
  const coilContactFrequency = operatingFrequency * contactAnalysis.contactingCoils;
  
  // Determine overall risk level
  let riskLevel: NVHResult['riskLevel'];
  if (estimatedNoiseLevel > 80 || harmonicSquealRisk === 'high') {
    riskLevel = 'critical';
  } else if (estimatedNoiseLevel > 65 || harmonicSquealRisk === 'medium') {
    riskLevel = 'high';
  } else if (estimatedNoiseLevel > 50) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (riskLevel !== 'low') {
    if (contactAnalysis.contactingCoils > 2) {
      recommendations.push('Reduce maximum deflection to prevent coil contact');
    }
    if (frictionCoeff > 0.1) {
      recommendations.push('Apply low-friction coating (PTFE, phosphate)');
    }
    if (harmonicSquealRisk !== 'low') {
      recommendations.push('Modify operating frequency to avoid resonance');
    }
    recommendations.push('Consider increasing coil pitch');
    recommendations.push('Add damping element or guide rod');
  }
  
  // Generate message
  let message: { en: string; zh: string };
  if (riskLevel === 'critical') {
    message = {
      en: `CRITICAL NVH RISK: Estimated ${estimatedNoiseLevel.toFixed(0)} dB. ${contactAnalysis.contactingCoils} coils in contact.`,
      zh: `严重 NVH 风险：预估 ${estimatedNoiseLevel.toFixed(0)} dB。${contactAnalysis.contactingCoils} 圈接触。`,
    };
  } else if (riskLevel === 'high') {
    message = {
      en: `HIGH NVH RISK: Estimated ${estimatedNoiseLevel.toFixed(0)} dB. Consider design modifications.`,
      zh: `高 NVH 风险：预估 ${estimatedNoiseLevel.toFixed(0)} dB。考虑设计修改。`,
    };
  } else if (riskLevel === 'medium') {
    message = {
      en: `Moderate NVH: Estimated ${estimatedNoiseLevel.toFixed(0)} dB. Monitor in service.`,
      zh: `中等 NVH：预估 ${estimatedNoiseLevel.toFixed(0)} dB。服役中监控。`,
    };
  } else {
    message = {
      en: `Low NVH risk: Estimated ${estimatedNoiseLevel.toFixed(0)} dB.`,
      zh: `低 NVH 风险：预估 ${estimatedNoiseLevel.toFixed(0)} dB。`,
    };
  }
  
  return {
    acousticEnergyIndex,
    estimatedNoiseLevel,
    frictionNoiseIndex,
    impactNoiseIndex,
    harmonicSquealRisk,
    coilContactFrequency,
    naturalFrequency,
    riskLevel,
    recommendations,
    message,
  };
}

/**
 * Generate NVH vs deflection curve
 */
export function generateNVHCurve(
  geometry: SpringGeometry,
  springRate: number,
  naturalFrequency: number,
  operatingFrequency: number,
  maxDeflection: number,
  numPoints: number = 50
): Array<{
  deflection: number;
  noiseLevel: number;
  hasContact: boolean;
}> {
  const points: Array<{
    deflection: number;
    noiseLevel: number;
    hasContact: boolean;
  }> = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const deflection = (maxDeflection * i) / numPoints;
    const result = calculateNVH(geometry, deflection, springRate, naturalFrequency, operatingFrequency);
    
    points.push({
      deflection,
      noiseLevel: result.estimatedNoiseLevel,
      hasContact: result.acousticEnergyIndex > 0,
    });
  }
  
  return points;
}
