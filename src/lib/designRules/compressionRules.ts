import type { CompressionSpringEds } from "@/lib/eds/engineeringDefinition";
import type { ResolveCompressionNominalResult } from "@/lib/eds/compressionResolver";
import type { AnalysisResult } from "@/lib/stores/springDesignStore";
import { getSpringMaterial } from "@/lib/materials/springMaterials";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export type CompressionRuleContext = {
  minSpringIndexWarn?: number;
  minSpringIndexHigh?: number;
  maxSpringIndexWarn?: number;
  sfWarn?: number;
  sfFail?: number;
  slendernessWarn?: number;
  slendernessHigh?: number;
  coilBindClearanceFactor?: number;
  stressWarnMpa?: number;
  stressHighMpa?: number;
};

export function buildCompressionDesignRuleReport(params: {
  eds?: CompressionSpringEds | null;
  resolved?: ResolveCompressionNominalResult | null;
  analysisResult?: AnalysisResult | null;
  context?: CompressionRuleContext;
}): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const eds = params.eds ?? null;
  const resolved = params.resolved ?? null;
  const analysis = params.analysisResult ?? null;

  if (!eds || !resolved) {
    findings.push({
      id: "COMP_MISSING_INPUTS",
      level: "info",
      titleEn: "No resolved compression design available",
      titleZh: "暂无可用的压簧名义设计",
      detailEn: "Run calculation to generate EDS/resolved design before evaluating design rules.",
      detailZh: "请先进行一次计算生成 EDS/名义设计，再进行设计规则分析。",
    });

    return {
      summary: { status: summarizeRuleStatus(findings) },
      metrics,
      findings,
    };
  }

  const design = resolved.design;

  const d = design.wireDiameter;
  const Dm = design.meanDiameter;
  const Na = design.activeCoils;
  const Nt = eds.geometry.totalCoils.nominal;
  const L0 = design.freeLength;

  const C = d > 0 ? Dm / d : NaN;
  const solidHeightEst = isFinite(Nt) && isFinite(d) ? Nt * d : NaN;

  const sfWarn = params.context?.sfWarn ?? designRulesDefaults.compression.sfWarn;
  const sfFail = params.context?.sfFail ?? designRulesDefaults.compression.sfFail;

  const minCWarn = params.context?.minSpringIndexWarn ?? designRulesDefaults.compression.springIndexPrefMin;
  const minCHigh = params.context?.minSpringIndexHigh ?? designRulesDefaults.compression.springIndexVeryLowWarn;
  const maxCWarn = params.context?.maxSpringIndexWarn ?? designRulesDefaults.compression.springIndexPrefMax;

  const slenderWarn = params.context?.slendernessWarn ?? designRulesDefaults.compression.slendernessWarn;
  const slenderHigh = params.context?.slendernessHigh ?? designRulesDefaults.compression.slendernessHigh;

  const coilBindClearanceFactor =
    params.context?.coilBindClearanceFactor ?? designRulesDefaults.compression.coilBindClearanceFactor;

  const stressWarnMpa = params.context?.stressWarnMpa ?? designRulesDefaults.compression.stressWarnMpa;
  const stressHighMpa = params.context?.stressHighMpa ?? designRulesDefaults.compression.stressHighMpa;

  const allowShearUtilWarn = designRulesDefaults.compression.allowShearUtilWarn;
  const allowShearUtilFail = designRulesDefaults.compression.allowShearUtilFail;
  const naturalFreqWarnHz = designRulesDefaults.compression.naturalFreqWarnHz;

  const dx = (analysis?.maxDeflection ?? analysis?.workingDeflection) ?? 0;
  const Lwork = L0 !== undefined ? L0 - dx : undefined;
  const coilBindClearanceTarget = isFinite(d) ? coilBindClearanceFactor * d : undefined;
  const coilBindClearance =
    Lwork !== undefined && isFinite(solidHeightEst) ? Lwork - solidHeightEst : undefined;

  const slenderness =
    L0 !== undefined && isFinite(L0) && isFinite(Dm) && Dm > 0 ? L0 / Dm : NaN;

  const pitchEst =
    L0 !== undefined && isFinite(L0) && isFinite(solidHeightEst) && isFinite(Na) && Na > 1
      ? (L0 - solidHeightEst) / (Na - 1)
      : NaN;

  metrics.spring_index = {
    value: isFinite(C) ? Number(C.toFixed(3)) : "-",
    labelEn: "Spring Index C = Dm/d",
    labelZh: "旋绕比 C = Dm/d",
  };

  metrics.slenderness = {
    value: isFinite(slenderness) ? Number(slenderness.toFixed(3)) : "-",
    labelEn: "Slenderness L0/Dm",
    labelZh: "细长比 L0/Dm",
  };

  metrics.pitch_est = {
    value: isFinite(pitchEst) ? Number(pitchEst.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "Estimated free pitch (approx)",
    labelZh: "估算自由节距（近似）",
  };

  metrics.solid_height_est = {
    value: isFinite(solidHeightEst) ? Number(solidHeightEst.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "Estimated solid height (Nt·d)",
    labelZh: "估算并紧高度（Nt·d）",
  };

  metrics.free_length = {
    value: L0 !== undefined && isFinite(L0) ? Number(L0.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "Free length L0",
    labelZh: "自由长度 L0",
  };

  metrics.deflection = {
    value: isFinite(dx) ? Number(dx.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "Deflection (used for checks)",
    labelZh: "用于检查的压缩量",
  };

  if (Lwork !== undefined) {
    metrics.length_at_deflection = {
      value: isFinite(Lwork) ? Number(Lwork.toFixed(3)) : "-",
      unit: "mm",
      labelEn: "Length at deflection",
      labelZh: "压缩后长度",
    };
  }

  if (coilBindClearance !== undefined) {
    metrics.coil_bind_clearance = {
      value: isFinite(coilBindClearance) ? Number(coilBindClearance.toFixed(3)) : "-",
      unit: "mm",
      labelEn: "Clearance to solid (L - Ls)",
      labelZh: "距并紧余量（L - Ls）",
    };
  }

  if (analysis?.shearStress !== undefined) {
    metrics.shear_stress = {
      value: isFinite(analysis.shearStress) ? Number(analysis.shearStress.toFixed(3)) : "-",
      unit: "MPa",
      labelEn: "Shear stress τ",
      labelZh: "剪应力 τ",
    };
  }

  const materialId = design.materialId ?? eds.material.materialId;
  const material = materialId ? getSpringMaterial(materialId) : undefined;
  if (material) {
    metrics.allow_shear_static = {
      value: isFinite(material.allowShearStatic) ? Number(material.allowShearStatic.toFixed(0)) : "-",
      unit: "MPa",
      labelEn: "Allowable shear (static)",
      labelZh: "许用剪应力（静态）",
    };
  } else {
    findings.push({
      id: "COMP_MATERIAL_STRENGTH_UNKNOWN",
      level: "info",
      titleEn: "Material strength data not available",
      titleZh: "缺少材料强度数据",
      detailEn: "Allowable stress utilization checks are skipped because material properties are missing.",
      detailZh: "由于缺少材料属性，无法进行许用应力利用率检查。",
      evidence: { materialId },
    });
  }

  if (analysis?.staticSafetyFactor !== undefined) {
    metrics.sf_static = {
      value: isFinite(analysis.staticSafetyFactor) ? Number(analysis.staticSafetyFactor.toFixed(3)) : "-",
      labelEn: "Static safety factor SF",
      labelZh: "静态安全系数 SF",
      noteEn: `Warn < ${sfWarn}, Fail < ${sfFail}`,
      noteZh: `警告 < ${sfWarn}，失败 < ${sfFail}`,
    };
  }

  if (isFinite(C) && (C < minCWarn || C > maxCWarn)) {
    findings.push({
      id: "COMP_SPRING_INDEX_OUTSIDE_PREF",
      level: "warning",
      titleEn: "Spring index outside preferred range",
      titleZh: "弹簧指数超出推荐范围",
      detailEn: `Spring index C=${C.toFixed(2)} outside preferred range (${minCWarn}~${maxCWarn}).${C < minCHigh ? ` (C < ${minCHigh})` : ""}`,
      detailZh: `弹簧指数 C=${C.toFixed(2)} 超出推荐范围（${minCWarn}~${maxCWarn}）。${C < minCHigh ? `（C < ${minCHigh}）` : ""}`,
      evidence: { C, minCWarn, maxCWarn, minCHigh },
    });
  }

  if (L0 !== undefined && isFinite(L0) && isFinite(solidHeightEst)) {
    if (L0 <= solidHeightEst) {
      findings.push({
        id: "COMP_SOLID_HEIGHT_RISK",
        level: "error",
        titleEn: "Risk of coil bind / solid height",
        titleZh: "可能贴圈/并高风险",
        detailEn: `L0=${L0.toFixed(2)}mm ≤ Ls≈${solidHeightEst.toFixed(2)}mm.`,
        detailZh: `L0=${L0.toFixed(2)}mm ≤ Ls≈${solidHeightEst.toFixed(2)}mm。`,
        evidence: { L0, solidHeightEst, Nt, d },
      });
    } else if (
      Lwork !== undefined &&
      isFinite(Lwork) &&
      Lwork <= solidHeightEst + (coilBindClearanceTarget ?? 0)
    ) {
      findings.push({
        id: "COMP_SOLID_HEIGHT_RISK",
        level: "warning",
        titleEn: "Risk of coil bind / solid height",
        titleZh: "可能贴圈/并高风险",
        detailEn: `Risk of coil bind (L0 - x ≤ Ls). L(defl)=${Lwork.toFixed(2)}mm, Ls≈${solidHeightEst.toFixed(2)}mm.`,
        detailZh: `可能提前贴圈/并高（L0 - x ≤ Ls）。压缩后长度 L=${Lwork.toFixed(2)}mm，Ls≈${solidHeightEst.toFixed(2)}mm。`,
        evidence: { L0, dx, Lwork, solidHeightEst, coilBindClearanceTarget },
      });
    }
  }

  if (
    material &&
    analysis?.shearStress !== undefined &&
    isFinite(analysis.shearStress) &&
    isFinite(material.allowShearStatic) &&
    material.allowShearStatic > 0
  ) {
    const tau = analysis.shearStress;
    const util = tau / material.allowShearStatic;

    metrics.shear_utilization = {
      value: isFinite(util) ? Number(util.toFixed(3)) : "-",
      labelEn: "Shear utilization τ/τ_allow",
      labelZh: "剪应力利用率 τ/τ_allow",
      noteEn: `Warn ≥ ${allowShearUtilWarn}, Fail ≥ ${allowShearUtilFail}`,
      noteZh: `警告 ≥ ${allowShearUtilWarn}，失败 ≥ ${allowShearUtilFail}`,
    };

    if (util >= allowShearUtilFail) {
      findings.push({
        id: "COMP_ALLOW_SHEAR_EXCEEDED",
        level: "error",
        titleEn: "Allowable shear stress exceeded",
        titleZh: "超过许用剪应力",
        detailEn: `τ/τ_allow=${util.toFixed(2)} ≥ ${allowShearUtilFail}.` ,
        detailZh: `剪应力利用率 τ/τ_allow=${util.toFixed(2)} ≥ ${allowShearUtilFail}。`,
        evidence: { tau, allow: material.allowShearStatic, util, materialId: material.id },
      });
    } else if (util >= allowShearUtilWarn) {
      findings.push({
        id: "COMP_ALLOW_SHEAR_EXCEEDED",
        level: "warning",
        titleEn: "High shear utilization",
        titleZh: "剪应力利用率偏高",
        detailEn: `τ/τ_allow=${util.toFixed(2)} ≥ ${allowShearUtilWarn}.`,
        detailZh: `剪应力利用率 τ/τ_allow=${util.toFixed(2)} ≥ ${allowShearUtilWarn}。`,
        evidence: { tau, allow: material.allowShearStatic, util, materialId: material.id },
      });
    }
  }

  // Natural frequency (approx): f ≈ (1/2π)*sqrt(k/m_eff), m_eff≈m/3
  // Uses estimated wire length ≈ π·Dm·Nt and material density if available.
  if (material?.density !== undefined && isFinite(material.density) && material.density > 0) {
    const kNperMm = analysis?.springRate;
    if (kNperMm !== undefined && isFinite(kNperMm) && kNperMm > 0 && isFinite(Dm) && isFinite(d) && isFinite(Nt)) {
      const kNperM = kNperMm * 1000;
      const DmM = Dm / 1000;
      const dM = d / 1000;
      const wireLenM = Math.PI * DmM * Nt;
      const wireAreaM2 = Math.PI * Math.pow(dM, 2) / 4;
      const massKg = material.density * wireLenM * wireAreaM2;
      const meff = massKg / 3;
      const fHz = meff > 0 ? (1 / (2 * Math.PI)) * Math.sqrt(kNperM / meff) : NaN;

      metrics.natural_freq_hz = {
        value: isFinite(fHz) ? Number(fHz.toFixed(2)) : "-",
        unit: "Hz",
        labelEn: "Estimated natural frequency",
        labelZh: "估算固有频率",
      };

      if (isFinite(fHz) && fHz < naturalFreqWarnHz) {
        findings.push({
          id: "COMP_NATURAL_FREQ_LOW",
          level: "warning",
          titleEn: "Low natural frequency (surge risk)",
          titleZh: "固有频率偏低（可能共振）",
          detailEn: `Estimated f≈${fHz.toFixed(1)}Hz < ${naturalFreqWarnHz}Hz. Consider guidance/damping or design changes.`,
          detailZh: `估算固有频率 f≈${fHz.toFixed(1)}Hz < ${naturalFreqWarnHz}Hz，可能存在共振风险，可考虑导向/阻尼或调整设计。`,
          evidence: { fHz, naturalFreqWarnHz, kNperMm, Nt, Dm, d, materialId: material.id },
        });
      }
    }
  }

  if (analysis?.shearStress !== undefined && isFinite(analysis.shearStress)) {
    const tau = analysis.shearStress;
    if (tau > stressHighMpa) {
      findings.push({
        id: "COMP_STRESS_UTILIZATION_HIGH",
        level: "warning",
        titleEn: "High shear stress",
        titleZh: "剪应力偏高",
        detailEn: `High shear stress (τ≈${tau.toFixed(0)} MPa).`,
        detailZh: `剪应力偏高（τ≈${tau.toFixed(0)} MPa）。`,
        evidence: { tau, stressHighMpa },
      });
    } else if (tau > stressWarnMpa) {
      findings.push({
        id: "COMP_STRESS_UTILIZATION_HIGH",
        level: "warning",
        titleEn: "High shear stress",
        titleZh: "剪应力偏高",
        detailEn: `High shear stress (τ≈${tau.toFixed(0)} MPa).`,
        detailZh: `剪应力偏高（τ≈${tau.toFixed(0)} MPa）。`,
        evidence: { tau, stressWarnMpa },
      });
    }
  }

  if (isFinite(slenderness) && slenderness > slenderHigh) {
    findings.push({
      id: "COMP_SLENDERNESS_RISK",
      level: "warning",
      titleEn: "High slenderness may cause buckling",
      titleZh: "细长比偏高可能屈曲",
      detailEn: `L0/Dm=${slenderness.toFixed(2)} > ${slenderHigh}.`,
      detailZh: `细长比 L0/Dm=${slenderness.toFixed(2)} > ${slenderHigh}。`,
      evidence: { L0, Dm, slenderness, slenderHigh },
    });
  } else if (isFinite(slenderness) && slenderness > slenderWarn) {
    findings.push({
      id: "COMP_SLENDERNESS_RISK",
      level: "warning",
      titleEn: "Slenderness may cause buckling",
      titleZh: "细长比偏高可能屈曲",
      detailEn: `L0/Dm=${slenderness.toFixed(2)} > ${slenderWarn}.`,
      detailZh: `细长比 L0/Dm=${slenderness.toFixed(2)} > ${slenderWarn}。`,
      evidence: { L0, Dm, slenderness, slenderWarn },
    });
  }

  if (isFinite(pitchEst)) {
    findings.push({
      id: "COMP_PITCH_INFO",
      level: "info",
      titleEn: "Estimated pitch (informational)",
      titleZh: "估算节距（仅提示）",
      detailEn: `Estimated free pitch ≈ ${pitchEst.toFixed(2)}mm (approx).`,
      detailZh: `估算自由节距 ≈ ${pitchEst.toFixed(2)}mm（近似，仅提示）。`,
      evidence: { pitchEst, L0, solidHeightEst, Na },
    });
  }

  if (analysis?.staticSafetyFactor !== undefined && isFinite(analysis.staticSafetyFactor)) {
    const sf = analysis.staticSafetyFactor;
    if (sf < sfFail) {
      findings.push({
        id: "COMP_STATIC_SF_LOW",
        level: "error",
        titleEn: "Static safety factor is below limit",
        titleZh: "静态安全系数低于下限",
        detailEn: `SF=${sf.toFixed(2)} < ${sfFail}.`,
        detailZh: `SF=${sf.toFixed(2)} < ${sfFail}。`,
        evidence: { sf, sfFail },
      });
    } else if (sf < sfWarn) {
      findings.push({
        id: "COMP_STATIC_SF_LOW",
        level: "warning",
        titleEn: "Static safety factor is marginal",
        titleZh: "静态安全系数偏低",
        detailEn: `SF=${sf.toFixed(2)} < ${sfWarn}.`,
        detailZh: `SF=${sf.toFixed(2)} < ${sfWarn}。`,
        evidence: { sf, sfWarn },
      });
    }
  }

  findings.push({
    id: "COMP_RULES_READ_ONLY",
    level: "info",
    titleEn: "Rules are read-only",
    titleZh: "规则为只读旁路",
    detailEn: "This panel evaluates inputs/results and does not change geometry, calculation, or 3D.",
    detailZh: "该面板仅分析输入与结果，不会修改几何/计算/3D。",
  });

  return {
    summary: { status: summarizeRuleStatus(findings) },
    metrics,
    findings,
  };
}
