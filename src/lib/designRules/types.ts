export type DesignRuleStatus = "OK" | "WARN" | "FAIL";

export type DesignRuleLevel = "error" | "warning" | "info";

export type DesignRuleMetric = {
  value: number | string;
  unit?: string;
  labelEn?: string;
  labelZh?: string;
  noteEn?: string;
  noteZh?: string;
};

export type DesignRuleFinding = {
  id: string;
  level: DesignRuleLevel;
  titleZh: string;
  titleEn: string;
  detailZh?: string;
  detailEn?: string;
  evidence?: Record<string, unknown>;
  suggestionZh?: string;
  suggestionEn?: string;
};

export type DesignRuleReport = {
  summary: { status: DesignRuleStatus; score?: number };
  metrics: Record<string, DesignRuleMetric>;
  findings: DesignRuleFinding[];
};

export function summarizeRuleStatus(findings: DesignRuleFinding[]): DesignRuleStatus {
  const hasError = findings.some((f) => f.level === "error");
  if (hasError) return "FAIL";
  const hasWarning = findings.some((f) => f.level === "warning");
  if (hasWarning) return "WARN";
  return "OK";
}
