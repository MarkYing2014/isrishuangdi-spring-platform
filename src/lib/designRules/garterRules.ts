import { GarterSpringDesign, GarterCalculationResult } from "@/lib/springTypes/garter";
import type { DesignRuleFinding, DesignRuleReport } from "./types";
import { summarizeRuleStatus } from "./types";
import { designRulesDefaults } from "./defaults";

export function buildGarterSpringDesignRuleReport(
    geometry: GarterSpringDesign | null | undefined,
    result: GarterCalculationResult | null | undefined
): DesignRuleReport {
    const findings: DesignRuleFinding[] = [];
    const metrics: DesignRuleReport["metrics"] = {};

    if (!geometry) {
        findings.push({
            id: "garter.rules.missing_input",
            level: "info",
            titleEn: "No input available",
            titleZh: "暂无输入数据",
            detailEn: "Enter dimensions to see design rule analysis.",
            detailZh: "请输入尺寸以查看设计规则分析。",
        });

        return {
            summary: { status: "OK" },
            metrics,
            findings,
        };
    }

    const {
        wireDiameter = 0,
        meanDiameter = 0,
        activeCoils = 0,
        ringFreeDiameter = 0,
        ringInstalledDiameter = 0,
        jointType = "hook"
    } = geometry;
    const defaults = designRulesDefaults.garter;

    // 1. Spring Index (C)
    const springIndex = wireDiameter > 0 ? meanDiameter / wireDiameter : 0;
    metrics.springIndex = {
        value: Number(springIndex.toFixed(2)),
        labelEn: "Spring Index (C)",
        labelZh: "旋绕比 (C)",
        noteEn: `Preferred: ${defaults.springIndexPrefMin}~${defaults.springIndexPrefMax}`,
        noteZh: `推荐范围：${defaults.springIndexPrefMin}~${defaults.springIndexPrefMax}`,
    };

    if (springIndex > 0) {
        if (springIndex < defaults.springIndexVeryLowWarn) {
            findings.push({
                id: "garter.rules.index_very_low",
                level: "error",
                titleEn: "Spring index is extremely low",
                titleZh: "旋绕比极低",
                detailEn: `C=${springIndex.toFixed(2)} is below 3. Extremely difficult to coil and high risk of wire damage.`,
                detailZh: `C=${springIndex.toFixed(2)} 低于 3。卷制极度困难，且线材极易受损。`,
                evidence: { field: "meanDiameter", value: springIndex },
            });
        } else if (springIndex < defaults.springIndexPrefMin) {
            findings.push({
                id: "garter.rules.index_low",
                level: "warning",
                titleEn: "Spring index is low",
                titleZh: "旋绕比偏低",
                detailEn: `C=${springIndex.toFixed(2)} is below preferred ${defaults.springIndexPrefMin}. Manufacturing may be difficult.`,
                detailZh: `C=${springIndex.toFixed(2)} 低于推荐值 ${defaults.springIndexPrefMin}。制造难度可能增加。`,
                evidence: { field: "meanDiameter", value: springIndex },
            });
        } else if (springIndex > defaults.springIndexPrefMax) {
            findings.push({
                id: "garter.rules.index_high",
                level: "warning",
                titleEn: "Spring index is high",
                titleZh: "旋绕比偏高",
                detailEn: `C=${springIndex.toFixed(2)} is above ${defaults.springIndexPrefMax}. Spring may be flimsy (soft) and harder to handle.`,
                detailZh: `C=${springIndex.toFixed(2)} 超过 ${defaults.springIndexPrefMax}。弹簧可能过于柔软，装配搬运不便。`,
                evidence: { field: "meanDiameter", value: springIndex },
            });
        }
    }

    // 2. Stretch Ratio (Delta D / D_free)
    const deltaD = ringInstalledDiameter - ringFreeDiameter;
    const stretchRatio = ringFreeDiameter > 0 ? deltaD / ringFreeDiameter : 0;

    metrics.stretchRatio = {
        value: Number((stretchRatio * 100).toFixed(1)),
        unit: "%",
        labelEn: "Stretch Ratio (ΔD/D_free)",
        labelZh: "伸长率 (ΔD/D_free)",
        noteEn: `Recommended: <${(defaults.stretchRatioWarn * 100).toFixed(0)}%`,
        noteZh: `建议：<${(defaults.stretchRatioWarn * 100).toFixed(0)}%`,
    };

    if (stretchRatio < 0) {
        findings.push({
            id: "garter.rules.stretch_negative",
            level: "error",
            titleEn: "Installation diameter is smaller than free diameter",
            titleZh: "安装直径小于自由直径",
            detailEn: "Garter springs must be installed in tension to provide inward force.",
            detailZh: "环形拉簧必须在拉伸状态下安装，以提供向内的紧固力。",
            evidence: { field: "ringInstalledDiameter", value: ringInstalledDiameter },
        });
    } else if (stretchRatio > defaults.stretchRatioHigh) {
        findings.push({
            id: "garter.rules.stretch_very_high",
            level: "error",
            titleEn: "Stretch ratio is excessively high",
            titleZh: "伸长率过高",
            detailEn: `Stretch of ${(stretchRatio * 100).toFixed(1)}% exceeds safety limit of ${(defaults.stretchRatioHigh * 100).toFixed(1)}%. High risk of permanent set or breakage.`,
            detailZh: `伸长率 ${(stretchRatio * 100).toFixed(1)}% 超过安全极限 ${(defaults.stretchRatioHigh * 100).toFixed(1)}%。极易产生永久变形或断裂。`,
            evidence: { field: "ringInstalledDiameter", value: stretchRatio },
        });
    } else if (stretchRatio > defaults.stretchRatioWarn) {
        findings.push({
            id: "garter.rules.stretch_high",
            level: "warning",
            titleEn: "Stretch ratio is high",
            titleZh: "伸长率偏高",
            detailEn: `Stretch of ${(stretchRatio * 100).toFixed(1)}% is above recommended ${(defaults.stretchRatioWarn * 100).toFixed(1)}%.`,
            detailZh: `伸长率 ${(stretchRatio * 100).toFixed(1)}% 高于建议值 ${(defaults.stretchRatioWarn * 100).toFixed(1)}%。`,
            evidence: { field: "ringInstalledDiameter", value: stretchRatio },
        });
    }

    // 3. Coil Count & Slenderness (Implicit)
    if (activeCoils < defaults.minCoilCount) {
        findings.push({
            id: "garter.rules.coils_low",
            level: "warning",
            titleEn: "Low coil count",
            titleZh: "总圈数较少",
            detailEn: `Garter springs typically require many coils for uniform pressure. ${activeCoils} coils may be too few.`,
            detailZh: `为保证压力均匀，环形拉簧通常需要较多线圈。当前 ${activeCoils} 圈可能偏少。`,
            evidence: { field: "activeCoils", value: activeCoils },
        });
    }

    // 4. Joint Type Advice
    if (jointType === "hook") {
        findings.push({
            id: "garter.rules.joint_hook_info",
            level: "info",
            titleEn: "Hook joint notice",
            titleZh: "钩环接头提示",
            detailEn: "Hook joints are simple but create a discontinuity in radial force. For high-speed rotary seals, consider a screw joint.",
            detailZh: "钩环接头最简单，但会导致径向力不连续。对于高速旋转轴密封，建议考虑螺纹（缩径）接头。",
        });
    }

    // 5. Stress Ratio (if result is available)
    if (result) {
        const stressRatio = result.stressRatio;
        metrics.stressRatio = {
            value: Number((stressRatio * 100).toFixed(1)),
            unit: "%",
            labelEn: "Stress Utilization",
            labelZh: "应力利用率",
        };

        if (stressRatio > 1.0) {
            findings.push({
                id: "garter.rules.stress_over",
                level: "error",
                titleEn: "Shear stress exceeds allowable",
                titleZh: "剪切应力超过许用值",
                detailEn: `Calculated tau=${result.tauMax.toFixed(0)} MPa exceeds allowable. Spring will fail or set.`,
                detailZh: `计算应力 ${result.tauMax.toFixed(0)} MPa 超过许用值。弹簧将失效或产生永久变形。`,
            });
        } else if (stressRatio > 0.85) {
            findings.push({
                id: "garter.rules.stress_high",
                level: "warning",
                titleEn: "Shear stress is high",
                titleZh: "剪切应力偏高",
                detailEn: `Stress utilization is ${(stressRatio * 100).toFixed(1)}%. Limited fatigue life expected.`,
                detailZh: `应力利用率为 ${(stressRatio * 100).toFixed(1)}%。预期疲劳寿命有限。`,
            });
        }
    }

    return {
        summary: { status: summarizeRuleStatus(findings) },
        metrics,
        findings,
    };
}
