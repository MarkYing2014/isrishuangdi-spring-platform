import { GarterSpringDesign } from "@/lib/springTypes/garter";

/**
 * Garter Spring Analytical Engine V2 (Equivalent Unwrapped Model) - FINAL V2
 *
 * MODEL:
 * - Treat ring circumference change as axial deflection: ΔL = π * ΔD
 * - Linear spring stiffness: k_ax = G d^4 / (8 Dm^3 Na), with Na = N (V2 locked)
 * - Hoop tension: Ft = k_ax * ΔL
 * - Stress: τ = jointFactor * Kw * (8 Ft Dm)/(π d^3)
 *
 * POLICY (V2 LOCKED):
 * - Na = N
 * - jointFactor acts as stress multiplier ONLY (does not change Ft)
 * - allowableStress = 0.65 * Sy if Sy provided; otherwise WARN
 * - Stable Kw with C clamp
 */

export interface GarterV2Inputs {
    d: number;      // wire diameter (mm)
    Dm: number;     // coil mean diameter (mm)
    N: number;      // turns around ring (effective coils in V2)
    D_free: number; // free ring diameter (mm)
    D_inst: number; // installed ring diameter (mm)
    G: number;      // shear modulus (MPa = N/mm^2)
    jointType: "hook" | "screw" | "loop";
    jointFactor: number;        // >= 1 typically (stress multiplier)
    tensileStrength?: number;   // Sy (MPa)
}

export type AuditStatus = "PASS" | "WARN" | "FAIL";
export type DirectionLabel = "Extend" | "Compress" | "Neutral";

export interface GarterV2Policy {
    // thresholds
    warnRatio: number; // e.g. 0.85
    failRatio: number; // e.g. 1.00
    // geometry checks
    Cmin: number;      // e.g. 4
    Cmax: number;      // e.g. 20
    // plot settings
    plotSteps: number; // e.g. 60
    deltaDMax: number; // e.g. 30 (mm) hard cap for curves
    // allowable strategy
    allowFactorSy: number; // e.g. 0.65
}

export const GARTER_POLICY_V2: GarterV2Policy = {
    warnRatio: 0.85,
    failRatio: 1.0,
    Cmin: 4,
    Cmax: 20,
    plotSteps: 60,
    deltaDMax: 30,
    allowFactorSy: 0.65,
};

export interface GarterV2Results {
    k_ax: number;         // N/mm
    deltaD: number;       // signed mm (D_inst - D_free)
    deltaD_mag: number;   // magnitude mm
    deltaL: number;       // signed mm
    direction: DirectionLabel;

    forceTension: number; // Ft (N) signed (follows deltaL sign)
    forceAbs: number;     // |Ft| (N)

    springIndex: number;  // C
    wahlFactor: number;   // Kw
    maxShearStress: number; // τ_max (MPa) magnitude (always >=0)

    audit: {
        status: AuditStatus;
        ratio: number;          // τ/allow (0~)
        safetyFactor: number;   // allow/τ
        allowableStress?: number;
        governingMode: string;
        notes: string[];
    };

    curves: {
        forceAbs: { x: number; y: number }[];  // x=|ΔD|, y=|Ft|
        stress: { x: number; y: number }[];    // x=|ΔD|, y=τ
    };
}

