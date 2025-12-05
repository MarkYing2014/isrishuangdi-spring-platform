/**
 * Advanced Spring Engineering Report Generator
 * 高级弹簧工程报告生成器
 * 
 * Generates comprehensive PDF reports including Phase 4 analyses:
 * - Stress distribution
 * - Fatigue damage map
 * - Failure mode diagnostics
 * - Design suggestions
 * - Optimization results
 */

import type { SpringGeometry, WorkingConditions, SpringAnalysisResult } from '@/lib/engine/types';
import type { StressDistributionResult } from '@/lib/engine/stressDistribution';
import type { FatigueDamageResult } from '@/lib/engine/fatigueDamage';
import type { DiagnosticsResult } from '@/lib/engine/failureDiagnostics';
import type { SuggestionsResult } from '@/lib/engine/designSuggestions';
import type { OptimizationResult } from '@/lib/engine/optimizer';
import type { VerdictResult } from '@/lib/engine/verdict';
import type { DynamicsResult } from '@/lib/engine/dynamics';
import type { TemperatureEffectResult } from '@/lib/engine/temperature';
import type { CreepResult } from '@/lib/engine/creep';
import type { EnvironmentEffectResult } from '@/lib/engine/environment';
// Phase 6 imports
import type { CoilingProcessResult } from '@/lib/engine/coilingProcess';
import type { ShotPeeningResult } from '@/lib/engine/shotPeening';
import type { ScragTestResult } from '@/lib/engine/scragTest';
import type { ManufacturabilityResult } from '@/lib/engine/manufacturabilityCheck';
import type { StandardCheckResult } from '@/lib/engine/standardsCheck';
import type { MaterialRecommendationResult } from '@/lib/engine/materialRecommendation';
import type { MLPredictionResult } from '@/lib/engine/mlFatiguePredictor';
// Phase 7 imports
import type { CrackInitiationResult } from '@/lib/engine/phase7/crackInitiationProbability';
import type { CorrosionAnalysisResult } from '@/lib/engine/phase7/corrosionModel';
import type { CoatingSimulationResult } from '@/lib/engine/phase7/coatingSimulation';
import type { CostYieldPredictionResult } from '@/lib/engine/phase7/costYieldPredictor';
import type { HarmonicResponseResult } from '@/lib/engine/phase7/harmonicResponse';
import type { HealthDegradationResult } from '@/lib/engine/phase7/healthDegradation';
import type { HotspotTrackingResult } from '@/lib/engine/phase7/fractureHotspot';
import { getSpringMaterial } from '@/lib/materials/springMaterials';

/**
 * Advanced report data
 */
export interface AdvancedReportData {
  /** Basic report config */
  config: {
    companyName?: string;
    language: 'en' | 'zh' | 'bilingual';
    includeStressMap?: boolean;
    includeDamageMap?: boolean;
    includeDiagnostics?: boolean;
    includeSuggestions?: boolean;
    includeOptimization?: boolean;
  };
  /** Spring geometry */
  geometry: SpringGeometry;
  /** Working conditions */
  workingConditions: WorkingConditions;
  /** Basic analysis results */
  results: SpringAnalysisResult;
  /** Advanced analysis data */
  advanced?: {
    stressDistribution?: StressDistributionResult;
    fatigueDamage?: FatigueDamageResult;
    diagnostics?: DiagnosticsResult;
    suggestions?: SuggestionsResult;
    optimization?: OptimizationResult;
    verdict?: VerdictResult;
    dynamics?: DynamicsResult;
    temperature?: TemperatureEffectResult;
    creep?: CreepResult;
    environment?: EnvironmentEffectResult;
  };
  /** Phase 6 manufacturing & AI data */
  phase6?: {
    coilingProcess?: CoilingProcessResult;
    shotPeening?: ShotPeeningResult;
    scragTest?: ScragTestResult;
    manufacturability?: ManufacturabilityResult;
    standardsCheck?: {
      asme?: StandardCheckResult;
      sae?: StandardCheckResult;
      din?: StandardCheckResult;
    };
    materialRecommendation?: MaterialRecommendationResult;
    mlFatiguePrediction?: MLPredictionResult;
  };
  /** Phase 7 digital twin data */
  phase7?: {
    crackInitiation?: CrackInitiationResult;
    corrosion?: CorrosionAnalysisResult;
    coating?: CoatingSimulationResult;
    costYield?: CostYieldPredictionResult;
    harmonicResponse?: HarmonicResponseResult;
    healthDegradation?: HealthDegradationResult;
    hotspotTracking?: HotspotTrackingResult;
  };
}

/**
 * Format number
 */
function fmt(n: number, decimals = 2): string {
  return Number(n.toFixed(decimals)).toLocaleString();
}

/**
 * Get spring type name
 */
function getTypeName(type: string, lang: 'en' | 'zh'): string {
  const names: Record<string, { en: string; zh: string }> = {
    compression: { en: 'Compression Spring', zh: '压缩弹簧' },
    extension: { en: 'Extension Spring', zh: '拉伸弹簧' },
    torsion: { en: 'Torsion Spring', zh: '扭转弹簧' },
    conical: { en: 'Conical Spring', zh: '锥形弹簧' },
  };
  return names[type]?.[lang] ?? type;
}

/**
 * Generate stress distribution section HTML
 */
