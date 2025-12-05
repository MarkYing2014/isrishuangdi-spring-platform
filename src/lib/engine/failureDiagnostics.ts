/**
 * Spring Analysis Engine - Failure Mode Diagnostics Engine
 * 弹簧分析引擎 - 失效模式诊断引擎
 * 
 * Identifies most likely failure mechanisms and root causes
 */

import type { SpringAnalysisResult, SpringGeometry } from './types';
import type { DynamicsResult } from './dynamics';
import type { CreepResult } from './creep';
import type { EnvironmentEffectResult } from './environment';
import type { FatigueDamageResult } from './fatigueDamage';
import type { HookStressResult } from './hookStress';

/**
 * Failure mode types
 */
export type FailureModeType =
  | 'coil_fatigue_fracture'
  | 'buckling'
  | 'yield_at_hooks'
  | 'torsional_bending_excess'
  | 'end_stress_concentration'
  | 'corrosion_degradation'
  | 'resonance_instability'
  | 'permanent_deformation'
  | 'goodman_violation'
  | 'solid_height_impact'
  | 'spring_surge'
  | 'hydrogen_embrittlement';

/**
 * Failure mode definition
 */
export interface FailureMode {
  /** Failure mode type */
  type: FailureModeType;
  /** Mode name */
  name: { en: string; zh: string };
  /** Root cause description */
  rootCause: { en: string; zh: string };
  /** Numerical justification */
  numericalJustification: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Probability of occurrence (0-1) */
  probability: number;
  /** Affected spring types */
  affectedTypes: Array<'compression' | 'extension' | 'torsion' | 'conical'>;
  /** Key parameters involved */
  keyParameters: string[];
}

/**
 * Diagnostics result
 */
export interface DiagnosticsResult {
  /** Identified failure modes (sorted by probability) */
  failureModes: FailureMode[];
  /** Dominant failure mode */
  dominantMode: FailureMode | null;
  /** Overall risk level */
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  /** Summary message */
  summary: { en: string; zh: string };
  /** Detailed analysis notes */
  analysisNotes: string[];
}

/**
 * Failure mode definitions
 */
