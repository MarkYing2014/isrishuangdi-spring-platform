/**
 * Default PPAP Checklist Template
 * AIAG PPAP 4th Edition elements
 */

import type { PpapChecklistItem, PpapChecklistKey } from "./types";

interface ChecklistTemplate {
    key: PpapChecklistKey;
    label: string;
    labelZh: string;
    required: boolean;
}

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplate[] = [
    {
        key: "designRecord",
        label: "Design Records",
        labelZh: "设计记录",
        required: true,
    },
    {
        key: "engineeringApproval",
        label: "Engineering Change Documents",
        labelZh: "工程变更文件",
        required: true,
    },
    {
        key: "controlPlan",
        label: "Control Plan",
        labelZh: "控制计划",
        required: true,
    },
    {
        key: "pfmea",
        label: "Process FMEA",
        labelZh: "过程 FMEA",
        required: false,
    },
    {
        key: "msa",
        label: "Measurement System Analysis",
        labelZh: "测量系统分析 (MSA)",
        required: true,
    },
    {
        key: "materialCert",
        label: "Material / Performance Test Results",
        labelZh: "材料/性能测试结果",
        required: true,
    },
    {
        key: "dimensionalResults",
        label: "Dimensional Results",
        labelZh: "尺寸检测结果",
        required: true,
    },
    {
        key: "performanceTest",
        label: "Performance Test Results",
        labelZh: "性能试验结果",
        required: false,
    },
    {
        key: "qualifiedLabDoc",
        label: "Qualified Laboratory Documentation",
        labelZh: "合格实验室文件",
        required: false,
    },
    {
        key: "aar",
        label: "Appearance Approval Report (AAR)",
        labelZh: "外观批准报告",
        required: false,
    },
    {
        key: "sampleProducts",
        label: "Sample Production Parts",
        labelZh: "样品生产件",
        required: false,
    },
    {
        key: "masterSample",
        label: "Master Sample",
        labelZh: "标准样件",
        required: false,
    },
    {
        key: "checkingAids",
        label: "Checking Aids",
        labelZh: "检具",
        required: false,
    },
    {
        key: "customerSpecificReqs",
        label: "Customer-Specific Requirements",
        labelZh: "客户特殊要求",
        required: false,
    },
    {
        key: "psw",
        label: "Part Submission Warrant (PSW)",
        labelZh: "零件提交保证书",
        required: false, // Auto-generated when all required items are READY
    },
];

/**
 * Generate a fresh checklist for a new PPAP package
 */
export function createDefaultChecklist(): PpapChecklistItem[] {
    return DEFAULT_CHECKLIST_TEMPLATE.map((template) => ({
        key: template.key,
        label: template.label,
        labelZh: template.labelZh,
        required: template.required,
        status: "NOT_STARTED" as const,
    }));
}

/**
 * Get checklist item template by key
 */
export function getChecklistTemplate(key: PpapChecklistKey): ChecklistTemplate | undefined {
    return DEFAULT_CHECKLIST_TEMPLATE.find((t) => t.key === key);
}
