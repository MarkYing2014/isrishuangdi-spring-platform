import type { VariablePitchSegment } from "@/lib/springMath";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export function buildVariablePitchCompressionDesignRuleReport(params: {
  wireDiameter: number;
  meanDiameter: number;
  totalCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
}): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const d = params.wireDiameter;
  const Dm = params.meanDiameter;
  const freeLength = params.freeLength;

  const segments = params.segments ?? [];
  const pitches = segments.map((s) => s.pitch);
  const minPitch = pitches.length ? Math.min(...pitches) : NaN;

  metrics.min_pitch = {
    value: isFinite(minPitch) ? Number(minPitch.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "Min pitch",
    labelZh: "最小节距",
  };

  metrics.segment_count = {
    value: segments.length,
    labelEn: "Segment count",
    labelZh: "分段数量",
  };

  if (!(isFinite(d) && d > 0) || !(isFinite(Dm) && Dm > d)) {
    findings.push({
      id: "VP_GEOM_INVALID",
      level: "error",
      titleEn: "Invalid geometry inputs",
      titleZh: "几何输入不合法",
      detailEn: "Invalid geometry inputs (check d, Dm).",
      detailZh: "几何输入不合法（请检查 d、Dm）。",
      evidence: { field: "wireDiameter" },
    });
  }

  const nonPositive = segments.find((s) => !(isFinite(s.pitch) && s.pitch > 0));
  if (nonPositive) {
    findings.push({
      id: "VP_PITCH_NONPOSITIVE",
      level: "error",
      titleEn: "Non-positive pitch",
      titleZh: "存在非正节距",
      detailEn: "At least one segment has pitch ≤ 0.",
      detailZh: "至少有一段节距 ≤ 0。",
      evidence: { field: "segments", pitch: nonPositive.pitch },
    });
  }

  if (isFinite(minPitch) && isFinite(d)) {
    const warnLimit = designRulesDefaults.variablePitch.pitchMinFactorWarn * d;
    if (minPitch <= d) {
      findings.push({
        id: "VP_PITCH_TOO_SMALL_LE_D",
        level: designRulesDefaults.variablePitch.pitchLEdSeverity === "warning" ? "warning" : "error",
        titleEn: "Pitch is very small",
        titleZh: "节距很小",
        detailEn: `min(pitch)=${minPitch.toFixed(2)}mm ≤ d=${d.toFixed(2)}mm.`,
        detailZh: `最小节距 min(pitch)=${minPitch.toFixed(2)}mm ≤ d=${d.toFixed(2)}mm。`,
        evidence: { field: "segments", minPitch, d },
      });
    } else if (minPitch <= warnLimit) {
      findings.push({
        id: "VP_PITCH_TOO_SMALL",
        level: "warning",
        titleEn: "Pitch is tight",
        titleZh: "节距偏小",
        detailEn: `min(pitch)=${minPitch.toFixed(2)}mm ≤ ${designRulesDefaults.variablePitch.pitchMinFactorWarn.toFixed(2)}·d.`,
        detailZh: `最小节距 min(pitch)=${minPitch.toFixed(2)}mm ≤ ${designRulesDefaults.variablePitch.pitchMinFactorWarn.toFixed(2)}·d。`,
        evidence: { field: "segments", minPitch, d },
      });
    }
  }

  if (segments.length >= 2) {
    const inc = pitches.every((p, i) => i === 0 || p >= pitches[i - 1]);
    const dec = pitches.every((p, i) => i === 0 || p <= pitches[i - 1]);
    if (!inc && !dec) {
      findings.push({
        id: "VP_PITCH_MONOTONICITY_INFO",
        level: "info",
        titleEn: "Pitch is not monotonic",
        titleZh: "节距非单调",
        detailEn: "Pitch is not monotonic across segments (informational).",
        detailZh: "各段节距不满足单调性（仅提示）。",
        evidence: { field: "segments" },
      });
    }
  }

  if (freeLength !== undefined && isFinite(freeLength) && segments.length > 0) {
    const sumLength = segments.reduce((acc, s) => acc + (s.coils ?? 0) * (s.pitch ?? 0), 0);
    metrics.sum_pitch_length = {
      value: isFinite(sumLength) ? Number(sumLength.toFixed(2)) : "-",
      unit: "mm",
      labelEn: "Σ(coils·pitch)",
      labelZh: "Σ(圈数·节距)",
    };

    const diff = Math.abs(freeLength - sumLength);
    const ratio = freeLength > 0 ? diff / freeLength : NaN;
    if (isFinite(ratio) && ratio > designRulesDefaults.variablePitch.lengthMismatchWarnRatio) {
      findings.push({
        id: "VP_SUM_LENGTH_MISMATCH",
        level: "warning",
        titleEn: "Free length and pitch segments mismatch",
        titleZh: "自由长度与分段节距累加不一致",
        detailEn: `|L0-Σ|/L0=${ratio.toFixed(2)} > ${designRulesDefaults.variablePitch.lengthMismatchWarnRatio}.`,
        detailZh: `|L0-Σ|/L0=${ratio.toFixed(2)} > ${designRulesDefaults.variablePitch.lengthMismatchWarnRatio}。`,
        evidence: { field: "freeLength", freeLength, sumLength },
      });
    }
  }

  findings.push({
    id: "VP_RULES_READ_ONLY",
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
