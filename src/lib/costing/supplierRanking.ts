import { SupplierQuote } from "./supplierCostModel";

/**
 * Supplier Ranking Engine
 * Q2: Engineering Decision Pipeline
 */

export interface RankedSupplier extends SupplierQuote {
    decisionScore: number;
    recommendation: "RECOMMENDED" | "ACCEPTABLE_WITH_WAIVER" | "NOT_DELIVERABLE";
}

export function rankSuppliers(
    quotes: SupplierQuote[],
    matches: any[],
    deliverabilityAudit: any
): RankedSupplier[] {
    // 1. Find min/max for normalization
    const totalCosts = quotes.map(q => q.breakdown.totalCost);
    const minCost = Math.min(...totalCosts);
    const maxCost = Math.max(...totalCosts);

    return quotes.map(quote => {
        const match = matches.find(m => m.supplierId === quote.supplierId);

        // Cost Score (Lower is better) - Normalized 0 to 1
        const costScore = maxCost === minCost ? 1 : 1 - (quote.breakdown.totalCost - minCost) / (maxCost - minCost);

        // Capability Score (FULL=1, PARTIAL=0.5, NO_MATCH=0)
        let capabilityScore = 0;
        if (match.matchLevel === "FULL") capabilityScore = 1;
        else if (match.matchLevel === "PARTIAL") capabilityScore = 0.5;

        // Deliverability Score (Audit status PASS=1, WARN=0.5, FAIL=0)
        let deliverabilityScore = 0;
        if (deliverabilityAudit.status === "PASS") deliverabilityScore = 1;
        else if (deliverabilityAudit.status === "WARN") deliverabilityScore = 0.5;

        // Risk Score (Lower risk premium is better)
        const riskScore = quote.breakdown.riskPremium === 0 ? 1 : Math.max(0, 1 - (quote.breakdown.riskPremium / quote.breakdown.totalCost) * 2);

        // Weighted Decision Score
        const decisionScore = (
            (costScore * 0.35) +
            (capabilityScore * 0.30) +
            (deliverabilityScore * 0.20) +
            (riskScore * 0.15)
        );

        // Recommendation Semantics
        let recommendation: RankedSupplier["recommendation"] = "NOT_DELIVERABLE";
        if (match.matchLevel === "FULL" && deliverabilityAudit.status !== "FAIL") {
            recommendation = "RECOMMENDED";
        } else if (match.matchLevel === "PARTIAL" || deliverabilityAudit.status === "WARN") {
            recommendation = "ACCEPTABLE_WITH_WAIVER";
        }

        return {
            ...quote,
            decisionScore: Number(decisionScore.toFixed(3)),
            recommendation
        };
    }).sort((a, b) => b.decisionScore - a.decisionScore);
}
