import { SimKPIs } from "../simTypes";

export type LiveMode = "SIM" | "LIVE";

export interface DeviceTelemetryEvent {
    deviceId: string;
    ts: number;
    status: "RUNNING" | "IDLE" | "SETUP" | "DOWN" | "MAINT";
    goodCount?: number;
    scrapCount?: number;
    cycleTimeSec?: number;
    alarmCode?: string;
    downtimeReason?: string;
}

export interface WorkOrderEvent {
    workOrderId: string;
    deviceId: string;
    eventType: "START" | "STOP" | "COMPLETE" | "SCRAP" | "PAUSE";
    qtyDelta?: number;
    ts: number;
}

export interface DeviceLiveState {
    deviceId: string;
    status: "RUNNING" | "IDLE" | "SETUP" | "DOWN" | "MAINT";
    activeWorkOrderId?: string;
    producedCount: number;
    goodCount: number;
    scrapCount: number;
    cycleTimeSec?: number;
    lastUpdateTs: number;
    isStale: boolean;
    healthStatus: "HEALTHY" | "STALE" | "DOWN";
}

export interface LiveSnapshot {
    devices: Record<string, DeviceLiveState>;
    kpis: SimKPIs;
    health: {
        connected: boolean;
        degraded: boolean;
        lastUpdateTs?: number;
        adapterId: string;
    };
}
