/**
 * Unified Comparison System Types
 * Based on Engineering AI Spec v1.0
 */

import { SpringType } from "@/lib/springTypes";

/**
 * Semantic keys for cross-type engineering comparison.
 * Each key represents a physical meaning, not a specific formula.
 */
export type ComparisonKey =
    // --- Stiffness & Load ---
    | "k_work"             // Working stiffness (N/mm or N·mm/deg)
    | "load_min"           // Min working load (N or N·mm)
    | "load_work"          // Max working load (N or N·mm)
    | "initial_tension"    // Initial tension (N) - Extension only

    // --- Stress & Audit ---
    | "stress_max"         // Max calculated stress (MPa)
    | "stress_allowable"   // Calculated allowable stress (MPa)
    | "stress_ratio"       // Stress / Allowable Ratio (%)
    | "safety_factor"      // Static Safety Factor
    | "audit_status"       // PASS / WARN / FAIL

    // --- Geometry & Space ---
    | "wire_size"          // Wire diameter/thickness (mm)
    | "outer_diameter"     // Max outer diameter (mm)
    | "free_length"        // Free height/length (mm)
    | "solid_height"       // Coil bind / Solid height (mm)
    | "weight"             // Estimated weight (g)

    // --- Stability & Advanced ---
    | "slenderness"        // L0/Dm ratio (Stability)
    | "buckling_limit"     // Critical buckling deflection (mm)
    | "fatigue_sf"         // Fatigue safety factor (optional)
    ;

export type ComparisonGroup = "Load" | "Stress" | "Geometry" | "Stability" | "Audit";

export interface ComparisonRowDefinition {
    key: ComparisonKey;
    labelEn: string;
    labelZh: string;
    unit?: string;
    group: ComparisonGroup;
    precision?: number;
    isPositiveImprovement?: boolean; // If higher is better (e.g., SF) or worse (e.g., Stress Ratio)
}

/**
 * Groups of semantic rows for the UI.
 */
export const COMPARISON_ROWS: ComparisonRowDefinition[] = [
    // Audit Group
    { key: "audit_status", labelEn: "Audit Status", labelZh: "审计状态", group: "Audit" },
    { key: "safety_factor", labelEn: "Safety Factor", labelZh: "安全系数", group: "Audit", precision: 2, isPositiveImprovement: true },
    { key: "stress_ratio", labelEn: "Stress Ratio", labelZh: "应力百分比", unit: "%", group: "Audit", precision: 1, isPositiveImprovement: false },

    // Load Group
    { key: "k_work", labelEn: "Stiffness", labelZh: "工作刚度", group: "Load", precision: 3 },
    { key: "load_work", labelEn: "Working Load", labelZh: "工作载荷", group: "Load", precision: 2 },
    { key: "load_min", labelEn: "Min Load", labelZh: "最小载荷", group: "Load", precision: 2 },

    // Stress Group
    { key: "stress_max", labelEn: "Max Stress", labelZh: "最大应力", unit: "MPa", group: "Stress", precision: 0, isPositiveImprovement: false },
    { key: "stress_allowable", labelEn: "Allowable Stress", labelZh: "许用应力", unit: "MPa", group: "Stress", precision: 0 },

    // Geometry Group
    { key: "wire_size", labelEn: "Wire Size", labelZh: "材料尺寸", unit: "mm", group: "Geometry", precision: 3 },
    { key: "outer_diameter", labelEn: "Outer Diameter", labelZh: "最大外径", unit: "mm", group: "Geometry", precision: 2 },
    { key: "free_length", labelEn: "Free Length", labelZh: "自由长度", unit: "mm", group: "Geometry", precision: 2 },
    { key: "solid_height", labelEn: "Solid Height", labelZh: "并紧/极限高度", unit: "mm", group: "Geometry", precision: 1 },

    // Stability Group
    { key: "slenderness", labelEn: "Slenderness", labelZh: "细长比", group: "Stability", precision: 2 },
];
