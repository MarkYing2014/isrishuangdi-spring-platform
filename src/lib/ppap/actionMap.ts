/**
 * PPAP Checklist Action Map
 * Defines routing and action resolution for each PPAP checklist item
 * 
 * Core principle: PPAP doesn't create content, it references Source of Truth pages
 */

import type { PpapChecklistKey, ChecklistItemStatus } from "./types";

// ============ Types ============

export type ActionContext = {
    partNo: string;
    rev: string;
    ppapId: string;
};

export type LinkMode = "SELECT_SYSTEM_OBJECT" | "PASTE_URL" | "UPLOAD_FILE";

export type ActionKind = "NAVIGATE" | "OPEN_LINK_MODAL" | "DISABLED";

export type ResolvedAction = {
    label: string;
    labelZh: string;
    kind: ActionKind;
    href?: string;
    disabled: boolean;
    linkMode?: LinkMode;
    tooltip?: string;
    tooltipZh?: string;
};

interface ItemActionConfig {
    module: "design" | "engineering" | "manufacturing" | "quality" | "ppap";
    defaultHref: (ctx: ActionContext) => string;
    createHref?: (ctx: ActionContext) => string;
    viewHref?: (ctx: ActionContext, sourceId?: string) => string;
    linkMode?: LinkMode;
}

// ============ Route Configuration ============

