import type { RadarOverallStatus } from "@/lib/riskRadar/types";
import type { FactorySummary, MachineCard, ProductionTimeseries } from "@/lib/production/types";

export type LiveRiskStatus = "ENGINEERING_OK" | "MANUFACTURING_RISK" | "HIGH_RISK";

export type DriverDimension = "engineering" | "manufacturing" | "quality";

export type BilingualText = {
  en: string;
  zh: string;
};

export type Driver = {
  dimension: DriverDimension;
  title: BilingualText;
  confidence: number;
  evidence: {
    metricRefs: string[];
    timeWindow?: { start: string; end: string };
  };
  recommendedActions: BilingualText[];
};

export type Alert = {
  id: string;
  severity: "INFO" | "WARNING" | "ERROR";
  title: BilingualText;
  evidence: BilingualText;
  suggestedActions: BilingualText[];
  machineId?: string;
  timestamp: string;
};

export type MachineRiskCard = MachineCard & {
  liveRiskStatus: LiveRiskStatus;
  liveRiskScore: number;
  topDrivers: Driver[];
};

export type LineSummary = {
  lineId: string;
  runningCount: number;
  stoppedCount: number;
  alarmCount: number;
  setupCount: number;
  throughputNow: number;
  scrapRateNow: number;
  overallLiveRisk: LiveRiskStatus;
  machines: MachineRiskCard[];
};

export type DashboardVM = {
  timestamp: string;
  factorySummary: FactorySummary & {
    overallLiveRisk: LiveRiskStatus;
    overallScore: number;
  };
  lines: LineSummary[];
  machines: MachineRiskCard[];
  alerts: Alert[];
  timeseries?: ProductionTimeseries[];
};

export type RadarByMachine = Record<string, { overallStatus: RadarOverallStatus; score: number } | undefined>;

export type QualityByCharacteristic = Record<
  string,
  {
    cpk?: number;
    nelsonViolations?: number;
    defectRate?: number;
  } | undefined
>;
