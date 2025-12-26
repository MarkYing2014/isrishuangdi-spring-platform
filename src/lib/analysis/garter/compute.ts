import { computeGarterV2 } from "@/lib/engine/garterV2";
import type { GarterV2Inputs, GarterAnalyticalResult } from "./types";

export function computeGarterAnalytical(inputs: GarterV2Inputs): GarterAnalyticalResult {
    const r = computeGarterV2(inputs);

    return {
        model: "unwrapped-v2",
        k_ax: r.k_ax,
        deltaD_signed: inputs.D_inst - inputs.D_free,
        deltaD: r.deltaD,
        deltaL: r.deltaL,
        forceTension: r.forceTension,
        forceEffective: r.forceAbs,
        maxShearStress: r.maxShearStress,
        springIndex: r.springIndex,
        wahlFactor: r.wahlFactor,
        curves: {
            force: r.curves.forceAbs, // Mapped to forceAbs from garterV2
            stress: r.curves.stress,
        },
    };
}
