import {
    DesignRuleReport,
    DesignRuleFinding,
    summarizeRuleStatus
} from "../designRules/index";
import {
    TorsionalSpringSystemDesign,
    TorsionalSystemResult
} from "./torsionalSystemTypes";
import { TORSIONAL_SYSTEM_POLICY_V1 } from "./torsionalSystemPolicy";

/**
 * buildTorsionalSystemDesignRuleReport
 * 
 * Audits the torsional spring system based on Factory Policy V1.
 */
export function buildTorsionalSystemDesignRuleReport(
    design: TorsionalSpringSystemDesign | null | undefined,
    result: TorsionalSystemResult | null | undefined
): DesignRuleReport {
    const findings: DesignRuleFinding[] = [];
    const metrics: DesignRuleReport["metrics"] = {};
    const policy = TORSIONAL_SYSTEM_POLICY_V1;

    if (!design) {
        return {
            summary: { status: "OK" },
            metrics: {},
            findings: [],
        };
    }

    // 1. Audit each spring group
    design.groups.forEach((g, idx) => {
        const groupName = g.name || `Group ${idx + 1}`;

        // Spring Index C
        const C = g.Dm / g.d;
        metrics[`group_${idx}_C`] = {
            labelEn: `C (${groupName})`,
            labelZh: `C (${groupName})`,
            value: C,
            unit: "",
        };

        if (C < policy.springIndexRange.min) {
            findings.push({
                id: `group_${idx}_C_low`,
                level: "warning",
                titleEn: `Low Spring Index (${groupName})`,
                titleZh: `弹簧指数过低 (${groupName})`,
                detailEn: `C=${C.toFixed(2)} is below recommended ${policy.springIndexRange.min}. Hard to manufacture.`,
                detailZh: `C=${C.toFixed(2)} 低于推荐值 ${policy.springIndexRange.min}。制造困难。`,
            });
        } else if (C > policy.springIndexRange.max) {
            findings.push({
                id: `group_${idx}_C_high`,
                level: "warning",
                titleEn: `High Spring Index (${groupName})`,
                titleZh: `弹簧指数过高 (${groupName})`,
                detailEn: `C=${C.toFixed(2)} is above recommended ${policy.springIndexRange.max}. Risk of buckling.`,
                detailZh: `C=${C.toFixed(2)} 高于推荐值 ${policy.springIndexRange.max}。存在失稳风险。`,
            });
        }

        // Geometry Validity: theta_stop > theta_start
        const theta_range_i = (g.L_free - g.L_solid - g.clearance) / g.R * (180 / Math.PI);
        const theta_stop_i = g.theta_start + theta_range_i;

        if (theta_stop_i <= g.theta_start) {
            findings.push({
                id: `group_${idx}_invalid_geo`,
                level: "error",
                titleEn: `Invalid Geometry (${groupName})`,
                titleZh: `几何不合法 (${groupName})`,
                detailEn: `Calculated stop angle (${theta_stop_i.toFixed(1)}°) is <= start angle (${g.theta_start}°). Check L_free/L_solid.`,
                detailZh: `计算的止挡角度 (${theta_stop_i.toFixed(1)}°) 小于等于起始角度 (${g.theta_start}°)。请检查自由长度和压并长度。`,
            });
        }

        // Stress Utilization (if result available)
        if (result) {
            const groupRes = result.perGroup.find(rg => rg.groupId === g.id);
            if (groupRes) {
                metrics[`group_${idx}_utilization`] = {
                    labelEn: `Stress Util (${groupName})`,
                    labelZh: `应力利用率 (${groupName})`,
                    value: (groupRes.utilization * 100).toFixed(1),
                    unit: "%",
                };

                if (groupRes.utilization > 1.0) {
                    findings.push({
                        id: `group_${idx}_overstress`,
                        level: "error",
                        titleEn: `Overstressed (${groupName})`,
                        titleZh: `应力超限 (${groupName})`,
                        detailEn: `Shear stress (${groupRes.stress.toFixed(0)} MPa) exceeds allowable limits at work angle.`,
                        detailZh: `剪切应力 (${groupRes.stress.toFixed(0)} MPa) 在工作角度下超过许可值。`,
                    });
                }
            }
        }
    });

    // 2. System Level Audits
    if (result) {
        // Stop Violation
        const atStop = design.referenceAngle >= result.thetaStop;
        metrics["system_stop"] = {
            labelEn: "System Stop",
            labelZh: "系统止挡角度",
            value: result.thetaStop.toFixed(1),
            unit: "deg",
        };

        if (atStop) {
            findings.push({
                id: "sys_stop_violation",
                level: "error",
                titleEn: "Mechanical Stop Reached",
                titleZh: "到达机械止挡",
                detailEn: `Working angle (${design.referenceAngle.toFixed(1)}°) is beyond system stop (${result.thetaStop.toFixed(1)}°). Rigid contact!`,
                detailZh: `工作角度 (${design.referenceAngle.toFixed(1)}°) 超过了系统止挡 (${result.thetaStop.toFixed(1)}°)。发生刚性碰撞！`,
            });
        }
    }

    // 3. Engagement Sequence (Monotonic theta_start)
    const starts = design.groups.filter(g => g.enabled).map(g => g.theta_start);
    const isMonotonic = starts.every((v, i) => i === 0 || v >= starts[i - 1]);
    if (!isMonotonic) {
        findings.push({
            id: "non_monotonic_engagement",
            level: "warning",
            titleEn: "Engagement Order Issue",
            titleZh: "啮合顺序异常",
            detailEn: "Engagement angles (θ_start) are not in non-decreasing order. Curve stages may overlap in unexpected ways.",
            detailZh: "参与角度 (θ_start) 未按非递减顺序排列。分级曲线可能以意外方式重叠。",
        });
    }

    // 4. Phase 10: Operating Source & Safety Margin Audit
    // Logic: thetaCustomer <= 0.8 * thetaSafe -> PASS
    //        0.8 * thetaSafe < thetaCustomer <= thetaSafe -> WARN
    //        thetaCustomer > thetaSafe -> FAIL

    // Check if we have valid inputs for audit
    const hasAuditInputs = design.thetaOperatingSource &&
        design.thetaOperatingSource !== "NOT_PROVIDED" &&
        design.thetaOperatingCustomerDeg !== undefined &&
        design.thetaOperatingCustomerDeg > 0;

    if (!hasAuditInputs) {
        // Missing audit inputs = INFO
        findings.push({
            id: "audit_source_missing",
            level: "info", // This should result in overall INFO status if no errors
            titleEn: "Audit Capability Only",
            titleZh: "仅供能力审计",
            detailEn: "Operating range source not provided. System limits (Safe/Hard) are displayed for reference usage capability only.",
            detailZh: "未提供工况来源。系统极限（安全/硬停）仅作能力参考显示。",
        });
    } else if (result) {
        const thetaReq = design.thetaOperatingCustomerDeg!;
        // Use the calculated system safe limit
        const thetaSafe = result.thetaSafeSystemDeg;

        // 80% Threshold Rule (P0 Requirement)
        const safetyRatio = thetaReq / thetaSafe;

        if (safetyRatio > 1.0) {
            findings.push({
                id: "safety_limit_exceeded",
                level: "error",
                titleEn: "Safety Limit Exceeded",
                titleZh: "超出安全极限",
                detailEn: `Customer requirement (${thetaReq.toFixed(1)}°) exceeds system safe limit (${thetaSafe.toFixed(1)}°). Governed by: ${result.governing.governingCode}.`,
                detailZh: `客户要求 (${thetaReq.toFixed(1)}°) 超过系统安全极限 (${thetaSafe.toFixed(1)}°)。受限于：${result.governing.governingCode}。`,
            });
        } else if (safetyRatio > 0.8) {
            findings.push({
                id: "safety_margin_low",
                level: "warning",
                titleEn: "Low Safety Margin",
                titleZh: "安全余量不足",
                detailEn: `Operating at ${(safetyRatio * 100).toFixed(0)}% of safe limit. Recommended max: 80%. (${thetaReq.toFixed(1)}° / ${thetaSafe.toFixed(1)}°)`,
                detailZh: `运行在安全极限的 ${(safetyRatio * 100).toFixed(0)}%。建议最大：80%。(${thetaReq.toFixed(1)}° / ${thetaSafe.toFixed(1)}°)`,
            });
        } else {
            // Explicit PASS finding for audit log
            findings.push({
                id: "safety_margin_ok",
                level: "pass",     // Make sure "pass" is supported or ignored by aggregator. Usually assumed implicit, but good for logs.
                titleEn: "Safety Margin OK",
                titleZh: "安全余量合格",
                detailEn: `Operating at ${(safetyRatio * 100).toFixed(0)}% of safe limit (≤ 80%).`,
                detailZh: `运行在安全极限的 ${(safetyRatio * 100).toFixed(0)}% (≤ 80%)。`,
            } as any); // cast if 'pass' not strictly in DesignRuleFinding level type yet
        }
    }

    return {
        summary: { status: summarizeRuleStatus(findings) },
        metrics,
        findings,
    };
}
