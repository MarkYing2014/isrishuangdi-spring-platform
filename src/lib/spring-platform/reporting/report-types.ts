/**
 * OEM Report Types
 * Phase 9: Professional PDF Report Generation
 * 
 * Defines the unified data model for Customer and Engineering reports.
 */

// =============================================================================
// Core Report Types
// =============================================================================

/**
 * Metadata for the report header
 */
export interface ReportMeta {
    /** Project or design name */
    projectName: string;
    /** Spring type (Compression, Arc, Disc, etc.) */
    springType: string;
    /** Spring type in Chinese */
    springTypeZh: string;
    /** Material name */
    material: string;
    /** Material ID for reference */
    materialId: string;
    /** Report generation date (ISO format) */
    date: string;
    /** SHA256 hash of inputs for traceability */
    versionHash: string;
    /** Company name (optional) */
    companyName?: string;
    /** Report language */
    language: "en" | "zh" | "bilingual";
    /** Workflow status (Phase 14.3) */
    workflowStatus?: string;
}

/**
 * A single input parameter for display
 */
export interface ReportParameter {
    /** Parameter key (internal) */
    key: string;
    /** Display label (English) */
    labelEn: string;
    /** Display label (Chinese) */
    labelZh: string;
    /** Numeric or string value */
    value: number | string;
    /** Unit (if applicable) */
    unit?: string;
    /** Category for grouping (geometry, material, etc.) */
    category?: "geometry" | "material" | "working" | "advanced";
}

/**
 * A load case result for the report
 */
export interface ReportLoadCase {
    /** Case identifier (L1, L2, θ1, etc.) */
    id: string;
    /** X-axis value (height, angle, etc.) */
    x: number;
    /** X-axis label (e.g., "Height H (mm)") */
    xLabel: string;
    /** Y-axis value (load, torque, etc.) */
    y: number;
    /** Y-axis label (e.g., "Load P (N)") */
    yLabel: string;
    /** Stress at this point (MPa) */
    stress?: number;
    /** Stage identifier for multi-stage springs */
    stage?: string;
    /** Status of this case */
    status: "ok" | "warning" | "danger" | "invalid";
    /** Status message */
    message?: string;
}

/**
 * Curve data for charts
 */
export interface ReportCurve {
    /** Curve name */
    name: string;
    /** Curve color (hex) */
    color: string;
    /** Data points */
    points: { x: number; y: number }[];
}

/**
 * Review issue for the report
 */
export interface ReportIssue {
    /** Severity level */
    severity: "info" | "warning" | "error";
    /** Issue category */
    category: string;
    /** Issue message (English) */
    messageEn: string;
    /** Issue message (Chinese) */
    messageZh: string;
    /** Suggested fix (English) */
    suggestionEn?: string;
    /** Suggested fix (Chinese) */
    suggestionZh?: string;
}

/**
 * Review summary for the report
 */
export interface ReportReview {
    /** Overall status */
    overallStatus: "PASS" | "MARGINAL" | "FAIL";
    /** Summary text (English) */
    summaryEn: string;
    /** Summary text (Chinese) */
    summaryZh: string;
    /** List of issues */
    issues: ReportIssue[];
}

/**
 * Pareto candidate for optimization reports
 */
export interface ReportParetoCandidate {
    /** Rank in Pareto front */
    rank: number;
    /** Parameter values */
    params: Record<string, number>;
    /** Composite score */
    score: number;
    /** Individual metric scores */
    metrics?: Record<string, number>;
}

/**
 * Pareto optimization results
 */
export interface ReportParetoResults {
    /** Preset name used */
    preset: string;
    /** Total candidates generated */
    totalCandidates: number;
    /** Top candidates on Pareto front */
    candidates: ReportParetoCandidate[];
    /** The chosen/applied candidate */
    chosen?: {
        rank: number;
        reasonEn: string;
        reasonZh: string;
    };
}

/**
 * Evolution entry for the report (Phase 15)
 */
export interface EvolutionReportEntry {
    meta: {
        id: string;
        createdAt: string;
        label?: string;
        comment?: string;
        pinned?: string;
    };
    summary: {
        status: string;
        kpi: Record<string, number | null>;
    };
    insights: { text: string; severity: string }[];
}

