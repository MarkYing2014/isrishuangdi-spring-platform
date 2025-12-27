
import { rotationToStrokeMm } from "./mapping";
import { TorsionalStage, StageCurve, SystemCurve, StageSafeResult, AuditStatus } from "./types";
import { computeStageLimits } from "./limits";
import { assertFinitePositive, assertMetricDieSpringSpec } from "./units";

export function computeStageSafe(stage: TorsionalStage): StageSafeResult {
    assertFinitePositive("stage.geometry.effectiveRadiusMm", stage.geometry.effectiveRadiusMm);
    // Allow Infinity for slotTravelMm as per types, but assertFinitePositive throws.
    // Prompt says: "slotTravelMm > 0 || slotTravelMm === Infinity"
    if (stage.geometry.slotTravelMm !== Infinity) {
        assertFinitePositive("stage.geometry.slotTravelMm", stage.geometry.slotTravelMm);
    }
    assertFinitePositive("stage.pack.count", stage.pack.count);
    assertMetricDieSpringSpec(stage.pack.spec);

    const cap = computeStageLimits(
        stage.pack.spec,
        stage.geometry.slotTravelMm,
        stage.pack.lifeClass,
        stage.geometry.effectiveRadiusMm
    );

    return {
        stageId: stage.stageId,
        hardLimitStrokeMm: cap.hardLimitStrokeMm,
        thetaSafeDeg: cap.governing.limitThetaDeg,
        governing: cap.governing
    };
}

export function generateStageCurve(stage: TorsionalStage, thetaMaxDeg: number, steps = 60): StageCurve {
    const { spec, count } = stage.pack;
    const R = stage.geometry.effectiveRadiusMm;

    const points = Array.from({ length: steps + 1 }, (_, i) => {
        const thetaDeg = (thetaMaxDeg * i) / steps;
        const strokeMm = rotationToStrokeMm(thetaDeg, R);
        const forceN = spec.springRate * strokeMm;
        const torqueNmm = count * forceN * R;
        return { thetaDeg, strokeMm, torqueNmm };
    });

    return { stageId: stage.stageId, points };
}

export function generateSystemCurve(stages: TorsionalStage[], steps = 80, thetaOperatingDeg?: number): SystemCurve {
    const safes = stages.map(computeStageSafe);
    // Find Governing Stage for SAFE limit (Life OR Physical)
    const governingStage = safes.reduce((a, b) => (b.thetaSafeDeg < a.thetaSafeDeg ? b : a));

    // Find Hard Limit (Physical only)
    // We need thetaHard per stage from computeStageSafe? 
    // computeStageSafe currently only returns thetaSafeDeg which is limitThetaDeg from governing.
    // I need to update StageSafeResult to include thetaHardDeg too. 
    // And computeStageSafe needs to populate it.

    // Instead of fixing type generically right now (might break others), let's calculate it locally or assume implicit.
    // Actually, I can use computeStageLimits inside the loop if I want, OR update StageSafeResult type.
    // Let's check types.ts... it has StageSafeResult. It has hardLimitStrokeMm.
    // I can convert hardLimitStrokeMm to deg.

    const thetaSafeSystemDeg = governingStage.thetaSafeDeg;

    // Calculate System Hard Stop (min of physical stops)
    const thetaHardSystemDeg = Math.min(...safes.map(s =>
    // Need mapping back to degrees for hard limit
    // s.hardLimitStrokeMm is stroke.
    // We need radius.
    // stages array has radius. Match by index/ID.
    {
        const st = stages.find(st => st.stageId === s.stageId)!;
        const R = st.geometry.effectiveRadiusMm;
        // map s.hardLimitStrokeMm to deg
        // stroke = deg * R * PI/180 =>  deg = stroke / R * 180/PI
        return (s.hardLimitStrokeMm / R) * (180 / Math.PI);
    }
    ));
    const points = Array.from({ length: steps + 1 }, (_, i) => {
        const thetaDeg = (thetaSafeSystemDeg * i) / steps;

        let torqueSum = 0;
        for (const st of stages) {
            const R = st.geometry.effectiveRadiusMm;
            const strokeMm = rotationToStrokeMm(thetaDeg, R);
            const forceN = st.pack.spec.springRate * strokeMm;
            const torqueNmm = st.pack.count * forceN * R;
            torqueSum += torqueNmm;
        }
        // Spec Rule 6: System curve contains torque only. No fake stroke.
        // Types.ts: CurvePoint { thetaDeg, torqueNmm } (strokeMm is missing in SystemCurve.points?)
        // Let's check types.ts from step 1 definition.
        // definitions: CurvePoint { thetaDeg, strokeMm, torqueNmm }
        // but SystemCurve { points: CurvePoint[] ... }
        // Wait, the prompt says "System curve contains torque only. Do NOT invent or store a fake 'system stroke'." 
        // BUT types.ts definition for CurvePoint HAS strokeMm.
        // And SystemCurve uses CurvePoint[].
        // I should probably set strokeMm to 0 or undefined if type allows, or just strictly follow the type definition which HAS it. 
        // Re-reading prompt types:
        // export interface CurvePoint { thetaDeg: number; torqueNmm: number; } // STROKE REMOVED?
        // Looking at prompt Step 3877 section 1 Types:
        // export interface CurvePoint { thetaDeg: number; torqueNmm: number; } <-- YES, strokeMm IS GONE from basic CurvePoint!
        // But StageCurve has: points: Array<{ thetaDeg: number; strokeMm: number; torqueNmm: number; }>
        // Start careful check.

        // Prompt Types:
        // interface CurvePoint { thetaDeg, torqueNmm }  <-- basic
        // interface StageCurve { points: Array<{ thetaDeg, strokeMm, torqueNmm }> } <-- extended inline
        // interface SystemCurve { points: CurvePoint[] } <-- uses basic

        // My previous implementation had strokeMm in System to match Stage.
        // I must align exactly.

        return { thetaDeg, torqueNmm: torqueSum };
    });

    // Audit Result Logic (Phase 8 Quality-Ready)
    let systemResult: AuditStatus = "INFO";
    let conformsToCustomerRange = true;
    let deviationRequired = false;

    if (thetaOperatingDeg !== undefined && thetaOperatingDeg > 0) {
        if (thetaOperatingDeg > thetaSafeSystemDeg) {
            systemResult = "FAIL";
            conformsToCustomerRange = false;
            deviationRequired = true;
        } else if (thetaOperatingDeg > 0.8 * thetaSafeSystemDeg) {
            systemResult = "WARN";
            conformsToCustomerRange = true;
            deviationRequired = false;
        } else {
            systemResult = "PASS";
            conformsToCustomerRange = true;
            deviationRequired = false;
        }
    }

    return {
        points,
        thetaSafeSystemDeg,
        thetaHardSystemDeg,
        thetaCustomerDeg: thetaOperatingDeg,
        governingStageId: governingStage.stageId,
        governing: governingStage.governing,
        systemResult,
        conformsToCustomerRange,
        deviationRequired
    };
}