export const PPAP_ITEM_ACTION_MAP: Record<PpapChecklistKey, ItemActionConfig> = {
    designRecord: {
        module: "design",
        defaultHref: ({ partNo, rev }) => `/tools/calculator?partNo=${partNo}&rev=${rev}`,
        createHref: ({ partNo, rev }) => `/tools/calculator?partNo=${partNo}&rev=${rev}`,
        viewHref: ({ partNo, rev }, sourceId) =>
            sourceId ? `/tools/calculator?resultId=${sourceId}` : `/tools/calculator?partNo=${partNo}&rev=${rev}`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    engineeringApproval: {
        module: "engineering",
        defaultHref: ({ partNo, rev }) => `/tools/calculator?partNo=${partNo}&rev=${rev}`,
        createHref: ({ partNo, rev }) => `/tools/calculator?partNo=${partNo}&rev=${rev}`,
        viewHref: ({ partNo, rev }, sourceId) =>
            sourceId ? `/tools/calculator?resultId=${sourceId}` : `/tools/calculator?partNo=${partNo}&rev=${rev}`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    controlPlan: {
        module: "manufacturing",
        defaultHref: ({ partNo, rev }) => `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}`,
        createHref: ({ partNo, rev }) => `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}&action=new-control-plan`,
        viewHref: ({ partNo, rev }, sourceId) =>
            sourceId ? `/manufacturing/dashboard?controlPlanId=${sourceId}` : `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    pfmea: {
        module: "manufacturing",
        defaultHref: ({ partNo, rev }) => `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}`,
        createHref: ({ partNo, rev }) => `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}&action=new-pfmea`,
        viewHref: ({ partNo, rev }, sourceId) =>
            sourceId ? `/manufacturing/dashboard?pfmeaId=${sourceId}` : `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    msa: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&tab=gauges`,
        createHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&action=new-gauge`,
        viewHref: ({ partNo, rev }, sourceId) =>
            sourceId ? `/quality?gaugeId=${sourceId}` : `/quality?partNo=${partNo}&rev=${rev}&tab=gauges`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    materialCert: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&tab=material`,
        // Material cert usually from supplier → use paste URL mode
        linkMode: "PASTE_URL",
    },

    dimensionalResults: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&tab=inspection`,
        createHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&action=new-inspection`,
        viewHref: ({ partNo, rev }, sourceId) =>
            sourceId ? `/quality?inspectionId=${sourceId}` : `/quality?partNo=${partNo}&rev=${rev}&tab=inspection`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    performanceTest: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&tab=tests`,
        linkMode: "PASTE_URL",
    },

    qualifiedLabDoc: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&tab=lab`,
        linkMode: "PASTE_URL",
    },

    aar: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&tab=aar`,
        linkMode: "PASTE_URL",
    },

    sampleProducts: {
        module: "manufacturing",
        defaultHref: ({ partNo, rev }) => `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}&tab=samples`,
        createHref: ({ partNo, rev }) => `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}&action=new-sample`,
        viewHref: ({ partNo, rev }, sourceId) =>
            sourceId ? `/manufacturing/dashboard?sampleId=${sourceId}` : `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}&tab=samples`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    masterSample: {
        module: "manufacturing",
        defaultHref: ({ partNo, rev }) => `/manufacturing/dashboard?partNo=${partNo}&rev=${rev}&tab=master-sample`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    checkingAids: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/quality?partNo=${partNo}&rev=${rev}&tab=checking-aids`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },

    customerSpecificReqs: {
        module: "quality",
        defaultHref: ({ partNo, rev }) => `/rfq?partNo=${partNo}&rev=${rev}`,
        linkMode: "PASTE_URL",
    },

    psw: {
        module: "ppap",
        defaultHref: ({ ppapId }) => `/ppap/${ppapId}`,
        viewHref: ({ ppapId }, sourceId) =>
            sourceId ? `/ppap/${ppapId}?pswId=${sourceId}` : `/ppap/${ppapId}`,
        linkMode: "SELECT_SYSTEM_OBJECT",
    },
};

// ============ Action Resolution ============

/**
 * Resolve the action for a checklist item based on its status
 * 
 * Rules:
 * - NA → Disabled
 * - READY → View (navigate to source if available)
 * - IN_PROGRESS → Continue (if has source) or Link (navigate to module)
 * - NOT_STARTED → Create (if system supports) or Link (navigate to module)
 */
export function resolveChecklistAction(
    item: {
        key: PpapChecklistKey;
        status: ChecklistItemStatus;
        sourceId?: string;
        sourceUrl?: string;
    },
    ctx: ActionContext
): ResolvedAction {
    const cfg = PPAP_ITEM_ACTION_MAP[item.key];

    // Rule A: NA (Not Applicable)
    if (item.status === "NA") {
        return {
            label: "N/A",
            labelZh: "不适用",
            kind: "DISABLED",
            disabled: true,
        };
    }

    // Rule B: READY → View
    if (item.status === "READY") {
        const href =
            item.sourceUrl ??
            (cfg.viewHref ? cfg.viewHref(ctx, item.sourceId) : cfg.defaultHref(ctx));

        // Tooltip if ready but missing source reference
        const missingRef = !item.sourceUrl && !item.sourceId;

        return {
            label: "View",
            labelZh: "查看",
            kind: "NAVIGATE",
            href,
            disabled: false,
            tooltip: missingRef ? "Ready but missing source reference" : undefined,
            tooltipZh: missingRef ? "已就绪但缺少来源引用" : undefined,
        };
    }

    // Rule C: IN_PROGRESS → Continue (if has source) or Link (navigate to module)
    if (item.status === "IN_PROGRESS") {
        if (item.sourceUrl || item.sourceId) {
            const href =
                item.sourceUrl ??
                (cfg.viewHref ? cfg.viewHref(ctx, item.sourceId) : cfg.defaultHref(ctx));
            return {
                label: "Continue",
                labelZh: "继续",
                kind: "NAVIGATE",
                href,
                disabled: false,
            };
        }
        // Missing source reference in progress → open modal to link
        return {
            label: "Link",
            labelZh: "关联",
            kind: "OPEN_LINK_MODAL",
            disabled: false,
            linkMode: cfg.linkMode ?? "SELECT_SYSTEM_OBJECT",
        };
    }

    // Rule D: NOT_STARTED → Create (if system supports) or Link (open modal)
    if (cfg.createHref) {
        return {
            label: "Create",
            labelZh: "创建",
            kind: "NAVIGATE",
            href: cfg.createHref(ctx),
            disabled: false,
        };
    }

    // No createHref → Open modal to link (for external items like material certs)
    return {
        label: "Link",
        labelZh: "关联",
        kind: "OPEN_LINK_MODAL",
        disabled: false,
        linkMode: cfg.linkMode ?? "PASTE_URL",
    };
}
