import {
    ISpringEngine,
    PlatformSpringType,
    PlatformResult,
    LoadCaseResult,
    PlatformModules,
    PlatformMaterialModel,
    CaseStatus,
    CaseStatusReason,
    PlatformDesignSummary,
    ArcSpringParams,
    ArcPackGroup
} from "../types";
import { buildArcSpringDesignRuleReport } from "@/lib/designRules/arcSpringRules";

/**
 * ArcSpringEngine handles curved damper springs (clutch/flywheel).
 * Implementation: OEM Scheme A (Piecewise Calibrated Stiffness + Pack Groups)
 */
export class ArcSpringEngine implements ISpringEngine {
    type: PlatformSpringType = "arc";

    /**
     * computeGroupTorque
     * Calculates torque for a single pack group based on continuous piecewise logic.
     */
    private computeGroupTorque(phiDeg: number, group: ArcPackGroup, smoothing: number = 0.15): { torque: number; stage: number } {
        const phi = Math.max(0, phiDeg - (group.phi0Deg || 0));
        const [b1, b2] = group.phiBreaksDeg;
        const [k1, k2, k3] = group.kStages;

        // Base piecewise linear
        const getT = (p: number) => {
            if (p <= b1) return k1 * p;
            if (p <= b2) return k1 * b1 + k2 * (p - b1);
            return k1 * b1 + k2 * (b2 - b1) + k3 * (p - b2);
        };

        let torque = getT(phi);
        let stage = phi <= b1 ? 1 : phi <= b2 ? 2 : 3;

        // Apply Smoothing (Logistic Blend)
        if (smoothing > 0) {
            const s = Math.max(0.5, 5 * (1 - smoothing)); // smoothing scale
            const w1 = 1 / (1 + Math.exp(-(phi - b1) / s));
            const w2 = 1 / (1 + Math.exp(-(phi - b2) / s));

            // This is a simplified multi-stage blend
            const T1 = k1 * phi;
            const T2 = k1 * b1 + k2 * (phi - b1);
            const T3 = k1 * b1 + k2 * b2 - k2 * b1 + k3 * (phi - b2);

            const blendedT = T1 * (1 - w1) + (T2 * (1 - w2) + T3 * w2) * w1;
            torque = blendedT;
        }

        return { torque: torque * group.count, stage };
    }

    /**
     * computeTotalTorque
     * Sums torque across all enabled pack groups.
     */
    private computeTotalTorque(phiDeg: number, packGroups: ArcPackGroup[], smoothing: number = 0.15): { totalTorque: number; dominantStage: number } {
        let totalTorque = 0;
        let maxStage = 1;

        for (const group of packGroups) {
            const { torque, stage } = this.computeGroupTorque(phiDeg, group, smoothing);
            totalTorque += torque;
            if (stage > maxStage) maxStage = stage;
        }

        return { totalTorque, dominantStage: maxStage };
    }

