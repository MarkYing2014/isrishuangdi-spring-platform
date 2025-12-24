import type { DiskSpringDesign } from "@/lib/springTypes";
import type { AnalysisResult } from "@/lib/stores/springDesignStore";
import { getSpringMaterial } from "@/lib/materials/springMaterials";

import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";

export interface DiskSpringRuleContext {
    sfWarn?: number;
    sfFail?: number;
    stressWarnRatio?: number;
    stressHighRatio?: number;
    thicknessDiameterRatioWarn?: number;
}

export function buildDiskSpringDesignRuleReport(params: {
    design: DiskSpringDesign | null;
    analysisResult?: AnalysisResult | null;
    context?: DiskSpringRuleContext;
}): DesignRuleReport {
    const findings: DesignRuleFinding[] = [];
    const metrics: DesignRuleReport["metrics"] = {};

    const design = params.design;
    const analysis = params.analysisResult;

    if (!design) {
        findings.push({
            id: "DISK_MISSING_INPUTS",
            level: "info",
            titleEn: "No disk design available",
            titleZh: "暂无可用的碟簧设计",
            detailEn: "Run calculation to evaluate design rules.",
            detailZh: "请先进行计算，再进行设计规则分析。",
        });

        return {
            summary: { status: summarizeRuleStatus(findings) },
            metrics,
            findings,
        };
    }

    // 1. Stress & Safety Factor (Common Engineering Axis)
    const sfWarn = params.context?.sfWarn ?? 1.2;
    const sfFail = params.context?.sfFail ?? 1.0;

    if (analysis?.staticSafetyFactor !== undefined) {
        const sf = analysis.staticSafetyFactor;
        metrics.sf_static = {
            value: isFinite(sf) ? Number(sf.toFixed(2)) : "-",
            labelEn: "Static safety factor SF",
            labelZh: "静态安全系数 SF",
            noteEn: `Warn < ${sfWarn}, Fail < ${sfFail}`,
            noteZh: `警告 < ${sfWarn}，失败 < ${sfFail}`,
        };

        if (sf < sfFail) {
            findings.push({
                id: "DISK_SF_LOW",
                level: "error",
                titleEn: "Safety factor is too low",
                titleZh: "安全系数过低",
                detailEn: `SF=${sf.toFixed(2)} < ${sfFail}. Risk of plastic deformation.`,
                detailZh: `SF=${sf.toFixed(2)} < ${sfFail}。存在塑性变形风险。`,
            });
        } else if (sf < sfWarn) {
            findings.push({
                id: "DISK_SF_WARN",
                level: "warning",
                titleEn: "Safety factor is marginal",
                titleZh: "安全系数偏低",
                detailEn: `SF=${sf.toFixed(2)} < ${sfWarn}.`,
                detailZh: `SF=${sf.toFixed(2)} < ${sfWarn}。`,
            });
        }
    }

    // 2. Geometry & Ratios (Manufacturing Axis)
    const ratio = design.thickness / design.outerDiameter;
    metrics.thickness_od_ratio = {
        value: isFinite(ratio) ? Number(ratio.toFixed(4)) : "-",
        labelEn: "t/De Ratio",
        labelZh: "厚径比 t/De",
        noteEn: "Thin < 0.05, Thick > 0.1",
        noteZh: "薄 < 0.05，厚 > 0.1",
    };

    if (ratio < 0.02) {
        findings.push({
            id: "DISK_GEOM_VERY_THIN",
            level: "warning",
            titleEn: "Very thin plate",
            titleZh: "极薄片材",
            detailEn: "Manufacturing precision and flatness are critical for very thin plates.",
            detailZh: "极薄片材的加工精度和平面度至关重要。",
        });
    }

    const h0_t = design.freeConeHeight / design.thickness;
    metrics.h0_t_ratio = {
        value: isFinite(h0_t) ? Number(h0_t.toFixed(2)) : "-",
        labelEn: "h0/t Ratio",
        labelZh: "压平量/厚度比 h0/t",
    };

    if (h0_t > 1.5) {
        findings.push({
            id: "DISK_GEOM_H0T_HIGH",
            level: "warning",
            titleEn: "Potential snap-through behavior",
            titleZh: "潜在的翻转行为",
            detailEn: "h0/t > 1.5 may cause negative rate or snap-through.",
            detailZh: "h0/t > 1.5 可能会导致负刚度或翻转行为。",
        });
    }

    // 3. Stacking (Manufacturing)
    if (design.parallelCount > 1) {
        findings.push({
            id: "DISK_MAN_FRICTION",
            level: "warning",
            titleEn: "Sliding friction in parallel stacks",
            titleZh: "并联堆叠中的滑动摩擦",
            detailEn: "Parallel stacking introduces internal friction and hysteresis.",
            detailZh: "并联堆叠会引入内部摩擦和滞后现象。",
        });
    }

    return {
        summary: { status: summarizeRuleStatus(findings) },
        metrics,
        findings,
    };
}
