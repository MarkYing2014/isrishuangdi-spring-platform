/**
 * Spring Analysis Engine - Verdict Engine
 * 弹簧分析引擎 - 判定引擎
 * 
 * Final PASS/FAIL determination based on all analysis criteria
 */

import type { SpringAnalysisResult, SafetyResult, FatigueResult, BucklingResult } from './types';
import type { DynamicsResult } from './dynamics';
import type { CreepResult } from './creep';
import type { EnvironmentEffectResult } from './environment';
import type { TemperatureEffectResult } from './temperature';

/**
 * Verdict criteria thresholds
 */
export const VERDICT_THRESHOLDS = {
  /** Minimum static safety factor */
  MIN_STATIC_SF: 1.2,
  /** Minimum yield safety factor */
  MIN_YIELD_SF: 1.1,
  /** Minimum buckling safety factor */
  MIN_BUCKLING_SF: 1.5,
  /** Minimum fatigue safety factor for infinite life */
  MIN_FATIGUE_SF: 1.0,
  /** Maximum stress ratio for creep */
  MAX_CREEP_STRESS_RATIO: 0.85,
  /** Maximum permanent set percentage */
  MAX_PERMANENT_SET_PERCENT: 3.0,
  /** Resonance frequency ratio tolerance */
  RESONANCE_TOLERANCE: 0.15,
  /** Minimum fatigue cycles for high-cycle applications */
  MIN_FATIGUE_CYCLES: 1e6,
};

/**
 * Individual criterion result
 */
export interface CriterionResult {
  /** Criterion name */
  name: string;
  /** Criterion name in Chinese */
  nameZh: string;
  /** Pass/Fail status */
  passed: boolean;
  /** Actual value */
  actualValue: number | string;
  /** Required value */
  requiredValue: number | string;
  /** Severity if failed */
  severity: 'info' | 'warning' | 'critical';
  /** Recommendation if failed */
  recommendation?: string;
}

/**
 * Complete verdict result
 */
export interface VerdictResult {
  /** Overall pass/fail */
  overallPass: boolean;
  /** Overall status */
  status: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  /** Status message */
  message: { en: string; zh: string };
  /** Individual criteria results */
  criteria: CriterionResult[];
  /** Number of passed criteria */
  passedCount: number;
  /** Number of failed criteria */
  failedCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Critical failures */
  criticalFailures: string[];
  /** Recommendations */
  recommendations: string[];
  /** Timestamp */
  timestamp: Date;
}

/**
 * Check Goodman fatigue limit criterion
 */
export function checkGoodmanFatigue(
  fatigue: FatigueResult,
  minCycles: number = VERDICT_THRESHOLDS.MIN_FATIGUE_CYCLES
): CriterionResult {
  const passed = fatigue.estimatedCycles >= minCycles || 
                 fatigue.infiniteLifeSafetyFactor >= VERDICT_THRESHOLDS.MIN_FATIGUE_SF;
  
  return {
    name: "Goodman's Fatigue Limit",
    nameZh: "Goodman 疲劳极限",
    passed,
    actualValue: fatigue.infiniteLifeSafetyFactor.toFixed(2),
    requiredValue: `≥ ${VERDICT_THRESHOLDS.MIN_FATIGUE_SF}`,
    severity: passed ? 'info' : 'critical',
    recommendation: passed ? undefined : 'Reduce stress amplitude or use higher fatigue-rated material',
  };
}

/**
 * Check buckling safety factor criterion
 */
export function checkBucklingSafety(
  buckling?: BucklingResult
): CriterionResult {
  if (!buckling) {
    return {
      name: 'Buckling Safety Factor',
      nameZh: '屈曲安全系数',
      passed: true,
      actualValue: 'N/A',
      requiredValue: 'N/A (non-compression)',
      severity: 'info',
    };
  }
  
  const passed = buckling.bucklingSafetyFactor >= VERDICT_THRESHOLDS.MIN_BUCKLING_SF;
  
  return {
    name: 'Buckling Safety Factor',
    nameZh: '屈曲安全系数',
    passed,
    actualValue: buckling.bucklingSafetyFactor.toFixed(2),
    requiredValue: `≥ ${VERDICT_THRESHOLDS.MIN_BUCKLING_SF}`,
    severity: passed ? 'info' : 'critical',
    recommendation: passed ? undefined : 'Reduce free length, increase diameter, or add guide rod',
  };
}

/**
 * Check yield safety factor criterion
 */
export function checkYieldSafety(
  safety: SafetyResult
): CriterionResult {
  const passed = safety.staticSafetyFactor >= VERDICT_THRESHOLDS.MIN_YIELD_SF;
  
  return {
    name: 'Yield Safety Factor',
    nameZh: '屈服安全系数',
    passed,
    actualValue: safety.staticSafetyFactor.toFixed(2),
    requiredValue: `≥ ${VERDICT_THRESHOLDS.MIN_YIELD_SF}`,
    severity: passed ? 'info' : 'critical',
    recommendation: passed ? undefined : 'Reduce working stress or use higher strength material',
  };
}

