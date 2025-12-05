/**
 * Spring Analysis Engine - Dynamics Model
 * 弹簧分析引擎 - 动力学模块
 * 
 * Computes natural frequency, resonance detection, and dynamic stiffness
 */

import type { SpringGeometry, CompressionSpringGeometry, ConicalSpringGeometry } from './types';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

const PI = Math.PI;

/**
 * Dynamic analysis result
 */
export interface DynamicsResult {
  /** Wire length (mm) */
  wireLength: number;
  /** Spring mass (kg) */
  springMass: number;
  /** Natural frequency (Hz) */
  naturalFrequency: number;
  /** Critical damping ratio */
  dampingRatio: number;
  /** Resonance status */
  resonanceStatus: {
    isAtRisk: boolean;
    frequencyRatio: number;
    harmonicNumber?: number;
    message: { en: string; zh: string };
  };
  /** Surge wave velocity (m/s) */
  surgeWaveVelocity: number;
}

/**
 * Harmonic scan point
 */
export interface HarmonicScanPoint {
  frequency: number;
  frequencyRatio: number;
  amplitude: number;
  isResonance: boolean;
}

/**
 * Calculate wire length for helical spring
 * 计算螺旋弹簧的线材长度
 * 
 * L_wire = π × Dm × N_total
 */
export function calculateWireLength(
  meanDiameter: number,
  totalCoils: number
): number {
  return PI * meanDiameter * totalCoils;
}

/**
 * Calculate wire length for conical spring
 * 计算锥形弹簧的线材长度
 * 
 * Integration over varying diameter
 */
export function calculateConicalWireLength(
  largeOuterDiameter: number,
  smallOuterDiameter: number,
  wireDiameter: number,
  totalCoils: number
): number {
  const D1 = largeOuterDiameter - wireDiameter; // Large mean diameter
  const D2 = smallOuterDiameter - wireDiameter; // Small mean diameter
  
  // Average circumference method (simplified)
  const avgDiameter = (D1 + D2) / 2;
  return PI * avgDiameter * totalCoils;
}

/**
 * Calculate spring mass
 * 计算弹簧质量
 * 
 * m = ρ × (π × d²/4) × L_wire
 */
export function calculateSpringMass(
  wireDiameter: number,
  wireLength: number,
  density: number = 7850 // kg/m³ for steel
): number {
  // Convert mm to m
  const d_m = wireDiameter / 1000;
  const L_m = wireLength / 1000;
  
  // Cross-sectional area
  const A = (PI * d_m * d_m) / 4;
  
  // Mass in kg
  return density * A * L_m;
}

/**
 * Calculate natural frequency for axial vibration
 * 计算轴向振动的固有频率
 * 
 * fn = (1 / 2π) × √(k / m_eff)
 * 
 * For springs, effective mass ≈ m/3 (one end fixed)
 */
export function calculateNaturalFrequency(
  springRate: number, // N/mm
  springMass: number  // kg
): number {
  // Convert spring rate to N/m
  const k_Nm = springRate * 1000;
  
  // Effective mass (1/3 of spring mass for one end fixed)
  const m_eff = springMass / 3;
  
  if (m_eff <= 0) return Infinity;
  
  // Natural frequency in Hz
  return (1 / (2 * PI)) * Math.sqrt(k_Nm / m_eff);
}

/**
 * Calculate surge wave velocity
 * 计算冲击波速度
 * 
 * v = √(G / ρ)
 */
export function calculateSurgeWaveVelocity(
  shearModulus: number, // MPa
  density: number = 7850 // kg/m³
): number {
  // Convert MPa to Pa
  const G_Pa = shearModulus * 1e6;
  
  // Velocity in m/s
  return Math.sqrt(G_Pa / density);
}

/**
 * Check resonance risk
 * 检查共振风险
 * 
 * Risk if f_working within ±15% of fn or harmonics
 */
export function checkResonanceRisk(
  naturalFrequency: number,
  workingFrequency: number,
  tolerance: number = 0.15
): {
  isAtRisk: boolean;
  frequencyRatio: number;
  harmonicNumber?: number;
  message: { en: string; zh: string };
} {
  const ratio = workingFrequency / naturalFrequency;
  
  // Check fundamental and first 5 harmonics
  for (let n = 1; n <= 5; n++) {
    const harmonicRatio = ratio * n;
    if (Math.abs(harmonicRatio - 1) <= tolerance) {
      return {
        isAtRisk: true,
        frequencyRatio: ratio,
        harmonicNumber: n,
        message: {
          en: n === 1 
            ? `RESONANCE RISK: Operating frequency (${workingFrequency.toFixed(1)} Hz) is within ±${tolerance * 100}% of natural frequency (${naturalFrequency.toFixed(1)} Hz)`
            : `RESONANCE RISK: ${n}th harmonic of operating frequency near natural frequency`,
          zh: n === 1
            ? `共振风险：工作频率 (${workingFrequency.toFixed(1)} Hz) 在固有频率 (${naturalFrequency.toFixed(1)} Hz) 的 ±${tolerance * 100}% 范围内`
            : `共振风险：工作频率的第 ${n} 次谐波接近固有频率`,
        },
      };
    }
  }
  
  return {
    isAtRisk: false,
    frequencyRatio: ratio,
    message: {
      en: `Safe: Operating frequency ratio ${ratio.toFixed(2)} is outside resonance bands`,
      zh: `安全：工作频率比 ${ratio.toFixed(2)} 在共振带之外`,
    },
  };
}

