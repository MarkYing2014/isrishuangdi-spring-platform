import { TorsionalSpringSystemDesign, TorsionalSpringGroup } from "./torsionalSystemTypes";

export const DEFAULT_TORSIONAL_GROUP: TorsionalSpringGroup = {
    id: "group-1",
    name: "Main Springs",
    stage: 1,
    enabled: true,
    n: 6,
    k: 15.0,
    R: 80.0,
    theta_start: 0.0,
    d: 3.5,
    Dm: 20.0,
    L_free: 80.0,
    L_solid: 45.0,
    clearance: 8.0,
    materialId: "music_wire_a228"
};

export function getDefaultTorsionalSystemDesign(): TorsionalSpringSystemDesign {
    return {
        type: "torsionalSpringSystem",
        groups: [
            {
                id: "s1",
                name: "Stage 1",
                stage: 1,
                stageName: "Idle / NVH",
                role: "Low-torque damping",
                stageColor: "#cbd5e1",
                enabled: true,
                n: 4,
                k: 10.0,
                R: 75,
                theta_start: 0,
                d: 3.0,
                Dm: 18,
                L_free: 65,
                L_solid: 40,
                clearance: 5,
                materialId: "music_wire_a228"
            },
            {
                id: "s2",
                name: "Stage 2",
                stage: 2,
                stageName: "Main Drive",
                role: "Primary load path",
                stageColor: "#64748b",
                enabled: true,
                n: 4,
                k: 22.0,
                R: 105,
                theta_start: 5,
                d: 4.2,
                Dm: 24,
                L_free: 58,
                L_solid: 36,
                clearance: 3.5,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 8.0,
        referenceAngle: 10.0,
        outerOD: 260,
        innerID: 45,
        carrierThickness: 3.5,
        boltCount: 10,
        boltCircleRadius: 125
    };
}

export const TORSIONAL_SYSTEM_SAMPLES: Record<string, TorsionalSpringSystemDesign> = {
    clutch_passenger: {
        type: "torsionalSpringSystem",
        id: "preset-clutch-passenger",
        name: "Passenger Clutch (OEM 2-Stage)",
        groups: [
            {
                id: "cp1",
                name: "Stage 1",
                stage: 1,
                stageName: "Idle Comfort",
                role: "Low-torque isolation",
                stageColor: "#cbd5e1", // Silver tint
                enabled: true,
                n: 4,
                k: 8.5,
                R: 80,
                theta_start: 0,
                d: 3.2,
                Dm: 20,
                L_free: 60,
                L_solid: 40,
                clearance: 5,
                materialId: "music_wire_a228"
            },
            {
                id: "cp2",
                name: "Stage 2",
                stage: 2,
                stageName: "Main Drive",
                role: "Primary load path",
                stageColor: "#64748b", // Steel Blue tint
                enabled: true,
                n: 4,
                k: 18.0,
                R: 110,
                theta_start: 5,
                d: 4.5,
                Dm: 24,
                L_free: 55,
                L_solid: 35,
                clearance: 3.5,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 12.0,
        referenceAngle: 10.0,
        outerOD: 260,
        innerID: 45,
        carrierThickness: 3.5,
        boltCount: 8,
        boltCircleRadius: 130
    },
    dmf_heavy: {
        type: "torsionalSpringSystem",
        id: "preset-dmf-heavy",
        name: "HD DMF (3-Stage OEM)",
        groups: [
            {
                id: "d1",
                name: "Stage 1",
                stage: 1,
                stageName: "Low Idling",
                role: "NVH damping",
                stageColor: "#cbd5e1", // Silver
                enabled: true,
                n: 6,
                k: 12.0,
                R: 70,
                theta_start: 0,
                d: 3.5,
                Dm: 20,
                L_free: 65,
                L_solid: 42,
                clearance: 5,
                materialId: "music_wire_a228"
            },
            {
                id: "d2",
                name: "Stage 2",
                stage: 2,
                stageName: "Main Operating",
                role: "Drive load bearing",
                stageColor: "#64748b", // Steel Blue
                enabled: true,
                n: 6,
                k: 32.0,
                R: 105,
                theta_start: 4,
                d: 5.2,
                Dm: 28,
                L_free: 60,
                L_solid: 38,
                clearance: 3.5,
                materialId: "music_wire_a228"
            },
            {
                id: "d3",
                name: "Stage 3",
                stage: 3,
                stageName: "Peak Load",
                role: "End-stop protection",
                stageColor: "#334155", // Gunmetal
                enabled: true,
                n: 6,
                k: 58.0,
                R: 140,
                theta_start: 10,
                d: 6.8,
                Dm: 34,
                L_free: 55,
                L_solid: 35,
                clearance: 2.5,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 25,
        referenceAngle: 15,
        outerOD: 340,
        innerID: 55,
        carrierThickness: 5.0,
        boltCount: 16,
        boltCircleRadius: 175
    }
};

/**
 * normalizeTorsionalDesign
 * Enforces engineering rules like interleaving at the data layer.
 */
export function normalizeTorsionalDesign(design: TorsionalSpringSystemDesign): TorsionalSpringSystemDesign {
    const groups = [...design.groups];

    // Group by radius buckets for interleaving
    const radiusBuckets: Record<number, number[]> = {};
    groups.forEach((g, idx) => {
        const roundedR = Math.round(g.R * 10) / 10;
        if (!radiusBuckets[roundedR]) radiusBuckets[roundedR] = [];
        radiusBuckets[roundedR].push(idx);
    });

    Object.values(radiusBuckets).forEach(indices => {
        if (indices.length <= 1) return;

        // Multi-stage interleaving logic (Formula: pitch = 360/totalN)
        const totalN = indices.reduce((sum, idx) => sum + groups[idx].n, 0);
        const pitch = 360 / (totalN || 1);

        indices.forEach((groupIdx, stageIdx) => {
            // Formula-driven interleaving: Stage 2 centered in Stage 1 gaps
            // (e.g. for N=4,4, pitch=45, stage2 starts at 45deg)
            groups[groupIdx].theta_start = stageIdx * pitch;
        });
    });

    return { ...design, groups };
}
