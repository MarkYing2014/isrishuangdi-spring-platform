
import { PlatformSpringType } from "@/lib/spring-platform/types";

export type ReviewVerdict = "PASS" | "CONDITIONAL" | "FAIL";

export interface SupplierMatchRecord {
    supplierId: string;
    matchLevel: "FULL" | "PARTIAL";
    waiverRequired: boolean;
    waiverItems: string[]; // gapId[]
}

export interface DeliverabilitySummary {
    status: "PASS" | "WARN" | "FAIL";
    level: string;
    supplierMatches: SupplierMatchRecord[];
    waiverRequired: boolean;
    waiverItems: string[];
}

export interface EngineeringSummary {
    springType: PlatformSpringType | "conical" | "compression"; // Extended for legacy support
    material: string;
    designVersion: string; // e.g. "ARC-2024-..."
    designHash: string;

    // Core Engineering Data
    parameters: Record<string, any>; // Flexible geometry params
    performance: {
        maxLoad: number; // N or Nm
        maxStressMPa: number;
        allowableStressMPa: number;
        utilization: number; // % (Stress / Allowable)
        fatigueStatus: "infinite" | "high_cycle" | "low_cycle" | "unknown";
        lifeCycles?: number;
    };

    // Arc Spring Specific
    packGroups?: {
        name?: string;
        count: number;
        kStages: number[];
        phiBreaksDeg?: number[];
    }[];

    // Review
    reviewVerdict: ReviewVerdict;
    reviewIssues: string[]; // High level risks

    // P3: Deliverability & Suppliers
    deliverability?: DeliverabilitySummary;
}

export interface RFQManufacturingInputs {
    annualVolume: string;
    prototypeQty?: string;
    sopDate: string;
    productionRegion: string;

    heatTreatment?: "auto" | "specify";
    surfaceTreatment?: "none" | "shot_peen" | "phosphate" | "custom";
    qualityStandard?: "iatf16949" | "iso9001" | "other";

    notes?: string;
}

export interface RFQContactInfo {
    company: string;
    contactPerson: string;
    email: string;
    phone: string;
    country: string;
    projectContext: "new_program" | "match_make" | "cost_down" | "validation";
}

export interface RFQState {
    status: "DRAFT" | "CONFIRMED" | "SUBMITTED" | "REVIEW" | "QUOTED";
    isConfirmed: boolean;
    confirmedBy?: string;
    confirmedAt?: string;
}

export interface RFQPackage {
    id: string;
    timestamp: string;
    status: RFQState["status"];
    summary: EngineeringSummary;
    manufacturingInputs: RFQManufacturingInputs;
    contactInfo: RFQContactInfo;
    attachments: Array<{ name: string; url: string }>;
}
