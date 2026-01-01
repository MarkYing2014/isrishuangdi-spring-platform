/**
 * Shock Absorber Spring Metrics
 * 减震器弹簧计算指标
 * 
 * This module computes derived metrics for shock absorber springs.
 */

import type { CenterlineResult, ShockSpringMetrics, ShockSpringParams } from './ShockSpringTypes';
import { pitchLaw } from './ShockSpringModel';

/**
 * Compute metrics for a shock absorber spring
 * 
 * @param centerline Generated centerline
 * @returns Computed metrics (wire length, min/max radius, min/max pitch)
 */
export function computeShockSpringMetrics(
    centerline: CenterlineResult,
    params?: ShockSpringParams
): ShockSpringMetrics {
    const { points, radii } = centerline;

    // Wire length: sum of segment distances
    let wireLength = 0;
    for (let i = 1; i < points.length; i++) {
        wireLength += points[i].distanceTo(points[i - 1]);
    }

    // Min/max radius from radii array
    const minRadius = Math.min(...radii);
    const maxRadius = Math.max(...radii);

    // Min/max pitch (sample from pitch law if params provided)
    let minPitch = 0;
    let maxPitch = 0;

    if (params) {
        const samples = 100;
        const pitchValues: number[] = [];

        for (let i = 0; i < samples; i++) {
            const s = i / (samples - 1);
            pitchValues.push(pitchLaw(params, s));
        }

        minPitch = Math.min(...pitchValues);
        maxPitch = Math.max(...pitchValues);
    }

    return {
        wireLength,
        minRadius,
        maxRadius,
        minPitch,
        maxPitch,
    };
}

/**
 * Compute spring weight based on wire length and material density
 * 
 * @param wireLength Wire centerline length in mm
 * @param avgWireRadius Average wire radius in mm
 * @param density Material density in kg/m³ (default: 7850 for steel)
 * @returns Weight in grams
 */
export function computeSpringWeight(
    wireLength: number,
    avgWireRadius: number,
    density: number = 7850
): number {
    // Wire volume = π × r² × length (in mm³)
    const volumeMm3 = Math.PI * avgWireRadius * avgWireRadius * wireLength;

    // Convert to m³ and compute mass
    const volumeM3 = volumeMm3 * 1e-9;
    const massKg = density * volumeM3;

    // Return in grams
    return massKg * 1000;
}

/**
 * Compute approximate spring rate (simplified formula)
 * 
 * Note: This is a rough approximation for variable-parameter springs.
 * For accurate analysis, use FEA.
 * 
 * @param params Spring parameters
 * @param shearModulus Shear modulus in MPa (default: 80000 for spring steel)
 * @returns Approximate spring rate in N/mm
 */
export function computeApproximateSpringRate(
    params: ShockSpringParams,
    shearModulus: number = 80000
): number {
    // Use average values for approximation
    const avgWireDia = (params.wireDia.start + params.wireDia.mid + params.wireDia.end) / 3;
    const avgMeanDia = (params.meanDia.start + params.meanDia.mid + params.meanDia.end) / 3;

    // Estimate active coils (total - closed turns at each end)
    const closedTotal = typeof params.pitch.closedTurns === 'number'
        ? params.pitch.closedTurns * 2
        : params.pitch.closedTurns.start + params.pitch.closedTurns.end;
    const activeCoils = params.totalTurns - closedTotal;

    // Standard compression spring formula: k = G × d⁴ / (8 × D³ × Na)
    const d = avgWireDia;
    const D = avgMeanDia;
    const Na = Math.max(0.5, activeCoils);

    const springRate = (shearModulus * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * Na);

    return springRate;
}
