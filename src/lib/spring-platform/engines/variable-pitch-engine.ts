/**
 * Variable Pitch Compression Spring Engine
 * Phase 7: Advanced Spring Type Integration
 * 
 * Engine for variable pitch compression springs with segment-based stiffness.
 */

import type {
    ISpringEngine,
    PlatformResult,
    LoadCaseResult,
    PlatformModules,
    PlatformMaterialModel,
    PlatformInputMode,
    PlatformDesignSummary,
    SolveForTargetInput,
} from "../types";
import { VariablePitchSegment, calculateVariablePitchCompressionAtDeflection } from "@/lib/springMath";

// =============================================================================
// Variable Pitch Spring Parameters
// =============================================================================

export interface VariablePitchParams {
    /** Wire diameter d (mm) */
    d: number;
    /** Mean diameter D (mm) */
    D: number;
    /** Active coils at free length (before any solid) */
    activeCoils0: number;
    /** Total coils including inactive ends */
    totalCoils: number;
    /** Free length L0 (mm) */
    L0: number;
    /** Pitch segments */
    segments: VariablePitchSegment[];
    /** Shear modulus G (MPa) */
    G: number;
}

// =============================================================================
// Variable Pitch Engine Class
// =============================================================================

export class VariablePitchEngine implements ISpringEngine {
    readonly type = "variablePitch" as const;
    readonly displayName = "Variable Pitch Compression / 变节距压缩弹簧";

    // -------------------------------------------------------------------------
    // Calculate
    // -------------------------------------------------------------------------

    calculate(params: {
        geometry: VariablePitchParams;
        material: PlatformMaterialModel;
        cases: {
            mode: PlatformInputMode;
            values: number[];
        };
        modules: PlatformModules;
    }): PlatformResult {
        const geo = params.geometry;
        const mat = params.material;
        const cases = params.cases;
        const inputMode = cases.mode === "height" || cases.mode === "deflection" ? cases.mode : "height";

        const { d, D, activeCoils0, totalCoils, L0, segments } = geo;
        const G = mat.G ?? geo.G ?? 79000;
        const tauAllow = mat.tauAllow ?? 700;

        // Calculate solid height
        const Hb = totalCoils * d;

        // Process load cases
        const loadCases: LoadCaseResult[] = [];
        let totalEnergy = 0;
        let globalSpringRate = 0;

        // Determine input values
        let inputValues: number[] = cases.values ?? [];
        if (inputValues.length === 0) {
            inputValues = inputMode === "height"
                ? [L0 * 0.9, L0 * 0.8, L0 * 0.7]
                : [L0 * 0.1, L0 * 0.2, L0 * 0.3];
        }

        for (let i = 0; i < inputValues.length; i++) {
            let H: number;
            let delta: number;

            if (inputMode === "height") {
                H = inputValues[i];
                delta = L0 - H;
            } else {
                delta = inputValues[i];
                H = L0 - delta;
            }

            const result = calculateVariablePitchCompressionAtDeflection({
                wireDiameter: d,
                meanDiameter: D,
                shearModulus: G,
                activeCoils0,
                totalCoils,
                freeLength: L0,
                segments,
                deflection: delta,
            });

            const load = result.load;
            const stress = result.shearStress;
            const springRate = result.springRate;

            // Remember first valid spring rate as global
            if (i === 0 && springRate > 0) {
                globalSpringRate = springRate;
            }

            // Accumulate energy (trapezoidal approximation)
            if (i > 0) {
                const prevInputVal = inputValues[i - 1];
                const prevDelta = inputMode === "height" ? L0 - prevInputVal : prevInputVal;
                const prevResult = calculateVariablePitchCompressionAtDeflection({
                    wireDiameter: d,
                    meanDiameter: D,
                    shearModulus: G,
                    activeCoils0,
                    totalCoils,
                    freeLength: L0,
                    segments,
                    deflection: prevDelta,
                });
                const avgLoad = (prevResult.load + load) / 2;
                totalEnergy += avgLoad * Math.abs(delta - prevDelta) / 1000; // N·mm to J
            }

            // Determine status
            let status: "ok" | "warning" | "danger" = "ok";
            let statusReason: "none" | "solid" | "stress" = "none";
            let messageEn = "";
            let messageZh = "";

            if (H < Hb) {
                status = "danger";
                statusReason = "solid";
                messageEn = "Below solid height";
                messageZh = "低于压并高度";
            } else if (stress > tauAllow) {
                status = "danger";
                statusReason = "stress";
                messageEn = `Stress ${stress.toFixed(0)} MPa > τ_allow ${tauAllow} MPa`;
                messageZh = `应力 ${stress.toFixed(0)} MPa > 许用 ${tauAllow} MPa`;
            } else if (stress > tauAllow * 0.9) {
                status = "warning";
                statusReason = "stress";
                messageEn = `Stress approaching limit`;
                messageZh = `应力接近极限`;
            }

            loadCases.push({
                id: `L${i + 1}`,
                labelEn: `Point ${i + 1}`,
                labelZh: `点 ${i + 1}`,
                inputValue: inputValues[i],
                inputMode,
                altInputValue: inputMode === "height" ? delta : H,
                altInputLabel: inputMode === "height" ? "δ" : "H",
                load,
                stress,
                status,
                statusReason,
                isValid: status !== "danger",
                messageEn,
                messageZh,
            });
        }

        // Calculate spring index and Wahl factor
        const C = D / d;
        const Kb = (4 * C - 1) / (4 * C - 4) + 0.615 / C;

        return {
            springType: "variablePitch",
            springRate: globalSpringRate,
            springIndex: C,
            wahlFactor: Kb,
            H0: L0,
            Hb,
            cases: loadCases,
            totalEnergy,
            maxStress: Math.max(...loadCases.map(c => c.stress || 0)),
            tauAllow: tauAllow,
            isValid: loadCases.every((c) => c.status !== "danger"),
        };
    }

