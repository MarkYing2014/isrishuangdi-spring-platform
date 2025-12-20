/**
 * Manufacturing Mock Data Generator
 * 生产制造模拟数据生成器
 * 
 * 用于演示和开发，无需真实 PLC 连接
 */

import type {
  MachineState,
  MachineTile,
  KpiSummary,
  AndonEvent,
  AndonSeverity,
  AndonEventType,
  TrendPoint,
  ThroughputPoint,
  ParetoItem,
  WorkOrderRow,
  WorkOrderStatus,
  DashboardSummaryResponse,
  TimeRange,
  PlantConfig,
  ShiftConfig,
} from "./types";

// ============================================================================
// Seeded Random Generator
// ============================================================================

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// Configuration
// ============================================================================

export const MOCK_PLANTS: PlantConfig[] = [
  {
    plantId: "P01",
    name: { en: "Main Plant", zh: "主工厂" },
    lines: [
      { lineId: "L01", name: { en: "Line 1 - Compression", zh: "1号线-压簧" }, machineIds: ["M01", "M02", "M03", "M04"] },
      { lineId: "L02", name: { en: "Line 2 - Extension", zh: "2号线-拉簧" }, machineIds: ["M05", "M06", "M07", "M08"] },
      { lineId: "L03", name: { en: "Line 3 - Torsion", zh: "3号线-扭簧" }, machineIds: ["M09", "M10", "M11", "M12"] },
    ],
  },
];

export const MOCK_SHIFTS: ShiftConfig[] = [
  { shiftId: "DAY", name: { en: "Day Shift", zh: "白班" }, startHour: 8, endHour: 20 },
  { shiftId: "NIGHT", name: { en: "Night Shift", zh: "夜班" }, startHour: 20, endHour: 8 },
];

const MACHINE_NAMES: Record<string, string> = {
  M01: "CNC-A1",
  M02: "CNC-A2",
  M03: "CNC-A3",
  M04: "CNC-A4",
  M05: "EXT-B1",
  M06: "EXT-B2",
  M07: "EXT-B3",
  M08: "EXT-B4",
  M09: "TOR-C1",
  M10: "TOR-C2",
  M11: "TOR-C3",
  M12: "TOR-C4",
};

const DESIGN_CODES = [
  "CS-2024-001",
  "CS-2024-002",
  "CS-2024-003",
  "EX-2024-001",
  "EX-2024-002",
  "TS-2024-001",
  "TS-2024-002",
  "CN-2024-001",
  "AS-2024-001",
];

const PART_NOS = [
  "SP-A100",
  "SP-A200",
  "SP-B100",
  "SP-B200",
  "SP-C100",
  "SP-C200",
];

const STOP_REASONS = ["MATERIAL", "WIRE_BREAK", "SETUP", "WAITING", "ALARM", "QUALITY", "MAINTENANCE", "OTHER"];

// ============================================================================
// Mock Data Generation
// ============================================================================

export interface MockGeneratorOptions {
  seed?: number;
  plantId?: string;
  lineId?: string;
  range?: TimeRange;
  riskLevel?: "low" | "medium" | "high";
}

/**
 * Generate mock dashboard data
 */
