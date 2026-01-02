import {
    ISpringEngine,
    PlatformResult,
    LoadCaseResult,
    CaseStatus,
    PlatformSpringType,
    PlatformMaterialModel,
    PlatformDesignSummary,
    AxialPackInput,
    AxialPackResult
} from "../types";
import { CompressionEngine } from "./compression";
import { checkAxialPackRules } from "@/lib/designRules/axialPackRules";
import { auditAxialPack } from "@/lib/designRules/AxialPackAudit";

/**
 * AxialPackEngine (GEN-1)
 * Simulates an array of parallel compression springs (Clutch Return Spring Pack).
 */
export class AxialPackEngine implements ISpringEngine {
    type: PlatformSpringType = "axialPack";

    calculate(params: {
        geometry: AxialPackInput;
        material: PlatformMaterialModel;
        cases: { mode: "height" | "deflection"; values: number[] };
        modules: any; // Passed through
    }): PlatformResult {
        const { baseSpring, pack, loadcase } = params.geometry;
        const G = params.material.G;
        const tauAllow = params.material.tauAllow;

        // 1. Calculate Single Spring Reference
        // We instantiate CompressionEngine to reuse its "Physics Core"
        // But for performance/simplicity in GEN-1, we might just calculate K/Stress directly
        // to avoid complex object mapping. Let's do direct calc for speed/clarity here
        // as requested by "minimal integration".

        const d = baseSpring.d;
        const Dm = baseSpring.Dm;
        const Na = baseSpring.Na;
        const L0 = baseSpring.L0;

        const k_single = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * Na);
        const OD_single = Dm + d;
        const Hs_single = (baseSpring.Nt || Na + 2) * d; // Basic solid estimation

        // 2. Pack Aggregation
        const N = pack.N;
        const k_total = N * k_single;

        // 3. Constraints & Allowables
        const tPlate = pack.plateThickness || 0;
        const Hs_pack = Hs_single + 2 * tPlate;

        const maxDeflection_solid = Math.max(0, L0 - Hs_pack);

        // Stress Limit (Shear)
        // Tau = 8FD/pi*d^3 * Kw. F = k*x.
        // x_limit = Tau_allow * pi * d^3 / (8 * k * D * Kw)
        const C = Dm / d;
        const Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
        const stressLimitedStroke = (tauAllow * Math.PI * Math.pow(d, 3)) / (8 * k_single * Dm * Kw);

        // Clearance - Spring to Spring
        // sin(pi/N) = (gap/2 + OD/2) / R
        // gap + OD = 2*R*sin(pi/N)
        // gap = 2*R*sin(pi/N) - OD
        const ssMin = 2 * pack.Rbc * Math.sin(Math.PI / N) - OD_single;

        // Clearance - Boundary
        let boundaryMin = 999;
        if (pack.ringID) {
            // Inner Ring: Gap = (R - OD/2) - RingRadius? No.
            // RingID is Diameter.
            // Inner Boundary Radius = pack.ringID / 2.
            // Spring Inner Edge Radius = pack.Rbc - OD_single/2.
            // Gap = SpringInner - RingInner
            const gapID = (pack.Rbc - OD_single / 2) - (pack.ringID / 2);
            boundaryMin = Math.min(boundaryMin, gapID);
        }
        if (pack.ringOD) {
            // Outer Ring: Gap = RingOuter - SpringOuter
            // Spring Outer Edge = pack.Rbc + OD_single/2
            const gapOD = (pack.ringOD / 2) - (pack.Rbc + OD_single / 2);
            boundaryMin = Math.min(boundaryMin, gapOD);
        }

        // Clearance - Seat Pocket
        let seatPocketMin = 999;
        if (pack.seatPocketOD) {
            seatPocketMin = pack.seatPocketOD - OD_single;
        }

        // Governing Max Stroke
        // (If clearances checks fail, we don't necessarily limit stroke - design rule handles that)
        // But if solid height is hit, that's a hard limit.
        const maxStroke = Math.min(maxDeflection_solid, stressLimitedStroke);

        // 4. Load Cases
        const results: LoadCaseResult[] = params.cases.values.map((v, i) => {
            let x = 0;
            if (params.cases.mode === "height") {
                // For pack, height usually means plate-to-plate height?
                // Or L0 - Height. Let's assume Height H.
                // Solid Height is Hs_pack.
                // L0_pack = L0 + 2*tPlate ? Or is L0 just spring L0?
                // Usually L0_pack_assembly = L0_spring + 2*tPlate.
                // Let's assume input H is assembly height.
                const L0_assembly = L0 + 2 * tPlate;
                x = L0_assembly - v;
            } else {
                x = v;
            }

            // Force
            const F_total = k_total * x;
            const F_single = k_single * x; // Force per spring

            // Stress (Single Spring)
            const tau = (8 * F_single * Dm * Kw) / (Math.PI * Math.pow(d, 3));

            // Status
            let status: CaseStatus = "ok";
            let reason: any = "none";

            if (x > maxDeflection_solid) {
                status = "danger";
                reason = "solid";
            } else if (tau > tauAllow) {
                status = "warning";
                reason = "stress";
            }

            return {
                id: `L${i + 1}`,
                labelEn: `Point ${i + 1}`,
                labelZh: `点位 ${i + 1}`,
                inputValue: v,
                inputMode: params.cases.mode,
                load: F_total,
                stress: tau,
                status,
                statusReason: reason,
                isValid: x <= maxDeflection_solid && x >= 0
            };
        });

