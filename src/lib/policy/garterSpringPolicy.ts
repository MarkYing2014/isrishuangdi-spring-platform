// lib/policy/garterSpringPolicy.ts
// PLATFORM STANDARD V1.0 (Factory Mode)
// Garter Spring (Oil Seal Spring) — locked policy like ARC_SPRING_FACTORY_POLICY

export type GarterJointType = "hook" | "screw" | "loop";

export type GarterPolicy = {
    name: string;
    version: string;

    // --- Units & governing variable ---
    governingVariable: "ΔC" | "ΔD";
    defaultCurvePoints: number;

    // --- Allowable stress strategy (LOCKED) ---
    // Allowable shear stress = allowSyFactor * Sy
    allowSyFactor: number; // e.g., 0.65
    minAllowableMPa: number; // clamp lower bound
    maxAllowableMPa: number; // clamp upper bound

    // --- Joint correction defaults (LOCKED) ---
    jointFactor: Record<GarterJointType, number>;
    // When user provides an override, do we allow it?
    allowJointFactorOverride: boolean;

    // --- Geometry & install delta limits (LOCKED) ---
    // ΔD limit as percent of D_free (absolute magnitude)
    maxDeltaDPercent: number; // e.g., 0.10 = 10%
    // hard cap to avoid nonsense even if D is small
    maxDeltaDmmHardCap: number; // e.g., 8mm

    // --- Spring index limits (LOCKED) ---
    minSpringIndexC: number; // e.g., 4
    maxSpringIndexC: number; // e.g., 15

    // --- Audit thresholds (LOCKED) ---
    ratioWarn: number; // e.g., 0.80
    ratioFail: number; // e.g., 1.00
    // install direction rules
    requireTensionInstall: boolean; // installed >= free is "tension install" for garter ring

    // --- Behavior & display ---
    showRadialEstimate: boolean;
    radialEstimateLabel: "Ft (primary)" | "Fr_est (secondary)";
};

export const GARTER_SPRING_FACTORY_POLICY: GarterPolicy = {
    name: "Garter Spring Factory Standard",
    version: "V1.0",

    // Engineering variable: use ΔC as global standard (matches your cross-type audit concept)
    governingVariable: "ΔC",
    defaultCurvePoints: 60,

    // Allowable: LOCKED to 0.65 Sy (same style as Arc Spring policy)
    allowSyFactor: 0.65,
    // Clamp to keep UI stable if material table is missing/odd
    minAllowableMPa: 300,
    maxAllowableMPa: 1400,

    // Joint correction defaults (industry typical as V1 policy; adjustable later by factory)
    jointFactor: {
        hook: 1.40,
        screw: 1.20,
        loop: 1.30,
    },
    allowJointFactorOverride: false,

    // Install delta limits: typical garter install stretch is small; V1 lock to 10% with hard cap
    maxDeltaDPercent: 0.10,
    maxDeltaDmmHardCap: 8,

    // Spring index C range for manufacturability & stress concentration sanity
    minSpringIndexC: 4,
    maxSpringIndexC: 15,

    // Audit thresholds
    ratioWarn: 0.80,
    ratioFail: 1.00,
    requireTensionInstall: true,

    // UI behavior
    showRadialEstimate: true,
    radialEstimateLabel: "Ft (primary)",
};

// Helpers
export function clampAllowableMPa(allow: number) {
    return Math.min(
        GARTER_SPRING_FACTORY_POLICY.maxAllowableMPa,
        Math.max(GARTER_SPRING_FACTORY_POLICY.minAllowableMPa, allow)
    );
}

export function getDefaultJointFactor(jointType: GarterJointType) {
    return GARTER_SPRING_FACTORY_POLICY.jointFactor[jointType];
}

export function calcAllowableShearFromSy(SyMPa: number) {
    const raw = GARTER_SPRING_FACTORY_POLICY.allowSyFactor * SyMPa;
    return clampAllowableMPa(raw);
}

export function deltaDLimitMM(Dfree: number) {
    const pct = Math.abs(Dfree) * GARTER_SPRING_FACTORY_POLICY.maxDeltaDPercent;
    return Math.min(pct, GARTER_SPRING_FACTORY_POLICY.maxDeltaDmmHardCap);
}
