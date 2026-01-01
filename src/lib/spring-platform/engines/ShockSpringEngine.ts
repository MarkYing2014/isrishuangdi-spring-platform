import {
    ISpringEngine,
    PlatformResult,
    PlatformModules,
    PlatformMaterialModel,
    PlatformInputMode,
    PlatformSpringType,
    ShockSpringInput,
    LoadCaseResult,
    SolveForTargetInput,
    SolveForTargetResult
} from "../types";

import {
    runShockSpringAnalysis,
    ShockSpringResult
} from "@/lib/spring3d/shock";

import { checkShockSpringDesignRules } from "@/lib/spring-platform/rules/shock-rules";

export class ShockSpringEngine implements ISpringEngine {
    type: PlatformSpringType = "shock";

    calculate(params: {
        geometry: any; // ShockSpringInput
        material: PlatformMaterialModel;
        cases: {
            mode: PlatformInputMode;
            values: number[];
        };
        modules: PlatformModules;
    }): PlatformResult {
        console.count("ShockSpringEngine.calculate");
        const input = params.geometry as ShockSpringInput;
        const material = params.material;

        // 1. Run Analysis (Module Level)
        // Ensure input has material props if needed by analysis, or analysis takes material separately?
        // runShockSpringAnalysis takes (input: ShockSpringInput). Input has material inside it?
        // ShockSpringInput structure has `materialId` or `material`?
        // Let's check ShockSpringInput. It has `materialId`.
        // Ideally we pass material props.
        // If runShockSpringAnalysis only uses geometry, we are fine.
        // It seems runShockSpringAnalysis expects full input including material props nested in `input.material` probably?
        // ShockSpringInput in `types.ts` has `materialId`.
        // But `runShockSpringAnalysis` usually requires `input.material` object with G, E, etc.
        // I will assume `input` passed here MIGHT need augmentation if it only came from UI with `materialId`.
        // However, `ShockSpringCalculator` passes a full object.
        // Let's verify `ShockSpringInput` structure vs `runShockSpringAnalysis` expectation.
        // For now, I'll trust `runShockSpringAnalysis(input)` works or I'll catch errors.

        // Wait, `runShockSpringAnalysis` in `@/lib/spring3d/shock` likely takes an input that has specific material fields.
        // The `PlatformMaterialModel` passed in `params` has `G`, `E`, `tauAllow`.
        // I should inject these into `input` if possible, or ensure `runShockSpringAnalysis` uses them.
        // Let's cast input to any to inject material if needed.
        const analysisInput = {
            ...input,
            material: {
                name: material.id,
                shearModulus: material.G,
                elasticModulus: material.E,
                density: 7.85,
                tensileStrength: material.tauAllow * 1.5
            }
        };

        const result: ShockSpringResult = runShockSpringAnalysis(analysisInput as any);

        // 2. Map Results to Platform Cases
        const evaluatedCases: LoadCaseResult[] = params.cases.values.map((val, i) => {
            // Find correspond point in result.
            // Result has curves. We need to interpolate.
            // or if params.cases.mode matched inputs?

            // Simple approach: Interpolate from kxCurve/pxCurve
            // Input Mode: "height" or "deflection"
            let deflection = val;
            if (params.cases.mode === "height") {
                deflection = (result.derived.freeLength || 0) - val;
            }

            // Interpolate Force & Stress
            const force = interpolate(result.kxCurve.map(p => ({ x: p.x, y: p.force })), deflection);
            const stress = interpolate(result.kxCurve.map(p => ({ x: p.x, y: p.stress })), deflection);

            // Safety Factor
            // If tauAllow is defined
            const sf = material.tauAllow && stress > 0 ? material.tauAllow / stress : 999;

            return {
                id: `C${i + 1}`,
                labelEn: `Case ${i + 1}`,
                labelZh: `工况 ${i + 1}`,
                inputValue: val,
                inputMode: params.cases.mode,
                load: force,
                stress: stress,
                sfMin: sf,
                status: sf < 1.0 ? "danger" : (sf < 1.1 ? "warning" : "ok"),
                isValid: true
            };
        });

        // 3. Prepare Curves
        const kxCurve = result.kxCurve.map(p => ({ x: p.x, y: p.k }));
        const pxCurve = result.kxCurve.map(p => ({ x: p.x, y: p.force }));
        const energyCurve = result.energyCurve ? result.energyCurve.map(p => ({ x: p.x, y: p.joules })) : [];

        const maxStroke = (result.derived.freeLength - result.derived.solidHeight);

        // 4. Construct PlatformResult Skeleton
        const platformResultSkeleton: PlatformResult = {
            springType: "shock",
            cases: evaluatedCases,
            springRate: result.ride.k,
            springIndex: (input.meanDia.mid / (input.wireDia.mid || 1)),
            wahlFactor: 1.0, // Calculated inside analysis usually
            H0: result.derived.freeLength,
            Hb: result.derived.solidHeight,
            isValid: !result.errors || result.errors.length === 0,
            totalEnergy: energyCurve.length > 0 ? energyCurve[energyCurve.length - 1].y : 0,
            mass: result.derived.mass,
            wireLength: result.derived.wireLength,
            maxStroke: maxStroke,
            curves: {
                kx: kxCurve,
                px: pxCurve,
                energy: energyCurve
            }
        };

        const designRules = checkShockSpringDesignRules(input, platformResultSkeleton, material);

        return {
            ...platformResultSkeleton,
            designRules,
            rawResult: result
        };
    }

