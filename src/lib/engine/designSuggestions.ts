/**
 * Spring Analysis Engine - Auto Design Suggestion Engine
 * 弹簧分析引擎 - 自动设计建议引擎
 * 
 * Recommends design improvements for failed conditions
 */

import type { SpringGeometry, SpringAnalysisResult } from './types';
import type { DiagnosticsResult, FailureModeType } from './failureDiagnostics';
import type { DynamicsResult } from './dynamics';
import type { CreepResult } from './creep';
import type { EnvironmentEffectResult } from './environment';

/**
 * Design suggestion type
 */
export type SuggestionType =
  | 'increase_wire_diameter'
  | 'change_spring_index'
  | 'increase_active_coils'
  | 'change_material'
  | 'add_shot_peening'
  | 'add_corrosion_protection'
  | 'reduce_max_deflection'
  | 'reduce_working_load'
  | 'reduce_temperature'
  | 'modify_arm_angle'
  | 'increase_mean_diameter'
  | 'change_hook_type'
  | 'reduce_free_length'
  | 'add_guide_rod'
  | 'increase_preload'
  | 'reduce_operating_frequency'
  | 'add_damping';

/**
 * Design suggestion
 */
export interface DesignSuggestion {
  /** Suggestion type */
  type: SuggestionType;
  /** Suggestion title */
  title: { en: string; zh: string };
  /** Detailed description */
  description: { en: string; zh: string };
  /** Expected improvement */
  expectedImprovement: { en: string; zh: string };
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Estimated effectiveness (0-1) */
  effectiveness: number;
  /** Implementation difficulty */
  difficulty: 'easy' | 'moderate' | 'hard';
  /** Cost impact */
  costImpact: 'low' | 'medium' | 'high';
  /** Addresses failure modes */
  addressesFailureModes: FailureModeType[];
  /** Specific parameter change */
  parameterChange?: {
    parameter: string;
    currentValue: number;
    suggestedValue: number;
    unit: string;
  };
}

/**
 * Suggestions result
 */
export interface SuggestionsResult {
  /** All suggestions (sorted by priority) */
  suggestions: DesignSuggestion[];
  /** Top priority suggestions */
  topPriority: DesignSuggestion[];
  /** Quick wins (high effectiveness, low difficulty) */
  quickWins: DesignSuggestion[];
  /** Summary */
  summary: { en: string; zh: string };
}

/**
 * Suggestion templates
 */
