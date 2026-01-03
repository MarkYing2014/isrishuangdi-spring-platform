/**
 * PPAP Readiness API
 * GET: Get readiness status for a PPAP package
 */

import { NextResponse } from "next/server";
import { PpapRepository, computePpapReadiness } from "@/lib/ppap";
import type { PpapApiResponse, PpapReadinessResult } from "@/lib/ppap";

interface RouteContext {
    params: Promise<{ ppapId: string }>;
}

/**
 * GET /api/ppap/packages/:ppapId/readiness
 * Get PSW readiness status
 */
export async function GET(
    request: Request,
    context: RouteContext
): Promise<NextResponse<PpapApiResponse<PpapReadinessResult>>> {
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

        const readiness = computePpapReadiness(ppap);

        return NextResponse.json({ ok: true, data: readiness });
    } catch (error) {
        console.error("PPAP readiness error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to get PPAP readiness",
                },
            },
            { status: 500 }
        );
    }
}
