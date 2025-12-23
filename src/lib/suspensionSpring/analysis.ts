/**
 * Suspension Spring Engineering Analysis
 * 减震器弹簧工程分析模块
 * 
 * Layer 0: Quick analytic check
 * Layer 1: k(x) nonlinear stiffness curve with coil contact detection
 * Layer 3: Fatigue estimation (Goodman/Gerber)
 */

import type { SuspensionSpringInput, SuspensionSpringResult } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface KxPoint {
    /** Deflection (mm) */
    x: number;
    /** Spring rate at this deflection (N/mm) */
    k: number;
    /** Number of effective active coils at this deflection */
    activeCoilsEff: number;
    /** Whether any coil contact has occurred */
    hasContact: boolean;
}

export interface CoilContactInfo {
    /** Deflection at which first contact occurs (mm) */
    onsetDeflection: number;
    /** Approximate coil index where contact starts (0-based) */
    coilIndex: number;
    /** Fraction of total travel at onset */
    onsetFraction: number;
}

export interface FatigueResult {
    /** Analysis method */
    method: "goodman" | "gerber";
    /** Mean stress (MPa) */
    meanStress: number;
    /** Alternating stress (MPa) */
    altStress: number;
    /** Safety factor based on fatigue */
    fatigueSF: number;
    /** Life classification */
    lifeClass: "high" | "mid" | "low" | "fail";
    /** Estimated cycles (rough) */
    estimatedCycles?: number;
}

export interface SuspensionAnalysisResult {
    /** k(x) curve points */
    kxCurve: KxPoint[];
    /** Coil contact detection */
    contactInfo?: CoilContactInfo;
    /** Fatigue assessment based on Ride ↔ Bump cycle */
    fatigue?: FatigueResult;
    /** Summary KPIs */
    summary: {
        kFree: number;       // Initial spring rate
        kBump: number;       // Rate at bump (may be higher due to contact)
        maxStress: number;   // Max shear stress at bump
        sfBump: number;      // Safety factor at bump
        coilBindMargin: number; // mm clearance at bump
        bucklingRatio: number;  // L0 / Dm
    };
}

// ============================================================================
// k(x) Curve Computation
// ============================================================================

/**
 * Compute the k(x) stiffness curve for a suspension spring
 * 
 * This models the nonlinear stiffness that occurs when:
 * 1. Variable pitch causes some coils to contact before others
 * 2. Dead coils don't contribute to deflection
 */
export function computeKxCurve(
    input: SuspensionSpringInput,
    result: SuspensionSpringResult,
    steps: number = 20
): KxPoint[] {
    const {
        geometry: { wireDiameter_mm, activeCoils_Na, freeLength_Hf_mm },
        material: { shearModulus_G_MPa },
    } = input;

    const solidHeight = result.derived.solidHeight_Hs_mm;
    const maxDeflection = freeLength_Hf_mm - solidHeight;
    const meanDiameter = result.derived.meanDiameter_mm;

    // Base spring rate (linear approximation)
    const kBase = result.springRate_N_per_mm;

    const points: KxPoint[] = [];

    for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * maxDeflection;
        const compressedHeight = freeLength_Hf_mm - x;

        // Estimate effective active coils at this deflection
        // As spring compresses, variable pitch means some coils may "close"
        // before others, reducing effective Na

        // Simple model: if pitch at any point < 1.1 * d, that coil is "dead"
        // For uniform pitch, this happens near solid height
        // For variable pitch, end coils close first

        const compressionRatio = x / maxDeflection;

        // Model: Na_eff starts at activeCoils and decreases as we approach solid
        // This is a simplification - real behavior depends on pitch profile
        let naEff = activeCoils_Na;
        let hasContact = false;

        // Crude contact model: after 60% compression, start losing coils
        if (compressionRatio > 0.6) {
            const lostCoils = (compressionRatio - 0.6) / 0.4 * (activeCoils_Na * 0.3);
            naEff = Math.max(activeCoils_Na * 0.7, activeCoils_Na - lostCoils);
            hasContact = true;
        }

        // Adjusted spring rate: k ∝ 1/Na
        // As Na decreases, k increases
        const kAdj = kBase * (activeCoils_Na / naEff);

        points.push({
            x,
            k: kAdj,
            activeCoilsEff: naEff,
            hasContact,
        });
    }

    return points;
}

