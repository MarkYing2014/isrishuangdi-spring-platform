/**
 * PPAP Package Detail API
 * GET: Get single PPAP package
 * PATCH: Update PPAP package status
 */

import { NextResponse } from "next/server";
import { PpapRepository, computePpapReadiness, seedDemoData } from "@/lib/ppap";
import type { PpapApiResponse, PpapPackage, PpapReadinessResult } from "@/lib/ppap";

interface RouteContext {
    params: Promise<{ ppapId: string }>;
}

// Ensure demo data exists
async function ensureSeeded() {
    await seedDemoData();
}

/**
 * GET /api/ppap/packages/:ppapId
 * Get a single PPAP package with readiness info
 */
export async function GET(
    request: Request,
    context: RouteContext
): Promise<NextResponse<PpapApiResponse<PpapPackage & { readiness: PpapReadinessResult }>>> {
    try {
        await ensureSeeded();
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

        return NextResponse.json({
            ok: true,
            data: { ...ppap, readiness },
        });
    } catch (error) {
        console.error("PPAP get error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to get PPAP package",
                },
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/ppap/packages/:ppapId
 * Update PPAP package (status, submission level)
 */
export async function PATCH(
    request: Request,
    context: RouteContext
): Promise<NextResponse<PpapApiResponse<PpapPackage>>> {
    try {
        const { ppapId } = await context.params;
        const body = await request.json();

        const existing = await PpapRepository.findById(ppapId);
        if (!existing) {
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

        // Only allow updating certain fields
        const updates: Partial<PpapPackage> = {};
        if (body.status) updates.status = body.status;
        if (body.submissionLevel) updates.submissionLevel = body.submissionLevel;

        const updated = await PpapRepository.update(ppapId, updates);

        return NextResponse.json({ ok: true, data: updated! });
    } catch (error) {
        console.error("PPAP update error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to update PPAP package",
                },
            },
            { status: 500 }
        );
    }
}
