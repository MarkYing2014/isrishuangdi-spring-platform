import { SupplierCapability } from "./supplierCapability";
import { EngineeringRequirements } from "../audit/engineeringRequirements";

/**
 * Stable Gap IDs for P3
 * These keys are used by UI, Reports, and RFQ for consistent identification.
 */
export const GAP_IDS = {
    WIRE_D_OUT_OF_RANGE: "WIRE_D_OUT_OF_RANGE",
    GEOMETRY_OUT_OF_RANGE: "GEOMETRY_OUT_OF_RANGE",
    TOLERANCE_GRADE_UNSUPPORTED: "TOLERANCE_GRADE_UNSUPPORTED",
    SURFACE_TREATMENT_UNSUPPORTED: "SURFACE_TREATMENT_UNSUPPORTED",
    SALT_SPRAY_EXCEEDS_CAPABILITY: "SALT_SPRAY_EXCEEDS_CAPABILITY",
    CERTIFICATION_MISSING: "CERTIFICATION_MISSING"
} as const;

export type GapId = keyof typeof GAP_IDS;

export interface DesignSummary {
    wireDiameter: number;
    outerDiameter: number;
    freeLength: number;
    springType: string;
}

export interface SupplierMatchResult {
    supplierId: string;
    supplierName: string;
    matchLevel: "FULL" | "PARTIAL" | "NO_MATCH";

    gaps: Array<{
        gapId: GapId;
        category: "geometry" | "tolerance" | "surface" | "environment" | "quality";
        severity: "WARN" | "FAIL";
        requirement: string;
        capability: string;
    }>;
}

/**
 * Supplier Match Engine (P3-2)
 */
export function matchSupplier(
    design: DesignSummary,
    requirements: EngineeringRequirements,
    capability: SupplierCapability
): SupplierMatchResult {
    const gaps: SupplierMatchResult["gaps"] = [];

    // 1. Geometry / Process Capability Check
    const { minWireDiameter, maxWireDiameter, maxOuterDiameter, maxFreeLength } = capability.processCapabilities;

    if (design.wireDiameter < minWireDiameter || design.wireDiameter > maxWireDiameter) {
        gaps.push({
            gapId: "WIRE_D_OUT_OF_RANGE",
            category: "geometry",
            severity: "FAIL",
            requirement: `Wire D: ${design.wireDiameter}mm`,
            capability: `Limit: ${minWireDiameter}-${maxWireDiameter}mm`
        });
    }

    if (maxOuterDiameter && design.outerDiameter > maxOuterDiameter) {
        gaps.push({
            gapId: "GEOMETRY_OUT_OF_RANGE",
            category: "geometry",
            severity: "FAIL",
            requirement: `OD: ${design.outerDiameter}mm`,
            capability: `Max: ${maxOuterDiameter}mm`
        });
    }

    if (maxFreeLength && design.freeLength > maxFreeLength) {
        gaps.push({
            gapId: "GEOMETRY_OUT_OF_RANGE",
            category: "geometry",
            severity: "FAIL",
            requirement: `Length: ${design.freeLength}mm`,
            capability: `Max: ${maxFreeLength}mm`
        });
    }

    // 2. Tolerance Capabilities
    if (requirements.tolerances) {
        const { wireDiameter, coilDiameter, freeLength } = requirements.tolerances;
        const capTols = capability.toleranceCapabilities;

        const checkGrade = (req: string | undefined, cap: string, label: string) => {
            const grades = ["STANDARD", "PRECISION", "ULTRA_PRECISION"];
            const reqIdx = grades.indexOf(req || "STANDARD");
            const capIdx = grades.indexOf(cap);

            if (reqIdx > capIdx) {
                gaps.push({
                    gapId: "TOLERANCE_GRADE_UNSUPPORTED",
                    category: "tolerance",
                    severity: reqIdx - capIdx > 1 ? "FAIL" : "WARN",
                    requirement: `${label}: ${req}`,
                    capability: `Max cap: ${cap}`
                });
            }
        };

        checkGrade(wireDiameter, capTols.wireDiameter, "Wire Tol");
        checkGrade(coilDiameter, capTols.coilDiameter, "Coil Tol");
        checkGrade(freeLength, capTols.freeLength, "Length Tol");
    }

    // 3. Surface / Corrosion Capabilities
    if (requirements.surface?.finish && requirements.surface.finish !== "NONE") {
        if (!capability.surfaceCapabilities.finishes.includes(requirements.surface.finish as any)) {
            gaps.push({
                gapId: "SURFACE_TREATMENT_UNSUPPORTED",
                category: "surface",
                severity: "FAIL",
                requirement: requirements.surface.finish,
                capability: "Not supported"
            });
        }
    }

    if (requirements.surface?.corrosionClass) {
        const saltSprayMap: Record<string, number> = {
            "INDOOR": 0,
            "OUTDOOR": 48,
            "SALT_SPRAY_48H": 48,
            "SALT_SPRAY_96H": 96,
            "SALT_SPRAY_240H": 240
        };
        const capSaltSprayMap: Record<string, number> = {
            "48H": 48,
            "96H": 96,
            "240H": 240
        };
        const reqValue = saltSprayMap[requirements.surface.corrosionClass] || 0;
        const capValue = capSaltSprayMap[capability.surfaceCapabilities.maxSaltSprayClass || "48H"] || 48;

        if (reqValue > capValue) {
            gaps.push({
                gapId: "SALT_SPRAY_EXCEEDS_CAPABILITY",
                category: "surface",
                severity: "FAIL",
                requirement: requirements.surface.corrosionClass,
                capability: `${capValue}H Max`
            });
        }
    }

    // 4. Quality System
    // Example: If certain environment requires IATF
    if (requirements.environment?.operatingTempRange === "EXTREME" || requirements.lifespan?.cycleClass === "INFINITE") {
        if (!capability.qualitySystem.certifications.includes("IATF16949")) {
            gaps.push({
                gapId: "CERTIFICATION_MISSING",
                category: "quality",
                severity: "WARN",
                requirement: "IATF16949 (Special Application)",
                capability: "ISO9001 only"
            });
        }
    }

    // Determine Match Level
    const hasFail = gaps.some(g => g.severity === "FAIL");
    const hasWarn = gaps.some(g => g.severity === "WARN");

    let matchLevel: SupplierMatchResult["matchLevel"] = "FULL";
    if (hasFail) matchLevel = "NO_MATCH";
    else if (hasWarn) matchLevel = "PARTIAL";

    return {
        supplierId: capability.supplierId,
        supplierName: capability.supplierName,
        matchLevel,
        gaps
    };
}
