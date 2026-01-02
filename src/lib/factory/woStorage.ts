import { WorkOrder } from "./simTypes";

const WO_STORAGE_KEY = "factoryWorkOrders:v1";

export function loadWorkOrders(): WorkOrder[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(WO_STORAGE_KEY);
    if (!raw) return getDefaultWorkOrders();
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

export function saveWorkOrders(workOrders: WorkOrder[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(WO_STORAGE_KEY, JSON.stringify(workOrders));
}

function getDefaultWorkOrders(): WorkOrder[] {
    return [
        {
            id: "WO-001",
            designCode: "CS-2024-003",
            qty: 1200,
            route: ["CNC_COILING", "HEAT_TREAT", "GRINDING", "INSPECTION"],
            priority: 3,
        },
        {
            id: "WO-002",
            designCode: "EXT-88-A",
            qty: 500,
            route: ["ASSEMBLY", "INSPECTION", "PACKING"],
            priority: 5,
        },
        {
            id: "WO-003",
            designCode: "WF-102",
            qty: 2500,
            route: ["CNC_COILING", "HEAT_TREAT", "SHOT_PEEN", "ASSEMBLY", "INSPECTION"],
            priority: 2,
        },
    ];
}