/**
 * Generate harmonic scan data
 * 生成谐波扫描数据
 */
export function generateHarmonicScan(
  naturalFrequency: number,
  minFrequency: number,
  maxFrequency: number,
  numPoints: number = 100,
  dampingRatio: number = 0.05
): HarmonicScanPoint[] {
  const points: HarmonicScanPoint[] = [];
  const step = (maxFrequency - minFrequency) / numPoints;
  
  for (let i = 0; i <= numPoints; i++) {
    const f = minFrequency + i * step;
    const r = f / naturalFrequency; // Frequency ratio
    
    // Amplitude magnification factor (single DOF system)
    // H = 1 / √((1-r²)² + (2ζr)²)
    const denominator = Math.sqrt(
      Math.pow(1 - r * r, 2) + Math.pow(2 * dampingRatio * r, 2)
    );
    const amplitude = 1 / denominator;
    
    // Check if near resonance (r ≈ 1)
    const isResonance = Math.abs(r - 1) < 0.15;
    
    points.push({
      frequency: f,
      frequencyRatio: r,
      amplitude,
      isResonance,
    });
  }
  
  return points;
}

/**
 * Calculate complete dynamics analysis
 * 计算完整动力学分析
 */
export function calculateDynamics(
  geometry: SpringGeometry,
  springRate: number,
  workingFrequency?: number
): DynamicsResult {
  const material = getSpringMaterial(geometry.materialId);
  if (!material) {
    throw new Error(`Unknown material: ${geometry.materialId}`);
  }

  const density = material.density ?? 7850; // kg/m³
  const shearModulus = material.shearModulus;
  const totalCoils = 'totalCoils' in geometry 
    ? (geometry.totalCoils ?? geometry.activeCoils + 2)
    : geometry.activeCoils + 2;

  // Calculate wire length based on spring type
  let wireLength: number;
  const wireDiameter = geometry.wireDiameter;
  
  if (geometry.type === 'conical') {
    const conical = geometry as ConicalSpringGeometry;
    wireLength = calculateConicalWireLength(
      conical.largeOuterDiameter,
      conical.smallOuterDiameter,
      wireDiameter,
      totalCoils
    );
  } else {
    const meanDiameter = 'meanDiameter' in geometry 
      ? (geometry as CompressionSpringGeometry).meanDiameter 
      : wireDiameter * 8; // Default estimate
    wireLength = calculateWireLength(meanDiameter, totalCoils);
  }

  // Calculate mass
  const springMass = calculateSpringMass(geometry.wireDiameter, wireLength, density);

  // Calculate natural frequency
  const naturalFrequency = calculateNaturalFrequency(springRate, springMass);

  // Calculate surge wave velocity
  const surgeWaveVelocity = calculateSurgeWaveVelocity(shearModulus, density);

  // Default damping ratio for steel springs
  const dampingRatio = 0.05;

  // Check resonance if working frequency provided
  let resonanceStatus: DynamicsResult['resonanceStatus'];
  if (workingFrequency !== undefined && workingFrequency > 0) {
    resonanceStatus = checkResonanceRisk(naturalFrequency, workingFrequency);
  } else {
    resonanceStatus = {
      isAtRisk: false,
      frequencyRatio: 0,
      message: {
        en: 'No working frequency specified',
        zh: '未指定工作频率',
      },
    };
  }

  return {
    wireLength,
    springMass,
    naturalFrequency,
    dampingRatio,
    resonanceStatus,
    surgeWaveVelocity,
  };
}

/**
 * Calculate dynamic stiffness at frequency
 * 计算特定频率下的动态刚度
 * 
 * k_dynamic = k_static × H(ω)
 */
export function calculateDynamicStiffness(
  staticStiffness: number,
  naturalFrequency: number,
  excitationFrequency: number,
  dampingRatio: number = 0.05
): number {
  const r = excitationFrequency / naturalFrequency;
  
  // Complex stiffness magnitude
  const H = Math.sqrt(
    Math.pow(1 - r * r, 2) + Math.pow(2 * dampingRatio * r, 2)
  );
  
  return staticStiffness / H;
}
