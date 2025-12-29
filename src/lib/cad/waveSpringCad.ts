
import * as THREE from "three";
import { type WaveSpringCenterlineMm, type Vec3Mm } from "./types";
import { type WaveSpringGeometry } from "@/lib/stores/springDesignStore";

// Helper to convert THREE.Vector3 to Vec3Mm
const toVec3 = (v: THREE.Vector3): Vec3Mm => ({ x: v.x, y: v.y, z: v.z });

const EPS = 1e-9;
function safeNormalize(v: THREE.Vector3): THREE.Vector3 {
    const len = v.length();
    if (len < EPS) return v.set(1, 0, 0);
    return v.multiplyScalar(1 / len);
}

/**
 * Build Wave Spring Centerline for CAD Export
 * 
 * Logic matches `buildWaveSpringMeshGeometry` (V2) but returns a single polyline.
 * Uses strict millimeters.
 */
export function buildWaveSpringCenterlineMm(
    design: WaveSpringGeometry,
    deflectionMm: number = 0
): WaveSpringCenterlineMm {
    const {
        id,
        od,
        thickness_t: thickness,
        radialWall_b: width,
        turns_Nt: turns,
        wavesPerTurn_Nw: waves,
        freeHeight_Hf: freeHeight,
    } = design;

    // Derived dimensions
    // Mean Diameter Dm = OD - b (or (OD+ID)/2, checking logic)
    // In calculator, OD = Dm + b, ID = Dm - b => Dm = (OD+ID)/2
    // But Visualizer uses meanDiameter = od - radialWall_b? 
    // Let's use standard: Dm = (ID + OD) / 2
    const meanDiameter = (id + od) / 2;
    const meanRadius = meanDiameter / 2;

    // Calculate effective height based on deflection
    // Hw = Hf - deflection
    // BUT we must respect solid height? The centerline generator just does what it's told.
    // However, to match visualizer "working amplitude", we need to recalculate amplitude.

    // Logic from WaveSpringVisualizer / WaveSpringMesh:
    // effectiveTotalHeight = (Hw)
    const currentHeight = Math.max(turns * thickness, freeHeight - deflectionMm);

    // Pitch per turn = H / (Nt + 1)
    const pitchPerTurn = currentHeight / (turns + 1);

    // Amplitude calc: A = p/2
    // With safety clamp
    const maxSafeAmplitude = Math.min(0.45 * pitchPerTurn, (pitchPerTurn - thickness) / 2);
    // Base amplitude from design input is usually theoretical free amplitude. 
    // We don't have "amplitude" in WaveSpringGeometry explicit? 
    // Wait, WaveSpringGeometry DOES NOT HAVE AMPLITUDE in the struct I saw in springDesignStore?
    // Let me check springDesignStore.ts again.
    // It has: type: "wave", id, od, thickness_t, radialWall_b, turns_Nt, wavesPerTurn_Nw, freeHeight_Hf, workingHeight_Hw.
    // IT IS MISSING AMPLITUDE explicitly stored?
    // In WaveSpringCalculator, it calls `calculateWaveSpring(input)`. 
    // The result has `waveAmplitude_mm`.
    // BUT `WaveSpringGeometry` in store doesn't seem to have it?
    // Let's re-read springDesignStore.ts lines 230-241.
    // line 230: export interface WaveSpringGeometry { ... id, od, thickness_t, radialWall_b, turns_Nt, wavesPerTurn_Nw, freeHeight_Hf, workingHeight_Hw }
    // NO AMPLITUDE!
    // However, WaveSpringMesh needs amplitude.
    // In WaveSpringCalculator, `Calculator3DPreview` calculates `workingAmplitude` on the fly (line 342).
    // workingAmplitude = (workingHeight - (Nt * t)) / (2 * Nt * Nw) ???
    // Wait, formula in Mesh was: A = p/2 generally.
    // Calculator3DPreview formula:
    // const workingAmplitude = (workingHeight - (geometry.turns_Nt * geometry.thickness_t)) / (2 * geometry.turns_Nt * geometry.wavesPerTurn_Nw);
    // This assumes specific compression logic.

    // I will use the Calculator3DPreview logic to derive amplitude if missing.
    // A = (H - SolidH) / (2 * Nt * Nw) ?? No, that seems small.
    // Standard: Free Height H = N * (2A + t) ? Or N * p + something?
    // If H = (Nt+1)*p and p=2A, then H = (Nt+1)*2A. => A = H / (2(Nt+1)).

    // Let's use the robust logic:
    // If H is current height.
    // Solid H = Nt * t.
    // Deflection = Hfree - H.
    // The wave flattens.
    // Let's try to derive A from H.
    // If we assume crest-to-crest contact, A = Pitch/2.
    // Pitch = H / (Nt + 1) -> A = H / (2*(Nt+1)).

    // Let's verify vs Calculator3DPreview logic:
    // workingAmplitude = (H - Solid) / (2 * Nt * Nw) ??
    // That implies A is distributed over all waves? No.
    // Let's stick to the Geometry Builder logic in V2:
    // const pitchPerTurn = effectiveTotalHeight / (turns + 1);
    // const maxSafeAmplitude = Math.min(0.45 * pitchPerTurn, (pitchPerTurn - thickness) / 2);

    // We will use this logic to derive A.

    const amplitude = Math.max(0, Math.min(0.45 * pitchPerTurn, (pitchPerTurn - thickness) / 2));

    const phase = 0; // Default
    const segmentsPerTurn = 160;
    const totalSegments = Math.max(100, turns * segmentsPerTurn);
    const dTheta = (2 * Math.PI * turns) / totalSegments;
    const dirSign = 1; // CCW default

    const bodyPoints: Vec3Mm[] = [];

    for (let i = 0; i <= totalSegments; i++) {
        const theta = i * dTheta;

        // Helix Base
        const z_base = (pitchPerTurn / (2 * Math.PI)) * theta;

        // Wave: z_wave = A * sin(Nw * theta) * s(theta)
        // s(theta) flips every turn
        const turnIndex = Math.floor(theta / (2 * Math.PI));
        const s = (turnIndex % 2 === 0) ? 1 : -1;
        const z_wave = amplitude * Math.sin(waves * theta + phase) * s;

        const z = z_base + z_wave;
        const x = meanRadius * Math.cos(theta); // CCW: x = R cos, y = R sin
        const y = meanRadius * Math.sin(theta);

        bodyPoints.push({ x, y, z });
    }

    return {
        body: bodyPoints,
        stats: {
            meanRadiusMm: meanRadius,
            thicknessMm: thickness,
            widthMm: width,
            wavesPerTurn: waves,
            activeCoils: turns,
            amplitudeMm: amplitude,
            totalHeightMm: currentHeight,
            sampleCount: bodyPoints.length
        }
    };
}
