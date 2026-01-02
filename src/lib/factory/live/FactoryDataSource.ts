import { DeviceTelemetryEvent, WorkOrderEvent, LiveSnapshot } from "./liveTypes";

export interface FactoryDataSource {
    id: string; // "demo" | "rest" | "mqtt" | "opcua"
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    subscribe(
        onEvent: (evt: DeviceTelemetryEvent | WorkOrderEvent) => void
    ): () => void; // returns unsubscribe function
    getSnapshot?(): Promise<LiveSnapshot>;
}
