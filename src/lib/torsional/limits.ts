
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

export function computeAppliedStrokeCap(
    spec: DieSpringSpec,
    slotTravelMm: number,
    life: DieSpringLifeClass,
    radiusMm: number
): { hardLimitStrokeMm: number; governing: GoverningLimit } {
    const maxStroke = spec.strokeLimits.max;
    const solidStroke = spec.freeLength - spec.solidHeight;
    const lifeLimit = lifeStrokeLimitMm(spec, life);

    const physicalCap = Math.min(maxStroke, solidStroke, slotTravelMm);
    const applied = Math.min(physicalCap, lifeLimit);

    let code: GoverningLimit["code"] =
        applied === lifeLimit
            ? "LIFE_LIMIT"
            : applied === solidStroke
                ? "SOLID_HEIGHT"
                : applied === maxStroke
                    ? "MAX_STROKE"
                    : "SLOT_TRAVEL";

    return {
        hardLimitStrokeMm: applied,
        governing: {
            code,
            limitStrokeMm: applied,
            limitThetaDeg: strokeToThetaDeg(applied, radiusMm),
        },
    };
}
