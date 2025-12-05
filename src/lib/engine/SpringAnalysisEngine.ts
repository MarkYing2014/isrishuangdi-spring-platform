/**
 * Spring Analysis Engine - Main Engine Class
 * 弹簧分析引擎 - 主引擎类
 * 
 * Unified interface for complete spring analysis
 */

import type {
  SpringGeometry,
  CompressionSpringGeometry,
  WorkingConditions,
  SpringAnalysisResult,
  GeometryResult,
  StressResult,
  SafetyResult,
  FatigueResult,
  BucklingResult,
  ForceDeflectionPoint,
} from './types';

import { calculateGeometry, validateGeometry } from './geometry';
import { calculateStress, calculateStressRange } from './stress';
import { calculateFatigue } from './fatigue';
import { calculateStaticSafetyFactor } from './safety';
import { calculateBuckling } from './buckling';
import { calculateSpringRate, generateForceCurve, interpolateForceAtDeflection } from './forceCurve';

/**
 * Spring Analysis Engine
 * 弹簧分析引擎
 * 
 * Provides unified analysis for all spring types:
 * - Compression springs
 * - Extension springs
 * - Torsion springs
 * - Conical springs
 */
export class SpringAnalysisEngine {
  private geometry: SpringGeometry;
  private workingConditions: WorkingConditions;
  private warnings: string[] = [];

  constructor(geometry: SpringGeometry, workingConditions: WorkingConditions) {
    this.geometry = geometry;
    this.workingConditions = workingConditions;
    
    // Validate geometry on construction
    this.warnings = validateGeometry(geometry);
  }

  /**
   * Get geometry calculation results
   */
  getGeometry(): GeometryResult {
    return calculateGeometry(this.geometry);
  }

  /**
   * Get spring rate
   */
  getSpringRate(): number {
    return calculateSpringRate(this.geometry);
  }

  /**
   * Get force-deflection curve
   */
  getForceCurve(numPoints: number = 50): ForceDeflectionPoint[] {
    return generateForceCurve(
      this.geometry,
      this.workingConditions.maxDeflection,
      numPoints
    );
  }

  /**
   * Get stress at maximum deflection
   */
  getMaxStress(): StressResult {
    const springRate = this.getSpringRate();
    const maxForce = springRate * this.workingConditions.maxDeflection;
    
    // For extension springs, add initial tension
    const totalForce = this.geometry.type === 'extension'
      ? maxForce + this.geometry.initialTension
      : maxForce;

    return calculateStress(
      this.geometry,
      totalForce,
      this.workingConditions.temperature ?? 20
    );
  }

  /**
   * Get stress range for fatigue analysis
   */
  getStressRange(): {
    stressMin: StressResult;
    stressMax: StressResult;
    stressMean: number;
    stressAmplitude: number;
    stressRatio: number;
  } {
    const springRate = this.getSpringRate();
    const initialTension = this.geometry.type === 'extension'
      ? this.geometry.initialTension
      : 0;

    return calculateStressRange(
      this.geometry,
      springRate,
      this.workingConditions.minDeflection,
      this.workingConditions.maxDeflection,
      this.workingConditions.temperature ?? 20,
      initialTension
    );
  }

  /**
   * Get safety factor analysis
   */
  getSafetyFactor(): SafetyResult {
    const maxStress = this.getMaxStress();
    return calculateStaticSafetyFactor(
      this.geometry.materialId,
      maxStress.tauEffective
    );
  }

  /**
   * Get fatigue life analysis
   */
  getFatigueLife(): FatigueResult {
    const stressRange = this.getStressRange();
    return calculateFatigue(
      this.geometry.materialId,
      stressRange.stressMax.tauEffective,
      stressRange.stressMin.tauEffective
    );
  }

  /**
   * Get buckling analysis (compression springs only)
   */
  getBuckling(): BucklingResult | undefined {
    if (this.geometry.type !== 'compression') {
      return undefined;
    }

    const springRate = this.getSpringRate();
    const maxForce = springRate * this.workingConditions.maxDeflection;

    return calculateBuckling(
      this.geometry as CompressionSpringGeometry,
      maxForce
    );
  }

  /**
   * Get current state at a specific deflection
   */
  getStateAtDeflection(deflection: number): {
    force: number;
    stress: number;
    stiffness: number;
    activeCoils?: number;
  } {
    const curve = this.getForceCurve();
    const point = interpolateForceAtDeflection(curve, deflection);

    if (!point) {
      const springRate = this.getSpringRate();
      return {
        force: springRate * deflection,
        stress: 0,
        stiffness: springRate,
      };
    }

    return {
      force: point.force,
      stress: point.stress ?? 0,
      stiffness: point.stiffness,
      activeCoils: point.activeCoils,
    };
  }

  /**
   * Run complete analysis
   */
  analyze(): SpringAnalysisResult {
    const geometry = this.getGeometry();
    const springRate = this.getSpringRate();
    const stress = this.getMaxStress();
    const safety = this.getSafetyFactor();
    const fatigue = this.getFatigueLife();
    const buckling = this.getBuckling();
    const forceCurve = this.getForceCurve();

    // Add warnings based on analysis results
    if (safety.status === 'danger') {
      this.warnings.push('Static safety factor is below acceptable limit');
    }
    if (fatigue.rating === 'very_low' || fatigue.rating === 'low') {
      this.warnings.push('Fatigue life may be insufficient for high-cycle applications');
    }
    if (buckling?.status === 'danger') {
      this.warnings.push('Spring is at risk of buckling');
    }

    return {
      springType: this.geometry.type,
      geometry,
      springRate,
      stress,
      safety,
      fatigue,
      buckling,
      forceCurve,
      timestamp: new Date(),
      warnings: this.warnings,
    };
  }

  /**
   * Get validation warnings
   */
  getWarnings(): string[] {
    return this.warnings;
  }

  /**
   * Static factory method for quick analysis
   */
  static analyze(
    geometry: SpringGeometry,
    workingConditions: WorkingConditions
  ): SpringAnalysisResult {
    const engine = new SpringAnalysisEngine(geometry, workingConditions);
    return engine.analyze();
  }

  /**
   * Static method to calculate spring rate only
   */
  static getSpringRate(geometry: SpringGeometry): number {
    return calculateSpringRate(geometry);
  }

  /**
   * Static method to generate force curve only
   */
  static generateForceCurve(
    geometry: SpringGeometry,
    maxDeflection: number,
    numPoints: number = 50
  ): ForceDeflectionPoint[] {
    return generateForceCurve(geometry, maxDeflection, numPoints);
  }
}

/**
 * Quick analysis function for simple use cases
 * 快速分析函数，用于简单场景
 */
export function analyzeSpring(
  geometry: SpringGeometry,
  workingConditions: WorkingConditions
): SpringAnalysisResult {
  return SpringAnalysisEngine.analyze(geometry, workingConditions);
}
