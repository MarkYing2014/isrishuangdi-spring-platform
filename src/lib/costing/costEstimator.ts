import { CostBreakdown, SupplierQuote } from "./supplierCostModel";

/**
 * Cost Estimator
 * Q2: Engineering Decision Pipeline
 */

export function estimateSupplierCost(
    supplier: any, // Matches from supplierMatchEngine
    designSummary: any,
    deliverabilityAudit: any
): SupplierQuote {
    // 1. Base Material Cost (Mocked)
    const mass = designSummary.mass || 0.1; // kg
    const baseMaterialRate = 15; // USD/kg
    const materialCost = Number((mass * baseMaterialRate).toFixed(2));

    // 2. Processing Cost
    let processingCost = 5.0; // Base setup
    if (designSummary.springType === "arc") processingCost += 10.0;
    if (designSummary.kStages && designSummary.kStages.length > 1) processingCost += 5.0;

    // 3. Inspection & Gauge Cost
    let inspectionCost = 1.0;
    let gaugeCost = 0;
    if (deliverabilityAudit.level === "ULTRA_PRECISION") {
        inspectionCost += 15.0; // High precision inspection
        gaugeCost = 50.0;       // GO/NO-GO Tooling cost
    } else if (deliverabilityAudit.level === "CHALLENGING") {
        inspectionCost += 5.0;
        gaugeCost = 20.0;
    }

    // 4. Certification Cost
    const certificationCost = deliverabilityAudit.findings?.some((f: any) => f.labelEn === "Salt Spray 96h+") ? 25.0 : 0;

    // 5. Risk Premium
    let riskPremium = 0;
    if (supplier.matchLevel === "PARTIAL") {
        riskPremium = (materialCost + processingCost) * 0.25; // 25% risk premium for partial capability
    }
    if (deliverabilityAudit.level === "HIGH_RISK") {
        riskPremium += 50.0;
    }

    const totalCost = Number(
        (materialCost + processingCost + inspectionCost + gaugeCost + certificationCost + riskPremium).toFixed(2)
    );

    const breakdown: CostBreakdown = {
        materialCost,
        processingCost,
        inspectionCost,
        gaugeCost,
        certificationCost,
        riskPremium: Number(riskPremium.toFixed(2)),
        totalCost,
        currency: "USD"
    };

    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days validity

    return {
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        breakdown,
        leadTimeWeeks: supplier.matchLevel === "FULL" ? 3 : 6,
        validUntil: date.toISOString().split('T')[0]
    };
}
