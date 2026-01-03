/**
 * Training Export Audit Repository
 * Tracks CSV export events for compliance/audit
 */

export interface ExportAuditEvent {
    id: string;
    ts: string;
    actorUserId: string;
    actorRole: "admin" | "user";
    targetUserId: string;
    filters: {
        onlyIncomplete?: boolean;
        level?: string;
        q?: string;
    };
    rowCount: number;
    ip?: string;
    userAgent?: string;
    result: "ALLOW" | "DENY";
    reason?: string;
}

function genId(prefix = "audit") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// In-memory store for demo
const events: ExportAuditEvent[] = [];

// Optional: file logging configuration
let fileLoggingEnabled = false;
let auditFilePath = "./data/training_export_audit.log";

export const AuditRepository = {
    enableFileLogging(path = "./data/training_export_audit.log") {
        fileLoggingEnabled = true;
        auditFilePath = path;
    },

    list(limit = 200): ExportAuditEvent[] {
        return events.slice(-limit).reverse();
    },

    async append(e: Omit<ExportAuditEvent, "id" | "ts">): Promise<ExportAuditEvent> {
        const full: ExportAuditEvent = {
            id: genId(),
            ts: new Date().toISOString(),
            ...e
        };
        events.push(full);

        if (fileLoggingEnabled) {
            try {
                // Lazy import to avoid edge runtime issues
                const fs = await import("fs");
                const path = await import("path");
                const dir = path.dirname(auditFilePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.appendFileSync(auditFilePath, JSON.stringify(full) + "\n", "utf8");
            } catch {
                // Ignore file logging errors in demo
            }
        }

        return full;
    },
};
