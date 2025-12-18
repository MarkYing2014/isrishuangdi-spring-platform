import type { SpiralTorsionGeometry, AnalysisResult } from "@/lib/stores/springDesignStore";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export function buildSpiralSpringDesignRuleReport(params: {
  geometry?: SpiralTorsionGeometry | null;
  analysisResult?: AnalysisResult | null;
  context?: {
    edgeProcess?: "laser" | "blanked" | "fineblank" | "unknown";
    edgeDeburred?: boolean;
  };
}): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const g = params.geometry ?? null;
  const a = params.analysisResult ?? null;

  if (!g) {
    findings.push({
      id: "SPIRAL_NO_GEOMETRY",
      level: "info",
      titleEn: "No spiral spring data",
      titleZh: "暂无螺旋弹簧数据",
      detailEn: "Enter parameters and run calculation to see design rules.",
      detailZh: "请输入参数并计算，以查看设计规则。",
    });

    return { summary: { status: summarizeRuleStatus(findings) }, metrics, findings };
  }

  const w = g.stripWidth;
  const t = g.stripThickness;
  const Din = g.innerDiameter;
  const Dout = g.outerDiameter;
  const nEff = g.activeCoils;

  const thetaWorkDeg = g.maxWorkingAngle;
  const thetaWorkRad = (thetaWorkDeg * Math.PI) / 180;

  const rMin = Din > 0 ? Din / 2 : NaN;
  const epsMax = isFinite(t) && isFinite(rMin) && t > 0 && rMin > 0 ? t / (2 * rMin) : NaN;

  const diameterRatio = Din > 0 ? Dout / Din : NaN;
  const wtRatio = isFinite(t) && t > 0 ? w / t : NaN;

  metrics.eps_max = {
    value: isFinite(epsMax) ? Number(epsMax.toFixed(6)) : "-",
    labelEn: "Estimated max bending strain ε_max",
    labelZh: "估算最大弯曲应变 ε_max",
    noteEn: `OK ≤ ${designRulesDefaults.spiral.strain_ok}, Warn ≤ ${designRulesDefaults.spiral.strain_warn}`,
    noteZh: `OK ≤ ${designRulesDefaults.spiral.strain_ok}，警告 ≤ ${designRulesDefaults.spiral.strain_warn}`,
  };

  metrics.diameter_ratio = {
    value: isFinite(diameterRatio) ? Number(diameterRatio.toFixed(3)) : "-",
    labelEn: "Diameter ratio Dout/Din",
    labelZh: "内外径比 Dout/Din",
  };

  metrics.width_thickness_ratio = {
    value: isFinite(wtRatio) ? Number(wtRatio.toFixed(3)) : "-",
    labelEn: "Width/thickness ratio w/t",
    labelZh: "宽厚比 w/t",
  };

  metrics.n_eff = {
    value: isFinite(nEff) ? Number(nEff.toFixed(3)) : "-",
    labelEn: "Effective coils n_eff",
    labelZh: "有效圈数 n_eff",
  };

  metrics.theta_work = {
    value: isFinite(thetaWorkRad) ? Number(thetaWorkRad.toFixed(3)) : "-",
    unit: "rad",
    labelEn: "Working rotation θ_work",
    labelZh: "工作转角 θ_work",
    noteEn: `Warn > ${designRulesDefaults.spiral.theta_warn_rad.toFixed(3)}, Fail > ${designRulesDefaults.spiral.theta_fail_rad.toFixed(3)}`,
    noteZh: `警告 > ${designRulesDefaults.spiral.theta_warn_rad.toFixed(3)}，失败 > ${designRulesDefaults.spiral.theta_fail_rad.toFixed(3)}`,
  };

  if (!(isFinite(w) && w > 0) || !(isFinite(t) && t > 0) || !(isFinite(Din) && Din > 0) || !(isFinite(Dout) && Dout > 0)) {
    findings.push({
      id: "SPIRAL_GEOM_INVALID",
      level: "error",
      titleEn: "Invalid spiral spring geometry inputs",
      titleZh: "螺旋弹簧几何输入不合法",
      detailEn: "Invalid inputs (check w, t, Din, Dout).",
      detailZh: "输入不合法（请检查 w、t、Din、Dout）。",
      evidence: { field: "stripThickness" },
    });
  }

  if (isFinite(epsMax)) {
    if (epsMax > designRulesDefaults.spiral.strain_warn) {
      findings.push({
        id: "SPIRAL_STRAIN_TOO_HIGH",
        level: "error",
        titleEn: "Max bending strain is too high",
        titleZh: "最大弯曲应变过大",
        detailEn: `ε_max≈${(epsMax * 100).toFixed(2)}% > ${(designRulesDefaults.spiral.strain_warn * 100).toFixed(2)}%.`,
        detailZh: `最大弯曲应变 ε_max≈${(epsMax * 100).toFixed(2)}% > ${(designRulesDefaults.spiral.strain_warn * 100).toFixed(2)}%。`,
        evidence: { epsMax, t, rMin },
      });
    } else if (epsMax > designRulesDefaults.spiral.strain_ok) {
      findings.push({
        id: "SPIRAL_STRAIN_TOO_HIGH",
        level: "warning",
        titleEn: "Max bending strain is notable",
        titleZh: "最大弯曲应变偏高",
        detailEn: `ε_max≈${(epsMax * 100).toFixed(2)}% > ${(designRulesDefaults.spiral.strain_ok * 100).toFixed(2)}%.`,
        detailZh: `最大弯曲应变 ε_max≈${(epsMax * 100).toFixed(2)}% > ${(designRulesDefaults.spiral.strain_ok * 100).toFixed(2)}%。`,
        evidence: { epsMax, t, rMin },
      });
    }
  }

  if (isFinite(diameterRatio)) {
    if (diameterRatio < designRulesDefaults.spiral.diameter_ratio_ok_min || diameterRatio > designRulesDefaults.spiral.diameter_ratio_fail_max) {
      findings.push({
        id: "SPIRAL_DIAMETER_RATIO_BAD",
        level: "error",
        titleEn: "Diameter ratio is outside manufacturable range",
        titleZh: "内外径比超出可制造范围",
        detailEn: `Dout/Din=${diameterRatio.toFixed(2)} is outside allowed range.`,
        detailZh: `Dout/Din=${diameterRatio.toFixed(2)} 超出允许范围。`,
        evidence: { diameterRatio, Din, Dout },
      });
    } else if (diameterRatio > designRulesDefaults.spiral.diameter_ratio_ok_max) {
      findings.push({
        id: "SPIRAL_DIAMETER_RATIO_BAD",
        level: "warning",
        titleEn: "Diameter ratio is notable",
        titleZh: "内外径比偏离推荐范围",
        detailEn: `Dout/Din=${diameterRatio.toFixed(2)} > ${designRulesDefaults.spiral.diameter_ratio_ok_max}.`,
        detailZh: `Dout/Din=${diameterRatio.toFixed(2)} > ${designRulesDefaults.spiral.diameter_ratio_ok_max}。`,
        evidence: { diameterRatio, Din, Dout },
      });
    }
  }

  if (isFinite(wtRatio)) {
    const okMin = designRulesDefaults.spiral.width_thickness_ok_min;
    const okMax = designRulesDefaults.spiral.width_thickness_ok_max;
    const failMin = designRulesDefaults.spiral.width_thickness_fail_min;
    const failMax = designRulesDefaults.spiral.width_thickness_fail_max;

    if (wtRatio < failMin || wtRatio > failMax) {
      findings.push({
        id: "SPIRAL_WT_RATIO_BAD",
        level: "error",
        titleEn: "Width/thickness ratio is outside manufacturable range",
        titleZh: "宽厚比超出可制造范围",
        detailEn: `w/t=${wtRatio.toFixed(2)} is outside allowed range (${failMin}~${failMax}).`,
        detailZh: `w/t=${wtRatio.toFixed(2)} 超出允许范围（${failMin}~${failMax}）。`,
        evidence: { wtRatio, w, t },
      });
    } else if (wtRatio < okMin || wtRatio > okMax) {
      findings.push({
        id: "SPIRAL_WT_RATIO_BAD",
        level: "warning",
        titleEn: "Width/thickness ratio is notable",
        titleZh: "宽厚比偏离推荐范围",
        detailEn: `w/t=${wtRatio.toFixed(2)} outside preferred range (${okMin}~${okMax}).`,
        detailZh: `w/t=${wtRatio.toFixed(2)} 超出推荐范围（${okMin}~${okMax}）。`,
        evidence: { wtRatio, w, t },
      });
    }
  }

  if (isFinite(nEff)) {
    if (nEff > designRulesDefaults.spiral.n_fail) {
      findings.push({
        id: "SPIRAL_TURNS_TOO_HIGH",
        level: "error",
        titleEn: "Effective turns are too high",
        titleZh: "有效圈数过大",
        detailEn: `n_eff=${nEff.toFixed(1)} > ${designRulesDefaults.spiral.n_fail}.`,
        detailZh: `有效圈数 n_eff=${nEff.toFixed(1)} > ${designRulesDefaults.spiral.n_fail}。`,
        evidence: { nEff },
      });
    } else if (nEff > designRulesDefaults.spiral.n_warn) {
      findings.push({
        id: "SPIRAL_TURNS_TOO_HIGH",
        level: "warning",
        titleEn: "Effective turns are high",
        titleZh: "有效圈数偏大",
        detailEn: `n_eff=${nEff.toFixed(1)} > ${designRulesDefaults.spiral.n_warn}.`,
        detailZh: `有效圈数 n_eff=${nEff.toFixed(1)} > ${designRulesDefaults.spiral.n_warn}。`,
        evidence: { nEff },
      });
    }
  }

  if (isFinite(thetaWorkRad)) {
    if (thetaWorkRad > designRulesDefaults.spiral.theta_fail_rad) {
      findings.push({
        id: "SPIRAL_THETA_TOO_HIGH",
        level: "error",
        titleEn: "Working rotation is too high",
        titleZh: "工作转角过大",
        detailEn: `θ_work≈${thetaWorkRad.toFixed(2)} rad > ${designRulesDefaults.spiral.theta_fail_rad.toFixed(2)} rad.`,
        detailZh: `工作转角 θ_work≈${thetaWorkRad.toFixed(2)} rad > ${designRulesDefaults.spiral.theta_fail_rad.toFixed(2)} rad。`,
        evidence: { thetaWorkRad, thetaWorkDeg },
      });
    } else if (thetaWorkRad > designRulesDefaults.spiral.theta_warn_rad) {
      findings.push({
        id: "SPIRAL_THETA_TOO_HIGH",
        level: "warning",
        titleEn: "Working rotation is high",
        titleZh: "工作转角偏大",
        detailEn: `θ_work≈${thetaWorkRad.toFixed(2)} rad > ${designRulesDefaults.spiral.theta_warn_rad.toFixed(2)} rad.`,
        detailZh: `工作转角 θ_work≈${thetaWorkRad.toFixed(2)} rad > ${designRulesDefaults.spiral.theta_warn_rad.toFixed(2)} rad。`,
        evidence: { thetaWorkRad, thetaWorkDeg },
      });
    }
  }

  const thetaElasticRatio =
    isFinite(g.closeOutAngle) && g.closeOutAngle > 0 && isFinite(thetaWorkDeg)
      ? thetaWorkDeg / g.closeOutAngle
      : NaN;

  metrics.theta_ratio = {
    value: isFinite(thetaElasticRatio) ? Number(thetaElasticRatio.toFixed(3)) : "-",
    labelEn: "θ_work / θ_ref (close-out)",
    labelZh: "θ_work / θ_ref（close-out）",
    noteEn: "Heuristic: close-out angle used as reference",
    noteZh: "经验：使用 close-out 角作为参考",
  };

  if (isFinite(thetaElasticRatio)) {
    if (thetaElasticRatio > 0.9) {
      findings.push({
        id: "SPIRAL_THETA_RATIO_HIGH",
        level: "error",
        titleEn: "Working rotation exceeds recommended fraction of reference",
        titleZh: "工作转角超过参考比例",
        detailEn: `θ_work/θ_ref=${thetaElasticRatio.toFixed(2)} > 0.9.`,
        detailZh: `θ_work/θ_ref=${thetaElasticRatio.toFixed(2)} > 0.9。`,
        evidence: { thetaElasticRatio, thetaWorkDeg, thetaRefDeg: g.closeOutAngle },
      });
    } else if (thetaElasticRatio > 0.7) {
      findings.push({
        id: "SPIRAL_THETA_RATIO_HIGH",
        level: "warning",
        titleEn: "Working rotation is near reference limit",
        titleZh: "工作转角接近参考上限",
        detailEn: `θ_work/θ_ref=${thetaElasticRatio.toFixed(2)} > 0.7.`,
        detailZh: `θ_work/θ_ref=${thetaElasticRatio.toFixed(2)} > 0.7。`,
        evidence: { thetaElasticRatio, thetaWorkDeg, thetaRefDeg: g.closeOutAngle },
      });
    }
  }

  if (params.context?.edgeProcess) {
    const edgeProcess = params.context.edgeProcess;
    if (edgeProcess === "laser" || edgeProcess === "blanked") {
      findings.push({
        id: "SPIRAL_EDGE_PROCESS_INFO",
        level: "warning",
        titleEn: "Edge process may reduce fatigue life",
        titleZh: "边缘工艺可能影响疲劳寿命",
        detailEn: "Laser/blanking edges are sensitive to cracks. Consider deburr/polish/fineblank.",
        detailZh: "激光/冲裁边缘易引发裂纹，建议倒角/抛光/精冲等。",
        evidence: { edgeProcess },
      });
    } else {
      findings.push({
        id: "SPIRAL_EDGE_PROCESS_INFO",
        level: "info",
        titleEn: "Verify edge quality",
        titleZh: "请核对边缘质量",
        detailEn: "Edge quality has significant impact on fatigue life (deburr/polish recommended).",
        detailZh: "带材边缘质量对疲劳寿命影响很大（建议倒角/抛光）。",
        evidence: { edgeProcess },
      });
    }
  } else {
    findings.push({
      id: "SPIRAL_EDGE_PROCESS_INFO",
      level: "info",
      titleEn: "Verify edge quality",
      titleZh: "请核对边缘质量",
      detailEn: "Edge quality has significant impact on fatigue life (deburr/polish recommended).",
      detailZh: "带材边缘质量对疲劳寿命影响很大（建议倒角/抛光）。",
    });
  }

  if (a?.maxStress !== undefined && isFinite(a.maxStress) && a.staticSafetyFactor !== undefined && isFinite(a.staticSafetyFactor)) {
    const sigmaAllow = a.maxStress * a.staticSafetyFactor;
    metrics.allowable_stress_derived = {
      value: Number(sigmaAllow.toFixed(2)),
      unit: "MPa",
      labelEn: "Derived allowable stress (σ·SF)",
      labelZh: "反算许用应力（σ·SF）",
    };
  }

  findings.push({
    id: "SPIRAL_RULES_READ_ONLY",
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
