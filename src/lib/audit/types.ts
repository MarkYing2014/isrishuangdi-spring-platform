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

// =============================================================================
// Deliverability Audit (Phase 6 - Engineering Requirements)
// =============================================================================

/**
 * Deliverability level for RFQ/Sales communication
 * Maps from audit status to business language
 */
export type DeliverabilityLevel = "STANDARD" | "CHALLENGING" | "HIGH_RISK";

/**
 * Impact classification for deliverability findings
 * Helps identify cost drivers and risk areas
 */
export type DeliverabilityImpact = "COST" | "LEAD_TIME" | "QUALITY" | "RISK";

/**
 * Recommendation action type (lifecycle hook for future phases)
 */
export type DeliverabilityRecommendation =
    | "DESIGN_CHANGE"      // Engineering should modify design
    | "PROCESS_CONTROL"    // Manufacturing needs special process
    | "SUPPLIER_SELECTION" // Requires specific supplier capability
    | "CUSTOMER_REVIEW";   // Need customer to confirm requirement

/**
 * Finding category for deliverability issues
 */
export type DeliverabilityCategory =
    | "tolerance"
    | "assembly"
    | "surface"
    | "environment"
    | "lifespan";

/**
 * A single deliverability finding
 */
export interface DeliverabilityFinding {
    /** Unique finding ID */
    id: string;
    /** Finding category */
    category: DeliverabilityCategory;
    /** Severity level */
    severity: AuditStatus;
    /** Impact classification (OpenAI enhancement) */
    impact?: DeliverabilityImpact;
    /** English label */
    labelEn: string;
    /** Chinese label */
    labelZh: string;
    /** Detailed English message */
    messageEn: string;
    /** Detailed Chinese message */
    messageZh: string;
    /** Requirement specification that triggered this finding */
    requirement: string;
    /** Current design value (if applicable) */
    designValue?: string;
    /** Recommended action (OpenAI enhancement - lifecycle hook) */
    recommendation?: DeliverabilityRecommendation;
}

/**
 * Complete Deliverability Audit Result
 * 
 * Purpose: Determine if a design can be manufactured, assembled, and delivered reliably.
 * NOT for calculation - purely for deliverability judgment.
 */
export interface DeliverabilityAudit {
    /** Overall deliverability status */
    status: AuditStatus;

    /** Business-friendly level for RFQ/Sales (OpenAI enhancement) */
    level: DeliverabilityLevel;

    /** List of all findings */
    findings: DeliverabilityFinding[];

    /** Summary counts by severity */
    summary: {
        passCount: number;
        warnCount: number;
        failCount: number;
        /** Primary impact drivers for this design */
        primaryImpacts: DeliverabilityImpact[];
    };

    /**
     * P3: Supplier Capability Assessment
     */
    supplierCoverage: {
        full: number;
        partial: number;
        total: number;
    };

    /** P3: List of individual supplier matches */
    supplierMatches: any[];

    /** P3: Waiver flags */
    waiverRequired: boolean;
    waiverItems: string[]; // gapId[]

    /** Overall recommendation for engineering action (OpenAI enhancement) */
    overallRecommendation?: DeliverabilityRecommendation;
}

// =============================================================================
// Main Audit Result
// =============================================================================

export interface SpringAuditResult {
    /**
     * Overall status - worst of safety and deliverability
     * For backwards compatibility, use safetyStatus for safety-critical UI decisions
     */
    status: AuditStatus;

    /**
     * P0 Dual-Track Status Separation:
     * - safetyStatus: Based ONLY on Stress/Loadcase/Geometry/Stability/Fatigue
     * - deliverabilityStatus: Based ONLY on manufacturing/tolerance/assembly/surface/environment/lifespan
     * 
     * IMPORTANT: Deliverability FAIL does not imply unsafe physics.
     * If safetyStatus = PASS and deliverabilityStatus = FAIL, the design is "Designable but not Deliverable"
     */
    safetyStatus: AuditStatus;
    deliverabilityStatus: AuditStatus;

    summary: {
        /**
         * Governing failure mode for SAFETY only (never Deliverability)
         */
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
        /** Deliverability audit (Phase 6 - Engineering Requirements) */
        deliverability?: DeliverabilityAudit;
    };

    notes?: string[];
    degraded?: boolean; // Indicates reliability issues (e.g. missing material limits)
}

