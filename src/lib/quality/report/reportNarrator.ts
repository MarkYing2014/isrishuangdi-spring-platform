import type { QualityAnalysisResult, QualityStratificationResult } from "../types";

export type BilingualText = { en: string; zh: string };

type Lang = "en" | "zh" | "bilingual";

export type QualityReportNarrative = {
  executiveSummary: {
    title: BilingualText;
    overallStatusLabel: BilingualText;
    conclusionLabel: BilingualText;
    conclusion: BilingualText;
    keyReasonsLabel: BilingualText;
    keyReasons: BilingualText[];
    dispositionLabel: BilingualText;
    disposition: BilingualText[];
    scoreExplain: BilingualText;
  };

  criticalFindingsByCharacteristic: {
    title: BilingualText;
    items: Array<{
      characteristic: string;
      stabilityLabel: BilingualText;
      stability: BilingualText[];
      capabilityLabel: BilingualText;
      capability: BilingualText[];
      assessmentLabel: BilingualText;
      assessment: BilingualText;
      recommendationLabel: BilingualText;
      recommendation: BilingualText[];
    }>;
  };

  controlChartInterpretation: {
    title: BilingualText;
    items: Array<{
      characteristic: string;
      bullets: BilingualText[];
    }>;
  };

  measurementSystem: {
    title: BilingualText;
    findingsLabel: BilingualText;
    findings: BilingualText[];
    riskLabel: BilingualText;
    risk: BilingualText;
    msaSummaryLabel: BilingualText;
    msaSummary: Array<{ characteristic: string; pctGrr: number | null; ndc: number | null; assessment: string }>;
    recommendationLabel: BilingualText;
    recommendation: BilingualText[];
  };

  stratification?: {
    title: BilingualText;
    by: string;
    interpretationLabel: BilingualText;
    interpretation: BilingualText;
    lines: Array<{ key: string; status: string; score: number; n: number }>;
  };

  capability: {
    title: BilingualText;
    rows: Array<{
      characteristic: string;
      n: number;
      mean: number;
      std: number;
      cp: number | null;
      cpk: number | null;
      assessment: BilingualText;
      note?: BilingualText;
    }>;
  };

  engineeringJudgment: {
    title: BilingualText;
    text: BilingualText;
  };

  recommendedActions: {
    title: BilingualText;
    items: BilingualText[];
  };
};

function bt(en: string, zh: string): BilingualText {
  return { en, zh };
}

function shipDisposition(status: QualityAnalysisResult["status"], failingCpkCount: number, hasNelson: boolean): BilingualText[] {
  if (status === "HIGH_RISK" || (failingCpkCount > 0 && hasNelson)) {
    return [
      bt("Do not release for mass production.", "不建议放行量产。"),
      bt("Containment and corrective actions required before re-submission.", "建议先遏制风险并执行纠正措施后再提交复审。"),
    ];
  }
  if (status === "MANUFACTURING_RISK") {
    return [
      bt("Manufacturing risk exists; release should be conditional.", "存在制造风险，放行应附带条件。"),
      bt("Improve stability/capability before ramp-up.", "建议在量产爬坡前提升稳定性/过程能力。"),
    ];
  }
  return [bt("No hold recommended based on this dataset.", "基于该数据集不建议暂停/封存。")];
}

function overallConclusion(status: QualityAnalysisResult["status"]): BilingualText {
  if (status === "HIGH_RISK") {
    return bt(
      "The manufacturing process is not capable and not statistically stable for mass production at this stage.",
      "当前制造过程不具备过程能力且统计上不稳定，不适合直接作为量产放行依据。"
    );
  }
  if (status === "MANUFACTURING_RISK") {
    return bt(
      "The process shows manufacturing risk; stability/capability improvements are recommended before ramp-up.",
      "过程存在制造风险，建议在量产爬坡前提升稳定性/过程能力。"
    );
  }
  return bt(
    "No major quality risks identified from this dataset.",
    "基于该数据集未识别到重大质量风险。"
  );
}

function capAssessment(cpk: number | null): BilingualText {
  if (cpk === null || !isFinite(cpk)) return bt("No spec", "无规格");
  if (cpk < 1.0) return bt("Not capable", "不具备过程能力");
  if (cpk < 1.33) return bt("Marginal", "临界");
  return bt("Capable", "满足");
}

