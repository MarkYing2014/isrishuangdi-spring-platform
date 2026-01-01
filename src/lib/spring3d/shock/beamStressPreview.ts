/**
 * Beam Stress Preview Module (Phase 5.1)
 * 
 * Purpose:
 * Fast, engineering-grade estimation of torsional shear stress along the spring centerline.
 * Used for real-time visualization and safety checks.
 * 
 * Method:
 * Wahl-Corrected Torsional Shear Stress (Helical Spring Theory)
 * tau = Kw * (8 * P * D) / (pi * d^3)
 */

export type StressCriterion = "yieldShear" | "ultimateShear";

export interface BeamStressConfig {
    // Material Limits
    tensileStrength: number; // Su (MPa)
    shearYield?: number;     // Ssy (MPa), default approx 0.577 * Sy or 0.45 Su? 
    // User prompt suggests Ssy approx 0.577 Sy or 0.67 Su for Sus.
    // Let's use simplified inputs: Su is guaranteed.

    // Geometry Arrays
    D: Float32Array; // Mean Diameter (mm) aligned with samples
    d: Float32Array; // Wire Diameter (mm) aligned with samples

    // Active Mask (Optional)
    activeMask?: boolean[]; // true = active, false = dead coil (ignore for min SF?)
}

// Result for a single load P
export interface BeamStressResult {
    tau: Float32Array; // MPa for each sample
    sf: Float32Array;  // Safety Factor for each sample

    maxTau: number;    // MPa
    minSF: number;     // Minimum SF (active coils only usually)

    criticalIndex: number; // Index of worst case
    tauAllow: number;      // The allowable limit used (MPa)
}

/**
 * Computes stress field for a given Load P
 */
export function computeBeamStress(
    P: number,
    config: BeamStressConfig
): BeamStressResult {
    const { D, d, tensileStrength, activeMask } = config;
    const n = D.length;

    // outputs
    const tauArr = new Float32Array(n);
    const sfArr = new Float32Array(n);

    // Limits
    // Engineering Standard:
    // Allowable Shear Stress for "Safety Factor" often against Yield.
    // S_sy approx 0.577 * S_yield. 
    // S_yield approx 0.9 * Su (for high strength spring steel).
    // So S_sy approx 0.52 * Su. 
    // Or Conservative: S_shear_yield ~ 0.5 * Su.
    // Let's use: tauAllow = 0.5 * Su (Simple Conservative Yield Criterion)
    // The user suggested Ssy ~ 0.577 Sy. 
    // Let's assume we validate against "Static Yield".
    const tauAllow = 0.5 * tensileStrength;

    const absP = Math.abs(P);

    let maxTau = 0;
    let minSF = 9999;
    let criticalIndex = 0;

    for (let i = 0; i < n; i++) {
        const Di = D[i];
        const di = d[i];

        // Guard div/0
        if (di < 1e-6 || Di < 1e-6) {
            tauArr[i] = 0;
            sfArr[i] = 999;
            continue;
        }

        // Spring Index
        const C = Di / di;

        // Wahl Factor
        // Kw = (4C - 1)/(4C - 4) + 0.615/C
        let Kw = 1.0;
        if (C > 1.2) { // Avoid singularity near C=1
            Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
        }

        // Shear Stress
        // tau = Kw * 8 P D / (pi d^3)
        const tau = Kw * (8 * absP * Di) / (Math.PI * Math.pow(di, 3));

        tauArr[i] = tau;

        // SF
        const sf = tau > 1e-3 ? tauAllow / tau : 9999;
        sfArr[i] = sf;

        // Stats (Consider only if active? usually peak stress matters regardless, but closed ends might share load differently. 
        // For simple beam model, we assume P flows through all.
        // In reality, if P > P_solid, contact alters distribution. 
        // But for visualizer P(x), P is the equilibrium force.
        // Dead coils might not carry full P if they are fully supported? 
        // No, dead coils carry full P, they just don't deflect.

        if (tau > maxTau) {
            maxTau = tau;
            criticalIndex = i;
        }

        if (sf < minSF) {
            minSF = sf;
        }
    }

    return {
        tau: tauArr,
        sf: sfArr,
        maxTau,
        minSF,
        criticalIndex,
        tauAllow
    };
}