const SUGGESTION_TEMPLATES: Record<SuggestionType, Omit<DesignSuggestion, 'parameterChange' | 'effectiveness' | 'priority'>> = {
  increase_wire_diameter: {
    type: 'increase_wire_diameter',
    title: { en: 'Increase Wire Diameter', zh: '增加线径' },
    description: {
      en: 'Larger wire diameter reduces stress and increases fatigue life',
      zh: '较大的线径可降低应力并增加疲劳寿命',
    },
    expectedImprovement: {
      en: 'Stress reduction proportional to d³, significant fatigue life improvement',
      zh: '应力降低与 d³ 成正比，疲劳寿命显著提高',
    },
    difficulty: 'moderate',
    costImpact: 'medium',
    addressesFailureModes: ['coil_fatigue_fracture', 'goodman_violation', 'yield_at_hooks'],
  },
  change_spring_index: {
    type: 'change_spring_index',
    title: { en: 'Optimize Spring Index', zh: '优化弹簧指数' },
    description: {
      en: 'Adjust Dm/d ratio to optimal range (6-10) for balanced stress distribution',
      zh: '将 Dm/d 比率调整到最佳范围 (6-10) 以获得均衡的应力分布',
    },
    expectedImprovement: {
      en: 'Reduced Wahl factor, improved manufacturability',
      zh: '降低 Wahl 系数，提高可制造性',
    },
    difficulty: 'moderate',
    costImpact: 'low',
    addressesFailureModes: ['coil_fatigue_fracture', 'end_stress_concentration'],
  },
  increase_active_coils: {
    type: 'increase_active_coils',
    title: { en: 'Increase Active Coils', zh: '增加有效圈数' },
    description: {
      en: 'More coils distribute load, reducing stress per coil',
      zh: '更多线圈分散载荷，降低每圈应力',
    },
    expectedImprovement: {
      en: 'Lower spring rate, reduced stress amplitude',
      zh: '降低弹簧刚度，减小应力幅值',
    },
    difficulty: 'easy',
    costImpact: 'low',
    addressesFailureModes: ['coil_fatigue_fracture', 'solid_height_impact'],
  },
  change_material: {
    type: 'change_material',
    title: { en: 'Upgrade Material Grade', zh: '升级材料等级' },
    description: {
      en: 'Use higher strength or fatigue-resistant material',
      zh: '使用更高强度或抗疲劳材料',
    },
    expectedImprovement: {
      en: 'Higher allowable stress, better fatigue performance',
      zh: '更高的许用应力，更好的疲劳性能',
    },
    difficulty: 'easy',
    costImpact: 'high',
    addressesFailureModes: ['coil_fatigue_fracture', 'goodman_violation', 'corrosion_degradation'],
  },
  add_shot_peening: {
    type: 'add_shot_peening',
    title: { en: 'Add Shot Peening', zh: '添加喷丸处理' },
    description: {
      en: 'Introduce compressive residual stress on surface',
      zh: '在表面引入压缩残余应力',
    },
    expectedImprovement: {
      en: '20-50% improvement in fatigue life',
      zh: '疲劳寿命提高 20-50%',
    },
    difficulty: 'easy',
    costImpact: 'low',
    addressesFailureModes: ['coil_fatigue_fracture', 'end_stress_concentration'],
  },
  add_corrosion_protection: {
    type: 'add_corrosion_protection',
    title: { en: 'Add Corrosion Protection', zh: '添加防腐保护' },
    description: {
      en: 'Apply zinc plating, nickel coating, or epoxy finish',
      zh: '应用镀锌、镀镍或环氧涂层',
    },
    expectedImprovement: {
      en: 'Prevent corrosion fatigue, extend service life',
      zh: '防止腐蚀疲劳，延长使用寿命',
    },
    difficulty: 'easy',
    costImpact: 'low',
    addressesFailureModes: ['corrosion_degradation', 'hydrogen_embrittlement'],
  },
  reduce_max_deflection: {
    type: 'reduce_max_deflection',
    title: { en: 'Reduce Maximum Deflection', zh: '减小最大位移' },
    description: {
      en: 'Limit operating deflection to reduce stress amplitude',
      zh: '限制工作位移以减小应力幅值',
    },
    expectedImprovement: {
      en: 'Direct reduction in stress and fatigue damage',
      zh: '直接降低应力和疲劳损伤',
    },
    difficulty: 'moderate',
    costImpact: 'low',
    addressesFailureModes: ['coil_fatigue_fracture', 'solid_height_impact', 'buckling'],
  },
  reduce_working_load: {
    type: 'reduce_working_load',
    title: { en: 'Reduce Working Load', zh: '减小工作载荷' },
    description: {
      en: 'Lower the applied force to reduce stress levels',
      zh: '降低施加的力以减小应力水平',
    },
    expectedImprovement: {
      en: 'Proportional stress reduction',
      zh: '应力成比例降低',
    },
    difficulty: 'hard',
    costImpact: 'low',
    addressesFailureModes: ['coil_fatigue_fracture', 'goodman_violation', 'buckling'],
  },
  reduce_temperature: {
    type: 'reduce_temperature',
    title: { en: 'Reduce Operating Temperature', zh: '降低工作温度' },
    description: {
      en: 'Lower temperature to maintain material strength',
      zh: '降低温度以保持材料强度',
    },
    expectedImprovement: {
      en: 'Restored material properties, reduced creep',
      zh: '恢复材料性能，减少蠕变',
    },
    difficulty: 'hard',
    costImpact: 'medium',
    addressesFailureModes: ['permanent_deformation', 'coil_fatigue_fracture'],
  },
  modify_arm_angle: {
    type: 'modify_arm_angle',
    title: { en: 'Modify Arm Support Angle', zh: '修改臂支撑角度' },
    description: {
      en: 'Adjust torsion spring arm angle to 90° for optimal stress distribution',
      zh: '将扭转弹簧臂角度调整为 90° 以获得最佳应力分布',
    },
    expectedImprovement: {
      en: 'Reduced stress concentration at arm root',
      zh: '减少臂根部的应力集中',
    },
    difficulty: 'moderate',
    costImpact: 'low',
    addressesFailureModes: ['torsional_bending_excess'],
  },
  increase_mean_diameter: {
    type: 'increase_mean_diameter',
    title: { en: 'Increase Mean Diameter', zh: '增加中径' },
    description: {
      en: 'Larger coil diameter reduces spring index stress concentration',
      zh: '较大的线圈直径可降低弹簧指数应力集中',
    },
    expectedImprovement: {
      en: 'Lower Wahl factor if C was too low',
      zh: '如果 C 过低，则降低 Wahl 系数',
    },
    difficulty: 'moderate',
    costImpact: 'low',
    addressesFailureModes: ['coil_fatigue_fracture', 'end_stress_concentration'],
  },
  change_hook_type: {
    type: 'change_hook_type',
    title: { en: 'Change Hook Type', zh: '更换钩子类型' },
    description: {
      en: 'Use double loop or extended hook for lower stress concentration',
      zh: '使用双环或加长钩以降低应力集中',
    },
    expectedImprovement: {
      en: 'Reduced hook stress concentration factor',
      zh: '降低钩子应力集中系数',
    },
    difficulty: 'easy',
    costImpact: 'low',
    addressesFailureModes: ['yield_at_hooks'],
  },
  reduce_free_length: {
    type: 'reduce_free_length',
    title: { en: 'Reduce Free Length', zh: '减小自由长度' },
    description: {
      en: 'Shorter spring reduces slenderness ratio and buckling risk',
      zh: '较短的弹簧可降低细长比和屈曲风险',
    },
    expectedImprovement: {
      en: 'Improved buckling safety factor',
      zh: '提高屈曲安全系数',
    },
    difficulty: 'moderate',
    costImpact: 'low',
    addressesFailureModes: ['buckling'],
  },
  add_guide_rod: {
    type: 'add_guide_rod',
    title: { en: 'Add Guide Rod', zh: '添加导向杆' },
    description: {
      en: 'Internal or external guide prevents lateral buckling',
      zh: '内部或外部导向可防止横向屈曲',
    },
    expectedImprovement: {
      en: 'Eliminates buckling failure mode',
      zh: '消除屈曲失效模式',
    },
    difficulty: 'easy',
    costImpact: 'low',
    addressesFailureModes: ['buckling'],
  },
  increase_preload: {
    type: 'increase_preload',
    title: { en: 'Increase Preload', zh: '增加预载' },
    description: {
      en: 'Higher initial tension reduces stress amplitude',
      zh: '较高的初始张力可减小应力幅值',
    },
    expectedImprovement: {
      en: 'Reduced alternating stress component',
      zh: '减小交变应力分量',
    },
    difficulty: 'moderate',
    costImpact: 'low',
    addressesFailureModes: ['coil_fatigue_fracture'],
  },
  reduce_operating_frequency: {
    type: 'reduce_operating_frequency',
    title: { en: 'Reduce Operating Frequency', zh: '降低工作频率' },
    description: {
      en: 'Move operating frequency away from natural frequency',
      zh: '将工作频率远离固有频率',
    },
    expectedImprovement: {
      en: 'Avoid resonance amplification',
      zh: '避免共振放大',
    },
    difficulty: 'hard',
    costImpact: 'medium',
    addressesFailureModes: ['resonance_instability', 'spring_surge'],
  },
  add_damping: {
    type: 'add_damping',
    title: { en: 'Add Damping', zh: '添加阻尼' },
    description: {
      en: 'Use damper or friction element to reduce vibration amplitude',
      zh: '使用阻尼器或摩擦元件来减小振动幅值',
    },
    expectedImprovement: {
      en: 'Reduced resonance peak amplitude',
      zh: '降低共振峰值幅度',
    },
    difficulty: 'moderate',
    costImpact: 'medium',
    addressesFailureModes: ['resonance_instability'],
  },
};

