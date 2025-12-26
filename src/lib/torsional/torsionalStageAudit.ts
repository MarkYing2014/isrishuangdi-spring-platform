/**
 * Stage Transition Audit
 * 
 * OEM-Grade Analysis for Stage Switching Smoothness
 * 
 * Key Metrics:
 * 1. Jump Ratio (ΔK/K) - Stiffness discontinuity
 * 2. Slope Discontinuity - dT/dθ jump
 * 3. Gap/Overlap - Dead zones or simultaneous engagement
 * 
 * Output: PASS / WARN / FAIL with bilingual explanations
 */

import {
    TorsionalSpringSystemDesign,
    TorsionalSystemResult,
    TorsionalCurvePoint,
    TorsionalSpringGroup
} from "./torsionalSystemTypes";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TransitionSeverity = "PASS" | "WARN" | "FAIL";

export interface TransitionAuditThresholds {
    // Jump ratio = (K_after - K_before) / max(K_before, eps)
    jumpWarn: number;  // e.g. 0.30
    jumpFail: number;  // e.g. 0.60

    // Slope discontinuity in torque curve: |dT/dθ_after - dT/dθ_before|
    slopeJumpWarn: number;  // fraction of total K
    slopeJumpFail: number;  // fraction of total K

    // Gap/Overlap in degrees (OEM readable)
    gapWarnDeg: number;      // e.g. 0.5
    gapFailDeg: number;      // e.g. 2.0
    overlapWarnDeg: number;  // e.g. 2.0
    overlapFailDeg: number;  // e.g. 6.0

    // Sampling window around transition for derivative estimation
    windowDeg: number;  // e.g. 0.5 ~ 1.0
}

export interface TransitionFinding {
    fromStage?: number;  // 1 | 2 | 3 | undefined (if entering first stage)
    toStage: number;     // 1 | 2 | 3

    thetaDeg: number;

    kBefore: number;     // Nm/deg
    kAfter: number;      // Nm/deg
    jumpRatio: number;   // (kAfter - kBefore) / kBefore

    slopeBefore: number; // dT/dθ before transition
    slopeAfter: number;  // dT/dθ after transition
    slopeJumpAbs: number;

    gapDeg: number;      // >0 means dead zone (no stage active)
    overlapDeg: number;  // >0 means multiple stages simultaneously active

    severity: TransitionSeverity;
    messageEn: string;
    messageZh: string;
    recommendation?: string;
}

export interface StageTransitionAuditResult {
    overall: TransitionSeverity;
    findings: TransitionFinding[];
    summaryEn: string;
    summaryZh: string;
}

// ============================================================================
// DEFAULT THRESHOLDS (OEM V1 Policy)
// ============================================================================

export const STAGE_AUDIT_THRESHOLDS_V1: TransitionAuditThresholds = {
    jumpWarn: 0.30,     // 30% stiffness jump = warning
    jumpFail: 0.60,     // 60% stiffness jump = fail
    slopeJumpWarn: 0.10,
    slopeJumpFail: 0.25,
    gapWarnDeg: 0.5,
    gapFailDeg: 2.0,
    overlapWarnDeg: 2.0,
    overlapFailDeg: 6.0,
    windowDeg: 0.75
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function isActive(theta: number, group: TorsionalSpringGroup, thetaStopI: number): boolean {
    return group.enabled && theta >= group.theta_start && theta <= thetaStopI;
}

function getStopAngle(group: TorsionalSpringGroup): number {
    const thetaRange = (group.L_free - group.L_solid - group.clearance) / group.R * (180 / Math.PI);
    return group.theta_start + thetaRange;
}

function getActiveGroups(theta: number, groups: TorsionalSpringGroup[]): TorsionalSpringGroup[] {
    return groups.filter(g => g.enabled && theta >= g.theta_start && theta <= getStopAngle(g));
}

function getTotalK(theta: number, groups: TorsionalSpringGroup[]): number {
    let totalK = 0;
    for (const g of groups) {
        if (!g.enabled) continue;
        const stopAngle = getStopAngle(g);
        if (theta >= g.theta_start && theta <= stopAngle) {
            // K_theta_deg = (k * R^2 * PI/180) / 1000 * n
            const K_theta_deg = (g.k * Math.pow(g.R, 2) * Math.PI / 180) / 1000 * g.n;
            totalK += K_theta_deg;
        }
    }
    return totalK;
}

function estimateSlopeFromCurve(
    curve: TorsionalCurvePoint[],
    thetaTarget: number,
    halfWindowDeg: number
): number {
    if (curve.length === 0) return 0;

    const tA = thetaTarget - halfWindowDeg;
    const tB = thetaTarget + halfWindowDeg;

    const interp = (t: number): number => {
        if (t <= curve[0].theta) return curve[0].torqueLoad;
        if (t >= curve[curve.length - 1].theta) return curve[curve.length - 1].torqueLoad;

        let lo = 0, hi = curve.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (curve[mid].theta < t) lo = mid;
            else hi = mid;
        }
        const p0 = curve[lo], p1 = curve[hi];
        const u = (t - p0.theta) / (p1.theta - p0.theta);
        return p0.torqueLoad + u * (p1.torqueLoad - p0.torqueLoad);
    };

    const TA = interp(tA);
    const TB = interp(tB);
    const dT = TB - TA;
    const dTheta = (tB - tA) || 1e-9;

    return dT / dTheta;
}

