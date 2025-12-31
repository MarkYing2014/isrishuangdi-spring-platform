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
 * SpiralSpringEngine handles Flat Strip Spiral Springs.
 */
export class SpiralSpringEngine implements ISpringEngine {
    type: PlatformSpringType = "spiral";

    calculate(params: {
        geometry: {
            stripWidth: number;     // b (mm)
            stripThickness: number; // t (mm)
            activeLength: number;   // L (mm)
            innerDiameter: number;  // Di
            outerDiameter: number;  // Do
            preloadAngle?: number;  // theta0 (deg)
        };
        material: PlatformMaterialModel;
        cases: { mode: any; values: number[] };
        modules: PlatformModules;
    }): PlatformResult {
        const { stripWidth: b, stripThickness: t, activeLength: L, preloadAngle = 0 } = params.geometry;
        const { E, tauAllow } = params.material;
        const PI = Math.PI;

        // k_deg = (π * E * b * t³) / (6 * L) / 360  (Nmm/deg)
        // Rate = (PI * E * b * t^3) / (12 * L) / 180 -> wait, standard is (Ebt^3)/(12L) for k_rad
        // k_rad = (E * b * t^3) / (12 * L)
        // k_deg = (E * b * t^3) / (12 * L) * (PI / 180)
        const springRate = (E * b * Math.pow(t, 3) * PI) / (12 * L * 180);

        const results: LoadCaseResult[] = params.cases.values.map((v, i) => {
            let theta = 0;
            if (params.cases.mode === "angle") {
                theta = v;
            } else {
                // torque -> angle
                theta = (v - (preloadAngle * springRate)) / springRate;
            }

            const torque = (theta + preloadAngle) * springRate;

            // Stress: σ = 6T / (b * t²)
            const sigma = (6 * torque) / (b * Math.pow(t, 2));

            const isOverStress = sigma > tauAllow * 1.8; // Bending stress vs shear allow reference

            let status: CaseStatus = "ok";
            let reason: CaseStatusReason = "none";
            if (isOverStress) { status = "warning"; reason = "stress"; }

            return {
                id: `Spiral_${i + 1}`,
                labelEn: `Point ${i + 1}`,
                labelZh: `点位 ${i + 1}`,
                inputValue: v,
                inputMode: params.cases.mode,
                altInputValue: params.cases.mode === "angle" ? torque : theta,
                altInputLabel: params.cases.mode === "angle" ? "Torque T" : "Angle θ",
                load: torque,
                stress: sigma,
                status,
                statusReason: reason,
                isValid: true,
                energy: 0.5 * torque * (theta * PI / 180) / 1000 // J approximation
            };
        });

        return {
            springType: "spiral",
            cases: results,
            springRate,
            springIndex: L / t, // Reference only
            wahlFactor: 1.0,
            isValid: results.every(r => r.isValid),
            totalEnergy: results[results.length - 1]?.energy || 0
        };
    }

    getSummary(ctx: { geometry: any; material: any; result: PlatformResult }): PlatformDesignSummary {
        const { geometry } = ctx;
        return {
            title: "定力/发盘弹簧摘要 / Spiral Spring Design Summary",
            details: [
                { label: "宽度/厚度 (b/t)", value: `${geometry.stripWidth}/${geometry.stripThickness}`, unit: "mm" },
                { label: "有效长度 / Length (L)", value: geometry.activeLength.toFixed(1), unit: "mm" },
                { label: "内径/外径 (Di/Do)", value: `${geometry.innerDiameter}/${geometry.outerDiameter}`, unit: "mm" },
                { label: "刚度 / Rate", value: ctx.result.springRate.toFixed(4), unit: "Nmm/deg" }
            ],
            warnings: ctx.result.cases.some(c => c.status === "danger") ? ["超过许用弯曲应力 / Yield stress exceeded"] : []
        };
    }
}
