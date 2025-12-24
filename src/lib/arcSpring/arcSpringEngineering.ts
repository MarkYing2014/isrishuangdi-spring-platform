import { ArcSpringInput, ArcSpringResult, ArcSpringPoint } from "./types";
import { computeArcSpring, ARC_SPRING_FACTORY_POLICY } from "./ArcSpringStress";

const PI = Math.PI;

export interface EngineeringPoint {
    label: string;
    alpha: number;        // deg (Current Angle)
    deltaDeg: number;     // deg (Free - Current)
    x: number;            // mm (Tangential displacement)
    T_Nm: number;         // Nm (Torque)
    F_N: number;          // N (Tangential Force)
    tau_MPa: number;      // MPa (Shear Stress)
    SF: number;           // Safety Factor
    isValid: boolean;
}

export interface EngineeringAnalysisResult {
    k_theta_Nm_deg: number;    // Nm/deg
    k_axial_N_mm: number;      // N/mm (Base stiffness)

    // Critical Points
    ptWork: EngineeringPoint | null;
    ptLimit: EngineeringPoint | null;
    ptPreload: EngineeringPoint | null;
    ptSolid: EngineeringPoint; // At alphaC

    // Margins
    angleMargin: number;       // deg (Limit - Work)
    solidMargin: number;       // mm (Solid Height margin) - approx

    // Curve for Charts
    engineeringCurve: {
        alpha: number;
        deltaDeg: number;
        T_Nm: number;
        tau_MPa: number;
        F_N: number;
        label?: string;
    }[];
}

export function computeEngineeringAnalysis(input: ArcSpringInput, baseResult: ArcSpringResult): EngineeringAnalysisResult {
    // 1. Call the Unified Engineering Model
    const res = computeArcSpring(
        {
            d: input.d,
            Dm: input.D,
            Na: input.n,
            r: input.r,
            nParallel: input.countParallel
        },
        {
            thetaFreeDeg: input.alpha0,
            thetaWorkDeg: input.alphaWork ?? input.alpha0
        },
        {
            id: "wrapper", name: "Wrapper", G: 79000, Sy: 1600
        },
        ARC_SPRING_FACTORY_POLICY
    );

    // 2. Map Results Back to Legacy Interface
    const k_theta_Nm_deg = res.kThetaTotal_NmPerDeg;
    const k_axial = baseResult.k; // keep original axial ref

    // Helper to create point
    const createPoint = (alpha: number | undefined, label: string): EngineeringPoint | null => {
        if (alpha === undefined) return null;

        // Use the model to calc point at this specific alpha
        // We can re-call or interpolate. For accuracy, let's re-call for single point
        // But since we have linear k, we can scale
        const delta = input.alpha0 - alpha;
        if (delta < 0) return null;

        const fraction = delta / res.dThetaDeg; // ratio of current delta to work delta
        // Caution: res.dThetaDeg might be 0 if work=free

        // Better: Calculate directly
        const T_Nm = res.kThetaTotal_NmPerDeg * delta;
        const F_N = (T_Nm * 1000) / input.r; // Total Force
        // Stress scales with Moment (Torque)
        // tau = Kw * 8 * F_strip * D / pi d^3
        // F_strip = F_N / nParallel
        // So tau is proportional to T_Nm
        const tau = res.tauWork_MPa * (delta / (res.dThetaDeg || 1));
        // Wait, better to use the stress function exposed? 
        // No, let's assume linearity for speed in this wrapper.

        // Actually, just re-compute stress exactly to be safe
        // tau = (T_Nm * 1000 / nParallel / r) * (Kw * 8 * D / (pi * d^3))
        const T_strip_Nmm = (T_Nm * 1000) / (input.countParallel || 1);
        const F_strip_N = T_strip_Nmm / input.r;
        const kw = res.Kw;
        const valTau = (kw * 8 * F_strip_N * input.D) / (Math.PI * Math.pow(input.d, 3));

        return {
            label,
            alpha,
            deltaDeg: delta,
            x: (input.r * delta * Math.PI) / 180,
            T_Nm,
            F_N,
            tau_MPa: valTau,
            SF: (res.tauAllow_MPa / valTau) || 999,
            isValid: true
        };
    };

    const ptWork = createPoint(input.alphaWork, "Work");
    const ptLimit = createPoint(input.alphaLimit, "Limit");
    const ptPreload = createPoint(input.alphaPreload, "Preload");
    const ptSolid = createPoint(input.alphaC, "Solid")!;

    // Curve
    const engineeringCurve = res.curves.torqueAngle.map((p, i) => {
        const stressP = res.curves.stressAngle[i];
        return {
            alpha: p.thetaDeg, // thetaDeg
            deltaDeg: input.alpha0 - p.thetaDeg,
            T_Nm: p.torqueTotalNm,
            tau_MPa: stressP ? stressP.tauMPa : 0,
            F_N: (p.torqueTotalNm * 1000) / input.r
        };
    });

    return {
        k_theta_Nm_deg,
        k_axial_N_mm: k_axial,
        ptWork, ptLimit, ptPreload, ptSolid,
        angleMargin: (input.alphaLimit || input.alphaWork || input.alpha0) - (input.alphaWork || input.alpha0), // Approx
        solidMargin: 0,
        engineeringCurve
    };
}
