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
        stepsCount: 4,
        updatedAt: "2026-01-02T00:00:00Z",
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
        stepsCount: 6,
        updatedAt: "2026-01-01T00:00:00Z",
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
        stepsCount: 7,
        updatedAt: "2025-12-27T00:00:00Z",
    },
];

export function getModuleById(id: string): TrainingModule | null {
    return CNC_MODULES.find((m) => m.id === id) ?? null;
}

export function getAllModules(): TrainingModule[] {
    return CNC_MODULES;
}
