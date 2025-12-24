import { DiskSpringDesign } from "../springTypes";

export interface DiskCurvePoint {
    s: number;         // deflection mm
    F_single: number;  // N
    F_stack: number;   // N
    k_single: number;  // N/mm
    k_stack: number;
    W_single: number;  // N*mm (Work/Energy)
    W_stack: number;
    sigma_eq?: number; // Equivalent stress MPa
    ratio?: number;    // stress ratio
}

export interface DiskSpringResult {
    curve: DiskCurvePoint[];
    points: {
        preload: DiskCurvePoint;
        work: DiskCurvePoint;
        max: DiskCurvePoint;
    };
    meta: {
        Dm: number;         // mean diameter
        sLimit: number;     // h0
        sigmaAllow: number; // 0.65 * Sy
    };
    designRules: {
        geometryOk: boolean;
        flattening: "OK" | "WARN" | "FAIL";
        stress: "OK" | "WARN" | "FAIL";
        stacking: "OK" | "WARN";
        notes: string[];
    };
}

/**
 * Calculate Disk Spring based on DIN 2092 basic model
 * @param input Disk spring parameters
 */
export function calculateDiskSpring(input: DiskSpringDesign): DiskSpringResult {
    const {
        outerDiameter: De,
        innerDiameter: Di,
        thickness: t,
        freeConeHeight: h0,
        parallelCount: nP = 1,
        seriesCount: nS = 1,
        deflectionPreload: s_pre = 0,
        deflectionOperating: s_work = 0,
        deflectionMax: sMaxInput = 0,
        elasticModulus: E = 206000,
        poissonRatio: nu = 0.3,
        yieldStrength: Sy = 1200,
    } = input;

    const delta = De / Di;
    const Dm = (De + Di) / 2;
    const sigmaAllow = 0.65 * Sy;

    // DIN 2092 Factors (Simplified for V1)
    const K1 = (1 / Math.PI) * ((delta - 1) / delta) ** 2 / ((delta + 1) / (delta - 1) - 2 / Math.log(delta));
    // Note: Modern DIN 2092 uses more complex K1/K2/K3/K4. 
    // This is a robust engineering approximation for V1.

    const factor = (4 * E) / (1 - nu ** 2) * (t ** 4 / (K1 * Dm ** 2));

    const calcPoint = (s_total: number): DiskCurvePoint => {
        // Current point on total stack. Map to single disk deflection.
        const s = s_total / nS;

        // Almen-Laszlo equation for Disk Spring Force (single)
        // F = (4E / (1-nu^2)) * (t^4 / (K1*Dm^2)) * (s/t) * [(h0/t - s/t)*(h0/t - s/2t) + 1]
        const st = s / t;
        const h0t = h0 / t;

        const F_single = factor * st * ((h0t - st) * (h0t - st / 2) + 1);
        const F_stack = F_single * nP;

        // Numerical stiffness k = dF/ds
        // Formula derivation: k = factor/t * [ (h0/t - s/t)*(h0/t - s/2t) + 1 + (s/t)*(-1*(h0/t - s/2t) + (h0/t - s/t)*(-1/2))]
        const k_single = (factor / t) * ((h0t - st) * (h0t - st / 2) + 1 + st * (-1 * (h0t - st / 2) - 0.5 * (h0t - st)));
        const k_stack = (k_single * nP) / nS;

        // Energy W = integral(F ds) 
        // Simplified trapezoidal approximation used in curve loop, 
        // but for discrete point we use the analytical integral of Almen-Laszlo if possible.
        // W = factor * integral( (s/t * (h0^2/t^2 - 1.5*s*h0/t^2 + 0.5*s^2/t^2) + s/t) ds )
        // W = factor * [ (h0^2/t^2 + 1)*s^2/(2t) - 1.5*h0*s^3/(3t^2) + 0.5*s^4/(4t^3) ]
        const W_single = factor * ((h0t ** 2 + 1) * s ** 2 / (2 * t) - 0.5 * h0t * s ** 3 / (t ** 2) + 0.125 * s ** 4 / (t ** 3));
        const W_stack = W_single * nP * nS;

        // Stress calculation (Simplified scalar: sigma at point OM)
        // sigma = (4E/(1-nu^2)) * (t^2 / (K1*Dm^2)) * K2 * (s/t) * [K3*(h0/t - s/2t) + K4]
        // For V1, we approximate stress ratio using force/height linearity if no K2/K3 available
        const sigma_eq = (F_single * Dm) / (t ** 2); // Dummy proxy for V1 stress scaling

        return {
            s: s_total,
            F_single,
            F_stack,
            k_single,
            k_stack,
            W_single,
            W_stack,
            sigma_eq,
            ratio: sigma_eq / sigmaAllow
        };
    };

    // Generate Curve
    const curve: DiskCurvePoint[] = [];
    const steps = 100;
    const sMaxTotal = h0 * nS;
    for (let i = 0; i <= steps; i++) {
        const s = (sMaxTotal * i) / steps;
        curve.push(calcPoint(s));
    }

    const result: DiskSpringResult = {
        curve,
        points: {
            preload: calcPoint(s_pre),
            work: calcPoint(s_work),
            max: calcPoint(sMaxInput),
        },
        meta: {
            Dm,
            sLimit: h0 * nS,
            sigmaAllow,
        },
        designRules: {
            geometryOk: De > Di && t > 0,
            flattening: sMaxInput >= h0 * nS * 0.95 ? "FAIL" : sMaxInput >= h0 * nS * 0.75 ? "WARN" : "OK",
            stress: (calcPoint(sMaxInput).ratio || 0) > 1 ? "FAIL" : (calcPoint(sMaxInput).ratio || 0) > 0.8 ? "WARN" : "OK",
            stacking: nP > 5 || nS > 10 ? "WARN" : "OK",
            notes: [],
        },
    };

    if (result.designRules.flattening !== "OK") {
        result.designRules.notes.push("Deflection is nearing or exceeding free cone height.");
    }
    if (nP > 1) {
        result.designRules.notes.push(`Stacking parallel: Total force is multiplied by ${nP}. Efficiency may decrease due to friction.`);
    }

    return result;
}
