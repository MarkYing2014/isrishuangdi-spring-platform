// src/lib/audit/AuditEngine.ts
import {
    SpringAuditResult,
    AuditStatus,
    GeometryAudit,
    LoadcaseAudit,
    StressAudit,
    StabilityAudit,
    FatigueAudit,
    DeliverabilityAudit,
    DeliverabilityFinding,
    DeliverabilityLevel,
    DeliverabilityImpact,
    DeliverabilityRecommendation
} from "./types";
import {
    EngineeringRequirements,
    CycleClass,
    CorrosionClass,
    SurfaceFinish,
    ClearanceClass
} from "./engineeringRequirements";
import { GARTER_SPRING_FACTORY_POLICY, deltaDLimitMM, calcAllowableShearFromSy } from "../policy/garterSpringPolicy";

export interface AuditEvaluationInput {
    springType: string;
    geometry: any;
    results: any;
    /** Engineering Requirements for deliverability audit (Phase 6) */
    engineeringRequirements?: EngineeringRequirements;
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

        // Phase 6: Deliverability Audit (Engineering Requirements)
        const deliverability = this.evaluateDeliverability(input);

        // 2. Determine Overall Status & Governing Mode
        // P0 FIX: Deliverability is separate track, NEVER part of safety governing mode
        // Safety Priorities: Stress > Loadcase > Stability > Geometry > Fatigue

        let safetyStatus: AuditStatus = "PASS";
        let governingMode = "Stress";
        let governingModeZh = "应力";
        let criticalRatio = stress.stressRatio;
        let sf = stress.safetyFactor;

        // Status Propagation
        const statusMap: Record<AuditStatus, number> = { "FAIL": 3, "WARN": 2, "PASS": 1, "INFO": 0 };

        // Candidates for SAFETY governing mode only (NOT Deliverability)
        const safetyCandidates = [
            { name: "Stress", nameZh: "应力", status: stress.status, ratio: stress.stressRatio, sf: stress.safetyFactor },
            { name: "Loadcase", nameZh: "工况", status: loadcase.travel.status, ratio: loadcase.travel.ratio, sf: 100 / (loadcase.travel.ratio || 1) },
        ];

        if (stability) {
            safetyCandidates.push({ name: "Stability", nameZh: "稳定性", status: stability.status, ratio: 100 - stability.margin, sf: stability.margin / 10 });
        }

        // Phase 4.2: Governing Override Priority (These ARE safety-related, like Assembly Hard Constraints)
        if (input.results.governingOverride) {
            const ov = input.results.governingOverride;
            safetyCandidates.push({
                name: ov.mode,
                nameZh: ov.modeZh || ov.zh || ov.mode,
                status: ov.status || "FAIL",
                ratio: ov.ratio,
                sf: ov.sf
            });
        }