const FAILURE_MODE_DEFINITIONS: Record<FailureModeType, Omit<FailureMode, 'numericalJustification' | 'probability'>> = {
  coil_fatigue_fracture: {
    type: 'coil_fatigue_fracture',
    name: { en: 'Coil Fatigue Fracture', zh: '线圈疲劳断裂' },
    rootCause: {
      en: 'High alternating stress in active coils exceeds fatigue endurance limit',
      zh: '有效圈中的高交变应力超过疲劳耐久极限',
    },
    severity: 'critical',
    affectedTypes: ['compression', 'extension', 'torsion', 'conical'],
    keyParameters: ['τ_alt', 'τ_mean', 'N_cycles', 'SF_fatigue'],
  },
  buckling: {
    type: 'buckling',
    name: { en: 'Lateral Buckling', zh: '横向屈曲' },
    rootCause: {
      en: 'Slenderness ratio too high, insufficient lateral support',
      zh: '细长比过高，横向支撑不足',
    },
    severity: 'high',
    affectedTypes: ['compression'],
    keyParameters: ['λ', 'L0/Dm', 'P_cr', 'SF_buckling'],
  },
  yield_at_hooks: {
    type: 'yield_at_hooks',
    name: { en: 'Hook Yield/Fracture', zh: '钩子屈服/断裂' },
    rootCause: {
      en: 'Stress concentration at hook bend exceeds material yield strength',
      zh: '钩子弯曲处的应力集中超过材料屈服强度',
    },
    severity: 'high',
    affectedTypes: ['extension'],
    keyParameters: ['σ_hook', 'K_hook', 'SF_hook'],
  },
  torsional_bending_excess: {
    type: 'torsional_bending_excess',
    name: { en: 'Arm Bending Failure', zh: '臂弯曲失效' },
    rootCause: {
      en: 'Excessive bending stress in torsion spring arms',
      zh: '扭转弹簧臂中的弯曲应力过大',
    },
    severity: 'high',
    affectedTypes: ['torsion'],
    keyParameters: ['σ_bend', 'M_arm', 'support_angle'],
  },
  end_stress_concentration: {
    type: 'end_stress_concentration',
    name: { en: 'End Coil Stress Concentration', zh: '端圈应力集中' },
    rootCause: {
      en: 'Improper grinding or sharp transitions at end coils',
      zh: '端圈磨削不当或过渡尖锐',
    },
    severity: 'medium',
    affectedTypes: ['compression', 'conical'],
    keyParameters: ['K_end', 'grinding_quality'],
  },
  corrosion_degradation: {
    type: 'corrosion_degradation',
    name: { en: 'Corrosion Fatigue', zh: '腐蚀疲劳' },
    rootCause: {
      en: 'Environmental corrosion reduces fatigue strength and causes pitting',
      zh: '环境腐蚀降低疲劳强度并导致点蚀',
    },
    severity: 'high',
    affectedTypes: ['compression', 'extension', 'torsion', 'conical'],
    keyParameters: ['k_corrosion', 'environment', 'material_resistance'],
  },
  resonance_instability: {
    type: 'resonance_instability',
    name: { en: 'Resonance Vibration', zh: '共振振动' },
    rootCause: {
      en: 'Operating frequency matches natural frequency, causing amplitude amplification',
      zh: '工作频率与固有频率匹配，导致振幅放大',
    },
    severity: 'critical',
    affectedTypes: ['compression', 'extension', 'torsion', 'conical'],
    keyParameters: ['f_n', 'f_working', 'frequency_ratio'],
  },
  permanent_deformation: {
    type: 'permanent_deformation',
    name: { en: 'Creep/Permanent Set', zh: '蠕变/永久变形' },
    rootCause: {
      en: 'Sustained high stress causes time-dependent plastic deformation',
      zh: '持续高应力导致时间相关的塑性变形',
    },
    severity: 'medium',
    affectedTypes: ['compression', 'extension', 'torsion', 'conical'],
    keyParameters: ['τ/Sy', 'temperature', 'time', 'permanent_set_%'],
  },
  goodman_violation: {
    type: 'goodman_violation',
    name: { en: 'Goodman Limit Exceeded', zh: '超出 Goodman 极限' },
    rootCause: {
      en: 'Combined mean and alternating stress exceeds Goodman fatigue envelope',
      zh: '组合平均应力和交变应力超出 Goodman 疲劳包络线',
    },
    severity: 'critical',
    affectedTypes: ['compression', 'extension', 'torsion', 'conical'],
    keyParameters: ['τ_mean', 'τ_alt', 'S_u', 'S_e'],
  },
  solid_height_impact: {
    type: 'solid_height_impact',
    name: { en: 'Coil Clash/Impact', zh: '线圈碰撞/冲击' },
    rootCause: {
      en: 'Spring compressed to solid height causing impact stress',
      zh: '弹簧压缩至固体高度导致冲击应力',
    },
    severity: 'high',
    affectedTypes: ['compression', 'conical'],
    keyParameters: ['Δx_max', 'H_solid', 'impact_velocity'],
  },
  spring_surge: {
    type: 'spring_surge',
    name: { en: 'Spring Surge', zh: '弹簧冲击波' },
    rootCause: {
      en: 'Compression wave propagation causes localized stress spikes',
      zh: '压缩波传播导致局部应力尖峰',
    },
    severity: 'medium',
    affectedTypes: ['compression', 'conical'],
    keyParameters: ['v_surge', 'impact_rate', 'coil_mass'],
  },
  hydrogen_embrittlement: {
    type: 'hydrogen_embrittlement',
    name: { en: 'Hydrogen Embrittlement', zh: '氢脆' },
    rootCause: {
      en: 'Hydrogen absorption during plating or service causes brittle fracture',
      zh: '电镀或使用过程中的氢吸收导致脆性断裂',
    },
    severity: 'critical',
    affectedTypes: ['compression', 'extension', 'torsion', 'conical'],
    keyParameters: ['plating_type', 'bake_time', 'hardness'],
  },
};

