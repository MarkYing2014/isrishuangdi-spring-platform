import { PlatformResult } from "./types";
import { OptimizationMetrics } from "./metrics";

/**
 * CandidateSolution represents a single generated design scheme.
 * It contains the geometry, the performance analysis, and the optimization metrics.
 */
export interface CandidateSolution {
    id: string;

    // The specific geometry parameters used for this candidate
    params: any;

    // Full engineering result from engine.calculate
    platformResult: PlatformResult;

    // Engineering Review status (integration point for Phase 5)
    reviewSummary?: {
        overall: "ok" | "warning" | "error";
        score: number; // 0-100
        criticalIssues: string[];
    };

    // Calculated optimization metrics for Pareto sorting
    metrics: OptimizationMetrics;

    // Metadata for UI
    paretoRank: number; // 1 = Front 1 (Optimal), 2 = Front 2, etc.
    isVisible: boolean;
}
