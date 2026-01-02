/**
 * Factory Configuration Types
 */

export type DeviceStatus = "RUNNING" | "IDLE" | "SETUP" | "DOWN" | "MAINT";

export type ProcessType =
    | "CNC_COILING"
    | "GRINDING"
    | "HEAT_TREAT"
    | "SHOT_PEEN"
    | "COATING"
    | "ASSEMBLY"
    | "INSPECTION"
    | "PACKING";

export interface ShiftWindow {
    id: string;
    name: string;         // e.g. "Day Shift"
    startHHMM: string;    // "08:00"
    endHHMM: string;      // "20:00"
    daysOfWeek: number[]; // 0=Sun ... 6=Sat
}

export interface DeviceProfile {
    id: string;           // "CNC-A1"
    label: string;        // display name
    process: ProcessType;
    location?: string;    // line/area
    ctSec: number;        // nominal cycle time (sec/pc)
    setupMin: number;     // setup/changeover time (minutes)
    fpy: number;          // first pass yield 0..1 (e.g. 0.982)
    oeeTarget: number;    // 0..1
    downRatePerHour: number; // stochastic failure intensity for sim (0..1)
    maintenanceWindows?: Array<{ startISO: string; endISO: string; note?: string }>;
    enabled: boolean;
}

export interface FactoryConfig {
    schemaVersion: number;
    factoryId: string;
    factoryName: string;
    timezone: string; // e.g. "Asia/Shanghai"
    shifts: ShiftWindow[];
    devices: DeviceProfile[];
    updatedAtISO: string;
}
