/**
 * Compression Spring Multi-Point Calculator
 * 压缩弹簧多点位计算器
 * 
 * Supports L1-L5 load positions with height/deflection input modes.
 * 
 * Step 1 Implementation: Core calculation engine for multi-point analysis.
 */

// ============================================================================
// Types
// ============================================================================

/** Number of load points to analyze (3-5) */
export type LoadPointCount = 3 | 4 | 5;

/** Input mode: by compressed height or by deflection amount */
export type InputMode = "height" | "deflection";

/** Status of a load point calculation */
export type LoadPointStatus = "ok" | "warning" | "error";

/** A single load point result */
export interface LoadPointResult {
    /** Label (L1, L2, etc.) */
    label: string;
    /** Compressed height H (mm) */
    H: number;
    /** Deflection δ = H0 - H (mm) */
    delta: number;
    /** Load P at this position (N) */
    P: number;
    /** Torsion stress τk at this position (MPa) */
    Tk: number;
    /** Status: ok, warning (high stress), error (coil bind) */
    status: LoadPointStatus;
    /** Status message for display */
    statusMessage?: string;
}

/** Input parameters for multi-point calculation */
export interface CompressionMultiPointParams {
    // Basic geometry
    /** Wire diameter d (mm) */
    d: number;
    /** Mean diameter D (mm) */
    D: number;
    /** Active coils n */
    n: number;
    /** Free length H0 (mm) */
    H0: number;
    /** Solid height Hb (mm) */
    Hb: number;
    /** Shear modulus G (MPa) */
    G: number;

    // Load point configuration
    /** Number of load points (3-5) */
    loadPointCount: LoadPointCount;
    /** Input mode: height or deflection */
    inputMode: InputMode;
    /** Input values for each load point (H or δ depending on mode) */
    loadPointInputs: number[];
}

/** Full result of multi-point calculation */
export interface CompressionMultiPointResult {
    // Basic properties
    /** Spring rate k (N/mm) */
    k: number;
    /** Spring index C = D/d */
    C: number;
    /** Wahl correction factor K */
    K: number;
    /** Outer diameter De (mm) */
    De: number;
    /** Inner diameter Di (mm) */
    Di: number;
    /** Solid length / solid height Hb (mm) */
    Hb: number;
    /** Load at solid height Pb (N) */
    Pb: number;
    /** Stress at solid height τb (MPa) */
    Tkb: number;

    // Load point results
    /** Array of load point results */
    loadPoints: LoadPointResult[];
}

// ============================================================================
// Step 3: Display Modules
// ============================================================================

/** Module visibility and calculation control */
export interface DisplayModules {
    /** Always ON - basic geometry info */
    geometry: true;
    /** Load analysis at each point (P values) */
    loadAnalysis: boolean;
    /** Stress checking (τk values and stress warnings) */
    stressCheck: boolean;
    /** Solid height analysis (Hb comparison, coil bind detection) */
    solidAnalysis: boolean;
    /** Fatigue analysis (Advanced) */
    fatigue: boolean;
    /** Dynamic/frequency analysis (Advanced) */
    dynamics: boolean;
}

/** Default module settings */
export const DEFAULT_MODULES: DisplayModules = {
    geometry: true,
    loadAnalysis: true,
    stressCheck: true,
    solidAnalysis: true,
    fatigue: false,
    dynamics: false,
};

// ============================================================================
// Core Formulas
// ============================================================================

/**
 * Calculate spring rate k
 * 
 * k = (G × d⁴) / (8 × D³ × n)
 * 
 * @param G Shear modulus (MPa)
 * @param d Wire diameter (mm)
 * @param D Mean diameter (mm)
 * @param n Active coils
 * @returns Spring rate k (N/mm)
 */
export function calculateSpringRate(G: number, d: number, D: number, n: number): number {
    if (D <= 0 || d <= 0 || n <= 0) return 0;
    return (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * n);
}

/**
 * Calculate Wahl correction factor for helical springs
 * 
 * K = (4C - 1)/(4C - 4) + 0.615/C
 * where C = D/d (spring index)
 * 
 * @param C Spring index (D/d)
 * @returns Wahl factor K
 */
