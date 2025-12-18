import type {
  CharacteristicAnalysis,
  FieldMapping,
  NormalizedMeasurement,
  QualityAnalysisResult,
  QualityDataset,
  QualityFinding,
  QualityOverallStatus,
  QualityStratificationResult,
  QualityStratifyBy,
  QualityStratumAnalysis,
} from "../types";
import { normalizeMeasurements } from "../firewall/normalize";
import { validateMeasurements } from "../firewall/validate";
import { buildImrChart, basicStats } from "./imr";
import { computeCapability } from "./capability";
import { detectNelsonRules } from "./nelson";
import { computeXbarRChart } from "./xbarr";
import { computeGageRrCrossed } from "./msa";

function issue(id: string, severity: QualityFinding["severity"], en: string, zh: string): QualityFinding {
  return {
    id,
    severity,
    title: { en, zh },
    detail: { en, zh },
  };
}

function summarizeStatus(findings: QualityFinding[]): QualityOverallStatus {
  if (findings.some((f) => f.severity === "ERROR")) return "HIGH_RISK";
  if (findings.some((f) => f.severity === "WARN")) return "MANUFACTURING_RISK";
  return "ENGINEERING_OK";
}

function scoreFromFindings(findings: QualityFinding[]): number {
  let s = 100;
  for (const f of findings) {
    s -= f.severity === "ERROR" ? 20 : f.severity === "WARN" ? 10 : 2;
  }
  return Math.max(0, Math.min(100, Math.round(s)));
}

function topFindings(findings: QualityFinding[], n = 8): QualityFinding[] {
  const weight = (sev: QualityFinding["severity"]) => (sev === "ERROR" ? 3 : sev === "WARN" ? 2 : 1);
  return findings
    .slice()
    .sort((a, b) => weight(b.severity) - weight(a.severity))
    .slice(0, n);
}

function characteristicFindings(args: {
  name: string;
  count: number;
  outOfControl: number;
  cp: number | null;
  cpk: number | null;
  nelsonCount: number;
  nelsonHasRule1: boolean;
  nelsonHasRule2: boolean;
  xbarrSubgroups: number;
  xbarrXOutOfControl: number;
  xbarrROutOfControl: number;
}): QualityFinding[] {
  const findings: QualityFinding[] = [];

  if (args.count < 10) {
    findings.push(
      issue(
        "Q_SPC_LOW_N",
        "WARN",
        `Too few samples for SPC (n=${args.count})`,
        `样本量偏少，不利于 SPC（n=${args.count}）`
      )
    );
  }

  if (args.outOfControl > 0) {
    findings.push(
      issue(
        "Q_IMR_OOC",
        args.outOfControl > 2 ? "ERROR" : "WARN",
        `I chart out-of-control points: ${args.outOfControl}`,
        `I 图超限点数量：${args.outOfControl}`
      )
    );
  }

  if (args.nelsonCount > 0) {
    const sev = args.nelsonHasRule1 || args.nelsonHasRule2 ? "ERROR" : "WARN";
    findings.push(
      issue(
        "Q_NELSON",
        sev,
        `Nelson rule violations detected: ${args.nelsonCount}`,
        `检测到 Nelson 规则违规：${args.nelsonCount}`
      )
    );
  }

  if (args.xbarrSubgroups > 0) {
    const total = args.xbarrXOutOfControl + args.xbarrROutOfControl;
    if (total > 0) {
      findings.push(
        issue(
          "Q_XBARR",
          total > 1 ? "ERROR" : "WARN",
          `Xbar-R out-of-control subgroups: X=${args.xbarrXOutOfControl}, R=${args.xbarrROutOfControl}`,
          `Xbar-R 子组超限：X=${args.xbarrXOutOfControl}, R=${args.xbarrROutOfControl}`
        )
      );
    }
  }

  if (args.cpk !== null) {
    if (args.cpk < 1.0) {
      findings.push(
        issue(
          "Q_CPK_LOW",
          "ERROR",
          `Cpk is low (${args.cpk.toFixed(3)})`,
          `Cpk 偏低（${args.cpk.toFixed(3)}）`
        )
      );
    } else if (args.cpk < 1.33) {
      findings.push(
        issue(
          "Q_CPK_WARN",
          "WARN",
          `Cpk is below 1.33 (${args.cpk.toFixed(3)})`,
          `Cpk 低于 1.33（${args.cpk.toFixed(3)}）`
        )
      );
    }
  } else {
    findings.push(
      issue(
        "Q_SPEC_MISSING",
        "INFO",
        "No LSL/USL provided; Cp/Cpk unavailable.",
        "未提供 LSL/USL；无法计算 Cp/Cpk。"
      )
    );
  }

  if (args.cp !== null && args.cp < 1.0) {
    findings.push(
      issue(
        "Q_CP_LOW",
        "WARN",
        `Cp is low (${args.cp.toFixed(3)})`,
        `Cp 偏低（${args.cp.toFixed(3)}）`
      )
    );
  }

  return findings;
}

