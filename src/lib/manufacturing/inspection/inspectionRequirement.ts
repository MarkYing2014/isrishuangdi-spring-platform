/**
 * Inspection Requirement Types
 * Q2: Engineering Decision Pipeline
 */

export type InspectionLevel = "OPTIONAL" | "RECOMMENDED" | "MANDATORY";

export interface InspectionRequirement {
    id: string;
    category: string;
    level: InspectionLevel;
    reasonEn: string;
    reasonZh: string;
    gaugeTypeRequired?: "GO_NOGO" | "CUSTOM" | "NONE";
}

export interface InspectionStrategy {
    requirements: InspectionRequirement[];
    overallLevel: InspectionLevel;
    calibrationRequired: boolean;
    supports3DPrint: boolean;
}
