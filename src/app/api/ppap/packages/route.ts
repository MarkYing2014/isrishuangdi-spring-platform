/**
 * PPAP Packages API
 * POST: Create new PPAP package
 * GET: List all PPAP packages
 */

import { NextResponse } from "next/server";
import { PpapRepository, seedDemoData } from "@/lib/ppap";
import type { PpapPackageCreateInput, PpapApiResponse, PpapPackage } from "@/lib/ppap";

// Seed demo data on first request (in-memory only)
let seeded = false;
async function ensureSeeded() {
    if (!seeded) {
        await seedDemoData();
        seeded = true;
    }
}

/**
 * POST /api/ppap/packages
 * Create a new PPAP package
 */
export async function POST(request: Request): Promise<NextResponse<PpapApiResponse<PpapPackage>>> {
    try {
        await ensureSeeded();

        const body = await request.json();

        // Validate required fields
        const required = ["partNo", "partRev", "partName", "program", "customer"];
        const missing = required.filter((field) => !body[field]);

        if (missing.length > 0) {
            return NextResponse.json(
                {
                    ok: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: `Missing required fields: ${missing.join(", ")}`,
                    },
                },
                { status: 400 }
            );
        }

        const input: PpapPackageCreateInput = {
            partNo: body.partNo,
            partRev: body.partRev,
            partName: body.partName,
            program: body.program,
            customer: body.customer,
            submissionLevel: body.submissionLevel,
        };

        const ppap = await PpapRepository.create(input);

        return NextResponse.json({ ok: true, data: ppap }, { status: 201 });
    } catch (error) {
        console.error("PPAP create error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to create PPAP package",
                },
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/ppap/packages
 * List all PPAP packages
 */
export async function GET(): Promise<NextResponse<PpapApiResponse<PpapPackage[]>>> {
    try {
        await ensureSeeded();

        const packages = await PpapRepository.findAll();

        return NextResponse.json({ ok: true, data: packages });
    } catch (error) {
        console.error("PPAP list error:", error);
        return NextResponse.json(
            {
                ok: false,
                error: {
                    code: "INTERNAL_ERROR",
                    message: "Failed to list PPAP packages",
                },
            },
            { status: 500 }
        );
    }
}
