/* =========================================================
 * Wave Spring – Quick Engineering Analysis (Phase 0)
 * Analytical + FEA-calibrated coefficients
 *
 * PURPOSE:
 * - Fast, stable, demo-grade engineering evaluation
 * - Correct stress magnitude (no fake 2000+ MPa)
 * - Ready to be replaced by CalculiX backend later
 * ========================================================= */

export interface WaveSpringInput {
    outerDiameter: number;     // Do (mm)
    innerDiameter: number;     // Di (mm)
    thickness: number;         // t (mm)
    width: number;             // b (mm)
    freeHeight: number;        // H0 (mm)
    workingDeflection: number; // Δx (mm)
    totalLoad: number;         // F (N)

    wavesPerTurn: number;      // nW
    turns: number;             // Nt

    material: {
        elasticModulus: number;  // E (MPa)
        yieldStrength: number;   // Sy (MPa)
    };
}

export interface WaveSpringQuickResult {
    stiffness: number;               // k (N/mm) at working point
    stiffnessCurve: { x: number; k: number; load: number; stress: number }[]; // Expanded for plotting

    maxStress: number;               // σ_max (MPa)
    stressRatio: number;             // σ / Sy
    safetyFactor: number;

    flattenMargin: number;           // mm
    designStatus: "PASS" | "WARNING" | "FAIL";

    notes: string[];
}

/* =============================
 * Main Entry
 * ============================= */

export function analyzeWaveSpringQuick(
    input: WaveSpringInput
): WaveSpringQuickResult {

    const {
        outerDiameter,
        innerDiameter,
        thickness,
        width,
        freeHeight,
        workingDeflection,
        totalLoad,
        wavesPerTurn,
        turns,
        material,
    } = input;

    /* ---------------------------------
     * Geometry
     * --------------------------------- */
    const Dm = (outerDiameter + innerDiameter) / 2;

    const nTotalWaves = wavesPerTurn * turns;

    /* ---------------------------------
     * Engineering coefficients
     * (calibrated from shell FEA trends)
     * --------------------------------- */
    const etaLoadShare = 0.75;   // 有效承载波峰比例
    const kL = 0.30;             // 等效弯梁长度比例
    const kM = 1.20;             // 弯矩放大系数
    const alphaNonlinear = 0.8;  // k(x) 非线性增强

    /* ---------------------------------
     * Effective load per crest
     * --------------------------------- */
    const Neff = etaLoadShare * nTotalWaves;
    const Fi = totalLoad / Neff;

    /* ---------------------------------
     * Equivalent bending beam
     * --------------------------------- */
    const Leff = Math.PI * Dm / wavesPerTurn * kL; // mm
    const Mmax = Fi * Leff * kM;                    // N·mm

    /* ---------------------------------
     * Section modulus (rectangular)
     * --------------------------------- */
    const Z = width * thickness * thickness / 6;   // mm³

    /* ---------------------------------
     * Max bending stress
     * --------------------------------- */
    const sigmaMax = Mmax / Z; // MPa (N/mm²)

    const stressRatio = sigmaMax / material.yieldStrength;
    const safetyFactor = stressRatio > 0 ? 1 / stressRatio : 999;

    /* ---------------------------------
     * Stiffness (Linear Base Rate)
     * --------------------------------- */
    // Note: input.totalLoad is the load at workingDeflection
    // So the secant rate is totalLoad / workingDeflection
    // But let's assume k0 based on this working point for simplicity in Phase 0
    const k0 = totalLoad / workingDeflection;

    /* ---------------------------------
     * k(x) curve (demo-grade but realistic)
     * --------------------------------- */
    // Need to expand to include Load and Stress for plotting
    const stiffnessCurve: { x: number; k: number; load: number; stress: number }[] = [];
    const steps = 20;

    // Solid Check
    const estimatedSolidHeight = thickness * (turns + 1);
    const maxTravel = freeHeight - estimatedSolidHeight;

    for (let i = 0; i <= steps; i++) {
        const x = (maxTravel / steps) * i; // Plot up to solid
        // Non-linear model: F = k0 * x * (1 + 0.5 * alpha * x/H_free) ?
        // User logic: kx = k0 * (1 + alpha * x / H0)
        // Fx = Integral(kx dx) = k0*x + k0*alpha*x^2/(2*H0)
        // Let's use user's kx formula for stiffness, and integrate for Load.

        // Normalized deflection ratio relative to Free Height
        const ratio = x / freeHeight;
        const tangentStiffness = k0 * (1 + alphaNonlinear * ratio);

        // Load F(x) approx
        const load = k0 * x * (1 + 0.5 * alphaNonlinear * ratio);

        // Stress approx (Scaling linearly with Load)
        // sigma / sigmaMax = load / totalLoad (at working point)
        // Careful: totalLoad corresponds to workingDeflection
        const stress = (load / totalLoad) * sigmaMax;

        stiffnessCurve.push({
            x: Number(x.toFixed(2)),
            k: Number(tangentStiffness.toFixed(2)),
            load: Number(load.toFixed(1)),
            stress: Number(stress.toFixed(1))
        });
    }

    /* ---------------------------------
     * Flatten / solid height check
     * --------------------------------- */
    const flattenMargin = freeHeight - workingDeflection - estimatedSolidHeight;

    /* ---------------------------------
     * Design status logic
     * --------------------------------- */
    let designStatus: "PASS" | "WARNING" | "FAIL" = "PASS";

    if (stressRatio > 0.8 || flattenMargin < 0) {
        designStatus = "FAIL";
    } else if (stressRatio > 0.6) {
        designStatus = "WARNING";
    }

    /* ---------------------------------
     * Notes (very important for trust)
     * --------------------------------- */
    const notes: string[] = [
        "Analytical crest-bending model (beam-equivalent)",
        "Load shared by effective wave crests",
        "Coefficients calibrated against shell FEA trends",
        "Quick analysis – not full contact FEA",
    ];

    if (designStatus !== "PASS") {
        notes.push("Design exceeds recommended elastic operating range");
    }

    return {
        stiffness: k0,
        stiffnessCurve,
        maxStress: sigmaMax,
        stressRatio,
        safetyFactor,
        flattenMargin,
        designStatus,
        notes,
    };
}
