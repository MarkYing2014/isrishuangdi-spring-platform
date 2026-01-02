/**
 * Gauge Types
 * Q1: Smart Gauge Generator
 */

export type GaugeType = "GO" | "NO-GO";
export type GaugeCategory = "OD" | "ID" | "LENGTH" | "ARC_ANGLE" | "ARC_RADIUS";
export type InspectionLevel = "OPTIONAL" | "RECOMMENDED" | "MANDATORY";

export interface GaugeSpec {
    id: string;
    type: GaugeType;
    category: GaugeCategory;
    targetValue: number; // The physical dimension of the gauge (mm)
    boundaryValue: number; // The design limit being checked (mm)
    label: string; // Text to be etched on the gauge
    filename: string;
    notesEn: string;
    notesZh: string;
}

export interface InspectionRequirement {
    category: string;
    level: InspectionLevel;
    reasonEn: string;
    reasonZh: string;
}

export interface GaugeStrategy {
    requirements: InspectionRequirement[];
    gauges: GaugeSpec[];
    overallLevel: InspectionLevel;
}

export interface ToleranceMapping {
    grade: string;
    values: {
        diameter: number; // ± mm
        length: number;   // ± mm
        load: number;     // ± %
        arcAngle?: number;  // ± degrees (for arc springs)
        arcRadius?: number; // ± % of nominal (for arc springs)
    };
}
