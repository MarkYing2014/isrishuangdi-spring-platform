/**
 * Wave Spring Engineering Analysis Logic
 * 波形弹簧工程分析逻辑
 */

import { WaveSpringGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import { calculateWaveSpring, type WaveSpringInput, type WaveSpringResult } from "@/lib/waveSpring/math";

export interface WaveSpringEngineeringSummary {
    designStatus: "PASS" | "MARGINAL" | "FAIL";
    verdict: string;
    verdictZh: string;
    kWork: number;
    fWork: number;
    stressMax: number;
    stressIndex: number;
    solidHeight: number;
    solidClearance: number;
    safetyFactor: number;
}

/**
 * Compute high-level engineering summary for wave springs
 */
export function computeWaveSpringEngineeringSummary(
    input: WaveSpringInput,
    result: WaveSpringResult,
    material?: MaterialInfo
): WaveSpringEngineeringSummary {
    const { geometry } = input;
    const yieldStrength = material?.tensileStrength ? material.tensileStrength * 0.8 : 1170; // fallback to 17-7PH approx

    // 1. Engineering Parameters from Geometry
    const b = geometry.radialWall_b; // Radial wall width
    const t = geometry.thickness_t; // Strip thickness
    const nW = geometry.wavesPerTurn_Nw;
    const nT = geometry.turns_Nt;
    const Dm = (geometry.od + geometry.id) / 2;

    // 2. Load Sharing Factor (N_eff)
    // eta = 0.75 (User provided default: 0.6~0.85)
    const eta = 0.75;
    const N_eff = nW * nT * eta;

    // 3. Effective Bending Length (L_eff)
    // kappa_L = 0.30 (User provided default: 0.25~0.35)
    const kappa_L = 0.30;
    const L_eff = (Math.PI * Dm / nW) * kappa_L;

    // 4. Maximum Bending Moment (M_max)
    // Distribute total load F_work to each effective wave
    const F_work = result.loadAtWorkingHeight_N;
    const F_i = F_work / N_eff;

    // kappa_M = 1.3 (User provided default: 1.1~1.5)
    // Empirical correction for contact/constraint
    const kappa_M = 1.3;
    const M_max = F_i * L_eff * kappa_M;

    // 5. Equivalent Crest Bending Stress (sigma_b_eq)
    // Section Modulus Z = b * t^2 / 6
    const Z = (b * Math.pow(t, 2)) / 6;

    // sigma_b_eq = M_max / Z
    const sigma_b_eq = M_max / Z;

    // Utilization / Stress Index
    const stressIndex = sigma_b_eq / yieldStrength;

    const solidHeight = geometry.turns_Nt * geometry.thickness_t;
    const solidClearance = geometry.workingHeight_Hw - solidHeight;

    let designStatus: "PASS" | "MARGINAL" | "FAIL" = "PASS";
    let verdict = "Design is safe.";
    let verdictZh = "设计结果安全。";

    // Strict Engineering Thresholds (Phase 0 Rule)
    // < 0.6 PASS
    // 0.6 - 0.8 WARNING
    // > 0.8 FAIL
    if (stressIndex > 1.0) {
        designStatus = "FAIL";
        verdict = `Stress Utilization > 100% (${(stressIndex * 100).toFixed(0)}%). FAIL.`;
        verdictZh = `应力利用率 > 100% (${(stressIndex * 100).toFixed(0)}%)。失效风险极高。`;
    } else if (stressIndex > 0.8) {
        designStatus = "FAIL";
        verdict = `High crest bending stress > 80% (${(stressIndex * 100).toFixed(0)}%). Risk of permanent set.`;
        verdictZh = `波峰弯曲应力 > 80% (${(stressIndex * 100).toFixed(0)}%)。存在永久变形风险。`;
    } else if (stressIndex > 0.6) {
        designStatus = "MARGINAL";
        verdict = `Moderate stress (${(stressIndex * 100).toFixed(0)}%). Acceptable for static, check fatigue.`;
        verdictZh = `中等应力水平 (${(stressIndex * 100).toFixed(0)}%)。静态工况可接受，需注意疲劳。`;
    }

    if (solidClearance < 0.5 && designStatus !== "FAIL") {
        designStatus = "MARGINAL";
        verdict = "Working height is very close to solid height.";
        verdictZh = "工作高度非常接近并紧高度。";
    }

    if (solidClearance <= 0) {
        designStatus = "FAIL";
        verdict = "Solid height reached or exceeded.";
        verdictZh = "已达到或超过并紧高度。";
    }

    return {
        designStatus,
        verdict,
        verdictZh,
        kWork: result.springRate_Nmm,
        fWork: result.loadAtWorkingHeight_N,
        stressMax: sigma_b_eq,
        stressIndex,
        solidHeight,
        solidClearance,
        safetyFactor: yieldStrength / sigma_b_eq,
    };
}

/**
 * Generate load-deflection curve points
 */
/**
 * Generate load-deflection curve points
 * Uses Engineering Quadratic Model: k(x) = k0 * (1 + alpha * x/H0)
 */
export function computeWaveSpringCurve(input: WaveSpringInput, points = 20) {
    const g = input.geometry;
    const solidHeight = g.turns_Nt * g.thickness_t;
    const maxTravel = g.freeHeight_Hf - solidHeight;

    // Base Rate k0 (Linear approximation from math lib)
    // We assume the math lib returns the 'initial' or 'average' rate.
    // For Phase 0 Demo, we treat it as k0.
    const res0 = calculateWaveSpring({ ...input, geometry: { ...g, workingHeight_Hw: g.freeHeight_Hf - 0.1 } });
    const k0 = res0.springRate_Nmm;

    // Non-linearity factor alpha
    // Heuristic: Higher wave density -> more non-linear?
    // For demo, alpha = 0.5 ~ 1.2
    // Let's settle on 0.8 as a "standard" look
    const alpha = 0.8;

    const curve = [];
    for (let i = 0; i <= points; i++) {
        const travel = (maxTravel / points) * i; // x
        const height = g.freeHeight_Hf - travel;

        // k(x) = k0 * (1 + alpha * (x / maxTravel))
        // F(x) = integral k(x) dx = k0 * x * (1 + 0.5 * alpha * (x / maxTravel))
        const x_ratio = travel / maxTravel;
        const load = k0 * travel * (1 + 0.5 * alpha * x_ratio);

        // Analytical Stress Calculation for consistency
        // Uses the same logic as Summary but applied to this load point
        const eta = 0.75;
        const Neff = g.wavesPerTurn_Nw * g.turns_Nt * eta;
        const Fi = load / Neff;

        const Dm = (g.od + g.id) / 2;
        const kL = 0.30;
        const Leff = (Math.PI * Dm / g.wavesPerTurn_Nw) * kL;
        const kM = 1.3;
        const Mmax = Fi * Leff * kM;
        const Z = (g.radialWall_b * Math.pow(g.thickness_t, 2)) / 6;
        const stress = Mmax / Z;

        curve.push({
            travel: Number(travel.toFixed(2)),
            height: Number(height.toFixed(2)),
            load: Number(load.toFixed(2)),
            stress: Number(stress.toFixed(1))
        });
    }

    return curve;
}
