/**
 * PSW Generation API
 * POST: Generate PSW document (blocks if not ready)
 * Creates snapshot and locks PPAP package on success
 */

import { NextResponse } from "next/server";
import {
    PpapRepository,
    PswRepository,
    SnapshotRepository,
    validateAndGeneratePsw
} from "@/lib/ppap";
import type { PpapApiResponse, PswDocument, PpapSnapshot } from "@/lib/ppap";

interface RouteContext {
    params: Promise<{ ppapId: string }>;
}

interface GeneratePswResponse {
    psw: PswDocument;
    snapshot: PpapSnapshot;
    locked: boolean;
}

/**
 * POST /api/ppap/packages/:ppapId/generate-psw
 * Generate PSW document
 * 
 * On success:
 * 1. Creates PSW document
 * 2. Creates immutable snapshot of checklist state
 * 3. Locks the PPAP package to prevent modifications
 * 
 * Returns 409 with blocked reasons if not all required items are READY
 * Returns 423 (Locked) if package is already locked
 */
export async function POST(
    request: Request,
    context: RouteContext
): Promise<NextResponse<PpapApiResponse<GeneratePswResponse>>> {
    try {
        const { ppapId } = await context.params;

        const ppap = await PpapRepository.findById(ppapId);
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

        // Check if already locked
        if (ppap.locked) {
            // Return existing PSW and snapshot
            const existingPsw = ppap.pswId ? await PswRepository.findById(ppap.pswId) : null;
            const existingSnapshot = ppap.snapshotId ? await SnapshotRepository.findById(ppap.snapshotId) : null;

            if (existingPsw && existingSnapshot) {
                return NextResponse.json({
                    ok: true,
                    data: {
                        psw: existingPsw,
                        snapshot: existingSnapshot,
                        locked: true,
                    },
                });
            }

            return NextResponse.json(
                {
                    ok: false,
                    error: {
                        code: "LOCKED",
                        message: "PPAP package is already locked for submission",
                    },
                },
                { status: 423 }
            );
        }

        // Validate and generate
        const result = validateAndGeneratePsw(ppap);

        if (!result.success) {
            // Return 409 Conflict with blocked reasons
            return NextResponse.json(
                {
                    ok: false,
                    error: result.error,
                },
                { status: 409 }
            );
        }

        // Create PSW in repository
        const psw = await PswRepository.create({
            ppapId: ppap.id,
            status: "DRAFT",
            fields: result.psw!.fields,
        });

        // Create snapshot of current checklist state
        const snapshot = await SnapshotRepository.create(ppap, psw.id);

        // Lock the PPAP and update with PSW/snapshot references
        const now = new Date().toISOString();
        await PpapRepository.update(ppapId, {
            pswId: psw.id,
            locked: true,
            submittedAt: now,
            snapshotId: snapshot.id,
            status: "READY", // Set to READY, user can then SUBMIT
        });

        // Mark PSW checklist item as READY
        await PpapRepository.updateChecklistItem(ppapId, "psw", {
            status: "READY",
            sourceId: psw.id,
            sourceUrl: `/api/ppap/psw/${psw.id}/preview`,
        });

        return NextResponse.json({
            ok: true,
            data: {
                psw,
                snapshot,
                locked: true,
            },
        }, { status: 201 });
    } catch (error) {
        console.error("PSW generation error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to generate PSW",
                },
            },
            { status: 500 }
        );
    }
}