/**
 * Detect when coil contact first occurs
 */
export function detectCoilContact(
    kxCurve: KxPoint[],
    maxDeflection: number
): CoilContactInfo | undefined {
    const contactPoint = kxCurve.find(p => p.hasContact);
    if (!contactPoint) return undefined;

    return {
        onsetDeflection: contactPoint.x,
        coilIndex: 0, // Simplified - would need pitch profile for accurate detection
        onsetFraction: contactPoint.x / maxDeflection,
    };
}

// ============================================================================
// Fatigue Analysis
// ============================================================================

/**
 * Estimate fatigue life based on Ride ↔ Bump stress cycle
 * Uses Goodman criterion by default
 */
export function estimateFatigue(
    stressRide: number,
    stressBump: number,
    yieldStrength: number,
    tensileStrength?: number,
    method: "goodman" | "gerber" = "goodman"
): FatigueResult {
    // Mean and alternating stress
    const meanStress = (stressRide + stressBump) / 2;
    const altStress = Math.abs(stressBump - stressRide) / 2;

    // Tensile strength estimate if not provided (common for spring steel)
    const Su = tensileStrength ?? yieldStrength * 1.15;

    // Endurance limit estimate (for steel springs, typically 0.4-0.5 Su)
    const Se = Su * 0.45;

    // Fatigue safety factor
    let fatigueSF: number;

    if (method === "goodman") {
        // Goodman: σa/Se + σm/Su = 1/SF
        fatigueSF = 1 / (altStress / Se + meanStress / Su);
    } else {
        // Gerber: (σa/Se) + (σm/Su)² = 1/SF  (more conservative for ductile materials)
        fatigueSF = 1 / (altStress / Se + (meanStress / Su) ** 2);
    }

    // Life classification
    let lifeClass: FatigueResult["lifeClass"];
    let estimatedCycles: number | undefined;

    if (fatigueSF >= 1.5) {
        lifeClass = "high";
        estimatedCycles = 1e7; // Essentially infinite life
    } else if (fatigueSF >= 1.0) {
        lifeClass = "mid";
        estimatedCycles = 1e5;
    } else if (fatigueSF >= 0.7) {
        lifeClass = "low";
        estimatedCycles = 1e4;
    } else {
        lifeClass = "fail";
        estimatedCycles = 1000;
    }

    return {
        method,
        meanStress,
        altStress,
        fatigueSF,
        lifeClass,
        estimatedCycles,
    };
}

// ============================================================================
// Main Analysis Entry Point
// ============================================================================

/**
 * Run complete suspension spring engineering analysis
 */
export function runSuspensionAnalysis(
    input: SuspensionSpringInput,
    result: SuspensionSpringResult
): SuspensionAnalysisResult {
    const {
        geometry: { wireDiameter_mm, freeLength_Hf_mm, activeCoils_Na },
        material: { yieldStrength_MPa },
        loadcase: { solidMargin_mm },
    } = input;

    const Dm = result.derived.meanDiameter_mm;
    const Hs = result.derived.solidHeight_Hs_mm;
    const maxDeflection = freeLength_Hf_mm - Hs;

    // 1. Compute k(x) curve
    const kxCurve = computeKxCurve(input, result);

    // 2. Detect coil contact
    const contactInfo = detectCoilContact(kxCurve, maxDeflection);

    // 3. Fatigue analysis (Ride ↔ Bump)
    const stressRide = result.stress.tauRide_MPa;
    const stressBump = result.stress.tauBump_MPa;
    const fatigue = estimateFatigue(stressRide, stressBump, yieldStrength_MPa);

    // 4. Summary KPIs
    const bumpHeight = result.bumpHeight_mm;
    const coilBindMargin = bumpHeight - Hs;

    const summary = {
        kFree: result.springRate_N_per_mm,
        kBump: kxCurve.length > 0 ? kxCurve[kxCurve.length - 1].k : result.springRate_N_per_mm,
        maxStress: stressBump,
        sfBump: result.stress.yieldSafetyFactor_bump,
        coilBindMargin,
        bucklingRatio: freeLength_Hf_mm / Dm,
    };

    return {
        kxCurve,
        contactInfo,
        fatigue,
        summary,
    };
}
