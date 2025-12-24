// src/lib/arcSpring/ArcSpringStress.ts
// Engineering-grade Arc Spring (Damper Arc Helical Spring) analysis
// Target: match factory report (θ_free, θ_work → T_work, kθ, τ_work) 1:1
// Units: N, mm, MPa, deg

export type AngleUnit = "deg" | "rad";

export interface ArcSpringMaterial {
    id: string;
    name: string;
    /** Shear modulus G (MPa = N/mm^2) */
    G: number;
    /** Yield strength Sy (MPa) */
    Sy: number;
    /** Optional ultimate strength Sut (MPa) */
    Sut?: number;
}

export interface ArcSpringGeometry {
    /** wire diameter d (mm) */
    d: number;

    /** mean coil diameter Dm (mm). If not provided, you can derive from OD - d */
    Dm: number;

    /** active coils Na */
    Na: number;

    /**
     * working radius r (mm)
     * This is the damper radius converting tangential force -> torque: T = F * r
     */
    r: number;

    /**
     * number of identical arc springs in parallel (e.g. 4 strips / 4 springs)
     * Factory often reports the total damper performance; each strip shares torque.
     */
    nParallel?: number;
}

export interface ArcSpringLoadcase {
    /** free angle θ_free (deg) */
    thetaFreeDeg: number;
    /** work angle θ_work (deg) */
    thetaWorkDeg: number;

    /**
     * Optional: limit angle θ_limit (deg) for max checks
     * If omitted, we only analyze at work.
     */
    thetaLimitDeg?: number;
}

export interface ArcSpringPolicy {
    /**
     * Allowable shear stress rule.
     * Industry-friendly default for shot-peened spring steels:
     * tau_allow = 0.65 * Sy  (matches your "Allow: 1040 MPa" when Sy=1600)
     */
    tauAllowFactorOfSy?: number; // default 0.65

    /**
     * Minimum recommended spring index for helical springs.
     * Arc springs often run low C (3~6) but still we can warn.
     */
    springIndexRecommended?: { min: number; max: number }; // default {min:4, max:20}

    /**
     * If you want to match factory “total stiffness” display:
     * total = perStrip * nParallel
     * perStrip = total / nParallel
     */
    reportAsTotalDamper?: boolean; // default true
}

export interface ArcSpringResults {
    // basic geometry factors
    C: number;
    Kw: number;

    // stiffness
    /** Tangential spring rate (N/mm) per strip */
    kTangentialPerStrip: number;
    /** Torsional stiffness (N·mm/deg) total damper (after parallel) */
    kThetaTotal_NmmPerDeg: number;
    /** Torsional stiffness (Nm/deg) total damper */
    kThetaTotal_NmPerDeg: number;
    /** Torsional stiffness per strip (Nm/deg) */
    kThetaPerStrip_NmPerDeg: number;

    // work point
    dThetaDeg: number;
    direction: "Compress" | "Extend";
    dThetaRad: number;

    /** Work torque total damper (Nm) */
    TworkTotal_Nm: number;
    /** Work torque per strip (Nm) */
    TworkPerStrip_Nm: number;

    /** Equivalent tangential deflection at radius r (mm) */
    dxWork_mm: number;
    /** Force per strip (N) */
    FworkPerStrip_N: number;

    /** Shear stress at work (MPa) */
    tauWork_MPa: number;
    /** Allowable shear (MPa) */
    tauAllow_MPa: number;
    /** Stress ratio (tau/tauAllow * 100) */
    stressRatio_pct: number;
    /** Safety factor = tauAllow / tau */
    safetyFactor: number;

    // optional limit point
    limit?: {
        dThetaDeg: number;
        Ttotal_Nm: number;
        TperStrip_Nm: number;
        dx_mm: number;
        FperStrip_N: number;
        tau_MPa: number;
        stressRatio_pct: number;
        safetyFactor: number;
    };

    // chart-ready curves
    curves: {
        torqueAngle: Array<{ thetaDeg: number; torqueTotalNm: number; torquePerStripNm: number }>;
        stressAngle: Array<{ thetaDeg: number; tauMPa: number; ratioPct: number }>;
    };

    // warnings (for UI Design Rules panel)
    warnings: Array<{ code: string; message: string }>;
}

/**
 * Wahl factor (Kw) for helical compression spring shear stress correction.
 * Kw = (4C-1)/(4C-4) + 0.615/C
 */
