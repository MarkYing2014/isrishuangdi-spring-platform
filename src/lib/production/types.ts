export type MachineStatus = "RUNNING" | "STOPPED" | "ALARM" | "SETUP";

export type ProcessParams = {
  tempC?: number;
  speedRpm?: number;
  forceN?: number;
  torqueNm?: number;
  humidity?: number;
};

export type QualitySignals = {
  lastCpk?: number;
  lastNelsonViolations?: number;
  lastDefectRate?: number;
};

export type ProductionState = {
  timestamp: string;
  lineId: string;
  machineId: string;
  productId: string;
  springType: string;
  status: MachineStatus;
  cycleTimeMs: number;
  throughputPerHour: number;
  scrapRate: number;
  processParams: ProcessParams;
  qualitySignals: QualitySignals;
};

export type ProductionTimeseries = {
  machineId: string;
  points: Array<{
    timestamp: string;
    cycleTimeMs: number;
    tempC?: number;
    cpk?: number;
    scrapRate?: number;
  }>;
};

export type FactorySummary = {
  runningCount: number;
  stoppedCount: number;
  alarmCount: number;
  setupCount: number;
  throughputNow: number;
  scrapRateNow: number;
};

export type MachineCard = {
  machineId: string;
  lineId: string;
  productId: string;
  springType: string;
  status: MachineStatus;
  cycleTimeMs: number;
  cycleTimeDeltaPct: number;
  lastCpk: number | null;
  lastNelsonViolations: number;
  scrapRate: number;
  tempC: number | null;
  tempDrift: boolean;
};

export type ProductionSnapshot = {
  timestamp: string;
  factorySummary: FactorySummary;
  machines: MachineCard[];
  timeseries?: ProductionTimeseries[];
};

export type RiskLevel = "OK" | "WARN" | "HIGH";

export interface ProductionDataSource {
  subscribe(callback: (state: ProductionState) => void): () => void;
  getSnapshot(): Promise<ProductionSnapshot>;
}
