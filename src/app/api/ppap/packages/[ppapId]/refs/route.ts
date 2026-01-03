/**
 * PPAP Package Refs API
 * PATCH: Link references to checklist items + batch status updates
 */

import { NextResponse } from "next/server";
import { PpapRepository } from "@/lib/ppap";
import type { PpapApiResponse, PpapPackage, PpapChecklistKey, ChecklistItemStatus } from "@/lib/ppap";

interface RouteContext {
    params: Promise<{ ppapId: string }>;
}

interface RefUpdate {
    key: PpapChecklistKey;
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
    status?: ChecklistItemStatus;
    notes?: string;
}

interface RefsPatchItem {
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
}

/**
 * PATCH /api/ppap/packages/:ppapId/refs
 * 
 * Supports three input formats:
 * 1. { refs: RefUpdate[] }  - Original array format
 * 2. { checklistPatch: { designRecord: "READY", ... } }  - Quick status updates
 * 3. { refsPatch: { engineeringApproval: { sourceType, sourceId, sourceUrl } }, checklistPatch: {...} }
 */
export async function PATCH(
    request: Request,
    context: RouteContext
): Promise<NextResponse<PpapApiResponse<PpapPackage>>> {
    try {
        const { ppapId } = await context.params;
        const body = await request.json();

        let ppap = await PpapRepository.findById(ppapId);
        if (!ppap) {
            return NextResponse.json(
                {
                    ok: false,
                    error: {
                        code: "NOT_FOUND",
                        message: `PPAP package ${ppapId} not found`,
                    },
                },
                { status: 404 }
            );
        }

        // Format 1: Original refs array
        if (Array.isArray(body.refs)) {
            for (const ref of body.refs as RefUpdate[]) {
                const result = await PpapRepository.updateChecklistItem(ppapId, ref.key, {
                    sourceType: ref.sourceType as any,
                    sourceId: ref.sourceId,
                    sourceUrl: ref.sourceUrl,
                    status: ref.status,
                    notes: ref.notes,
                });
                if (result) ppap = result;
            }
        }

        // Format 2/3: checklistPatch - quick status updates
        // { checklistPatch: { designRecord: "READY", msa: "READY", ... } }
        if (body.checklistPatch && typeof body.checklistPatch === "object") {
            const patch = body.checklistPatch as Record<string, ChecklistItemStatus>;
            for (const [key, status] of Object.entries(patch)) {
                const result = await PpapRepository.updateChecklistItem(
                    ppapId,
                    key as PpapChecklistKey,
                    { status }
                );
                if (result) ppap = result;
            }
        }

        // Format 3: refsPatch - source linking
        // { refsPatch: { engineeringApproval: { sourceType, sourceId, sourceUrl } } }
        if (body.refsPatch && typeof body.refsPatch === "object") {
            const patch = body.refsPatch as Record<string, RefsPatchItem>;
            for (const [key, ref] of Object.entries(patch)) {
                const result = await PpapRepository.updateChecklistItem(
                    ppapId,
                    key as PpapChecklistKey,
                    {
                        sourceType: ref.sourceType as any,
                        sourceId: ref.sourceId,
                        sourceUrl: ref.sourceUrl,
                    }
                );
                if (result) ppap = result;
            }
        }

        return NextResponse.json({ ok: true, data: ppap });
    } catch (error) {
        console.error("PPAP refs error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to update PPAP refs",
                },
            },
            { status: 500 }
        );
    }
}
