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

  const initialTension = a?.initialTension ?? g.initialTension ?? 0;
  const hasLoadCurve = (a?.workingLoad ?? 0) > 0 || xWork > 0;
  if (hasLoadCurve && !(isFinite(initialTension) && initialTension > 0)) {
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