// =============================================================================
// Main Report Interface
// =============================================================================

/**
 * Complete Spring Design Report
 * 
 * This is the unified data model that both Customer and Engineering
 * reports are generated from.
 */
export interface SpringDesignReport {
    /** Report metadata */
    meta: ReportMeta;

    /** Input parameters (grouped by category) */
    inputs: ReportParameter[];

    /** Load case results */
    loadCases: ReportLoadCase[];

    /** Curve data for charts */
    curves: {
        /** Primary load-deflection or torque-angle curve */
        primary: ReportCurve;
        /** Secondary curve (unload, comparison, etc.) */
        secondary?: ReportCurve;
        /** X-axis label */
        xAxisLabel: string;
        /** Y-axis label */
        yAxisLabel: string;
    };

    /** Key results summary */
    keyResults: {
        /** Spring rate */
        springRate: { value: number; unit: string };
        /** Maximum stress */
        maxStress?: { value: number; unit: string };
        /** Safety factor */
        safetyFactor?: { value: number };
        /** Total energy */
        energy?: { value: number; unit: string };
    };

    /** Engineering review summary */
    review: ReportReview;

    /** Pareto optimization results (optional) */
    pareto?: ReportParetoResults;

    /** Engineering Assumptions (Phase 14.2) */
    assumptions?: { titleEn: string; titleZh: string; contentEn: string; contentZh: string }[];

    /** Design Evolution (Phase 15) */
    evolution?: {
        pinned: EvolutionReportEntry[];
        baselineId?: string;
        finalId?: string;
    };

    /** Deliverability Assessment (Phase 6) */
    deliverability?: {
        /** Overall deliverability status */
        status: "PASS" | "WARN" | "FAIL";
        /** Business-friendly level */
        level: "STANDARD" | "CHALLENGING" | "HIGH_RISK";
        /** Engineering requirements summary */
        requirements?: {
            tolerances?: { grade: string; loadTolerance?: string };
            assembly?: { guideType: string; clearanceClass?: string };
            surface?: { finish: string; corrosionClass?: string };
            environment?: { tempRange: string; humidity?: string };
            lifespan?: { cycleClass: string; targetCycles?: number };
        };
        /** Deliverability findings */
        findings: Array<{
            severity: "PASS" | "WARN" | "FAIL" | "INFO";
            category: string;
            labelEn: string;
            labelZh: string;
            messageEn: string;
            messageZh: string;
            impact?: string;
        }>;
        /** P3: Supplier Assessment */
        supplierAssessment?: {
            coverage: { full: number; partial: number; total: number };
            matches: Array<{
                supplierName: string;
                matchLevel: "FULL" | "PARTIAL" | "NO_MATCH";
                gaps: Array<{
                    gapId: string;
                    severity: string;
                    requirement: string;
                    capability: string;
                }>;
            }>;
        };
        /** Primary impact drivers */
        primaryImpacts?: string[];
        /** Recommendation */
        recommendation?: string;
        /** P2/P3 Waiver: Approved deviation / engineering waiver */
        waiver?: {
            approvedBy?: string;
            reason?: string;
            date?: string;
            required?: boolean;
            items?: string[];
        };
    };
}

// =============================================================================
// Report Configuration
// =============================================================================

/**
 * Report generation options
 */
export interface ReportOptions {
    /** Report type */
    type: "customer" | "engineering";
    /** Language */
    language: "en" | "zh" | "bilingual";
    /** Company name to display */
    companyName?: string;
    /** Project name */
    projectName?: string;
    /** Include curve chart */
    includeCurve?: boolean;
    /** Include Pareto results (engineering only) */
    includePareto?: boolean;
    /** Include version hash (engineering only) */
    includeVersionHash?: boolean;
}

/**
 * Default report options
 */
export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
    type: "customer",
    language: "bilingual",
    includeCurve: true,
    includePareto: false,
    includeVersionHash: false,
};

/**
 * Default engineering report options
 */
export const DEFAULT_ENGINEERING_OPTIONS: ReportOptions = {
    type: "engineering",
    language: "bilingual",
    includeCurve: true,
    includePareto: true,
    includeVersionHash: true,
};
