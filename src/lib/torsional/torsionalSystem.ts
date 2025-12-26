import { TorsionalSpringSystemDesign, TorsionalSpringGroup } from "./torsionalSystemTypes";

export const DEFAULT_TORSIONAL_GROUP: TorsionalSpringGroup = {
    id: "group-1",
    name: "Main Springs",
    enabled: true,
    n: 6,
    k: 15.0,
    R: 80.0,
    theta_start: 0.0,
    d: 3.5,
    Dm: 20.0,
    L_free: 60.0,
    L_solid: 45.0,
    clearance: 2.0,
    materialId: "music_wire_a228"
};

export function getDefaultTorsionalSystemDesign(): TorsionalSpringSystemDesign {
    return {
        type: "torsionalSpringSystem",
        groups: [
            { ...DEFAULT_TORSIONAL_GROUP }
        ],
        frictionTorque: 5.0,
        referenceAngle: 10.0
    };
}

export const TORSIONAL_SYSTEM_SAMPLES: Record<string, TorsionalSpringSystemDesign> = {
    clutch_passenger: {
        type: "torsionalSpringSystem",
        id: "sample-clutch",
        name: "Passenger Clutch Damper (2-Stage)",
        groups: [
            {
                id: "g1",
                name: "Stage 1 (Long)",
                enabled: true,
                n: 4,
                k: 12.5,
                R: 65,
                theta_start: 0,
                d: 3.5,
                Dm: 22,
                L_free: 55,
                L_solid: 38,
                clearance: 2,
                materialId: "music_wire_a228"
            },
            {
                id: "g2",
                name: "Stage 2 (Short)",
                enabled: true,
                n: 4,
                k: 24.0,
                R: 65,
                theta_start: 6,
                d: 4.2,
                Dm: 24,
                L_free: 45,
                L_solid: 32,
                clearance: 1.5,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 12,
        referenceAngle: 12
    },
    dmf_heavy: {
        type: "torsionalSpringSystem",
        id: "sample-dmf",
        name: "Heavy Duty DMF (3-Stage Staged)",
        groups: [
            {
                id: "d1",
                name: "Idle Stage",
                enabled: true,
                n: 6,
                k: 8.5,
                R: 75,
                theta_start: 0,
                d: 3.0,
                Dm: 20,
                L_free: 60,
                L_solid: 40,
                clearance: 2,
                materialId: "music_wire_a228"
            },
            {
                id: "d2",
                name: "Mid Load",
                enabled: true,
                n: 6,
                k: 18.0,
                R: 85,
                theta_start: 4,
                d: 4.5,
                Dm: 26,
                L_free: 52,
                L_solid: 36,
                clearance: 2,
                materialId: "music_wire_a228"
            },
            {
                id: "d3",
                name: "Full Load",
                enabled: true,
                n: 4,
                k: 32.0,
                R: 95,
                theta_start: 9,
                d: 5.5,
                Dm: 30,
                L_free: 48,
                L_solid: 34,
                clearance: 1.5,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 25,
        referenceAngle: 15
    }
};
