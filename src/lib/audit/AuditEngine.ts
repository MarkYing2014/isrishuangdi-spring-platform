// src/lib/audit/AuditEngine.ts
import {
    SpringAuditResult,
    AuditStatus,
    GeometryAudit,
    LoadcaseAudit,
    StressAudit,
    StabilityAudit,
    FatigueAudit
} from "./types";

export interface AuditEvaluationInput {
    springType: string;
    geometry: any;
    results: any;
    policy?: {
        stressWarnThreshold?: number;  // default 60%
        stressFailThreshold?: number;  // default 80%
        travelWarnThreshold?: number;  // default 75%
        travelFailThreshold?: number;  // default 95%
    };
}

/**
 * Unified Engineer Audit Engine
 * Evaluates spring health across 5 modules and identifies the governing failure mode.
 */
export class AuditEngine {
    private static DEFAULT_POLICY = {
        stressWarnThreshold: 60,
        stressFailThreshold: 80,
        travelWarnThreshold: 75,
        travelFailThreshold: 95,
    };

    /**
     * Entry point for evaluating any spring type.
     */
    static evaluate(input: AuditEvaluationInput): SpringAuditResult {
        const policy = { ...this.DEFAULT_POLICY, ...(input.policy ?? {}) };

        // 1. Partial Audits
        const geometry = this.evaluateGeometry(input);
        const loadcase = this.evaluateLoadcase(input, policy);
        const stress = this.evaluateStress(input, policy);
        const stability = this.evaluateStability(input);
        const fatigue = this.evaluateFatigue(input);

        // 2. Determine Overall Status & Governing Mode
        // Priorities: Stress > Loadcase > Stability > Geometry > Fatigue
        let overallStatus: AuditStatus = "PASS";
        let governingMode = "Stress";
        let governingModeZh = "应力";
        let criticalRatio = stress.stressRatio;
        let sf = stress.safetyFactor;

        // Status Propagation
        const statusMap: Record<AuditStatus, number> = { "FAIL": 3, "WARN": 2, "PASS": 1 };

        // Candidates for governing mode
        const candidates = [
            { name: "Stress", nameZh: "应力", status: stress.status, ratio: stress.stressRatio, sf: stress.safetyFactor },
            { name: "Loadcase", nameZh: "工况", status: loadcase.travel.status, ratio: loadcase.travel.ratio, sf: 100 / (loadcase.travel.ratio || 1) },
        ];

        if (stability) {
            candidates.push({ name: "Stability", nameZh: "稳定性", status: stability.status, ratio: 100 - stability.margin, sf: stability.margin / 10 });
        }

        // Search for highest severity
        let maxSeverity = 0;
        for (const c of candidates) {
            const sev = statusMap[c.status as AuditStatus];
            if (sev > maxSeverity) {
                maxSeverity = sev;
                overallStatus = c.status;
                governingMode = c.name;
                governingModeZh = c.nameZh;
                criticalRatio = c.ratio;
                sf = c.sf;
            } else if (sev === maxSeverity && c.ratio > criticalRatio) {
                // Tie-breaker: higher ratio wins
                criticalRatio = c.ratio;
                sf = c.sf;
            }
        }

        return {
            status: overallStatus,
            summary: {
                governingFailureMode: governingMode,
                governingFailureModeZh: governingModeZh,
                criticalRatio,
                safetyFactor: sf,
            },
            audits: {
                geometry,
                loadcase,
                stress,
                stability,
                fatigue,
            },
            notes: this.generateNotes(input, { overallStatus, governingMode }),
        };
    }

    private static evaluateGeometry(input: AuditEvaluationInput): GeometryAudit {
        const { springType, geometry, results } = input;
        const audit: GeometryAudit = {};

        if (springType === "torsion" || springType === "arc" || springType === "compression" || springType === "extension" || springType === "conical" || springType === "variablePitchCompression") {
            const C = results.springIndex || (geometry.meanDiameter / geometry.wireDiameter);
            audit.springIndex = {
                value: C,
                recommended: [4, 12],
                status: (C < 4 || C > 15) ? "WARN" : "PASS",
            };
        }

        if (springType === "disk") {
            const ratio = geometry.outerDiameter / geometry.innerDiameter;
            audit.customChecks = [
                {
                    labelEn: "Do/Di Ratio",
                    labelZh: "径比 (Do/Di)",
                    value: ratio.toFixed(2),
                    status: (ratio < 1.5 || ratio > 2.5) ? "WARN" : "PASS"
                }
            ];
        }

        return audit;
    }

