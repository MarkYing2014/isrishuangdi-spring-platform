import type { SpringAuditResult, AuditStatus } from "@/lib/audit/types";

export interface NormalizedAudit {
    status: AuditStatus;

    safetyFactor: number;
    stressRatio: number; // %
    fatigueLevel: "HIGH" | "MED" | "LOW";

    clearanceMargin?: number; // mm or deg
    bucklingRatio?: number;

    dominantFailureMode:
    | "STRESS"
    | "FATIGUE"
    | "BUCKLING"
    | "BIND"
    | "ANGLE"
    | "GEOMETRY"
    | "LOADCASE";

    notes: string[];
}

/**
 * Maps type-specific SpringAuditResult into a common schema
 */
export function normalizeAudit(audit: SpringAuditResult): NormalizedAudit {
    const { summary, audits, status, notes } = audit;

    // Map fatigue level
    let fatigueLevel: "HIGH" | "MED" | "LOW" = "LOW";
    if (audits.fatigue?.lifeCategory === "INFINITE" || audits.fatigue?.lifeCategory === "HIGH") {
        fatigueLevel = "HIGH";
    } else if (audits.fatigue?.lifeCategory === "MEDIUM") {
        fatigueLevel = "MED";
    }

    // Determine dominant failure mode
    let dominantMode: NormalizedAudit["dominantFailureMode"] = "STRESS";
    const modeLabel = summary.governingFailureMode.toUpperCase();

    if (modeLabel.includes("FATIGUE")) dominantMode = "FATIGUE";
    else if (modeLabel.includes("BUCKLING") || modeLabel.includes("STABILITY")) dominantMode = "BUCKLING";
    else if (modeLabel.includes("BIND")) dominantMode = "BIND";
    else if (modeLabel.includes("ANGLE")) dominantMode = "ANGLE";
    else if (modeLabel.includes("GEOMETRY") || modeLabel.includes("INDEX")) dominantMode = "GEOMETRY";
    else if (modeLabel.includes("LOAD") || modeLabel.includes("TRAVEL")) dominantMode = "LOADCASE";

    // Buckling ratio if applicable
    const bucklingRatio = audits.stability?.status !== "PASS" ? audits.stability?.margin : undefined;

    return {
        status,
        safetyFactor: summary.safetyFactor,
        stressRatio: summary.criticalRatio,
        fatigueLevel,
        bucklingRatio,
        dominantFailureMode: dominantMode,
        notes: notes || [],
    };
}