/**
 * Generate design suggestions based on diagnostics
 */
export function generateDesignSuggestions(
  geometry: SpringGeometry,
  analysisResult: SpringAnalysisResult,
  diagnostics: DiagnosticsResult,
  options?: {
    dynamics?: DynamicsResult;
    creep?: CreepResult;
    environment?: EnvironmentEffectResult;
  }
): SuggestionsResult {
  const suggestions: DesignSuggestion[] = [];
  const springType = geometry.type;
  
  // Get current parameters
  const wireDiameter = geometry.wireDiameter;
  const meanDiameter = 'meanDiameter' in geometry ? geometry.meanDiameter : 20;
  const activeCoils = geometry.activeCoils;
  const springIndex = meanDiameter / wireDiameter;
  
  // Check each failure mode and generate relevant suggestions
  for (const failureMode of diagnostics.failureModes) {
    const relevantSuggestions = Object.values(SUGGESTION_TEMPLATES)
      .filter(s => s.addressesFailureModes.includes(failureMode.type));
    
    for (const template of relevantSuggestions) {
      // Skip if already added
      if (suggestions.some(s => s.type === template.type)) continue;
      
      // Calculate effectiveness and priority based on failure mode
      let effectiveness = 0.5;
      let priority: DesignSuggestion['priority'] = 'medium';
      
      if (failureMode.probability > 0.7) {
        effectiveness = 0.8;
        priority = 'critical';
      } else if (failureMode.probability > 0.4) {
        effectiveness = 0.6;
        priority = 'high';
      }
      
      // Add parameter change suggestions where applicable
      let parameterChange: DesignSuggestion['parameterChange'] | undefined;
      
      switch (template.type) {
        case 'increase_wire_diameter':
          parameterChange = {
            parameter: 'd',
            currentValue: wireDiameter,
            suggestedValue: wireDiameter * 1.15,
            unit: 'mm',
          };
          break;
        case 'increase_active_coils':
          parameterChange = {
            parameter: 'Na',
            currentValue: activeCoils,
            suggestedValue: Math.ceil(activeCoils * 1.2),
            unit: '',
          };
          break;
        case 'increase_mean_diameter':
          if (springIndex < 6) {
            parameterChange = {
              parameter: 'Dm',
              currentValue: meanDiameter,
              suggestedValue: wireDiameter * 7,
              unit: 'mm',
            };
          }
          break;
      }
      
      suggestions.push({
        ...template,
        effectiveness,
        priority,
        parameterChange,
      });
    }
  }
  
  // Add general suggestions based on analysis results
  
  // Shot peening if fatigue is concern
  if (analysisResult.fatigue.infiniteLifeSafetyFactor < 2.0) {
    if (!suggestions.some(s => s.type === 'add_shot_peening')) {
      suggestions.push({
        ...SUGGESTION_TEMPLATES.add_shot_peening,
        effectiveness: 0.7,
        priority: 'high',
      });
    }
  }
  
  // Corrosion protection if environment is harsh
  if (options?.environment && options.environment.effectiveCorrosionFactor < 0.9) {
    if (!suggestions.some(s => s.type === 'add_corrosion_protection')) {
      suggestions.push({
        ...SUGGESTION_TEMPLATES.add_corrosion_protection,
        effectiveness: 0.8,
        priority: 'high',
      });
    }
  }
  
  // Guide rod for buckling
  if (springType === 'compression' && analysisResult.buckling && 
      analysisResult.buckling.bucklingSafetyFactor < 2.0) {
    if (!suggestions.some(s => s.type === 'add_guide_rod')) {
      suggestions.push({
        ...SUGGESTION_TEMPLATES.add_guide_rod,
        effectiveness: 0.95,
        priority: 'high',
      });
    }
  }
  
  // Sort by priority and effectiveness
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.effectiveness - a.effectiveness;
  });
  
  // Identify top priority and quick wins
  const topPriority = suggestions.filter(s => s.priority === 'critical' || s.priority === 'high').slice(0, 3);
  const quickWins = suggestions
    .filter(s => s.effectiveness > 0.5 && s.difficulty === 'easy')
    .slice(0, 3);
  
  // Generate summary
  let summary: { en: string; zh: string };
  if (suggestions.length === 0) {
    summary = {
      en: 'No design improvements needed. Current design meets all requirements.',
      zh: '无需设计改进。当前设计满足所有要求。',
    };
  } else {
    summary = {
      en: `${suggestions.length} design improvement(s) recommended. Top priority: ${topPriority[0]?.title.en ?? 'None'}`,
      zh: `建议 ${suggestions.length} 项设计改进。最高优先级：${topPriority[0]?.title.zh ?? '无'}`,
    };
  }
  
  return {
    suggestions,
    topPriority,
    quickWins,
    summary,
  };
}