export function calculateWahlFactor(C: number): number {
    if (C <= 1) return 1; // Invalid, prevent division issues
    return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

/**
 * Calculate torsion stress with Wahl correction
 * 
 * τ = (8 × P × D × K) / (π × d³)
 * 
 * @param P Load (N)
 * @param D Mean diameter (mm)
 * @param d Wire diameter (mm)
 * @param K Wahl factor
 * @returns Torsion stress τ (MPa)
 */
export function calculateTorsionStress(P: number, D: number, d: number, K: number): number {
    if (d <= 0) return 0;
    return (8 * P * D * K) / (Math.PI * Math.pow(d, 3));
}

/**
 * Determine load point status
 * 
 * @param H Compressed height (mm)
 * @param Hb Solid height (mm)
 * @param Tk Torsion stress (MPa)
 * @param tau_allow Allowable stress (MPa), optional
 * @param modules Module settings for conditional checks
 * @returns Status and message
 */
export function determineLoadPointStatus(
    H: number,
    Hb: number,
    Tk: number,
    tau_allow?: number,
    modules?: DisplayModules
): { status: LoadPointStatus; message?: string } {
    const checkSolid = modules?.solidAnalysis ?? true;
    const checkStress = modules?.stressCheck ?? true;

    // Check for coil bind (solid) - only if solidAnalysis enabled
    if (checkSolid && H <= Hb) {
        return { status: "error", message: `H ≤ Hb (coil bind / 压并)` };
    }

    // Check for high stress if allowable is provided - only if stressCheck enabled
    if (checkStress && tau_allow && Tk > tau_allow) {
        return { status: "warning", message: `τ > τ_allow (${Tk.toFixed(0)} > ${tau_allow.toFixed(0)} MPa)` };
    }

    return { status: "ok" };
}

// ============================================================================
// Main Multi-Point Calculator
// ============================================================================

/**
 * Calculate all load point results
 * 
 * @param params Input parameters
 * @param tau_allow Optional allowable stress for warning detection
 * @param modules Optional module settings for conditional checks
 * @returns Full calculation result
 */
export function calculateMultiPointCompression(
    params: CompressionMultiPointParams,
    tau_allow?: number,
    modules?: DisplayModules
): CompressionMultiPointResult {
    const { d, D, n, H0, Hb, G, loadPointCount, inputMode, loadPointInputs } = params;

    // Calculate basic properties
    const k = calculateSpringRate(G, d, D, n);
    const C = D / d;
    const K = calculateWahlFactor(C);
    const De = D + d;  // Outer diameter
    const Di = D - d;  // Inner diameter

    // Calculate solid height load and stress
    const deltaSolid = H0 - Hb;
    const Pb = k * deltaSolid;
    const Tkb = calculateTorsionStress(Pb, D, d, K);

    // Process each load point
    const loadPoints: LoadPointResult[] = [];

    for (let i = 0; i < loadPointCount; i++) {
        const label = `L${i + 1}`;
        const inputValue = loadPointInputs[i] ?? 0;

        // Determine H and δ based on input mode
        let H: number;
        let delta: number;

        if (inputMode === "height") {
            // Input is compressed height H
            H = inputValue;
            delta = H0 - H;
        } else {
            // Input is deflection δ
            delta = inputValue;
            H = H0 - delta;
        }

        // Clamp delta to non-negative
        if (delta < 0) {
            delta = 0;
            H = H0;
        }

        // Calculate load and stress
        const P = k * delta;
        const Tk = calculateTorsionStress(P, D, d, K);

        // Determine status (respects module settings)
        const { status, message } = determineLoadPointStatus(H, Hb, Tk, tau_allow, modules);

        loadPoints.push({
            label,
            H,
            delta,
            P,
            Tk,
            status,
            statusMessage: message,
        });
    }

    return {
        k,
        C,
        K,
        De,
        Di,
        Hb,
        Pb,
        Tkb,
        loadPoints,
    };
}

/**
 * Create default load point inputs for a given count
 * 
 * @param count Number of points (3-5)
 * @param H0 Free length
 * @param Hb Solid height
 * @returns Array of default H values evenly distributed
 */
export function createDefaultLoadPointInputs(
    count: LoadPointCount,
    H0: number,
    Hb: number
): number[] {
    const inputs: number[] = [];
    const range = H0 - Hb;

    for (let i = 0; i < count; i++) {
        // Distribute points from 20% to 80% of deflection range
        const ratio = 0.2 + (i / (count - 1)) * 0.6;
        const H = H0 - range * ratio;
        inputs.push(Math.round(H * 100) / 100);
    }

    return inputs;
}

// ============================================================================
// Step 4: Calculation Modes & Reverse Solving
// ============================================================================

/** Calculation mode */
export type CalcMode =
    | "verification"      // 验证模式: 给定几何，计算力学
    | "targetLoad"        // 目标载荷反算: 给定 (H, P)，求 n 或 H0
    | "stiffnessSelection"; // 刚度选型: 给定候选刚度，生成多套方案

/** Target load input for reverse solving */
export interface TargetLoadInput {
    /** Target compressed height H (mm) */
    H: number;
    /** Target load P at this height (N) */
    P: number;
}

/** Result of a single stiffness option */
export interface StiffnessOptionResult {
    /** Option label (A, B, C...) */
    label: string;
    /** Target stiffness k (N/mm) */
    k: number;
    /** Required active coils n */
    n: number;
    /** Calculated free length H0 (mm) */
    H0: number;
    /** Solid height Hb (mm) */
    Hb: number;
    /** Load at target points */
    loadPoints: LoadPointResult[];
    /** Max stress across all points */
    maxTk: number;
    /** Overall status */
    status: LoadPointStatus;
    /** Is this option valid (within constraints) */
    isValid: boolean;
    /** Validation message if invalid */
    validationMessage?: string;
}

/**
 * Reverse solve: given target (H, P), find required n
 * 
 * From: P = k × δ = k × (H0 - H)
 *       k = P / (H0 - H)
 *       k = (G × d⁴) / (8 × D³ × n)
 * 
 * Solving for n:
 *       n = (G × d⁴) / (8 × D³ × k)
 *       n = (G × d⁴ × (H0 - H)) / (8 × D³ × P)
 */
export function solveActiveCoilsForTarget(
    d: number,
    D: number,
    G: number,
    H0: number,
    target: TargetLoadInput
): { n: number; k: number; isValid: boolean; message?: string } {
    const { H, P } = target;

    // Deflection at target point
    const delta = H0 - H;

    // Validate inputs
    if (delta <= 0) {
        return { n: 0, k: 0, isValid: false, message: "H ≥ H0 (无压缩)" };
    }
    if (P <= 0) {
        return { n: 0, k: 0, isValid: false, message: "P ≤ 0 (无效载荷)" };
    }

    // Required stiffness
    const k = P / delta;

    // Required active coils
    const n = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * k);

    // Validate result
    if (n < 1) {
        return { n, k, isValid: false, message: `n = ${n.toFixed(2)} < 1 (圈数过少)` };
    }
    if (n > 50) {
        return { n, k, isValid: false, message: `n = ${n.toFixed(2)} > 50 (圈数过多)` };
    }

    return { n: Math.round(n * 10) / 10, k, isValid: true };
}

