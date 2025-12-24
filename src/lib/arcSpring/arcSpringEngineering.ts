import { ArcSpringInput, ArcSpringResult, ArcSpringPoint } from "./types";
import { springRate_k, frictionTorque, xFromDeltaDeg, torqueFromDeltaDeg } from "./math";
import { ARC_SPRING_MATERIALS } from "./materials";

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
    // 1. Base Params
    const { d, D, n, r, alpha0, alphaWork, alphaLimit, alphaPreload, alphaC, preloadTorque } = input;
    const k_axial = baseResult.k; // N/mm

    // 2. Rotational Stiffness (Nm/deg)
    // k_theta (Nmm/deg) = baseResult.R_deg
    const k_theta_Nmm_deg = baseResult.R_deg;
    const k_theta_Nm_deg = k_theta_Nmm_deg / 1000;

    // 3. Allowable Stress
    // Simple estimation for now. Real app should use Material DB or Goodman.
    // Default alpha = 0.5 * Sy.
    // We need Sy. `ArcSpringInput` doesn't strictly carry Sy unless in materials.
    // Let's approximate from allowableTau if passed, or use generic 900-1200 MPa.
    // For now, SF calculation will use a placeholder or derived from standard.
    // Let's assume Sy = 1600 MPa (generic Spring Steel) -> Tau_allow = 800 MPa.
    // Or better, use `allowableTau` from UI state if we could pass it. 
    // For this pure function, we might just return Tau and let UI calc SF.
    // But let's try to find material.
    const mat = ARC_SPRING_MATERIALS.find(m => m.key === input.materialKey);
    // We don't have Sy in material def yet. Assume 800 MPa allow.
    const tauAllow = 800;

    // 4. Point Calculator
    const calcPoint = (targetAlpha: number | undefined, label: string): EngineeringPoint | null => {
        if (targetAlpha === undefined || targetAlpha === null) return null;

        const deltaDeg = alpha0 - targetAlpha; // Can be negative if target > alpha0 (invalid)
        if (deltaDeg < 0) {
            return {
                label, alpha: targetAlpha, deltaDeg, x: 0, T_Nm: 0, F_N: 0, tau_MPa: 0, SF: 0, isValid: false
            };
        }

        // Torque Calculation (Linear + Preload)
        const T0 = preloadTorque ?? 0; // Nmm
        const T_spring_Nmm = k_theta_Nmm_deg * deltaDeg;
        const T_total_Nmm = T0 + T_spring_Nmm;

        // Force Calculation (Moment Arm)
        const F_total_N = T_total_Nmm / r;

        // Stress Calculation (Wahl)
        // tau = Kw * (8FD / pi d^3)
        const kw = baseResult.wahlFactor;
        const tau = kw * (8 * F_total_N * D) / (PI * Math.pow(d, 3));

        return {
            label,
            alpha: targetAlpha,
            deltaDeg,
            x: r * (deltaDeg * PI / 180),
            T_Nm: T_total_Nmm / 1000,
            F_N: F_total_N,
            tau_MPa: tau,
            SF: tau > 0 ? tauAllow / tau : 999,
            isValid: true
        };
    };

    const ptWork = calcPoint(alphaWork, "Work");
    const ptLimit = calcPoint(alphaLimit, "Limit");
    const ptPreload = calcPoint(alphaPreload, "Preload");
    const ptSolid = calcPoint(alphaC, "Solid")!; // alphaC is mandatory

    // 5. Engineering Curve (Linear for now, but in Nm / MPa)
    // use samples from alpha0 to alphaC
    const curvePoints = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
        const alpha = alpha0 - (i / steps) * (alpha0 - alphaC);
        const pt = calcPoint(alpha, "");
        if (pt && pt.isValid) {
            curvePoints.push({
                alpha: pt.alpha,
                deltaDeg: pt.deltaDeg,
                T_Nm: pt.T_Nm,
                tau_MPa: pt.tau_MPa,
                F_N: pt.F_N
            });
        }
    }

    // 6. Margins
    // Angle Margin: Limit - Work (if Limit exists) or Solid - Work
    let angleMargin = 0;
    if (ptWork) {
        if (ptLimit) angleMargin = Math.max(0, ptWork.alpha - ptLimit.alpha); // alpha decreases as compressed
        else angleMargin = Math.max(0, ptWork.alpha - alphaC);
    }

    // Solid Margin (mm) roughly
    // x_solid - x_work
    let solidMargin = 0;
    if (ptWork && ptSolid) {
        solidMargin = Math.max(0, ptSolid.x - ptWork.x);
    }

    return {
        k_theta_Nm_deg,
        k_axial_N_mm: k_axial,
        ptWork,
        ptLimit,
        ptPreload,
        ptSolid,
        angleMargin,
        solidMargin,
        engineeringCurve: curvePoints
    };
}
