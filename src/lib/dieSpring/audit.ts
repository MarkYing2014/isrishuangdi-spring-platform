/**
 * Die Spring Factory Audit Rules
 * 模具弹簧工厂审核规则
 * 
 * ⚠️ These rules are MANDATORY for OEM applications.
 * Audit > Math - enforcement of catalog constraints is the core value.
 * 
 * @module dieSpring/audit
 */

import {
    DieSpringSpec,
    DieSpringInstallation,
    DieSpringAuditResult,
    DieSpringAuditFinding,
    DieSpringAuditStatus,
    LIFE_CLASS_INFO,
} from "./types";
import { getStrokeLimitForLifeClass, getSlendernessRatio, getMaxPhysicalStroke } from "./math";

// ============================================================================
// AUDIT RULE DEFINITIONS
// ============================================================================

/**
 * Rule: Stroke exceeds life class limit
 * HARD FAIL - stroke exceeds selected life class stroke limit
 */
function auditStrokeVsLifeLimit(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding | null {
    const limit = getStrokeLimitForLifeClass(spec.strokeLimits, installation.lifeClass);
    const { appliedStroke, lifeClass } = installation;

    if (appliedStroke > limit) {
        return {
            ruleId: "STROKE_LIFE_EXCEEDED",
            rule: "Stroke vs Life Limit",
            status: "FAIL",
            message: {
                en: `Applied stroke (${appliedStroke.toFixed(1)} mm) exceeds ${lifeClass} life limit (${limit.toFixed(1)} mm)`,
                zh: `实际行程 (${appliedStroke.toFixed(1)} mm) 超过 ${LIFE_CLASS_INFO[lifeClass].name.zh} 寿命限制 (${limit.toFixed(1)} mm)`,
            },
            value: appliedStroke,
            limit,
        };
    }

    // Warning at 80% of limit
    if (appliedStroke > limit * 0.8) {
        return {
            ruleId: "STROKE_LIFE_WARNING",
            rule: "Stroke vs Life Limit",
            status: "WARN",
            message: {
                en: `Applied stroke at ${((appliedStroke / limit) * 100).toFixed(0)}% of ${lifeClass} life limit`,
                zh: `实际行程达到 ${LIFE_CLASS_INFO[lifeClass].name.zh} 寿命限制的 ${((appliedStroke / limit) * 100).toFixed(0)}%`,
            },
            value: appliedStroke,
            limit,
        };
    }

    return null;
}

/**
 * Rule: Stroke exceeds absolute maximum
 * HARD FAIL - stroke at or above catalog maximum
 */
function auditStrokeVsMax(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding | null {
    const { appliedStroke } = installation;
    const maxStroke = spec.strokeLimits.max;

    if (appliedStroke >= maxStroke) {
        return {
            ruleId: "STROKE_MAX_EXCEEDED",
            rule: "Maximum Stroke Limit",
            status: "FAIL",
            message: {
                en: `Applied stroke (${appliedStroke.toFixed(1)} mm) exceeds catalog maximum (${maxStroke.toFixed(1)} mm)`,
                zh: `实际行程 (${appliedStroke.toFixed(1)} mm) 超过目录最大值 (${maxStroke.toFixed(1)} mm)`,
            },
            value: appliedStroke,
            limit: maxStroke,
        };
    }

    return null;
}

/**
 * Rule: Bottoming out (solid height reached)
 * HARD FAIL - stroke exceeds physical limit (L0 - Hs)
 */
function auditBottomingOut(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding | null {
    const { appliedStroke } = installation;
    const maxPhysicalStroke = getMaxPhysicalStroke(spec);

    if (appliedStroke >= maxPhysicalStroke) {
        return {
            ruleId: "BOTTOMING_OUT",
            rule: "Solid Height Protection",
            status: "FAIL",
            message: {
                en: `Spring bottomed out — stroke (${appliedStroke.toFixed(1)} mm) exceeds available travel (${maxPhysicalStroke.toFixed(1)} mm)`,
                zh: `弹簧压并 — 行程 (${appliedStroke.toFixed(1)} mm) 超过可用行程 (${maxPhysicalStroke.toFixed(1)} mm)`,
            },
            value: appliedStroke,
            limit: maxPhysicalStroke,
        };
    }

    // Warning at 95% of physical limit
    if (appliedStroke > maxPhysicalStroke * 0.95) {
        return {
            ruleId: "BOTTOMING_WARNING",
            rule: "Solid Height Protection",
            status: "WARN",
            message: {
                en: `Near solid — only ${(maxPhysicalStroke - appliedStroke).toFixed(1)} mm remaining before bottoming`,
                zh: `接近压并 — 距离压并仅剩 ${(maxPhysicalStroke - appliedStroke).toFixed(1)} mm`,
            },
            value: appliedStroke,
            limit: maxPhysicalStroke,
        };
    }

    return null;
}

/**
 * Rule: Pocket / bore diameter too tight
 * HARD FAIL - pocket OD ≤ spring OD (OD growth will cause binding)
 */
function auditPocketClearance(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding | null {
    const { pocketDiameter } = installation;

    if (pocketDiameter === undefined) return null;

    // OD growth under compression is approx 1-2% for die springs
    const minPocketClearance = spec.outerDiameter * 1.02;

    if (pocketDiameter <= spec.outerDiameter) {
        return {
            ruleId: "POCKET_TOO_TIGHT",
            rule: "Pocket Clearance",
            status: "FAIL",
            message: {
                en: `Pocket diameter (${pocketDiameter.toFixed(1)} mm) ≤ spring OD (${spec.outerDiameter.toFixed(1)} mm) — OD growth will cause binding`,
                zh: `导向孔径 (${pocketDiameter.toFixed(1)} mm) ≤ 弹簧外径 (${spec.outerDiameter.toFixed(1)} mm) — 外径膨胀将导致卡死`,
            },
            value: pocketDiameter,
            limit: spec.outerDiameter,
        };
    }

    if (pocketDiameter < minPocketClearance) {
        return {
            ruleId: "POCKET_CLEARANCE_WARNING",
            rule: "Pocket Clearance",
            status: "WARN",
            message: {
                en: `Pocket clearance tight — recommend minimum ${minPocketClearance.toFixed(1)} mm to account for OD growth`,
                zh: `导向孔间隙偏小 — 建议最小 ${minPocketClearance.toFixed(1)} mm 以适应外径膨胀`,
            },
            value: pocketDiameter,
            limit: minPocketClearance,
        };
    }

    return null;
}

/**
 * Rule: Guide rod clearance
 * WARN - rod diameter too close to ID
 */
function auditRodClearance(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding | null {
    const { guideRodDiameter } = installation;

    if (guideRodDiameter === undefined) return null;

    // ID reduction under compression is approx 1% for die springs
    const maxRodDiameter = spec.innerDiameter * 0.98;

    if (guideRodDiameter >= spec.innerDiameter) {
        return {
            ruleId: "ROD_TOO_LARGE",
            rule: "Guide Rod Clearance",
            status: "FAIL",
            message: {
                en: `Guide rod (${guideRodDiameter.toFixed(1)} mm) ≥ spring ID (${spec.innerDiameter.toFixed(1)} mm) — rod will bind`,
                zh: `导向杆 (${guideRodDiameter.toFixed(1)} mm) ≥ 弹簧内径 (${spec.innerDiameter.toFixed(1)} mm) — 导向杆将卡死`,
            },
            value: guideRodDiameter,
            limit: spec.innerDiameter,
        };
    }

    if (guideRodDiameter > maxRodDiameter) {
        return {
            ruleId: "ROD_CLEARANCE_WARNING",
            rule: "Guide Rod Clearance",
            status: "WARN",
            message: {
                en: `Rod clearance tight — recommend max ${maxRodDiameter.toFixed(1)} mm to account for ID reduction`,
                zh: `导向杆间隙偏小 — 建议最大 ${maxRodDiameter.toFixed(1)} mm 以适应内径收缩`,
            },
            value: guideRodDiameter,
            limit: maxRodDiameter,
        };
    }

    return null;
}

/**
 * Rule: Buckling risk for slender springs
 * WARN - L0/OD > 3 without guidance
 */
function auditBucklingRisk(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding | null {
    const slenderness = getSlendernessRatio(spec);
    const hasGuidance = installation.pocketDiameter !== undefined ||
        installation.guideRodDiameter !== undefined;

    if (slenderness > 4 && !hasGuidance) {
        return {
            ruleId: "BUCKLING_CRITICAL",
            rule: "Buckling Prevention",
            status: "FAIL",
            message: {
                en: `High buckling risk — slenderness ratio ${slenderness.toFixed(1)} exceeds 4 without guidance`,
                zh: `高屈曲风险 — 细长比 ${slenderness.toFixed(1)} 超过 4 且无导向`,
            },
            value: slenderness,
            limit: 4,
        };
    }

    if (slenderness > 3 && !hasGuidance) {
        return {
            ruleId: "BUCKLING_WARNING",
            rule: "Buckling Prevention",
            status: "WARN",
            message: {
                en: `Guidance recommended — slenderness ratio ${slenderness.toFixed(1)} exceeds 3`,
                zh: `建议使用导向 — 细长比 ${slenderness.toFixed(1)} 超过 3`,
            },
            value: slenderness,
            limit: 3,
        };
    }

    return null;
}

/**
 * Rule: Preload check
 * WARN - preload too small may cause spring rattle
 */
function auditPreload(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding | null {
    const { preloadStroke = 0 } = installation;
    const minPreload = spec.freeLength * 0.10; // 10% of free length

    if (preloadStroke < minPreload && preloadStroke > 0) {
        return {
            ruleId: "PRELOAD_WARNING",
            rule: "Preload Check",
            status: "WARN",
            message: {
                en: `Preload (${preloadStroke.toFixed(1)} mm) is less than 10% of free length — may cause spring rattle`,
                zh: `预载 (${preloadStroke.toFixed(1)} mm) 小于自由长度的 10% — 可能导致弹簧松动`,
            },
            value: preloadStroke,
            limit: minPreload,
        };
    }

    return null;
}

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

/**
 * Run full factory audit on die spring configuration.
 * 
 * @param spec - Die spring specification from catalog
 * @param installation - User installation parameters
 * @returns Complete audit result with status and findings
 */
export function auditDieSpring(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditResult {
    const findings: DieSpringAuditFinding[] = [];

    // Run all audit rules
    const rules = [
        auditStrokeVsLifeLimit,
        auditStrokeVsMax,
        auditBottomingOut,
        auditPocketClearance,
        auditRodClearance,
        auditBucklingRisk,
        auditPreload,
    ];

    for (const rule of rules) {
        const finding = rule(spec, installation);
        if (finding) {
            findings.push(finding);
        }
    }

    // Determine overall status (worst of all findings)
    let overallStatus: DieSpringAuditStatus = "PASS";
    for (const finding of findings) {
        if (finding.status === "FAIL") {
            overallStatus = "FAIL";
            break;
        }
        if (finding.status === "WARN") {
            overallStatus = "WARN";
        }
    }

    // Generate summary messages
    const summaryEn: string[] = [];
    const summaryZh: string[] = [];

    if (overallStatus === "PASS") {
        summaryEn.push("All factory audit checks passed.");
        summaryZh.push("所有工厂审核检查通过。");
    } else {
        const failCount = findings.filter(f => f.status === "FAIL").length;
        const warnCount = findings.filter(f => f.status === "WARN").length;

        if (failCount > 0) {
            summaryEn.push(`${failCount} critical issue(s) found.`);
            summaryZh.push(`发现 ${failCount} 个严重问题。`);
        }
        if (warnCount > 0) {
            summaryEn.push(`${warnCount} warning(s) noted.`);
            summaryZh.push(`存在 ${warnCount} 个警告。`);
        }
    }

    return {
        status: overallStatus,
        findings,
        summaryMessages: {
            en: summaryEn,
            zh: summaryZh,
        },
    };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Quick check if a configuration passes all critical rules
 */
export function isConfigurationValid(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): boolean {
    const result = auditDieSpring(spec, installation);
    return result.status !== "FAIL";
}

/**
 * Get list of failed rules only
 */
export function getFailedRules(
    spec: DieSpringSpec,
    installation: DieSpringInstallation
): DieSpringAuditFinding[] {
    const result = auditDieSpring(spec, installation);
    return result.findings.filter(f => f.status === "FAIL");
}
