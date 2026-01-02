import { InspectionRequirement, InspectionStrategy, InspectionLevel } from "./inspectionRequirement";

/**
 * Gauge Requirement Resolver
 * Q2: Engineering Decision Pipeline
 */

export function resolveInspectionStrategy(
    deliverabilityAudit: any,
): InspectionStrategy {
    const requirements: InspectionRequirement[] = [];
    let overallLevel: InspectionLevel = "OPTIONAL";
    let calibrationRequired = false;
    let supports3DPrint = true;

    // 1. Check Deliverability Level
    if (deliverabilityAudit.level === "ULTRA_PRECISION") {
        requirements.push({
            id: "REQ-PRECISION",
            category: "Dimensional Control",
            level: "MANDATORY",
            reasonEn: "Ultra-precision (±1.5% load) requires physical GO/NO-GO verification.",
            reasonZh: "超高精度 (±1.5% 负荷) 要求必须进行物理 GO/NO-GO 验证。",
            gaugeTypeRequired: "GO_NOGO"
        });
        overallLevel = "MANDATORY";
        calibrationRequired = true;
        supports3DPrint = false; // Need metal for ultra-precision
    } else if (deliverabilityAudit.level === "CHALLENGING") {
        requirements.push({
            id: "REQ-PRECISION",
            category: "Dimensional Control",
            level: "RECOMMENDED",
            reasonEn: "Tight tolerances suggest gauge verification.",
            reasonZh: "紧公差建议进行检具验证。",
            gaugeTypeRequired: "GO_NOGO"
        });
        overallLevel = "RECOMMENDED";
    }

    // 2. Check for Surface/Corrosion findings
    const hasHighCorrosion = deliverabilityAudit.findings?.some((f: any) =>
        f.messageEn?.toLowerCase().includes("salt spray") &&
        f.messageEn?.toLowerCase().includes("96h")
    );

    if (hasHighCorrosion) {
        requirements.push({
            id: "REQ-SURFACE",
            category: "Surface Quality",
            level: "MANDATORY",
            reasonEn: "High salt spray resistance (96h+) requires certified coating inspection.",
            reasonZh: "高盐雾抗性 (96h+) 要求必须进行认证的涂层检测。",
        });
        if (overallLevel !== "MANDATORY") overallLevel = "MANDATORY";
    }

    return {
        requirements,
        overallLevel,
        calibrationRequired,
        supports3DPrint
    };
}
