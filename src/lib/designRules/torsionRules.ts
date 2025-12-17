import type { TorsionGeometry, AnalysisResult } from "@/lib/stores/springDesignStore";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export function buildTorsionDesignRuleReport(params: {
  geometry?: TorsionGeometry | null;
  analysisResult?: AnalysisResult | null;
}): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const g = params.geometry ?? null;
  const a = params.analysisResult ?? null;

  if (!g) {
    findings.push({
      id: "TOR_NO_GEOMETRY",
      level: "info",
      titleEn: "No torsion spring data",
      titleZh: "暂无扭簧数据",
      detailEn: "Enter parameters and run calculation to see design rules.",
      detailZh: "请输入参数并计算，以查看设计规则。",
    });
    return { summary: { status: summarizeRuleStatus(findings) }, metrics, findings };
  }

  const d = g.wireDiameter;
  const Dm = g.meanDiameter;
  const C = d > 0 ? Dm / d : NaN;

  const thetaWork =
    (a?.workingDeflection ?? undefined) ?? g.workingAngle ?? g.thetaDo ?? 0;

  const stress =
    (a?.maxStress ?? undefined) ?? (a?.shearStress ?? undefined);

  metrics.spring_index = {
    value: isFinite(C) ? Number(C.toFixed(3)) : "-",
    labelEn: "Spring Index C = Dm/d",
    labelZh: "弹簧指数 C = Dm/d",
  };

  metrics.theta_work = {
    value: isFinite(thetaWork) ? Number(thetaWork.toFixed(2)) : "-",
    unit: "deg",
    labelEn: "Working deflection angle",
    labelZh: "工作扭转角",
  };

  if (stress !== undefined) {
    metrics.max_stress = {
      value: isFinite(stress) ? Number(stress.toFixed(2)) : "-",
      unit: "MPa",
      labelEn: "Max stress (approx)",
      labelZh: "最大应力（近似）",
    };
  }

  if (!(isFinite(d) && d > 0) || !(isFinite(Dm) && Dm > d) || !(isFinite(g.activeCoils) && g.activeCoils > 0)) {
    findings.push({
      id: "TOR_GEOM_INVALID",
      level: "error",
      titleEn: "Invalid geometry inputs",
      titleZh: "几何输入不合法",
      detailEn: "Invalid geometry inputs (check d, Dm, Na).",
      detailZh: "几何输入不合法（请检查 d、Dm、Na）。",
      evidence: { field: "wireDiameter" },
    });
  }

  if (isFinite(C)) {
    if (C < designRulesDefaults.torsion.springIndexPrefMin || C > designRulesDefaults.torsion.springIndexPrefMax) {
      findings.push({
        id: "TOR_INDEX_OUTSIDE_PREF",
        level: "warning",
        titleEn: "Spring index is outside preferred range",
        titleZh: "弹簧指数超出推荐范围",
        detailEn: `Spring index C=${C.toFixed(2)} outside preferred range (${designRulesDefaults.torsion.springIndexPrefMin}~${designRulesDefaults.torsion.springIndexPrefMax}).`,
        detailZh: `弹簧指数 C=${C.toFixed(2)} 超出推荐范围（${designRulesDefaults.torsion.springIndexPrefMin}~${designRulesDefaults.torsion.springIndexPrefMax}）。`,
        evidence: { field: "meanDiameter", C },
      });
    }
  }

  if (isFinite(thetaWork) && thetaWork > 0) {
    if (thetaWork > designRulesDefaults.torsion.deflectionHighDeg) {
      findings.push({
        id: "TOR_DEFLECTION_HIGH",
        level: "warning",
        titleEn: "Large torsion deflection angle",
        titleZh: "扭转角偏大",
        detailEn: `θ_work=${thetaWork.toFixed(1)}° > ${designRulesDefaults.torsion.deflectionHighDeg}°. May reduce fatigue life.`,
        detailZh: `工作扭转角 θ=${thetaWork.toFixed(1)}° > ${designRulesDefaults.torsion.deflectionHighDeg}°，可能降低疲劳寿命。`,
        evidence: { field: "workingAngle", thetaWork },
      });
    } else if (thetaWork > designRulesDefaults.torsion.deflectionWarnDeg) {
      findings.push({
        id: "TOR_DEFLECTION_WARN",
        level: "warning",
        titleEn: "Notable torsion deflection angle",
        titleZh: "扭转角偏大",
        detailEn: `θ_work=${thetaWork.toFixed(1)}° > ${designRulesDefaults.torsion.deflectionWarnDeg}°.`,
        detailZh: `工作扭转角 θ=${thetaWork.toFixed(1)}° > ${designRulesDefaults.torsion.deflectionWarnDeg}°。`,
        evidence: { field: "workingAngle", thetaWork },
      });
    }
  }

  if (stress !== undefined && isFinite(stress) && stress > 0) {
    if (stress > designRulesDefaults.torsion.stressHighMpa) {
      findings.push({
        id: "TOR_STRESS_HIGH",
        level: "warning",
        titleEn: "High stress",
        titleZh: "应力偏高",
        detailEn: `Stress≈${stress.toFixed(0)} MPa > ${designRulesDefaults.torsion.stressHighMpa} MPa.`,
        detailZh: `应力≈${stress.toFixed(0)} MPa > ${designRulesDefaults.torsion.stressHighMpa} MPa。`,
        evidence: { field: "workingAngle", stress },
      });
    } else if (stress > designRulesDefaults.torsion.stressWarnMpa) {
      findings.push({
        id: "TOR_STRESS_WARN",
        level: "warning",
        titleEn: "Notable stress",
        titleZh: "应力偏高",
        detailEn: `Stress≈${stress.toFixed(0)} MPa > ${designRulesDefaults.torsion.stressWarnMpa} MPa.`,
        detailZh: `应力≈${stress.toFixed(0)} MPa > ${designRulesDefaults.torsion.stressWarnMpa} MPa。`,
        evidence: { field: "workingAngle", stress },
      });
    }
  }

  const arm1 = g.legLength1;
  const arm2 = g.legLength2;
  if (isFinite(Dm) && Dm > 0 && (arm1 < 0.5 * Dm || arm2 < 0.5 * Dm)) {
    findings.push({
      id: "TOR_ARM_GEOM_RISK",
      level: "warning",
      titleEn: "Arm geometry may cause interference",
      titleZh: "臂部几何可能干涉",
      detailEn: "Arm length is relatively short; verify packaging clearance.",
      detailZh: "臂长相对较短，请核对装配间隙与干涉。",
      evidence: { field: "legLength1", arm1, arm2, Dm },
    });
  } else {
    findings.push({
      id: "TOR_ARM_GEOM_INFO",
      level: "info",
      titleEn: "Verify arm clearance",
      titleZh: "请核对臂部间隙",
      detailEn: "Arm geometry may cause interference; verify packaging clearance.",
      detailZh: "臂部几何可能干涉，请核对装配间隙。",
    });
  }

  findings.push({
    id: "TOR_RULES_READ_ONLY",
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
