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
import { buildCompressionDesignRuleReport } from "@/lib/designRules/compressionRules";
import { SpringMaterialId } from "@/lib/materials/springMaterials";

export class CompressionEngine implements ISpringEngine {
    type = "compression" as const;

    calculate(params: {
        geometry: {
            d: number;
            D: number;
            n: number;
            H0: number;
            Hb: number;
        };
        material: PlatformMaterialModel;
        cases: {
            mode: PlatformInputMode;
            values: number[];
        };
        modules: PlatformModules;
        springType?: PlatformSpringType;
    }): PlatformResult {
        const { d, D, n, H0, Hb } = params.geometry;
        const G = params.material.G ?? 79000;
        const tauAllow = params.material.tauAllow ?? 700;
        const { values, mode } = params.cases;

        // Basic helical math
        const meanDiameter = D; // D is mean diameter from form
        const springIndex = meanDiameter / d;
        const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;
        const k = (G * Math.pow(d, 4)) / (8 * Math.pow(meanDiameter, 3) * n);

        const caseResults: LoadCaseResult[] = values.map((val, idx) => {
            let H = 0;
            let delta = 0;

            if (mode === "height") {
                H = val;
                delta = H0 - H;
            } else {
                delta = val;
                H = H0 - delta;
            }

            const P = k * delta;
            const tau = wahlFactor * (8 * P * meanDiameter) / (Math.PI * Math.pow(d, 3));

            // Determine status
            let status: CaseStatus = "ok";
            let statusReason: CaseStatusReason = "none";
            let isValid = true;
            let messageZh = "";
            let messageEn = "";

            if (H < Hb - 0.01) {
                status = "danger";
                statusReason = "solid";
                isValid = false;
                messageZh = "高度低于压并高度";
                messageEn = "Height below solid height";
            } else if (params.modules.stressAnalysis && tau > tauAllow) {
                status = "warning";
                statusReason = "stress";
                messageZh = "应力超过许用限";
                messageEn = "Stress exceeds limit";
            }

            return {
                id: `L${idx + 1}`,
                labelEn: `Point ${idx + 1}`,
                labelZh: `点位 ${idx + 1}`,
                inputValue: val,
                inputMode: mode,
                altInputValue: mode === "height" ? delta : H,
                altInputLabel: mode === "height" ? "压缩 δ" : "高度 H",
                load: P,
                stress: tau,
                status,
                statusReason,
                isValid,
                messageEn,
                messageZh
            };
        });

        // Generate Design Rules
        const geometry: any = {
            d, D, n, H0, Hb
        };

        const analysisResult: any = {
            maxDeflection: H0 - Hb, // Approx max
            // Extract Deflection regardless of input mode
            // If mode="height", input=H, alt=delta. If mode="deflection", input=delta, alt=H.
            workingDeflection: Math.max(...caseResults.map(c => c.inputMode === "deflection" ? c.inputValue : (c.altInputValue || 0))),
            shearStress: Math.max(...caseResults.map(c => c.stress || 0)),
            staticSafetyFactor: tauAllow / Math.max(...caseResults.map(c => c.stress || 0.001)),
            springRate: k
        };

        const mockEds: any = {
            geometry: { totalCoils: { nominal: n + 2 } }, // Assume closed ends
            material: { materialId: params.material.id }
        };
        const mockResolved: any = {
            design: {
                wireDiameter: d,
                meanDiameter: D,
                activeCoils: n,
                freeLength: H0
            }
        };

        const report = buildCompressionDesignRuleReport({
            eds: mockEds,
            resolved: mockResolved,
            analysisResult
        });

        const designRules = report.findings.map((f: any) => ({
            id: f.id,
            label: f.titleEn,
            status: (f.level === "error" ? "fail" : f.level === "warning" ? "warning" : "pass") as "pass" | "fail" | "warning",
            message: (f.detailZh || f.detailEn || "") as string,
            value: f.evidence ? String(Object.values(f.evidence)[0]) : "-",
            limit: "-"
        }));

        // Inject Engine Runtime Checks (Solid Height, Stress)
        const firstFail = caseResults.find(c => c.status === "danger" || !c.isValid);
        if (firstFail) {
            designRules.unshift({
                id: "ENG_RUNTIME_FAILURE",
                label: firstFail.statusReason === "solid" ? "Solid Height / 压并" : (firstFail.statusReason === "stress" ? "Stress / 应力" : "Runtime Error"),
                status: "fail",
                message: firstFail.messageZh || firstFail.messageEn || "Runtime Failure",
                value: firstFail.altInputValue?.toFixed(2) ?? "-",
                limit: firstFail.statusReason === "solid" ? Hb.toFixed(2) : (firstFail.statusReason === "stress" ? tauAllow.toFixed(0) : "-")
            });
        }

        return {
            springType: "compression",
            cases: caseResults,
            springRate: k,
            springIndex,
            wahlFactor,
            H0,
            Hb,
            isValid: caseResults.every(c => c.isValid),
            maxStress: Math.max(...caseResults.map(c => c.stress || 0)),
            tauAllow: tauAllow,
            designRules // <--- Added
        };
    }

    solveForTarget(
        params: any,
        input: SolveForTargetInput
    ): SolveForTargetResult {
        const { d, D, H0 } = params.geometry;
        const G = params.material.G ?? 79000;
        const { mode, target1, clamps } = input;

        const nRange = clamps?.nRange || [2, 50];

        let solvedN = 0;
        let derivedK = 0;
        const errors: string[] = [];

        try {
            if (mode === "singlePoint") {
                const delta = target1.x; // Deflection
                const P = target1.y;     // Load

                if (delta <= 0) {
                    errors.push("Deflection must be positive for compression solve.");
                    return { ok: false, errors };
                }
                if (P <= 0) {
                    errors.push("Load must be positive for compression solve.");
                    return { ok: false, errors };
                }

                derivedK = P / delta;
                solvedN = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * derivedK);
            } else {
                errors.push("Compression engine currently only supports single-point reverse solve.");
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
                    k: derivedK
                }
            };
        } catch (e) {
            return { ok: false, errors: ["Internal solver error: " + (e as Error).message] };
        }
    }
}
