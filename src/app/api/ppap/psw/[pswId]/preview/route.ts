/**
 * PSW Preview API
 * GET: Get PSW document with JSON fields and pdfUrl
 */

import { NextResponse } from "next/server";
import { PswRepository, generatePswPdfUrl } from "@/lib/ppap";
import type { PpapApiResponse, PswDocument } from "@/lib/ppap";

interface RouteContext {
    params: Promise<{ pswId: string }>;
}

/**
 * GET /api/ppap/psw/:pswId/preview
 * Get PSW document preview (JSON + pdfUrl)
 */
export async function GET(
    request: Request,
    context: RouteContext
): Promise<NextResponse<PpapApiResponse<PswDocument & { pdfUrl: string }>>> {
    try {
        const { pswId } = await context.params;

        const psw = await PswRepository.findById(pswId);
        if (!psw) {
            return NextResponse.json(
                {
                    ok: false,
                    error: {
                        code: "NOT_FOUND",
                        message: `PSW document ${pswId} not found`,
                    },
                },
                { status: 404 }
            );
        }

        // Generate PDF URL (stub)
        const pdfUrl = generatePswPdfUrl(pswId);

        return NextResponse.json({
            ok: true,
            data: { ...psw, pdfUrl },
        });
    } catch (error) {
        console.error("PSW preview error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to get PSW preview",
                },
            },
            { status: 500 }
        );
    }
}
