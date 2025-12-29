
import type { ImrPoint } from "./types";

export type DensityMode = "RAW" | "SAMPLED" | "AGGREGATED";

export function chooseDensityMode(N: number): DensityMode {
    if (N <= 500) return "RAW";
    if (N <= 5000) return "SAMPLED";
    return "AGGREGATED";
}

export interface AggregatedPoint {
    x: number;
    min: number;
    max: number;
    mean: number;
    count: number;
}

export interface ChartDataSeries {
    envelope: AggregatedPoint[];
    violations: ImrPoint[];
    raw?: ImrPoint[];
    sampled?: ImrPoint[];
    mode: DensityMode;
}

/**
 * Aggregates SPC data with strict density modes based on point count.
 */
export function aggregateImrData(points: ImrPoint[], widthPx: number = 800): ChartDataSeries {
    const count = points.length;
    const mode = chooseDensityMode(count);

    const violations: ImrPoint[] = [];
    // Strict separation: collect all violations first
    for (const p of points) {
        if (p.outOfControl) violations.push(p);
    }

    // RAW: All points 
    if (mode === "RAW") {
        return {
            envelope: [],
            violations, // Still returned for overlay consistency
            raw: points,
            mode
        };
    }

    // SAMPLED: Stride sampling for Ok points + All Violations
    // Spec: "SAMPLED (Middle Data): Sampled (reservoir/stride) + Violations"
    if (mode === "SAMPLED") {
        // Simple stride to keep ~500 visible points
        const target = 500;
        const stride = Math.ceil(count / target);
        const sampled: ImrPoint[] = [];

        for (let i = 0; i < count; i += stride) {
            const p = points[i];
            // Optimization: Don't double-plot violations if they are already in 'violations' array overlay
            if (!p.outOfControl) {
                sampled.push(p);
            }
        }
        return {
            envelope: [],
            violations,
            sampled,
            mode
        };
    }

    // AGGREGATED: Min-Max Envelope + Mean
    // Spec: "N > 5000: Aggregated Envelope (Min-Max) + Violations"
    const targetBins = Math.min(count, Math.max(200, Math.floor(widthPx / 2)));
    const binSize = Math.ceil(count / targetBins);

    const envelope: AggregatedPoint[] = [];

    for (let i = 0; i < count; i += binSize) {
        const slice = points.slice(i, i + binSize);
        if (slice.length === 0) continue;

        let min = slice[0].value;
        let max = slice[0].value;
        let sum = 0;

        for (const p of slice) {
            if (p.value < min) min = p.value;
            if (p.value > max) max = p.value;
            sum += p.value;
        }

        envelope.push({
            x: slice[0].x, // Anchor to start
            min,
            max,
            mean: sum / slice.length,
            count: slice.length
        });
    }

    return {
        envelope,
        violations,
        mode
    };
}