function msaFinding(args: { characteristic: string; msa: { pctGrr: number | null; assessment: string; ndc: number | null } }): QualityFinding | null {
  const pct = args.msa.pctGrr;
  if (args.msa.assessment === "INSUFFICIENT_DATA") {
    return issue(
      "Q_MSA_INSUFFICIENT",
      "INFO",
      "MSA (Gage R&R) not computed: insufficient part/appraiser/trial structure.",
      "未计算 MSA（Gage R&R）：缺少完整的零件/检验员/试次结构。"
    );
  }

  const pctTxt = pct === null || !isFinite(pct) ? "—" : `${pct.toFixed(1)}%`;
  const ndcTxt = args.msa.ndc === null || !isFinite(args.msa.ndc) ? "—" : String(args.msa.ndc);

  if (args.msa.assessment === "UNACCEPTABLE") {
    return issue(
      "Q_MSA_GRR_HIGH",
      "ERROR",
      `MSA indicates unacceptable measurement system (%GRR=${pctTxt}, ndc=${ndcTxt}).`,
      `MSA 显示测量系统不可接受（%GRR=${pctTxt}，ndc=${ndcTxt}）。`
    );
  }

  if (args.msa.assessment === "MARGINAL") {
    return issue(
      "Q_MSA_GRR_WARN",
      "WARN",
      `MSA indicates marginal measurement system (%GRR=${pctTxt}, ndc=${ndcTxt}).`,
      `MSA 显示测量系统临界（%GRR=${pctTxt}，ndc=${ndcTxt}）。`
    );
  }

  return issue(
    "Q_MSA_OK",
    "INFO",
    `MSA indicates acceptable measurement system (%GRR=${pctTxt}, ndc=${ndcTxt}).`,
    `MSA 显示测量系统可接受（%GRR=${pctTxt}，ndc=${ndcTxt}）。`
  );
}

export function analyzeDataset(args: {
  dataset: QualityDataset;
  mapping: FieldMapping;
  options?: {
    stratifyBy?: QualityStratifyBy;
  };
}): QualityAnalysisResult {
  const measurements = normalizeMeasurements({ rows: args.dataset.rows, mapping: args.mapping });
  return analyzeMeasurements({
    datasetId: args.dataset.id,
    measurements,
    mapping: args.mapping,
    options: { stratifyBy: args.options?.stratifyBy },
  });
}