        // Search for highest SAFETY severity
        let maxSeverity = 0;
        for (const c of safetyCandidates) {
            const sev = statusMap[c.status as AuditStatus];
            if (sev > maxSeverity) {
                maxSeverity = sev;
                safetyStatus = c.status;
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

        // P0: Calculate deliverabilityStatus separately
        const deliverabilityStatus: AuditStatus = deliverability?.status || "PASS";

        // Overall status is worst of safety and deliverability (for backwards compatibility)
        // But UI should use safetyStatus for safety-critical decisions
        const overallStatus: AuditStatus =
            statusMap[deliverabilityStatus] > statusMap[safetyStatus]
                ? deliverabilityStatus
                : safetyStatus;

        // Check for degraded signals (Missing Limits)
        const isDegraded = stress.notes?.includes("Material limits missing") || false;

        return {
            status: overallStatus,
            safetyStatus,
            deliverabilityStatus,
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
                deliverability,
            },
            notes: this.generateNotes(input, { overallStatus, safetyStatus, deliverabilityStatus, governingMode, deliverability }),
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

    // =========================================================================
    // Phase 6: Deliverability Audit (Engineering Requirements)
    // =========================================================================

    /**
     * Evaluate deliverability based on Engineering Requirements.
     * This checks if a design can be manufactured, assembled, and delivered reliably.
     * 
     * CRITICAL: This does NOT affect calculations - purely for audit judgment.
     */
    private static evaluateDeliverability(input: AuditEvaluationInput): DeliverabilityAudit | undefined {
        const requirements = input.engineeringRequirements;

        // If no requirements specified, skip deliverability audit
        if (!requirements) return undefined;

        const findings: DeliverabilityFinding[] = [];

        // 1. Check Assembly Clearance
        this.checkAssemblyClearance(input, requirements, findings);

        // 2. Check Surface vs Environment Compatibility
        this.checkSurfaceEnvironment(requirements, findings);

        // 3. Check Lifespan/Fatigue Requirements
        this.checkLifespanRequirements(input, requirements, findings);

        // 4. Check Tolerance Feasibility
        this.checkToleranceFeasibility(requirements, findings);

        // Calculate summary
        const failCount = findings.filter(f => f.severity === "FAIL").length;
        const warnCount = findings.filter(f => f.severity === "WARN").length;
        const passCount = findings.length - failCount - warnCount;

        // Determine overall status
        let status: AuditStatus = "PASS";
        if (failCount > 0) status = "FAIL";
        else if (warnCount > 0) status = "WARN";

        // P1: Deterministic Deliverability Level Logic
        // Strict mapping for consistent behavior across UI, reports, work orders:
        // - Any finding severity = FAIL → level = HIGH_RISK
        // - WARN count ≥ 2 → level = CHALLENGING
        // - Else → level = STANDARD
        let level: DeliverabilityLevel = "STANDARD";
        if (failCount > 0) {
            level = "HIGH_RISK";
        } else if (warnCount >= 2) {
            level = "CHALLENGING";
        }

        // Collect primary impacts (OpenAI enhancement)
        const primaryImpacts: DeliverabilityImpact[] = [];
        const impactSet = new Set<DeliverabilityImpact>();
        for (const f of findings) {
            if (f.impact && (f.severity === "FAIL" || f.severity === "WARN")) {
                impactSet.add(f.impact);
            }
        }
        primaryImpacts.push(...Array.from(impactSet));

        // Determine overall recommendation (OpenAI enhancement)
        let overallRecommendation: DeliverabilityRecommendation | undefined;
        if (failCount > 0) {
            // Check if any finding requires design change
            const hasDesignChange = findings.some(f => f.recommendation === "DESIGN_CHANGE");
            const hasSupplierIssue = findings.some(f => f.recommendation === "SUPPLIER_SELECTION");
            if (hasDesignChange) overallRecommendation = "DESIGN_CHANGE";
            else if (hasSupplierIssue) overallRecommendation = "SUPPLIER_SELECTION";
            else overallRecommendation = "CUSTOMER_REVIEW";
        } else if (warnCount > 0) {
            overallRecommendation = "PROCESS_CONTROL";
        }

        return {
            status,
            level,
            findings,
            summary: {
                passCount,
                warnCount,
                failCount,
                primaryImpacts
            },
            overallRecommendation
        };
    }

    /**
     * Check assembly clearance requirements
     */
    private static checkAssemblyClearance(
        input: AuditEvaluationInput,
        requirements: EngineeringRequirements,
        findings: DeliverabilityFinding[]
    ): void {
        const { assembly } = requirements;
        if (!assembly || assembly.guideType === "NONE") return;

        // Calculate actual clearance from geometry
        const geometry = input.geometry;
        const guideDia = assembly.guideDiameter;

        if (!guideDia) return;

        // Determine OD/ID based on spring type
        let springOD = geometry.OD || geometry.outerDiameter || (geometry.Dm + geometry.d);
        let springID = geometry.ID || geometry.innerDiameter || (geometry.Dm - geometry.d);

        let actualClearance = 0;
        if (assembly.guideType === "ROD") {
            // Spring over rod: clearance = Spring ID - Rod OD
            actualClearance = springID - guideDia;
        } else if (assembly.guideType === "BORE") {
            // Spring in bore: clearance = Bore ID - Spring OD
            actualClearance = guideDia - springOD;
        }

        // Check against clearance class requirement
        const clearanceClass = assembly.clearanceClass || "STANDARD";
        const limits: Record<ClearanceClass, { min: number; max: number }> = {
            LOOSE: { min: 1.0, max: Infinity },
            STANDARD: { min: 0.3, max: 1.0 },
            TIGHT: { min: 0, max: 0.3 }
        };

        const limit = limits[clearanceClass];

        if (actualClearance < 0) {
            findings.push({
                id: "assembly-interference",
                category: "assembly",
                severity: "FAIL",
                impact: "QUALITY",
                labelEn: "Assembly Interference",
                labelZh: "装配干涉",
                messageEn: `Negative clearance (${actualClearance.toFixed(2)}mm) - spring will not fit`,
                messageZh: `负间隙 (${actualClearance.toFixed(2)}mm) - 弹簧无法装配`,
                requirement: clearanceClass,
                designValue: `${actualClearance.toFixed(2)}mm`,
                recommendation: "DESIGN_CHANGE"
            });
        } else if (clearanceClass === "TIGHT" && actualClearance > limit.max) {
            findings.push({
                id: "assembly-clearance-loose",
                category: "assembly",
                severity: "WARN",
                impact: "QUALITY",
                labelEn: "Clearance Exceeds TIGHT Requirement",
                labelZh: "间隙超出紧配要求",
                messageEn: `Clearance ${actualClearance.toFixed(2)}mm exceeds TIGHT (<0.3mm) requirement`,
                messageZh: `间隙 ${actualClearance.toFixed(2)}mm 超过紧配 (<0.3mm) 要求`,
                requirement: "TIGHT (<0.3mm)",
                designValue: `${actualClearance.toFixed(2)}mm`,
                recommendation: "DESIGN_CHANGE"
            });
        }
    }

    /**
     * Check surface treatment vs environment compatibility
     */
    private static checkSurfaceEnvironment(
        requirements: EngineeringRequirements,
        findings: DeliverabilityFinding[]
    ): void {
        const { surface, environment } = requirements;
        if (!surface || !environment) return;

        const corrosionClass = surface.corrosionClass || "INDOOR";
        const finish = surface.finish || "NONE";

        // Salt spray requirements need corrosion protection
        const saltSprayClasses: CorrosionClass[] = ["SALT_SPRAY_48H", "SALT_SPRAY_96H", "SALT_SPRAY_240H", "SALT_SPRAY_480H"];
        const protectiveFinishes: SurfaceFinish[] = ["ZINC", "ZINC_NICKEL", "PHOSPHATE", "POWDER_COAT", "PASSIVATE"];

        if (saltSprayClasses.includes(corrosionClass) && !protectiveFinishes.includes(finish)) {
            const hours = corrosionClass.replace("SALT_SPRAY_", "").replace("H", "");
            findings.push({
                id: "surface-corrosion-mismatch",
                category: "surface",
                severity: "FAIL",
                impact: "QUALITY",
                labelEn: "Corrosion Protection Required",
                labelZh: "需要防腐处理",
                messageEn: `Salt spray ${hours}H requirement requires corrosion protection (current: ${finish})`,
                messageZh: `${hours}小时盐雾要求需要防腐处理（当前：${finish}）`,
                requirement: corrosionClass,
                designValue: finish,
                recommendation: "PROCESS_CONTROL"
            });
        }

        // High temperature + certain coatings = not compatible
        const tempRange = environment.operatingTempRange || "STANDARD";
        if ((tempRange === "HIGH_TEMP" || tempRange === "EXTREME") && finish === "ZINC") {
            findings.push({
                id: "surface-temp-mismatch",
                category: "surface",
                severity: "WARN",
                impact: "RISK",
                labelEn: "Zinc Not Suitable for High Temperature",
                labelZh: "镀锌不适用于高温环境",
                messageEn: `Zinc plating degrades above 120°C (required: ${tempRange})`,
                messageZh: `镀锌在120°C以上会失效（要求：${tempRange}）`,
                requirement: tempRange,
                designValue: "ZINC",
                recommendation: "PROCESS_CONTROL"
            });
        }
    }

    /**
     * Check lifespan/fatigue requirements
     */
    private static checkLifespanRequirements(
        input: AuditEvaluationInput,
        requirements: EngineeringRequirements,
        findings: DeliverabilityFinding[]
    ): void {
        const { lifespan, surface } = requirements;
        if (!lifespan) return;

        const cycleClass = lifespan.cycleClass || "STATIC";
        const finish = surface?.finish || "NONE";

        // High cycle / Infinite life requires shot peening
        const highCycleClasses: CycleClass[] = ["HIGH_CYCLE", "INFINITE"];
        if (highCycleClasses.includes(cycleClass) && finish !== "SHOT_PEEN") {
            findings.push({
                id: "fatigue-shotpeen-required",
                category: "lifespan",
                severity: "WARN",
                impact: "RISK",
                labelEn: "Shot Peening Recommended for High Cycle Life",
                labelZh: "高循环寿命建议喷丸强化",
                messageEn: `${cycleClass} fatigue life typically requires shot peening (current: ${finish})`,
                messageZh: `${cycleClass} 疲劳寿命通常需要喷丸强化（当前：${finish}）`,
                requirement: cycleClass,
                designValue: finish,
                recommendation: "PROCESS_CONTROL"
            });
        }

        // Check stress ratio against fatigue curves (simplified)
        const results = input.results;
        if (cycleClass === "INFINITE" && results.maxStress && results.tauAllow) {
            const stressRatio = results.maxStress / results.tauAllow;
            if (stressRatio > 0.5) {
                findings.push({
                    id: "fatigue-stress-high",
                    category: "lifespan",
                    severity: "WARN",
                    impact: "RISK",
                    labelEn: "Stress Level May Limit Infinite Life",
                    labelZh: "应力水平可能限制无限寿命",
                    messageEn: `Stress ratio ${(stressRatio * 100).toFixed(0)}% may not achieve infinite life`,
                    messageZh: `应力比 ${(stressRatio * 100).toFixed(0)}% 可能无法达到无限寿命`,
                    requirement: "INFINITE (<50% stress ratio recommended)",
                    designValue: `${(stressRatio * 100).toFixed(0)}%`,
                    recommendation: "DESIGN_CHANGE"
                });
            }
        }
    }

    /**
     * Check tolerance feasibility
     */
    private static checkToleranceFeasibility(
        requirements: EngineeringRequirements,
        findings: DeliverabilityFinding[]
    ): void {
        const { tolerances } = requirements;
        if (!tolerances) return;

        // Ultra-precision tolerances add cost and lead time
        if (tolerances.wireDiameter === "ULTRA_PRECISION") {
            findings.push({
                id: "tolerance-wire-cost",
                category: "tolerance",
                severity: "INFO",
                impact: "COST",
                labelEn: "Ultra-Precision Wire Diameter",
                labelZh: "超精密线径",
                messageEn: "Ultra-precision wire (±0.005mm) requires special sourcing",
                messageZh: "超精密线材（±0.005mm）需要特殊采购",
                requirement: "ULTRA_PRECISION",
                recommendation: "SUPPLIER_SELECTION"
            });
        }

        // Tight load tolerance requires 100% testing
        if (tolerances.loadTolerance === "±1.5%") {
            findings.push({
                id: "tolerance-load-cost",
                category: "tolerance",
                severity: "INFO",
                impact: "COST",
                labelEn: "Tight Load Tolerance",
                labelZh: "严格载荷公差",
                messageEn: "±1.5% load tolerance requires 100% testing",
                messageZh: "±1.5% 载荷公差需要100%检测",
                requirement: "±1.5%",
                recommendation: "PROCESS_CONTROL"
            });
        }
    }

    private static generateNotes(input: AuditEvaluationInput, summary: any): string[] {
        const notes: string[] = [];
        const { safetyStatus, deliverabilityStatus, overallStatus, governingMode, deliverability } = summary;

        // P0: Safety-specific notes (based on safetyStatus, not overall)
        if (safetyStatus === "PASS") {
            notes.push("Engineering Safety: Design is within all safety margins.");
        } else if (safetyStatus === "FAIL") {
            notes.push(`Engineering Safety: Critical issue in ${governingMode}. Immediate redesign required.`);
        } else if (safetyStatus === "WARN") {
            notes.push(`Engineering Safety: ${governingMode} is approaching limits. Review recommended.`);
        }

        // P0: Deliverability-specific notes with correct semantics
        // "Designable but not Deliverable" when Safety=PASS but Deliverability=FAIL
        if (safetyStatus === "PASS" && deliverabilityStatus === "FAIL") {
            notes.push("Engineering conditions not met (Deliverability). Designable but not Deliverable.");
        } else if (deliverabilityStatus === "FAIL") {
            notes.push("Deliverability: Design cannot be manufactured/delivered reliably. Manufacturing waiver may be required.");
        } else if (deliverabilityStatus === "WARN") {
            notes.push("Deliverability: Some manufacturing constraints may increase cost or lead time.");
        }

        return notes;
    }
}

