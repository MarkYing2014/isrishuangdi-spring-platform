import type { ConicalGeometry, AnalysisResult } from "@/lib/stores/springDesignStore";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export function buildConicalDesignRuleReport(params: {
  geometry?: ConicalGeometry | null;
  analysisResult?: AnalysisResult | null;
}): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const g = params.geometry ?? null;
  const a = params.analysisResult ?? null;

  if (!g) {
    findings.push({
      id: "CON_NO_GEOMETRY",
      level: "info",
      titleEn: "No conical spring data",
      titleZh: "暂无圆锥弹簧数据",
      detailEn: "Enter parameters and run calculation to see design rules.",
      detailZh: "请输入参数并计算，以查看设计规则。",
    });
    return { summary: { status: summarizeRuleStatus(findings) }, metrics, findings };
  }

  const d = g.wireDiameter;
  const Dmax = g.largeOuterDiameter;
  const Dmin = g.smallOuterDiameter;
  const Na = g.activeCoils;
  const Nt = g.totalCoils ?? Na;
  const L0 = g.freeLength;
  const dx = (a?.maxDeflection ?? a?.workingDeflection) ?? 0;

  const taperRatio = Dmin > 0 ? Dmax / Dmin : NaN;
  const DmMin = Dmin - d;
  const Cmin = d > 0 ? DmMin / d : NaN;
  const solidHeightEst = isFinite(Nt) && isFinite(d) ? Nt * d : NaN;

  metrics.taper_ratio = {
    value: isFinite(taperRatio) ? Number(taperRatio.toFixed(3)) : "-",
    labelEn: "Taper ratio Dmax/Dmin",
    labelZh: "锥度比 Dmax/Dmin",
  };

  metrics.c_min = {
    value: isFinite(Cmin) ? Number(Cmin.toFixed(3)) : "-",
    labelEn: "C_min (at small end)",
    labelZh: "小端旋绕比 C_min",
  };

  metrics.solid_height_est = {
    value: isFinite(solidHeightEst) ? Number(solidHeightEst.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "Estimated solid height (Nt·d)",
    labelZh: "估算并紧高度（Nt·d）",
  };

  if (!(isFinite(d) && d > 0) || !(isFinite(Dmax) && Dmax > d) || !(isFinite(Dmin) && Dmin > d) || !(isFinite(Na) && Na > 0) || !(isFinite(L0) && L0 > 0) || !(Dmax > Dmin)) {
    findings.push({
      id: "CON_GEOM_INVALID",
      level: "error",
      titleEn: "Invalid geometry inputs",
      titleZh: "几何输入不合法",
      detailEn: "Invalid geometry inputs (check d, Dmax, Dmin, Na, L0).",
      detailZh: "几何输入不合法（请检查 d、Dmax、Dmin、Na、L0）。",
      evidence: { field: "wireDiameter" },
    });
  }

  if (isFinite(taperRatio)) {
    if (taperRatio > designRulesDefaults.conical.taperRatioHigh) {
      findings.push({
        id: "CON_TAPER_RATIO_HIGH",
        level: "warning",
        titleEn: "High taper ratio",
        titleZh: "锥度比偏大",
        detailEn: `Dmax/Dmin=${taperRatio.toFixed(2)} > ${designRulesDefaults.conical.taperRatioHigh}.`,
        detailZh: `锥度比 Dmax/Dmin=${taperRatio.toFixed(2)} > ${designRulesDefaults.conical.taperRatioHigh}。`,
        evidence: { field: "largeOuterDiameter", taperRatio },
      });
    } else if (taperRatio > designRulesDefaults.conical.taperRatioWarn) {
      findings.push({
        id: "CON_TAPER_RATIO_WARN",
        level: "warning",
        titleEn: "Notable taper ratio",
        titleZh: "锥度比偏大",
        detailEn: `Dmax/Dmin=${taperRatio.toFixed(2)} > ${designRulesDefaults.conical.taperRatioWarn}.`,
        detailZh: `锥度比 Dmax/Dmin=${taperRatio.toFixed(2)} > ${designRulesDefaults.conical.taperRatioWarn}。`,
        evidence: { field: "largeOuterDiameter", taperRatio },
      });
    }
  }

  if (isFinite(Cmin) && Cmin < designRulesDefaults.conical.minIndexWarn) {
    findings.push({
      id: "CON_MIN_INDEX_LOW",
      level: "warning",
      titleEn: "Low spring index at small end",
      titleZh: "小端旋绕比偏低",
      detailEn: `C_min=${Cmin.toFixed(2)} < ${designRulesDefaults.conical.minIndexWarn}.`,
      detailZh: `小端旋绕比 C_min=${Cmin.toFixed(2)} < ${designRulesDefaults.conical.minIndexWarn}。`,
      evidence: { field: "smallOuterDiameter", Cmin },
    });
  }

  if (isFinite(L0) && isFinite(solidHeightEst) && isFinite(dx)) {
    const Lwork = L0 - dx;
    if (L0 <= solidHeightEst) {
      findings.push({
        id: "CON_BIND_AT_FREE",
        level: "error",
        titleEn: "Free length is not above solid height",
        titleZh: "自由长度不高于并紧高度",
        detailEn: `L0=${L0.toFixed(2)}mm ≤ Ls≈${solidHeightEst.toFixed(2)}mm.`,
        detailZh: `L0=${L0.toFixed(2)}mm ≤ Ls≈${solidHeightEst.toFixed(2)}mm。`,
        evidence: { field: "freeLength", L0, solidHeightEst },
      });
    } else if (Lwork <= solidHeightEst) {
      findings.push({
        id: "CON_BIND_RISK",
        level: "warning",
        titleEn: "Coil bind risk at selected deflection",
        titleZh: "在该压缩量下存在贴圈风险",
        detailEn: `L(defl)=${Lwork.toFixed(2)}mm ≤ Ls≈${solidHeightEst.toFixed(2)}mm.`,
        detailZh: `压缩后长度 L=${Lwork.toFixed(2)}mm ≤ Ls≈${solidHeightEst.toFixed(2)}mm。`,
        evidence: { field: "deflection", Lwork, solidHeightEst, dx },
      });
    }
  }

  findings.push({
    id: "CON_RULES_READ_ONLY",
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
