import type {
  FactorySummary,
  MachineCard,
  MachineStatus,
  ProcessParams,
  ProductionSnapshot,
  ProductionState,
  ProductionTimeseries,
  QualitySignals,
  RiskLevel,
} from "./types";
import { PRODUCTION_CONFIG } from "./config";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DemoGeneratorOptions = {
  seed?: number;
  machineCount?: number;
  lineCount?: number;
  riskPreset?: RiskLevel;
  includeTimeseries?: boolean;
  timeseriesMinutes?: number;
};

const SPRING_TYPES = ["compression", "extension", "torsion", "conical", "spiral"];
const PRODUCT_IDS = ["SP-001", "SP-002", "SP-003", "EX-101", "TOR-201"];

export function generateDemoProductionSnapshot(options: DemoGeneratorOptions = {}): ProductionSnapshot {
  const {
    seed = Date.now(),
    machineCount = 8,
    lineCount = 2,
    riskPreset = "OK",
    includeTimeseries = true,
    timeseriesMinutes = 60,
  } = options;

  const rand = mulberry32(seed);
  const now = new Date();
  const timestamp = now.toISOString();

  const machines: MachineCard[] = [];
  const states: ProductionState[] = [];
  const timeseries: ProductionTimeseries[] = [];

  for (let i = 0; i < machineCount; i++) {
    const machineId = `M${String(i + 1).padStart(2, "0")}`;
    const lineId = `L${String((i % lineCount) + 1).padStart(2, "0")}`;
    const productId = PRODUCT_IDS[i % PRODUCT_IDS.length];
    const springType = SPRING_TYPES[i % SPRING_TYPES.length];

    const { state, card, ts } = generateMachineData({
      rand,
      machineId,
      lineId,
      productId,
      springType,
      riskPreset,
      timestamp,
      includeTimeseries,
      timeseriesMinutes,
      machineIndex: i,
    });

    states.push(state);
    machines.push(card);
    if (ts) timeseries.push(ts);
  }

  const factorySummary = computeFactorySummary(machines, states);

  return {
    timestamp,
    factorySummary,
    machines,
    timeseries: includeTimeseries ? timeseries : undefined,
  };
}

function generateMachineData(args: {
  rand: () => number;
  machineId: string;
  lineId: string;
  productId: string;
  springType: string;
  riskPreset: RiskLevel;
  timestamp: string;
  includeTimeseries: boolean;
  timeseriesMinutes: number;
  machineIndex: number;
}): { state: ProductionState; card: MachineCard; ts?: ProductionTimeseries } {
  const { rand, machineId, lineId, productId, springType, riskPreset, timestamp, includeTimeseries, timeseriesMinutes, machineIndex } = args;

  let status: MachineStatus = "RUNNING";
  let cycleTimeMs = PRODUCTION_CONFIG.defaultCycleTimeMs;
  let cycleTimeDeltaPct = 0;
  let scrapRate = 0.005;
  let tempC = 22 + rand() * 3;
  let tempDrift = false;
  let cpk: number | null = 1.5 + rand() * 0.3;
  let nelsonViolations = 0;

  if (riskPreset === "WARN") {
    if (machineIndex % 3 === 0) {
      cycleTimeDeltaPct = 0.12 + rand() * 0.05;
      cycleTimeMs = PRODUCTION_CONFIG.defaultCycleTimeMs * (1 + cycleTimeDeltaPct);
      scrapRate = 0.015 + rand() * 0.01;
      cpk = 1.1 + rand() * 0.2;
      nelsonViolations = 1;
      tempDrift = rand() > 0.5;
      if (tempDrift) tempC += 3 + rand() * 2;
    }
  } else if (riskPreset === "HIGH") {
    if (machineIndex % 2 === 0) {
      status = rand() > 0.7 ? "ALARM" : "RUNNING";
      cycleTimeDeltaPct = 0.18 + rand() * 0.1;
      cycleTimeMs = PRODUCTION_CONFIG.defaultCycleTimeMs * (1 + cycleTimeDeltaPct);
      scrapRate = 0.035 + rand() * 0.02;
      cpk = 0.7 + rand() * 0.25;
      nelsonViolations = 2 + Math.floor(rand() * 2);
      tempDrift = true;
      tempC += 5 + rand() * 3;
    }
  }

  if (rand() > 0.9 && riskPreset === "OK") {
    status = "SETUP";
  }
  if (rand() > 0.95 && riskPreset === "OK") {
    status = "STOPPED";
  }

  const throughputPerHour = Math.round((3600 * 1000) / cycleTimeMs);

  const processParams: ProcessParams = {
    tempC: Math.round(tempC * 10) / 10,
    speedRpm: 800 + Math.round(rand() * 400),
    forceN: 50 + Math.round(rand() * 100),
    torqueNm: 5 + Math.round(rand() * 10),
    humidity: 40 + Math.round(rand() * 20),
  };

  const qualitySignals: QualitySignals = {
    lastCpk: cpk !== null ? Math.round(cpk * 100) / 100 : undefined,
    lastNelsonViolations: nelsonViolations,
    lastDefectRate: Math.round(scrapRate * 10000) / 10000,
  };

  const state: ProductionState = {
    timestamp,
    lineId,
    machineId,
    productId,
    springType,
    status,
    cycleTimeMs: Math.round(cycleTimeMs),
    throughputPerHour,
    scrapRate: Math.round(scrapRate * 10000) / 10000,
    processParams,
    qualitySignals,
  };

  const card: MachineCard = {
    machineId,
    lineId,
    productId,
    springType,
    status,
    cycleTimeMs: Math.round(cycleTimeMs),
    cycleTimeDeltaPct: Math.round(cycleTimeDeltaPct * 1000) / 1000,
    lastCpk: cpk !== null ? Math.round(cpk * 100) / 100 : null,
    lastNelsonViolations: nelsonViolations,
    scrapRate: Math.round(scrapRate * 10000) / 10000,
    tempC: Math.round(tempC * 10) / 10,
    tempDrift,
  };

  let ts: ProductionTimeseries | undefined;
  if (includeTimeseries) {
    ts = generateTimeseries({
      rand,
      machineId,
      baseTimestamp: new Date(timestamp),
      minutes: timeseriesMinutes,
      baseCycleTimeMs: cycleTimeMs,
      baseTempC: tempC,
      baseCpk: cpk ?? 1.5,
      baseScrapRate: scrapRate,
      tempDrift,
    });
  }

  return { state, card, ts };
}

