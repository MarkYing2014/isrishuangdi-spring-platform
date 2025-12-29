export type QualityRowId = string;
export type QualityMode = "RAW" | "NORMALIZED";
export type ValidationStatus = "PENDING" | "VALIDATING" | "PASS" | "WARN" | "FAIL";
export type GateState = "BLOCKED" | "CONDITIONAL_READY" | "READY";
export type ColumnType = "string" | "number" | "date";

export interface IngestPreview {
  headers: string[];
  sampleRows: Record<string, string>[];
}

export interface CellIssue {
  rowId: QualityRowId;
  rowIndex: number;
  colKey: string;
  severity: "PASS" | "WARN" | "FAIL";
  code?: string;
  message: string;
}

export interface RawRow {
  id: QualityRowId;
  cells: Record<string, string>;
  __meta: {
    rowIndex: number;
    sourceLine?: number;
  };
  // Legacy support for current store if needed, but per spec we should use these new types
  // We might need an adapter if we want to reuse existing components immediately
  __rowId?: string; // KEEP for compatibility with existing components
  [key: string]: any;
}

export interface NormalizedRow {
  id: QualityRowId;
  values: Record<string, any>;
  status: ValidationStatus;
  issues: CellIssue[];
  excluded?: boolean;

  // Legacy/Compatibility
  __rowId: string;
  [key: string]: any;
}

export interface ColumnMappingItem {
  rawKey: string;     // Column name in CSV
  targetKey: string;  // System Field Key
  type: ColumnType;
  required?: boolean;
  transform?: "trim" | "toNumber" | "toDate" | "custom";

  // Legacy COMPAT
  raw?: string;
  target?: string;
}

export interface ValidationSummary {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  excluded: number;
  status: ValidationStatus;
}

export interface GateDecision {
  acceptedWarnings: boolean;
  excludedFailed: boolean;
  decidedAt?: number;
}

// Audit Events
export type AuditEventType =
  | "IMPORT"
  | "MAPPING_UPDATE"
  | "CELL_EDIT"
  | "EXCLUDE_ROWS"
  | "GATE_DECISION"
  | "STEP_NAV";

export interface AuditEvent {
  type: AuditEventType;
  at: number;
  payload: any;
}

// --- HELPERS ---

export function deriveValidationStatus(summary: ValidationSummary): ValidationStatus {
  if (summary.fail > 0) return "FAIL";
  if (summary.warn > 0) return "WARN";
  return "PASS";
}

export function deriveGateState(summary: ValidationSummary): GateState {
  if (summary.fail > 0) return "BLOCKED";
  if (summary.warn > 0) return "CONDITIONAL_READY";
  return "READY";
}

export function canEnterAnalysis(summary: ValidationSummary, decision: GateDecision): boolean {
  const gate = deriveGateState(summary);

  if (gate === "READY") return true;

  if (gate === "CONDITIONAL_READY") {
    return decision.acceptedWarnings === true;
  }

  if (gate === "BLOCKED") {
    // Technically strict blocking means NO ENTRY if fail > 0.
    // Even if excludedFailed is true, summary.fail should be 0 because they are excluded.
    // So if summary.fail is still > 0, it means there are still active failures.
    return false;
  }

  return false;
}

// --- STEPPER LOGIC ---

export type QualityStep = "IMPORT" | "MAPPING" | "VALIDATION" | "ANALYSIS" | "EXPORT";
export type StepStatus = "LOCKED" | "AVAILABLE" | "ACTIVE" | "DONE" | "BLOCKED";

export interface StepperSnapshot {
  activeStep: QualityStep;
  steps: Array<{
    key: QualityStep;
    status: StepStatus;
    title: { zh: string; en: string };
    description?: { zh: string; en: string };
  }>;
  gateState: GateState;
  summary: ValidationSummary;
}