/**
 * Reverse solve: given target (H, P) and n, find required H0
 * 
 * H0 = H + P / k = H + P × (8 × D³ × n) / (G × d⁴)
 */
export function solveFreeLength(
    d: number,
    D: number,
    n: number,
    G: number,
    target: TargetLoadInput
): { H0: number; k: number; isValid: boolean; message?: string } {
    const { H, P } = target;

    // Spring rate with given n
    const k = calculateSpringRate(G, d, D, n);

    if (k <= 0) {
        return { H0: 0, k: 0, isValid: false, message: "刚度计算无效" };
    }

    // Required deflection
    const delta = P / k;

    // Required free length
    const H0 = H + delta;

    // Validate
    if (H0 <= H) {
        return { H0, k, isValid: false, message: "H0 ≤ H (自由长度过短)" };
    }

    return { H0: Math.round(H0 * 100) / 100, k, isValid: true };
}

/**
 * Generate multiple design options for candidate stiffness values
 * 
 * For each k, solve required n and calculate full results
 */
export function generateStiffnessOptions(
    d: number,
    D: number,
    G: number,
    H0: number,
    totalCoils: number,
    candidateStiffnesses: number[],
    loadPointInputs: number[],
    inputMode: InputMode = "height",
    modules?: DisplayModules
): StiffnessOptionResult[] {
    const options: StiffnessOptionResult[] = [];
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];

    for (let i = 0; i < candidateStiffnesses.length; i++) {
        const targetK = candidateStiffnesses[i];
        const label = labels[i] || `${i + 1}`;

        // Solve required n for this stiffness
        // k = (G × d⁴) / (8 × D³ × n) => n = (G × d⁴) / (8 × D³ × k)
        const n = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * targetK);

        // Validate n
        let isValid = true;
        let validationMessage: string | undefined;

        if (n < 1) {
            isValid = false;
            validationMessage = `n = ${n.toFixed(2)} < 1`;
        } else if (n > 50) {
            isValid = false;
            validationMessage = `n = ${n.toFixed(2)} > 50`;
        }

        // Calculate total coils (estimate: active + 2 dead ends)
        const estimatedTotalCoils = n + 2;
        const Hb = estimatedTotalCoils * d;

        // Validate solid height
        if (isValid && Hb >= H0) {
            isValid = false;
            validationMessage = `Hb = ${Hb.toFixed(1)} ≥ H0`;
        }

        // Calculate load points for this option
        const result = calculateMultiPointCompression(
            {
                d,
                D,
                n: Math.round(n * 10) / 10,
                H0,
                Hb,
                G,
                loadPointCount: loadPointInputs.length as LoadPointCount,
                inputMode,
                loadPointInputs,
            },
            undefined,
            modules
        );

        // Find max stress
        const maxTk = Math.max(...result.loadPoints.map((lp) => lp.Tk));

        // Overall status
        const hasError = result.loadPoints.some((lp) => lp.status === "error");
        const hasWarning = result.loadPoints.some((lp) => lp.status === "warning");
        const overallStatus: LoadPointStatus = hasError ? "error" : hasWarning ? "warning" : "ok";

        options.push({
            label,
            k: targetK,
            n: Math.round(n * 10) / 10,
            H0,
            Hb,
            loadPoints: result.loadPoints,
            maxTk,
            status: overallStatus,
            isValid,
            validationMessage,
        });
    }

    return options;
}

/** Default candidate stiffnesses for selection mode */
export const DEFAULT_CANDIDATE_STIFFNESSES = [2.5, 3.0, 3.5, 4.0, 4.5];
