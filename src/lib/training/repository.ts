/**
 * Training Session Repository
 * In-memory storage for demo (Prisma-ready interface)
 */

import type { TrainingSession } from "./types";

function genId(prefix = "sess") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// In-memory store (server runtime)
const sessions = new Map<string, TrainingSession>();

export const TrainingSessionRepository = {
    findByUser(userId: string): TrainingSession[] {
        return Array.from(sessions.values()).filter((s) => s.userId === userId);
    },

    findByUserAndModule(userId: string, moduleId: string): TrainingSession | null {
        for (const s of sessions.values()) {
            if (s.userId === userId && s.moduleId === moduleId) return s;
        }
        return null;
    },

    getById(id: string): TrainingSession | null {
        return sessions.get(id) ?? null;
    },

    create(input: Omit<TrainingSession, "id">): TrainingSession {
        const id = genId("train");
        const session: TrainingSession = { id, ...input };
        sessions.set(id, session);
        return session;
    },

    update(id: string, patch: Partial<TrainingSession>): TrainingSession {
        const existing = sessions.get(id);
        if (!existing) throw new Error("SESSION_NOT_FOUND");
        const next: TrainingSession = { ...existing, ...patch, updatedAt: new Date().toISOString() };
        sessions.set(id, next);
        return next;
    },
};
