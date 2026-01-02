import { ProcessType, DeviceStatus, FactoryConfig } from "./types";

/**
 * Simulation Data Structures
 */

export interface WorkOrder {
    id: string;              // "WO-001"
    designCode: string;      // "CS-2024-003"
    qty: number;             // total quantity to produce
    dueISO?: string;         // optional deadline
    route: ProcessType[];    // ordered process steps
    priority?: number;       // 1 (low) .. 5 (high)
}

export interface SimRequest {
    startISO: string;        // when does the shift start?
    horizonMin: number;      // how many minutes to simulate?
    stepSec: number;         // time-step resolution (e.g. 10s or 60s)
    factory: FactoryConfig;
    workOrders: WorkOrder[];
    seed: number;            // deterministic seed
}

export interface DeviceSimState {
    deviceId: string;
    status: DeviceStatus;
    activeWorkOrderId?: string;
    designCode?: string;     // current running design
    producedCount: number;   // total units produced (good + scrap)
    goodCount: number;       // first pass good units
    scrapCount: number;      // failed units
    runTimeSec: number;      // cumulative time in RUNNING state
    setupTimeSec: number;    // cumulative time in SETUP state
    downTimeSec: number;     // cumulative time in DOWN state
    utilization: number;     // runTimeSec / horizonTimeSec
    queueLen: number;        // how many jobs waiting for this process
    progress01: number;      // current unit progress (0..1)
    lastEvent?: string;      // description of last state change
}

export interface SimKPIs {
    planQty: number;         // total units planned to be produced
    actualGoodQty: number;   // total good units produced across all devices
    oee: number;             // aggregated Overall Equipment Effectiveness (0..1)
    fpy: number;             // weighted First Pass Yield (0..1)
    uph: number;             // Units Per Hour = totalGood / (horizon / 60)
    avgCtSec: number;        // average cycle time across RUNNING devices
    totalScrap: number;
    alarms: Array<{
        id: string;
        severity: "INFO" | "WARN" | "FAIL";
        message: string;
        deviceId?: string;
    }>;
}

export interface SimResult {
    kpis: SimKPIs;
    devices: DeviceSimState[];
    durationMs: number;      // how long the sim computation took
    isCoarsened: boolean;    // was stepSec increased for performance?
}
