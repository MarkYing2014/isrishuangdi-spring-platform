import { FactoryDataSource } from "../FactoryDataSource";
import { DeviceTelemetryEvent, WorkOrderEvent, LiveSnapshot } from "../liveTypes";

export class RestPollingAdapter implements FactoryDataSource {
    id = "rest";
    private intervalId: any = null;
    private cursor: number = Date.now();
    private pollIntervalMs: number = 3000;

    constructor(private apiEndpoint: string = "/api/factory/live") { }

    async connect(): Promise<void> {
        console.log(`[RestPollingAdapter] Connecting to ${this.apiEndpoint}...`);
        // Initial sync could happen here
    }

    async disconnect(): Promise<void> {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    subscribe(onEvent: (evt: DeviceTelemetryEvent | WorkOrderEvent) => void): () => void {
        if (this.intervalId) return () => { };

        this.intervalId = setInterval(async () => {
            try {
                const response = await fetch(`${this.apiEndpoint}?since=${this.cursor}`);
                if (!response.ok) throw new Error("REST poll failed");

                const data = await response.json();
                const events: Array<DeviceTelemetryEvent | WorkOrderEvent> = data.events || [];

                events.forEach(evt => {
                    onEvent(evt);
                    if (evt.ts > this.cursor) {
                        this.cursor = evt.ts;
                    }
                });
            } catch (e) {
                console.error("[RestPollingAdapter] Error:", e);
            }
        }, this.pollIntervalMs);

        return () => this.disconnect();
    }

    async getSnapshot(): Promise<LiveSnapshot> {
        const response = await fetch(`${this.apiEndpoint}/snapshot`);
        if (!response.ok) throw new Error("Snapshot fetch failed");
        return response.json();
    }
}
