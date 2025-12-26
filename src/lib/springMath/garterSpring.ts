
import { GarterSpringDesign, GarterCalculationResult } from "../springTypes/garter";
import { getSpringMaterial, getDefaultSpringMaterial } from "../materials/springMaterials";

/**
 * Calculate Garter Spring Properties (V1 Linear Model)
 * 
 * Theory:
 * 1. Treat the garter spring as a long extension spring with initial length L0.
 * 2. When formed into a ring, L_free_circumference = L0 = π * D_ring_free.
 * 3. When installed on a shaft D_installed, the new length is L_installed = π * D_installed.
 * 4. Deflection Δx (circumferential change) = L_installed - L0.
 * 5. Tension Ft = k_axial * Δx.
 * 6. Stress is calculated from Ft (wire tension).
 *    Note: The "joint factor" increases local stress near the connection.
 */

export interface GarterInput {
    geometry: GarterSpringDesign;
    installedDiameter?: number; // Override geometry.ringInstalledDiameter if needed
    allowableStressRatio?: number; // e.g. 0.45 or 0.65 of Tensile
}

export function calculateGarterSpring(input: GarterInput): GarterCalculationResult {
    const { geometry, installedDiameter, allowableStressRatio } = input;

    const d = geometry.wireDiameter;
    const Dm = geometry.meanDiameter;
    const Na = geometry.activeCoils;
    const G = geometry.shearModulus;
    const D_free = geometry.ringFreeDiameter;
    const D_installed = installedDiameter ?? geometry.ringInstalledDiameter ?? D_free;

    // 1. Spring Index
    const C = Dm / d;

    // 2. Wahl Factor
    const wahlFactor = (4 * C - 1) / (4 * C - 4) + 0.615 / C;

    // 3. Axial Stiffness (k) - Standard linear spring formula
    // k = (G * d^4) / (8 * Dm^3 * Na)
    const k_axial = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);

    // 4. Circumferential Change (Deflection)
    // ΔC = π * (D_installed - D_free)
    const circumferenceFree = Math.PI * D_free;
    const circumferenceInstalled = Math.PI * D_installed;
    const deltaC = circumferenceInstalled - circumferenceFree; // This is the extension 'x'

    // 5. Tension (Axial Force in Wire)
    // Ft = k * x
    // Note: V1 ignores initial tension (Fi) for simplicity unless requested later.
    const tension = k_axial * deltaC;

    // 6. Stress Calculation
    // Nominal Shear: τ0 = (8 * Ft * Dm) / (π * d^3)
    // Max Shear: τ = Kw * τ0
    const nominalShear = (8 * tension * Dm) / (Math.PI * Math.pow(d, 3));
    let maxShear = wahlFactor * nominalShear;

    // Joint Factor Correction
    // Default factors if not provided: Hook=1.4, Screw=1.2, Loop=1.3
    let jointK = geometry.jointFactor;
    if (!jointK) {
        switch (geometry.jointType) {
            case "screw": jointK = 1.2; break;
            case "loop": jointK = 1.3; break;
            case "hook":
            default:
                jointK = 1.4; break;
        }
    }

    // Apply joint factor to the relevant stress? 
    // Usually joint stress is the limiting factor. 
    // We report the HIGHEST stress the spring sees.
    maxShear = maxShear * jointK;

    // 7. Radial Force Estimate (Simple thin-wall hoop stress analogy or specific Garter formula)
    // Fr (Radial Load per unit length?) or Total Radial Force?
    // Common formula: Radial Load P = (2 * Ft) / D_installed  (Force per mm of circumference? No, this is pressure logic)
    // 
    // Interpreting "Radial Pressure" request from user: "Fr ≈ Ft (or Fr = Ft / (2π))"
    // Let's use the integrated Radial Force (J.O. Almen / standard):
    // Total Radial Load W = 2 * π * Ft (Wait, that cancels out?)
    // 
    // Let's stick to the User Prompt V1 suggestion: "Fr ≈ Ft" as a gray hint.
    // Actually, for a garter spring, the radial force exerted on the shaft is related to Tension.
    // Integrated Radial Force (Total Force summing all vectors) is 2 * PI * Ft.
    // BUT the user prompt said "Hoop Force / Radial Pressure (simplify... Fr ≈ Ft)".
    // I will output Fr_est = Ft as requested for V1, but label it clearly.
    const radialForceEstimate = tension;

    // 8. Properties for Audit
    const material = geometry.materialId
        ? getSpringMaterial(geometry.materialId)
        : getDefaultSpringMaterial();

    // Simple allowable: 50% of tensile if not better specified
    const tensile = material?.tensileStrength ?? 2000;
    // If specific allowable Shear is not known, estimate from tensile.
    // Extension springs often use 40-45% of Tensile for unpeened music wire.
    // User Prompt: "0.45~0.65 Sy" (Sy itself is ~60-80% Su).
    // Let's take a safe 50% of Tensile as Allowable Shear for now if nothing else.
    const allowableShear = (allowableStressRatio ?? 0.5) * tensile;

    const stressRatio = maxShear / allowableShear;
    const safetyFactor = allowableShear / (maxShear || 0.001);

    return {
        type: "garter",
        k: k_axial,
        springIndex: C,
        wahlFactor,
        tauNominal: nominalShear,
        tauMax: maxShear,
        ringInstalledDiameter: D_installed,
        circumferentialChange: deltaC,
        tension,
        radialForceEstimate,
        stressRatio,
        safetyFactor,
    };
}

/**
 * Generate curve for Recharts
 */
export function generateGarterCurve(geometry: GarterSpringDesign) {
    const points = [];
    const D_free = geometry.ringFreeDiameter;
    // Plot from D_free to D_free * 1.2
    const maxD = D_free * 1.2;
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
        const dReq = D_free + (maxD - D_free) * (i / steps);
        const res = calculateGarterSpring({
            geometry,
            installedDiameter: dReq,
        });

        points.push({
            diameter: Number(dReq.toFixed(2)),
            tension: Number(res.tension.toFixed(2)),
            stress: Number(res.tauMax.toFixed(2)),
        });
    }

    return points;
}