export function wahlFactor(C: number): number {
    if (C <= 1.1) return Infinity;
    return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

/**
 * Helical spring rate (compression/tangential) for one strip:
 * k = G d^4 / (8 D^3 Na)
 * Units: G (MPa=N/mm^2), d(mm), D(mm) => k in N/mm
 */
export function helicalRate_N_per_mm(G: number, d: number, Dm: number, Na: number): number {
    if (Na <= 0) throw new Error("Na must be > 0");
    return (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);
}

/**
 * Core shear stress model for helical spring:
 * tau = Kw * 8 F Dm / (pi d^3)
 * Units: F(N), Dm(mm), d(mm) => tau in MPa (N/mm^2)
 */
export function helicalShearStress_MPa(F: number, Dm: number, d: number, Kw: number): number {
    return (Kw * 8 * F * Dm) / (Math.PI * Math.pow(d, 3));
}

/**
 * Convert angle difference to tangential deflection:
 * dx = r * dTheta(rad)
 * Units: r(mm), rad => dx(mm)
 */
export function tangentialDeflection_mm(r: number, dThetaRad: number): number {
    return r * dThetaRad;
}

export function deg2rad(deg: number): number {
    return (deg * Math.PI) / 180;
}

export function computeArcSpring(
    geom: ArcSpringGeometry,
    load: ArcSpringLoadcase,
    mat: ArcSpringMaterial,
    policy: ArcSpringPolicy = {}
): ArcSpringResults {
    const {
        tauAllowFactorOfSy = 0.65,
        springIndexRecommended = { min: 4, max: 20 },
        reportAsTotalDamper = true,
    } = policy;

    const n = Math.max(1, Math.floor(geom.nParallel ?? 1));
    const d = geom.d;
    const Dm = geom.Dm;
    const Na = geom.Na;
    const r = geom.r;

    const warnings: ArcSpringResults["warnings"] = [];

    const C = Dm / d;
    const Kw = wahlFactor(C);

    if (C < springIndexRecommended.min || C > springIndexRecommended.max) {
        warnings.push({
            code: "SPRING_INDEX",
            message: `Spring Index C=${C.toFixed(2)} outside recommended range (${springIndexRecommended.min}~${springIndexRecommended.max}). Arc springs may run low C but check manufacturability/fatigue.`,
        });
    }
    if (!Number.isFinite(Kw) || Kw > 5) {
        warnings.push({
            code: "WAHL_FACTOR",
            message: `Wahl factor seems too high (Kw=${Kw.toFixed(3)}). Check Dm/d inputs.`,
        });
    }

    // 1) Per-strip tangential rate (same as compression spring)
    const kPerStrip = helicalRate_N_per_mm(mat.G, d, Dm, Na);

    // 2) Torsional stiffness:
    // per-strip: kθ_strip (N·mm/rad) = k(N/mm) * r^2 (mm^2)
    // because T = F*r, F = k*dx, dx = r*θ => T = (k*r^2)*θ
    const kThetaPerStrip_NmmPerRad = kPerStrip * r * r;
    const kThetaPerStrip_NmmPerDeg = kThetaPerStrip_NmmPerRad / (180 / Math.PI);
    const kThetaPerStrip_NmPerDeg = kThetaPerStrip_NmmPerDeg / 1000;

    const kThetaTotal_NmPerDeg = kThetaPerStrip_NmPerDeg * n;
    const kThetaTotal_NmmPerDeg = kThetaTotal_NmPerDeg * 1000;

    // 3) Work point
    const dThetaDeg = load.thetaFreeDeg - load.thetaWorkDeg;
    // Engineering convention: Magnitude governs stress/torque size. Sign governs direction.
    const dThetaDegMag = Math.abs(dThetaDeg);
    const direction = dThetaDeg >= 0 ? "Compress" : "Extend";

    const dThetaRad = deg2rad(dThetaDegMag);

    const dxWork = tangentialDeflection_mm(r, dThetaRad); // mm (magnitude)
    const FworkPerStrip = kPerStrip * dxWork; // N (magnitude)

    const TworkPerStrip_Nmm = FworkPerStrip * r; // N*mm
    const TworkPerStrip_Nm = TworkPerStrip_Nmm / 1000;

    const TworkTotal_Nm = TworkPerStrip_Nm * n;

    // 4) Shear stress (per strip) - Magnitude
    const tauWork = helicalShearStress_MPa(FworkPerStrip, Dm, d, Kw);

    // 5) Allowables & SF
    const tauAllow = tauAllowFactorOfSy * mat.Sy;
    const ratio = (tauWork / tauAllow) * 100;
    const SF = tauAllow / tauWork;

    // Optional limit point
    let limit: ArcSpringResults["limit"] | undefined = undefined;
    if (typeof load.thetaLimitDeg === "number") {
        const dThetaL_Deg = load.thetaFreeDeg - load.thetaLimitDeg;
        const dThetaL_Mag = Math.abs(dThetaL_Deg);
        const dThetaL_Rad = deg2rad(dThetaL_Mag);
        const dxL = tangentialDeflection_mm(r, dThetaL_Rad);
        const FL = kPerStrip * dxL;
        const TstripL_Nm = (FL * r) / 1000;
        const TtotalL_Nm = TstripL_Nm * n;
        const tauL = helicalShearStress_MPa(FL, Dm, d, Kw);
        const ratioL = (tauL / tauAllow) * 100;
        const SFL = tauAllow / tauL;

        limit = {
            dThetaDeg: dThetaL_Mag,
            Ttotal_Nm: TtotalL_Nm,
            TperStrip_Nm: TstripL_Nm,
            dx_mm: dxL,
            FperStrip_N: FL,
            tau_MPa: tauL,
            stressRatio_pct: ratioL,
            safetyFactor: SFL,
        };
    }

    // Curves (chart)
    // We build from thetaWork -> thetaFree (or to thetaLimit if exists)
    const thetaStart = (typeof load.thetaLimitDeg === "number") ? load.thetaLimitDeg : load.thetaWorkDeg;
    const thetaEnd = load.thetaFreeDeg;
    const steps = 40;

    const torqueAngle: ArcSpringResults["curves"]["torqueAngle"] = [];
    const stressAngle: ArcSpringResults["curves"]["stressAngle"] = [];

    for (let i = 0; i <= steps; i++) {
        const theta = thetaStart + ((thetaEnd - thetaStart) * i) / steps;
        const dTheta_i_Deg = load.thetaFreeDeg - theta;
        const dTheta_i_Mag = Math.abs(dTheta_i_Deg); // Use magnitude for calculations
        const dTheta_i_Rad = deg2rad(dTheta_i_Mag);

        const dx = tangentialDeflection_mm(r, dTheta_i_Rad);
        const F = kPerStrip * dx;
        const TstripNm = (F * r) / 1000;
        const TtotalNm = TstripNm * n;

        const tau = helicalShearStress_MPa(F, Dm, d, Kw);
        const ratioPct = (tau / tauAllow) * 100;

        torqueAngle.push({ thetaDeg: theta, torqueTotalNm: TtotalNm, torquePerStripNm: TstripNm });
        stressAngle.push({ thetaDeg: theta, tauMPa: tau, ratioPct });
    }

    // Reporting mode
    // Some screens want to show "total damper" numbers only, but always keep per-strip in payload.
    const res: ArcSpringResults = {
        C,
        Kw,

        kTangentialPerStrip: kPerStrip,

        kThetaTotal_NmmPerDeg: kThetaTotal_NmmPerDeg,
        kThetaTotal_NmPerDeg: kThetaTotal_NmPerDeg,
        kThetaPerStrip_NmPerDeg: kThetaPerStrip_NmPerDeg,

        dThetaDeg: dThetaDegMag, // Report magnitude
        direction,
        dThetaRad,

        TworkTotal_Nm: TworkTotal_Nm,
        TworkPerStrip_Nm: TworkPerStrip_Nm,

        dxWork_mm: dxWork,
        FworkPerStrip_N: FworkPerStrip,

        tauWork_MPa: tauWork,
        tauAllow_MPa: tauAllow,
        stressRatio_pct: ratio,
        safetyFactor: SF,

        limit,
        curves: { torqueAngle, stressAngle },
        warnings,
    };

    // If you want a strict factory-style warning when ratio is crazy:
    if (!Number.isFinite(res.tauWork_MPa) || res.tauWork_MPa > 3000) {
        res.warnings.push({
            code: "STRESS_IMPLAUSIBLE",
            message:
                `Stress is implausibly high (${res.tauWork_MPa.toFixed(0)} MPa). Check unit consistency: use N + mm, and ensure torque is converted via F=T/r (per strip).`,
        });
    }

    return res;
}

/**
 * Factory-default policy preset (industry locked):
 * - tauAllow = 0.65*Sy
 * - report total damper (nParallel included)
 */
export const ARC_SPRING_FACTORY_POLICY: ArcSpringPolicy = {
    tauAllowFactorOfSy: 0.65,
    springIndexRecommended: { min: 4, max: 20 },
    reportAsTotalDamper: true,
};
