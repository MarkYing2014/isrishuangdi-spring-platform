import {
    ISpringEngine,
    PlatformSpringType,
    PlatformResult,
    LoadCaseResult,
    PlatformModules,
    PlatformMaterialModel,
    CaseStatus,
    CaseStatusReason,
    PlatformDesignSummary
} from "../types";

/**
 * DiscSpringEngine handles Belleville/Disc washers.
 * Follows Almen-Laszlo equations for non-linear behavior.
 */
export class DiscSpringEngine implements ISpringEngine {
    type: PlatformSpringType = "disc";

    calculate(params: {
        geometry: {
            Do: number;       // Outer Dia
            Di: number;       // Inner Dia
            t: number;        // Thickness
            h0: number;       // Cone height
            series: number;   // Ns
            parallel: number; // Np
        };
        material: PlatformMaterialModel;
        cases: { mode: any; values: number[] };
        modules: PlatformModules;
    }): PlatformResult {
        const { Do, Di, t, h0, series = 1, parallel = 1 } = params.geometry;
        const { E, tauAllow } = params.material;
        const nu = 0.3; // Standard Poisson

        const delta = Do / Di;
        const K1 = (1 / Math.PI) * Math.pow((delta - 1) / delta, 2) / ((delta + 1) / (delta - 1) - 2 / Math.log(delta));
        const M = (6 / Math.PI) * (delta - 1) / (Math.log(delta)); // Simple M factor

        const results: LoadCaseResult[] = params.cases.values.map((s, i) => {
            // Force for single disc: 
            // P = (4*E / (1-nu^2)) * (t^4 / K1 * Do^2) * (s/t) * [(h0/t - s/t)*(h0/t - s/2t) + 1]
            const s_single = s / series;
            const term1 = (4 * E * Math.pow(t, 4)) / ((1 - Math.pow(nu, 2)) * K1 * Math.pow(Do, 2));
            const s_t = s_single / t;
            const h0_t = h0 / t;

            const P_single = term1 * s_t * ((h0_t - s_t) * (h0_t - s_t / 2) + 1);
            const totalLoad = P_single * parallel;

            // Stress (simplified membrane + bending at Di)
            const sigma = (4 * E * t * s_single) / ((1 - Math.pow(nu, 2)) * K1 * Math.pow(Do, 2)) * (M * (h0_t - s_t / 2) + 1);

            const isOverTravel = s_single > h0 * 0.9;
            const isOverYield = sigma > tauAllow * 1.5; // Sigma allow vs Tau allow

            let status: CaseStatus = "ok";
            let reason: CaseStatusReason = "none";
            if (isOverTravel) { status = "danger"; reason = "travel"; }
            else if (isOverYield) { status = "warning"; reason = "stress"; }

            return {
                id: `Disc_${i + 1}`,
                labelEn: `Stroke ${i + 1}`,
                labelZh: `行程 ${i + 1}`,
                inputValue: s,
                inputMode: "deflection" as any,
                load: totalLoad,
                stress: sigma,
                status,
                statusReason: reason,
                isValid: !isOverTravel,
                energy: 0.5 * totalLoad * s / 1000 // J approximation
            };
        });

        return {
            springType: "disc",
            cases: results,
            springRate: (results.length > 0 && results[0].load && results[0].inputValue)
                ? (results[0].load / results[0].inputValue)
                : 0, // Prevent crash if empty or zero input
            springIndex: delta,
            wahlFactor: 1,
            isValid: results.every(r => r.isValid),
            maxStress: Math.max(...results.map(r => r.stress || 0)),
            tauAllow: tauAllow * 1.5,
            totalEnergy: results.reduce((acc, r) => acc + (r.energy || 0), 0)
        };
    }

    solveForTarget(params: any, input: any): any {
        const { geometry } = params;
        const { mode, target1 } = input;

        if (mode === "singlePoint") {
            // target1.x = stroke s, target1.y = Load P
            const res = this.calculate({
                ...params,
                cases: { mode: "deflection" as any, values: [target1.x] },
                modules: { loadAnalysis: true } as any
            });

            const P_baseline = res.cases[0].load || 0;
            if (P_baseline === 0) return { ok: false, error: "Baseline load is zero" };

            // For Disc, we can scale 't' roughly, but a simpler design-mode behavior
            // is to return a suggested thickness 't' using a simple power-law approximation
            // of the Almen-Laszlo eq (P proportional to t^m where m ~ 3-4)
            const tScale = Math.pow(target1.y / P_baseline, 1 / 3.5);
            const newT = geometry.t * tScale;

            return {
                ok: true,
                solvedParams: {
                    t: newT
                },
                derived: { tScale, P_baseline }
            };
        }

        return { ok: false, errors: ["Mode not supported for Disc"] };
    }

    getSummary(ctx: { geometry: any; material: any; result: PlatformResult }): PlatformDesignSummary {
        const { geometry } = ctx;
        return {
            title: "碟形弹簧组设计摘要 / Disc Spring Stack Summary",
            details: [
                { label: "外径/内径 (Do/Di)", value: `${geometry.Do}/${geometry.Di}`, unit: "mm" },
                { label: "厚度/内高 (t/h0)", value: `${geometry.t}/${geometry.h0}`, unit: "mm" },
                { label: "对合/并列 (Ns/Np)", value: `${geometry.series}/${geometry.parallel}` },
                { label: "自由高度 / Free Height", value: (((geometry.t + geometry.h0) * geometry.series) || 0).toFixed(1), unit: "mm" },
                { label: "总储能 / Total Energy", value: ctx.result.totalEnergy?.toFixed(3) || "0", unit: "J" }
            ],
            warnings: ctx.result.cases.some(c => c.status === "danger") ? ["堆叠已压平或超过屈服强度 / Stack flattened or yield exceeded"] : []
        };
    }
}