/**
 * Check static safety factor criterion
 */
export function checkStaticSafety(
  safety: SafetyResult
): CriterionResult {
  const passed = safety.staticSafetyFactor >= VERDICT_THRESHOLDS.MIN_STATIC_SF;
  
  return {
    name: 'Static Safety Factor',
    nameZh: '静态安全系数',
    passed,
    actualValue: safety.staticSafetyFactor.toFixed(2),
    requiredValue: `≥ ${VERDICT_THRESHOLDS.MIN_STATIC_SF}`,
    severity: passed ? 'info' : (safety.staticSafetyFactor >= 1.0 ? 'warning' : 'critical'),
    recommendation: passed ? undefined : 'Reduce load or increase wire diameter',
  };
}

/**
 * Check creep/permanent set criterion
 */
export function checkCreepRisk(
  creep?: CreepResult
): CriterionResult {
  if (!creep) {
    return {
      name: 'Creep/Permanent Set',
      nameZh: '蠕变/永久变形',
      passed: true,
      actualValue: 'Not analyzed',
      requiredValue: 'N/A',
      severity: 'info',
    };
  }
  
  const passed = creep.permanentSetPercent <= VERDICT_THRESHOLDS.MAX_PERMANENT_SET_PERCENT &&
                 creep.stressRatio <= VERDICT_THRESHOLDS.MAX_CREEP_STRESS_RATIO;
  
  return {
    name: 'Creep/Permanent Set',
    nameZh: '蠕变/永久变形',
    passed,
    actualValue: `${creep.permanentSetPercent.toFixed(2)}%`,
    requiredValue: `≤ ${VERDICT_THRESHOLDS.MAX_PERMANENT_SET_PERCENT}%`,
    severity: passed ? 'info' : (creep.riskLevel === 'critical' ? 'critical' : 'warning'),
    recommendation: passed ? undefined : 'Reduce sustained stress or operating temperature',
  };
}

/**
 * Check resonance proximity criterion
 */
export function checkResonanceRisk(
  dynamics?: DynamicsResult
): CriterionResult {
  if (!dynamics) {
    return {
      name: 'Resonance Proximity',
      nameZh: '共振接近度',
      passed: true,
      actualValue: 'Not analyzed',
      requiredValue: 'N/A',
      severity: 'info',
    };
  }
  
  const passed = !dynamics.resonanceStatus.isAtRisk;
  
  return {
    name: 'Resonance Proximity',
    nameZh: '共振接近度',
    passed,
    actualValue: dynamics.resonanceStatus.isAtRisk 
      ? `Ratio: ${dynamics.resonanceStatus.frequencyRatio.toFixed(2)} (AT RISK)`
      : `Ratio: ${dynamics.resonanceStatus.frequencyRatio.toFixed(2)} (Safe)`,
    requiredValue: `Outside ±${VERDICT_THRESHOLDS.RESONANCE_TOLERANCE * 100}% of fn`,
    severity: passed ? 'info' : 'critical',
    recommendation: passed ? undefined : 'Change spring rate or operating frequency to avoid resonance',
  };
}

/**
 * Check surface finish / residual stress criterion
 */
export function checkSurfaceFinish(
  surfaceFactor: number,
  shotPeened: boolean = false
): CriterionResult {
  const passed = surfaceFactor >= 0.8 || shotPeened;
  
  return {
    name: 'Surface Finish & Residual Stress',
    nameZh: '表面处理与残余应力',
    passed,
    actualValue: shotPeened ? `Ks=${surfaceFactor.toFixed(2)} (Shot peened)` : `Ks=${surfaceFactor.toFixed(2)}`,
    requiredValue: 'Ks ≥ 0.8 or shot peened',
    severity: passed ? 'info' : 'warning',
    recommendation: passed ? undefined : 'Consider shot peening to improve fatigue life',
  };
}

/**
 * Check temperature effects criterion
 */
export function checkTemperatureEffects(
  temperature?: TemperatureEffectResult
): CriterionResult {
  if (!temperature) {
    return {
      name: 'Temperature Effects',
      nameZh: '温度效应',
      passed: true,
      actualValue: 'Room temperature',
      requiredValue: 'N/A',
      severity: 'info',
    };
  }
  
  const passed = !temperature.warning && temperature.strengthLossPercent < 30;
  
  return {
    name: 'Temperature Effects',
    nameZh: '温度效应',
    passed,
    actualValue: `${temperature.temperature}°C (${temperature.strengthLossPercent.toFixed(1)}% strength loss)`,
    requiredValue: '< 30% strength loss',
    severity: passed ? 'info' : (temperature.strengthLossPercent > 50 ? 'critical' : 'warning'),
    recommendation: passed ? undefined : 'Use high-temperature material or reduce operating temperature',
  };
}

/**
 * Check environmental corrosion criterion
 */
