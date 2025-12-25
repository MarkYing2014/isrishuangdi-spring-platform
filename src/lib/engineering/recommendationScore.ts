import type { NormalizedAudit } from "./normalizeAudit";
import type { AnalysisResult } from "@/lib/stores/springDesignStore";

export interface RecommendationResult {
    eligible: boolean;
    totalScore: number;
    breakdown: {
        safety: number;
        fatigue: number;
        margin: number;
        manufacturability: number;
        costProxy: number;
    };
    reasons: string[];
}

/**
 * Multi-dimensional scoring engine for spring variants
 */
export function calculateRecommendationScore(
    audit: NormalizedAudit,
    analysis: AnalysisResult
): RecommendationResult {
    // 1. Mandatory Hard Gate: FAIL status = ineligible
    if (audit.status === "FAIL") {
        return {
            eligible: false,
            totalScore: 0,
            breakdown: { safety: 0, fatigue: 0, margin: 0, manufacturability: 0, costProxy: 0 },
            reasons: ["Design fails critical engineering audits and is not recommended for production."],
        };
    }

    const reasons: string[] = [];

    // 2. Dimension Scoring (0-100 scale)

    // A. Safety & Stress (Weight: 0.35)
    // Optimal safety factor is often around 1.1 - 1.5 for static loads
    let safetyScore = 0;
    if (audit.safetyFactor >= 1.0) {
        safetyScore = Math.min(100, Math.max(0, 100 - (audit.stressRatio - 70) * 2));
        if (audit.safetyFactor > 1.2) reasons.push(`Good safety margin (SF: ${audit.safetyFactor.toFixed(2)})`);
    } else {
        safetyScore = 40; // Marginal
    }

    // B. Fatigue Life (Weight: 0.25)
    let fatigueScore = 50;
    if (audit.fatigueLevel === "HIGH") {
        fatigueScore = 100;
        reasons.push("Excellent fatigue resistance (Rated HIGH)");
    } else if (audit.fatigueLevel === "MED") {
        fatigueScore = 80;
        reasons.push("Reliable medium-cycle life");
    } else {
        fatigueScore = 40;
    }

    // C. Clearance / Margin (Weight: 0.20)
    // Check COIL BIND margin if applicable
    let marginScore = 80;
    if (audit.dominantFailureMode === "BIND") {
        marginScore = 40;
        reasons.push("Narrow coil-bind margin requires careful tolerance control.");
    } else {
        reasons.push("Sustainable geometry with healthy clearance.");
    }

    // D. Manufacturability (Weight: 0.10)
    // Healthy Spring Index (C) is 4 to 12
    let manufacturabilityScore = 80;
    const c = analysis.springIndex || 0;
    if (c > 0) {
        if (c >= 4 && c <= 12) {
            manufacturabilityScore = 100;
            reasons.push(`Ideal spring index (C=${c.toFixed(1)}) for standard coiling.`);
        } else if (c < 3 || c > 18) {
            manufacturabilityScore = 40;
            reasons.push(`Extreme spring index (C=${c.toFixed(1)}) complicates manufacturing.`);
        }
    }

    // E. Cost Proxy (Weight: 0.10)
    // Simplified cost proxy: Weight / Volume proxy
    // For now, assume baseline 80
    const costProxyScore = 80;

    // 3. Aggregate Total Score
    const totalScore =
        (safetyScore * 0.35) +
        (fatigueScore * 0.25) +
        (marginScore * 0.20) +
        (manufacturabilityScore * 0.10) +
        (costProxyScore * 0.10);

    return {
        eligible: true,
        totalScore: Math.round(totalScore),
        breakdown: {
            safety: Math.round(safetyScore),
            fatigue: Math.round(fatigueScore),
            margin: Math.round(marginScore),
            manufacturability: Math.round(manufacturabilityScore),
            costProxy: costProxyScore,
        },
        reasons: reasons.slice(0, 4), // Keep top 4 reasons
    };
}