export function generateMockDashboard(options: MockGeneratorOptions = {}): DashboardSummaryResponse {
  const {
    seed = Date.now(),
    plantId = "P01",
    lineId,
    range = "1h",
    riskLevel = "low",
  } = options;

  const rand = mulberry32(seed);
  const now = new Date();

  // Get machines for the selected plant/line
  const plant = MOCK_PLANTS.find((p) => p.plantId === plantId) ?? MOCK_PLANTS[0];
  const lines = lineId ? plant.lines.filter((l) => l.lineId === lineId) : plant.lines;
  const machineIds = lines.flatMap((l) => l.machineIds);

  // Generate machines
  const machines = generateMachines(rand, machineIds, lines, riskLevel);

  // Get current shift
  const currentHour = now.getHours();
  const currentShift = MOCK_SHIFTS.find((s) => {
    if (s.startHour < s.endHour) {
      return currentHour >= s.startHour && currentHour < s.endHour;
    }
    return currentHour >= s.startHour || currentHour < s.endHour;
  }) ?? MOCK_SHIFTS[0];
  const isNightShift = currentShift.shiftId === "NIGHT";

  // Generate KPIs
  const kpis = generateKpis(rand, machines, riskLevel, isNightShift);

  // Generate Andon events
  const andon = generateAndonEvents(rand, machines, riskLevel);

  // Generate trends
  const ctTrend = generateCtTrend(rand, machineIds, range);
  const throughputTrend = generateThroughputTrend(rand, range);

  // Generate downtime pareto
  const downtimePareto = generateDowntimePareto(rand, riskLevel);

  // Generate work orders
  const workOrders = generateWorkOrders(rand, machines);

  return {
    kpis,
    machines,
    andon,
    ctTrend,
    throughputTrend,
    downtimePareto,
    workOrders,
    shift: {
      id: currentShift.shiftId,
      name: currentShift.name.zh,
      startTime: `${String(currentShift.startHour).padStart(2, "0")}:00`,
      endTime: `${String(currentShift.endHour).padStart(2, "0")}:00`,
    },
  };
}

function generateMachines(
  rand: () => number,
  machineIds: string[],
  lines: PlantConfig["lines"],
  riskLevel: string
): MachineTile[] {
  const stateWeights: Record<string, number[]> = {
    low: [0.75, 0.10, 0.08, 0.05, 0.02],    // RUN heavy
    medium: [0.55, 0.20, 0.12, 0.08, 0.05], // More stops
    high: [0.35, 0.35, 0.15, 0.10, 0.05],   // Many stops
  };

  const weights = stateWeights[riskLevel] ?? stateWeights.low;
  const states: MachineState[] = ["RUN", "STOP", "SETUP", "WAIT", "OFF"];

  return machineIds.map((machineId, idx) => {
    const r = rand();
    let cumulative = 0;
    let state: MachineState = "RUN";
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) {
        state = states[i];
        break;
      }
    }

    const line = lines.find((l) => l.machineIds.includes(machineId));
    const designIdx = Math.floor(rand() * DESIGN_CODES.length);
    const partIdx = Math.floor(rand() * PART_NOS.length);

    const tile: MachineTile = {
      machineId,
      name: MACHINE_NAMES[machineId] ?? machineId,
      state,
      lineId: line?.lineId,
      workOrderId: state !== "OFF" ? `WO-${String(1000 + idx).slice(-3)}` : undefined,
      designCode: state !== "OFF" ? DESIGN_CODES[designIdx] : undefined,
      partNo: state !== "OFF" ? PART_NOS[partIdx] : undefined,
      ctSec: state === "RUN" ? 2.5 + rand() * 1.5 : undefined,
      lastEventAt: new Date(Date.now() - Math.floor(rand() * 300000)).toISOString(),
      currentQty: state !== "OFF" ? Math.floor(rand() * 500) + 100 : undefined,
      targetQty: state !== "OFF" ? 800 : undefined,
    };

    if (state === "STOP") {
      tile.stopReasonCode = STOP_REASONS[Math.floor(rand() * STOP_REASONS.length)];
    }

    if (state === "STOP" && rand() < 0.3) {
      tile.alarmCode = `ALM-${String(Math.floor(rand() * 100)).padStart(3, "0")}`;
    }

    return tile;
  });
}

