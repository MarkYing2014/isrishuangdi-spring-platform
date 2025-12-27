
import { DieSpringSpec, DieSpringLifeClass } from "@/lib/dieSpring";
import { GoverningLimit } from "./types";
import { strokeToThetaDeg } from "./mapping";

export function lifeStrokeLimitMm(
    spec: DieSpringSpec,
    life: DieSpringLifeClass
) {
    if (life === "LONG") return spec.strokeLimits.long;
    if (life === "NORMAL") return spec.strokeLimits.normal;
    return spec.strokeLimits.max;
}


export interface StageLimits {
    hardLimitStrokeMm: number;
    lifeLimitStrokeMm: number;
    safeStrokeMm: number;
    governing: GoverningLimit;
}

export function computeStageLimits(
    spec: DieSpringSpec,
    slotTravelMm: number,
    life: DieSpringLifeClass,
    radiusMm: number
): StageLimits {
    const maxStroke = spec.strokeLimits.max;
    const solidStroke = spec.freeLength - spec.solidHeight - 0; // Clearance handled? Usually 0 here, clearance is geometric context
    const lifeLimit = lifeStrokeLimitMm(spec, life);

    // Hard Limit: Physical constraints only
    // SOLID_HEIGHT, MAX_STROKE (safety stop), SLOT_TRAVEL
    const hardLimitStrokeMm = Math.min(maxStroke, solidStroke, slotTravelMm);

    // Life Limit: Fatigue constraint
    const lifeLimitStrokeMm = lifeLimit;

    // Safe Limit: Min of Hard and Life
    const safeStrokeMm = Math.min(hardLimitStrokeMm, lifeLimitStrokeMm);

    let code: GoverningLimit["code"] = "SYSTEM_STOP";

    // Determine governing code for SAFE limit
    if (safeStrokeMm === lifeLimitStrokeMm && lifeLimitStrokeMm < hardLimitStrokeMm) {
        code = "LIFE_LIMIT";
    } else {
        // Governed by physical limit
        if (hardLimitStrokeMm === solidStroke) code = "SOLID_HEIGHT";
        else if (hardLimitStrokeMm === slotTravelMm) code = "SLOT_TRAVEL";
        else code = "MAX_STROKE";
    }

    return {
        hardLimitStrokeMm,
        lifeLimitStrokeMm,
        safeStrokeMm,
        governing: {
            code,
            limitStrokeMm: safeStrokeMm,
            limitThetaDeg: strokeToThetaDeg(safeStrokeMm, radiusMm),
        },
    };
}

// Legacy alias for backward compatibility until refactor complete
export const computeAppliedStrokeCap = (spec: DieSpringSpec, slot: number, life: DieSpringLifeClass, rad: number) => {
    const res = computeStageLimits(spec, slot, life, rad);
    return {
        hardLimitStrokeMm: res.safeStrokeMm, // Legacy expected "applied max" here
        governing: res.governing
    };
};
