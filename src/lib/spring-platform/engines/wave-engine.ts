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
 * WaveSpringEngine handles Crest-to-Crest Wave Springs.
 * Based on empirical formulas for rate and stress.
 */
export class WaveSpringEngine implements ISpringEngine {
    type: PlatformSpringType = "wave";

    calculate(params: {
        geometry: {
            od: number;           // Outer Diameter
            id: number;           // Inner Diameter
            t: number;            // Thickness
            b: number;            // Radial wall width
            Nt: number;           // Number of turns
            Nw: number;           // Waves per turn
            Hf: number;           // Free height
        };
        material: PlatformMaterialModel;
        cases: { mode: any; values: number[] };
        modules: PlatformModules;
    }): PlatformResult {
        const { od, id: id_in, t, b, Nt, Nw, Hf } = params.geometry;
        const { E, tauAllow } = params.material;
        const PI = Math.PI;

        const meanDiameter = (od + id_in) / 2;
        const solidHeight = Nt * t;
        const availableDeflection = Hf - solidHeight;

        // Spring rate: k = (E * b * t³ * Nw⁴) / (2.4 * Dm³ * Nt)
        const k_numerator = E * b * Math.pow(t, 3) * Math.pow(Nw, 4);
        const k_denominator = 2.4 * Math.pow(meanDiameter, 3) * Nt;
        const springRate = k_numerator / k_denominator;

        const results: LoadCaseResult[] = params.cases.values.map((v, i) => {
            let s = 0;
            let h = Hf;
            if (params.cases.mode === "height") {
                h = v;
                s = Hf - h;
            } else {
                s = v;
                h = Hf - s;
            }

            const load = springRate * s;

            // Stress: σ = (3 * π * F * Dm) / (4 * Nw * b * t²)
            const stress_numerator = 3 * PI * load * meanDiameter;
            const stress_denominator = 4 * Nw * b * Math.pow(t, 2);
            const stressMax = stress_numerator / stress_denominator;

            const isOverTravel = s > availableDeflection * 0.95;
            const isOverStress = stressMax > tauAllow * 1.5; // Bending stress vs shear allow

            let status: CaseStatus = "ok";
            let reason: CaseStatusReason = "none";
            if (isOverTravel) { status = "danger"; reason = "travel"; }
            else if (isOverStress) { status = "warning"; reason = "stress"; }

            return {
                id: `Wave_${i + 1}`,
                labelEn: `Point ${i + 1}`,
                labelZh: `点位 ${i + 1}`,
                inputValue: v,
                inputMode: params.cases.mode,
                altInputValue: params.cases.mode === "height" ? s : h,
                altInputLabel: params.cases.mode === "height" ? "Deflection s" : "Height h",
                load,
                stress: stressMax,
                status,
                statusReason: reason,
                isValid: !isOverTravel,
                energy: 0.5 * load * s / 1000 // J
            };
        });

        return {
            springType: "wave",
            cases: results,
            springRate,
            springIndex: meanDiameter / t,
            wahlFactor: 1.0,
            isValid: results.every(r => r.isValid),
            totalEnergy: results[results.length - 1]?.energy || 0,
            H0: Hf,
            Hb: solidHeight
        };
    }

    getSummary(ctx: { geometry: any; material: any; result: PlatformResult }): PlatformDesignSummary {
        const { geometry } = ctx;
        return {
            title: "波形弹簧设计摘要 / Wave Spring Design Summary",
            details: [
                { label: "外径/内径 (OD/ID)", value: `${geometry.od}/${geometry.id}`, unit: "mm" },
                { label: "厚度/带宽 (t/b)", value: `${geometry.t}/${geometry.b}`, unit: "mm" },
                { label: "圈数/波叠 (Nt/Nw)", value: `${geometry.Nt}/${geometry.Nw}` },
                { label: "自由高度 / Free Height", value: geometry.Hf.toFixed(1), unit: "mm" },
                { label: "刚度 / Rate", value: ctx.result.springRate.toFixed(2), unit: "N/mm" }
            ],
            warnings: ctx.result.cases.some(c => c.status === "danger") ? ["接近极限压缩位移 / Near deflection limit"] : []
        };
    }
}
