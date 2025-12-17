import type { CompressionSpringEds } from "@/lib/eds/engineeringDefinition";
import type { ResolveCompressionNominalResult } from "@/lib/eds/compressionResolver";
import type { AnalysisResult } from "@/lib/stores/springDesignStore";

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

  const dx = (analysis?.maxDeflection ?? analysis?.workingDeflection) ?? 0;
  const Lwork = L0 !== undefined ? L0 - dx : undefined;
  const coilBindClearanceTarget = isFinite(d) ? coilBindClearanceFactor * d : undefined;
  const coilBindClearance =
    Lwork !== undefined && isFinite(solidHeightEst) ? Lwork - solidHeightEst : undefined;

  const slenderness = isFinite(L0) && isFinite(Dm) && Dm > 0 ? L0 / Dm : NaN;

  const pitchEst =
    isFinite(L0) && isFinite(solidHeightEst) && isFinite(Na) && Na > 1
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
