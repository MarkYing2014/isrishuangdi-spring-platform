/**
 * Training Sessions Start API
 * POST: Start or resume a training session
 */

import { NextResponse } from "next/server";
import { startOrResumeSession } from "@/lib/training";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const userId = (body.userId as string) || "demo";
        const moduleId = body.moduleId as string;

        if (!moduleId) {
            return NextResponse.json(
                { error: "moduleId_required" },
                { status: 400 }
            );
        }

        const result = startOrResumeSession({ userId, moduleId });
        return NextResponse.json(result);
    } catch (e: any) {
        const msg = e?.message ?? "unknown_error";
        const code = msg === "MODULE_NOT_FOUND" ? 404 : 400;
        return NextResponse.json({ error: msg }, { status: code });
    }
}
