import {
    ISpringEngine,
    PlatformResult,
    LoadCaseResult,
    CaseStatus,
    CaseStatusReason,
    PlatformModules,
    PlatformInputMode,
    PlatformSpringType,
    PlatformMaterialModel,
    SolveForTargetInput,
    SolveForTargetResult
} from "../types";
import { buildTorsionDesignRuleReport } from "@/lib/designRules/torsionRules";
import {
    calculateTorsionSpringRate,
    calculateTorsionBendingStress,
    calculateCoilDiameterChange
} from "@/lib/engine/torsionArm";
import { SpringMaterialId } from "@/lib/materials/springMaterials";

export class TorsionEngine implements ISpringEngine {
    type = "torsion" as const;

    calculate(params: {
        geometry: {
            d: number;
            D: number;
            n: number;
            legLength1: number;
            legLength2: number;
            freeAngle: number;
        };
        material: PlatformMaterialModel;
        cases: {
            mode: PlatformInputMode;
            values: number[];
        };
        modules: PlatformModules;
        springType?: PlatformSpringType;
    }): PlatformResult {
        const { d, D, n } = params.geometry;
        const E = params.material.E ?? 206000;
        // Torsion allowable bending stress is usually higher than shear.
        // Roughly sigma_allow = 0.7 * UTS. We simulate it here as 1.4 * tauAllow for now.
        const sigmaAllow = params.material.tauAllow ? params.material.tauAllow * 1.4 : 1000;
        const { values, mode } = params.cases;

        const meanDiameter = D;
        const springIndex = meanDiameter / d;

        // Spring Rate in Nmm/deg
        const k = calculateTorsionSpringRate(d, meanDiameter, n, E);

        const caseResults: LoadCaseResult[] = values.map((val, idx) => {
            let theta = 0;
            let M = 0;

            if (mode === "angle") {
                theta = val;
                M = k * theta;
            } else {
                M = val;
                theta = k > 0 ? M / k : 0;
            }

            // Bending Stress
            const stressResult = calculateTorsionBendingStress(M, d, meanDiameter);
            const sigma = stressResult.correctedStress;

            // Diameter Change (Winding up)
            const dChange = calculateCoilDiameterChange(d, theta, n);
            const newID = (meanDiameter - d) + dChange;

            // Determine status
            let status: CaseStatus = "ok";
            let statusReason: CaseStatusReason = "none";
            let isValid = true;
            let messageZh = "";
            let messageEn = "";

            if (theta < 0) {
                status = "warning";
                statusReason = "travel";
                messageZh = "扭转角度为负";
                messageEn = "Negative angle";
            } else if (params.modules.stressAnalysis && sigma > sigmaAllow) {
                status = "danger";
                statusReason = "stress";
                messageZh = "弯曲应力超限";
                messageEn = "Bending stress exceeds limit";
            } else if (params.modules.legAnalysis && newID < d * 1.5) {
                status = "warning";
                statusReason = "geometry";
                messageZh = "内径过小，可能干涉芯轴";
                messageEn = "ID too small, possible arbor interference";
            }

            return {
                id: `Case ${idx + 1}`,
                labelEn: `Point ${idx + 1}`,
                labelZh: `点位 ${idx + 1}`,
                inputValue: val,
                inputMode: mode,
                altInputValue: mode === "angle" ? M : theta,
                altInputLabel: mode === "angle" ? "扭矩 M" : "角度 θ",
                load: M, // Torque Nmm
                stress: sigma,
                status,
                statusReason,
                isValid: theta >= 0,
                messageEn,
                messageZh
            };
        });

        // Generate Design Rules
        // Generate Design Rules
        const geometry: any = {
            wireDiameter: d,
            meanDiameter: D,
            activeCoils: n,
            legLength1: params.geometry.legLength1,
            legLength2: params.geometry.legLength2,
            // Extracts Angle: if mode is "angle", input is Angle. If mode is "torque", alt is Angle.
            workingAngle: Math.max(...caseResults.map(c => Math.abs(c.inputMode === "angle" ? c.inputValue : (c.altInputValue || 0))))
        };

        const analysisResult: any = {
            shearStress: Math.max(...caseResults.map(c => c.stress || 0)), // Torsion usually uses sigma (bending) but rules map to stress field
            maxStress: Math.max(...caseResults.map(c => c.stress || 0))
        };

        const report = buildTorsionDesignRuleReport({ geometry, analysisResult });

        const designRules = report.findings.map((f: any) => ({
            id: f.id,
            label: f.titleEn,
            status: (f.level === "error" ? "fail" : f.level === "warning" ? "warning" : "pass") as "pass" | "fail" | "warning",
            message: (f.detailZh || f.detailEn || "") as string,
            value: f.evidence ? String(Object.values(f.evidence)[0]) : "-",
            limit: "-"
        }));

        // Inject Engine Runtime Checks (Travel, Stress, Geometry)
        const firstFail = caseResults.find(c => c.status === "danger" || c.status === "warning");
        if (firstFail) {
            designRules.unshift({
                id: "ENG_RUNTIME_CHECK",
                label: firstFail.statusReason === "stress" ? "Stress / 应力" : (firstFail.statusReason === "geometry" ? "Geometry / 几何" : "Oper. Range / 行程"),
                status: firstFail.status === "danger" ? "fail" : "warning",
                message: firstFail.messageZh || firstFail.messageEn || "Runtime Warning",
                value: firstFail.altInputValue?.toFixed(1) ?? "-",
                limit: "-"
            });
        }

        return {
            springType: "torsion",
            cases: caseResults,
            springRate: k,
            springIndex,
            wahlFactor: calculateTorsionBendingStress(1, d, meanDiameter).correctionFactor,
            isValid: caseResults.every(c => c.isValid),
            maxStress: Math.max(...caseResults.map(c => c.stress || 0)),
            tauAllow: sigmaAllow,
            designRules // <--- Added
        };
    }

    solveForTarget(
        params: any,
        input: SolveForTargetInput
    ): SolveForTargetResult {
        const { d, D } = params.geometry;
        const E = params.material.E ?? 206000;
        const { mode, target1, clamps } = input;

        const nRange = clamps?.nRange || [2, 50];

        let solvedN = 0;
        let derivedKT = 0;
        const errors: string[] = [];

        try {
            if (mode === "singlePoint") {
                const theta = target1.x; // Angle in degrees
                const M = target1.y;     // Torque in Nmm

                if (theta <= 0) {
                    errors.push("Angle must be positive for torsion solve.");
                    return { ok: false, errors };
                }
                if (M <= 0) {
                    errors.push("Torque must be positive for torsion solve.");
                    return { ok: false, errors };
                }

                derivedKT = M / theta;
                // Inverse of: k = (E * d^4) / (D * n * 64) * (Math.PI / 180)
                // n = (E * d^4 * PI) / (D * 64 * k * 180)
                solvedN = (E * Math.pow(d, 4) * Math.PI) / (D * 64 * derivedKT * 180);
            } else {
                errors.push("Torsion engine currently only supports single-point reverse solve.");
                return { ok: false, errors };
            }

            if (solvedN < nRange[0] || solvedN > nRange[1]) {
                errors.push(`Calculated coils (n=${solvedN.toFixed(2)}) out of recommended range [${nRange[0]}, ${nRange[1]}].`);
                return { ok: false, errors };
            }

            return {
                ok: true,
                solvedParams: {
                    n: Number(solvedN.toFixed(2))
                },
                derived: {
                    kt: derivedKT
                }
            };
        } catch (e) {
            return { ok: false, errors: ["Internal solver error: " + (e as Error).message] };
        }
    }
}
