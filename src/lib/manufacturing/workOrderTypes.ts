import type { SpringType } from "@/lib/springTypes";
import type {
    SpringGeometry,
    MaterialInfo,
    AnalysisResult
} from "@/lib/stores/springDesignStore";
import type { SpringAuditResult, DeliverabilityAudit } from "@/lib/audit/types";
import type { EngineeringRequirements } from "@/lib/audit/engineeringRequirements";

// ============================================================================
// WORK ORDER CORE MODEL
// ============================================================================

export type WorkOrderStatus =
    | "created"
    | "approved"
    | "in-production"
    | "qc"
    | "completed"
    | "blocked";

export type WorkOrderPriority = "normal" | "rush";

export interface WorkOrder {
    workOrderId: string;                 // e.g. WO-2025-00031
    designCode: string;                  // Immutable reference to engineering design
    springType: SpringType;
    quantity: number;
    priority: WorkOrderPriority;

    // Frozen engineering snapshot at WorkOrder creation
    engineeringSnapshot: {
        geometry: SpringGeometry;
        material: MaterialInfo;
        analysis: AnalysisResult;
        audit: SpringAuditResult;
        /** Phase 6 Deliverability: Engineering Requirements */
        engineeringRequirements?: EngineeringRequirements;
        /** Phase 6 Deliverability: Deliverability audit result */
        deliverabilityAudit?: DeliverabilityAudit;
    };

    manufacturingPlan: ManufacturingPlan;
    qcPlan: QCChecklist;
    manufacturingAudit: ManufacturingAudit;

    /** 
     * P2: Deliverability Waiver Mechanism
     * Work orders blocked by Deliverability FAIL may be overridden ONLY via explicit waiver approval.
     * Reports should display "Approved Deviation / Engineering Waiver" when waived.
     */
    deliverabilityWaiver?: {
        /** Who approved the waiver */
        approvedBy: string;
        /** Reason for the waiver */
        reason: string;
        /** Date of approval (ISO format) */
        date: string;
    };

    status: WorkOrderStatus;

    createdAt: string;
    createdBy: string;
    updatedAt: string;

    notes?: string;
}

// ============================================================================
// MANUFACTURING PLAN
// ============================================================================

export type ProcessType =
    | "wire-straightening"
    | "cnc-coiling"
    | "flat-wire-coiling"
    | "stamping"
    | "deburring"
    | "hook-forming"
    | "heat-treatment"
    | "end-closing"
    | "end-grinding"
    | "shot-peening"
    | "scragging"
    | "surface-coating"
    | "load-testing"
    | "final-inspection";

export interface ManufacturingProcess {
    processId: string;
    type: ProcessType;
    sequence: number;
    required: boolean;
    estimatedDuration?: number;  // minutes
    notes?: string;
}

export interface ManufacturingPlan {
    wireSpec: {
        material: string;
        diameter: number;
        standard: string;   // ASTM A228, DIN 17223, etc.
        grade?: string;
    };

    processRoute: ManufacturingProcess[];

    totalEstimatedTime?: number;  // minutes
    machineRequirements?: string[];
}

// ============================================================================
// QC CHECKLIST
// ============================================================================

export interface QCItem {
    itemId: string;
    category: "dimension" | "load" | "appearance" | "process";
    description: string;

    // For dimensional checks
    target?: number;
    tolerance?: string;
    min?: number;
    max?: number;
    unit?: string;

    // For pass/fail checks
    passCriteria?: string;

    required: boolean;
}

export interface QCChecklist {
    dimensions: QCItem[];
    loadTests: QCItem[];
    appearance: QCItem[];
    processVerification: QCItem[];
}

// ============================================================================
// MANUFACTURING AUDIT
// ============================================================================

export type ManufacturingAuditStatus = "PASS" | "WARNING" | "FAIL";

export interface ManufacturingAuditItem {
    required: boolean;
    reason?: string;
    value?: number;
    limit?: number;
    status: ManufacturingAuditStatus;
    notes?: string;
}

export interface ManufacturingAudit {
    endGrinding: ManufacturingAuditItem;
    coilBind: ManufacturingAuditItem;
    buckling: ManufacturingAuditItem;
    heatTreatment: ManufacturingAuditItem;
    shotPeening: ManufacturingAuditItem;
    coating: ManufacturingAuditItem;

    overallStatus: ManufacturingAuditStatus;
    blockingIssues: string[];
}
