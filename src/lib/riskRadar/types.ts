export type RiskRadarSpringType =
  | "compression"
  | "arc"
  | "spiral"
  | "extension"
  | "torsion"
  | "conical"
  | "variablePitch"
  | "wave"
  | "dieSpring";

export type RiskDimensionKey = "engineering" | "manufacturing" | "quality";

export type RiskStatus = "OK" | "WARN" | "FAIL";

export type RadarOverallStatus = "ENGINEERING_OK" | "MANUFACTURING_RISK" | "HIGH_RISK";

export type RiskFindingLevel = "INFO" | "WARNING" | "ERROR";

export type RiskMetric = {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  reference?: string;
};

export type RiskFinding = {
  ruleId: string;
  level: RiskFindingLevel;
  dimension: RiskDimensionKey;
  title: {
    en: string;
    zh: string;
  };
  explanation: {
    en: string;
    zh: string;
  };
  evidence?: {
    computedFrom?: string[];
    value?: number;
    threshold?: number | string;
  };
  recommendation?: {
    en: string;
    zh: string;
  };
};

export type RiskDimension = {
  status: RiskStatus;
  score: number;
  metrics: RiskMetric[];
  findings: RiskFinding[];
};

export type EngineeringRiskRadar = {
  springType: RiskRadarSpringType;
  overallStatus: RadarOverallStatus;
  dimensions: {
    engineering: RiskDimension;
    manufacturing: RiskDimension;
    quality: RiskDimension;
  };
  summary: {
    score: number;
    label: string;
    keyRisks: string[];
  };
  findings: RiskFinding[];
};
