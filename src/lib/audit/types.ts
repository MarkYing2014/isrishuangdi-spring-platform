// src/lib/audit/types.ts
// Unified Engineering Audit Framework Schema

export type AuditStatus = "PASS" | "WARN" | "FAIL" | "INFO";

export interface GeometryAudit {
    springIndex?: {
        value: number;
        recommended: [number, number];
        status: AuditStatus;
    };

    slenderness?: {
        value: number;
        limit: number;
        status: AuditStatus;
    };

    nestingFeasibility?: {
        value?: number;
        status: AuditStatus;
        noteEn?: string;
        noteZh?: string;
    };

    // Additional generic checks for flexibility
    customChecks?: Array<{
        labelEn: string;
        labelZh: string;
        value: string | number;
        status: AuditStatus;
        notes?: string;
    }>;
}

export interface LoadcaseAudit {
    travel: {
        used: number;
        maxAllowed: number;
        unit: string;
        ratio: number; // percentage 0-100
        status: AuditStatus;
    };

    directionCheck?: {
        expected: "compress" | "extend" | "twist" | "neutral";
        actual: string;
        status: AuditStatus;
    };
}

export interface StressAudit {
    governingMode: string;
    governingModeZh: string;

    maxStress: number;        // MPa
    allowableStress: number;  // MPa

    stressRatio: number;      // percentage 0-100
    safetyFactor: number;
    notes?: string;

    status: AuditStatus;
}

export interface StabilityAudit {
    mode: string;
    modeZh: string;
    margin: number;
    status: AuditStatus;
}

export interface FatigueAudit {
    lifeCategory: "LOW" | "MEDIUM" | "HIGH" | "INFINITE";
    governingPoint: string;
    status: AuditStatus;
}

export interface SpringAuditResult {
    status: AuditStatus;

    summary: {
        governingFailureMode: string;
        governingFailureModeZh: string;
        criticalRatio: number;   // percentage 0-100
        safetyFactor: number;
    };

    audits: {
        geometry: GeometryAudit;
        loadcase: LoadcaseAudit;
        stress: StressAudit;
        stability?: StabilityAudit;
        fatigue?: FatigueAudit;
    };

    notes?: string[];
    degraded?: boolean; // Indicates reliability issues (e.g. missing material limits)
}
