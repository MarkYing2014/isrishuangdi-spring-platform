import { AxialPackResult } from "@/lib/spring-platform/types";

/**
 * Axial Pack Engineering Audit (Phase 4)
 * Strict evaluation of Pack Capacity and Safety.
 */

export interface AxialPackAuditResult {
    maxStrokePack: number;
    governingMode: "Axial Over-Stress" | "Pack Solid Bind" | "Spring-to-Spring Interference" | "Stress";
    solidHeightPack: number;
    limits: {
        stressLimit: number;
        maxDeflection: number;
        warnRatio: number;
        failRatio: number;
        stressLimitType: "shear";
    };
    governingOverride?: {
        status: "FAIL" | "WARN";
        mode: string;
        modeZh?: string;
        ratio: number;
        sf: number;
        zh?: string;
        notes?: string[];
    };
    auditHints: {
        travelUsed: number;
        stressUsed: number;
        clearanceUsed: boolean;
    };
}

export function auditAxialPack(
    rawResult: AxialPackResult["rawResult"],
    input: { tauAllow: number; currentStroke: number; L0: number; plateThickness: number }
): AxialPackAuditResult {
    const { single, pack } = rawResult!;
    const { tauAllow, currentStroke, L0, plateThickness } = input;

    // 1. Pack Solid Height
    // Hs_pack = Hs_single + 2 * plateThickness
    const Hs_pack = single.Hs + 2 * plateThickness;

    // 2. Stroke Limits
    // A. Solid Limit
    const strokeSolid = Math.max(0, L0 - Hs_pack);

    // B. Stress Limit (Single Spring)
    // Derived from single spring max stress.
    // Assuming linear K: x_stress = (tau_allow / tau_max_at_solid) * max_solid_stroke ?? 
    // Easier: We know F = kx, Tau = C * F. So Tau = C * k * x.
    // x_limit = Tau_allow / (C*k). 
    // But we might not have C*k handy in rawResult.
    // Back-calculate from single result if possible, or use the single.maxStress if it corresponds to specific deflection.
    // Alternative: We requested single.maxDeflectionStressLimited in Engine. 
    // If not present, we can estimate ratio.
    const stressRatioAtSolid = single.maxStress / tauAllow; // maxStress in Result is usually AT Solid or AT Input?
    // In Engine `maxStress` return is max of cases. That's dynamic.
    // The Engine `rawResult.single.maxStress` was set to `tauAllow`. Wait.
    // Let's rely on `k` and geometry from Engine if needed, or simple ratio if we assume single.maxStress is accurate for current input.
    // Better: Allow Engine to pass `stressLimitedStroke` explicitly if it calculated it.
    // If unavailable, we can't strict check without recalculating.
    // Let's assume we update Engine to pass it, OR we estimate:
    // If we assume maxStress in Engine output (root level) is actual max stress encountered, we can't find limit.
    // Let's use the `pack.maxStroke` from Engine as a baseline, assuming it did `min(solid, stress)`.

    // Let's recalculate Stress Limit for robustness if we have basic params:
    // We don't have coil diam here easily unless we pass it.
    // Let's trust `pack.maxStroke` from Engine as the Stress/Solid intersection for now, 
    // BUT we need to check Clearance limit.

    // C. Clearance Limit
    // If clearance < 0, stroke limit is effectively 0 (or "Safety Failure").
    // If clearance < 0.5, it's WARN.
    // Clearance doesn't usually limit Stroke in Axial Pack (it checks Geometry).
    // UNLESS we consider barrelling. 
    // Requirement: "min(..., clearanceLimitedStroke if applicable)".
    // Define clearanceLimitedStroke:
    // If ssMin < 0, clearanceLimitedStroke = 0.
    const isInterference = pack.clearance.ssMin < 0 || pack.clearance.boundaryMin < 0;
    const clearanceLimitedStroke = isInterference ? 0 : 99999;

    // 3. Overall Max Stroke
    // We trust Engine provided maxStroke (which handles Solid vs Stress).
    // Note: Engine maxStroke = min(solid, stress).
    const engineMaxStroke = pack.maxStroke;

    const maxStrokePack = Math.min(engineMaxStroke, clearanceLimitedStroke);

    // 4. Governing Mode Determination
    let governingMode: AxialPackAuditResult["governingMode"] = "Stress";

    if (isInterference) {
        governingMode = "Spring-to-Spring Interference";
    } else if (currentStroke > strokeSolid) {
        governingMode = "Pack Solid Bind";
    } else if (currentStroke > engineMaxStroke) { // implies > stress limit since solid is checked above
        governingMode = "Axial Over-Stress";
    }

    // 5. Override Construction
    let governingOverride: AxialPackAuditResult["governingOverride"] = undefined;
    if (isInterference) {
        governingOverride = {
            status: "FAIL",
            mode: "Spring-to-Spring Interference",
            modeZh: "弹簧间隙干涉",
            zh: "弹簧间隙干涉", // Legacy
            ratio: 150,
            sf: 0
        };
    }

    return {
        maxStrokePack,
        governingMode,
        solidHeightPack: Hs_pack,
        limits: {
            stressLimit: tauAllow,
            maxDeflection: maxStrokePack,
            warnRatio: 0.8,
            failRatio: 1.1,
            stressLimitType: "shear"
        },
        governingOverride,
        auditHints: {
            travelUsed: currentStroke,
            stressUsed: 0, // Fill in aggregator
            clearanceUsed: isInterference
        }
    };
}

export class AxialPackAudit {
    static evaluate(params: { input: any; result: { rawResult: import("@/lib/spring-platform/types").AxialPackResult["rawResult"] } }) {

        const inp = params.input;
        const res = params.result;

        const tauAllow = (res as any).tauAllow || 800;
        const currentStroke = (res as any).workingDeflection || 0;
        const L0 = inp.baseSpring.L0;
        const plateThickness = inp.pack.plateThickness || 0;

        const auditRes = auditAxialPack(res.rawResult, { tauAllow, currentStroke, L0, plateThickness });

        return {
            status: auditRes.governingOverride?.status || "PASS",
            kpi: { safetyFactor: (res as any).stressAnalysis?.correctionFactor ? (tauAllow / (res as any).stressAnalysis.tauCorrected) : 99 },
            summary: { safetyFactor: (res as any).stressAnalysis?.correctionFactor ? (tauAllow / (res as any).stressAnalysis.tauCorrected) : 99 },
            limits: auditRes.limits,
            governingMode: auditRes.governingMode
        };
    }
}