export function computeGarterV2(
    inputs: GarterV2Inputs,
    policy: GarterV2Policy = GARTER_POLICY_V2
): GarterV2Results {
    const notes: string[] = [];

    const d = inputs.d;
    const Dm = inputs.Dm;
    const N = Math.max(1, inputs.N);
    const G = inputs.G;
    const jointFactor = Math.max(0.5, inputs.jointFactor || 1);

    // --- Geometry / checks ---
    let C = Dm / d;
    if (!Number.isFinite(C) || C <= 0) C = 0;

    // Wahl stability guard near C=4
    if (C > 0 && C < 4.05) {
        notes.push(`Spring index C too low (${C.toFixed(2)}). Clamped to 4.05 for Kw stability.`);
        C = 4.05;
    }

    const Kw = C > 0 ? (4 * C - 1) / (4 * C - 4) + 0.615 / C : NaN;

    // V2 Policy: Na = N
    const Na = N;

    // k_ax (N/mm) since G is MPa (N/mm^2)
    const k_ax = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);

    // signed deltaD and deltaL
    const deltaD = inputs.D_inst - inputs.D_free; // signed
    const deltaD_mag = Math.abs(deltaD);
    const deltaL = Math.PI * deltaD; // signed
    const direction: DirectionLabel =
        Math.abs(deltaD) < 1e-9 ? "Neutral" : deltaD > 0 ? "Extend" : "Compress";

    // Hoop tension (signed)
    const Ft = k_ax * deltaL;          // signed
    const FtAbs = Math.abs(Ft);

    // Stress magnitude: τ = jointFactor * Kw * 8*|Ft|*Dm/(π d^3)
    const tauNominal =
        Kw * (8 * FtAbs * Dm) / (Math.PI * Math.pow(d, 3));
    const tauMax = tauNominal * jointFactor;

    // Allowable (if no Sy -> WARN)
    let allowableStress: number | undefined = undefined;
    if (inputs.tensileStrength && inputs.tensileStrength > 0) {
        allowableStress = policy.allowFactorSy * inputs.tensileStrength;
    } else {
        notes.push("Material strength Sy not provided. Allowable stress unavailable; audit downgraded to WARN.");
    }

    // ratio & sf
    const ratio =
        allowableStress && allowableStress > 0 ? tauMax / allowableStress : NaN;
    const sf =
        allowableStress && allowableStress > 0 && tauMax > 0 ? allowableStress / tauMax : NaN;

    // status
    let status: AuditStatus = "PASS";
    if (!Number.isFinite(k_ax) || k_ax <= 0) {
        status = "FAIL";
        notes.push("Invalid stiffness (k_ax). Check inputs d, Dm, N, G.");
    }
    if (!Number.isFinite(Kw) || Kw <= 0) {
        status = "FAIL";
        notes.push("Invalid Wahl factor Kw. Check spring index C and geometry.");
    }

    // C range check (doesn't auto-fail; warn unless already fail)
    if (C < policy.Cmin || C > policy.Cmax) {
        if (status !== "FAIL") status = "WARN";
        notes.push(`Spring index C out of recommended range [${policy.Cmin}, ${policy.Cmax}].`);
    }

    if (Number.isFinite(ratio)) {
        if (ratio >= policy.failRatio) status = "FAIL";
        else if (ratio >= policy.warnRatio && status !== "FAIL") status = "WARN";
    } else {
        if (status !== "FAIL") status = "WARN";
    }

    // --- Curves (x = |ΔD|) ---
    const steps = Math.max(20, policy.plotSteps);
    const plotMax = Math.min(
        Math.max(deltaD_mag * 1.5, 0.0),
        policy.deltaDMax
    );

    const curveForceAbs: { x: number; y: number }[] = [];
    const curveStress: { x: number; y: number }[] = [];

    for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * plotMax;    // |ΔD|
        const dL = Math.PI * x;             // |ΔL|
        const F = Math.abs(k_ax) * dL;      // |Ft|
        const S = (Kw * (8 * F * Dm) / (Math.PI * Math.pow(d, 3))) * jointFactor;
        curveForceAbs.push({ x, y: F });
        curveStress.push({ x, y: S });
    }

    return {
        k_ax,
        deltaD,
        deltaD_mag,
        deltaL,
        direction,

        forceTension: Ft,
        forceAbs: FtAbs,

        springIndex: C,
        wahlFactor: Kw,
        maxShearStress: tauMax,

        audit: {
            status,
            ratio,
            safetyFactor: sf,
            allowableStress,
            governingMode: "Helical Shear (Wahl) + JointFactor",
            notes,
        },

        curves: {
            forceAbs: curveForceAbs,
            stress: curveStress,
        },
    };
}