        // 5. Design Rules (Findings)
        const designRules: any[] = [];

        // Spring-to-Spring
        if (ssMin < 0) {
            designRules.push({ id: "CLR_SS", label: "Spring-to-Spring Clearance", status: "fail", message: "Interference between springs", value: ssMin.toFixed(2), limit: "0" });
        } else if (ssMin < 0.5) {
            designRules.push({ id: "CLR_SS", label: "Spring-to-Spring Clearance", status: "warning", message: "Low clearance (<0.5mm)", value: ssMin.toFixed(2), limit: "0.5" });
        } else {
            designRules.push({ id: "CLR_SS", label: "Spring-to-Spring Clearance", status: "pass", message: "Clearance OK", value: ssMin.toFixed(2), limit: "0.5" });
        }

        // Boundary
        if (boundaryMin < 999) {
            if (boundaryMin < 0) {
                designRules.push({ id: "CLR_BND", label: "Boundary Clearance", status: "fail", message: "Interference with Housing Ring", value: boundaryMin.toFixed(2), limit: "0" });
            } else if (boundaryMin < 0.5) {
                designRules.push({ id: "CLR_BND", label: "Boundary Clearance", status: "warning", message: "Low boundary clearance", value: boundaryMin.toFixed(2), limit: "0.5" });
            } else {
                designRules.push({ id: "CLR_BND", label: "Boundary Clearance", status: "pass", message: "Boundary OK", value: boundaryMin.toFixed(2), limit: "0.5" });
            }
        }

        // Seat Pocket
        if (seatPocketMin < 999) {
            if (seatPocketMin <= 0) {
                designRules.push({ id: "CLR_POCKET", label: "Seat Pocket Fit", status: "fail", message: "Spring larger than pocket", value: seatPocketMin.toFixed(2), limit: "0" });
            } else if (seatPocketMin < 0.5) {
                designRules.push({ id: "CLR_POCKET", label: "Seat Pocket Fit", status: "warning", message: "Tight fit in pocket", value: seatPocketMin.toFixed(2), limit: "0.5" });
            }
        }


        // 6. Return Result (Phase 4: Audit Integration)

        // Prepare Pre-Audit Result Reference
        const rawResultPrep = {
            single: { k: k_single, Hs: Hs_single, OD: OD_single, maxStress: tauAllow },
            pack: { k_total, Hs_pack, maxStroke, clearance: { ssMin, boundaryMin, seatPocketMin } }
        };

        const auditSync = auditAxialPack(rawResultPrep, {
            tauAllow,
            currentStroke: loadcase.stroke,
            L0: baseSpring.L0,
            plateThickness: tPlate
        });

        return {
            springType: "axialPack",
            cases: results,
            springRate: k_total,
            springIndex: C,
            wahlFactor: Kw,
            isValid: results.every(r => r.isValid),
            maxStress: Math.max(...results.map(r => r.stress || 0)),
            tauAllow,
            designRules,

            // Audit Engine Hooks
            workingDeflection: loadcase.stroke,
            limits: auditSync.limits,
            governingOverride: auditSync.governingOverride,

            // Phase 5: Detailed Stress Analysis
            stressAnalysis: {
                tauUncorrected: Math.max(...results.map(r => r.stress || 0)),
                tauCorrected: Math.max(...results.map(r => r.stress || 0)) * Kw,
                correctionFactor: Kw,
                // Approximation for Circular Plate Bending (Roark's Formulas: Case 10a Outer Edge Supported, Inner Edge Guided?)
                // Simplified: Uniform load ring. Sigma = Beta * q * a^2 / t^2
                // Let's use a dummy heuristic for "Plate Stress" proportional to Load / t^2 for now until rigorous
                // Moment ~ Force * (Span). Span ~ Rbc.
                sigmaPlate: (k_total * loadcase.stroke * pack.Rbc) / (tPlate * tPlate * 10)
            },

            rawResult: rawResultPrep
        } as AxialPackResult;
    }

    getSummary(ctx: { geometry: AxialPackInput; material: any; result: PlatformResult }): PlatformDesignSummary {
        const { pack, baseSpring } = ctx.geometry;
        const totalF = ctx.result.cases[0]?.load?.toFixed(1) || "-"; // Just picking first for snapshot

        return {
            title: "Axial Spring Pack (Clutch Return)",
            details: [
                { label: "Configuration", value: `${pack.N}x Parallel @ R${pack.Rbc}`, unit: "" },
                { label: "Total Rate", value: ctx.result.springRate.toFixed(2), unit: "N/mm" },
                { label: "Single Spring", value: `${baseSpring.d}x${baseSpring.Dm}x${baseSpring.L0}`, unit: "mm" },
                { label: "Min Clearance", value: (ctx.result.rawResult?.pack?.clearance?.ssMin ?? 0).toFixed(2), unit: "mm" },
            ],
            warnings: ctx.result.designRules?.filter(r => r.status !== "pass").map(r => r.message)
        };
    }
}
