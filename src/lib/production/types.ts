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

// ============================================================================
// Camera / Capture Types
// ============================================================================

export type UserRole = "viewer" | "operator" | "manager" | "admin";

export type CameraSourceMode = "local" | "ip_hls" | "demo";

export interface CaptureMeta {
  id: string;
  createdAt: string;
  source: CameraSourceMode;
  lineId?: string;
  stationId?: string;
  workOrderId?: string;
  note?: string;
  width: number;
  height: number;
  mimeType: string;
  /** Local preview data URL */
  dataUrl?: string;
  /** Uploaded URL */
  url?: string;
  /** Original blob for download */
  blob?: Blob;
}

export const CAMERA_SOURCE_LABELS: Record<CameraSourceMode, { en: string; zh: string }> = {
  local: { en: "Local Camera", zh: "本机摄像头" },
  ip_hls: { en: "IP Camera", zh: "网络摄像头" },
  demo: { en: "Demo Stream", zh: "演示视频" },
};

export const USER_ROLE_LABELS: Record<UserRole, { en: string; zh: string }> = {
  viewer: { en: "Viewer", zh: "访客" },
  operator: { en: "Operator", zh: "操作员" },
  manager: { en: "Manager", zh: "管理员" },
  admin: { en: "Admin", zh: "系统管理员" },
};

/**
 * Check if user role has camera permission
 */
export function hasPermission(role: UserRole): boolean {
  return role === "manager" || role === "admin";
}