export function computeStepperSnapshot(args: {
  activeStep: QualityStep;
  summary: ValidationSummary;
  gateDecision: GateDecision;
  hasData: boolean;
  hasMapping: boolean;
  analysisRunAt?: number;
  exportRunAt?: number;
}): StepperSnapshot {
  const { activeStep, summary, gateDecision, hasData, hasMapping, analysisRunAt, exportRunAt } = args;
  const gate = deriveGateState(summary);

  // Helper to determine status for a step
  const getStatus = (key: QualityStep): StepStatus => {
    // 1. ACTIVE check
    if (activeStep === key) return "ACTIVE";

    // 2. Specific Logic per step
    switch (key) {
      case "IMPORT":
        // Always available if not active. Done if we have data.
        return hasData ? "DONE" : "AVAILABLE"; // Actually if hasData and we are further ahead, it's DONE. If active, it's ACTIVE.

      case "MAPPING":
        if (!hasData) return "LOCKED";
        // If we are past mapping or have mapping? Spec: DONE: hasMapping=true
        // But if activeStep is IMPORT, Mapping is AVAILABLE (next step)?
        // If hasData is true, Mapping is AVAILABLE.
        if (hasMapping && activeStep !== "IMPORT") return "DONE"; // Assuming sequential flow roughly, or just hasMapping means done.
        return "AVAILABLE";

      case "VALIDATION":
        if (!hasData) return "LOCKED";
        // DONE: summary.status in PASS/WARN/FAIL & total > 0
        const isValidationDone = summary.total > 0 && ["PASS", "WARN", "FAIL"].includes(summary.status);
        if (isValidationDone) {
          // BLOCKED check: summary.fail > 0
          if (summary.fail > 0) return "BLOCKED";
          // Else passed/warned
          // If we are past VALIDATION (e.g. ANALYSIS), return DONE
          if (activeStep === "ANALYSIS" || activeStep === "EXPORT") return "DONE";
          // If current step is MAPPING, then Validation is AVAILABLE (next).
        }
        return "AVAILABLE"; // If hasData, we can always go to Validation (it triggers validateAll)

      case "ANALYSIS":
        if (!hasData) return "LOCKED";
        // BLOCKED: hasData && summary.fail > 0
        if (summary.fail > 0) return "BLOCKED";

        // CAN ENTER?
        const canEnter = canEnterAnalysis(summary, gateDecision);

        // Spec: AVAILABLE: hasData && canEnterAnalysis=true
        // Spec: CONDITIONAL READY: fail=0, warn>0, !accepted => AVAILABLE (but typically shown distinct in UI, here we map to Status)
        // If not canEnter (e.g. warn>0 and not accepted), strictly it is NOT "AVAILABLE" for *entry* without confirm. 
        // But the requirements say "CONDITIONAL READY ... (表现为 AVAILABLE 但点击需确认)".
        // So we return AVAILABLE. The "click confirm" logic is in the UI/Action handler, not the status enum necessarily.
        // Wait, if I return LOCKED, UI shows lock.
        // If I return AVAILABLE, UI shows clickable.

        if (canEnter || (summary.fail === 0 && summary.warn > 0)) {
          if (analysisRunAt) return "DONE";
          return "AVAILABLE";
        }

        return "LOCKED"; // If not blocked but not available (e.g. initial state?) -> Actually if data exists, we usually can try.
        // If summary.total=0 (not validated yet), strictly LOCKED?
        if (summary.total === 0) return "LOCKED";

        return "LOCKED";

      case "EXPORT":
        if (!hasData) return "LOCKED";
        // AVAILABLE: hasData && (analysisRunAt or summary.status ok)
        // If validation failed, can we export? Spec: "AVAILABLE: hasData && (analysisRunAt 存在 或 summary.status 可用)（允许导出清洗数据/失败数据/审计报告）"
        // So even if blocked for analysis, we might export failure report.
        // Let's say if total > 0 it is AVAILABLE.
        if (analysisRunAt || summary.total > 0) {
          if (exportRunAt) return "DONE";
          return "AVAILABLE";
        }
        return "LOCKED";
    }
    return "LOCKED";
  };

  const steps: QualityStep[] = ["IMPORT", "MAPPING", "VALIDATION", "ANALYSIS", "EXPORT"];

  return {
    activeStep,
    gateState: gate,
    summary,
    steps: steps.map(key => ({
      key,
      status: key === activeStep ? "ACTIVE" : getStatus(key),
      title: {
        zh: getKeyTitleZh(key),
        en: getKeyTitleEn(key)
      }
    }))
  };
}

function getKeyTitleZh(key: QualityStep): string {
  switch (key) {
    case "IMPORT": return "导入";
    case "MAPPING": return "映射";
    case "VALIDATION": return "校验";
    case "ANALYSIS": return "分析";
    case "EXPORT": return "导出";
  }
}

function getKeyTitleEn(key: QualityStep): string {
  switch (key) {
    case "IMPORT": return "Import";
    case "MAPPING": return "Mapping";
    case "VALIDATION": return "Validation";
    case "ANALYSIS": return "Analysis";
    case "EXPORT": return "Export";
  }
}

// --- LEGACY TYPES (Restored for Compatibility with Analytics Engine) ---

export interface FieldMapping {
  characteristic?: string;
  value: string;
  timestamp?: string;
  unit?: string;
  lsl?: string;
  usl?: string;
  target?: string;
  result?: string;
  tagColumns?: string[];
  partId?: string;
  lot?: string;
  machine?: string;
  shift?: string;
  appraiser?: string;
  gage?: string;
  subgroupId?: string;
  trial?: string;
  // Fixed values (used when no column is mapped)
  lslFixed?: number;
  uslFixed?: number;
  targetFixed?: number;
}