function generateTimeseries(args: {
  rand: () => number;
  machineId: string;
  baseTimestamp: Date;
  minutes: number;
  baseCycleTimeMs: number;
  baseTempC: number;
  baseCpk: number;
  baseScrapRate: number;
  tempDrift: boolean;
}): ProductionTimeseries {
  const { rand, machineId, baseTimestamp, minutes, baseCycleTimeMs, baseTempC, baseCpk, baseScrapRate, tempDrift } = args;

  const points: ProductionTimeseries["points"] = [];
  const startTime = new Date(baseTimestamp.getTime() - minutes * 60 * 1000);

  for (let m = 0; m <= minutes; m++) {
    const t = new Date(startTime.getTime() + m * 60 * 1000);
    const driftFactor = tempDrift ? m / minutes : 0;

    points.push({
      timestamp: t.toISOString(),
      cycleTimeMs: Math.round(baseCycleTimeMs * (1 + (rand() - 0.5) * 0.05)),
      tempC: Math.round((baseTempC - driftFactor * 3 + (rand() - 0.5) * 0.5) * 10) / 10,
      cpk: Math.round((baseCpk + (rand() - 0.5) * 0.1) * 100) / 100,
      scrapRate: Math.round((baseScrapRate + (rand() - 0.5) * 0.005) * 10000) / 10000,
    });
  }

  return { machineId, points };
}

function computeFactorySummary(machines: MachineCard[], states: ProductionState[]): FactorySummary {
  let runningCount = 0;
  let stoppedCount = 0;
  let alarmCount = 0;
  let setupCount = 0;
  let totalThroughput = 0;
  let totalScrap = 0;

  for (const m of machines) {
    switch (m.status) {
      case "RUNNING":
        runningCount++;
        break;
      case "STOPPED":
        stoppedCount++;
        break;
      case "ALARM":
        alarmCount++;
        break;
      case "SETUP":
        setupCount++;
        break;
    }
  }

  for (const s of states) {
    if (s.status === "RUNNING") {
      totalThroughput += s.throughputPerHour;
      totalScrap += s.scrapRate;
    }
  }

  const runningMachines = states.filter((s) => s.status === "RUNNING").length;
  const avgScrapRate = runningMachines > 0 ? totalScrap / runningMachines : 0;

  return {
    runningCount,
    stoppedCount,
    alarmCount,
    setupCount,
    throughputNow: totalThroughput,
    scrapRateNow: Math.round(avgScrapRate * 10000) / 10000,
  };
}

export function generateDemoProductionState(args: {
  machineId: string;
  springType: string;
  riskLevel: RiskLevel;
  seed?: number;
}): ProductionState {
  const snapshot = generateDemoProductionSnapshot({
    seed: args.seed ?? Date.now(),
    machineCount: 1,
    lineCount: 1,
    riskPreset: args.riskLevel,
    includeTimeseries: false,
  });

  const state = snapshot.machines[0];
  return {
    timestamp: snapshot.timestamp,
    lineId: state.lineId,
    machineId: args.machineId,
    productId: state.productId,
    springType: args.springType,
    status: state.status,
    cycleTimeMs: state.cycleTimeMs,
    throughputPerHour: Math.round((3600 * 1000) / state.cycleTimeMs),
    scrapRate: state.scrapRate,
    processParams: {
      tempC: state.tempC ?? undefined,
    },
    qualitySignals: {
      lastCpk: state.lastCpk ?? undefined,
      lastNelsonViolations: state.lastNelsonViolations,
      lastDefectRate: state.scrapRate,
    },
  };
}