/**
 * Diagnose failure modes based on analysis results
 */
export function diagnoseFailureModes(
  geometry: SpringGeometry,
  analysisResult: SpringAnalysisResult,
  options?: {
    dynamics?: DynamicsResult;
    creep?: CreepResult;
    environment?: EnvironmentEffectResult;
    fatigueDamage?: FatigueDamageResult;
    hookStress?: HookStressResult;
  }
): DiagnosticsResult {
  const failureModes: FailureMode[] = [];
  const analysisNotes: string[] = [];
  
  const springType = geometry.type;
  
  // 1. Check Coil Fatigue Fracture
  const fatigueSF = analysisResult.fatigue.infiniteLifeSafetyFactor;
  if (fatigueSF < 1.5) {
    const probability = fatigueSF < 1.0 ? 0.9 : fatigueSF < 1.25 ? 0.6 : 0.3;
    failureModes.push({
      ...FAILURE_MODE_DEFINITIONS.coil_fatigue_fracture,
      numericalJustification: `Fatigue SF = ${fatigueSF.toFixed(2)} < 1.5, τ_alt = ${analysisResult.fatigue.tauAlt.toFixed(1)} MPa`,
      probability,
    });
    analysisNotes.push(`Fatigue safety factor (${fatigueSF.toFixed(2)}) below recommended minimum of 1.5`);
  }
  
  // 2. Check Buckling (compression only)
  if (springType === 'compression' && analysisResult.buckling) {
    const bucklingSF = analysisResult.buckling.bucklingSafetyFactor;
    if (bucklingSF < 2.0) {
      const probability = bucklingSF < 1.0 ? 0.95 : bucklingSF < 1.5 ? 0.7 : 0.4;
      failureModes.push({
        ...FAILURE_MODE_DEFINITIONS.buckling,
        numericalJustification: `Buckling SF = ${bucklingSF.toFixed(2)}, λ = ${analysisResult.buckling.slendernessRatio.toFixed(2)}`,
        probability,
      });
      analysisNotes.push(`Slenderness ratio ${analysisResult.buckling.slendernessRatio.toFixed(2)} indicates buckling risk`);
    }
  }
  
  // 3. Check Hook Yield (extension only)
  if (springType === 'extension' && options?.hookStress) {
    const hookSF = options.hookStress.hookSafetyFactor;
    if (hookSF < 1.5) {
      const probability = hookSF < 1.0 ? 0.85 : hookSF < 1.25 ? 0.5 : 0.25;
      failureModes.push({
        ...FAILURE_MODE_DEFINITIONS.yield_at_hooks,
        numericalJustification: `Hook SF = ${hookSF.toFixed(2)}, σ_hook = ${options.hookStress.combinedStress.toFixed(1)} MPa`,
        probability,
      });
    }
  }
  
  // 4. Check Resonance
  if (options?.dynamics?.resonanceStatus.isAtRisk) {
    failureModes.push({
      ...FAILURE_MODE_DEFINITIONS.resonance_instability,
      numericalJustification: `f_ratio = ${options.dynamics.resonanceStatus.frequencyRatio.toFixed(2)}, fn = ${options.dynamics.naturalFrequency.toFixed(1)} Hz`,
      probability: 0.8,
    });
    analysisNotes.push('Operating frequency within resonance band');
  }
  
  // 5. Check Creep/Permanent Set
  if (options?.creep && options.creep.riskLevel !== 'low') {
    const probability = options.creep.riskLevel === 'critical' ? 0.85 :
                       options.creep.riskLevel === 'high' ? 0.6 : 0.3;
    failureModes.push({
      ...FAILURE_MODE_DEFINITIONS.permanent_deformation,
      numericalJustification: `τ/Sy = ${(options.creep.stressRatio * 100).toFixed(1)}%, permanent set = ${options.creep.permanentSetPercent.toFixed(2)}%`,
      probability,
    });
  }
  
  // 6. Check Corrosion
  if (options?.environment && options.environment.effectiveCorrosionFactor < 0.8) {
    const probability = options.environment.sccRisk === 'high' ? 0.7 :
                       options.environment.effectiveCorrosionFactor < 0.7 ? 0.5 : 0.3;
    failureModes.push({
      ...FAILURE_MODE_DEFINITIONS.corrosion_degradation,
      numericalJustification: `Corrosion factor = ${options.environment.effectiveCorrosionFactor.toFixed(2)}, SCC risk = ${options.environment.sccRisk}`,
      probability,
    });
  }
  
  // 7. Check Goodman Violation
  const staticSF = analysisResult.safety.staticSafetyFactor;
  if (staticSF < 1.2 || fatigueSF < 1.0) {
    const probability = staticSF < 1.0 ? 0.9 : 0.5;
    failureModes.push({
      ...FAILURE_MODE_DEFINITIONS.goodman_violation,
      numericalJustification: `Static SF = ${staticSF.toFixed(2)}, τ_mean = ${analysisResult.fatigue.tauMean.toFixed(1)} MPa`,
      probability,
    });
  }
  
  // 8. Check Fatigue Damage Hot Spots
  if (options?.fatigueDamage && options.fatigueDamage.failurePredictedCount > 0) {
    failureModes.push({
      ...FAILURE_MODE_DEFINITIONS.coil_fatigue_fracture,
      numericalJustification: `${options.fatigueDamage.failurePredictedCount} locations with D ≥ 1.0, max D = ${options.fatigueDamage.maxDamageIndex.toFixed(3)}`,
      probability: 0.95,
      severity: 'critical',
    });
  }
  
  // Sort by probability (descending)
  failureModes.sort((a, b) => b.probability - a.probability);
  
  // Determine dominant mode and overall risk
  const dominantMode = failureModes.length > 0 ? failureModes[0] : null;
  
  let overallRisk: DiagnosticsResult['overallRisk'] = 'low';
  if (failureModes.some(m => m.severity === 'critical' && m.probability > 0.5)) {
    overallRisk = 'critical';
  } else if (failureModes.some(m => m.severity === 'high' && m.probability > 0.4)) {
    overallRisk = 'high';
  } else if (failureModes.length > 0) {
    overallRisk = 'medium';
  }
  
  // Generate summary
  let summary: { en: string; zh: string };
  if (failureModes.length === 0) {
    summary = {
      en: 'No significant failure modes identified. Design appears robust.',
      zh: '未识别到显著失效模式。设计看起来稳健。',
    };
  } else {
    summary = {
      en: `${failureModes.length} potential failure mode(s) identified. Dominant: ${dominantMode?.name.en} (${(dominantMode?.probability ?? 0 * 100).toFixed(0)}% probability)`,
      zh: `识别到 ${failureModes.length} 种潜在失效模式。主要：${dominantMode?.name.zh}（${((dominantMode?.probability ?? 0) * 100).toFixed(0)}% 概率）`,
    };
  }
  
  return {
    failureModes,
    dominantMode,
    overallRisk,
    summary,
    analysisNotes,
  };
}

/**
 * Get failure mode icon
 */
export function getFailureModeIcon(type: FailureModeType): string {
  const icons: Record<FailureModeType, string> = {
    coil_fatigue_fracture: '💔',
    buckling: '🔀',
    yield_at_hooks: '🪝',
    torsional_bending_excess: '🔄',
    end_stress_concentration: '⚡',
    corrosion_degradation: '🧪',
    resonance_instability: '📳',
    permanent_deformation: '📐',
    goodman_violation: '⚠️',
    solid_height_impact: '💥',
    spring_surge: '🌊',
    hydrogen_embrittlement: '🧊',
  };
  return icons[type] || '❓';
}
