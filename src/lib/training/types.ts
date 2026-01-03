/**
 * Training Module Types
 */

export type CourseStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type Level = "Beginner" | "Intermediate" | "Advanced";
export type MachineType = "8-claw";

export type DemoActionType = "CONTINUE" | "MARK_DONE" | "RESTART_STEP" | "SIMULATE_ERROR" | "SET_STEP";

export type DemoAction = {
    labelEn: string;
    labelZh: string;
    action: DemoActionType;
    // optional payload for SET_STEP or future use
    step?: number;
};

export type TrainingStep = {
    key: string; // "s0" | "s1" ... stable key
    titleEn: string;
    titleZh: string;

    descriptionEn?: string;
    descriptionZh?: string;

    bulletsEn?: string[];
    bulletsZh?: string[];

    // checklist shown as interactive tickboxes in UI
    checklistEn?: string[];
    checklistZh?: string[];

    // controls what buttons to render in demo mode
    demoActions: DemoAction[];

    // optional gate: require checklist fully checked before allowing "CONTINUE"/"MARK_DONE"
    requireChecklistComplete?: boolean;
};

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
    steps: TrainingStep[];
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
