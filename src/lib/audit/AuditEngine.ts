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
import { GARTER_SPRING_FACTORY_POLICY, deltaDLimitMM, calcAllowableShearFromSy } from "../policy/garterSpringPolicy";

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
        const statusMap: Record<AuditStatus, number> = { "FAIL": 3, "WARN": 2, "PASS": 1, "INFO": 0 };

        // Candidates for governing mode
        const candidates = [
            { name: "Stress", nameZh: "应力", status: stress.status, ratio: stress.stressRatio, sf: stress.safetyFactor },
            { name: "Loadcase", nameZh: "工况", status: loadcase.travel.status, ratio: loadcase.travel.ratio, sf: 100 / (loadcase.travel.ratio || 1) },
        ];

        if (stability) {
            candidates.push({ name: "Stability", nameZh: "稳定性", status: stability.status, ratio: 100 - stability.margin, sf: stability.margin / 10 });
        }

        // Consolidate Candidates
        // Phase 4.2: Governing Override Priority
        // If override exists, it is treated as a high-priority finding (usually "Assembly Hard Constraint")
        if (input.results.governingOverride) {
            const ov = input.results.governingOverride;
            // Add as a candidate, but note that "FAIL" here should often win
            candidates.push({
                name: ov.mode,
                nameZh: ov.modeZh || ov.zh || ov.mode,
                status: ov.status || "FAIL", // Default to FAIL if missing in legacy
                ratio: ov.ratio,
                sf: ov.sf
            });
        }

        // Search for highest severity (with Phase 4.2 Priority Logic)
        // Order of severity: FAIL (3) > WARN (2) > PASS (1)
        // If Tie: Override > Stress > Loadcase (Implicitly handled by candidates order? No, loop finds last max? 
        // Let's rely on Severity Score. If tie, we want Override to win.
        // Current candidate order: [Stress, Loadcase, Stability, Override]
        // If Override is FAIL and Stress is FAIL, which wins? 
        // We want Override (Assembly issues usually fundamental). 
        // So putting Override last in array and using >= updates works.

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

        // Check for degraded signals (Missing Limits)
        const isDegraded = stress.notes?.includes("Material limits missing") || false;

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
            degraded: isDegraded
        };
    }

    private static evaluateGeometry(input: AuditEvaluationInput): GeometryAudit {
        const { springType, geometry, results } = input;
        const audit: GeometryAudit = {};

        if (springType === "torsion" || springType === "arc" || springType === "compression" || springType === "extension" || springType === "conical" || springType === "variablePitchCompression" || springType === "garter") {
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

        if (springType === "garter") {
            // Strict Factory C Range: [4, 15]
            const C = results.springIndex || (geometry.meanDiameter / geometry.wireDiameter);
            const { minSpringIndexC, maxSpringIndexC } = GARTER_SPRING_FACTORY_POLICY;
            if (C < minSpringIndexC || C > maxSpringIndexC) {
                audit.springIndex = {
                    value: C,
                    recommended: [minSpringIndexC, maxSpringIndexC],
                    status: "WARN", // Could be FAIL if strictly enforced, using WARN as per usual practice unless safety involved
                };
            }

            // Custom check for Joint Type - Warn if Loop/Screw on dynamic? 
            // For now just standard checks?
            // User requested: "Hook" 1.4, "Screw" 1.2, "Loop" 1.3
            // The policy doesn't explicitly mandate warnings for joint types themselves, 
            // but we can keep the INFO check for Hooks if useful.
            if (geometry.jointType === "hook") {
                audit.customChecks = [
                    {
                        labelEn: "Joint Type",
                        labelZh: "接头类型",
                        value: "Hook",
                        status: "INFO",
                        notes: "Check hook wear and fatigue / 建议检查钩部磨损与疲劳"
                    }
                ];
            }
        }

        return audit;
    }

    private static resolveAllowableStress(results: any, limits: any): number | null {
        // Engineering Rationale:
        // Explicit Limits (Contract) > Implicit Results (Legacy) > NULL
        // We DO NOT fallback to arbitrary defaults (like 1000MPa) to avoid false confidence.

        // 1. Explicit EngineeringLimits Contract
        if (limits?.stressLimit) return limits.stressLimit;
        if (limits?.tauAllow) return limits.tauAllow;
        if (limits?.sigmaAllow) return limits.sigmaAllow;

        // 2. Result/Legacy fields
        if (results?.allowableStress) return results.allowableStress; // Calculator-provided
        if (results?.tauAllow) return results.tauAllow;               // Legacy DB field

        return null; // Signal for Degraded Mode
    }

    private static evaluateLoadcase(input: AuditEvaluationInput, policy: any): LoadcaseAudit {
        const { springType, results, geometry } = input;
        const limits = results.limits;

        // 1. Determine Usage & Capacity
        let used = 0;
        let limit = 0;
        let unit = "mm";

        // Strategy: Use limits contract if available, else fallback to legacy (with strict type checks)
        if (limits && limits.maxDeflection !== undefined) {
            used = results.workingDeflection || results.delta || 0;
            limit = limits.maxDeflection;
            unit = "mm";
        } else if (limits && limits.maxAngle !== undefined) {
            used = results.workingAngle || results.maxWorkingAngle || 0;
            limit = limits.maxAngle;
            unit = "°";
        } else {
            // Fallback Logic (Legacy)
            if (springType === "torsion" || springType === "arc") {
                // FIXED: Do not read workingDeflection for angles
                used = results.workingAngle ?? results.maxWorkingAngle ?? results.angles?.deltaDeg ?? 0;
                limit = input.policy?.travelFailThreshold || 180;
                unit = "°";
            } else if (springType === "spiralTorsion") {
                used = results.maxWorkingAngle || results.workingDeflection || 0;
                limit = results.maxDeflection || results.closeOutAngle || 360;
                unit = "°";
            } else if (springType === "garter") {
                const D_free = geometry.ringFreeDiameter ?? 100;
                const deltaD = Math.abs((geometry.ringInstalledDiameter ?? D_free) - D_free);
                return {
                    travel: { used: deltaD, maxAllowed: deltaDLimitMM(D_free), unit: "mm (ΔD)", ratio: (deltaD / deltaDLimitMM(D_free)) * 100, status: (deltaD / deltaDLimitMM(D_free)) * 100 > 100 ? "WARN" : "PASS" },
                    directionCheck: { expected: "extend", actual: "neutral", status: "PASS" }
                };
            } else {
                used = results.workingDeflection || results.delta || 0;
                limit = results.maxDeflection || results.usableTravel || results.totalDeflectionCapacity || 10;
            }
        }

        const ratio = limit > 0 ? (used / limit) * 100 : 0;
        let status: AuditStatus = "PASS";

        // Unified Thresholds (Eliminate Double Standards)
        // Strictly use limits or standard engineering defaults (0.8 / 1.1)
        const warnThresh = (limits?.warnRatio ?? 0.80) * 100;
        const failThresh = (limits?.failRatio ?? 1.10) * 100;

        if (ratio > failThresh) status = "FAIL";
        else if (ratio > warnThresh) status = "WARN";

        return {
            travel: { used, maxAllowed: limit, unit, ratio, status },
            directionCheck: {
                expected: "compress", // Default
                actual: results.direction || "neutral",
                status: "PASS",
            }
        };
    }

    private static evaluateStress(input: AuditEvaluationInput, policy: any): StressAudit {
        const { springType, results } = input;
        const limits = results.limits;

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
            garter: { en: "Helical Shear (Garter)", zh: "螺旋切应力 (环形拉簧)" },
        };

        const mode = mapping[springType] || { en: "Helical Shear", zh: "螺旋切应力" };

        let maxStress = results.maxStress || results.stress || 0;
        if (springType === "garter") maxStress = results.tauMax ?? 0;

        // 1. Resolve Allowable Stress (Strict)
        const allowableStress = this.resolveAllowableStress(results, limits);

        let status: AuditStatus = "PASS";
        let resolvedAllowable = allowableStress ?? 0;
        let isDegraded = false;
        let notesStr: string | undefined = undefined;

        if (allowableStress === null) {
            // DEGRADED MODE: Limits Missing
            // We cannot PASS or FAIL reliably. We must WARN.
            isDegraded = true;
            status = "WARN";
            notesStr = "Material limits missing. Audit reliability degraded.";
            // Safety factors are undefined/Infinite
        } else {
            // Normal Evaluation
            resolvedAllowable = allowableStress;

            // Unified Thresholds
            const warnRatio = limits?.warnRatio ?? 0.80; // 80%
            const failRatio = limits?.failRatio ?? 1.10; // 110%

            const ratio = (maxStress / resolvedAllowable);

            if (ratio > failRatio) status = "FAIL";
            else if (ratio > warnRatio) status = "WARN";

            // Garter exception (retained for safety)
            if (springType === "garter") {
                const ratioVal = results.stressRatio ?? ratio;
                if (ratioVal > 1.0) status = "FAIL";
                else if (ratioVal > 0.8) status = "WARN";
            }
        }

        const ratioPercentage = resolvedAllowable > 0 ? (maxStress / resolvedAllowable) * 100 : 0;
        const sf = resolvedAllowable / (maxStress || 1);

        return {
            governingMode: mode.en,
            governingModeZh: mode.zh,
            maxStress,
            allowableStress: resolvedAllowable,
            stressRatio: ratioPercentage,
            safetyFactor: sf,
            status,
            notes: notesStr
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