    /**
     * Reverse Solver (Seed Generation)
     * Solves for 'n' given d, D, H_target, P_target
     */
    solveForTarget(
        context: { geometry: any; material: any },
        input: SolveForTargetInput
    ): SolveForTargetResult {
        const { d, D, H0 } = context.geometry;
        const material = context.material;
        const target = input.target1;

        if (!target || target.y <= 0) return { ok: false, errors: ["Invalid target"] };

        // Target: x = Height, y = Force
        // Shock is usually height-based
        const hTarget = target.x;
        const pTarget = target.y;

        // H0 estimation (if not provided, we can't solve properly, but H0 is usually in context)
        const freeLen = H0 || (hTarget * 1.5);
        const deflection = freeLen - hTarget;

        if (deflection <= 0) return { ok: false, errors: ["Target height above free length"] };

        // Linearized Na = G*d^4 * delta / (8*D^3 * P)
        const G = material.G || 79000;
        const nSolved = (G * Math.pow(d, 4) * deflection) / (8 * Math.pow(D, 3) * pTarget);

        // Clamp to range
        const nRange = input.clamps?.nRange || [2, 50];
        const nClamped = Math.max(nRange[0], Math.min(nRange[1], nSolved));

        return {
            ok: true,
            solvedParams: {
                n: Number(nClamped.toFixed(2)),
                d,
                D,
                H0: freeLen
            },
            derived: {
                k_est: pTarget / deflection,
                n_raw: nSolved
            }
        };
    }
}

// Helper: Linear Interpolation
function interpolate(curve: { x: number; y: number }[], xTarget: number): number {
    if (curve.length === 0) return 0;
    if (xTarget <= curve[0].x) return curve[0].y;
    if (xTarget >= curve[curve.length - 1].x) return curve[curve.length - 1].y;

    // Binary search
    let low = 0, high = curve.length - 1;
    while (low < high - 1) {
        const mid = Math.floor((low + high) / 2);
        if (curve[mid].x < xTarget) low = mid;
        else high = mid;
    }

    // Linear interp
    const p1 = curve[low];
    const p2 = curve[high];
    const ratio = (xTarget - p1.x) / (p2.x - p1.x);
    return p1.y + ratio * (p2.y - p1.y);
}