// ============================================================================
// MAIN AUDIT FUNCTION
// ============================================================================

export function auditStageTransitions(
    design: TorsionalSpringSystemDesign,
    result: TorsionalSystemResult,
    thresholds: Partial<TransitionAuditThresholds> = {}
): StageTransitionAuditResult {
    const th: TransitionAuditThresholds = { ...STAGE_AUDIT_THRESHOLDS_V1, ...thresholds };
    const { groups } = design;
    const { curves } = result;

    // Calculate total nominal K for threshold scaling
    const totalNominalK = groups.reduce((sum, g) => {
        if (!g.enabled) return sum;
        return sum + (g.k * Math.pow(g.R, 2) * Math.PI / 180) / 1000 * g.n;
    }, 0);

    // Build transition points sorted by theta_start
    const enabledGroups = groups.filter(g => g.enabled);
    const sortedByStart = [...enabledGroups].sort((a, b) => a.theta_start - b.theta_start);

    // Identify unique transition points
    const transitionPoints: { thetaDeg: number; enteringGroups: TorsionalSpringGroup[] }[] = [];

    for (const g of sortedByStart) {
        const existing = transitionPoints.find(tp => Math.abs(tp.thetaDeg - g.theta_start) < 0.01);
        if (existing) {
            existing.enteringGroups.push(g);
        } else {
            transitionPoints.push({ thetaDeg: g.theta_start, enteringGroups: [g] });
        }
    }

    const findings: TransitionFinding[] = [];
    const eps = 0.01;

    for (const tp of transitionPoints) {
        const theta = tp.thetaDeg;

        // Skip if this is the very first point (θ = 0)
        if (theta < eps) continue;

        // Calculate stiffness before and after
        const kBefore = getTotalK(theta - eps, enabledGroups);
        const kAfter = getTotalK(theta + eps, enabledGroups);

        const denom = Math.max(kBefore, 1e-6);
        const jumpRatio = (kAfter - kBefore) / denom;

        // Calculate slope from curve
        const slopeBefore = estimateSlopeFromCurve(curves, theta - eps, th.windowDeg);
        const slopeAfter = estimateSlopeFromCurve(curves, theta + eps, th.windowDeg);
        const slopeJumpAbs = Math.abs(slopeAfter - slopeBefore);

        // Check for gap/overlap
        const activeBefore = getActiveGroups(theta - eps, enabledGroups);
        const activeAfter = getActiveGroups(theta + eps, enabledGroups);

        let gapDeg = 0;
        let overlapDeg = 0;

        // Gap: if no stages are active just before transition
        if (activeBefore.length === 0 && theta > 0) {
            // Find previous stage's stop angle
            const previousStops = enabledGroups
                .filter(g => g.theta_start < theta)
                .map(g => getStopAngle(g));
            if (previousStops.length > 0) {
                const lastStop = Math.max(...previousStops);
                if (theta > lastStop) {
                    gapDeg = theta - lastStop;
                }
            }
        }

        // Overlap: if multiple stages become active at similar angles
        if (activeAfter.length > 1) {
            const stages = [...new Set(activeAfter.map(g => g.stage))];
            if (stages.length > 1) {
                overlapDeg = th.windowDeg * 2; // Simplified: mark as potential overlap
            }
        }

        // Determine entering stage
        const toStage = Math.min(...tp.enteringGroups.map(g => g.stage));
        const fromStage = activeBefore.length > 0
            ? Math.max(...activeBefore.map(g => g.stage))
            : undefined;

        // Calculate severity
        let severity: TransitionSeverity = "PASS";

        // Jump ratio checks
        if (Math.abs(jumpRatio) >= th.jumpFail) severity = "FAIL";
        else if (Math.abs(jumpRatio) >= th.jumpWarn) severity = "WARN";

        // Slope discontinuity checks
        const slopeThreshWarn = th.slopeJumpWarn * totalNominalK;
        const slopeThreshFail = th.slopeJumpFail * totalNominalK;
        if (slopeJumpAbs >= slopeThreshFail) severity = "FAIL";
        else if (slopeJumpAbs >= slopeThreshWarn && severity !== "FAIL") severity = "WARN";

        // Gap checks
        if (gapDeg >= th.gapFailDeg) severity = "FAIL";
        else if (gapDeg >= th.gapWarnDeg && severity !== "FAIL") severity = "WARN";

        // Overlap checks
        if (overlapDeg >= th.overlapFailDeg) severity = "FAIL";
        else if (overlapDeg >= th.overlapWarnDeg && severity !== "FAIL") severity = "WARN";

        // Generate messages
        const jumpPct = (Math.abs(jumpRatio) * 100).toFixed(0);
        const transLabel = fromStage ? `S${fromStage} → S${toStage}` : `→ S${toStage}`;

        let messageEn: string;
        let messageZh: string;
        let recommendation: string | undefined;

        if (severity === "PASS") {
            messageEn = `${transLabel} at ${theta.toFixed(1)}°: Smooth transition (ΔK/K = ${jumpPct}%)`;
            messageZh = `${transLabel} 在 ${theta.toFixed(1)}° 处平顺切换 (ΔK/K = ${jumpPct}%)`;
        } else if (severity === "WARN") {
            messageEn = `${transLabel} at ${theta.toFixed(1)}°: Potential NVH risk (ΔK/K = ${jumpPct}%)`;
            messageZh = `${transLabel} 在 ${theta.toFixed(1)}° 处可能存在 NVH 风险 (ΔK/K = ${jumpPct}%)`;
            recommendation = "Consider adjusting θ_start or preload to reduce stiffness jump.";
        } else {
            messageEn = `${transLabel} at ${theta.toFixed(1)}°: Harsh transition detected (ΔK/K = ${jumpPct}%)`;
            messageZh = `${transLabel} 在 ${theta.toFixed(1)}° 处切换冲击明显 (ΔK/K = ${jumpPct}%)`;
            recommendation = "Review engagement angles, reduce stiffness ratio, or add intermediate stage.";
        }

        findings.push({
            fromStage,
            toStage,
            thetaDeg: theta,
            kBefore,
            kAfter,
            jumpRatio,
            slopeBefore,
            slopeAfter,
            slopeJumpAbs,
            gapDeg,
            overlapDeg,
            severity,
            messageEn,
            messageZh,
            recommendation
        });
    }

    // Overall severity
    const overall: TransitionSeverity =
        findings.some(f => f.severity === "FAIL") ? "FAIL" :
            findings.some(f => f.severity === "WARN") ? "WARN" : "PASS";

    // Summary statements
    let summaryEn: string;
    let summaryZh: string;

    if (overall === "PASS") {
        summaryEn = "Stage transitions are smooth with no harsh torque jumps under nominal operating conditions.";
        summaryZh = "各级切换平顺，在额定工况下无明显扭矩冲击。";
    } else if (overall === "WARN") {
        summaryEn = "Stage transitions show potential NVH risks. Review engagement parameters for optimization.";
        summaryZh = "阶段切换存在潜在 NVH 风险，建议优化介入参数。";
    } else {
        summaryEn = "Stage transitions exhibit harsh characteristics. Redesign recommended before OEM submission.";
        summaryZh = "阶段切换冲击明显，建议在提交主机厂前重新设计。";
    }

    return { overall, findings, summaryEn, summaryZh };
}
