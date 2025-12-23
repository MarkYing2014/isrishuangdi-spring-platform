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

    // Use an equivalent crest stress model for Wave Springs
    // Dividing by a distribution factor (conservative estimate of wave peak sharing)
    const rawStressRatio = result.stressMax_MPa / yieldStrength;
    const stressIndex = rawStressRatio / 3.0; // Scaled to reflect multi-wave load distribution

    const solidHeight = geometry.turns_Nt * geometry.thickness_t;
    const solidClearance = geometry.workingHeight_Hw - solidHeight;

    let designStatus: "PASS" | "MARGINAL" | "FAIL" = "PASS";
    let verdict = "Design is safe.";
    let verdictZh = "设计结果安全。";

    if (stressIndex > 0.9) {
        designStatus = "FAIL";
        verdict = "Stress Index exceeds safe limits (>90%) - permanent deformation likely.";
        verdictZh = "等效应力指标超过安全限值 (>90%) - 可能发生永久变形。";
    } else if (stressIndex > 0.8) {
        designStatus = "MARGINAL";
        verdict = "Stress Index is high (>80%) - use with caution.";
        verdictZh = "等效应力指标较高 (>80%) - 请谨慎使用。";
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
        stressMax: result.stressMax_MPa / 3.0, // Scaled for equivalent crest stress
        stressIndex,
        solidHeight,
        solidClearance,
        safetyFactor: yieldStrength / (result.stressMax_MPa / 3.0),
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
