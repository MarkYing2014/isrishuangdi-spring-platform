/**
 * Training Module Types
 */

export type CourseStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type MachineType = "8-claw";

export interface TrainingModule {
    id: string;
    titleEn: string;
    titleZh: string;
    minutes: number;
    level: Level;
    machine: MachineType;
    goalsEn: string[];
    goalsZh: string[];
    stepsCount: number;
    updatedAt: string;
}

export interface TrainingSession {
    id: string;
    moduleId: string;
    userId: string;
    status: CourseStatus;
    currentStep: number;       // 1-based
    stepsDone: number;         // 0..stepsCount
    progressPercent: number;   // 0..100
    startedAt?: string;
    updatedAt: string;
    completedAt?: string;
}

export interface SessionStartResponse {
    module: TrainingModule;
    session: TrainingSession;
}

export type SessionAction = "MARK_DONE" | "RESTART_STEP" | "SIMULATE_ERROR" | "SET_STEP";

export interface SessionProgressPatch {
    sessionId: string;
    moduleId: string;
    userId: string;
    action: SessionAction;
    step?: number; // 1-based, used for SET_STEP
}
