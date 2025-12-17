import type { ConicalGeometry, AnalysisResult } from "@/lib/stores/springDesignStore";
import type { ConicalNonlinearResult, ConicalNonlinearCurvePoint } from "@/lib/springMath";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export function buildConicalDesignRuleReport(params: {
  geometry?: ConicalGeometry | null;
  analysisResult?: AnalysisResult | null;
  context?: {
    nonlinearResult?: ConicalNonlinearResult | null;
    nonlinearCurve?: ConicalNonlinearCurvePoint[] | null;
  };
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

  const DmMax = Dmax - d;
  const DmAvg = isFinite(DmMax) && isFinite(DmMin) ? 0.5 * (DmMax + DmMin) : NaN;
  const slenderness = isFinite(L0) && isFinite(DmAvg) && DmAvg > 0 ? L0 / DmAvg : NaN;

  metrics.taper_ratio = {
    value: isFinite(taperRatio) ? Number(taperRatio.toFixed(3)) : "-",
    labelEn: "Taper ratio Dmax/Dmin",
    labelZh: "锥度比 Dmax/Dmin",
  };

  metrics.slenderness = {
    value: isFinite(slenderness) ? Number(slenderness.toFixed(3)) : "-",
    labelEn: "Slenderness L0/Dm_avg",
    labelZh: "细长比 L0/Dm_avg",
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

  if (isFinite(taperRatio) && isFinite(slenderness)) {
    const taperWarn = designRulesDefaults.conical.guidanceTaperWarn;
    const slenderWarn = designRulesDefaults.conical.guidanceSlendernessWarn;
    if (taperRatio >= taperWarn && slenderness >= slenderWarn) {
      findings.push({
        id: "CON_GUIDANCE_RISK",
        level: "warning",
        titleEn: "Guidance/off-axis risk may be high",
        titleZh: "导向不足/偏载风险可能较高",
        detailEn: `Taper ratio=${taperRatio.toFixed(2)} and L0/Dm_avg=${slenderness.toFixed(2)}. Verify guidance and seating to avoid tilt/off-axis loading.`,
        detailZh: `锥度比=${taperRatio.toFixed(2)}，细长比 L0/Dm_avg=${slenderness.toFixed(2)}。请核对导向与端部贴合，避免倾斜/偏载。`,
        evidence: { taperRatio, slenderness, taperWarn, slenderWarn },
      });
    } else if (taperRatio >= taperWarn || slenderness >= slenderWarn) {
      findings.push({
        id: "CON_GUIDANCE_RISK",
        level: "warning",
        titleEn: "Guidance/off-axis risk should be verified",
        titleZh: "建议核对导向/偏载风险",
        detailEn: `Taper ratio=${taperRatio.toFixed(2)}, L0/Dm_avg=${slenderness.toFixed(2)}. Verify guidance and seating.`,
        detailZh: `锥度比=${taperRatio.toFixed(2)}，细长比 L0/Dm_avg=${slenderness.toFixed(2)}。建议核对导向与端部贴合。`,
        evidence: { taperRatio, slenderness, taperWarn, slenderWarn },
      });
    }
  }

  const nl = params.context?.nonlinearResult ?? null;
  const curve = params.context?.nonlinearCurve ?? nl?.curve ?? null;
  const dxWork = (a?.workingDeflection ?? a?.maxDeflection) ?? undefined;

  if (curve && curve.length > 0 && dxWork !== undefined && isFinite(dxWork)) {
    // Find nearest point
    let best = curve[0];
    let bestDist = Math.abs(curve[0].x - dxWork);
    for (const p of curve) {
      const dist = Math.abs(p.x - dxWork);
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }

    metrics.k_local = {
      value: isFinite(best.k) ? Number(best.k.toFixed(3)) : "-",
      unit: "N/mm",
      labelEn: "Local stiffness at working deflection",
      labelZh: "工作点局部刚度",
    };
    metrics.collapsed_coils = {
      value: isFinite(best.collapsedCoils) ? Number(best.collapsedCoils.toFixed(2)) : "-",
      labelEn: "Collapsed coils (nonlinear)",
      labelZh: "已贴合圈数（非线性）",
    };

    findings.push({
      id: "CON_NONLINEAR_STIFFNESS_INFO",
      level: "info",
      titleEn: "Nonlinear stiffness information",
      titleZh: "非线性刚度信息",
      detailEn: `At x≈${dxWork.toFixed(2)}mm, k≈${best.k.toFixed(2)} N/mm, collapsed≈${best.collapsedCoils.toFixed(1)} coils.`,
      detailZh: `在 x≈${dxWork.toFixed(2)}mm，k≈${best.k.toFixed(2)} N/mm，已贴合≈${best.collapsedCoils.toFixed(1)} 圈。`,
      evidence: { dxWork, kLocal: best.k, collapsedCoils: best.collapsedCoils },
    });

    if (nl && isFinite(nl.pitch) && isFinite(d) && d > 0) {
      const stage = Math.round(dxWork / nl.pitch);
      const stageX = stage * nl.pitch;
      const dist = Math.abs(dxWork - stageX);
      const thresh = designRulesDefaults.conical.stageProximityD * d;
      if (isFinite(dist) && dist <= thresh) {
        findings.push({
          id: "CON_NEAR_STAGE_TRANSITION",
          level: "warning",
          titleEn: "Working point near stiffness transition",
          titleZh: "工作点接近刚度拐点",
          detailEn: `x≈${dxWork.toFixed(2)}mm is within ${thresh.toFixed(2)}mm of a coil-collapse stage. Results may be sensitive to tolerances.`,
          detailZh: `工作点 x≈${dxWork.toFixed(2)}mm 距离贴合拐点小于 ${thresh.toFixed(2)}mm，结果可能对公差更敏感。`,
          evidence: { dxWork, stageX, dist, thresh, pitch: nl.pitch },
        });
      }
    }
  }

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
