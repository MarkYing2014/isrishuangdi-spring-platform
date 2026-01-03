/**
 * PPAP Module Types
 * Production Part Approval Process
 * 
 * Status Flow: DRAFT → READY → SUBMITTED → APPROVED
 */

// ============ Checklist Item Keys (strict union for type safety) ============
export type PpapChecklistKey =
    | "designRecord"
    | "engineeringApproval"
    | "controlPlan"
    | "pfmea"
    | "msa"
    | "materialCert"
    | "dimensionalResults"
    | "performanceTest"
    | "qualifiedLabDoc"
    | "aar"
    | "sampleProducts"
    | "masterSample"
    | "checkingAids"
    | "customerSpecificReqs"
    | "psw";

// Required for PSW generation
export const PSW_REQUIRED_ITEMS: PpapChecklistKey[] = [
    "designRecord",
    "engineeringApproval",
    "controlPlan",
    "msa",
    "materialCert",
    "dimensionalResults",
];

// ============ PPAP Status ============
export type PpapStatus = "DRAFT" | "READY" | "SUBMITTED" | "APPROVED";

// ============ Checklist Item Status ============
export type ChecklistItemStatus = "NOT_STARTED" | "IN_PROGRESS" | "READY" | "NA";

// ============ Source Types ============
export type SourceType = "design" | "engineering" | "gauge" | "material" | "process" | "external";

// ============ Core Interfaces ============
export interface PpapChecklistItem {
    key: PpapChecklistKey;
    label: string;
    labelZh: string;
    required: boolean;
    status: ChecklistItemStatus;
    sourceType?: SourceType;
    sourceId?: string;
    sourceUrl?: string;
    notes?: string;
    updatedAt?: string;
}

export interface PpapPackage {
    id: string;
    partNo: string;
    partRev: string;
    partName: string;
    program: string;
    customer: string;
    submissionLevel: 1 | 2 | 3 | 4 | 5;
    status: PpapStatus;
    checklist: PpapChecklistItem[];
    pswId?: string;
    // Snapshot & locking
    locked: boolean;
    submittedAt?: string;
    snapshotId?: string;
    createdAt: string;
    updatedAt: string;
}

// ============ Submission Snapshot ============
// Immutable record of checklist state at submission time
export interface PpapSnapshot {
    id: string;
    ppapId: string;
    createdAt: string;
    // Frozen checklist state
    checklist: PpapChecklistItem[];
    // Digest for integrity verification
    checklistDigest: string;
    // Submission metadata
    submissionLevel: number;
    pswId?: string;
    submittedBy?: string;
}

export interface PpapPackageCreateInput {
    partNo: string;
    partRev: string;
    partName: string;
    program: string;
    customer: string;
    submissionLevel?: 1 | 2 | 3 | 4 | 5;
}

// ============ PSW Document ============
export type PswStatus = "DRAFT" | "PENDING_SIGNATURE" | "SIGNED" | "REJECTED";

export interface PswFields {
    // Part Information
    partNumber: string;
    partName: string;
    partRevision: string;
    drawingNumber?: string;
    drawingDate?: string;

    // Organization
    supplierName: string;
    supplierCode?: string;
    supplierAddress?: string;

    // Customer
    customerName: string;
    customerBuyerCode?: string;
    programName?: string;

    // Submission
    submissionLevel: number;
    submissionReason: string;

    // Engineering
    ecLevel?: string;
    ecDate?: string;

    // Weight
    partWeight?: number;
    partWeightUnit?: "kg" | "lb";

    // Mold/Tool
    moldCavityDie?: string;

    // Declarations
    materialsDeclaration: boolean;
    restrictedSubstances: boolean;
    customerSpecificReqs: boolean;

    // Results
    dimensionalMeetsSpec: boolean;
    materialMeetsSpec: boolean;
    appearanceMeetsSpec: boolean;
    statisticalMeetsSpec: boolean;

    // Signatures (stub for now)
    authorizedSignature?: string;
    signatureDate?: string;
    printName?: string;
    printTitle?: string;
    phone?: string;
    email?: string;
}

export interface PswDocument {
    id: string;
    ppapId: string;
    status: PswStatus;
    fields: PswFields;
    generatedAt: string;
    pdfUrl?: string;
}

// ============ Readiness Check Result ============
export interface PpapReadinessResult {
    percent: number;
    total: number;
    ready: number;
    missing: PpapChecklistKey[];
    blockedReasons: string[];
    pswBlocked: boolean;
}

// ============ API Response Types ============
export interface PpapApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        blockedReasons?: string[];
    };
}