function generateKpis(rand: () => number, machines: MachineTile[], riskLevel: string, isNightShift: boolean): KpiSummary {
  const runningCount = machines.filter((m) => m.state === "RUN").length;
  const totalMachines = machines.filter((m) => m.state !== "OFF").length;

  // Night shift typically has slightly lower efficiency
  const shiftFactor = isNightShift ? 0.95 : 1.0;

  const baseOee = (riskLevel === "high" ? 0.55 : riskLevel === "medium" ? 0.72 : 0.85) * shiftFactor;
  const baseFpy = (riskLevel === "high" ? 0.88 : riskLevel === "medium" ? 0.94 : 0.98) * shiftFactor;

  // Night shift has lower plan qty
  const planQty = isNightShift ? 4000 : 5000;
  const actualQty = Math.floor(planQty * (0.6 + rand() * 0.35));

  return {
    planQty,
    actualQty,
    oee: Math.min(baseOee + (rand() - 0.5) * 0.1, 0.99),
    fpy: Math.min(baseFpy + (rand() - 0.5) * 0.04, 0.995),
    activeAlarmsCount: machines.filter((m) => m.alarmCode).length,
    uph: Math.floor(actualQty / 8),
    ctAvgSec: 2.8 + rand() * 0.8 + (isNightShift ? 0.2 : 0),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function generateAndonEvents(rand: () => number, machines: MachineTile[], riskLevel: string): AndonEvent[] {
  const events: AndonEvent[] = [];
  const eventCount = riskLevel === "high" ? 8 : riskLevel === "medium" ? 4 : 2;

  const types: AndonEventType[] = ["STOP_TOO_LONG", "FPY_DROP", "CT_SPIKE", "ALARM", "MATERIAL_LOW", "QUALITY_ISSUE"];
  const severities: AndonSeverity[] = ["INFO", "WARN", "CRIT"];
  const severityWeights = riskLevel === "high" ? [0.2, 0.4, 0.4] : riskLevel === "medium" ? [0.4, 0.4, 0.2] : [0.6, 0.3, 0.1];

  for (let i = 0; i < eventCount; i++) {
    const r = rand();
    let severity: AndonSeverity = "INFO";
    let cumulative = 0;
    for (let j = 0; j < severityWeights.length; j++) {
      cumulative += severityWeights[j];
      if (r < cumulative) {
        severity = severities[j];
        break;
      }
    }

    const type = types[Math.floor(rand() * types.length)];
    const machine = machines[Math.floor(rand() * machines.length)];

    events.push({
      eventId: `EVT-${String(i + 1).padStart(4, "0")}`,
      severity,
      type,
      machineId: machine.machineId,
      workOrderId: machine.workOrderId,
      message: getAndonMessage(type, machine.machineId),
      startedAt: new Date(Date.now() - Math.floor(rand() * 3600000)).toISOString(),
      durationSec: Math.floor(rand() * 600) + 60,
      acknowledged: rand() < 0.3,
    });
  }

  // Sort by severity (CRIT first)
  return events.sort((a, b) => {
    const order: Record<AndonSeverity, number> = { CRIT: 0, WARN: 1, INFO: 2 };
    return order[a.severity] - order[b.severity];
  });
}

function getAndonMessage(type: AndonEventType, machineId: string): string {
  const messages: Record<AndonEventType, string> = {
    STOP_TOO_LONG: `${machineId} 停机超过 10 分钟`,
    FPY_DROP: `${machineId} 首次合格率下降至 92%`,
    CT_SPIKE: `${machineId} 节拍时间异常升高`,
    ALARM: `${machineId} 设备报警`,
    MATERIAL_LOW: `${machineId} 材料即将耗尽`,
    QUALITY_ISSUE: `${machineId} 检测到质量问题`,
  };
  return messages[type];
}

function generateCtTrend(rand: () => number, machineIds: string[], range: TimeRange): TrendPoint[] {
  const points: TrendPoint[] = [];
  const rangeMinutes: Record<TimeRange, number> = { "15m": 15, "1h": 60, "8h": 480, "24h": 1440 };
  const minutes = rangeMinutes[range];
  const interval = Math.max(1, Math.floor(minutes / 60));

  const now = Date.now();
  for (let i = 0; i < 60; i++) {
    const t = new Date(now - (60 - i) * interval * 60000).toISOString();
    const machineId = machineIds[Math.floor(rand() * machineIds.length)];
    points.push({
      t,
      value: 2.5 + rand() * 1.5 + Math.sin(i / 10) * 0.3,
      machineId,
    });
  }

  return points;
}

function generateThroughputTrend(rand: () => number, range: TimeRange): ThroughputPoint[] {
  const points: ThroughputPoint[] = [];
  const rangeMinutes: Record<TimeRange, number> = { "15m": 15, "1h": 60, "8h": 480, "24h": 1440 };
  const minutes = rangeMinutes[range];
  const interval = Math.max(1, Math.floor(minutes / 30));

  const now = Date.now();
  let cumGood = 0;
  let cumScrap = 0;

  for (let i = 0; i < 30; i++) {
    const t = new Date(now - (30 - i) * interval * 60000).toISOString();
    const good = Math.floor(50 + rand() * 30);
    const scrap = Math.floor(rand() * 5);
    cumGood += good;
    cumScrap += scrap;
    points.push({ t, qtyGood: cumGood, qtyScrap: cumScrap });
  }

  return points;
}

function generateDowntimePareto(rand: () => number, riskLevel: string): ParetoItem[] {
  const baseMinutes = riskLevel === "high" ? 60 : riskLevel === "medium" ? 30 : 15;

  return STOP_REASONS.slice(0, 6).map((reasonCode) => ({
    reasonCode,
    minutes: Math.floor(rand() * baseMinutes) + 5,
    count: Math.floor(rand() * 10) + 1,
  })).sort((a, b) => b.minutes - a.minutes);
}

function generateWorkOrders(rand: () => number, machines: MachineTile[]): WorkOrderRow[] {
  const orders: WorkOrderRow[] = [];
  const statuses: WorkOrderStatus[] = ["PLANNED", "RUNNING", "HOLD", "DONE"];

  for (let i = 0; i < 8; i++) {
    const status = i < 2 ? "RUNNING" : statuses[Math.floor(rand() * statuses.length)];
    const targetQty = Math.floor(rand() * 500) + 500;
    const progress = status === "DONE" ? 1 : status === "RUNNING" ? 0.3 + rand() * 0.5 : rand() * 0.3;

    orders.push({
      workOrderId: `WO-${String(1000 + i).slice(-3)}`,
      designCode: DESIGN_CODES[i % DESIGN_CODES.length],
      partNo: PART_NOS[i % PART_NOS.length],
      targetQty,
      goodQty: Math.floor(targetQty * progress),
      scrapQty: Math.floor(targetQty * progress * (rand() * 0.03)),
      status,
      startedAt: status !== "PLANNED" ? new Date(Date.now() - Math.floor(rand() * 28800000)).toISOString() : undefined,
      etaAt: status === "RUNNING" ? new Date(Date.now() + Math.floor(rand() * 14400000)).toISOString() : undefined,
      machineId: status === "RUNNING" ? machines[i % machines.length]?.machineId : undefined,
      priority: i < 2 ? 1 : Math.floor(rand() * 3) + 1,
    });
  }

  // Sort: RUNNING first, then by priority
  return orders.sort((a, b) => {
    if (a.status === "RUNNING" && b.status !== "RUNNING") return -1;
    if (a.status !== "RUNNING" && b.status === "RUNNING") return 1;
    return (a.priority ?? 99) - (b.priority ?? 99);
  });
}

// ============================================================================
// Tick Function for Real-time Updates
// ============================================================================

let tickSeed = Date.now();

/**
 * Generate a new dashboard state (simulates real-time updates)
 */
export function tick(options: MockGeneratorOptions = {}): DashboardSummaryResponse {
  tickSeed += 1;
  return generateMockDashboard({ ...options, seed: tickSeed });
}

/**
 * Reset the tick seed
 */
export function resetTick(): void {
  tickSeed = Date.now();
}
