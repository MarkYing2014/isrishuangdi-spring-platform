/**
 * Training Session Service
 * Business logic for start/list/patch operations
 */

import { getModuleById } from "./modules";
import { TrainingSessionRepository } from "./repository";
import type { SessionProgressPatch, TrainingSession, TrainingModule } from "./types";

export interface StartSessionResult {
    module: TrainingModule;
    session: TrainingSession;
}

export function startOrResumeSession(params: { userId: string; moduleId: string }): StartSessionResult {
    const module = getModuleById(params.moduleId);
    if (!module) throw new Error("MODULE_NOT_FOUND");

    const existing = TrainingSessionRepository.findByUserAndModule(params.userId, params.moduleId);
    if (existing) return { module, session: existing };

    const now = new Date().toISOString();
    const session = TrainingSessionRepository.create({
        moduleId: params.moduleId,
        userId: params.userId,
        status: "IN_PROGRESS",
        currentStep: 1,
        stepsDone: 0,
        progressPercent: 0,
        startedAt: now,
        updatedAt: now,
    });

    return { module, session };
}

export function listSessions(userId: string): TrainingSession[] {
    return TrainingSessionRepository.findByUser(userId);
}

export function getSessionById(sessionId: string): TrainingSession | null {
    return TrainingSessionRepository.getById(sessionId);
}

function clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
}

export interface PatchProgressResult {
    module: TrainingModule;
    session: TrainingSession;
}

export function patchProgress(p: SessionProgressPatch): PatchProgressResult {
    const session = TrainingSessionRepository.getById(p.sessionId);
    if (!session) throw new Error("SESSION_NOT_FOUND");
    if (session.userId !== p.userId) throw new Error("FORBIDDEN");
    if (session.moduleId !== p.moduleId) throw new Error("MODULE_MISMATCH");

    const module = getModuleById(p.moduleId);
    if (!module) throw new Error("MODULE_NOT_FOUND");

    // If already completed, keep it read-only
    if (session.status === "COMPLETED") return { module, session };

    let currentStep = session.currentStep;
    let stepsDone = session.stepsDone;

    if (p.action === "SET_STEP") {
        currentStep = clamp(p.step ?? 1, 1, module.stepsCount);
    }

    if (p.action === "MARK_DONE") {
        // Mark current step as done, advance
        stepsDone = clamp(stepsDone + 1, 0, module.stepsCount);
        currentStep = clamp(currentStep + 1, 1, module.stepsCount);
    }

    if (p.action === "RESTART_STEP") {
        // Keep stepsDone, only log
    }

    if (p.action === "SIMULATE_ERROR") {
        // No state change by default, only log
    }

    const progressPercent = Math.round((stepsDone / module.stepsCount) * 100);
    const status: TrainingSession["status"] =
        progressPercent >= 100 ? "COMPLETED" : stepsDone > 0 ? "IN_PROGRESS" : "IN_PROGRESS";

    const completedAt = status === "COMPLETED" ? new Date().toISOString() : undefined;

    const updated = TrainingSessionRepository.update(session.id, {
        currentStep,
        stepsDone,
        progressPercent,
        status,
        ...(completedAt ? { completedAt } : {}),
    });

    return { module, session: updated };
}