function capNote(cp: number | null, cpk: number | null): BilingualText | undefined {
  if (cp === null || cpk === null || !isFinite(cp) || !isFinite(cpk)) return undefined;
  if (cp >= 1.33 && cpk < 1.33) {
    return bt(
      "Cp is acceptable but Cpk is low, indicating the process is off-center.",
      "Cp 尚可但 Cpk 偏低，说明过程中心偏移。"
    );
  }
  if (cp < 1.0 && cpk < 1.0) {
    return bt(
      "Both Cp and Cpk are low, indicating excessive variation and/or off-centering.",
      "Cp 与 Cpk 均偏低，说明波动过大且/或中心偏移。"
    );
  }
  return undefined;
}

function nelsonRuleMeaning(rule: number): BilingualText {
  if (rule === 1) return bt("Rule 1: One point beyond 3σ (special cause)", "规则 1：单点超出 3σ（特殊原因）");
  if (rule === 2) return bt("Rule 2: 9 points on same side of CL (shift)", "规则 2：连续 9 点位于中心线同一侧（偏移）");
  if (rule === 3) return bt("Rule 3: 6 points continually increasing/decreasing (trend)", "规则 3：连续 6 点单调上升/下降（趋势）");
  if (rule === 4) return bt("Rule 4: 14 points alternating up/down (systematic)", "规则 4：连续 14 点上下交替（系统性波动）");
  if (rule === 5) return bt("Rule 5: 2 of 3 points beyond 2σ (special cause)", "规则 5：连续 3 点中有 2 点超出 2σ（特殊原因）");
  if (rule === 6) return bt("Rule 6: 4 of 5 points beyond 1σ (special cause)", "规则 6：连续 5 点中有 4 点超出 1σ（特殊原因）");
  if (rule === 7) return bt("Rule 7: 15 points within 1σ (stratification)", "规则 7：连续 15 点落在 ±1σ 内（分层/测量分辨率问题）");
  return bt("Rule 8: 8 points beyond 1σ on both sides (mixture)", "规则 8：连续 8 点落在 ±1σ 外且分布于两侧（混合/双峰）");
}

function sumNelson(c: QualityAnalysisResult["characteristics"][number]): Array<{ rule: number; count: number }> {
  const counts = c.nelson?.counts ?? {};
  const out: Array<{ rule: number; count: number }> = [];
  for (let r = 1; r <= 8; r++) {
    const n = counts[String(r)] ?? 0;
    if (n > 0) out.push({ rule: r, count: n });
  }
  return out;
}

function xbarrOoc(c: QualityAnalysisResult["characteristics"][number]) {
  const xb = c.xbarr;
  if (!xb) return { x: 0, r: 0, total: 0 };
  const x = xb.points.filter((p) => p.xOutOfControl).length;
  const r = xb.points.filter((p) => p.rOutOfControl).length;
  return { x, r, total: x + r };
}

function findKeyCharacteristics(analysis: QualityAnalysisResult): Array<{
  c: QualityAnalysisResult["characteristics"][number];
  weight: number;
}> {
  const items = analysis.characteristics.map((c) => {
    const nelsonCount = c.nelson?.violations?.length ?? 0;
    const iOoc = c.imr?.points?.filter((p) => p.outOfControl).length ?? 0;
    const { total: xbOoc } = xbarrOoc(c);
    const cpk = c.capability?.cpk ?? null;

    let w = 0;
    if (cpk !== null && isFinite(cpk)) {
      if (cpk < 1.0) w += 8;
      else if (cpk < 1.33) w += 4;
      else w += 1;
    }

    w += Math.min(6, nelsonCount);
    w += Math.min(4, iOoc);
    w += Math.min(4, xbOoc);

    return { c, weight: w };
  });

  return items.sort((a, b) => b.weight - a.weight).slice(0, 6);
}

