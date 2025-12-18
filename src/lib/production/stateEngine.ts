import type { ProductionDataSource, ProductionSnapshot, ProductionState, RiskLevel } from "./types";
import { generateDemoProductionSnapshot } from "./demoGenerator";

export type StateEngineMode = "demo" | "real";

export type StateEngineOptions = {
  mode: StateEngineMode;
  demoRiskPreset?: RiskLevel;
  demoSeed?: number;
  demoPollIntervalMs?: number;
};

class DemoDataSource implements ProductionDataSource {
  private riskPreset: RiskLevel;
  private seed: number;
  private pollIntervalMs: number;

  constructor(options: { riskPreset?: RiskLevel; seed?: number; pollIntervalMs?: number }) {
    this.riskPreset = options.riskPreset ?? "OK";
    this.seed = options.seed ?? Date.now();
    this.pollIntervalMs = options.pollIntervalMs ?? 5000;
  }

  subscribe(callback: (state: ProductionState) => void): () => void {
    let running = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = () => {
      if (!running) return;
      const snapshot = generateDemoProductionSnapshot({
        seed: this.seed++,
        riskPreset: this.riskPreset,
        includeTimeseries: false,
      });
      for (const machine of snapshot.machines) {
        if (!running) break;
        callback({
          timestamp: snapshot.timestamp,
          lineId: machine.lineId,
          machineId: machine.machineId,
          productId: machine.productId,
          springType: machine.springType,
          status: machine.status,
          cycleTimeMs: machine.cycleTimeMs,
          throughputPerHour: Math.round((3600 * 1000) / machine.cycleTimeMs),
          scrapRate: machine.scrapRate,
          processParams: { tempC: machine.tempC ?? undefined },
          qualitySignals: {
            lastCpk: machine.lastCpk ?? undefined,
            lastNelsonViolations: machine.lastNelsonViolations,
            lastDefectRate: machine.scrapRate,
          },
        });
      }
      timeoutId = setTimeout(poll, this.pollIntervalMs);
    };

    poll();

    return () => {
      running = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }

  async getSnapshot(): Promise<ProductionSnapshot> {
    return generateDemoProductionSnapshot({
      seed: this.seed,
      riskPreset: this.riskPreset,
      includeTimeseries: true,
    });
  }
}

class RealDataSource implements ProductionDataSource {
  subscribe(_callback: (state: ProductionState) => void): () => void {
    console.warn("[ProductionStateEngine] Real data source not implemented yet. Use demo mode.");
    return () => {};
  }

  async getSnapshot(): Promise<ProductionSnapshot> {
    console.warn("[ProductionStateEngine] Real data source not implemented yet. Returning empty snapshot.");
    return {
      timestamp: new Date().toISOString(),
      factorySummary: {
        runningCount: 0,
        stoppedCount: 0,
        alarmCount: 0,
        setupCount: 0,
        throughputNow: 0,
        scrapRateNow: 0,
      },
      machines: [],
    };
  }
}

let currentDataSource: ProductionDataSource | null = null;
let currentMode: StateEngineMode = "demo";

export function initStateEngine(options: StateEngineOptions): ProductionDataSource {
  currentMode = options.mode;

  if (options.mode === "demo") {
    currentDataSource = new DemoDataSource({
      riskPreset: options.demoRiskPreset,
      seed: options.demoSeed,
      pollIntervalMs: options.demoPollIntervalMs,
    });
  } else {
    currentDataSource = new RealDataSource();
  }

  return currentDataSource;
}

export function getProductionDataSource(): ProductionDataSource {
  if (!currentDataSource) {
    currentDataSource = new DemoDataSource({});
  }
  return currentDataSource;
}

export function getCurrentMode(): StateEngineMode {
  return currentMode;
}

export async function getProductionSnapshot(options?: { mode?: StateEngineMode; riskPreset?: RiskLevel; seed?: number }): Promise<ProductionSnapshot> {
  const mode = options?.mode ?? "demo";

  if (mode === "demo") {
    return generateDemoProductionSnapshot({
      seed: options?.seed ?? Date.now(),
      riskPreset: options?.riskPreset ?? "OK",
      includeTimeseries: true,
    });
  }

  const ds = getProductionDataSource();
  return ds.getSnapshot();
}
