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
  capability: CapabilityResult;
  findings: QualityFinding[];
};

export type QualityAnalysisResult = {
  datasetId: string;
  status: QualityOverallStatus;
  score: number;
  dataQuality: DataQualitySummary;
  keyFindings: QualityFinding[];
  characteristics: CharacteristicAnalysis[];
};
