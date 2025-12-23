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

    if (stressIndex > 0.9) {
        designStatus = "FAIL";
        verdict = `High equivalent crest stress (${(stressIndex * 100).toFixed(0)}%). Risk of permanent set.`;
        verdictZh = `等效波峰利用率过高 (${(stressIndex * 100).toFixed(0)}%)。存在永久变形风险。`;
    } else if (stressIndex > 0.8) {
        designStatus = "MARGINAL";
        verdict = `Stress Utilization > 80% (${(stressIndex * 100).toFixed(0)}%). Fatigue life may be limited.`;
        verdictZh = `应力利用率 > 80% (${(stressIndex * 100).toFixed(0)}%)。疲劳寿命可能受限。`;
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
export function computeWaveSpringCurve(input: WaveSpringInput, points = 20) {
    const g = input.geometry;
    const solidHeight = g.turns_Nt * g.thickness_t;
    const maxTravel = g.freeHeight_Hf - solidHeight;

    const curve = [];
    for (let i = 0; i <= points; i++) {
        const travel = (maxTravel / points) * i;
        const height = g.freeHeight_Hf - travel;

        // Use V1 calc for each point
        const pointInput: WaveSpringInput = {
            ...input,
            geometry: {
                ...input.geometry,
                workingHeight_Hw: height
            }
        };

        // Simplify: for V1, k is constant.
        // In reality, as it approaches solid height, k increases (progressive)
        // We can simulate this by adding a small non-linear factor near solid
        const res = calculateWaveSpring(pointInput);

        let effectiveLoad = res.loadAtWorkingHeight_N;
        const clearanceRatio = (height - solidHeight) / g.freeHeight_Hf;

        if (clearanceRatio < 0.1 && clearanceRatio > 0) {
            // Progressive hardening near solid
            const factor = 1 + Math.pow(1 - (clearanceRatio / 0.1), 2) * 0.5;
            effectiveLoad *= factor;
        } else if (clearanceRatio <= 0) {
            effectiveLoad *= 2; // Arbitrary jump to show solid contact
        }

        curve.push({
            travel: Number(travel.toFixed(2)),
            height: Number(height.toFixed(2)),
            load: Number(effectiveLoad.toFixed(2)),
            stress: Number(res.stressMax_MPa.toFixed(1))
        });
    }

    return curve;
}
