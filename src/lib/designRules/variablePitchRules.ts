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
  context?: {
    deflection?: number;
  };
}): DesignRuleReport {
  const findings: DesignRuleFinding[] = [];
  const metrics: DesignRuleReport["metrics"] = {};

  const d = params.wireDiameter;
  const Dm = params.meanDiameter;
  const freeLength = params.freeLength;
  const deflection = params.context?.deflection;

  const segments = params.segments ?? [];
  const pitches = segments.map((s) => s.pitch);
  const minPitch = pitches.length ? Math.min(...pitches) : NaN;

  const stageDeflections = (() => {
    if (!(isFinite(d) && d > 0)) return [] as number[];
    const sorted = segments
      .map((s) => ({ coils: Number(s.coils), pitch: Number(s.pitch) }))
      .filter((s) => isFinite(s.coils) && isFinite(s.pitch) && s.coils > 0)
      .sort((a, b) => a.pitch - b.pitch);

    let cum = 0;
    const out: number[] = [];
    for (const s of sorted) {
      const spacing = s.pitch - d;
      if (!(spacing > 0)) continue;
      const cap = s.coils * spacing;
      if (!(cap > 0)) continue;
      cum += cap;
      out.push(Number(cum.toFixed(6)));
    }
    return out;
  })();

  const deltaMax =
    freeLength !== undefined && isFinite(freeLength)
      ? Math.max(0, freeLength - params.totalCoils * d)
      : undefined;

  metrics.min_pitch = {
    value: isFinite(minPitch) ? Number(minPitch.toFixed(3)) : "-",
    unit: "mm",
    labelEn: "Min pitch",
    labelZh: "最小节距",
  };

  if (stageDeflections.length > 0) {
    metrics.first_contact_deflection = {
      value: stageDeflections[0],
      unit: "mm",
      labelEn: "First contact deflection",
      labelZh: "首次接触拐点位移",
    };
  }

  if (deltaMax !== undefined) {
    metrics.full_solid_deflection = {
      value: isFinite(deltaMax) ? Number(deltaMax.toFixed(3)) : "-",
      unit: "mm",
      labelEn: "Full solid deflection (L0 - Nt·d)",
      labelZh: "完全并紧位移（L0 - Nt·d）",
    };
  }

  if (deflection !== undefined && isFinite(deflection) && deflection >= 0) {
    // Near stage transition
    if (stageDeflections.length > 0) {
      const next = stageDeflections.find((x) => x >= deflection - 1e-9);
      if (next !== undefined && isFinite(d) && d > 0) {
        const dist = Math.abs(next - deflection);
        const thresh = designRulesDefaults.variablePitch.stageProximityD * d;
        if (dist <= thresh) {
          findings.push({
            id: "VP_NEAR_CONTACT_STAGE",
            level: "warning",
            titleEn: "Working point near contact transition",
            titleZh: "工作点接近接触拐点",
            detailEn: `Deflection=${deflection.toFixed(2)}mm is within ${thresh.toFixed(2)}mm of a contact stage (x≈${next.toFixed(2)}mm).`,
            detailZh: `工作位移=${deflection.toFixed(2)}mm 距离接触拐点（x≈${next.toFixed(2)}mm）小于 ${thresh.toFixed(2)}mm。`,
            evidence: { deflection, nextStage: next, dist, thresh },
          });
        }
      }
    }

    // Near solid
    if (deltaMax !== undefined && isFinite(deltaMax) && isFinite(d) && d > 0) {
      if (deflection > deltaMax + 1e-9) {
        findings.push({
          id: "VP_OVER_SOLID",
          level: "error",
          titleEn: "Deflection exceeds solid capacity",
          titleZh: "位移超过并紧行程",
          detailEn: `Deflection=${deflection.toFixed(2)}mm > δ_max≈${deltaMax.toFixed(2)}mm.`,
          detailZh: `位移=${deflection.toFixed(2)}mm > 最大并紧行程≈${deltaMax.toFixed(2)}mm。`,
          evidence: { deflection, deltaMax },
        });
      } else {
        const dist = deltaMax - deflection;
        const thresh = designRulesDefaults.variablePitch.solidProximityD * d;
        if (dist <= thresh) {
          findings.push({
            id: "VP_NEAR_SOLID",
            level: "warning",
            titleEn: "Working point near solid height",
            titleZh: "工作点接近并紧",
            detailEn: `δ_max - δ = ${dist.toFixed(2)}mm ≤ ${thresh.toFixed(2)}mm.`,
            detailZh: `并紧余量 δ_max - δ = ${dist.toFixed(2)}mm ≤ ${thresh.toFixed(2)}mm。`,
            evidence: { deflection, deltaMax, dist, thresh },
          });
        }
      }
    }
  }

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
