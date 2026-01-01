import {
    ISpringEngine,
    PlatformResult,
    LoadCaseResult,
    CaseStatus,
    CaseStatusReason,
    PlatformModules,
    PlatformInputMode,
    PlatformSpringType,
    PlatformMaterialModel,
    SolveForTargetInput,
    SolveForTargetResult
} from "../types";
import { SpringMaterialId } from "@/lib/materials/springMaterials";

export class ConicalEngine implements ISpringEngine {
    type = "conical" as const;

    calculate(params: {
        geometry: {
            d: number;
            D1: number; // Large OD
            D2: number; // Small OD
            n: number;  // Active coils
            H0: number; // Free length
            Hb?: number; // Optional solid height
        };
        material: PlatformMaterialModel;
        cases: {
            mode: PlatformInputMode;
            values: number[];
        };
        modules: PlatformModules;
        springType?: PlatformSpringType;
    }): PlatformResult {
        const { d, D1, D2, n, H0 } = params.geometry;
        const G = params.material.G ?? 79300;
        const tauAllow = params.material.tauAllow ?? 700;
        const { values, mode } = params.cases;

        // Approximation for single rate (linear start)
        const meanDiameter = (D1 + D2) / 2 - d;
        const springIndex = meanDiameter / d;
        const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;

        // Solid height
        const Hb = n * d;
        const maxTravel = H0 - Hb;

        const caseResults: LoadCaseResult[] = values.map((val, idx) => {
            let H = 0;
            let delta = 0;

            if (mode === "height") {
                H = val;
                delta = H0 - H;
            } else {
                delta = val;
                H = H0 - delta;
            }

            // Nonlinear point calculation
            const point = this.calculateNonlinearPoint(params.geometry, G, delta);

            const P = point.load;
            const tau = wahlFactor * (8 * P * meanDiameter) / (Math.PI * Math.pow(d, 3));

            // Determine status
            let status: CaseStatus = "ok";
            let statusReason: CaseStatusReason = "none";
            let isValid = true;
            let messageZh = "";
            let messageEn = "";

            if (H < Hb - 0.01) {
                status = "danger";
                statusReason = "solid";
                isValid = false;
                messageZh = "高度低于压并高度";
                messageEn = "Height below solid height";
            } else if (params.modules.stressAnalysis && tau > tauAllow) {
                status = "warning";
                statusReason = "stress";
                messageZh = "应力超过许用限";
                messageEn = "Stress exceeds limit";
            }

            return {
                id: `L${idx + 1}`,
                labelEn: `Point ${idx + 1}`,
                labelZh: `点位 ${idx + 1}`,
                inputValue: val,
                inputMode: mode,
                altInputValue: mode === "height" ? delta : H,
                altInputLabel: mode === "height" ? "压缩 δ" : "高度 H",
                load: P,
                stress: tau,
                status,
                statusReason,
                isValid,
                messageEn,
                messageZh
            };
        });

        const initialK = this.calculateNonlinearPoint(params.geometry, G, 0.1).k;

        return {
            springType: "conical",
            cases: caseResults,
            springRate: initialK,
            springIndex,
            wahlFactor,
            H0,
            Hb,
            isValid: caseResults.every(c => c.isValid),
            maxStress: Math.max(...caseResults.map(c => c.stress || 0)),
            tauAllow: tauAllow
        };
    }

