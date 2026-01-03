/**
 * Training Export Service
 * Authorization + CSV generation for server-side export
 */

import { getAllModules } from "./modules";
import { listSessions } from "./sessionService";
import type { TrainingModule, TrainingSession, Level } from "./types";

export interface ExportFilters {
    onlyIncomplete?: boolean;
    level?: string;
    q?: string;
}

export interface Actor {
    userId: string;
    role: "admin" | "user";
}

interface ProgressRow {
    moduleId: string;
    title: string;
    level: string;
    machine: string;
    status: string;
    progressPercent: number;
    errorsCount: number;
    updatedAt: string;
}

function toCsvValue(v: any): string {
    const s = String(v ?? "");
    const escaped = s.replace(/"/g, '""');
    return /[,\n"]/.test(escaped) ? `"${escaped}"` : escaped;
}

/**
 * Authorization: user can export self only; admin can export anyone
 */
export function authorizeExport(params: {
    actor: Actor;
    targetUserId: string;
}): { allow: true } | { allow: false; reason: string } {
    const { actor, targetUserId } = params;

    if (actor.role === "admin") return { allow: true };
    if (actor.userId === targetUserId) return { allow: true };
    return { allow: false, reason: "user_can_only_export_self" };
}

function buildRows(params: {
    targetUserId: string;
    filters: ExportFilters;
    lang: "zh" | "en";
    modules: TrainingModule[];
    sessions: TrainingSession[];
}): ProgressRow[] {
    const { filters, lang, modules, sessions } = params;

    const sessionByModuleId = new Map<string, TrainingSession>();
    for (const s of sessions) {
        const existing = sessionByModuleId.get(s.moduleId);
        if (!existing) sessionByModuleId.set(s.moduleId, s);
        else {
            const a = new Date(existing.updatedAt).getTime();
            const b = new Date(s.updatedAt).getTime();
            if (b > a) sessionByModuleId.set(s.moduleId, s);
        }
    }

    const q = (filters.q ?? "").trim().toLowerCase();

    const rows: ProgressRow[] = modules.map((m) => {
        const s = sessionByModuleId.get(m.id);
        const title = lang === "en" ? m.titleEn : m.titleZh;

        if (!s) {
            return {
                moduleId: m.id,
                title,
                level: m.level,
                machine: m.machine,
                status: "NOT_STARTED",
                progressPercent: 0,
                errorsCount: 0,
                updatedAt: m.updatedAt,
            };
        }

        return {
            moduleId: m.id,
            title,
            level: m.level,
            machine: m.machine,
            status: s.status,
            progressPercent: Number(s.progressPercent ?? 0),
            errorsCount: 0,
            updatedAt: s.updatedAt ?? m.updatedAt,
        };
    });

    return rows
        .filter((r) => (filters.level ? r.level === filters.level : true))
        .filter((r) => {
            if (!q) return true;
            const hay = `${r.moduleId} ${r.title} ${r.level} ${r.machine} ${r.status}`.toLowerCase();
            return hay.includes(q);
        })
        .filter((r) => {
            if (!filters.onlyIncomplete) return true;
            return r.status !== "COMPLETED";
        })
        .sort((a, b) => {
            const prio = (x: ProgressRow) => {
                if (x.status === "IN_PROGRESS") return 0;
                if (x.status === "NOT_STARTED") return 1;
                return 2;
            };
            const p = prio(a) - prio(b);
            if (p !== 0) return p;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
}

/**
 * Generate CSV content for progress export
 */
export function exportProgressCsv(params: {
    targetUserId: string;
    filters: ExportFilters;
    lang: "zh" | "en";
}): { csv: string; rowCount: number } {
    const modules = getAllModules();
    const sessions = listSessions(params.targetUserId);

    const rows = buildRows({
        targetUserId: params.targetUserId,
        filters: params.filters,
        lang: params.lang,
        modules,
        sessions,
    });

    const headers = [
        "moduleId",
        "title",
        "level",
        "machine",
        "status",
        "progressPercent",
        "errorsCount",
        "updatedAt",
    ];

    const csv = [
        headers.join(","),
        ...rows.map((r) =>
            [
                r.moduleId,
                r.title,
                r.level,
                r.machine,
                r.status,
                r.progressPercent,
                r.errorsCount,
                r.updatedAt,
            ]
                .map(toCsvValue)
                .join(",")
        ),
    ].join("\n");

    return { csv, rowCount: rows.length };
}
