/**
 * Shock Absorber Spring Geometry
 * 减震器弹簧几何生成
 * 
 * This module generates the centerline for shock absorber springs
 * using law-driven parametric curves and numerical integration.
 * 
 * Key features:
 * - Variable mean diameter along the spring
 * - Variable wire diameter along the spring
 * - Variable pitch with closed-end transitions
 * - Numerical integration for z-coordinate (trapezoidal rule)
 */

import * as THREE from 'three';
import type { ShockSpringParams, CenterlineResult, GrindCutPlanes } from './ShockSpringTypes';
import { meanRadiusLaw, wireDiameterLaw, pitchLaw } from './ShockSpringModel';

// ============================================================================
// Centerline Generation
// ============================================================================

/**
 * Build the centerline for a shock absorber spring
 * 
 * Algorithm:
 * 1. Sample normalized parameter s from 0 to 1
 * 2. For each s:
 *    - θ = 2π × totalTurns × s
 *    - R = meanRadiusLaw(s)
 *    - x = R × cos(θ), y = R × sin(θ)
 * 3. z is computed via numerical integration of pitch (trapezoidal rule)
 * 4. Wire radius = 0.5 × wireDiameterLaw(s)
 * 
 * @param params Spring parameters
 * @returns Centerline result with points, radii, height, and s values
 */
export function buildShockSpringCenterline(params: ShockSpringParams): CenterlineResult {
    const { totalTurns, samplesPerTurn } = params;

    // Calculate total samples
    const totalSamples = Math.max(2, Math.floor(totalTurns * samplesPerTurn) + 1);

    const points: THREE.Vector3[] = [];
    const radii: number[] = [];
    const sValues: number[] = [];
    const zValues: number[] = [0];

    // Generate all sample points
    for (let i = 0; i < totalSamples; i++) {
        // Normalized parameter s ∈ [0, 1]
        const s = i / (totalSamples - 1);
        sValues.push(s);

        // Angle θ = 2π × N × s
        const theta = 2 * Math.PI * totalTurns * s;

        // Mean radius from law
        const R = meanRadiusLaw(params, s);

        // X-Y coordinates
        const x = R * Math.cos(theta);
        const y = R * Math.sin(theta);

        // Z from numerical integration (trapezoidal rule)
        if (i > 0) {
            const s0 = sValues[i - 1];
            const s1 = s;
            const P0 = pitchLaw(params, s0);
            const P1 = pitchLaw(params, s1);

            // dz = totalTurns × 0.5 × (P0 + P1) × (s1 - s0)
            // This integrates pitch over the ds interval
            const dz = totalTurns * 0.5 * (P0 + P1) * (s1 - s0);
            zValues.push(zValues[i - 1] + dz);
        }

        // Create 3D point
        points.push(new THREE.Vector3(x, y, zValues[i]));

        // Wire radius (half of diameter)
        radii.push(0.5 * wireDiameterLaw(params, s));
    }

    // Calculate total height
    const totalHeight = zValues[totalSamples - 1] - zValues[0];

    return {
        points,
        radii,
        totalHeight,
        s: sValues,
    };
}

// ============================================================================
// Grinding Cut Planes
// ============================================================================

/**
 * Compute z-coordinates for grinding cut planes based on TURNS (not height)
 * 
 * End grinding is defined by turns, not by height.
 * This preserves consistency under variable pitch and wire diameter.
 * 
 * Algorithm:
 * 1. s_cut = offsetTurns / totalTurns
 * 2. Find centerline point at s = s_cut → z_cut_bottom
 * 3. Find centerline point at s = 1 - s_cut → z_cut_top
 * 
 * @param params Spring parameters
 * @param centerline Generated centerline
 * @returns Cut plane z-coordinates
 */
export function computeGrindCutPlanes(
    params: ShockSpringParams,
    centerline: CenterlineResult
): GrindCutPlanes {
    const sCut = params.grind.offsetTurns / params.totalTurns;

    let zCutBottom: number | null = null;
    let zCutTop: number | null = null;

    if (params.grind.bottom && sCut > 0 && sCut < 1) {
        // Find point closest to s = sCut
        const idx = findClosestSIndex(centerline.s, sCut);
        zCutBottom = centerline.points[idx].z;
    }

    if (params.grind.top && sCut > 0 && sCut < 1) {
        // Find point closest to s = 1 - sCut
        const idx = findClosestSIndex(centerline.s, 1 - sCut);
        zCutTop = centerline.points[idx].z;
    }

    return { zCutBottom, zCutTop };
}

/**
 * Find the index of the closest s value in the array
 */
function findClosestSIndex(sValues: number[], targetS: number): number {
    let minDist = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < sValues.length; i++) {
        const dist = Math.abs(sValues[i] - targetS);
        if (dist < minDist) {
            minDist = dist;
            bestIdx = i;
        }
    }

    return bestIdx;
}

// ============================================================================
// Trimmed Centerline (for visualization after grinding)
// ============================================================================

/**
 * Get a trimmed version of the centerline based on grinding parameters
 * 
 * This returns only the points that remain after grinding cuts.
 * Useful for visualization.
 * 
 * @param params Spring parameters
 * @param centerline Full centerline
 * @returns Trimmed centerline result
 */
export function getTrimmedCenterline(
    params: ShockSpringParams,
    centerline: CenterlineResult
): CenterlineResult {
    const sCut = params.grind.offsetTurns / params.totalTurns;

    // Calculate s ranges to keep
    const sMin = params.grind.bottom ? sCut : 0;
    const sMax = params.grind.top ? 1 - sCut : 1;

    // Filter points within the s range
    const trimmedPoints: THREE.Vector3[] = [];
    const trimmedRadii: number[] = [];
    const trimmedS: number[] = [];

    for (let i = 0; i < centerline.s.length; i++) {
        const s = centerline.s[i];
        if (s >= sMin && s <= sMax) {
            trimmedPoints.push(centerline.points[i].clone());
            trimmedRadii.push(centerline.radii[i]);
            trimmedS.push(s);
        }
    }

    // Calculate trimmed height
    const totalHeight = trimmedPoints.length > 0
        ? trimmedPoints[trimmedPoints.length - 1].z - trimmedPoints[0].z
        : 0;

    return {
        points: trimmedPoints,
        radii: trimmedRadii,
        totalHeight,
        s: trimmedS,
    };
}

// ============================================================================
// Pitch Sampling (for debug visualization)
// ============================================================================

/**
 * Generate pitch values at sample points for debug visualization
 * 
 * @param params Spring parameters
 * @param samples Number of samples
 * @returns Array of { s, pitch } pairs
 */
export function samplePitchLaw(
    params: ShockSpringParams,
    samples: number = 100
): Array<{ s: number; pitch: number }> {
    const result: Array<{ s: number; pitch: number }> = [];

    for (let i = 0; i < samples; i++) {
        const s = i / (samples - 1);
        const pitch = pitchLaw(params, s);
        result.push({ s, pitch });
    }

    return result;
}
