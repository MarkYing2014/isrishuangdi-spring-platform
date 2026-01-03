/**
 * PPAP State Machine
 * Status transitions and readiness computation
 */

import type {
    PpapPackage,
    PpapStatus,
    PpapChecklistKey,
    PpapReadinessResult,
} from "./types";
import { PSW_REQUIRED_ITEMS } from "./types";
import { getChecklistTemplate } from "./checklist";

// ============ Status Labels ============
export const STATUS_LABELS: Record<PpapStatus, { en: string; zh: string }> = {
    DRAFT: { en: "Draft", zh: "草稿" },
    READY: { en: "Ready for Submission", zh: "待提交" },
    SUBMITTED: { en: "Submitted", zh: "已提交" },
    APPROVED: { en: "Approved", zh: "已批准" },
};

// ============ Valid Status Transitions ============
const VALID_TRANSITIONS: Record<PpapStatus, PpapStatus[]> = {
    DRAFT: ["READY"],
    READY: ["DRAFT", "SUBMITTED"],
    SUBMITTED: ["READY", "APPROVED"],
    APPROVED: ["SUBMITTED"], // Allow rollback
};

/**
 * Check if a status transition is valid
 */
export function canTransition(from: PpapStatus, to: PpapStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Compute PPAP readiness for PSW generation
 * Returns percent complete, missing items, and blocked reasons
 */
export function computePpapReadiness(ppap: PpapPackage): PpapReadinessResult {
    const required = ppap.checklist.filter((item) =>
        PSW_REQUIRED_ITEMS.includes(item.key)
    );

    const ready = required.filter((item) => item.status === "READY");
    const missing = required
        .filter((item) => item.status !== "READY" && item.status !== "NA")
        .map((item) => item.key);

    const percent = required.length > 0
        ? Math.round((ready.length / required.length) * 100)
        : 0;

    // Store structured data for i18n formatting in UI
    const blockedReasons = missing.map((key) => {
        const item = ppap.checklist.find((i) => i.key === key);
        return `${key}:${item?.status ?? "NOT_STARTED"}`;
    });

    return {
        percent,
        total: required.length,
        ready: ready.length,
        missing,
        blockedReasons,
        pswBlocked: missing.length > 0,
    };
}

/**
 * Check if PPAP can be submitted (all required items ready)
 */
export function canSubmit(ppap: PpapPackage): boolean {
    const { pswBlocked } = computePpapReadiness(ppap);
    return !pswBlocked && ppap.pswId !== undefined;
}

/**
 * Determine if PPAP status should auto-update based on checklist state
 */
export function computeAutoStatus(ppap: PpapPackage): PpapStatus {
    const { pswBlocked } = computePpapReadiness(ppap);

    if (ppap.status === "APPROVED" || ppap.status === "SUBMITTED") {
        // Don't auto-change once submitted
        return ppap.status;
    }

    // Auto-promote to READY if all required items are ready
    if (!pswBlocked && ppap.pswId) {
        return "READY";
    }

    return "DRAFT";
}

/**
 * Get next available status transitions
 */
export function getAvailableTransitions(ppap: PpapPackage): PpapStatus[] {
    const transitions = VALID_TRANSITIONS[ppap.status] ?? [];

    // Filter out READY if PSW is blocked
    if (ppap.status === "DRAFT") {
        const { pswBlocked } = computePpapReadiness(ppap);
        if (pswBlocked || !ppap.pswId) {
            return transitions.filter((t) => t !== "READY");
        }
    }

    return transitions;
}
