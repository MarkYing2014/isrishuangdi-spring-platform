import { FactoryConfig } from "./types";

/**
 * Default factory configuration to match the demo setup.
 */

const getBrowserTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        return "Asia/Shanghai";
    }
};

export const DEFAULT_FACTORY_CONFIG: FactoryConfig = {
    schemaVersion: 1,
    factoryId: "P01",
    factoryName: "ISRI Shuangdi Spring Plant 1",
    timezone: getBrowserTimezone(),
    shifts: [
        {
            id: "DAY",
            name: "Day Shift",
            startHHMM: "08:00",
            endHHMM: "20:00",
            daysOfWeek: [1, 2, 3, 4, 5],
        },
        {
            id: "NIGHT",
            name: "Night Shift",
            startHHMM: "20:00",
            endHHMM: "08:00",
            daysOfWeek: [1, 2, 3, 4, 5],
        }
    ],
    devices: [
        {
            id: "CNC-A1",
            label: "CNC Coiler A1",
            process: "CNC_COILING",
            ctSec: 3.5,
            setupMin: 45,
            fpy: 0.985,
            oeeTarget: 0.85,
            downRatePerHour: 0.02,
            enabled: true,
        },
        {
            id: "CNC-A2",
            label: "CNC Coiler A2",
            process: "CNC_COILING",
            ctSec: 4.2,
            setupMin: 30,
            fpy: 0.99,
            oeeTarget: 0.88,
            downRatePerHour: 0.015,
            enabled: true,
        },
        {
            id: "CNC-A3",
            label: "CNC Coiler A3",
            process: "CNC_COILING",
            ctSec: 3.8,
            setupMin: 60,
            fpy: 0.975,
            oeeTarget: 0.82,
            downRatePerHour: 0.03,
            enabled: true,
        },
        {
            id: "CNC-A4",
            label: "CNC Coiler A4",
            process: "CNC_COILING",
            ctSec: 5.0,
            setupMin: 20,
            fpy: 0.995,
            oeeTarget: 0.92,
            downRatePerHour: 0.01,
            enabled: true,
        },
        {
            id: "EXT-B1",
            label: "Extension Line B1",
            process: "ASSEMBLY",
            ctSec: 12.0,
            setupMin: 90,
            fpy: 0.96,
            oeeTarget: 0.75,
            downRatePerHour: 0.05,
            enabled: true,
        },
        {
            id: "EXT-B2",
            label: "Extension Line B2",
            process: "ASSEMBLY",
            ctSec: 10.5,
            setupMin: 45,
            fpy: 0.98,
            oeeTarget: 0.80,
            downRatePerHour: 0.04,
            enabled: true,
        },
        {
            id: "EXT-B3",
            label: "Extension Line B3",
            process: "ASSEMBLY",
            ctSec: 15.0,
            setupMin: 120,
            fpy: 0.94,
            oeeTarget: 0.70,
            downRatePerHour: 0.08,
            enabled: true,
        },
        {
            id: "EXT-B4",
            label: "Extension Line B4",
            process: "ASSEMBLY",
            ctSec: 11.0,
            setupMin: 60,
            fpy: 0.97,
            oeeTarget: 0.78,
            downRatePerHour: 0.04,
            enabled: true,
        },
    ],
    updatedAtISO: new Date().toISOString(),
};
