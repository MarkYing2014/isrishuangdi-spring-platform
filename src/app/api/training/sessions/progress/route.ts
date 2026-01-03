/**
 * Training Sessions Progress API
 * PATCH: Update session progress (MARK_DONE, RESTART_STEP, etc.)
 */

import { NextResponse } from "next/server";
import { patchProgress } from "@/lib/training";

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const result = patchProgress(body);
        return NextResponse.json(result);
    } catch (e: any) {
        const msg = e?.message ?? "unknown_error";
        const code =
            msg === "SESSION_NOT_FOUND" ? 404 :
                msg === "FORBIDDEN" ? 403 :
                    msg === "MODULE_NOT_FOUND" ? 404 :
                        msg === "MODULE_MISMATCH" ? 400 :
                            400;
        return NextResponse.json({ error: msg }, { status: code });
    }
}
