/**
 * Die Spring Standard Library - Barrel Export
 * 模具弹簧标准库 - 统一导出
 * 
 * This module exports both:
 * 1. NEW: Catalog-based OEM system (DieSpringSpec, auditDieSpring, etc.)
 * 2. LEGACY: Original calculator functions for backward compatibility
 * 
 * @module dieSpring
 */

// =============================================================================
// NEW CATALOG-BASED SYSTEM
// =============================================================================

// Types (new OEM types)
export * from "./types";

// Catalog (ISO 10243 / Raymond data)
export * from "./catalog";

// Engineering Math (catalog-based calculations)
export * from "./math";

// Factory Audit (OEM rules)
export * from "./audit";

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// These exports maintain compatibility with existing DieSpringCalculator.
// New code should prefer the catalog-based system above.
// =============================================================================

// Risk model (original duty-based risk calculation)
// NOTE: Export DieSpringDuty from riskModel for legacy LD/MD/HD/XHD format
export {
    computeDieSpringRisk,
    getRiskEmissive,
    lbPerInToNPerMm,
    MAX_DEFLECTION_RATIO_BY_DUTY,
    DUTY_COLORS,
    DUTY_LABELS,
    type DieSpringDuty,  // Legacy: "LD" | "MD" | "HD" | "XHD"
    type DieSpringRiskStatus,
    type DieSpringRiskResult,
} from "./riskModel";

// Temperature load loss
export {
    getTemperatureLoadLoss,
    calculateDeratedLoad,
} from "./temperatureLoadLoss";

// =============================================================================
// SHIM: Legacy calculateDieSpring function
// This is a compatibility wrapper. New code should use computeDieSpringLoad.
// =============================================================================

import type { DieSpringMaterialType } from "./types";
import { DIE_SPRING_MATERIALS } from "./types";
import { getTemperatureLoadLoss } from "./temperatureLoadLoss";

/**
 * @deprecated Use catalog-based system with computeDieSpringLoad instead.
 * This function is maintained for backward compatibility with existing calculators.
 */
export interface LegacyDieSpringInput {
    geometry: {
        od_mm: number;
        freeLength_mm: number;
        workingLength_mm: number;
        coils: number;
        wire_b_mm: number;
        wire_t_mm: number;
        endStyle?: "open" | "closed" | "closed_ground";
        endGrindTurns?: number;
    };
    material: DieSpringMaterialType;
    operating?: {
        temperature_C?: number;
        holeDiameter_mm?: number;
        rodDiameter_mm?: number;
    };
}

export type DieSpringInput = LegacyDieSpringInput;

/**
 * @deprecated Use catalog-based system with computeDieSpringLoad instead.
 */
export interface LegacyDieSpringResult {
    ok: boolean;
    errors: string[];
    warnings: string[];
    travel_mm: number;
    springRate_Nmm: number;
    loadAtWorking_N: number;
    meanDiameter_mm: number;
    springIndex: number;
    equivalentWireDiameter_mm: number;
    stress_MPa: number;
    stressRatio: number;
    compressionRatio: number;
    slendernessRatio: number;
    tempLoadLossPct?: number;
    deratedLoad_N?: number;
    activeCoils: number;
    solidHeight_mm: number;
}

/**
 * @deprecated Use catalog-based system with computeDieSpringLoad instead.
 * Legacy die spring calculation function for backward compatibility.
 */
export function calculateDieSpring(input: LegacyDieSpringInput): LegacyDieSpringResult {
    const { geometry, material, operating } = input;
    const {
        od_mm,
        freeLength_mm,
        workingLength_mm,
        coils,
        wire_b_mm,
        wire_t_mm,
        endStyle = "closed_ground",
    } = geometry;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate inputs
    if (od_mm <= 0) errors.push("Outer diameter must be positive");
    if (freeLength_mm <= 0) errors.push("Free length must be positive");
    if (workingLength_mm <= 0) errors.push("Working length must be positive");
    if (coils <= 0) errors.push("Coils must be positive");
    if (wire_b_mm <= 0) errors.push("Wire width must be positive");
    if (wire_t_mm <= 0) errors.push("Wire thickness must be positive");

    if (errors.length > 0) {
        return {
            ok: false,
            errors,
            warnings,
            travel_mm: 0,
            springRate_Nmm: 0,
            loadAtWorking_N: 0,
            meanDiameter_mm: 0,
            springIndex: 0,
            equivalentWireDiameter_mm: 0,
            stress_MPa: 0,
            stressRatio: 0,
            compressionRatio: 0,
            slendernessRatio: 0,
            activeCoils: 0,
            solidHeight_mm: 0,
        };
    }

    // Calculations
    const meanDiameter_mm = od_mm - wire_t_mm;
    const equivalentWireDiameter_mm = Math.sqrt(wire_b_mm * wire_t_mm);
    const springIndex = meanDiameter_mm / equivalentWireDiameter_mm;

    // Active coils based on end style
    let activeCoils = coils;
    if (endStyle === "closed" || endStyle === "closed_ground") {
        activeCoils = Math.max(1, coils - 2);
    }

    // Solid height (all coils compressed)
    const solidHeight_mm = coils * wire_t_mm;

    // Travel and compression
    const travel_mm = freeLength_mm - workingLength_mm;
    const compressionRatio = travel_mm / freeLength_mm;

    // Spring rate using rectangular wire formula
    // k = (G * b * t³) / (5.58 * Na * Dm³)
    const G = DIE_SPRING_MATERIALS[material]?.shearModulus_MPa ?? 79000;
    const springRate_Nmm = (G * wire_b_mm * Math.pow(wire_t_mm, 3)) /
        (5.58 * activeCoils * Math.pow(meanDiameter_mm, 3));

    // Load at working length
    const loadAtWorking_N = springRate_Nmm * travel_mm;

    // Stress calculation (torsional stress in rectangular wire)
    // τ = (K * 16 * F * Dm) / (π * b * t²)  where K is stress correction factor
    const K_stress = 1 + 0.5 / springIndex; // Simplified correction
    const stress_MPa = (K_stress * 16 * loadAtWorking_N * meanDiameter_mm) /
        (Math.PI * wire_b_mm * Math.pow(wire_t_mm, 2));

    // Stress ratio
    const yieldStrength = DIE_SPRING_MATERIALS[material]?.yieldStrength_MPa ?? 1400;
    const stressRatio = stress_MPa / yieldStrength;

    // Slenderness ratio
    const slendernessRatio = freeLength_mm / meanDiameter_mm;

    // Temperature effects
    let tempLoadLossPct: number | undefined;
    let deratedLoad_N: number | undefined;
    if (operating?.temperature_C) {
        tempLoadLossPct = getTemperatureLoadLoss(material, operating.temperature_C);
        deratedLoad_N = loadAtWorking_N * (1 - tempLoadLossPct / 100);
    }

    // Warnings
    if (stressRatio > 0.7) warnings.push("High stress ratio - reduced fatigue life");
    if (compressionRatio > 0.4) warnings.push("High compression ratio - check solid height");
    if (slendernessRatio > 4) warnings.push("Slender spring - buckling risk, use guidance");
    if (workingLength_mm <= solidHeight_mm) warnings.push("Working length at or below solid height");

    return {
        ok: true,
        errors,
        warnings,
        travel_mm,
        springRate_Nmm,
        loadAtWorking_N,
        meanDiameter_mm,
        springIndex,
        equivalentWireDiameter_mm,
        stress_MPa,
        stressRatio,
        compressionRatio,
        slendernessRatio,
        tempLoadLossPct,
        deratedLoad_N,
        activeCoils,
        solidHeight_mm,
    };
}
