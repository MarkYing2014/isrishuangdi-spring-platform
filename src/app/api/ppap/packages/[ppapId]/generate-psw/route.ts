/**
 * PSW Generation API
 * POST: Generate PSW document (blocks if not ready)
 */

import { NextResponse } from "next/server";
import { PpapRepository, PswRepository, validateAndGeneratePsw } from "@/lib/ppap";
import type { PpapApiResponse, PswDocument } from "@/lib/ppap";

interface RouteContext {
    params: Promise<{ ppapId: string }>;
}

/**
 * POST /api/ppap/packages/:ppapId/generate-psw
 * Generate PSW document
 * 
 * Returns 409 with blocked reasons if not all required items are READY
 */
export async function POST(
    request: Request,
    context: RouteContext
): Promise<NextResponse<PpapApiResponse<PswDocument>>> {
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

        // Check if PSW already exists
        if (ppap.pswId) {
            const existingPsw = await PswRepository.findById(ppap.pswId);
            if (existingPsw) {
                return NextResponse.json({
                    ok: true,
                    data: existingPsw,
                });
            }
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

        // Link PSW to PPAP and mark PSW checklist item as READY
        await PpapRepository.update(ppapId, { pswId: psw.id });
        await PpapRepository.updateChecklistItem(ppapId, "psw", {
            status: "READY",
            sourceId: psw.id,
            sourceUrl: `/api/ppap/psw/${psw.id}/preview`,
        });

        return NextResponse.json({ ok: true, data: psw }, { status: 201 });
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
