/**
 * OptimizationMetrics quantify the quality of a spring design.
 */
export interface OptimizationMetrics {
    massProxy: number;        // Proxy for weight/material cost (smaller is better)
    maxStressRatio: number;   // Max stress / Allowable stress (smaller is better, ideally < 1)
    solidMarginMin: number;   // Clearance at max travel (larger is better)
    totalEnergy?: number;     // Energy storage (larger is better for some applications)
    costProxy?: number;       // Placeholder for future cost model
}

/**
 * Normalization utilities for Pareto comparison
 */
export const MetricUtils = {
    /**
     * Normalizes a value to [0, 1] range.
     * Note: For metrics where "smaller is better", lower values map to 0.
     */
    normalize: (val: number, min: number, max: number): number => {
        if (max === min) return 0.5;
        const norm = (val - min) / (max - min);
        return Math.max(0, Math.min(1, norm));
    },

    /**
     * Safe getter for mass proxy
     * mass ~ PI^2 * d^2 * D * n / 4 (volume proxy)
     */
    calculateMassProxy: (d: number, D: number, n: number): number => {
        return Math.pow(d, 2) * D * n;
    },

    calculateDiscMassProxy: (Do: number, Di: number, t: number, Ns: number, Np: number): number => {
        // Volume of ring ~ PI/4 * (Do^2 - Di^2) * t
        return (Math.pow(Do, 2) - Math.pow(Di, 2)) * t * Ns * Np;
    },

    /**
     * Safe getter for stress ratio
     */
    calculateStressRatio: (maxStress: number, tauAllow: number): number => {
        if (tauAllow <= 0) return 2; // Penalty
        return maxStress / tauAllow;
    }
};