    calculate(params: {
        geometry: ArcSpringParams;
        material: PlatformMaterialModel;
        cases: { mode: any; values: number[] };
        modules: PlatformModules;
    }): PlatformResult {
        const geo = params.geometry;
        const { tauAllow = 800 } = geo;

        // Lever arm selection
        let rLever = geo.R; // backbone default
        if (geo.rLeverMode === "meanDiameter") rLever = geo.Dm / 2;
        else if (geo.rLeverMode === "custom" && geo.rLeverCustom) rLever = geo.rLeverCustom;

        const results: LoadCaseResult[] = params.cases.values.map((phi, i) => {
            const { totalTorque, dominantStage } = this.computeTotalTorque(phi, geo.packGroups, geo.stageSmoothing);

            // Torque -> Equivalent Force -> Stress (Wahl corrected)
            const F_eq = totalTorque / rLever;
            const C = geo.Dm / geo.d;
            const Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
            const tau = (8 * F_eq * geo.Dm * Kw) / (Math.PI * Math.pow(geo.d, 3));

            // Engineering Review Logic
            let status: CaseStatus = "ok";
            let reason: CaseStatusReason = "none";
            let msgEn = "";
            let msgZh = "";

            const isOverTravel = phi > geo.arcSpanDeg;
            const stressRatio = tau / tauAllow;

            if (isOverTravel) {
                status = "danger";
                reason = "travel";
                msgEn = "Exceeds geometric arc span limit";
                msgZh = "超过几何支架转角限制";
            } else if (stressRatio > 1.1) {
                status = "danger";
                reason = "stress";
                msgEn = "Critical stress limit exceeded (>110%)";
                msgZh = "应力严重超限 (>110%)";
            } else if (stressRatio > 0.9) {
                status = "warning";
                reason = "stress";
                msgEn = "Approaching allowable stress limit";
                msgZh = "接近许用应力极限";
            } else if (dominantStage === 3) {
                status = "warning";
                reason = "none";
                msgEn = "Operating in Stage 3 (High Load)";
                msgZh = "正在 Stage 3 (高负荷区) 工作";
            }

            // Manufacturability check
            if (C < 4 || C > 20) {
                if (status === "ok") {
                    status = "warning";
                    reason = "geometry";
                    msgEn = `Spring Index C=${C.toFixed(1)} outside ideal range (4-20)`;
                    msgZh = `弹簧指数 C=${C.toFixed(1)} 超出理想范围 (4-20)`;
                }
            }

            return {
                id: `Arc_${i + 1}`,
                labelEn: `Angle ${phi}°`,
                labelZh: `角度 ${phi}°`,
                inputValue: phi,
                inputMode: "angle",
                load: totalTorque,
                stress: tau,
                status,
                statusReason: reason,
                messageEn: msgEn,
                messageZh: msgZh,
                isValid: !isOverTravel,
                stage: dominantStage,
                energy: 0.5 * (totalTorque / 1000) * (phi * Math.PI / 180) // Rough approximation for J
            };
        });

        // Generate Design Rules
        const ruleInput: any = {
            D: geo.Dm,
            d: geo.d,
            n: geo.n,
            r: geo.R,
            alpha0: geo.arcSpanDeg,
            alphaC: 0
        }
        const report = buildArcSpringDesignRuleReport(ruleInput);

        const designRules = report.findings.map((f: any) => ({
            id: f.id,
            label: f.titleEn,
            status: (f.level === "error" ? "fail" : f.level === "warning" ? "warning" : "pass") as "pass" | "fail" | "warning",
            message: (f.detailZh || f.detailEn || "") as string,
            value: f.evidence ? String(Object.values(f.evidence)[0]) : "-",
            limit: "-"
        }));

        // Inject Engine Runtime Checks (Travel, Stress, Stage)
        const firstFail = results.find(r => r.status === "danger");
        const firstWarn = results.find(r => r.status === "warning");
        const priorityIssue = firstFail || firstWarn;

        if (priorityIssue) {
            // Avoid duplicates if possible, or just prepend as runtime checks are important
            designRules.unshift({
                id: "ENG_RUNTIME_CHECK",
                label: priorityIssue.statusReason === "travel" ? "Travel / 行程" : "Stress / 应力",
                status: priorityIssue.status === "danger" ? "fail" : "warning",
                message: priorityIssue.messageZh || priorityIssue.messageEn || "Runtime Warning",
                value: priorityIssue.inputValue.toFixed(1) + "deg",
                limit: priorityIssue.statusReason === "travel" ? geo.arcSpanDeg.toFixed(1) : (priorityIssue.statusReason === "stress" ? "100%" : "-")
            });
        }

        return {
            springType: "arc",
            cases: results,
            springRate: geo.packGroups[0]?.kStages[0] || 0, // Show first group k1 as primary
            springIndex: geo.Dm / geo.d,
            wahlFactor: (4 * (geo.Dm / geo.d) - 1) / (4 * (geo.Dm / geo.d) - 4) + 0.615 / (geo.Dm / geo.d),
            isValid: results.every(r => r.isValid),
            maxStress: Math.max(...results.map(r => r.stress || 0)),
            tauAllow: tauAllow,
            totalEnergy: results.length > 0 ? (results[results.length - 1]?.energy ?? 0) : 0, // J
            designRules // <--- Added
        };
    }

    solveForTarget(params: { geometry: ArcSpringParams; material: PlatformMaterialModel }, input: any): any {
        const { geometry } = params;
        const { mode, target1 } = input;

        if (mode === "singlePoint") {
            // target1.x = phi, target1.y = T_target
            const res = this.calculate({
                ...params,
                cases: { mode: "angle", values: [target1.x] },
                modules: { loadAnalysis: true } as any
            });

            const T_baseline = res.cases[0].load || 0;
            if (T_baseline === 0) return { ok: false, error: "Baseline torque is zero" };

            const kScale = target1.y / T_baseline;

            // Patch: multiply each group's kStages by kScale
            const newPackGroups = geometry.packGroups.map(g => ({
                ...g,
                kStages: g.kStages.map(k => k * kScale) as [number, number, number]
            }));

            return {
                ok: true,
                solvedParams: {
                    packGroups: newPackGroups
                },
                derived: { kScale, T_baseline }
            };
        }

        return { ok: false, errors: ["Mode not supported for Arc"] };
    }

    getSummary(ctx: { geometry: ArcSpringParams; material: any; result: PlatformResult }): PlatformDesignSummary {
        const { geometry } = ctx;
        const totalGroups = geometry.packGroups.reduce((acc, g) => acc + g.count, 0);

        return {
            title: "弧形弹簧设计摘要 (OEM Scheme A) / Arc Spring Summary",
            details: [
                { label: "支架半径 / Backbone Radius (R)", value: geometry.R.toFixed(1), unit: "mm" },
                { label: "线径 / Wire Diam (d)", value: geometry.d.toFixed(2), unit: "mm" },
                { label: "中径 / Mean Diam (Dm)", value: geometry.Dm.toFixed(1), unit: "mm" },
                { label: "包络转角 / Arc Span", value: geometry.arcSpanDeg.toFixed(1), unit: "deg" },
                { label: "弹簧总量 / Total Springs", value: totalGroups.toString(), unit: "pcs" },
                { label: "最大储能 / Max Energy", value: ctx.result.totalEnergy?.toFixed(3) || "0", unit: "J" }
            ],
            warnings: ctx.result.cases.flatMap(c => c.status !== "ok" ? [c.messageEn || "Engineering warning detected"] : [])
        };
    }
}