export function analyzeMeasurements(args: {
  datasetId: string;
  measurements: NormalizedMeasurement[];
  mapping: FieldMapping;
  options?: {
    stratifyBy?: QualityStratifyBy;
    enableStratification?: boolean;
  };
}): QualityAnalysisResult {
  const dataQuality = validateMeasurements(args.measurements);

  const byChar = new Map<string, NormalizedMeasurement[]>();
  for (const m of args.measurements) {
    const k = m.characteristic || "Measurement";
    const arr = byChar.get(k) ?? [];
    arr.push(m);
    byChar.set(k, arr);
  }

  const characteristics: CharacteristicAnalysis[] = [];
  const allFindings: QualityFinding[] = [...dataQuality.issues];

  for (const [name, ms] of byChar.entries()) {
    const values = ms.map((m) => m.value).filter((v): v is number => typeof v === "number" && isFinite(v));
    const stats = basicStats(values);

    const lsl = ms.find((m) => typeof m.lsl === "number" && isFinite(m.lsl))?.lsl ?? null;
    const usl = ms.find((m) => typeof m.usl === "number" && isFinite(m.usl))?.usl ?? null;
    const target = ms.find((m) => typeof m.target === "number" && isFinite(m.target))?.target ?? null;

    const imr = buildImrChart(values);
    const outOfControl = imr.points.filter((p) => p.outOfControl).length;

    const nelson = detectNelsonRules({ values, mean: imr.mean, sigma: imr.sigma });
    const nelsonCount = nelson.violations.length;
    const nelsonHasRule1 = (nelson.counts["1"] ?? 0) > 0;
    const nelsonHasRule2 = (nelson.counts["2"] ?? 0) > 0;

    const xbarrValues = ms.flatMap((m) => {
      const v = m.value;
      if (!(typeof v === "number" && isFinite(v))) return [];
      return [{ value: v, subgroupId: m.subgroupId }];
    });

    const xbarr = computeXbarRChart({
      values: xbarrValues,
      subgroupSize: 5,
    });
    const xbarrSubgroups = xbarr?.points.length ?? 0;
    const xbarrXOutOfControl = xbarr ? xbarr.points.filter((p) => p.xOutOfControl).length : 0;
    const xbarrROutOfControl = xbarr ? xbarr.points.filter((p) => p.rOutOfControl).length : 0;

    const msaObs = ms.flatMap((m) => {
      const v = m.value;
      const partId = m.partId?.trim() ?? "";
      const appraiser = m.appraiser?.trim() ?? "";
      const trial = m.trial;
      if (!(typeof v === "number" && isFinite(v))) return [];
      if (!partId || !appraiser) return [];
      if (!(typeof trial === "number" && Number.isInteger(trial))) return [];
      return [{ partId, appraiser, trial, value: v }];
    });

    const msa = computeGageRrCrossed({ observations: msaObs });
    const msaF = msaFinding({ characteristic: name, msa });

    const capability = computeCapability({
      mean: stats.mean,
      std: stats.std,
      min: stats.min,
      max: stats.max,
      count: stats.count,
      lsl,
      usl,
      target,
    });

    const findings = [
      ...ms.flatMap((m) => m.issues),
      ...(msaF ? [msaF] : []),
      ...characteristicFindings({
        name,
        count: stats.count,
        outOfControl,
        cp: capability.cp,
        cpk: capability.cpk,
        nelsonCount,
        nelsonHasRule1,
        nelsonHasRule2,
        xbarrSubgroups,
        xbarrXOutOfControl,
        xbarrROutOfControl,
      }),
    ];

    allFindings.push(...findings);

    characteristics.push({
      name,
      unit: ms.find((m) => m.unit)?.unit,
      count: stats.count,
      imr,
      nelson,
      xbarr: xbarr ?? undefined,
      msa,
      capability,
      findings: topFindings(findings, 6),
    });
  }

  const keyFindings = topFindings(allFindings, 10);
  const status = summarizeStatus(keyFindings);

  const score = Math.round((dataQuality.score + scoreFromFindings(keyFindings)) / 2);

  const stratifyByRequested: QualityStratifyBy = args.options?.stratifyBy ?? "auto";
  const enableStratification = args.options?.enableStratification ?? true;

  const pickAutoStratify = (): Exclude<QualityStratifyBy, "auto" | "none"> | null => {
    const candidates: Array<Exclude<QualityStratifyBy, "auto" | "none">> = ["machine", "lot", "shift", "appraiser", "gage"];
    for (const c of candidates) {
      const values = args.measurements
        .map((m) => (m as any)[c] as string | undefined)
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v);

      const uniq = new Set(values);
      if (uniq.size >= 2) return c;
    }
    return null;
  };

  const resolveStratifyBy = (): Exclude<QualityStratifyBy, "auto" | "none"> | null => {
    if (stratifyByRequested === "none") return null;
    if (stratifyByRequested === "auto") return pickAutoStratify();
    return stratifyByRequested;
  };

  const stratBy = enableStratification ? resolveStratifyBy() : null;

  const buildStratification = (): QualityStratificationResult | undefined => {
    if (!stratBy) return undefined;

    const buckets = new Map<string, NormalizedMeasurement[]>();
    for (const m of args.measurements) {
      const raw = (m as any)[stratBy] as string | undefined;
      const key = typeof raw === "string" ? raw.trim() : "";
      if (!key) continue;
      const arr = buckets.get(key) ?? [];
      arr.push(m);
      buckets.set(key, arr);
    }

    const strata: QualityStratumAnalysis[] = [];
    for (const [key, ms] of buckets.entries()) {
      const sub = analyzeMeasurements({
        datasetId: `${args.datasetId}::${stratBy}=${key}`,
        measurements: ms,
        mapping: args.mapping,
        options: { stratifyBy: "none", enableStratification: false },
      });

      strata.push({
        key,
        count: ms.length,
        status: sub.status,
        score: sub.score,
        dataQuality: sub.dataQuality,
        keyFindings: sub.keyFindings,
        characteristics: sub.characteristics,
      });
    }

    if (strata.length < 2) return undefined;

    return {
      by: stratBy,
      strata: strata.sort((a, b) => b.count - a.count).slice(0, 12),
    };
  };

  const stratification = buildStratification();

  return {
    datasetId: args.datasetId,
    options: { stratifyBy: stratifyByRequested },
    status,
    score,
    dataQuality,
    keyFindings,
    characteristics: characteristics.sort((a, b) => b.count - a.count).slice(0, 50),
    stratification,
  };
}
