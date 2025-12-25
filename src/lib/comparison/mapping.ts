/**
 * Semantic Mapping for Unified Comparison
 * Converts spring-specific analysis results into unified ComparisonKeys.
 */

import { SavedDesign } from "@/lib/stores/springDesignStore";
import { ComparisonKey } from "./types";
import { AuditEngine } from "@/lib/audit/AuditEngine";

/**
 * Extract a semantic value from a saved design based on a ComparisonKey.
 * This function encapsulates the "Engineering Meaning" for each spring type.
 */
export function extractSemanticValue(variant: SavedDesign, key: ComparisonKey): any {
    const { geometry, analysisResult, springType } = variant;

    // Preliminary: Calculate unified audit if missing (or use existing if trusted)
    // In a real implementation, we might want to cache this in the Variant Snapshot
    const unifiedAudit = AuditEngine.evaluate({
        springType,
        geometry: geometry as any,
        results: analysisResult as any
    });

    switch (key) {
        // --- Stiffness & Load ---
        case "k_work":
            return analysisResult.springRate;

        case "load_work":
            return analysisResult.workingLoad || analysisResult.maxLoad;

        case "load_min":
            return analysisResult.workingLoad ? (analysisResult.workingLoad - (analysisResult.workingDeflection || 0) * analysisResult.springRate) : 0;

        // --- Stress & Audit ---
        case "stress_max":
            return analysisResult.maxStress || analysisResult.shearStress;

        case "stress_allowable":
            return unifiedAudit.audits.stress.allowableStress;

        case "stress_ratio":
            return unifiedAudit.audits.stress.stressRatio;

        case "safety_factor":
            return analysisResult.staticSafetyFactor || (1 / (unifiedAudit.audits.stress.stressRatio / 100 || 0.001));

        case "audit_status":
            return unifiedAudit.status;

        // --- Geometry ---
        case "wire_size":
            return (geometry as any).wireDiameter || (geometry as any).wireThickness || (geometry as any).stripThickness || (geometry as any).thickness;

        case "outer_diameter":
            if ("outerDiameter" in geometry) return geometry.outerDiameter;
            if ("od" in geometry) return geometry.od;
            if ("largeOuterDiameter" in geometry) return geometry.largeOuterDiameter;
            return (geometry as any).meanDiameter + ((geometry as any).wireDiameter || 0);

        case "free_length":
            return (geometry as any).freeLength || (geometry as any).freeHeight_Hf || (geometry as any).freeConeHeight || (geometry as any).bodyLength || 0;

        case "solid_height":
            return analysisResult.solidHeight || (geometry as any).solidHeight || 0;

        // --- Stability ---
        case "slenderness":
            const L0 = extractSemanticValue(variant, "free_length");
            const Dm = (geometry as any).meanDiameter || ((geometry as any).outerDiameter - (geometry as any).wireDiameter) || 20;
            return L0 / Dm;

        default:
            return null;
    }
}
