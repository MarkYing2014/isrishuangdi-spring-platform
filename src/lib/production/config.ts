export const PRODUCTION_CONFIG = {
  scrapRateWarnThreshold: 0.01,
  scrapRateHighThreshold: 0.03,
  cycleTimeDeltaWarnPct: 0.1,
  cycleTimeDeltaHighPct: 0.2,
  cpkWarnThreshold: 1.33,
  cpkHighThreshold: 1.0,
  nelsonViolationsWarnThreshold: 1,
  nelsonViolationsHighThreshold: 2,
  tempDriftWindowMinutes: 30,
  tempDriftThresholdC: 2,
  defaultCycleTimeMs: 3000,
  defaultThroughputPerHour: 1200,
} as const;

export type ProductionConfig = typeof PRODUCTION_CONFIG;
