/**
 * Supplier Cost Model
 * Q2: Engineering Decision Pipeline
 */

export interface CostBreakdown {
    materialCost: number;
    processingCost: number;
    inspectionCost: number;
    gaugeCost: number;
    certificationCost: number;
    riskPremium: number;
    totalCost: number;
    currency: string;
}

export interface SupplierQuote {
    supplierId: string;
    supplierName: string;
    breakdown: CostBreakdown;
    leadTimeWeeks: number;
    validUntil: string;
}
