/**
 * CNC Training Modules Data
 */

import type { TrainingModule } from "./types";

export const CNC_MODULES: TrainingModule[] = [
    {
        id: "cnc-8claw-001",
        titleEn: "8-Claw CNC Basics: Safety, Threading, First Run",
        titleZh: "八爪机入门：安全、穿线与试运行",
        minutes: 15,
        level: "Beginner",
        machine: "8-claw",
        goalsEn: ["Identify key machine parts", "Learn safe startup checks", "Practice threading path"],
        goalsZh: ["认识关键部件", "学习安全开机检查", "练习穿线路径"],
        stepsCount: 5,
        updatedAt: "2026-01-02T00:00:00Z",
        steps: [
            {
                key: "s0",
                titleEn: "Course Rules & Safety",
                titleZh: "课程规则 & 安全提示",
                bulletsEn: [
                    "Simulation training only. Follow on-site SOP.",
                    "Any anomaly: Stop → Reset → Diagnose.",
                    "Wear PPE per your plant standard.",
                ],
                bulletsZh: [
                    "本课程为模拟教学，仍需遵守现场 SOP。",
                    "任何异常：先停机 → 再复位 → 再排查。",
                    "佩戴 PPE（按工厂标准：护目镜/手套/防护鞋等）。",
                ],
                demoActions: [
                    { labelEn: "Continue", labelZh: "继续", action: "CONTINUE" },
                ],
            },
            {
                key: "s1",
                titleEn: "Know the Core Parts",
                titleZh: "认识八爪机关键部件",
                bulletsEn: [
                    "Feed rollers: control wire feed",
                    "Mandrel: sets forming center / inner diameter",
                    "Claws/Fingers: forming and positioning",
                    "Guides: reduce wobble & scratching",
                    "Cutter (if applicable)",
                    "Guard & E-stop: safety essentials",
                ],
                bulletsZh: [
                    "送丝轮：控制进给",
                    "芯轴：决定内径/成形中心",
                    "成形爪：弯折/定位/配合切断",
                    "导向/校直：减少偏摆与刮擦",
                    "切断刀（如适用）",
                    "防护罩 & 急停：安全必备",
                ],
                demoActions: [
                    { labelEn: "Mark Done", labelZh: "完成", action: "MARK_DONE" },
                    { labelEn: "Simulate Error", labelZh: "模拟错误", action: "SIMULATE_ERROR" },
                ],
            },
            {
                key: "s2",
                titleEn: "Pre-Start Safety Checks",
                titleZh: "开机前安全检查",
                checklistEn: [
                    "E-stop location confirmed and accessible",
                    "Guard/door is closed",
                    "Tooling/mandrel secured",
                    "Work area clear (no loose tools)",
                    "Wire coil stable (no tangles/loose loops)",
                    "Manual/low-speed mode ready",
                ],
                checklistZh: [
                    "确认急停位置且触手可及",
                    "防护罩/门已关闭",
                    "刀具/芯轴固定牢靠",
                    "工作区无遗留工具/异物",
                    "线材卷放稳定、无散卷/打结",
                    "已准备手动/低速模式",
                ],
                requireChecklistComplete: true,
                demoActions: [
                    { labelEn: "Mark Done", labelZh: "完成", action: "MARK_DONE" },
                    { labelEn: "Simulate Error", labelZh: "模拟错误", action: "SIMULATE_ERROR" },
                ],
            },
            {
                key: "s3",
                titleEn: "Threading Path (Wire Loading)",
                titleZh: "穿线路径（走线）",
                bulletsEn: [
                    "Guide entry → feed rollers",
                    "Through straightener/guides",
                    "Approach mandrel area",
                    "Jog feed in manual mode to verify alignment and no rubbing",
                ],
                bulletsZh: [
                    "放线架 → 导向入口 → 送丝轮",
                    "通过校直/导向轮",
                    "进入工作区并靠近芯轴",
                    "手动点动送丝：确认走直、不刮擦、不偏摆",
                ],
                demoActions: [
                    { labelEn: "Restart Step", labelZh: "重新穿线", action: "RESTART_STEP" },
                    { labelEn: "Simulate Error", labelZh: "模拟错误", action: "SIMULATE_ERROR" },
                    { labelEn: "Mark Done", labelZh: "完成", action: "MARK_DONE" },
                ],
            },
            {
                key: "s4",
                titleEn: "Low-Speed First Run & Observation",
                titleZh: "低速试运行与异常观察",
                bulletsEn: [
                    "Check for feed slip",
                    "Watch for collisions/interference",
                    "Check rubbing/scratching",
                    "Listen for abnormal noise/vibration",
                ],
                bulletsZh: [
                    "检查送丝是否打滑",
                    "观察是否干涉/碰撞",
                    "检查是否刮擦",
                    "留意异常声音/振动",
                ],
                demoActions: [
                    { labelEn: "Simulate Error", labelZh: "模拟错误", action: "SIMULATE_ERROR" },
                    { labelEn: "Mark Done", labelZh: "完成并结束", action: "MARK_DONE" },
                ],
            },
        ],
    },
    {
        id: "cnc-8claw-002",
        titleEn: "Tooling Fundamentals: Fingers & Mandrel",
        titleZh: "工装基础：成形爪与芯轴",
        minutes: 20,
        level: "Beginner",
        machine: "8-claw",
        goalsEn: ["Understand finger roles", "Avoid common collisions", "Basic forming sequence"],
        goalsZh: ["理解各爪职责", "避免常见干涉", "掌握基础成形顺序"],
        stepsCount: 1,
        updatedAt: "2026-01-01T00:00:00Z",
        steps: [
            {
                key: "s0",
                titleEn: "Coming Soon",
                titleZh: "敬请期待",
                bulletsEn: ["This module will be populated in Phase 1.1."],
                bulletsZh: ["该模块将在 Phase 1.1 填充完整内容。"],
                demoActions: [{ labelEn: "Continue", labelZh: "继续", action: "CONTINUE" }],
            },
        ],
    },
    {
        id: "cnc-8claw-003",
        titleEn: "Dimensional Stability: Pitch & Feed Tuning",
        titleZh: "尺寸稳定性：节距与送丝调参",
        minutes: 25,
        level: "Intermediate",
        machine: "8-claw",
        goalsEn: ["Tune feed/pitch safely", "Recognize slip vs over-pressure", "Basic troubleshooting"],
        goalsZh: ["安全调节送丝/节距", "识别打滑与过压", "基础排故"],
        stepsCount: 1,
        updatedAt: "2025-12-27T00:00:00Z",
        steps: [
            {
                key: "s0",
                titleEn: "Coming Soon",
                titleZh: "敬请期待",
                bulletsEn: ["This module will be populated in Phase 1.1."],
                bulletsZh: ["该模块将在 Phase 1.1 填充完整内容。"],
                demoActions: [{ labelEn: "Continue", labelZh: "继续", action: "CONTINUE" }],
            },
        ],
    },
];

export function getModuleById(id: string): TrainingModule | null {
    return CNC_MODULES.find((m) => m.id === id) ?? null;
}

export function getAllModules(): TrainingModule[] {
    return CNC_MODULES;
}