    solveForTarget(
        params: any,
        input: SolveForTargetInput
    ): SolveForTargetResult {
        const { d, D1, D2, n, H0 } = params.geometry;
        const G = params.material.G ?? 79300;
        const { mode, target1, clamps } = input;

        const nScaleRange = clamps?.nScaleRange || [0.5, 2.0];
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            if (mode !== "singlePoint") {
                errors.push("Conical engine currently only supports single-point reverse solve.");
                return { ok: false, errors };
            }

            const deltaTarget = target1.x; // Deflection
            const P_target = target1.y;   // Load

            if (deltaTarget <= 0 || P_target <= 0) {
                errors.push("Deflection and Load must be positive for conical solve.");
                return { ok: false, errors };
            }

            // Bisection Root Find for nScale
            const f = (scaling: number) => {
                const tempGeo = { ...params.geometry, n: n * scaling };
                return this.calculateNonlinearPoint(tempGeo, G, deltaTarget).load - P_target;
            };

            let lo = nScaleRange[0];
            let hi = nScaleRange[1];
            let fLo = f(lo);
            let fHi = f(hi);

            // Check if solution is bracketed
            if (fLo * fHi > 0) {
                errors.push(`Target load is outside the searchable range for nScale [${lo}, ${hi}]. Try adjusting geometry manually first.`);
                return { ok: false, errors };
            }

            let mid = (lo + hi) / 2;
            let iterations = 0;
            const maxIterations = 10;
            const tolerance = 0.001; // 0.1%

            while (iterations < maxIterations) {
                mid = (lo + hi) / 2;
                const fMid = f(mid);

                if (Math.abs(fMid / P_target) < tolerance) {
                    break;
                }

                if (fLo * fMid < 0) {
                    hi = mid;
                    fHi = fMid;
                } else {
                    lo = mid;
                    fLo = fMid;
                }
                iterations++;
            }

            const solvedN = n * mid;
            const residual = Math.abs(f(mid) / P_target);

            if (iterations === maxIterations) {
                warnings.push(`Solver reached maximum iterations (${maxIterations}). Residual: ${(residual * 100).toFixed(2)}%`);
            }

            // Validation logic for solved n (reuse nRange default if provided)
            const nRange = clamps?.nRange || [1, 200];
            if (solvedN < nRange[0] || solvedN > nRange[1]) {
                errors.push(`Solved coils (n=${solvedN.toFixed(2)}) out of realistic range [${nRange[0]}, ${nRange[1]}].`);
                return { ok: false, errors, warnings };
            }

            return {
                ok: true,
                solvedParams: {
                    n: Number(solvedN.toFixed(2))
                },
                derived: {
                    nScale: mid,
                    iterations,
                    residual
                },
                warnings
            };
        } catch (e) {
            return { ok: false, errors: ["Internal solver error: " + (e as Error).message] };
        }
    }

    /** Simple piecewise integration for conical load at specific deflection */
    private calculateNonlinearPoint(geo: any, G: number, x: number): { load: number, k: number } {
        const { d, D1: D1_out, D2: D2_out, n: n0, H0: L0 } = geo;

        const D1 = D1_out - d;
        const D2 = D2_out - d;
        const solidHeight = n0 * d;
        const totalDeflectionCapacity = L0 - solidHeight;

        if (totalDeflectionCapacity <= 0 || x <= 0) {
            // Initial K
            const k = (G * Math.pow(d, 4)) /
                (2 * n0 * (D1 + D2) * (Math.pow(D1, 2) + Math.pow(D2, 2)));
            return { load: 0, k };
        }

        const pitch = totalDeflectionCapacity / n0;
        const effectiveX = Math.min(x, totalDeflectionCapacity);

        const steps = 50;
        let currentLoad = 0;
        let lastK = 0;
        const stepSize = effectiveX / steps;

        for (let i = 1; i <= steps; i++) {
            const xi = stepSize * i;
            let collapsed = Math.floor(xi / pitch);
            collapsed = Math.min(collapsed, n0 - 1);

            const n_eff = n0 - collapsed;
            const collapseRatio = collapsed / n0;
            const D1_eff = D1 - (D1 - D2) * collapseRatio;
            const D2_eff = D2;

            const k = (G * Math.pow(d, 4)) /
                (2 * n_eff * (D1_eff + D2_eff) * (Math.pow(D1_eff, 2) + Math.pow(D2_eff, 2)));

            currentLoad += k * stepSize;
            lastK = k;
        }

        return { load: currentLoad, k: lastK };
    }
}
