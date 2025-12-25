import type { SpringType } from "@/lib/springTypes";
import type { SpringGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import type { SpringAuditResult } from "@/lib/audit/types";
import type { ManufacturingAudit, ManufacturingAuditItem } from "./workOrderTypes";

/**
 * Manufacturing Audit Evaluator
 * Extends engineering audit with manufacturing feasibility checks
 */
export class ManufacturingAuditEngine {
    /**
     * Evaluate manufacturing feasibility
     */
    static evaluate(
        springType: SpringType,
        geometry: SpringGeometry,
        material: MaterialInfo,
        analysis: AnalysisResult,
        engineeringAudit: SpringAuditResult
    ): ManufacturingAudit {
        const endGrinding = this.evaluateEndGrinding(springType, geometry);
        const coilBind = this.evaluateCoilBind(springType, geometry, analysis);
        const buckling = this.evaluateBuckling(springType, geometry, analysis);
        const heatTreatment = this.evaluateHeatTreatment(material);
        const shotPeening = this.evaluateShotPeening(analysis, material);
        const coating = this.evaluateCoating(material, springType);

        // Determine overall status
        const allItems = [endGrinding, coilBind, buckling, heatTreatment, shotPeening, coating];
        const hasFail = allItems.some(item => item.status === "FAIL");
        const hasWarning = allItems.some(item => item.status === "WARNING");

        const overallStatus = hasFail ? "FAIL" : hasWarning ? "WARNING" : "PASS";

        // Collect blocking issues
        const blockingIssues: string[] = [];
        if (endGrinding.status === "FAIL") blockingIssues.push(endGrinding.reason || "End grinding issue");
        if (coilBind.status === "FAIL") blockingIssues.push(coilBind.reason || "Coil bind risk");
        if (buckling.status === "FAIL") blockingIssues.push(buckling.reason || "Buckling risk");

        return {
            endGrinding,
            coilBind,
            buckling,
            heatTreatment,
            shotPeening,
            coating,
            overallStatus,
            blockingIssues,
        };
    }

    /**
     * Evaluate end grinding feasibility
     */
    private static evaluateEndGrinding(springType: SpringType, geometry: SpringGeometry): ManufacturingAuditItem {
        if (springType !== "compression" && springType !== "conical") {
            return {
                required: false,
                status: "PASS",
                notes: "End grinding not applicable for this spring type",
            };
        }

        const requiresGrinding = ('topGround' in geometry && 'bottomGround' in geometry) &&
            (geometry.topGround && geometry.bottomGround);

        if (!requiresGrinding) {
            return {
                required: false,
                status: "PASS",
            };
        }

        // Check if wire diameter is suitable for grinding
        const wireDiameter = 'wireDiameter' in geometry ? geometry.wireDiameter : 0;
        if (wireDiameter < 0.5) {
            return {
                required: true,
                reason: "Wire diameter too small for reliable end grinding",
                value: wireDiameter,
                limit: 0.5,
                status: "FAIL",
            };
        }

        return {
            required: true,
            status: "PASS",
            notes: "End grinding feasible",
        };
    }

    /**
     * Evaluate coil bind risk
     */
    private static evaluateCoilBind(
        springType: SpringType,
        geometry: SpringGeometry,
        analysis: AnalysisResult
    ): ManufacturingAuditItem {
        if (springType !== "compression" && springType !== "conical") {
            return {
                required: false,
                status: "PASS",
                notes: "Coil bind check not applicable",
            };
        }

        // Calculate coil bind margin
        const solidHeight = analysis.solidHeight || 0;
        const freeLength = ('freeLength' in geometry) ? geometry.freeLength || 0 : 0;
        const maxDeflection = analysis.maxDeflection || 0;

        if (solidHeight === 0 || freeLength === 0) {
            return {
                required: true,
                status: "WARNING",
                reason: "Insufficient data to evaluate coil bind",
            };
        }

        const bindMargin = freeLength - solidHeight - maxDeflection;

        if (bindMargin < 1.0) {
            return {
                required: true,
                reason: "Insufficient coil bind margin",
                value: bindMargin,
                limit: 1.0,
                status: "FAIL",
            };
        } else if (bindMargin < 3.0) {
            return {
                required: true,
                reason: "Marginal coil bind clearance",
                value: bindMargin,
                limit: 3.0,
                status: "WARNING",
            };
        }

        return {
            required: true,
            value: bindMargin,
            status: "PASS",
            notes: `Bind margin: ${bindMargin.toFixed(2)}mm`,
        };
    }

    /**
     * Evaluate buckling risk
     */
    private static evaluateBuckling(
        springType: SpringType,
        geometry: SpringGeometry,
        analysis: AnalysisResult
    ): ManufacturingAuditItem {
        if (springType !== "compression") {
            return {
                required: false,
                status: "PASS",
                notes: "Buckling check not applicable",
            };
        }

        // Slenderness ratio check
        const freeLength = ('freeLength' in geometry) ? geometry.freeLength || 0 : 0;
        const meanDiameter = ('meanDiameter' in geometry) ? geometry.meanDiameter : 0;

        if (freeLength === 0 || !meanDiameter || meanDiameter === 0) {
            return {
                required: true,
                status: "WARNING",
                reason: "Insufficient data for buckling analysis",
            };
        }

        const slendernessRatio = freeLength / meanDiameter;

        if (slendernessRatio > 5.0) {
            return {
                required: true,
                reason: "High buckling risk - requires guided operation",
                value: slendernessRatio,
                limit: 5.0,
                status: "WARNING",
                notes: "Consider using guide rod or tube",
            };
        } else if (slendernessRatio > 4.0) {
            return {
                required: true,
                value: slendernessRatio,
                limit: 4.0,
                status: "WARNING",
                notes: "Moderate buckling risk",
            };
        }

        return {
            required: true,
            value: slendernessRatio,
            status: "PASS",
            notes: `Slenderness ratio: ${slendernessRatio.toFixed(2)}`,
        };
    }

    /**
     * Evaluate heat treatment requirement
     */
    private static evaluateHeatTreatment(material: MaterialInfo): ManufacturingAuditItem {
        const materialId = material.id.toUpperCase();
        const requiresHT = materialId.includes("CRSI") ||
            materialId.includes("CRV") ||
            materialId.includes("MUSIC") ||
            materialId.includes("PIANO");

        if (requiresHT) {
            return {
                required: true,
                status: "PASS",
                notes: "Heat treatment required for this material",
            };
        }

        return {
            required: false,
            status: "PASS",
            notes: "Heat treatment not required",
        };
    }

    /**
     * Evaluate shot peening requirement
     */
    private static evaluateShotPeening(analysis: AnalysisResult, material: MaterialInfo): ManufacturingAuditItem {
        const maxStress = analysis.maxStress || analysis.shearStress || 0;
        const tensileStrength = material.tensileStrength || 2000;
        const stressRatio = (maxStress / tensileStrength) * 100;

        if (stressRatio > 50) {
            return {
                required: true,
                value: stressRatio,
                limit: 50,
                status: "PASS",
                notes: "Shot peening required for high stress application",
            };
        }

        return {
            required: false,
            status: "PASS",
            notes: "Shot peening optional",
        };
    }

    /**
     * Evaluate coating requirement
     */
    private static evaluateCoating(material: MaterialInfo, springType: SpringType): ManufacturingAuditItem {
        // Stainless steel doesn't need coating
        if (material.id.includes("SUS") || material.id.includes("304")) {
            return {
                required: false,
                status: "PASS",
                notes: "Stainless steel - coating not required",
            };
        }

        // Die springs and suspension springs typically need coating
        if (springType === "dieSpring" || springType === "suspensionSpring") {
            return {
                required: true,
                status: "PASS",
                notes: "Protective coating recommended",
            };
        }

        return {
            required: false,
            status: "PASS",
            notes: "Coating optional",
        };
    }
}
