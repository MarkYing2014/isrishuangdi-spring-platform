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
            { ...DEFAULT_TORSIONAL_GROUP }
        ],
        frictionTorque: 5.0,
        referenceAngle: 10.0,
        outerOD: 250,
        innerID: 40,
        carrierThickness: 3.5,
        boltCount: 12,
        boltCircleRadius: 110
    };
}

// ============================================================================
// SAMPLE PRESETS - Real Product Layout (Same Radius, Different Parameters)
// ============================================================================

export const TORSIONAL_SYSTEM_SAMPLES: Record<string, TorsionalSpringSystemDesign> = {
    /**
     * Passenger Clutch - 2-Stage at Same Radius
     * Stage differentiation via spring length and stiffness
     */
    clutch_passenger: {
        type: "torsionalSpringSystem",
        id: "preset-clutch-passenger",
        name: "Passenger Clutch (OEM 2-Stage)",
        groups: [
            {
                id: "cp1",
                name: "Stage 1 (Long/Soft)",
                stage: 1,
                stageName: "Idle Comfort",
                role: "Longer springs engage first",
                stageColor: "#cbd5e1",
                enabled: true,
                n: 4,
                k: 8.5,
                R: 85,
                theta_start: 0,
                d: 3.0,
                Dm: 18,
                L_free: 65,
                L_solid: 40,
                clearance: 5,
                materialId: "music_wire_a228"
            },
            {
                id: "cp2",
                name: "Stage 2 (Short/Stiff)",
                stage: 2,
                stageName: "Main Drive",
                role: "Shorter springs engage later",
                stageColor: "#64748b",
                enabled: true,
                n: 4,
                k: 18.0,
                R: 85,
                theta_start: 4,
                d: 4.0,
                Dm: 22,
                L_free: 52,
                L_solid: 32,
                clearance: 3,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 12.0,
        referenceAngle: 10.0,
        outerOD: 240,
        innerID: 45,
        carrierThickness: 3.5,
        boltCount: 8,
        boltCircleRadius: 115
    },

    /**
     * Heavy Duty DMF - 3-Stage at Same Radius
     * Real product layout with interleaved springs
     */
    dmf_heavy: {
        type: "torsionalSpringSystem",
        id: "preset-dmf-heavy",
        name: "HD DMF (3-Stage OEM)",
        groups: [
            {
                id: "d1",
                name: "Stage 1 (Soft/Long)",
                stage: 1,
                stageName: "Idle NVH",
                role: "Longest springs - NVH filtering",
                stageColor: "#cbd5e1",
                enabled: true,
                n: 4,
                k: 10.0,
                R: 90,
                theta_start: 0,
                d: 3.2,
                Dm: 18,
                L_free: 70,
                L_solid: 42,
                clearance: 5,
                materialId: "music_wire_a228"
            },
            {
                id: "d2",
                name: "Stage 2 (Medium)",
                stage: 2,
                stageName: "Drive Load",
                role: "Medium springs - normal driving",
                stageColor: "#64748b",
                enabled: true,
                n: 4,
                k: 16.0,
                R: 90,
                theta_start: 3,
                d: 3.8,
                Dm: 20,
                L_free: 58,
                L_solid: 35,
                clearance: 4,
                materialId: "music_wire_a228"
            },
            {
                id: "d3",
                name: "Stage 3 (Stiff/Short)",
                stage: 3,
                stageName: "Peak Torque",
                role: "Shortest/stiffest - overload protection",
                stageColor: "#334155",
                enabled: true,
                n: 4,
                k: 28.0,
                R: 90,
                theta_start: 6,
                d: 4.5,
                Dm: 24,
                L_free: 48,
                L_solid: 30,
                clearance: 3,
                materialId: "music_wire_a228"
            }
        ],
        frictionTorque: 18.0,
        referenceAngle: 12.0,
        outerOD: 280,
        innerID: 50,
        carrierThickness: 4.0,
        boltCount: 10,
        boltCircleRadius: 130
    }
};

/**
 * normalizeTorsionalDesign
 * Enforces engineering rules like interleaving at the data layer.
 * For same-radius multi-stage: interleaves springs angularly.
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

        // Multi-stage interleaving logic
        // Formula: each stage's springs are offset by (360 / totalN) * stageOffset
        const totalN = indices.reduce((sum, idx) => sum + groups[idx].n, 0);
        const basePitch = 360 / (totalN || 1);

        let cumOffset = 0;
        indices.forEach(groupIdx => {
            // Offset this stage's theta_start by cumulative spring count
            groups[groupIdx].theta_start = cumOffset * basePitch;
            cumOffset += groups[groupIdx].n;
        });
    });

    return { ...design, groups };
}
