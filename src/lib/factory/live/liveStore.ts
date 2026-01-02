import { DeviceTelemetryEvent, WorkOrderEvent, DeviceLiveState, LiveSnapshot } from "./liveTypes";
import { FactoryConfig } from "../types";

/**
 * Aggregator for live machine state.
 * Handles out-of-order events and idempotent updates.
 */
export class LiveStore {
    private devices: Map<string, DeviceLiveState> = new Map();
    private lastUpdateTs: number = 0;
    private config: FactoryConfig;

    constructor(config: FactoryConfig) {
        this.config = config;
        this.initFromConfig();
    }

    private initFromConfig() {
        this.config.devices.forEach(d => {
            this.devices.set(d.id, {
                deviceId: d.id,
                status: "IDLE",
                producedCount: 0,
                goodCount: 0,
                scrapCount: 0,
                lastUpdateTs: Date.now(),
                isStale: false,
                healthStatus: "HEALTHY"
            });
        });
    }

    processEvent(evt: DeviceTelemetryEvent | WorkOrderEvent) {
        // 1. Check for device existence
        const deviceState = this.devices.get(evt.deviceId);
        if (!deviceState) return;

        // 2. Event Timestamp logic
        if (evt.ts < deviceState.lastUpdateTs && (evt as any).eventType !== "SCRAP") {
            // Allow total count increments even if status event is old? 
            // For GEN-1 we prioritize latest timestamp for status/activeWO
        }

        if ("status" in evt) {
            // DeviceTelemetryEvent
            if (evt.ts >= deviceState.lastUpdateTs) {
                deviceState.status = evt.status;
                deviceState.lastUpdateTs = evt.ts;
            }

            if (evt.goodCount !== undefined) deviceState.goodCount = evt.goodCount;
            if (evt.scrapCount !== undefined) deviceState.scrapCount = evt.scrapCount;
            if (evt.cycleTimeSec !== undefined) deviceState.cycleTimeSec = evt.cycleTimeSec;
            deviceState.producedCount = deviceState.goodCount + deviceState.scrapCount;
        } else {
            // WorkOrderEvent
            if (evt.ts >= deviceState.lastUpdateTs) {
                deviceState.activeWorkOrderId = evt.eventType === "COMPLETE" || evt.eventType === "STOP" ? undefined : evt.workOrderId;
                deviceState.lastUpdateTs = evt.ts;
            }

            if (evt.eventType === "SCRAP" && evt.qtyDelta) {
                deviceState.scrapCount += evt.qtyDelta;
                deviceState.producedCount += evt.qtyDelta;
            }
        }

        this.lastUpdateTs = Math.max(this.lastUpdateTs, evt.ts);
        this.checkStaleness();
    }

    private checkStaleness() {
        const now = Date.now();
        this.devices.forEach(state => {
            const diff = now - state.lastUpdateTs;
            if (diff > 30000) { // 30s stale threshold
                state.isStale = true;
                state.healthStatus = "STALE";
            } else {
                state.isStale = false;
                state.healthStatus = state.status === "DOWN" ? "DOWN" : "HEALTHY";
            }
        });
    }

    getSnapshot(): LiveSnapshot {
        const devicesRecord: Record<string, DeviceLiveState> = {};
        this.devices.forEach((v, k) => { devicesRecord[k] = { ...v }; });

        return {
            devices: devicesRecord,
            kpis: this.calculateKPIs(),
            health: {
                connected: true,
                degraded: Array.from(this.devices.values()).some(d => d.isStale),
                lastUpdateTs: this.lastUpdateTs,
                adapterId: "rest"
            }
        };
    }

    private calculateKPIs() {
        // Simplified KPI math for LIVE mode
        const devices = Array.from(this.devices.values());
        const totalGood = devices.reduce((sum, d) => sum + d.goodCount, 0);
        const totalScrap = devices.reduce((sum, d) => sum + d.scrapCount, 0);
        const totalProduced = totalGood + totalScrap;

        return {
            planQty: 0, // Would come from ERP/MES integration
            actualGoodQty: totalGood,
            oee: 0.78, // Placeholder for live aggregation
            fpy: totalProduced > 0 ? totalGood / totalProduced : 1.0,
            uph: totalGood / 8, // Placeholder for shift uptime
            avgCtSec: 0,
            totalScrap,
            alarms: []
        };
    }
}
