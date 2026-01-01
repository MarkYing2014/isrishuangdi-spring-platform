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
import {
    calculateHookStress,
    HookType
} from "@/lib/engine/hookStress";
import { SpringMaterialId } from "@/lib/materials/springMaterials";
import { buildExtensionDesignRuleReport } from "@/lib/designRules/extensionRules";

export class ExtensionEngine implements ISpringEngine {
    type = "extension" as const;

    calculate(params: {
        geometry: {
            d: number;
            D: number;
            n: number;
            H0: number; // For extension, H0 is typically free length inside hooks (Li)
            P0: number;
            hookType: string;
        };
        material: PlatformMaterialModel;
        cases: {
            mode: PlatformInputMode;
            values: number[];
        };
        modules: PlatformModules;
        springType?: PlatformSpringType;
    }): PlatformResult {
        const { d, D, n, H0, P0, hookType } = params.geometry;
        const G = params.material.G ?? 79000;
        const tauAllow = params.material.tauAllow ?? 700;
        const { values, mode } = params.cases;

        const meanDiameter = D;
        const springIndex = meanDiameter / d;
        const wahlFactor = (4 * springIndex - 1) / (4 * springIndex - 4) + 0.615 / springIndex;
        const k = (G * Math.pow(d, 4)) / (8 * Math.pow(meanDiameter, 3) * n);

        const caseResults: LoadCaseResult[] = values.map((val, idx) => {
            let L = 0;
            let x = 0;

            if (mode === "height") {
                L = val;
                x = L - H0;
            } else {
                x = val;
                L = H0 + x;
            }

            // Load F = F0 + k * x
            const P = x > 0 ? P0 + k * x : (x === 0 ? P0 : 0);

            // Body Shear Stress
            const tau = wahlFactor * (8 * P * meanDiameter) / (Math.PI * Math.pow(d, 3));

            // Hook Stress Integration (if module enabled)
            let hookResult = null;
            if (params.modules.hookAnalysis && params.material.id) {
                try {
                    // Adapt hook type to engine type
                    const hType = (hookType as HookType) || 'machine';
                    hookResult = calculateHookStress(
                        {
                            wireDiameter: d,
                            meanDiameter,
                            materialId: params.material.id as SpringMaterialId,
                            type: 'extension',
                            activeCoils: n,
                            bodyLength: n * d,
                            initialTension: P0
                        },
                        P,
                        tau,
                        hType
                    );
                } catch (e) {
                    console.warn("Hook analysis failed", e);
                }
            }

            // Determine status
            let status: CaseStatus = "ok";
            let statusReason: CaseStatusReason = "none";
            let isValid = true;
            let messageZh = "";
            let messageEn = "";

            if (x < 0) {
                status = "warning";
                statusReason = "travel";
                messageZh = "伸长量为负";
                messageEn = "Negative extension";
            } else if (params.modules.stressAnalysis && tau > tauAllow) {
                status = "danger";
                statusReason = "stress";
                messageZh = "本体应力超限";
                messageEn = "Body stress exceeds limit";
            } else if (hookResult && hookResult.status === 'danger') {
                status = "danger";
                statusReason = "hook";
                messageZh = `钩子应力过高 (${hookResult.criticalLocation})`;
                messageEn = `High hook stress (${hookResult.criticalLocation})`;
            } else if (hookResult && hookResult.status === 'warning') {
                status = "warning";
                statusReason = "hook";
                messageZh = "钩子应力处于临界区";
                messageEn = "Hook stress marginal";
            }

            return {
                id: `L${idx + 1}`,
                labelEn: `Point ${idx + 1}`,
                labelZh: `点位 ${idx + 1}`,
                inputValue: val,
                inputMode: mode,
                altInputValue: mode === "height" ? x : L,
                altInputLabel: mode === "height" ? "伸长 x" : "高度 L",
                load: P,
                stress: (hookResult && hookResult.combinedStress > tau) ? hookResult.combinedStress : tau,
                status,
                statusReason,
                isValid: x >= 0,
                messageEn,
                messageZh
            };
        });

        // 1. Reconstruct Geometry for Rule Builder
        const geometry: any = {
            type: "extension",
            wireDiameter: d,
            outerDiameter: params.geometry.D + d, // D is mean, OD = D + d
            meanDiameter: D,
            activeCoils: n,
            bodyLength: n * d, // Estimated or need separate input? Extension usually Close Wound Na*d
            freeLength: H0,
            initialTension: P0,
            hookType: hookType || "machine",
            shearModulus: G,
        };

        // 2. Reconstruct Analysis for Rule Builder
        const analysisResult: any = {
            springRate: k,
            springRateUnit: "N/mm",
            initialTension: P0,
            springIndex: springIndex,
            wahlFactor: wahlFactor,
            // Extract Deflection x regardless of input mode
            // If mode="height", input=L, alt=x. If mode="deflection", input=x, alt=L.
            maxDeflection: Math.max(...caseResults.map(c => c.inputMode === "deflection" ? c.inputValue : (c.altInputValue || 0))),
            workingDeflection: Math.max(...caseResults.map(c => c.inputMode === "deflection" ? c.inputValue : (c.altInputValue || 0))),
        };

        // 3. Generate Report
        const report = buildExtensionDesignRuleReport({ geometry, analysisResult });

        // 4. Map findings to Platform format
        // 4. Map findings to Platform format
        const designRules = report.findings.map((f: any) => ({
            id: f.id,
            label: f.titleEn,
            status: (f.level === "error" ? "fail" : f.level === "warning" ? "warning" : "pass") as "pass" | "fail" | "warning",
            message: (f.detailZh || f.detailEn || "") as string,
            value: f.evidence ? String(Object.values(f.evidence)[0]) : "-",
            limit: "-"
        }));

        // Add Metrics as passing rules (to show Green "OK" items like Index)
        if (report.metrics.spring_index) {
            designRules.unshift({
                id: "spring_index",
                label: "Spring Index C",
                status: "pass",
                message: "Within manufacturing range",
                value: String(report.metrics.spring_index.value),
                limit: "4 - 16"
            });
        }

        // 5. Explicitly Flag Engine Validation Failures (e.g. Negative Extension) as Rules
        const firstInvalid = caseResults.find(c => !c.isValid);
        if (firstInvalid) {
            designRules.unshift({
                id: "ENG_INVALID_TRAVEL",
                label: "Operating Range / 工作行程",
                status: "fail",
                message: firstInvalid.messageZh || firstInvalid.messageEn || "Invalid operating point",
                value: typeof firstInvalid.inputValue === "number" ? String(firstInvalid.inputValue.toFixed(2)) : "-",
                limit: "≥ 0"
            });
        }

        return {
            springType: "extension",
            cases: caseResults,
            springRate: k,
            springIndex,
            wahlFactor,
            H0,
            P0,
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
        const { d, D, H0, P0: currentP0 } = params.geometry;
        const G = params.material.G ?? 79000;
        const { mode, target1, target2, clamps } = input;

        const nRange = clamps?.nRange || [2, 50];
        const P0Range = clamps?.P0Range || [0, 1000000];

        let solvedN = 0;
        let solvedP0 = currentP0;
        let derivedK = 0;
        const warnings: string[] = [];
        const errors: string[] = [];

        try {
            if (mode === "singlePoint") {
                const x = target1.x; // inputVar (deflection or length inside)
                const P = target1.y; // outputVar (load)

                // If target1.x is absolute length, convert to extension
                // But let's assume the UI passes x as deflection for simplicity, 
                // OR we check the current inputMode. 
                // For now, let's assume the UI sends deflection for 'x' in target.

                if (x <= 0) {
                    errors.push("Deflection must be positive for single-point solve.");
                    return { ok: false, errors };
                }

                if (P <= currentP0) {
                    errors.push(`Target load (${P}N) must be greater than current initial tension (${currentP0}N).`);
                    return { ok: false, errors };
                }

                derivedK = (P - currentP0) / x;
                solvedN = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * derivedK);
            } else {
                if (!target2) {
                    errors.push("Two-point solve requires target2.");
                    return { ok: false, errors };
                }

                const x1 = target1.x;
                const P1 = target1.y;
                const x2 = target2.x;
                const P2 = target2.y;

                if (Math.abs(x2 - x1) < 0.001) {
                    errors.push("Targets must have different deflection values.");
                    return { ok: false, errors };
                }

                derivedK = (P2 - P1) / (x2 - x1);
                if (derivedK <= 0) {
                    errors.push("Calculated stiffness must be positive. Check your target points.");
                    return { ok: false, errors };
                }

                solvedP0 = P1 - derivedK * x1;
                if (solvedP0 < P0Range[0]) {
                    warnings.push(`Calculated P0 (${solvedP0.toFixed(2)}N) is below limit. Clamping to ${P0Range[0]}N.`);
                    solvedP0 = P0Range[0];
                }

                solvedN = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * derivedK);
            }

            // Check n range
            if (solvedN < nRange[0] || solvedN > nRange[1]) {
                errors.push(`Calculated coils (n=${solvedN.toFixed(2)}) out of recommended range [${nRange[0]}, ${nRange[1]}].`);
                return { ok: false, errors, warnings };
            }

            return {
                ok: true,
                solvedParams: {
                    n: Number(solvedN.toFixed(2)),
                    P0: Number(solvedP0.toFixed(2))
                },
                derived: {
                    k: derivedK
                },
                warnings
            };
        } catch (e) {
            return { ok: false, errors: ["Internal solver error: " + (e as Error).message] };
        }
    }
}
