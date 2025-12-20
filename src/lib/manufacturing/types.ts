/**
 * Manufacturing Module Types
 * 生产制造模块类型定义
 * 
 * 基于 OpenAI 建议的完整生产监控数据结构
 */

// ============================================================================
// Machine State
// ============================================================================

export type MachineState = "RUN" | "STOP" | "SETUP" | "WAIT" | "OFF";

export const MACHINE_STATE_COLORS: Record<MachineState, string> = {
  RUN: "bg-emerald-500",
  STOP: "bg-rose-500",
  SETUP: "bg-amber-500",
  WAIT: "bg-sky-400",
  OFF: "bg-slate-400",
};

export const MACHINE_STATE_LABELS: Record<MachineState, { en: string; zh: string }> = {
  RUN: { en: "Running", zh: "运行中" },
  STOP: { en: "Stopped", zh: "停机" },
  SETUP: { en: "Setup", zh: "调机" },
  WAIT: { en: "Waiting", zh: "待料" },
  OFF: { en: "Off", zh: "关机" },
};

// ============================================================================
// Dashboard Query
// ============================================================================

export interface DashboardQuery {
  plantId: string;
  lineId?: string;
  shiftId?: string;
  range: "15m" | "1h" | "8h" | "24h";
}

export type TimeRange = DashboardQuery["range"];

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: { en: string; zh: string } }[] = [
  { value: "15m", label: { en: "Last 15 min", zh: "最近15分钟" } },
  { value: "1h", label: { en: "Last 1 hour", zh: "最近1小时" } },
  { value: "8h", label: { en: "Last 8 hours", zh: "最近8小时" } },
  { value: "24h", label: { en: "Last 24 hours", zh: "最近24小时" } },
];

// ============================================================================
// KPI Summary
// ============================================================================

export interface KpiSummary {
  /** 目标产量 */
  planQty: number;
  /** 实际产量 */
  actualQty: number;
  /** OEE (0-1) */
  oee: number;
  /** 首次合格率 FPY (0-1) */
  fpy: number;
  /** 活跃报警数 */
  activeAlarmsCount: number;
  /** 每小时产量 */
  uph: number;
  /** 平均节拍时间 (秒) */
  ctAvgSec: number;
  /** 最后更新时间 */
  lastUpdatedAt: string;
}

// ============================================================================
// Machine Tile
// ============================================================================

export interface MachineTile {
  machineId: string;
  name: string;
  state: MachineState;
  workOrderId?: string;
  designCode?: string;
  partNo?: string;
  /** 实时节拍 (秒) */
  ctSec?: number;
  lastEventAt: string;
  stopReasonCode?: string;
  alarmCode?: string;
  /** 产线 ID */
  lineId?: string;
  /** 当前产量 */
  currentQty?: number;
  /** 目标产量 */
  targetQty?: number;
}

// ============================================================================
// Andon Events
// ============================================================================

export type AndonSeverity = "INFO" | "WARN" | "CRIT";

export const ANDON_SEVERITY_COLORS: Record<AndonSeverity, string> = {
  INFO: "bg-blue-100 text-blue-800 border-blue-200",
  WARN: "bg-amber-100 text-amber-800 border-amber-200",
  CRIT: "bg-rose-100 text-rose-800 border-rose-200",
};

export type AndonEventType = "STOP_TOO_LONG" | "FPY_DROP" | "CT_SPIKE" | "ALARM" | "MATERIAL_LOW" | "QUALITY_ISSUE";

export interface AndonEvent {
  eventId: string;
  severity: AndonSeverity;
  type: AndonEventType;
  machineId?: string;
  workOrderId?: string;
  message: string;
  startedAt: string;
  durationSec?: number;
  acknowledged?: boolean;
}

// ============================================================================
// Trend Data
// ============================================================================

export interface TrendPoint {
  /** ISO timestamp */
  t: string;
  value: number;
  machineId?: string;
}

export interface ThroughputPoint {
  t: string;
  qtyGood: number;
  qtyScrap: number;
}

// ============================================================================
// Downtime Pareto
// ============================================================================

export interface ParetoItem {
  reasonCode: string;
  reasonLabel?: { en: string; zh: string };
  minutes: number;
  count?: number;
}

export const STOP_REASON_LABELS: Record<string, { en: string; zh: string }> = {
  MATERIAL: { en: "Material", zh: "材料问题" },
  WIRE_BREAK: { en: "Wire Break", zh: "断线" },
  SETUP: { en: "Setup/Adjustment", zh: "调机" },
  WAITING: { en: "Waiting Material", zh: "待料" },
  ALARM: { en: "Machine Alarm", zh: "设备报警" },
  QUALITY: { en: "Quality Issue", zh: "质量问题" },
  MAINTENANCE: { en: "Maintenance", zh: "维护保养" },
  OTHER: { en: "Other", zh: "其他" },
};

// ============================================================================
// Work Order
// ============================================================================

export type WorkOrderStatus = "PLANNED" | "RUNNING" | "HOLD" | "DONE" | "CANCELLED";

export const WORK_ORDER_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  RUNNING: "bg-emerald-100 text-emerald-700",
  HOLD: "bg-amber-100 text-amber-700",
  DONE: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export interface WorkOrderRow {
  workOrderId: string;
  designCode: string;
  partNo?: string;
  targetQty: number;
  goodQty: number;
  scrapQty: number;
  status: WorkOrderStatus;
  startedAt?: string;
  etaAt?: string;
  machineId?: string;
  priority?: number;
}

// ============================================================================
// Dashboard Summary Response
// ============================================================================

export interface DashboardSummaryResponse {
  kpis: KpiSummary;
  machines: MachineTile[];
  andon: AndonEvent[];
  ctTrend: TrendPoint[];
  throughputTrend: ThroughputPoint[];
  downtimePareto: ParetoItem[];
  workOrders: WorkOrderRow[];
  /** 当前班次信息 */
  shift?: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
}

// ============================================================================
// Plant & Line Configuration
// ============================================================================

export interface PlantConfig {
  plantId: string;
  name: { en: string; zh: string };
  lines: LineConfig[];
}

export interface LineConfig {
  lineId: string;
  name: { en: string; zh: string };
  machineIds: string[];
}

export interface ShiftConfig {
  shiftId: string;
  name: { en: string; zh: string };
  startHour: number;
  endHour: number;
}

// ============================================================================
// Design Code Integration
// ============================================================================

export interface DesignCodeSnapshot {
  designCode: string;
  springType: string;
  geometry: {
    wireDiameter: number;
    meanDiameter?: number;
    outerDiameter?: number;
    freeLength?: number;
    activeCoils?: number;
  };
  material: {
    materialId: string;
    name: string;
  };
  revision: number;
  createdAt: string;
}

export interface WorkOrderWithDesign extends WorkOrderRow {
  designSnapshot?: DesignCodeSnapshot;
}
