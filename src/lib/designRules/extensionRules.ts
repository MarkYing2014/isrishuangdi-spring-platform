import type { ExtensionGeometry, AnalysisResult } from "@/lib/stores/springDesignStore";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export function buildExtensionDesignRuleReport(params: {
  geometry?: ExtensionGeometry | null;
  analysisResult?: AnalysisResult | null;
}): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const g = params.geometry ?? null;
  const a = params.analysisResult ?? null;

  if (!g) {
    findings.push({
      id: "EXT_NO_GEOMETRY",
      level: "info",
      titleEn: "No extension spring data",
      titleZh: "暂无拉簧数据",
      detailEn: "Enter parameters and run calculation to see design rules.",
      detailZh: "请输入参数并计算，以查看设计规则。",
    });
    return { summary: { status: summarizeRuleStatus(findings) }, metrics, findings };
  }

  const d = g.wireDiameter;
  const Dm = g.meanDiameter ?? g.outerDiameter - g.wireDiameter;
  const C = d > 0 ? Dm / d : NaN;

  const bodyLength = g.bodyLength;
  const xWork = a?.workingDeflection ?? 0;

  const initialTension = a?.initialTension ?? g.initialTension;
  const k = a?.springRate;
  const preExtensionMm =
    initialTension !== undefined && isFinite(initialTension) && initialTension > 0 &&
    k !== undefined && isFinite(k) && k > 0 && a?.springRateUnit === "N/mm"
      ? initialTension / k
      : undefined;

  metrics.spring_index = {
    value: isFinite(C) ? Number(C.toFixed(3)) : "-",
    labelEn: "Spring Index C = Dm/d",
    labelZh: "弹簧指数 C = Dm/d",
  };

  metrics.extension_ratio = {
    value: bodyLength > 0 ? Number((xWork / bodyLength).toFixed(3)) : "-",
    labelEn: "Extension ratio x/bodyLength",
    labelZh: "相对伸长 x/簧体长度",
  };

  metrics.initial_tension = {
    value: initialTension !== undefined && isFinite(initialTension) ? Number(initialTension.toFixed(3)) : "-",
    unit: "N",
    labelEn: "Initial tension Fi",
    labelZh: "初张力 Fi",
  };

  if (preExtensionMm !== undefined) {
    metrics.pre_extension = {
      value: isFinite(preExtensionMm) ? Number(preExtensionMm.toFixed(3)) : "-",
      unit: "mm",
      labelEn: "Pre-extension Fi/k",
      labelZh: "预伸长 Fi/k",
    };
  }

  if (!(isFinite(d) && d > 0) || !(isFinite(Dm) && Dm > d) || !(isFinite(g.activeCoils) && g.activeCoils > 0)) {
    findings.push({
      id: "EXT_GEOM_INVALID",
      level: "error",
      titleEn: "Invalid geometry inputs",
      titleZh: "几何输入不合法",
      detailEn: "Invalid geometry inputs (check d, OD/Dm, Na).",
      detailZh: "几何输入不合法（请检查 d、OD/Dm、Na）。",
      evidence: { field: "wireDiameter" },
    });
  }

  // ========== 新增：尺寸/成形要求规则 ==========
  
  const Na = g.activeCoils;
  const OD = g.outerDiameter;
  const freeLength = g.freeLength;
  
  // 1. 有效圈数合理性检查
  if (isFinite(Na)) {
    if (Na < designRulesDefaults.extension.activeCoilsMin) {
      findings.push({
        id: "EXT_ACTIVE_COILS_LOW",
        level: "error",
        titleEn: "Active coils too few",
        titleZh: "有效圈数过少",
        detailEn: `Na=${Na} < ${designRulesDefaults.extension.activeCoilsMin}. Spring will be unstable and difficult to manufacture.`,
        detailZh: `有效圈数 Na=${Na} < ${designRulesDefaults.extension.activeCoilsMin}，弹簧刚度不稳定且难以成形。`,
        evidence: { field: "activeCoils", Na },
      });
    } else if (Na < designRulesDefaults.extension.activeCoilsWarn) {
      findings.push({
        id: "EXT_ACTIVE_COILS_WARN",
        level: "warning",
        titleEn: "Active coils on the low side",
        titleZh: "有效圈数偏少",
        detailEn: `Na=${Na} < ${designRulesDefaults.extension.activeCoilsWarn}. Consider increasing for better stability.`,
        detailZh: `有效圈数 Na=${Na} < ${designRulesDefaults.extension.activeCoilsWarn}，建议增加以提高稳定性。`,
        evidence: { field: "activeCoils", Na },
      });
    }
  }

  // 2. 线径与外径比检查 (成形难度)
  if (isFinite(d) && isFinite(OD) && OD > 0) {
    const wireOdRatio = d / OD;
    metrics.wire_od_ratio = {
      value: Number(wireOdRatio.toFixed(3)),
      labelEn: "Wire/OD ratio d/OD",
      labelZh: "线径外径比 d/OD",
    };
    
    if (wireOdRatio < designRulesDefaults.extension.wireOdRatioMin) {
      findings.push({
        id: "EXT_WIRE_OD_RATIO_LOW",
        level: "warning",
        titleEn: "Wire diameter too small relative to OD",
        titleZh: "线径相对外径过小",
        detailEn: `d/OD=${wireOdRatio.toFixed(3)} < ${designRulesDefaults.extension.wireOdRatioMin}. Very thin wire, difficult to form and handle.`,
        detailZh: `d/OD=${wireOdRatio.toFixed(3)} < ${designRulesDefaults.extension.wireOdRatioMin}，线材过细，成形和操作困难。`,
        evidence: { field: "wireDiameter", wireOdRatio },
      });
    } else if (wireOdRatio > designRulesDefaults.extension.wireOdRatioMax) {
      findings.push({
        id: "EXT_WIRE_OD_RATIO_HIGH",
        level: "error",
        titleEn: "Wire diameter too large relative to OD",
        titleZh: "线径相对外径过大",
        detailEn: `d/OD=${wireOdRatio.toFixed(3)} > ${designRulesDefaults.extension.wireOdRatioMax}. Difficult to coil, high residual stress.`,
        detailZh: `d/OD=${wireOdRatio.toFixed(3)} > ${designRulesDefaults.extension.wireOdRatioMax}，难以卷绑，残余应力高。`,
        evidence: { field: "wireDiameter", wireOdRatio },
      });
    } else if (wireOdRatio > designRulesDefaults.extension.wireOdRatioWarn) {
      findings.push({
        id: "EXT_WIRE_OD_RATIO_WARN",
        level: "warning",
        titleEn: "Wire diameter relatively large",
        titleZh: "线径相对较大",
        detailEn: `d/OD=${wireOdRatio.toFixed(3)} > ${designRulesDefaults.extension.wireOdRatioWarn}. May be difficult to form.`,
        detailZh: `d/OD=${wireOdRatio.toFixed(3)} > ${designRulesDefaults.extension.wireOdRatioWarn}，成形可能有难度。`,
        evidence: { field: "wireDiameter", wireOdRatio },
      });
    }
  }

  // 3. 钩内自由长度合理性检查
  if (freeLength !== undefined && isFinite(freeLength) && isFinite(bodyLength) && bodyLength > 0) {
    const freeLengthRatio = freeLength / bodyLength;
    if (freeLengthRatio < designRulesDefaults.extension.freeLengthBodyLengthMin) {
      findings.push({
        id: "EXT_FREE_LENGTH_SHORT",
        level: "error",
        titleEn: "Free length inside hooks too short",
        titleZh: "钩内自由长度过短",
        detailEn: `Free length (${freeLength?.toFixed(1)}mm) < body length (${bodyLength.toFixed(1)}mm). Hooks would overlap with coils.`,
        detailZh: `钩内自由长度 (${freeLength?.toFixed(1)}mm) < 本体长度 (${bodyLength.toFixed(1)}mm)，钩子会与线圈重叠。`,
        evidence: { field: "freeLengthInsideHooks", freeLength, bodyLength },
      });
    }
  }

  // 4. 本体长度与中径比检查 (稳定性)
  if (isFinite(bodyLength) && isFinite(Dm) && Dm > 0) {
    const bodyDmRatio = bodyLength / Dm;
    metrics.body_dm_ratio = {
      value: Number(bodyDmRatio.toFixed(2)),
      labelEn: "Body/Dm ratio Lb/Dm",
      labelZh: "本体中径比 Lb/Dm",
    };
    
    if (bodyDmRatio < designRulesDefaults.extension.bodyDmRatioMin) {
      findings.push({
        id: "EXT_BODY_DM_RATIO_LOW",
        level: "warning",
        titleEn: "Body length very short relative to diameter",
        titleZh: "本体长度相对直径过短",
        detailEn: `Lb/Dm=${bodyDmRatio.toFixed(2)} < ${designRulesDefaults.extension.bodyDmRatioMin}. Very short spring, limited extension range.`,
        detailZh: `Lb/Dm=${bodyDmRatio.toFixed(2)} < ${designRulesDefaults.extension.bodyDmRatioMin}，弹簧过短，伸长范围有限。`,
        evidence: { field: "bodyLength", bodyDmRatio },
      });
    } else if (bodyDmRatio > designRulesDefaults.extension.bodyDmRatioMax) {
      findings.push({
        id: "EXT_BODY_DM_RATIO_HIGH",
        level: "error",
        titleEn: "Body length too long relative to diameter",
        titleZh: "本体长度相对直径过长",
        detailEn: `Lb/Dm=${bodyDmRatio.toFixed(2)} > ${designRulesDefaults.extension.bodyDmRatioMax}. Spring may buckle or tangle.`,
        detailZh: `Lb/Dm=${bodyDmRatio.toFixed(2)} > ${designRulesDefaults.extension.bodyDmRatioMax}，弹簧可能屈曲或缠绕。`,
        evidence: { field: "bodyLength", bodyDmRatio },
      });
    } else if (bodyDmRatio > designRulesDefaults.extension.bodyDmRatioWarn) {
      findings.push({
        id: "EXT_BODY_DM_RATIO_WARN",
        level: "warning",
        titleEn: "Body length relatively long",
        titleZh: "本体长度相对较长",
        detailEn: `Lb/Dm=${bodyDmRatio.toFixed(2)} > ${designRulesDefaults.extension.bodyDmRatioWarn}. Consider guidance or support.`,
        detailZh: `Lb/Dm=${bodyDmRatio.toFixed(2)} > ${designRulesDefaults.extension.bodyDmRatioWarn}，建议考虑导向或支撑。`,
        evidence: { field: "bodyLength", bodyDmRatio },
      });
    }
  }

  // 5. 钩型与弹簧指数匹配检查
  if (g.hookType && isFinite(C)) {
    const hookReqs = designRulesDefaults.extension.hookIndexRequirements[g.hookType];
    if (hookReqs) {
      if (C < hookReqs.min) {
        findings.push({
          id: "EXT_HOOK_INDEX_LOW",
          level: "warning",
          titleEn: `Spring index too low for ${g.hookType} hook`,
          titleZh: `弹簧指数对于${g.hookType}钩型过低`,
          detailEn: `C=${C.toFixed(2)} < ${hookReqs.min} for ${g.hookType} hook. Hook forming may be difficult.`,
          detailZh: `C=${C.toFixed(2)} < ${hookReqs.min}，${g.hookType}钩型成形可能困难。`,
          evidence: { field: "hookType", C, hookType: g.hookType, required: hookReqs },
        });
      } else if (C > hookReqs.max) {
        findings.push({
          id: "EXT_HOOK_INDEX_HIGH",
          level: "warning",
          titleEn: `Spring index too high for ${g.hookType} hook`,
          titleZh: `弹簧指数对于${g.hookType}钩型过高`,
          detailEn: `C=${C.toFixed(2)} > ${hookReqs.max} for ${g.hookType} hook. Hook may be weak or deform.`,
          detailZh: `C=${C.toFixed(2)} > ${hookReqs.max}，${g.hookType}钩型可能强度不足或变形。`,
          evidence: { field: "hookType", C, hookType: g.hookType, required: hookReqs },
        });
      }
    }
  }

  // ========== 原有规则继续 ==========

  if (isFinite(C)) {
    if (C < designRulesDefaults.extension.springIndexPrefMin || C > designRulesDefaults.extension.springIndexPrefMax) {
      findings.push({
        id: "EXT_INDEX_OUTSIDE_PREF",
        level: "warning",
        titleEn: "Spring index is outside preferred range",
        titleZh: "弹簧指数超出推荐范围",
        detailEn: `Spring index C=${C.toFixed(2)} outside preferred range (${designRulesDefaults.extension.springIndexPrefMin}~${designRulesDefaults.extension.springIndexPrefMax}).`,
        detailZh: `弹簧指数 C=${C.toFixed(2)} 超出推荐范围（${designRulesDefaults.extension.springIndexPrefMin}~${designRulesDefaults.extension.springIndexPrefMax}）。`,
        evidence: { field: "outerDiameter", C },
      });
    }

    if (g.hookType && C < designRulesDefaults.extension.hookRiskIndexWarn) {
      findings.push({
        id: "EXT_HOOK_RISK",
        level: "warning",
        titleEn: "Hook stress concentration risk",
        titleZh: "钩部应力集中风险",
        detailEn: `Hook enabled and C=${C.toFixed(2)} < ${designRulesDefaults.extension.hookRiskIndexWarn}. Consider larger C or shot peening.`,
        detailZh: `存在钩部且 C=${C.toFixed(2)} < ${designRulesDefaults.extension.hookRiskIndexWarn}，存在应力集中风险，可考虑增大 C 或喷丸等工艺。`,
        evidence: { field: "hookType", C },
      });
    }
  }

  const hasLoadCurve = (a?.workingLoad ?? 0) > 0 || xWork > 0;
  if (hasLoadCurve && !(initialTension !== undefined && isFinite(initialTension) && initialTension > 0)) {
    findings.push({
      id: "EXT_INITIAL_TENSION_MISSING",
      level: "warning",
      titleEn: "Initial tension not specified",
      titleZh: "未指定初张力",
      detailEn: "Initial tension not specified; load curve may be inaccurate.",
      detailZh: "未指定初张力，载荷曲线可能不准确。",
      evidence: { field: "initialTension" },
    });
  }

  if (preExtensionMm !== undefined && isFinite(bodyLength) && bodyLength > 0) {
    const ratio = preExtensionMm / bodyLength;
    const low = designRulesDefaults.extension.initialTensionPreExtRatioLow;
    const high = designRulesDefaults.extension.initialTensionPreExtRatioHigh;
    if (isFinite(ratio) && (ratio < low || ratio > high)) {
      findings.push({
        id: "EXT_INITIAL_TENSION_WINDOW",
        level: "warning",
        titleEn: "Initial tension may be outside recommended window",
        titleZh: "初张力可能超出推荐窗口",
        detailEn: `Fi/k≈${preExtensionMm.toFixed(2)}mm, ratio=${ratio.toFixed(3)} outside recommended (${low}~${high}).`,
        detailZh: `Fi/k≈${preExtensionMm.toFixed(2)}mm，比例=${ratio.toFixed(3)} 超出推荐范围（${low}~${high}）。`,
        evidence: { field: "initialTension", preExtensionMm, ratio, low, high },
      });
    }
  }

  if (isFinite(bodyLength) && bodyLength > 0 && isFinite(xWork) && xWork > 0) {
    const ratio = xWork / bodyLength;
    if (ratio > designRulesDefaults.extension.extensionRatioHigh) {
      findings.push({
        id: "EXT_MAX_EXTENSION_HIGH",
        level: "warning",
        titleEn: "Large extension relative to body length",
        titleZh: "相对伸长偏大",
        detailEn: `x/bodyLength=${ratio.toFixed(2)} > ${designRulesDefaults.extension.extensionRatioHigh}. May reduce fatigue life.`,
        detailZh: `相对伸长 x/簧体长度=${ratio.toFixed(2)} > ${designRulesDefaults.extension.extensionRatioHigh}，可能影响疲劳寿命。`,
        evidence: { field: "workingDeflection", ratio },
      });
    } else if (ratio > designRulesDefaults.extension.extensionRatioWarn) {
      findings.push({
        id: "EXT_MAX_EXTENSION_WARN",
        level: "warning",
        titleEn: "Extension ratio is notable",
        titleZh: "相对伸长偏大",
        detailEn: `x/bodyLength=${ratio.toFixed(2)} > ${designRulesDefaults.extension.extensionRatioWarn}.`,
        detailZh: `相对伸长 x/簧体长度=${ratio.toFixed(2)} > ${designRulesDefaults.extension.extensionRatioWarn}。`,
        evidence: { field: "workingDeflection", ratio },
      });
    }
  }

  findings.push({
    id: "EXT_RULES_READ_ONLY",
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
