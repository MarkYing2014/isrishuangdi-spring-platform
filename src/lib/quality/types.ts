export type BilingualText = { en: string; zh: string };

export type QualityFindingSeverity = "INFO" | "WARN" | "ERROR";

export type QualityFinding = {
  id: string;
  severity: QualityFindingSeverity;
  title: BilingualText;
  detail: BilingualText;
};

export type QualityOverallStatus = "ENGINEERING_OK" | "MANUFACTURING_RISK" | "HIGH_RISK";

export type QualityDatasetSource = {
  type: "upload";
  fileName?: string;
};

export type QualityDataset = {
  id: string;
  name: string;
  createdAtISO: string;
  source: QualityDatasetSource;
  headers: string[];
  rows: Record<string, string>[];
  inferredMapping?: FieldMapping;
};

export type FieldMapping = {
  timestamp?: string;
  value: string;
  characteristic?: string;
  partId?: string;
  lot?: string;
  machine?: string;
  shift?: string;
  appraiser?: string;
  gage?: string;
  trial?: string;
  subgroupId?: string;
  unit?: string;
  lsl?: string;
  usl?: string;
  target?: string;
  result?: string;
  tagColumns?: string[];
};

export type IngestPreview = {
  headers: string[];
  sampleRows: Record<string, string>[];
};

export type NormalizedMeasurement = {
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
  trial?: number;
  subgroupId?: string;
  unit?: string;
  lsl?: number;
  usl?: number;
  target?: number;
  result?: "PASS" | "FAIL" | "UNKNOWN";
  context_tags: Record<string, string | number | boolean>;
  issues: QualityFinding[];
};

export type DataQualitySummary = {
  score: number;
  issues: QualityFinding[];
  stats: {
    totalRows: number;
    validMeasurements: number;
    missingValueCount: number;
    invalidValueCount: number;
    invalidTimestampCount: number;
  };
};

export type ImrPoint = {
  x: number;
  value: number;
  cl: number;
  ucl: number;
  lcl: number;
  outOfControl: boolean;
};

export type ImrChart = {
  points: ImrPoint[];
  mean: number;
  sigma: number;
  mrBar: number;
  ucl: number;
  lcl: number;
};

export type NelsonViolation = {
  rule: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  startIndex: number;
  endIndex: number;
  direction: string;
  points: number[];
};

export type NelsonResult = {
  violations: NelsonViolation[];
  counts: Record<string, number>;
};

export type XbarRSubgroupPoint = {
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
};

export type XbarRChart = {
  subgroupSize: number;
  xbarbar: number;
  rbar: number;
  xcl: number;
  xucl: number;
  xlcl: number;
  rcl: number;
  rucl: number;
  rlcl: number;
  constants: {
    A2: number;
    D3: number;
    D4: number;
  };
  points: XbarRSubgroupPoint[];
};

export type MsaAssessment = "ACCEPTABLE" | "MARGINAL" | "UNACCEPTABLE" | "INSUFFICIENT_DATA";

export type MsaGageRrResult = {
  design: "crossed";
  parts: number;
  appraisers: number;
  trials: number;
  ev: number;
  av: number;
  iv: number;
  pv: number;
  grr: number;
  tv: number;
  pctGrr: number | null;
  ndc: number | null;
  assessment: MsaAssessment;
};

export type CapabilityResult = {
  mean: number;
  std: number;
  min: number;
  max: number;
  count: number;
  lsl: number | null;
  usl: number | null;
  target: number | null;
  cp: number | null;
  cpk: number | null;
};

export type CharacteristicAnalysis = {
  name: string;
  unit?: string;
  count: number;
  imr: ImrChart;
  nelson?: NelsonResult;
  xbarr?: XbarRChart;
  msa?: MsaGageRrResult;
  capability: CapabilityResult;
  findings: QualityFinding[];
};

export type QualityStratifyBy = "auto" | "none" | "machine" | "lot" | "shift" | "appraiser" | "gage";

export type QualityStratumAnalysis = {
  key: string;
  count: number;
  status: QualityOverallStatus;
  score: number;
  dataQuality: DataQualitySummary;
  keyFindings: QualityFinding[];
  characteristics: CharacteristicAnalysis[];
};

export type QualityStratificationResult = {
  by: Exclude<QualityStratifyBy, "auto" | "none">;
  strata: QualityStratumAnalysis[];
};

export type QualityAnalysisResult = {
  datasetId: string;
  options?: {
    stratifyBy?: QualityStratifyBy;
  };
  status: QualityOverallStatus;
  score: number;
  dataQuality: DataQualitySummary;
  keyFindings: QualityFinding[];
  characteristics: CharacteristicAnalysis[];
  stratification?: QualityStratificationResult;
};
