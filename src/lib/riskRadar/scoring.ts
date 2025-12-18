import type { RadarOverallStatus, RiskDimension, RiskFinding, RiskFindingLevel, RiskStatus } from "./types";

export function summarizeDimensionStatus(findings: RiskFinding[]): RiskStatus {
  if (findings.some((f) => f.level === "ERROR")) return "FAIL";
  if (findings.some((f) => f.level === "WARNING")) return "WARN";
  return "OK";
}

export function scoreDimension(findings: RiskFinding[]): number {
  let score = 100;
  for (const f of findings) {
    score -= penaltyForLevel(f.level);
  }
  return Math.max(0, Math.min(100, score));
}

export function penaltyForLevel(level: RiskFindingLevel): number {
  switch (level) {
    case "ERROR":
      return 35;
    case "WARNING":
      return 15;
    case "INFO":
      return 5;
  }
}

export function computeOverallStatus(dimensions: {
  engineering: RiskDimension;
  manufacturing: RiskDimension;
  quality: RiskDimension;
}): RadarOverallStatus {
  const anyFail = Object.values(dimensions).some((d) => d.status === "FAIL");
  if (anyFail) return "HIGH_RISK";

  const anyWarn = Object.values(dimensions).some((d) => d.status === "WARN");
  if (anyWarn) return "MANUFACTURING_RISK";

  return "ENGINEERING_OK";
}

export function overallLabel(status: RadarOverallStatus): string {
  switch (status) {
    case "ENGINEERING_OK":
      return "Engineering OK";
    case "MANUFACTURING_RISK":
      return "Manufacturing Risk";
    case "HIGH_RISK":
      return "High Risk";
  }
}

export function scoreOverall(dimensions: {
  engineering: RiskDimension;
  manufacturing: RiskDimension;
  quality: RiskDimension;
}): number {
  const wEng = 0.4;
  const wMfg = 0.4;
  const wQ = 0.2;
  const score =
    wEng * dimensions.engineering.score +
    wMfg * dimensions.manufacturing.score +
    wQ * dimensions.quality.score;
  return Math.max(0, Math.min(100, Math.round(score)));
}