    private static evaluateLoadcase(input: AuditEvaluationInput, policy: any): LoadcaseAudit {
        const { springType, results } = input;

        // Normalize travel
        let used = 0;
        let maxAllowed = 1;
        let unit = "mm";

        if (springType === "torsion" || springType === "arc") {
            used = results.angles?.deltaDeg || results.workingDeflection || 0;
            maxAllowed = input.policy?.travelFailThreshold || 180; // Placeholder
            unit = "°";
        } else if (springType === "spiralTorsion") {
            used = results.maxWorkingAngle || results.workingDeflection || 0;
            maxAllowed = results.maxDeflection || results.closeOutAngle || 360;
            unit = "°";
        } else if (springType === "compression" || springType === "extension" || springType === "conical" || springType === "variablePitchCompression") {
            used = results.workingDeflection || results.delta || 0;
            maxAllowed = results.maxDeflection || results.usableTravel || results.totalDeflectionCapacity || 10;
            unit = "mm";
        } else {
            used = results.travel_mm || results.delta || 0;
            maxAllowed = results.maxTravel || results.maxDeflection || 10;
            unit = "mm";
        }

        const ratio = (used / maxAllowed) * 100;
        let status: AuditStatus = "PASS";
        if (ratio >= (policy.travelFailThreshold)) status = "FAIL";
        else if (ratio >= (policy.travelWarnThreshold)) status = "WARN";

        return {
            travel: { used, maxAllowed, unit, ratio, status },
            directionCheck: {
                expected: "compress",
                actual: results.direction || "neutral",
                status: "PASS",
            }
        };
    }

    private static evaluateStress(input: AuditEvaluationInput, policy: any): StressAudit {
        const { springType, results } = input;

        const mapping: Record<string, { en: string, zh: string }> = {
            torsion: { en: "Leg + Body Torsion", zh: "支腿与簧体扭转" },
            arc: { en: "Helical Shear (Factory)", zh: "螺旋切应力 (工厂标准)" },
            wave: { en: "Crest Bending", zh: "波峰弯曲应力" },
            disk: { en: "Membrane + Bending (DIN 2092)", zh: "薄膜与弯曲组合应力" },
            compression: { en: "Helical Shear (DIN EN 13906-1)", zh: "螺旋切应力 (DIN EN 13906-1)" },
            extension: { en: "Helical Shear (DIN EN 13906-2)", zh: "螺旋切应力 (DIN EN 13906-2)" },
            spiralTorsion: { en: "Bending Stress (Handbook)", zh: "弯曲应力 (手册标准)" },
            conical: { en: "Helical Shear (DIN EN 13906-3)", zh: "螺旋切应力 (DIN EN 13906-3)" },
            variablePitchCompression: { en: "Progressive Helical Shear", zh: "渐进式螺旋切应力" },
        };

        const mode = mapping[springType] || { en: "Helical Shear", zh: "螺旋切应力" };

        const maxStress = results.maxStress || results.stress || 0;
        const allowableStress = results.allowableStress || 1000;
        const ratio = (maxStress / allowableStress) * 100;
        const sf = allowableStress / (maxStress || 1);

        let status: AuditStatus = "PASS";
        if (ratio >= policy.stressFailThreshold) status = "FAIL";
        else if (ratio >= policy.stressWarnThreshold) status = "WARN";

        return {
            governingMode: mode.en,
            governingModeZh: mode.zh,
            maxStress,
            allowableStress,
            stressRatio: ratio,
            safetyFactor: sf,
            status,
        };
    }

    private static evaluateStability(input: AuditEvaluationInput): StabilityAudit | undefined {
        const { springType, results } = input;
        if (springType === "wave") {
            return {
                mode: "Local Buckling",
                modeZh: "局部失稳",
                margin: 0.8, // Dummy
                status: "PASS",
            };
        }
        return undefined;
    }

    private static evaluateFatigue(input: AuditEvaluationInput): FatigueAudit | undefined {
        return undefined; // Phase 5 V1 placeholder
    }

    private static generateNotes(input: AuditEvaluationInput, summary: any): string[] {
        const notes: string[] = [];
        if (summary.overallStatus === "PASS") {
            notes.push("Engineering design is within safety margins.");
        } else if (summary.overallStatus === "FAIL") {
            notes.push(`Critical issue detected in ${summary.governingMode}. Immediate redesign required.`);
        }
        return notes;
    }
}
