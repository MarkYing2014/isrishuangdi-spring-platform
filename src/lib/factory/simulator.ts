import {
    SimRequest,
    SimResult,
    WorkOrder,
    DeviceSimState,
    SimKPIs
} from "./simTypes";
import { DeviceStatus, ProcessType } from "./types";

/**
 * Deterministic PRNG: Mulberry32
 */
function createPRNG(seed: number) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

interface WorkOrderInstance {
    wo: WorkOrder;
    pendingQty: number;
    currentStepIndex: number;
}

/**
 * Discrete-event inspired time-step simulation engine.
 */
export function simulate(request: SimRequest): SimResult {
    const startTime = performance.now();
    let { horizonMin, stepSec, seed, factory, workOrders } = request;

    // Guardrail: Horizon & Step constraints
    horizonMin = Math.min(1440, Math.max(1, horizonMin));
    stepSec = Math.min(60, Math.max(5, stepSec));

    let isCoarsened = false;
    // Performance Guardrail: if too many iterations, coarsen stepSec
    // Estimating ~500k operations as the limit for 200ms
    const estimatedOps = (horizonMin * 60 / stepSec) * factory.devices.length;
    if (estimatedOps > 500000) {
        stepSec = Math.max(stepSec, Math.ceil((horizonMin * 60 * factory.devices.length) / 500000));
        isCoarsened = true;
    }

    const totalSeconds = horizonMin * 60;
    const prng = createPRNG(seed);

    // Initialize Queues per Process
    const queues: Map<ProcessType, WorkOrderInstance[]> = new Map();
    workOrders.forEach(wo => {
        if (wo.route.length > 0) {
            const process = wo.route[0];
            if (!queues.has(process)) queues.set(process, []);
            queues.get(process)!.push({ wo, pendingQty: wo.qty, currentStepIndex: 0 });
        }
    });

    // Initialize Device States
    const deviceStates: Map<string, DeviceSimState> = new Map();
    factory.devices.forEach(d => {
        deviceStates.set(d.id, {
            deviceId: d.id,
            status: d.enabled ? "IDLE" : "DOWN",
            producedCount: 0,
            goodCount: 0,
            scrapCount: 0,
            runTimeSec: 0,
            setupTimeSec: 0,
            downTimeSec: 0,
            utilization: 0,
            queueLen: 0,
            progress01: 0,
            lastEvent: d.enabled ? "Initialized IDLE" : "Device disabled",
        });
    });

    // Transient simulation state
    const deviceAssignments: Map<string, {
        instance: WorkOrderInstance;
        remainingUnitTime: number;
        setupRemaining: number;
        lastDesignCode?: string;
    }> = new Map();

    // Time-step loop
    for (let t = 0; t < totalSeconds; t += stepSec) {
        // 1. Stochastic Downtime Check (at minute boundaries)
        if (t % 60 === 0) {
            factory.devices.forEach(d => {
                const state = deviceStates.get(d.id)!;
                if (state.status !== "DOWN" && state.status !== "MAINT" && d.enabled) {
                    // Probability of failure in 1 minute = downRatePerHour / 60
                    if (prng() < (d.downRatePerHour / 60)) {
                        state.status = "DOWN";
                        const downDuration = 300 + Math.floor(prng() * 1500); // 5-30 mins
                        (state as any).downUntil = t + downDuration;
                        state.lastEvent = `Failure detected (Duration: ${Math.round(downDuration / 60)}m)`;
                    }
                } else if (state.status === "DOWN" && (state as any).downUntil <= t) {
                    state.status = "IDLE";
                    state.lastEvent = "Repair completed";
                }
            });
        }

        // 2. Job Assignment
        factory.devices.forEach(d => {
            if (!d.enabled) return;
            const state = deviceStates.get(d.id)!;
            if (state.status !== "IDLE") return;

            const queue = queues.get(d.process) || [];
            if (queue.length > 0) {
                // Sort by priority (high first) then FIFO
                queue.sort((a, b) => (b.wo.priority || 1) - (a.wo.priority || 1));
                const instance = queue.shift()!;

                const assignment = deviceAssignments.get(d.id) || { instance, remainingUnitTime: 0, setupRemaining: 0 };
                const needsSetup = assignment.lastDesignCode !== instance.wo.designCode;

                state.status = needsSetup ? "SETUP" : "RUNNING";
                state.activeWorkOrderId = instance.wo.id;
                state.designCode = instance.wo.designCode;

                deviceAssignments.set(d.id, {
                    instance,
                    remainingUnitTime: d.ctSec,
                    setupRemaining: needsSetup ? d.setupMin * 60 : 0,
                    lastDesignCode: instance.wo.designCode
                });

                state.lastEvent = needsSetup ? `Setup for ${instance.wo.designCode}` : `Starting ${instance.wo.id}`;
            }
        });

        // 3. Production Progress
        deviceAssignments.forEach((assign, deviceId) => {
            const d = factory.devices.find(dev => dev.id === deviceId)!;
            const state = deviceStates.get(deviceId)!;

            if (state.status === "SETUP") {
                assign.setupRemaining -= stepSec;
                state.setupTimeSec += stepSec;
                if (assign.setupRemaining <= 0) {
                    state.status = "RUNNING";
                    state.lastEvent = "Setup complete, producing...";
                }
            } else if (state.status === "RUNNING") {
                assign.remainingUnitTime -= stepSec;
                state.runTimeSec += stepSec;
                state.progress01 = Math.max(0, 1 - (assign.remainingUnitTime / d.ctSec));

                if (assign.remainingUnitTime <= 0) {
                    // Produce 1 part
                    state.producedCount++;
                    const isGood = prng() < d.fpy;
                    if (isGood) state.goodCount++;
                    else state.scrapCount++;

                    assign.instance.pendingQty--;

                    if (assign.instance.pendingQty <= 0) {
                        // WO step complete
                        state.status = "IDLE";
                        state.activeWorkOrderId = undefined;
                        state.progress01 = 0;
                        state.lastEvent = `Completed batch for ${assign.instance.wo.id}`;

                        // Move to next process if any
                        const nextStepIdx = assign.instance.currentStepIndex + 1;
                        if (nextStepIdx < assign.instance.wo.route.length) {
                            const nextProcess = assign.instance.wo.route[nextStepIdx];
                            if (!queues.has(nextProcess)) queues.set(nextProcess, []);
                            queues.get(nextProcess)!.push({
                                ...assign.instance,
                                pendingQty: assign.instance.wo.qty, // Assuming reset for next step or similar logic
                                currentStepIndex: nextStepIdx
                            });
                        }
                        deviceAssignments.delete(deviceId);
                    } else {
                        // Reset for next unit in same WO
                        assign.remainingUnitTime = d.ctSec;
                    }
                }
            } else if (state.status === "DOWN") {
                state.downTimeSec += stepSec;
            }
        });
    }

    // Calculate KPIs
    const devices = Array.from(deviceStates.values());
    devices.forEach(s => s.utilization = s.runTimeSec / totalSeconds);

    const totalGood = devices.reduce((sum, s) => sum + s.goodCount, 0);
    const totalScrap = devices.reduce((sum, s) => sum + s.scrapCount, 0);
    const avgUtilization = devices.filter(d => factory.devices.find(fd => fd.id === d.deviceId)?.enabled).reduce((sum, s) => sum + s.utilization, 0) / (devices.filter(d => factory.devices.find(fd => fd.id === d.deviceId)?.enabled).length || 1);
    const avgFpy = devices.reduce((sum, s) => sum + (s.producedCount > 0 ? s.goodCount / s.producedCount : 1), 0) / devices.length;

    const kpis: SimKPIs = {
        planQty: workOrders.reduce((sum, wo) => sum + wo.qty, 0),
        actualGoodQty: totalGood,
        oee: avgUtilization * 0.95 * avgFpy, // Simplified OEE
        fpy: avgFpy,
        uph: totalGood / (horizonMin / 60),
        avgCtSec: devices.filter(s => s.status === "RUNNING").length > 0
            ? devices.filter(s => s.status === "RUNNING").reduce((sum, s) => sum + (factory.devices.find(d => d.id === s.deviceId)?.ctSec || 0), 0) / devices.filter(s => s.status === "RUNNING").length
            : 0,
        totalScrap,
        alarms: [],
    };

    // Backlog Alarms
    queues.forEach((q, process) => {
        if (q.length > 5) {
            kpis.alarms.push({
                id: `BACKLOG-${process}`,
                severity: "WARN",
                message: `High backlog for process ${process} (${q.length} jobs waiting)`,
            });
        }
    });

    // Breakdown Alarms
    devices.forEach(s => {
        if (s.status === "DOWN") {
            kpis.alarms.push({
                id: `DOWN-${s.deviceId}`,
                severity: "FAIL",
                message: `Machine ${s.deviceId} is currently DOWN`,
                deviceId: s.deviceId,
            });
        }
    });

    return {
        kpis,
        devices,
        durationMs: performance.now() - startTime,
        isCoarsened,
    };
}
