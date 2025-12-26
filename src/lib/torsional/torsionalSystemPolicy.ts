/**
 * Torsional Spring System - Factory Policy V1 (LOCKED)
 * 
 * Defined according to ISRI / OEM engineering standards.
 */

export const TORSIONAL_SYSTEM_POLICY_V1 = {
    name: "Torsional System Factory Standard",
    version: "V1.0",

    // τ_allow = 0.65 * Sy
    allowableStressRatio: 0.65,

    // Stress clamping limits [MPa]
    allowableClampMin: 300,
    allowableClampMax: 1400,

    // Spring Index C = Dm / d
    springIndexRange: {
        min: 4,
        max: 20
    },

    // Kθ_stop = Kθ * 1000
    stopMultiplier: 1000,

    // Scaling for Rigid contact modeling
    rigidStiffnessFactor: 1000,

    // Sy fallback if material data is missing (0.65 * Sm)
    fallbackYieldRatio: 0.65,

    // Missing material policy
    missingMaterialPolicy: "WARN_ONLY" as const,

    // Analysis Resolution
    defaultSamples: 150,

    // UI Display Precision
    precisionTorque: 1,  // Nm
    precisionAngle: 1,   // deg
    precisionStiffness: 2, // Nm/deg
};
