import type {
  CharacteristicAnalysis,
  FieldMapping,
  NormalizedMeasurement,
  QualityAnalysisResult,
  QualityDataset,
  QualityFinding,
  QualityOverallStatus,
} from "../types";
import { normalizeMeasurements } from "../firewall/normalize";
import { validateMeasurements } from "../firewall/validate";
import { buildImrChart, basicStats } from "./imr";
import { computeCapability } from "./capability";

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

export function analyzeDataset(args: { dataset: QualityDataset; mapping: FieldMapping }): QualityAnalysisResult {
  const measurements = normalizeMeasurements({ rows: args.dataset.rows, mapping: args.mapping });
  return analyzeMeasurements({ datasetId: args.dataset.id, measurements, mapping: args.mapping });
}

export function analyzeMeasurements(args: {
  datasetId: string;
  measurements: NormalizedMeasurement[];
  mapping: FieldMapping;
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

    const findings = [...ms.flatMap((m) => m.issues), ...characteristicFindings({
      name,
      count: stats.count,
      outOfControl,
      cp: capability.cp,
      cpk: capability.cpk,
    })];

    allFindings.push(...findings);

    characteristics.push({
      name,
      unit: ms.find((m) => m.unit)?.unit,
      count: stats.count,
      imr,
      capability,
      findings: topFindings(findings, 6),
    });
  }

  const keyFindings = topFindings(allFindings, 10);
  const status = summarizeStatus(keyFindings);

  const score = Math.round((dataQuality.score + scoreFromFindings(keyFindings)) / 2);

  return {
    datasetId: args.datasetId,
    status,
    score,
    dataQuality,
    keyFindings,
    characteristics: characteristics.sort((a, b) => b.count - a.count).slice(0, 50),
  };
}
