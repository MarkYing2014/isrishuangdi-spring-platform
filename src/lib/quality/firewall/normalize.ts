import type { FieldMapping, NormalizedMeasurement, QualityFinding } from "../types";

function asString(x: unknown): string {
  return typeof x === "string" ? x : x === undefined || x === null ? "" : String(x);
}

function parseNumber(raw: string): number | null {
  const s0 = raw.trim();
  if (!s0) return null;

  const s = (() => {
    if (s0.includes(",") && s0.includes(".")) {
      return s0.replace(/,/g, "");
    }
    if (s0.includes(",") && !s0.includes(".")) {
      const maybeDecimal = /^-?\d+(,\d+)+$/.test(s0);
      if (maybeDecimal) return s0.replace(/,/g, ".");
    }
    return s0;
  })();

  const n = Number(s);
  if (!isFinite(n)) return null;
  return n;
}

function parseTimestamp(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function normalizeResult(raw: string): "PASS" | "FAIL" | "UNKNOWN" {
  const s = raw.trim().toLowerCase();
  if (!s) return "UNKNOWN";
  if (["pass", "ok", "1", "true", "y", "yes", "合格", "通过"].includes(s)) return "PASS";
  if (["fail", "ng", "0", "false", "n", "no", "不合格", "拒收"].includes(s)) return "FAIL";
  return "UNKNOWN";
}

function issue(id: string, severity: QualityFinding["severity"], en: string, zh: string): QualityFinding {
  return {
    id,
    severity,
    title: { en, zh },
    detail: { en, zh },
  };
}

export function normalizeMeasurements(args: {
  rows: Record<string, string>[];
  mapping: FieldMapping;
}): NormalizedMeasurement[] {
  const mapping = args.mapping;

  return args.rows.map((r, idx) => {
    const issues: QualityFinding[] = [];

    const charNameRaw = mapping.characteristic ? asString(r[mapping.characteristic]) : "";
    const characteristic = charNameRaw.trim() || "Measurement";

    const valueRaw = asString(r[mapping.value]);
    const value = parseNumber(valueRaw);
    if (value === null) {
      issues.push(issue("Q_VALUE_INVALID", "ERROR", "Invalid measurement value", "测量值不合法"));
    }

    const tsRaw = mapping.timestamp ? asString(r[mapping.timestamp]) : "";
    const timestampISO = mapping.timestamp ? parseTimestamp(tsRaw) : null;
    if (mapping.timestamp && timestampISO === null && tsRaw.trim()) {
      issues.push(issue("Q_TIMESTAMP_INVALID", "WARN", "Invalid timestamp", "时间戳解析失败"));
    }

    const unit = mapping.unit ? asString(r[mapping.unit]).trim() || undefined : undefined;

    const lslRaw = mapping.lsl ? asString(r[mapping.lsl]) : "";
    const uslRaw = mapping.usl ? asString(r[mapping.usl]) : "";
    const targetRaw = mapping.target ? asString(r[mapping.target]) : "";

    const lslParsed = mapping.lsl ? parseNumber(lslRaw) : null;
    const uslParsed = mapping.usl ? parseNumber(uslRaw) : null;
    const targetParsed = mapping.target ? parseNumber(targetRaw) : null;

    const lsl = lslParsed === null ? undefined : lslParsed;
    const usl = uslParsed === null ? undefined : uslParsed;
    const target = targetParsed === null ? undefined : targetParsed;

    if (mapping.lsl && lslParsed === null && lslRaw.trim()) {
      issues.push(issue("Q_LSL_INVALID", "WARN", "Invalid LSL value", "LSL 数值不合法"));
    }

    if (mapping.usl && uslParsed === null && uslRaw.trim()) {
      issues.push(issue("Q_USL_INVALID", "WARN", "Invalid USL value", "USL 数值不合法"));
    }

    if (mapping.target && targetParsed === null && targetRaw.trim()) {
      issues.push(issue("Q_TARGET_INVALID", "WARN", "Invalid target value", "目标值不合法"));
    }

    if (lsl !== undefined && usl !== undefined && lsl >= usl) {
      issues.push(issue("Q_SPEC_INVALID", "ERROR", "Invalid spec: LSL >= USL", "规格不合法：LSL >= USL"));
    }

    const result = mapping.result ? normalizeResult(asString(r[mapping.result])) : "UNKNOWN";

    const context_tags: Record<string, string | number | boolean> = {};
    for (const col of mapping.tagColumns ?? []) {
      const v = asString(r[col]).trim();
      if (!v) continue;
      context_tags[col] = v;
    }

    const partId = mapping.partId ? asString(r[mapping.partId]).trim() || undefined : undefined;
    const lot = mapping.lot ? asString(r[mapping.lot]).trim() || undefined : undefined;

    return {
      index: idx,
      characteristic,
      value,
      timestampISO,
      partId,
      lot,
      unit,
      lsl,
      usl,
      target,
      result,
      context_tags,
      issues,
    };
  });
}