export interface QualityDataset {
  id: string;
  name?: string;
  createdAtISO?: string;
  source?: string | { type: string; fileName?: string };
  headers?: string[];
  rows: Record<string, string>[];
  inferredMapping?: any;
}

export interface ImrPoint {
  x: number;
  value: number;
  cl: number;
  ucl: number;
  lcl: number;
  outOfControl: boolean;
}

export interface ImrChart {
  points: ImrPoint[];
  mean: number;
  sigma: number;
  mrBar: number;
  ucl: number;
  lcl: number;
}

export interface XbarRPoint {
  index: number;
  subgroupId: string;
  n: number;
  mean: number;
  range: number;
  xcl: number;
  xucl: number;
  xlcl: number;
  rcl: number;
  rucl: number;
  rlcl: number;
  xOutOfControl: boolean;
  rOutOfControl: boolean;
}

export interface XbarRChart {
  subgroupSize: number;
  xbarbar?: number;
  rbar?: number;
  xcl?: number;
  xucl?: number;
  xlcl?: number;
  rcl?: number;
  rucl?: number;
  rlcl?: number;
  constants?: any;
  points: XbarRPoint[];
}

export interface NormalizedMeasurement {
  index: number;
  characteristic: string;
  value: number | null;
  timestampISO: string | null;
  partId?: string;
  lot?: string;
  machine?: string;
  shift?: string;
  appraiser?: string;
  gage?: string;
  subgroupId?: string;
  trial?: number;
  unit?: string;
  lsl?: number;
  usl?: number;
  target?: number;
  result: "PASS" | "FAIL" | "UNKNOWN";
  // context_tags removed or optional
  context_tags?: Record<string, string | number | boolean>;
  issues: QualityFinding[];
  [key: string]: any; // Allow stratifyBy access
}

export interface QualityFinding {
  id: string;
  severity: "ERROR" | "WARN" | "INFO";
  title: { en: string; zh: string };
  detail: { en: string; zh: string };
}

export type QualityOverallStatus = "HIGH_RISK" | "MANUFACTURING_RISK" | "ENGINEERING_OK";

export interface QualityAnalysisResult {
  datasetId: string;
  options: { stratifyBy?: QualityStratifyBy };
  status: QualityOverallStatus;
  score: number;
  dataQuality: {
    score: number;
    issues: QualityFinding[];
    stats: {
      totalRows: number;
      validMeasurements: number;
      missingValueCount?: number;
      invalidValueCount?: number;
      invalidTimestampCount?: number;
    };
  };
  keyFindings: QualityFinding[];
  characteristics: CharacteristicAnalysis[];
  stratification?: QualityStratificationResult;
}

export type QualityStratifyBy = "auto" | "none" | "machine" | "lot" | "shift" | "appraiser" | "gage";

export interface CharacteristicAnalysis {
  name: string;
  unit?: string;
  count: number;
  imr: ImrChart;
  nelson: any;
  xbarr?: XbarRChart;
  msa?: any;
  capability: {
    cp: number | null;
    cpk: number | null;
    lsl: number | null;
    usl: number | null;
    target: number | null;
    n: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    assessment: { en: string; zh: string };
    note?: { en: string; zh: string };
  };
  findings: QualityFinding[];
}


export interface QualityStratumAnalysis {
  key: string;
  count: number;
  status: QualityOverallStatus;
  score: number;
  dataQuality: any;
  keyFindings: QualityFinding[];
  characteristics: CharacteristicAnalysis[];
}

export interface QualityStratificationResult {
  by: string;
  strata: QualityStratumAnalysis[];
}



export type QualityChartMode = "RAW" | "AGGREGATED";
export type QualityDebugMode = "OFF" | "SERIES" | "RAW";

export interface QualityDebugState {
  mode: QualityDebugMode;
  rawSampleSize: number;      // default 200
  rawSampleSeed?: number;     // optional deterministic sampling
  showRawWhenAggregated: "EMPTY" | "SAMPLED"; // default "EMPTY"
}

export interface QualityChartState {
  chartMode: QualityChartMode; // default "AGGREGATED"
  debug: QualityDebugState;
}

export type RawRowView = Record<string, unknown> & { __rowIndex?: number };

export interface AnalysisResult extends QualityAnalysisResult { } // Alias for convenience

export interface DataQualitySummary {
  score: number;
  issues: QualityFinding[];
  stats: {
    totalRows: number;
    validMeasurements: number;
    missingValueCount: number;
    invalidValueCount: number;
    invalidTimestampCount: number;
  };
}
