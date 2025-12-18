import type { DataQualitySummary, NormalizedMeasurement, QualityFinding } from "../types";

function issue(id: string, severity: QualityFinding["severity"], en: string, zh: string): QualityFinding {
  return {
    id,
    severity,
    title: { en, zh },
    detail: { en, zh },
  };
}

export function validateMeasurements(measurements: NormalizedMeasurement[]): DataQualitySummary {
  const totalRows = measurements.length;
  const missingValueCount = measurements.filter((m) => m.value === null).length;
  const invalidValueCount = missingValueCount;
  const invalidTimestampCount = measurements.filter((m) => m.timestampISO === null && m.issues.some((i) => i.id === "Q_TIMESTAMP_INVALID")).length;
  const validMeasurements = totalRows - invalidValueCount;

  const issues: QualityFinding[] = [];

  if (totalRows === 0) {
    issues.push(issue("Q_EMPTY", "ERROR", "No rows", "没有数据行"));
  }

  const missingRate = totalRows > 0 ? missingValueCount / totalRows : 1;
  if (missingRate > 0.05) {
    issues.push(
      issue(
        "Q_MISSING_HIGH",
        missingRate > 0.2 ? "ERROR" : "WARN",
        `Missing value rate is high (${(missingRate * 100).toFixed(1)}%)`,
        `缺失值比例较高（${(missingRate * 100).toFixed(1)}%）`
      )
    );
  }

  const tsRate = totalRows > 0 ? invalidTimestampCount / totalRows : 0;
  if (tsRate > 0.05) {
    issues.push(
      issue(
        "Q_TIMESTAMP_BAD",
        "WARN",
        `Timestamp parse failures (${(tsRate * 100).toFixed(1)}%)`,
        `时间戳解析失败比例（${(tsRate * 100).toFixed(1)}%）`
      )
    );
  }

  const score = (() => {
    let s = 100;
    for (const m of measurements) {
      for (const i of m.issues) {
        s -= i.severity === "ERROR" ? 1 : i.severity === "WARN" ? 0.5 : 0.2;
      }
    }
    for (const i of issues) {
      s -= i.severity === "ERROR" ? 20 : i.severity === "WARN" ? 10 : 5;
    }
    return Math.max(0, Math.min(100, Math.round(s)));
  })();

  return {
    score,
    issues,
    stats: {
      totalRows,
      validMeasurements,
      missingValueCount,
      invalidValueCount,
      invalidTimestampCount,
    },
  };
}
