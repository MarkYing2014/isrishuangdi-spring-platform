/**
 * Training Audit List API
 * GET: List audit events (admin only)
 */

import { NextResponse } from "next/server";
import { AuditRepository } from "@/lib/training";

function getActor(request: Request) {
    const actorUserId =
        request.headers.get("x-user-id") ||
        new URL(request.url).searchParams.get("actorUserId") ||
        "demo";

    const actorRoleRaw =
        request.headers.get("x-role") ||
        new URL(request.url).searchParams.get("role") ||
        "user";

    const actorRole = actorRoleRaw === "admin" ? "admin" : "user";
    return { actorUserId, actorRole };
}

export async function GET(request: Request) {
    const { actorRole } = getActor(request);

    // Admin only access
    if (actorRole !== "admin") {
        return NextResponse.json(
            { error: "FORBIDDEN", reason: "admin_only" },
            { status: 403 }
        );
    }

    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = Math.max(1, Math.min(Number(limitRaw ?? 200), 1000));

    const events = AuditRepository.list(limit);
    return NextResponse.json({ events });
}
