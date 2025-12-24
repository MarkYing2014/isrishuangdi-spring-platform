// src/lib/arcSpring/ArcSpringStress.ts
// Arc Spring stress model (engineering-grade, incremental)
// - Uses Δθ = θ_free - θ_work
// - Uses single-strip torque: T_single = (kθ * Δθ) / parallelCount
// - Uses Effective Section Modulus Z_eff = Z_ref * (2r / D) to account for Lever Arm ratio
// - Returns σ in MPa, stressRatio in %

export type ArcSpringUnits = "Nmm" | "Nm";
export type AngleUnit = "deg" | "rad";

export interface ArcSpringGeometry {
    /** strip width b (mm) */
    b?: number;
    /** strip thickness t (mm) */
    t?: number;
    /** wire diameter d (mm) - Fallback for Round Wire */
    d?: number;
    /** Mean Coil Diameter D (mm) - Required for Z_eff */
    D?: number;
}

export interface ArcSpringMaterial {
    /** yield strength Sy (MPa) */
    Sy: number;
    /** allowable factor on Sy */
    allowFactor?: number;
}

export interface ArcSpringLoadcase {
    /** Free angle θ_free (deg) */
    thetaFree: number;
    /** Work/limit angle θ_work (deg) */
    thetaWork: number;
    /** torsional stiffness per DEG */
    kTheta: number;
    kThetaUnit?: ArcSpringUnits; // default "Nm"
    parallelCount?: number;
    beta?: number;
    /** Working Radius r (mm) - Required for Z_eff */
    rWork?: number;
}

export interface ArcSpringStressResult {
    dThetaDeg: number;
    dThetaRad: number;
    kTheta_Nmm_per_deg: number;
    T_total_Nmm: number;
    T_single_Nmm: number;

    Z_ref_mm3: number; // Base section Z
    Z_eff_mm3: number; // Effective Z (accounting for r/D)

    sigmaMax_MPa: number;
    sigmaAllow_MPa: number;
    stressRatio_pct: number;
    warnings: string[];
}

const DEG2RAD = Math.PI / 180;

function assertFinitePositive(name: string, v: number) {
    if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} must be a finite positive number`);
}
function assertFinite(name: string, v: number) {
    if (!Number.isFinite(v)) throw new Error(`${name} must be finite`);
}
function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}
function toNmm(value: number, unit: ArcSpringUnits): number {
    return unit === "Nm" ? value * 1000 : value;
}

export function calculateArcSpringStress(
    geom: ArcSpringGeometry,
    mat: ArcSpringMaterial,
    lc: ArcSpringLoadcase
): ArcSpringStressResult {
    const warnings: string[] = [];

    // 1. Base Section Modulus (Z_ref)
    let Z_ref_mm3 = 0;
    if (geom.b !== undefined && geom.t !== undefined) {
        assertFinitePositive("b", geom.b);
        assertFinitePositive("t", geom.t);
        Z_ref_mm3 = (geom.b * geom.t * geom.t) / 6;
    } else if (geom.d !== undefined) {
        assertFinitePositive("d", geom.d);
        Z_ref_mm3 = (Math.PI * Math.pow(geom.d, 3)) / 32;
    } else {
        throw new Error("Geometry missing dimensions");
    }

    // 2. Effective Section Modulus (Z_eff)
    // Accounts for Lever Arm change from Arc Radius (r) to Coil Radius (D/2).
    // Factor = (2 * r) / D.
    const D_mean = geom.D ?? 12.2;
    const r_work = lc.rWork ?? 60;
    const leverageFactor = (2 * r_work) / D_mean;
    const Z_eff_mm3 = Z_ref_mm3 * leverageFactor;

    // 3. Loadcase
    assertFinitePositive("Sy", mat.Sy);
    const allowFactor = mat.allowFactor ?? 0.65;
    const parallelCount = Math.max(1, Math.floor(lc.parallelCount ?? 4));
    const beta = clamp(lc.beta ?? 1.15, 1.0, 1.5);
    const kThetaUnit = lc.kThetaUnit ?? "Nm";

    const dThetaDeg = lc.thetaFree - lc.thetaWork;
    if (dThetaDeg < 0) warnings.push("Δθ is negative. Check angle convention.");
    const dThetaDegAbs = Math.abs(dThetaDeg);

    const kTheta_Nmm_per_deg = toNmm(lc.kTheta, kThetaUnit);
    const T_total_Nmm = kTheta_Nmm_per_deg * dThetaDegAbs;
    const T_single_Nmm = T_total_Nmm / parallelCount;

    // 4. Stress Calculation
    // σ = β * T_single / Z_eff
    const sigmaMax_MPa = beta * (T_single_Nmm / Z_eff_mm3);
    const sigmaAllow_MPa = allowFactor * mat.Sy;
    const stressRatio_pct = (sigmaMax_MPa / sigmaAllow_MPa) * 100;

    if (stressRatio_pct > 500) warnings.push("Stress > 500%. Check units.");

    return {
        dThetaDeg: dThetaDegAbs,
        dThetaRad: dThetaDegAbs * DEG2RAD,
        kTheta_Nmm_per_deg,
        T_total_Nmm,
        T_single_Nmm,
        Z_ref_mm3,
        Z_eff_mm3,
        sigmaMax_MPa,
        sigmaAllow_MPa,
        stressRatio_pct,
        warnings,
    };
}

export function toFactoryTorqueNm(T_Nmm: number): number {
    return T_Nmm / 1000;
}
