import { NextResponse } from "next/server";
import { DeviceTelemetryEvent, WorkOrderEvent } from "@/lib/factory/live/liveTypes";

/**
 * Backend Bridge API for Live Factory Data (GEN-1 Demo)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const since = parseInt(searchParams.get("since") || "0");

    const now = Date.now();
    const events: Array<DeviceTelemetryEvent | WorkOrderEvent> = [];

    // Simulate a few events if polled
    if (now - since > 2000) {
        const devices = ["CNC-A1", "CNC-A2", "EXT-B1"];
        const randomDevice = devices[Math.floor(Math.random() * devices.length)];

        events.push({
            deviceId: randomDevice,
            ts: now,
            status: Math.random() > 0.9 ? "DOWN" : "RUNNING",
            goodCount: Math.floor(now / 10000) % 500, // Semi-realistic counter
            scrapCount: Math.floor(now / 100000) % 20,
        });

        if (Math.random() > 0.8) {
            events.push({
                workOrderId: "WO-LIVE-99",
                deviceId: "CNC-A1",
                eventType: "SCRAP",
                qtyDelta: 1,
                ts: now - 50,
            });
        }
    }

    return NextResponse.json({
        events,
        serverTs: now
    });
}
