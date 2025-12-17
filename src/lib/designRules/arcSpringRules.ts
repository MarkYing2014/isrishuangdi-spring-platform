import type { ArcSpringInput } from "@/lib/arcSpring";
import { validateArcSpringInput } from "@/lib/arcSpring";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export type ArcSpringRuleContext = {
  showDeadCoils?: boolean;
  deadCoilsPerEnd?: number;
  deadCoilsStart?: number;
  deadCoilsEnd?: number;
  kGap?: number;
  nWarn?: number;
  nHigh?: number;
  wireLenWarnMm?: number;
  wireLenHighMm?: number;
};

export function buildArcSpringDesignRuleReport(
  input: ArcSpringInput | null | undefined,
  context?: ArcSpringRuleContext
): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const inferFieldFromMessage = (msg: string): string | undefined => {
    if (msg.includes("d")) return "d";
    if (msg.includes("D")) return "D";
    if (msg.includes("n")) return "n";
    if (msg.includes("r")) return "r";
    if (msg.includes("alpha0")) return "alpha0";
    if (msg.includes("alphaC")) return "alphaC";
    if (msg.includes("engageAngle2")) return "engageAngle2";
    return undefined;
  };

  if (!input) {
    findings.push({
      id: "arc.rules.missing_input",
      level: "info",
      titleEn: "No input available",
      titleZh: "暂无输入数据",
      detailEn: "Run calculation or provide inputs to see design rules.",
      detailZh: "请先输入参数并计算，以查看设计规则分析。",
    });

    return {
      summary: { status: summarizeRuleStatus(findings) },
      metrics,
      findings,
    };
  }

  const nWarn = context?.nWarn ?? designRulesDefaults.arc.nWarn;
  const nHigh = context?.nHigh ?? designRulesDefaults.arc.nHigh;
  const kGap = context?.kGap ?? designRulesDefaults.arc.kGap;
  const wireLenWarnMm = context?.wireLenWarnMm ?? designRulesDefaults.arc.wireLenWarnMm;
  const wireLenHighMm = context?.wireLenHighMm ?? designRulesDefaults.arc.wireLenHighMm;

  const deadStart =
    context?.deadCoilsStart ??
    ((context?.showDeadCoils ?? false) ? Math.max(0, Math.round(context?.deadCoilsPerEnd ?? 0)) : 0);
  const deadEnd =
    context?.deadCoilsEnd ??
    ((context?.showDeadCoils ?? false) ? Math.max(0, Math.round(context?.deadCoilsPerEnd ?? 0)) : 0);

  const deg2rad = (deg: number) => (deg * Math.PI) / 180;

  const nTotal = Math.max(1e-9, (input.n ?? 0) + deadStart + deadEnd);
  const alpha0Rad = deg2rad(input.alpha0 ?? 0);
  const alphaCRad = deg2rad(input.alphaC ?? 0);
  const lFree = (input.r ?? 0) * alpha0Rad;
  const lWork = (input.r ?? 0) * alphaCRad;
  const pFree = nTotal > 0 ? lFree / nTotal : NaN;
  const pWork = nTotal > 0 ? lWork / nTotal : NaN;
  const perTurn = Math.sqrt(Math.pow(Math.PI * (input.D ?? 0), 2) + Math.pow(pFree, 2));
  const wireLengthEstMm = isFinite(perTurn) ? perTurn * nTotal : NaN;

  metrics.n_total = {
    value: nTotal,
    unit: "turns",
    labelEn: "N_total (total turns)",
    labelZh: "N_total（总匝数）",
  };
  metrics.p_free = {
    value: isFinite(pFree) ? Number(pFree.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "p_free (arc turn spacing)",
    labelZh: "p_free（自由态弧长等效匝距）",
    noteEn: `Rule: p_free > ${kGap.toFixed(2)}·d`,
    noteZh: `规则：p_free > ${kGap.toFixed(2)}·d`,
  };
  metrics.p_work = {
    value: isFinite(pWork) ? Number(pWork.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "p_work (arc turn spacing)",
    labelZh: "p_work（工作末端弧长等效匝距）",
    noteEn: `Rule: p_work > ${kGap.toFixed(2)}·d`,
    noteZh: `规则：p_work > ${kGap.toFixed(2)}·d`,
  };
  metrics.wire_length_est = {
    value: isFinite(wireLengthEstMm) ? Number(wireLengthEstMm.toFixed(1)) : "-",
    unit: "mm",
    labelEn: "Estimated wire length",
    labelZh: "估算线长",
  };

  const baseErrors = validateArcSpringInput(input);
  let geomIdx = 0;
  for (const msg of baseErrors) {
    const field = inferFieldFromMessage(msg);
    const suffix = field ? `.${field}` : `.x${geomIdx++}`;
    findings.push({
      id: `ARC_GEOM_INVALID${suffix}`,
      level: "error",
      titleEn: "Invalid geometry inputs",
      titleZh: "几何输入不合法",
      detailEn: "Invalid geometry inputs (check d, D, n, r, alpha0, alphaC).",
      detailZh: "几何输入不合法（请检查 d, D, n, r, α0, αC）。",
      evidence: {
        ...(field ? { field } : {}),
        message: msg,
      },
    });
  }

  const springIndex = (input.d ?? 0) > 0 ? (input.D ?? 0) / (input.d ?? 1) : NaN;
  if (isFinite(springIndex) && springIndex > 0) {
    if (springIndex < designRulesDefaults.arc.springIndexPrefMin || springIndex > designRulesDefaults.arc.springIndexPrefMax) {
      findings.push({
        id: "ARC_SPRING_INDEX_OUTSIDE_PREF",
        level: "warning",
        titleEn: "Spring index is outside preferred range",
        titleZh: "弹簧指数超出推荐范围",
        detailEn: `Spring index C=${springIndex.toFixed(2)} is outside preferred range (${designRulesDefaults.arc.springIndexPrefMin}~${designRulesDefaults.arc.springIndexPrefMax}).`,
        detailZh: `弹簧指数 C=${springIndex.toFixed(2)} 超出推荐范围（${designRulesDefaults.arc.springIndexPrefMin}~${designRulesDefaults.arc.springIndexPrefMax}）。`,
        evidence: { field: "D", springIndex },
      });
    }
  }

  const deltaMax = (input.alpha0 ?? 0) - (input.alphaC ?? 0);
  if (isFinite(deltaMax) && deltaMax > 0 && deltaMax < 5) {
    findings.push({
      id: "arc.plausibility.small_working_angle_range",
      level: "warning",
      titleEn: "Working angle range is small",
      titleZh: "工作角度范围偏小",
      detailEn: "Working angle range (alpha0-alphaC) is small; curve may be less meaningful.",
      detailZh: "工作角范围（alpha0-alphaC）偏小；曲线意义可能有限。",
      evidence: { field: "alpha0", deltaMax },
    });
  }

  if (input.maxHousingDiameter !== undefined && input.maxHousingDiameter > 0) {
    const De = (input.D ?? 0) + (input.d ?? 0);
    const clearance = input.maxHousingDiameter - De;
    const minClearance = input.minClearance ?? 1;
    if (clearance < minClearance) {
      findings.push({
        id: "arc.plausibility.housing_clearance",
        level: "warning",
        titleEn: "Housing clearance is below minimum",
        titleZh: "外壳间隙小于最小值",
        detailEn: `Housing clearance ${clearance.toFixed(1)}mm < min ${minClearance}mm.`,
        detailZh: `外壳间隙 ${clearance.toFixed(1)}mm < 最小值 ${minClearance}mm。`,
        evidence: { field: "maxHousingDiameter", clearance, minClearance },
      });
    }
  }

  const mode = input.hysteresisMode ?? "none";
  if (mode === "constant" && (input.Tf_const ?? 0) <= 0) {
    findings.push({
      id: "arc.plausibility.hysteresis.constant_tf_zero",
      level: "warning",
      titleEn: "Constant hysteresis selected but Tf is 0",
      titleZh: "选择常量迟滞但 Tf 为 0",
      detailEn: "Constant hysteresis mode selected but Tf is 0.",
      detailZh: "选择常量迟滞模式但 Tf=0。",
      evidence: { field: "Tf_const" },
    });
  }
  if (mode === "proportional" && (input.cf ?? 0) <= 0) {
    findings.push({
      id: "arc.plausibility.hysteresis.proportional_cf_zero",
      level: "warning",
      titleEn: "Proportional hysteresis selected but cf is 0",
      titleZh: "选择比例迟滞但 cf 为 0",
      detailEn: "Proportional hysteresis mode selected but cf is 0.",
      detailZh: "选择比例迟滞模式但 cf=0。",
      evidence: { field: "cf" },
    });
  }

  if (isFinite(input.n) && input.n > nHigh) {
    findings.push({
      id: "ARC_TURNS_VERY_HIGH",
      level: "warning",
      titleEn: "High coil count",
      titleZh: "圈数偏大",
      detailEn: `High coil count (n=${input.n}) may increase wire length, cost, and packaging risk.`,
      detailZh: `圈数偏大（n=${input.n}）可能增加线长/成本/包装干涉风险。`,
      evidence: { field: "n", n: input.n, nHigh },
    });
  } else if (isFinite(input.n) && input.n > nWarn) {
    findings.push({
      id: "ARC_TURNS_HIGH",
      level: "warning",
      titleEn: "High coil count",
      titleZh: "圈数偏大",
      detailEn: `High coil count (n=${input.n}) may increase wire length, cost, and packaging risk.`,
      detailZh: `圈数偏大（n=${input.n}）可能增加线长/成本/包装干涉风险。`,
      evidence: { field: "n", n: input.n, nWarn },
    });
  }

  const d = input.d ?? NaN;
  const tightFree = isFinite(pFree) && isFinite(d) && pFree <= kGap * d;
  const tightWork = isFinite(pWork) && isFinite(d) && pWork <= kGap * d;

  if (tightFree) {
    const leD = isFinite(pFree) && isFinite(d) && pFree <= d;
    findings.push({
      id: "ARC_TURN_SPACING_FREE_TIGHT",
      level: "warning",
      titleEn: "Turn spacing is tight in free state",
      titleZh: "自由态圈距偏小",
      detailEn: `Turn spacing is tight in free state (p_free≈${pFree.toFixed(2)}mm, d=${d.toFixed(2)}mm). ${leD ? "p_free ≤ d." : ""}`,
      detailZh: `自由态圈距偏小（p_free≈${pFree.toFixed(2)}mm, d=${d.toFixed(2)}mm）。${leD ? "p_free ≤ d。" : ""}`,
      evidence: { field: "n", pFree, d, kGap },
    });
  }

  if (tightWork) {
    const leD = isFinite(pWork) && isFinite(d) && pWork <= d;
    findings.push({
      id: "ARC_TURN_SPACING_WORK_TIGHT",
      level: "warning",
      titleEn: "Turn spacing is tight at working state",
      titleZh: "工作态圈距偏小",
      detailEn: `Turn spacing is tight at working state (p_work≈${pWork.toFixed(2)}mm). ${leD ? "p_work ≤ d." : ""}`,
      detailZh: `工作态圈距偏小（p_work≈${pWork.toFixed(2)}mm）。${leD ? "p_work ≤ d。" : ""}`,
      evidence: { field: "n", pWork, d, kGap },
    });
  }

  if (isFinite(wireLengthEstMm) && wireLengthEstMm > wireLenHighMm) {
    findings.push({
      id: "ARC_WIRE_LENGTH_VERY_HIGH",
      level: "warning",
      titleEn: "Estimated wire length is high",
      titleZh: "估算线长偏大",
      detailEn: `Estimated wire length is high (${wireLengthEstMm.toFixed(0)}mm). Check manufacturability/cost.`,
      detailZh: `估算线长偏大（${wireLengthEstMm.toFixed(0)}mm），请关注可制造性/成本。`,
      evidence: { field: "n", wireLengthEstMm, wireLenHighMm },
    });
  } else if (isFinite(wireLengthEstMm) && wireLengthEstMm > wireLenWarnMm) {
    findings.push({
      id: "ARC_WIRE_LENGTH_HIGH",
      level: "warning",
      titleEn: "Estimated wire length is high",
      titleZh: "估算线长偏大",
      detailEn: `Estimated wire length is high (${wireLengthEstMm.toFixed(0)}mm). Check manufacturability/cost.`,
      detailZh: `估算线长偏大（${wireLengthEstMm.toFixed(0)}mm），请关注可制造性/成本。`,
      evidence: { field: "n", wireLengthEstMm, wireLenWarnMm },
    });
  }

  findings.push({
    id: "arc.info.n_effect",
    level: "info",
    titleEn: "Trend: n affects stiffness and cost",
    titleZh: "趋势：n 影响刚度与成本",
    detailEn: "Increasing n reduces stiffness and increases wire length, cost and handling risk.",
    detailZh: "n 增大会降低刚度并增加线长，从而提升成本与加工装配风险。",
  });

  findings.push({
    id: "arc.info.spacing_definition",
    level: "info",
    titleEn: "Arc turn spacing is not axial pitch",
    titleZh: "弧长等效匝距≠轴向节距",
    detailEn: "This module checks spacing along arc length (turn spacing). Axial pitch/coil-bind needs free-length model (not included).",
    detailZh: "当前模块检查沿弧长方向的匝距（等效匝距）。轴向节距/贴圈需要自由长度模型（当前未包含）。",
  });

  return {
    summary: { status: summarizeRuleStatus(findings) },
    metrics,
    findings,
  };
}