    // -------------------------------------------------------------------------
    // Solve for Target
    // -------------------------------------------------------------------------

    solveForTarget(
        context: { geometry: any; material: any },
        input: SolveForTargetInput
    ): { ok: boolean; solvedParams?: any; error?: string } {
        const geo = context.geometry as VariablePitchParams;
        const mat = context.material as PlatformMaterialModel;
        const { segments, L0 } = geo;
        const G = mat.G ?? geo.G ?? 79000;

        if (input.mode !== "singlePoint" || !input.target1) {
            return { ok: false, error: "Only single-point solve supported" };
        }

        const { x: targetH, y: targetLoad } = input.target1;
        const targetDelta = L0 - targetH;

        // Binary search on activeCoils0
        let lo = 1;
        let hi = 50;
        let bestN = geo.activeCoils0;
        let bestResidual = Infinity;

        for (let iter = 0; iter < 30; iter++) {
            const mid = (lo + hi) / 2;
            const result = calculateVariablePitchCompressionAtDeflection({
                wireDiameter: geo.d,
                meanDiameter: geo.D,
                shearModulus: G,
                activeCoils0: mid,
                totalCoils: mid + 2, // Assume 2 inactive coils
                freeLength: L0,
                segments,
                deflection: targetDelta,
            });

            const residual = Math.abs(result.load - targetLoad);
            if (residual < bestResidual) {
                bestResidual = residual;
                bestN = mid;
            }

            if (result.load < targetLoad) {
                hi = mid;
            } else {
                lo = mid;
            }

            if (residual < targetLoad * 0.001) break;
        }

        return {
            ok: bestResidual < targetLoad * 0.01,
            solvedParams: { activeCoils0: Math.round(bestN * 10) / 10 },
        };
    }

    // -------------------------------------------------------------------------
    // Get Summary (for reports)
    // -------------------------------------------------------------------------

    getSummary(context: { geometry: any; material: any; result: PlatformResult }): PlatformDesignSummary {
        const geo = context.geometry as VariablePitchParams;
        const result = context.result;

        const C = geo.D / geo.d;
        const Kb = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
        const Hb = geo.totalCoils * geo.d;

        return {
            title: "Variable Pitch Spring Summary / 变节距弹簧设计总结",
            details: [
                { label: "Spring Rate / 刚度 k", value: result.springRate.toFixed(2), unit: "N/mm" },
                { label: "Spring Index / 旋绕比 C", value: C.toFixed(2) },
                { label: "Wahl Factor / 曲度系数 Kb", value: Kb.toFixed(3) },
                { label: "Solid Height / 压并高度 Hb", value: Hb.toFixed(2), unit: "mm" },
                { label: "Free Length / 自由长度 L0", value: geo.L0.toFixed(2), unit: "mm" },
                { label: "Active Coils / 有效圈数 n", value: geo.activeCoils0.toFixed(1) },
                { label: "Segments / 分段数", value: String(geo.segments.length) },
            ],
            warnings: result.isValid ? undefined : ["Design has issues - check load cases"],
        };
    }
}