function stratificationObservation(s: QualityStratificationResult): BilingualText {
  const strata = s.strata ?? [];
  if (strata.length < 2) {
    return bt("Insufficient strata to draw conclusions.", "分层数量不足，暂无法得出结论。");
  }

  const statuses = new Set(strata.map((x) => x.status));
  const scores = strata.map((x) => x.score).filter((x) => typeof x === "number" && isFinite(x));
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 0;

  if (statuses.size === 1) {
    return bt(
      "All strata show similar risk levels, suggesting a systemic process issue rather than an isolated factor.",
      "各分层风险水平相近，提示更可能是系统性过程问题，而非单一因素导致。"
    );
  }

  if (max - min >= 20) {
    const worst = strata.slice().sort((a, b) => a.score - b.score)[0];
    return bt(
      `${worst.key} shows comparatively higher risk; investigate factor-specific contributors.`,
      `${worst.key} 风险相对更高，建议优先排查该分层对应因素。`
    );
  }

  return bt(
    "Strata show different risk levels; investigate potential factor-specific contributors.",
    "分层间风险存在差异，建议排查分层因素相关的潜在原因。"
  );
}

export function buildQualityReportNarrative(args: {
  analysis: QualityAnalysisResult;
  lang: Lang;
}): QualityReportNarrative {
  const { analysis } = args;

  const dataIssues = analysis.dataQuality?.issues?.length ?? 0;
  const invalidValueCount = analysis.dataQuality?.stats?.invalidValueCount ?? 0;
  const invalidTimestampCount = analysis.dataQuality?.stats?.invalidTimestampCount ?? 0;

  const chars = analysis.characteristics ?? [];
  const failingCpk = chars.filter((c) => c.capability?.cpk !== null && isFinite(c.capability.cpk) && c.capability.cpk < 1.0);
  const marginalCpk = chars.filter((c) => c.capability?.cpk !== null && isFinite(c.capability.cpk) && c.capability.cpk >= 1.0 && c.capability.cpk < 1.33);
  const hasNelson = chars.some((c) => (c.nelson?.violations?.length ?? 0) > 0);

  const reasons: BilingualText[] = [];
  if (hasNelson) {
    reasons.push(
      bt(
        "Unstable process behavior detected (control chart rule violations).",
        "检测到过程不稳定（控制图规则违规）。"
      )
    );
  }
  if (failingCpk.length > 0) {
    reasons.push(
      bt(
        `Insufficient process capability for key characteristics (Cpk < 1.00 on ${failingCpk.length} characteristic(s)).`,
        `关键特性过程能力不足（${failingCpk.length} 个特性 Cpk < 1.00）。`
      )
    );
  }
  if (marginalCpk.length > 0) {
    reasons.push(
      bt(
        `Marginal capability detected (1.00 ≤ Cpk < 1.33 on ${marginalCpk.length} characteristic(s)).`,
        `存在临界过程能力（${marginalCpk.length} 个特性 1.00 ≤ Cpk < 1.33）。`
      )
    );
  }
  if (invalidValueCount > 0 || invalidTimestampCount > 0 || dataIssues > 0) {
    reasons.push(
      bt(
        `Measurement data quality issues detected (invalid value: ${invalidValueCount}, invalid timestamp: ${invalidTimestampCount}).`,
        `检测到测量数据质量问题（无效数值：${invalidValueCount}，无效时间：${invalidTimestampCount}）。`
      )
    );
  }

  if (reasons.length === 0) {
    reasons.push(bt("No major issues detected from available data.", "基于当前数据未检测到重大问题。"));
  }

  const conclusion = overallConclusion(analysis.status);

  const scoreExplain = bt(
    "Score is a 0–100 composite indicator based on data quality and the severity of detected findings. Lower is worse.",
    "评分为 0–100 的综合指标，综合考虑数据质量与发现项严重度；分数越低风险越高。"
  );

  const keyChars = findKeyCharacteristics(analysis);
  const criticalItems = keyChars
    .filter((x) => x.weight > 0)
    .map(({ c }) => {
      const stability: BilingualText[] = [];
      const capability: BilingualText[] = [];
      const recommendation: BilingualText[] = [];

      const nelson = sumNelson(c);
      if (nelson.length > 0) {
        const top = nelson
          .slice()
          .sort((a, b) => b.count - a.count)
          .slice(0, 4)
          .map((x) => `Rule ${x.rule}×${x.count}`)
          .join(", ");

        stability.push(
          bt(
            `Nelson rule violations detected (${top}).`,
            `检测到 Nelson 规则违规（${top}）。`
          )
        );
      }

      const iOoc = c.imr?.points?.filter((p) => p.outOfControl).length ?? 0;
      if (iOoc > 0) {
        stability.push(bt(`I chart out-of-control points detected (count=${iOoc}).`, `I 图存在超限点（数量=${iOoc}）。`));
      }

      const xb = xbarrOoc(c);
      if (xb.total > 0) {
        stability.push(bt(`Xbar-R special causes detected (X OOC=${xb.x}, R OOC=${xb.r}).`, `Xbar-R 存在超限子组（X=${xb.x}, R=${xb.r}）。`));
      }

      const cap = c.capability;
      if (cap?.cp !== null && isFinite(cap.cp)) capability.push(bt(`Cp = ${cap.cp.toFixed(3)}`, `Cp = ${cap.cp.toFixed(3)}`));
      if (cap?.cpk !== null && isFinite(cap.cpk)) capability.push(bt(`Cpk = ${cap.cpk.toFixed(3)}`, `Cpk = ${cap.cpk.toFixed(3)}`));
      if ((cap?.cpk ?? null) === null) capability.push(bt("Cp/Cpk unavailable (missing spec limits).", "未提供规格限，无法计算 Cp/Cpk。"));

      const assess = capAssessment(cap?.cpk ?? null);
      const assessText = (() => {
        if (cap?.cpk !== null && isFinite(cap.cpk) && cap.cpk < 1.0) {
          return bt(
            "Process is unstable and not capable. High risk of producing non-conforming parts.",
            "过程不稳定且不具备能力，存在较高概率产出不合格品。"
          );
        }
        if (cap?.cpk !== null && isFinite(cap.cpk) && cap.cpk < 1.33) {
          return bt(
            "Process shows instability and/or marginal centering. Risk increases over time.",
            "过程存在不稳定或中心偏移，风险可能随时间累积。"
          );
        }
        if (stability.length > 0) {
          return bt(
            "Capability may be acceptable, but stability issues indicate special causes that should be addressed.",
            "过程能力可能尚可，但稳定性问题提示存在特殊原因，需要处置。"
          );
        }
        return bt(
          "No major issues detected for this characteristic based on available evidence.",
          "基于当前证据未发现该特性的重大问题。"
        );
      })();

      if (cap?.cpk !== null && isFinite(cap.cpk) && cap.cpk < 1.0) {
        recommendation.push(bt("Contain and sort suspect lots; investigate special causes and re-verify capability.", "建议先遏制风险并对可疑批次进行筛选，排查特殊原因后复核能力。"));
      } else if (stability.length > 0) {
        recommendation.push(bt("Investigate special causes (shift/drift/measurement) and stabilize the process.", "建议排查特殊原因（偏移/漂移/测量因素）并稳定过程。"));
      } else {
        recommendation.push(bt("Maintain controls and continue monitoring.", "建议保持控制并持续监控。"));
      }

      return {
        characteristic: c.name,
        stabilityLabel: bt("Process Stability", "稳定性"),
        stability,
        capabilityLabel: bt("Process Capability", "过程能力"),
        capability,
        assessmentLabel: bt("Assessment", "判断"),
        assessment: bt(`${assess.en}. ${assessText.en}`, `${assess.zh}。${assessText.zh}`),
        recommendationLabel: bt("Recommendation", "建议"),
        recommendation,
      };
    });

  const nelsonItems = chars
    .map((c) => {
      const rules = sumNelson(c);
      if (rules.length === 0) return null;

      const bullets: BilingualText[] = [];
      for (const r of rules.sort((a, b) => b.count - a.count)) {
        const meaning = nelsonRuleMeaning(r.rule);
        bullets.push(bt(`${meaning.en} (occurrences=${r.count})`, `${meaning.zh}（次数=${r.count}）`));
      }
      return { characteristic: c.name, bullets };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 12);

  const stratification = (() => {
    const s = analysis.stratification;
    if (!s) return undefined;
    return {
      title: bt("Stratification", "分层"),
      by: s.by,
      interpretationLabel: bt("Interpretation", "解读"),
      interpretation: stratificationObservation(s),
      lines: (s.strata ?? []).map((x) => ({ key: x.key, status: x.status, score: x.score, n: x.count })),
    };
  })();

  const capabilityRows = chars
    .slice()
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 50)
    .map((c) => {
      const cap = c.capability;
      const assessment = capAssessment(cap.cpk);
      const note = capNote(cap.cp, cap.cpk);
      return {
        characteristic: c.name,
        n: c.count,
        mean: cap.mean,
        std: cap.std,
        cp: cap.cp,
        cpk: cap.cpk,
        assessment,
        note,
      };
    });

  const measurementSystemFindings: BilingualText[] = [];
  if (invalidValueCount > 0) measurementSystemFindings.push(bt("Invalid measurement values detected.", "检测到无效测量值。"));
  if (invalidTimestampCount > 0) measurementSystemFindings.push(bt("Invalid timestamps detected.", "检测到无效时间戳。"));
  if (measurementSystemFindings.length === 0) measurementSystemFindings.push(bt("No major data integrity issues detected.", "未检测到显著数据完整性问题。"));

  const msaSummary = chars
    .map((c) => {
      const msa = c.msa;
      if (!msa) return null;
      return {
        characteristic: c.name,
        pctGrr: msa.pctGrr,
        ndc: msa.ndc,
        assessment: msa.assessment,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 20);

  const measurementRisk = bt(
    "Measurement uncertainty or data entry issues may distort control chart and capability evaluation.",
    "测量不确定度或录入问题可能会扭曲控制图与能力评估。"
  );

  const measurementRec = [
    bt("Perform measurement system verification (MSA / Gage R&R).", "建议执行测量系统分析（MSA / Gage R&R）。"),
    bt("Review data collection procedures and operator input controls.", "建议复核数据采集流程及操作员录入控制。"),
  ];

  const engineeringJudgment = bt(
    "Based on statistical evidence and engineering interpretation, the process does not meet quality and stability requirements. Corrective actions are required before approval.",
    "基于统计证据与工程解读，该过程未满足质量与稳定性要求。建议完成纠正措施后再进行批准/放行评审。"
  );

  const actions = [
    ...shipDisposition(analysis.status, failingCpk.length, hasNelson),
    bt("Stabilize the process (eliminate special causes) and re-run SPC with sufficient samples.", "稳定过程（消除特殊原因）并在足够样本量下重新进行 SPC 分析。"),
    bt("Improve capability for CTQ characteristics and verify Cpk against agreed thresholds.", "提升关键特性的过程能力，并按约定阈值复核 Cpk。"),
    bt("If stratification indicates factor differences, prioritize investigation on worst strata.", "若分层显示差异，优先对最差分层展开排查。"),
  ];

  return {
    executiveSummary: {
      title: bt("Executive Summary", "执行摘要"),
      overallStatusLabel: bt("Overall Process Status", "总体状态"),
      conclusionLabel: bt("Conclusion", "结论"),
      conclusion,
      keyReasonsLabel: bt("Key Reasons", "主要原因"),
      keyReasons: reasons,
      dispositionLabel: bt("Disposition Recommendation", "建议处置"),
      disposition: shipDisposition(analysis.status, failingCpk.length, hasNelson),
      scoreExplain,
    },
    criticalFindingsByCharacteristic: {
      title: bt("Critical Findings by Characteristic", "关键质量发现（按特性）"),
      items: criticalItems,
    },
    controlChartInterpretation: {
      title: bt("Process Stability Analysis (SPC)", "过程稳定性分析（SPC）"),
      items: nelsonItems,
    },
    measurementSystem: {
      title: bt("Measurement System & Data Integrity", "测量系统与数据质量"),
      findingsLabel: bt("Findings", "发现"),
      findings: measurementSystemFindings,
      riskLabel: bt("Risk", "风险"),
      risk: measurementRisk,
      msaSummaryLabel: bt("MSA (Gage R&R)", "MSA（Gage R&R）"),
      msaSummary,
      recommendationLabel: bt("Recommendation", "建议"),
      recommendation: measurementRec,
    },
    stratification,
    capability: {
      title: bt("Capability Summary", "过程能力汇总"),
      rows: capabilityRows,
    },
    engineeringJudgment: {
      title: bt("Overall Engineering Judgment", "综合工程判断"),
      text: engineeringJudgment,
    },
    recommendedActions: {
      title: bt("Recommended Actions", "建议行动"),
      items: actions,
    },
  };
}
