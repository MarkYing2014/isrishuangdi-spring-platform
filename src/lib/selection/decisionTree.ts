import type { SpringType } from "@/lib/springTypes";

export interface SelectionQuestion {
    id: string;
    textEn: string;
    textZh: string;
    type: "choice" | "boolean" | "number";
    options?: { value: string; labelEn: string; labelZh: string }[];
}

export interface SelectionRule {
    id: string;
    condition: (answers: Record<string, any>) => boolean;
    recommend: SpringType[];
    exclude?: SpringType[];
    reasonEn: string;
    reasonZh: string;
}

export const SELECTION_QUESTIONS: SelectionQuestion[] = [
    {
        id: "loadDirection",
        textEn: "Primary Load Direction",
        textZh: "主要受力方向",
        type: "choice",
        options: [
            { value: "axial_compress", labelEn: "Axial (Compression)", labelZh: "轴向 (压缩)" },
            { value: "axial_extend", labelEn: "Axial (Extension)", labelZh: "轴向 (拉伸)" },
            { value: "torsional", labelEn: "Torsional (Twisting)", labelZh: "扭矩 (扭转)" },
            { value: "radial", labelEn: "Radial (Side Load)", labelZh: "径向 (侧向力)" },
        ],
    },
    {
        id: "spaceConstraint",
        textEn: "Space Constraint",
        textZh: "空间限制",
        type: "choice",
        options: [
            { value: "height_limited", labelEn: "Extremely Low Height", labelZh: "极度受限的高度" },
            { value: "od_limited", labelEn: "Small Outer Diameter", labelZh: "受限的外径" },
            { value: "none", labelEn: "No Strict Limit", labelZh: "无严格限制" },
        ],
    },
    {
        id: "linearity",
        textEn: "Force-Deflection Requirement",
        textZh: "力-变形特性需求",
        type: "choice",
        options: [
            { value: "linear", labelEn: "Linear (Standard)", labelZh: "线性 (标准)" },
            { value: "progressive", labelEn: "Progressive (Increasing Rate)", labelZh: "渐进式 (刚度递增)" },
            { value: "degressive", labelEn: "Regressive / Snap Action", labelZh: "递减式 / 突跳动作" },
        ],
    },
];

export const SELECTION_RULES: SelectionRule[] = [
    {
        id: "torsional_priority",
        condition: (a) => a.loadDirection === "torsional",
        recommend: ["torsion", "spiralTorsion", "arc"],
        exclude: ["compression", "extension", "wave", "disk"],
        reasonEn: "Torsional loads require winding or twisting mechanisms.",
        reasonZh: "扭矩载荷需要使用卷取或扭转机构。",
    },
    {
        id: "low_height_axial",
        condition: (a) => a.loadDirection === "axial_compress" && a.spaceConstraint === "height_limited",
        recommend: ["wave", "disk"],
        reasonEn: "Wave and Disk springs provide high loads in very short axial spaces.",
        reasonZh: "波簧和碟簧可以在极短的轴向空间内提供高载荷。",
    },
    {
        id: "progressive_axial",
        condition: (a) => a.loadDirection === "axial_compress" && a.linearity === "progressive",
        recommend: ["conical", "variablePitchCompression"],
        reasonEn: "Conical or Variable Pitch springs naturally produce progressive rates.",
        reasonZh: "锥形或变节距弹簧天生具备渐进式刚度特性。",
    },
    {
        id: "standard_axial",
        condition: (a) => a.loadDirection === "axial_compress" && a.spaceConstraint === "none" && a.linearity === "linear",
        recommend: ["compression", "dieSpring"],
        reasonEn: "Standard compression springs are the most cost-effective solution for linear axial loads.",
        reasonZh: "标准压簧是线性轴向载荷最经济的解决方案。",
    },
];

export function evaluateSelection(answers: Record<string, any>): {
    recommended: SpringType[];
    reasons: { type: SpringType; reasonEn: string; reasonZh: string }[];
} {
    const recommendations = new Set<SpringType>();
    const exclusions = new Set<SpringType>();
    const reasons: { type: SpringType; reasonEn: string; reasonZh: string }[] = [];

    SELECTION_RULES.forEach((rule) => {
        if (rule.condition(answers)) {
            rule.recommend.forEach((type) => {
                recommendations.add(type);
                reasons.push({ type, reasonEn: rule.reasonEn, reasonZh: rule.reasonZh });
            });
            rule.exclude?.forEach((type) => exclusions.add(type));
        }
    });

    const final = Array.from(recommendations).filter((type) => !exclusions.has(type));

    return {
        recommended: final,
        reasons: reasons.filter((r) => final.includes(r.type)),
    };
}