function generateStressDistributionSection(
  data: StressDistributionResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '应力分布分析' : 'Stress Distribution Analysis';
  const labels = {
    maxStress: lang === 'zh' ? '最大应力' : 'Maximum Stress',
    minStress: lang === 'zh' ? '最小应力' : 'Minimum Stress',
    avgStress: lang === 'zh' ? '平均应力' : 'Average Stress',
    criticalZones: lang === 'zh' ? '临界区域数' : 'Critical Zones',
    hotSpots: lang === 'zh' ? '热点数' : 'Hot Spots',
  };

  return `
    <div class="section">
      <h2>${title}</h2>
      <table>
        <tr><td>${labels.maxStress}</td><td><strong>${fmt(data.maxStress, 1)} MPa</strong></td></tr>
        <tr><td>${labels.minStress}</td><td>${fmt(data.minStress, 1)} MPa</td></tr>
        <tr><td>${labels.avgStress}</td><td>${fmt(data.avgStress, 1)} MPa</td></tr>
        <tr><td>${labels.criticalZones}</td><td class="${data.criticalZoneCount > 0 ? 'danger' : 'safe'}">${data.criticalZoneCount}</td></tr>
        <tr><td>${labels.hotSpots}</td><td>${data.hotSpots.length}</td></tr>
      </table>
      
      ${data.hotSpots.length > 0 ? `
        <h3>${lang === 'zh' ? '热点位置' : 'Hot Spot Locations'}</h3>
        <table class="small">
          <thead>
            <tr>
              <th>${lang === 'zh' ? '位置' : 'Location'}</th>
              <th>${lang === 'zh' ? '圈数' : 'Coil'}</th>
              <th>${lang === 'zh' ? '应力' : 'Stress'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.hotSpots.slice(0, 5).map(spot => `
              <tr>
                <td>θ = ${(spot.theta * 180 / Math.PI).toFixed(0)}°</td>
                <td>${spot.coilNumber.toFixed(1)}</td>
                <td class="danger">${fmt(spot.stress, 0)} MPa</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `;
}

/**
 * Generate fatigue damage section HTML
 */
function generateFatigueDamageSection(
  data: FatigueDamageResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '疲劳损伤分析' : 'Fatigue Damage Analysis';
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <div class="status-banner ${data.status}">
        ${lang === 'zh' ? data.message.zh : data.message.en}
      </div>
      <table>
        <tr>
          <td>${lang === 'zh' ? '最大损伤指数' : 'Max Damage Index'}</td>
          <td class="${data.maxDamageIndex > 0.5 ? 'danger' : 'safe'}"><strong>${data.maxDamageIndex.toFixed(4)}</strong></td>
        </tr>
        <tr>
          <td>${lang === 'zh' ? '平均损伤指数' : 'Avg Damage Index'}</td>
          <td>${data.avgDamageIndex.toFixed(4)}</td>
        </tr>
        <tr>
          <td>${lang === 'zh' ? 'Miner 累积损伤' : 'Miner Sum'}</td>
          <td class="${data.minerSum > 1 ? 'danger' : ''}">${data.minerSum.toFixed(4)}</td>
        </tr>
        <tr>
          <td>${lang === 'zh' ? '高损伤区域 (D>0.5)' : 'High Damage Zones (D>0.5)'}</td>
          <td class="${data.highDamageZoneCount > 0 ? 'warning' : ''}">${data.highDamageZoneCount}</td>
        </tr>
        <tr>
          <td>${lang === 'zh' ? '预测失效区域' : 'Failure Predicted'}</td>
          <td class="${data.failurePredictedCount > 0 ? 'danger' : 'safe'}">${data.failurePredictedCount}</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Generate diagnostics section HTML
 */
function generateDiagnosticsSection(
  data: DiagnosticsResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '失效模式诊断' : 'Failure Mode Diagnostics';
  
  if (data.failureModes.length === 0) {
    return `
      <div class="section">
        <h2>${title}</h2>
        <div class="status-banner safe">
          ${lang === 'zh' ? '未检测到显著失效模式 ✓' : 'No significant failure modes detected ✓'}
        </div>
      </div>
    `;
  }
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <div class="status-banner ${data.overallRisk}">
        ${lang === 'zh' ? data.summary.zh : data.summary.en}
      </div>
      <table>
        <thead>
          <tr>
            <th>${lang === 'zh' ? '失效模式' : 'Failure Mode'}</th>
            <th>${lang === 'zh' ? '严重程度' : 'Severity'}</th>
            <th>${lang === 'zh' ? '概率' : 'Probability'}</th>
            <th>${lang === 'zh' ? '数值依据' : 'Justification'}</th>
          </tr>
        </thead>
        <tbody>
          ${data.failureModes.map(mode => `
            <tr>
              <td><strong>${lang === 'zh' ? mode.name.zh : mode.name.en}</strong></td>
              <td class="${mode.severity}">${mode.severity.toUpperCase()}</td>
              <td>${(mode.probability * 100).toFixed(0)}%</td>
              <td class="mono">${mode.numericalJustification}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate suggestions section HTML
 */
function generateSuggestionsSection(
  data: SuggestionsResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '设计改进建议' : 'Design Improvement Suggestions';
  
  if (data.suggestions.length === 0) {
    return `
      <div class="section">
        <h2>${title}</h2>
        <p>${lang === 'zh' ? '当前设计满足所有要求，无需改进。' : 'Current design meets all requirements. No improvements needed.'}</p>
      </div>
    `;
  }
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <p>${lang === 'zh' ? data.summary.zh : data.summary.en}</p>
      
      ${data.topPriority.length > 0 ? `
        <h3>${lang === 'zh' ? '高优先级建议' : 'Top Priority'}</h3>
        <ul>
          ${data.topPriority.map(s => `
            <li>
              <strong>${lang === 'zh' ? s.title.zh : s.title.en}</strong>
              <br><span class="muted">${lang === 'zh' ? s.description.zh : s.description.en}</span>
              ${s.parameterChange ? `<br><code>${s.parameterChange.parameter}: ${s.parameterChange.currentValue.toFixed(2)} → ${s.parameterChange.suggestedValue.toFixed(2)} ${s.parameterChange.unit}</code>` : ''}
            </li>
          `).join('')}
        </ul>
      ` : ''}
      
      ${data.quickWins.length > 0 ? `
        <h3>${lang === 'zh' ? '快速改进' : 'Quick Wins'}</h3>
        <ul>
          ${data.quickWins.filter(s => !data.topPriority.includes(s)).map(s => `
            <li>
              <strong>${lang === 'zh' ? s.title.zh : s.title.en}</strong>
              <span class="badge">${s.difficulty}</span>
            </li>
          `).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

/**
 * Generate optimization section HTML
 */
function generateOptimizationSection(
  data: OptimizationResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '优化结果' : 'Optimization Results';
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <div class="status-banner ${data.status}">
        ${lang === 'zh' ? data.message.zh : data.message.en}
      </div>
      
      <h3>${lang === 'zh' ? '最优解' : 'Best Solution'}</h3>
      <table>
        <tr><td>${lang === 'zh' ? '线径 d' : 'Wire Diameter d'}</td><td><strong>${data.bestSolution.wireDiameter} mm</strong></td></tr>
        <tr><td>${lang === 'zh' ? '中径 Dm' : 'Mean Diameter Dm'}</td><td><strong>${data.bestSolution.meanDiameter} mm</strong></td></tr>
        <tr><td>${lang === 'zh' ? '有效圈数 Na' : 'Active Coils Na'}</td><td><strong>${data.bestSolution.activeCoils}</strong></td></tr>
        <tr><td>${lang === 'zh' ? '自由长度 L0' : 'Free Length L0'}</td><td><strong>${data.bestSolution.freeLength} mm</strong></td></tr>
        <tr><td>${lang === 'zh' ? '材料' : 'Material'}</td><td>${data.bestSolution.materialId}</td></tr>
      </table>
      
      <h3>${lang === 'zh' ? '预期性能' : 'Expected Performance'}</h3>
      <table>
        <tr><td>${lang === 'zh' ? '刚度 k' : 'Spring Rate k'}</td><td>${data.expectedPerformance.springRate} N/mm</td></tr>
        <tr><td>${lang === 'zh' ? '安全系数' : 'Safety Factor'}</td><td>${data.expectedPerformance.safetyFactor}</td></tr>
        <tr><td>${lang === 'zh' ? '质量' : 'Mass'}</td><td>${(data.expectedPerformance.mass * 1000).toFixed(1)} g</td></tr>
      </table>
      
      ${data.paretoFront.length > 1 ? `
        <h3>${lang === 'zh' ? 'Pareto 前沿解' : 'Pareto Front Solutions'}</h3>
        <table class="small">
          <thead>
            <tr>
              <th>d (mm)</th>
              <th>Dm (mm)</th>
              <th>Na</th>
              <th>SF</th>
              <th>${lang === 'zh' ? '质量' : 'Mass'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.paretoFront.slice(0, 5).map(sol => `
              <tr>
                <td>${sol.solution.wireDiameter}</td>
                <td>${sol.solution.meanDiameter}</td>
                <td>${sol.solution.activeCoils}</td>
                <td>${sol.objectives.safety.toFixed(2)}</td>
                <td>${(sol.objectives.mass * 1000).toFixed(1)}g</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `;
}

/**
 * Generate verdict section HTML
 */
function generateVerdictSection(
  data: VerdictResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '最终判定' : 'Final Verdict';
  
  return `
    <div class="section verdict">
      <h2>${title}</h2>
      <div class="verdict-banner ${data.status.toLowerCase().replace('_', '-')}">
        <div class="verdict-status">${data.status}</div>
        <div class="verdict-message">${lang === 'zh' ? data.message.zh : data.message.en}</div>
      </div>
      
      <h3>${lang === 'zh' ? '检查项目' : 'Criteria Check'}</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>${lang === 'zh' ? '项目' : 'Criterion'}</th>
            <th>${lang === 'zh' ? '实际值' : 'Actual'}</th>
            <th>${lang === 'zh' ? '要求' : 'Required'}</th>
          </tr>
        </thead>
        <tbody>
          ${data.criteria.map(c => `
            <tr class="${c.passed ? '' : c.severity}">
              <td>${c.passed ? '✓' : '✗'}</td>
              <td>${lang === 'zh' ? c.nameZh : c.name}</td>
              <td>${c.actualValue}</td>
              <td>${c.requiredValue}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${data.recommendations.length > 0 ? `
        <h3>${lang === 'zh' ? '建议' : 'Recommendations'}</h3>
        <ul>
          ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

/**
 * Generate manufacturing analysis section HTML (Phase 6)
 */
function generateManufacturingSection(
  coiling: CoilingProcessResult | undefined,
  shotPeening: ShotPeeningResult | undefined,
  scragTest: ScragTestResult | undefined,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '制造工艺分析' : 'Manufacturing Process Analysis';
  
  let content = `<div class="section"><h2>${title}</h2>`;
  
  // Coiling process
  if (coiling) {
    content += `
      <h3>${lang === 'zh' ? '卷绕工艺' : 'Coiling Process'}</h3>
      <table>
        <tr><td>${lang === 'zh' ? '残余弯曲应力' : 'Residual Bending Stress'}</td><td>${fmt(coiling.residualBendingStress, 1)} MPa</td></tr>
        <tr><td>${lang === 'zh' ? '残余扭转应力' : 'Residual Torsional Stress'}</td><td>${fmt(coiling.residualTorsionalStress, 1)} MPa</td></tr>
        <tr><td>${lang === 'zh' ? '回弹角' : 'Springback Angle'}</td><td>${fmt(coiling.springbackAngle, 2)}°</td></tr>
        <tr><td>${lang === 'zh' ? '补偿芯棒直径' : 'Compensated Mandrel'}</td><td>${fmt(coiling.compensatedMandrelDiameter, 2)} mm</td></tr>
        <tr><td>${lang === 'zh' ? '疲劳寿命折减系数' : 'Fatigue Life Reduction'}</td><td>${fmt(coiling.fatigueLifeReductionFactor, 3)}</td></tr>
      </table>
    `;
  }
  
  // Shot peening
  if (shotPeening) {
    content += `
      <h3>${lang === 'zh' ? '喷丸强化' : 'Shot Peening'}</h3>
      <table>
        <tr><td>${lang === 'zh' ? '表面残余压应力' : 'Surface Compressive Stress'}</td><td class="safe">${fmt(shotPeening.surfaceStress, 0)} MPa</td></tr>
        <tr><td>${lang === 'zh' ? '压应力层深度' : 'Compressive Layer Depth'}</td><td>${fmt(shotPeening.effectiveDepth, 3)} mm</td></tr>
        <tr><td>${lang === 'zh' ? '疲劳寿命提升' : 'Fatigue Life Improvement'}</td><td class="safe">${fmt(shotPeening.enduranceEnhancementFactor, 2)}×</td></tr>
        <tr><td>${lang === 'zh' ? '新疲劳极限' : 'New Endurance Limit'}</td><td>${fmt(shotPeening.newEnduranceLimit, 0)} MPa</td></tr>
        <tr><td>${lang === 'zh' ? '修正有效应力' : 'Corrected Effective Stress'}</td><td>${fmt(shotPeening.correctedEffectiveStress, 0)} MPa</td></tr>
      </table>
    `;
  }
  
  // Scrag test
  if (scragTest) {
    content += `
      <h3>${lang === 'zh' ? '立定处理' : 'Scrag Test / Setting'}</h3>
      <table>
        <tr><td>${lang === 'zh' ? '塑性应变' : 'Plastic Strain'}</td><td>${(scragTest.residualPlasticStrain * 100).toFixed(3)}%</td></tr>
        <tr><td>${lang === 'zh' ? '永久变形' : 'Permanent Set'}</td><td>${fmt(scragTest.permanentSet, 3)} mm (${fmt(scragTest.permanentSetPercent, 2)}%)</td></tr>
        <tr><td>${lang === 'zh' ? '新自由长度' : 'New Free Length'}</td><td>${fmt(scragTest.newFreeLength, 2)} mm</td></tr>
        <tr><td>${lang === 'zh' ? '新刚度' : 'New Spring Rate'}</td><td>${fmt(scragTest.newSpringRate, 2)} N/mm (${scragTest.springRateChange > 0 ? '+' : ''}${fmt(scragTest.springRateChange, 2)}%)</td></tr>
        <tr><td>${lang === 'zh' ? '立定应力' : 'Scrag Stress'}</td><td>${fmt(scragTest.scragStress, 0)} MPa</td></tr>
        <tr><td>${lang === 'zh' ? '稳定化' : 'Stabilization'}</td><td class="${scragTest.stabilizationAchieved ? 'safe' : 'warning'}">${scragTest.stabilizationAchieved ? '✓' : '✗'}</td></tr>
      </table>
    `;
  }
  
  content += '</div>';
  return content;
}

/**
 * Generate manufacturability check section HTML (Phase 6)
 */
function generateManufacturabilitySection(
  data: ManufacturabilityResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '可制造性评估' : 'Manufacturability Assessment';
  
  const statusClass = data.isManufacturable 
    ? (data.criticalCount === 0 && data.majorCount === 0 ? 'safe' : 'warning')
    : 'danger';
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <div class="status-banner ${statusClass}">
        ${data.summary}
      </div>
      <table>
        <tr><td>${lang === 'zh' ? '可制造性' : 'Manufacturable'}</td><td class="${data.isManufacturable ? 'safe' : 'danger'}">${data.isManufacturable ? '✓' : '✗'}</td></tr>
        <tr><td>${lang === 'zh' ? '难度评分' : 'Difficulty Score'}</td><td>${data.difficultyScore}/100</td></tr>
        <tr><td>${lang === 'zh' ? '严重问题' : 'Critical Issues'}</td><td class="${data.criticalCount > 0 ? 'danger' : ''}">${data.criticalCount}</td></tr>
        <tr><td>${lang === 'zh' ? '主要问题' : 'Major Issues'}</td><td class="${data.majorCount > 0 ? 'warning' : ''}">${data.majorCount}</td></tr>
        <tr><td>${lang === 'zh' ? '推荐工艺' : 'Recommended Process'}</td><td>${data.recommendedProcess}</td></tr>
      </table>
      
      ${data.issues.length > 0 ? `
        <h3>${lang === 'zh' ? '问题清单' : 'Issues'}</h3>
        <table class="small">
          <thead>
            <tr>
              <th>${lang === 'zh' ? '严重程度' : 'Severity'}</th>
              <th>${lang === 'zh' ? '问题' : 'Issue'}</th>
              <th>${lang === 'zh' ? '建议' : 'Suggestion'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.issues.map(issue => `
              <tr class="${issue.severity}">
                <td>${issue.severity.toUpperCase()}</td>
                <td>${issue.description}</td>
                <td>${issue.suggestion}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <h3>${lang === 'zh' ? '质量检查点' : 'QC Checkpoints'}</h3>
      <ul>
        ${data.qcCheckpoints.map(cp => `<li>${cp}</li>`).join('')}
      </ul>
    </div>
  `;
}

/**
 * Generate standards compliance section HTML (Phase 6)
 */
function generateStandardsSection(
  standards: { asme?: StandardCheckResult; sae?: StandardCheckResult; din?: StandardCheckResult },
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? '标准符合性检查' : 'Standards Compliance';
  
  const renderStandard = (std: StandardCheckResult) => {
    const statusClass = std.overallStatus === 'pass' ? 'safe' : 
      std.overallStatus === 'warning' ? 'warning' : 'danger';
    
    return `
      <div class="status-banner ${statusClass}" style="margin: 5px 0; padding: 8px;">
        <strong>${std.standard}</strong>: ${std.summary}
        <span class="badge">${std.passCount}/${std.checks.length} ${lang === 'zh' ? '通过' : 'passed'}</span>
      </div>
    `;
  };
  
  let content = `<div class="section"><h2>${title}</h2>`;
  
  if (standards.asme) content += renderStandard(standards.asme);
  if (standards.sae) content += renderStandard(standards.sae);
  if (standards.din) content += renderStandard(standards.din);
  
  // Detailed checks table
  const allChecks = [
    ...(standards.asme?.checks || []).map(c => ({ ...c, standard: 'ASME' })),
    ...(standards.sae?.checks || []).map(c => ({ ...c, standard: 'SAE J157' })),
    ...(standards.din?.checks || []).map(c => ({ ...c, standard: 'DIN 2089' })),
  ];
  
  if (allChecks.length > 0) {
    content += `
      <h3>${lang === 'zh' ? '详细检查结果' : 'Detailed Check Results'}</h3>
      <table class="small">
        <thead>
          <tr>
            <th></th>
            <th>${lang === 'zh' ? '标准' : 'Standard'}</th>
            <th>${lang === 'zh' ? '检查项' : 'Check'}</th>
            <th>${lang === 'zh' ? '实际值' : 'Actual'}</th>
            <th>${lang === 'zh' ? '要求' : 'Required'}</th>
          </tr>
        </thead>
        <tbody>
          ${allChecks.map(c => `
            <tr class="${c.status === 'fail' ? 'danger' : c.status === 'warning' ? 'warning' : ''}">
              <td>${c.status === 'pass' ? '✓' : c.status === 'warning' ? '⚠' : '✗'}</td>
              <td>${c.standard}</td>
              <td>${c.name}</td>
              <td>${c.actualValue}</td>
              <td>${c.limitValue}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  content += '</div>';
  return content;
}

/**
 * Generate ML fatigue prediction section HTML (Phase 6)
 */
function generateMLFatigueSection(
  data: MLPredictionResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? 'AI疲劳寿命预测' : 'AI Fatigue Life Prediction';
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <table>
        <tr><td>${lang === 'zh' ? 'ML预测寿命' : 'ML Predicted Life'}</td><td><strong>${data.predictedCycles.toExponential(2)} cycles</strong></td></tr>
        <tr><td>${lang === 'zh' ? '95%置信区间' : '95% Confidence Interval'}</td><td>${data.confidenceInterval.lower.toExponential(1)} - ${data.confidenceInterval.upper.toExponential(1)}</td></tr>
        <tr><td>${lang === 'zh' ? '传统计算寿命' : 'Traditional Calculated'}</td><td>${data.comparison.calculatedLife.toExponential(2)} cycles</td></tr>
        <tr><td>${lang === 'zh' ? '差异' : 'Difference'}</td><td>${data.comparison.differencePercent > 0 ? '+' : ''}${fmt(data.comparison.differencePercent, 1)}%</td></tr>
        <tr><td>${lang === 'zh' ? '预测可靠度' : 'Reliability Score'}</td><td>${data.reliabilityScore}/100</td></tr>
        <tr><td>${lang === 'zh' ? '模型类型' : 'Model Type'}</td><td>${data.modelType}</td></tr>
      </table>
      
      <h3>${lang === 'zh' ? '特征重要性' : 'Feature Importance'}</h3>
      <table class="small">
        <tbody>
          ${Object.entries(data.featureImportance)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([feature, importance]) => `
              <tr>
                <td>${feature}</td>
                <td>
                  <div style="background: #3182ce; height: 12px; width: ${importance * 300}px; border-radius: 2px;"></div>
                </td>
                <td>${(importance * 100).toFixed(1)}%</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generate material recommendation section HTML (Phase 6)
 */
function generateMaterialRecommendationSection(
  data: MaterialRecommendationResult,
  lang: 'en' | 'zh'
): string {
  const title = lang === 'zh' ? 'AI材料推荐' : 'AI Material Recommendation';
  
  const statusClass = data.designFeasible ? 'safe' : 'warning';
  
  return `
    <div class="section">
      <h2>${title}</h2>
      <div class="status-banner ${statusClass}">
        ${data.summary}
      </div>
      
      <h3>${lang === 'zh' ? '推荐材料' : 'Recommended Materials'}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>${lang === 'zh' ? '材料' : 'Material'}</th>
            <th>${lang === 'zh' ? '评分' : 'Score'}</th>
            <th>${lang === 'zh' ? '安全系数' : 'Safety Factor'}</th>
            <th>${lang === 'zh' ? '满足要求' : 'Meets Req.'}</th>
          </tr>
        </thead>
        <tbody>
          ${data.recommendations.slice(0, 5).map(rec => `
            <tr>
              <td>${rec.rank}</td>
              <td><strong>${rec.material.nameEn}</strong><br><span class="muted">${rec.material.nameZh}</span></td>
              <td>${fmt(rec.performance.overallScore, 0)}/100</td>
              <td>${fmt(rec.performance.safetyFactor, 2)}</td>
              <td class="${rec.performance.meetsRequirements ? 'safe' : 'warning'}">${rec.performance.meetsRequirements ? '✓' : '✗'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${data.generalSuggestions.length > 0 ? `
        <h3>${lang === 'zh' ? '通用建议' : 'General Suggestions'}</h3>
        <ul>
          ${data.generalSuggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

// ============================================================
// Phase 7 Report Sections
// ============================================================

/**
 * Generate Digital Twin section (crack initiation, corrosion, health)
 */
function generateDigitalTwinSection(
  phase7: NonNullable<AdvancedReportData['phase7']>,
  lang: 'en' | 'zh'
): string {
  const { crackInitiation, corrosion, healthDegradation } = phase7;
  
  return `
    <div class="section">
      <h2>${lang === 'zh' ? '数字孪生分析 (Phase 7)' : 'Digital Twin Analysis (Phase 7)'}</h2>
      
      ${crackInitiation ? `
        <h3>${lang === 'zh' ? '疲劳裂纹萌生概率' : 'Fatigue Crack Initiation Probability'}</h3>
        <table>
          <tr><td>${lang === 'zh' ? 'B10寿命 (10%失效)' : 'B10 Life (10% failure)'}</td><td><strong>${crackInitiation.B10Life.toExponential(2)} cycles</strong></td></tr>
          <tr><td>${lang === 'zh' ? 'B50寿命 (中位数)' : 'B50 Life (median)'}</td><td>${crackInitiation.B50Life.toExponential(2)} cycles</td></tr>
          <tr><td>${lang === 'zh' ? '特征寿命 η' : 'Characteristic Life η'}</td><td>${crackInitiation.characteristicLife.toExponential(2)} cycles</td></tr>
          <tr><td>${lang === 'zh' ? 'Weibull形状参数 β' : 'Weibull Shape β'}</td><td>${fmt(crackInitiation.effectiveWeibull.beta, 2)}</td></tr>
          <tr><td>${lang === 'zh' ? '风险等级' : 'Risk Level'}</td><td class="status-banner ${crackInitiation.riskLevel}">${crackInitiation.riskLevel.toUpperCase()}</td></tr>
        </table>
        <p class="muted">${lang === 'zh' ? '修正因子' : 'Modification Factors'}: 
          ${lang === 'zh' ? '表面' : 'Surface'}=${fmt(crackInitiation.modificationFactors.surface, 2)}, 
          ${lang === 'zh' ? '环境' : 'Environment'}=${fmt(crackInitiation.modificationFactors.environment, 2)}, 
          ${lang === 'zh' ? '平均应力' : 'Mean Stress'}=${fmt(crackInitiation.modificationFactors.meanStress, 2)}
        </p>
      ` : ''}
      
      ${corrosion ? `
        <h3>${lang === 'zh' ? '腐蚀影响分析' : 'Corrosion Impact Analysis'}</h3>
        <table>
          <tr><td>${lang === 'zh' ? '有效腐蚀速率' : 'Effective Corrosion Rate'}</td><td>${fmt(corrosion.effectiveCorrosionRate, 4)} mm/year</td></tr>
          <tr><td>${lang === 'zh' ? '腐蚀疲劳因子' : 'Corrosion Fatigue Factor'}</td><td>${fmt(corrosion.corrosionFatigueFactor, 2)}</td></tr>
          <tr><td>${lang === 'zh' ? '腐蚀后耐久极限' : 'Corroded Endurance Limit'}</td><td>${fmt(corrosion.corrodedEnduranceLimit, 0)} MPa</td></tr>
          <tr><td>${lang === 'zh' ? '临界厚度损失时间' : 'Time to Critical'}</td><td>${fmt(corrosion.timeToCritical, 1)} ${lang === 'zh' ? '年' : 'years'}</td></tr>
          <tr><td>${lang === 'zh' ? '点蚀风险' : 'Pitting Risk'}</td><td class="status-banner ${corrosion.pittingRisk}">${corrosion.pittingRisk.toUpperCase()}</td></tr>
          <tr><td>${lang === 'zh' ? 'SCC风险' : 'SCC Risk'}</td><td class="status-banner ${corrosion.sccRisk}">${corrosion.sccRisk.toUpperCase()}</td></tr>
        </table>
      ` : ''}
      
      ${healthDegradation ? `
        <h3>${lang === 'zh' ? '结构健康退化预测' : 'Structural Health Degradation'}</h3>
        <table>
          <tr><td>${lang === 'zh' ? '预测寿命终点' : 'Predicted End of Life'}</td><td><strong>${fmt(healthDegradation.endOfLife.predictedEOL, 1)} ${lang === 'zh' ? '年' : 'years'}</strong></td></tr>
          <tr><td>${lang === 'zh' ? '限制因素' : 'Limiting Factor'}</td><td>${healthDegradation.endOfLife.limitingFactor}</td></tr>
          <tr><td>${lang === 'zh' ? '建议更换时间' : 'Recommended Replacement'}</td><td>${fmt(healthDegradation.endOfLife.recommendedReplacement, 1)} ${lang === 'zh' ? '年' : 'years'}</td></tr>
          <tr><td>${lang === 'zh' ? '置信度' : 'Confidence'}</td><td>${fmt(healthDegradation.endOfLife.confidence * 100, 0)}%</td></tr>
        </table>
        ${healthDegradation.riskTimeline.length > 0 ? `
          <h4>${lang === 'zh' ? '风险时间线' : 'Risk Timeline'}</h4>
          <ul class="small">
            ${healthDegradation.riskTimeline.map(r => `
              <li><strong>${fmt(r.years, 1)} ${lang === 'zh' ? '年' : 'yr'}</strong>: 
                <span class="status-banner ${r.riskLevel}" style="padding: 2px 6px;">${r.riskLevel}</span> 
                ${r.description}
              </li>
            `).join('')}
          </ul>
        ` : ''}
      ` : ''}
    </div>
  `;
}

/**
 * Generate Cost & Yield section
 */
function generateCostYieldSection(data: CostYieldPredictionResult, lang: 'en' | 'zh'): string {
  return `
    <div class="section">
      <h2>${lang === 'zh' ? '成本与良率预测' : 'Cost & Yield Prediction'}</h2>
      
      <h3>${lang === 'zh' ? '成本明细' : 'Cost Breakdown'}</h3>
      <table>
        <tr><td>${lang === 'zh' ? '材料成本' : 'Material Cost'}</td><td>$${fmt(data.costBreakdown.materialCost, 4)}</td></tr>
        <tr><td>${lang === 'zh' ? '人工成本' : 'Labor Cost'}</td><td>$${fmt(data.costBreakdown.laborCost, 4)}</td></tr>
        <tr><td>${lang === 'zh' ? '机器成本' : 'Machine Cost'}</td><td>$${fmt(data.costBreakdown.machineCost, 4)}</td></tr>
        <tr><td>${lang === 'zh' ? '表面处理' : 'Surface Treatment'}</td><td>$${fmt(data.costBreakdown.treatmentCost, 4)}</td></tr>
        <tr><td>${lang === 'zh' ? '喷丸处理' : 'Shot Peening'}</td><td>$${fmt(data.costBreakdown.shotPeeningCost, 4)}</td></tr>
        <tr><td>${lang === 'zh' ? '检验成本' : 'Inspection Cost'}</td><td>$${fmt(data.costBreakdown.inspectionCost, 4)}</td></tr>
        <tr><td><strong>${lang === 'zh' ? '单件总成本' : 'Total Cost/Piece'}</strong></td><td><strong>$${fmt(data.costBreakdown.totalCostPerPiece, 3)}</strong></td></tr>
      </table>
      
      <h3>${lang === 'zh' ? '良率预测' : 'Yield Prediction'}</h3>
      <table>
        <tr><td>${lang === 'zh' ? '预期良率' : 'Expected Yield'}</td><td class="safe"><strong>${fmt(data.yieldPrediction.expectedYield, 1)}%</strong></td></tr>
        <tr><td>${lang === 'zh' ? '首次合格率' : 'First Pass Yield'}</td><td>${fmt(data.yieldPrediction.firstPassYield, 1)}%</td></tr>
        <tr><td>${lang === 'zh' ? '报废率' : 'Scrap Rate'}</td><td>${fmt(data.yieldPrediction.scrapRate, 2)}%</td></tr>
        <tr><td>Cpk</td><td>${fmt(data.yieldPrediction.cpk, 2)}</td></tr>
        <tr><td>DPMO</td><td>${fmt(data.yieldPrediction.dpmo, 0)}</td></tr>
        <tr><td>${lang === 'zh' ? 'Sigma水平' : 'Sigma Level'}</td><td>${fmt(data.yieldPrediction.sigmaLevel, 1)}σ</td></tr>
      </table>
      
      <h3>${lang === 'zh' ? '风险评估' : 'Risk Assessment'}</h3>
      <div class="status-banner ${data.riskFactors.riskLevel}">
        ${lang === 'zh' ? '总体风险等级' : 'Overall Risk Level'}: <strong>${data.riskFactors.riskLevel.toUpperCase()}</strong>
        (${lang === 'zh' ? '评分' : 'Score'}: ${fmt(data.riskFactors.overallRiskScore, 0)}/100)
      </div>
      
      ${data.recommendations.length > 0 ? `
        <h3>${lang === 'zh' ? '优化建议' : 'Recommendations'}</h3>
        <ul>
          ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

/**
 * Generate Harmonic Response section
 */
function generateHarmonicSection(data: HarmonicResponseResult, lang: 'en' | 'zh'): string {
  return `
    <div class="section">
      <h2>${lang === 'zh' ? '共振谐波响应分析' : 'Harmonic Response Analysis'}</h2>
      
      <h3>${lang === 'zh' ? '检测到的振动模态' : 'Detected Vibration Modes'}</h3>
      <table>
        <thead>
          <tr>
            <th>${lang === 'zh' ? '模态' : 'Mode'}</th>
            <th>${lang === 'zh' ? '类型' : 'Type'}</th>
            <th>${lang === 'zh' ? '频率' : 'Frequency'}</th>
            <th>${lang === 'zh' ? '质量参与' : 'Mass Participation'}</th>
          </tr>
        </thead>
        <tbody>
          ${data.detectedModes.slice(0, 6).map(mode => `
            <tr>
              <td>${mode.modeNumber}</td>
              <td>${mode.type}</td>
              <td><strong>${fmt(mode.frequency, 0)} Hz</strong></td>
              <td>${fmt(mode.massParticipation, 0)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${data.resonanceRisks.length > 0 ? `
        <h3>${lang === 'zh' ? '共振风险' : 'Resonance Risks'}</h3>
        ${data.resonanceRisks.map(risk => `
          <div class="status-banner ${risk.riskLevel}">
            <strong>${risk.mode.type}</strong> @ ${fmt(risk.operatingFrequency, 0)} Hz: 
            ${lang === 'zh' ? '放大系数' : 'Amplification'} = ${fmt(risk.amplificationFactor, 1)}x
            <br><span class="small">${risk.recommendation}</span>
          </div>
        `).join('')}
      ` : `
        <div class="status-banner safe">
          ${lang === 'zh' ? '未检测到显著共振风险' : 'No significant resonance risks detected'}
        </div>
      `}
      
      <h3>${lang === 'zh' ? '安全频率范围' : 'Safe Frequency Bands'}</h3>
      <ul>
        ${data.safeFrequencyBands.map(band => `
          <li>${fmt(band.min, 0)} - ${fmt(band.max, 0)} Hz</li>
        `).join('')}
      </ul>
      
      <div class="status-banner ${data.overallRisk}">
        ${lang === 'zh' ? '总体共振风险' : 'Overall Resonance Risk'}: <strong>${data.overallRisk.toUpperCase()}</strong>
      </div>
    </div>
  `;
}

/**
 * Generate Hotspot Tracking section
 */
function generateHotspotSection(data: HotspotTrackingResult, lang: 'en' | 'zh'): string {
  return `
    <div class="section">
      <h2>${lang === 'zh' ? '应力热点与断裂预测' : 'Stress Hotspots & Fracture Prediction'}</h2>
      
      <table>
        <tr><td>${lang === 'zh' ? '总热点数' : 'Total Hotspots'}</td><td>${data.hotspots.length}</td></tr>
        <tr><td>${lang === 'zh' ? '高风险热点' : 'Critical Hotspots'}</td><td class="${data.criticalHotspots.length > 0 ? 'danger' : ''}">${data.criticalHotspots.length}</td></tr>
        <tr><td>${lang === 'zh' ? '裂纹萌生点' : 'Nucleation Sites'}</td><td>${data.nucleationSites.length}</td></tr>
      </table>
      
      ${data.criticalHotspots.length > 0 ? `
        <h3>${lang === 'zh' ? '高风险热点详情' : 'Critical Hotspot Details'}</h3>
        <table>
          <thead>
            <tr>
              <th>${lang === 'zh' ? '位置' : 'Location'}</th>
              <th>${lang === 'zh' ? '类型' : 'Type'}</th>
              <th>${lang === 'zh' ? 'Von Mises应力' : 'Von Mises'}</th>
              <th>Kt</th>
              <th>${lang === 'zh' ? '风险' : 'Risk'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.criticalHotspots.slice(0, 5).map(h => `
              <tr>
                <td>${fmt(h.axialPosition * 100, 0)}%</td>
                <td>${h.locationType}</td>
                <td>${fmt(h.vonMisesStress, 0)} MPa</td>
                <td>${fmt(h.stressConcentrationFactor, 2)}</td>
                <td class="status-banner ${h.riskLevel}">${h.riskLevel}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      ${data.nucleationSites.length > 0 ? `
        <h3>${lang === 'zh' ? '裂纹萌生预测' : 'Crack Nucleation Prediction'}</h3>
        <table>
          <thead>
            <tr>
              <th>${lang === 'zh' ? '机制' : 'Mechanism'}</th>
              <th>${lang === 'zh' ? '方向' : 'Direction'}</th>
              <th>${lang === 'zh' ? '萌生周次' : 'Initiation Cycles'}</th>
              <th>${lang === 'zh' ? '扩展速率' : 'Growth Rate'}</th>
            </tr>
          </thead>
          <tbody>
            ${data.nucleationSites.slice(0, 3).map(site => `
              <tr>
                <td>${site.mechanism}</td>
                <td>${site.growthDirection}</td>
                <td>${site.initiationCycles.toExponential(1)}</td>
                <td>${site.growthRate.toExponential(1)} mm/cycle</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <div class="status-banner ${data.overallRisk}">
        ${lang === 'zh' ? '总体断裂风险' : 'Overall Fracture Risk'}: <strong>${data.overallRisk.toUpperCase()}</strong>
      </div>
      
      ${data.recommendations.length > 0 ? `
        <h3>${lang === 'zh' ? '建议' : 'Recommendations'}</h3>
        <ul>
          ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `;
}

/**
 * Generate complete advanced report HTML
 */
export function generateAdvancedReportHTML(data: AdvancedReportData): string {
  const { config, geometry, workingConditions, results, advanced, phase6, phase7 } = data;
  const lang = config.language === 'en' ? 'en' : 'zh';
  
  const material = getSpringMaterial(geometry.materialId);
  const materialName = material 
    ? (lang === 'zh' ? material.nameZh : material.nameEn)
    : geometry.materialId;

  const styles = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5; color: #333; padding: 20px; }
      h1 { font-size: 24px; margin-bottom: 10px; color: #1a365d; }
      h2 { font-size: 16px; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #3182ce; color: #2c5282; }
      h3 { font-size: 14px; margin: 15px 0 8px; color: #4a5568; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
      th { background: #f7fafc; font-weight: 600; }
      .section { margin-bottom: 25px; page-break-inside: avoid; }
      .status-banner { padding: 12px; border-radius: 6px; margin: 10px 0; font-weight: 500; }
      .status-banner.safe, .status-banner.success { background: #c6f6d5; color: #22543d; }
      .status-banner.warning, .status-banner.medium { background: #fefcbf; color: #744210; }
      .status-banner.danger, .status-banner.high, .status-banner.critical { background: #fed7d7; color: #742a2a; }
      .status-banner.failure { background: #742a2a; color: white; }
      .status-banner.low { background: #bee3f8; color: #2a4365; }
      .verdict-banner { text-align: center; padding: 20px; border-radius: 8px; margin: 15px 0; }
      .verdict-banner.pass { background: #c6f6d5; }
      .verdict-banner.conditional-pass { background: #fefcbf; }
      .verdict-banner.fail { background: #fed7d7; }
      .verdict-status { font-size: 28px; font-weight: bold; }
      .verdict-message { margin-top: 8px; }
      .safe { color: #22543d; }
      .warning { color: #744210; background: #fefcbf; }
      .danger, .critical, .high { color: #742a2a; background: #fed7d7; }
      .mono { font-family: monospace; font-size: 11px; }
      .muted { color: #718096; font-size: 11px; }
      .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; font-size: 10px; margin-left: 8px; }
      .small { font-size: 11px; }
      ul { margin: 10px 0; padding-left: 20px; }
      li { margin: 5px 0; }
      code { background: #edf2f7; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
      .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #3182ce; }
      .logo { font-size: 20px; font-weight: bold; color: #3182ce; }
      .date { color: #718096; }
      @media print { body { padding: 0; } .section { page-break-inside: avoid; } }
    </style>
  `;

  let sectionsHTML = '';
  
  // Basic geometry and results sections
  sectionsHTML += `
    <div class="section">
      <h2>${lang === 'zh' ? '弹簧参数' : 'Spring Parameters'}</h2>
      <table>
        <tr><td>${lang === 'zh' ? '类型' : 'Type'}</td><td><strong>${getTypeName(geometry.type, lang)}</strong></td></tr>
        <tr><td>${lang === 'zh' ? '材料' : 'Material'}</td><td>${materialName}</td></tr>
        <tr><td>${lang === 'zh' ? '线径 d' : 'Wire Diameter d'}</td><td>${geometry.wireDiameter} mm</td></tr>
        <tr><td>${lang === 'zh' ? '有效圈数 Na' : 'Active Coils Na'}</td><td>${geometry.activeCoils}</td></tr>
      </table>
    </div>
    
    <div class="section">
      <h2>${lang === 'zh' ? '应力分析' : 'Stress Analysis'}</h2>
      <table>
        <tr><td>${lang === 'zh' ? '有效应力 τ_eff' : 'Effective Stress τ_eff'}</td><td><strong>${fmt(results.stress.tauEffective, 1)} MPa</strong></td></tr>
        <tr><td>${lang === 'zh' ? 'Wahl 系数' : 'Wahl Factor'}</td><td>${fmt(results.stress.wahlFactor, 3)}</td></tr>
        <tr><td>${lang === 'zh' ? '静态安全系数' : 'Static Safety Factor'}</td><td class="${results.safety.staticSafetyFactor >= 1.5 ? 'safe' : 'warning'}">${fmt(results.safety.staticSafetyFactor, 2)}</td></tr>
      </table>
    </div>
    
    <div class="section">
      <h2>${lang === 'zh' ? '疲劳分析' : 'Fatigue Analysis'}</h2>
      <table>
        <tr><td>${lang === 'zh' ? '平均应力 τ_m' : 'Mean Stress τ_m'}</td><td>${fmt(results.fatigue.tauMean, 1)} MPa</td></tr>
        <tr><td>${lang === 'zh' ? '交变应力 τ_a' : 'Alternating Stress τ_a'}</td><td>${fmt(results.fatigue.tauAlt, 1)} MPa</td></tr>
        <tr><td>${lang === 'zh' ? '疲劳安全系数' : 'Fatigue Safety Factor'}</td><td>${fmt(results.fatigue.infiniteLifeSafetyFactor, 2)}</td></tr>
        <tr><td>${lang === 'zh' ? '预计寿命' : 'Estimated Life'}</td><td>${results.fatigue.estimatedCycles > 1e8 ? '∞' : results.fatigue.estimatedCycles.toExponential(2)} cycles</td></tr>
      </table>
    </div>
  `;
  
  // Advanced sections
  if (advanced?.stressDistribution && config.includeStressMap !== false) {
    sectionsHTML += generateStressDistributionSection(advanced.stressDistribution, lang);
  }
  
  if (advanced?.fatigueDamage && config.includeDamageMap !== false) {
    sectionsHTML += generateFatigueDamageSection(advanced.fatigueDamage, lang);
  }
  
  if (advanced?.diagnostics && config.includeDiagnostics !== false) {
    sectionsHTML += generateDiagnosticsSection(advanced.diagnostics, lang);
  }
  
  if (advanced?.suggestions && config.includeSuggestions !== false) {
    sectionsHTML += generateSuggestionsSection(advanced.suggestions, lang);
  }
  
  if (advanced?.optimization && config.includeOptimization !== false) {
    sectionsHTML += generateOptimizationSection(advanced.optimization, lang);
  }
  
  if (advanced?.verdict) {
    sectionsHTML += generateVerdictSection(advanced.verdict, lang);
  }

  // Phase 6 sections
  if (phase6?.coilingProcess || phase6?.shotPeening || phase6?.scragTest) {
    sectionsHTML += generateManufacturingSection(
      phase6.coilingProcess,
      phase6.shotPeening,
      phase6.scragTest,
      lang
    );
  }

  if (phase6?.manufacturability) {
    sectionsHTML += generateManufacturabilitySection(phase6.manufacturability, lang);
  }

  if (phase6?.standardsCheck && (phase6.standardsCheck.asme || phase6.standardsCheck.sae || phase6.standardsCheck.din)) {
    sectionsHTML += generateStandardsSection(phase6.standardsCheck, lang);
  }

  if (phase6?.mlFatiguePrediction) {
    sectionsHTML += generateMLFatigueSection(phase6.mlFatiguePrediction, lang);
  }

  if (phase6?.materialRecommendation) {
    sectionsHTML += generateMaterialRecommendationSection(phase6.materialRecommendation, lang);
  }

  // Phase 7 Digital Twin sections
  if (phase7?.crackInitiation || phase7?.corrosion || phase7?.healthDegradation) {
    sectionsHTML += generateDigitalTwinSection(phase7, lang);
  }

  if (phase7?.costYield) {
    sectionsHTML += generateCostYieldSection(phase7.costYield, lang);
  }

  if (phase7?.harmonicResponse) {
    sectionsHTML += generateHarmonicSection(phase7.harmonicResponse, lang);
  }

  if (phase7?.hotspotTracking) {
    sectionsHTML += generateHotspotSection(phase7.hotspotTracking, lang);
  }

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${lang === 'zh' ? '弹簧工程分析报告' : 'Spring Engineering Analysis Report'}</title>
  ${styles}
</head>
<body>
  <div class="header">
    <div class="logo">${config.companyName || 'ISRI-SHUANGDI'}</div>
    <div class="date">${new Date().toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US')}</div>
  </div>
  
  <h1>${lang === 'zh' ? '弹簧工程分析报告' : 'Spring Engineering Analysis Report'}</h1>
  
  ${sectionsHTML}
  
  <div class="section" style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 10px;">
    ${lang === 'zh' ? '本报告由 ISRI-SHUANGDI 弹簧工程平台自动生成' : 'This report was automatically generated by ISRI-SHUANGDI Spring Engineering Platform'}
    <br>
    ${lang === 'zh' ? '生成时间' : 'Generated'}: ${new Date().toISOString()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Print advanced report
 */
export function printAdvancedReport(data: AdvancedReportData): void {
  const html = generateAdvancedReportHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }
}

/**
 * Download advanced report as HTML
 */
export function downloadAdvancedReport(data: AdvancedReportData, filename?: string): void {
  const html = generateAdvancedReportHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `spring-advanced-report-${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