export function checkEnvironmentEffects(
  environment?: EnvironmentEffectResult
): CriterionResult {
  if (!environment) {
    return {
      name: 'Environmental Corrosion',
      nameZh: '环境腐蚀',
      passed: true,
      actualValue: 'Indoor (default)',
      requiredValue: 'N/A',
      severity: 'info',
    };
  }
  
  const passed = environment.effectiveCorrosionFactor >= 0.7 && environment.sccRisk !== 'high';
  
  return {
    name: 'Environmental Corrosion',
    nameZh: '环境腐蚀',
    passed,
    actualValue: `${environment.environmentLabel.en} (Factor: ${environment.effectiveCorrosionFactor.toFixed(2)})`,
    requiredValue: 'Corrosion factor ≥ 0.7, SCC risk ≤ medium',
    severity: passed ? 'info' : (environment.sccRisk === 'high' ? 'critical' : 'warning'),
    recommendation: passed ? undefined : environment.recommendations[0],
  };
}

/**
 * Calculate complete verdict
 * 计算完整判定结果
 */
export function calculateVerdict(
  analysisResult: SpringAnalysisResult,
  options?: {
    dynamics?: DynamicsResult;
    creep?: CreepResult;
    environment?: EnvironmentEffectResult;
    temperature?: TemperatureEffectResult;
    shotPeened?: boolean;
    minFatigueCycles?: number;
  }
): VerdictResult {
  const criteria: CriterionResult[] = [];
  
  // Check all criteria
  criteria.push(checkStaticSafety(analysisResult.safety));
  criteria.push(checkYieldSafety(analysisResult.safety));
  criteria.push(checkGoodmanFatigue(analysisResult.fatigue, options?.minFatigueCycles));
  criteria.push(checkBucklingSafety(analysisResult.buckling));
  criteria.push(checkCreepRisk(options?.creep));
  criteria.push(checkResonanceRisk(options?.dynamics));
  criteria.push(checkSurfaceFinish(
    analysisResult.stress.surfaceFactor,
    options?.shotPeened
  ));
  criteria.push(checkTemperatureEffects(options?.temperature));
  criteria.push(checkEnvironmentEffects(options?.environment));
  
  // Count results
  const passedCount = criteria.filter(c => c.passed).length;
  const failedCount = criteria.filter(c => !c.passed).length;
  const warningCount = criteria.filter(c => !c.passed && c.severity === 'warning').length;
  const criticalFailures = criteria
    .filter(c => !c.passed && c.severity === 'critical')
    .map(c => c.name);
  
  // Collect recommendations
  const recommendations = criteria
    .filter(c => !c.passed && c.recommendation)
    .map(c => c.recommendation!);
  
  // Determine overall status
  let overallPass: boolean;
  let status: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  let message: { en: string; zh: string };
  
  if (criticalFailures.length > 0) {
    overallPass = false;
    status = 'FAIL';
    message = {
      en: `FAIL — ${criticalFailures.length} critical failure(s): ${criticalFailures.join(', ')}. Adjust design parameters.`,
      zh: `不通过 — ${criticalFailures.length} 项严重失败：${criticalFailures.join('、')}。请调整设计参数。`,
    };
  } else if (warningCount > 0) {
    overallPass = true;
    status = 'CONDITIONAL_PASS';
    message = {
      en: `CONDITIONAL PASS — ${warningCount} warning(s). Review recommendations before production.`,
      zh: `有条件通过 — ${warningCount} 项警告。生产前请审查建议。`,
    };
  } else {
    overallPass = true;
    status = 'PASS';
    message = {
      en: `PASS — All ${passedCount} criteria met. Design is validated.`,
      zh: `通过 — 全部 ${passedCount} 项标准满足。设计已验证。`,
    };
  }
  
  return {
    overallPass,
    status,
    message,
    criteria,
    passedCount,
    failedCount,
    warningCount,
    criticalFailures,
    recommendations,
    timestamp: new Date(),
  };
}

/**
 * Generate verdict summary for report
 */
export function generateVerdictSummary(verdict: VerdictResult): string {
  const lines: string[] = [];
  
  lines.push(`═══════════════════════════════════════════════════`);
  lines.push(`  DESIGN VERDICT: ${verdict.status}`);
  lines.push(`═══════════════════════════════════════════════════`);
  lines.push(``);
  lines.push(`Criteria Passed: ${verdict.passedCount}/${verdict.criteria.length}`);
  lines.push(``);
  
  // List all criteria
  for (const criterion of verdict.criteria) {
    const icon = criterion.passed ? '✓' : (criterion.severity === 'critical' ? '✗' : '⚠');
    lines.push(`${icon} ${criterion.name}: ${criterion.actualValue} (Required: ${criterion.requiredValue})`);
  }
  
  lines.push(``);
  
  if (verdict.recommendations.length > 0) {
    lines.push(`Recommendations:`);
    for (const rec of verdict.recommendations) {
      lines.push(`  • ${rec}`);
    }
  }
  
  lines.push(``);
  lines.push(`═══════════════════════════════════════════════════`);
  
  return lines.join('\n');
}
