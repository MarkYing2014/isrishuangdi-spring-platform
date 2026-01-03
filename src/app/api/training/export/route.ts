/**
 * Training Export CSV API
 * GET: Server-side CSV export with permissions and audit logging
 * 
 * Query params:
 * - userId: target user to export (default: "demo")
 * - onlyIncomplete: "1" to filter incomplete only
 * - level: filter by level (Beginner/Intermediate/Advanced)
 * - q: search query
 * - lang: "zh" or "en" (default: "zh")
 * - actorUserId: demo actor identity
 * - role: "admin" or "user" (default: "user")
 */

import { NextResponse } from "next/server";
import {
    AuditRepository,
    authorizeExport,
    exportProgressCsv
} from "@/lib/training";

function parseBool(v: string | null): boolean {
    return v === "1" || v === "true" || v === "yes";
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // Optional: enable file logging for persistent audit
    // AuditRepository.enableFileLogging();

    const targetUserId = searchParams.get("userId") || "demo";
    const onlyIncomplete = parseBool(searchParams.get("onlyIncomplete"));
    const level = searchParams.get("level") || "";
    const q = searchParams.get("q") || "";
    const lang = searchParams.get("lang") === "en" ? "en" : "zh";

    // Actor identity (demo mode - from headers or query)
    const actorUserId =
        request.headers.get("x-user-id") ||
        searchParams.get("actorUserId") ||
        "demo";

    const actorRoleParam =
        request.headers.get("x-role") ||
        searchParams.get("role") ||
        "user";
    const actorRole = actorRoleParam === "admin" ? "admin" : "user";

    const actor = { userId: actorUserId, role: actorRole as "admin" | "user" };

    // Check authorization
    const auth = authorizeExport({ actor, targetUserId });

    // Get request metadata for audit
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const userAgent = request.headers.get("user-agent") || "";

    const filters = {
        onlyIncomplete: onlyIncomplete || undefined,
        level: level || undefined,
        q: q || undefined,
    };

    if (!auth.allow) {
        // Audit denied access
        await AuditRepository.append({
            actorUserId: actor.userId,
            actorRole: actor.role,
            targetUserId,
            filters,
            rowCount: 0,
            ip,
            userAgent,
            result: "DENY",
            reason: auth.reason,
        });

        return NextResponse.json(
            { error: "FORBIDDEN", reason: auth.reason },
            { status: 403 }
        );
    }

    // Generate CSV
    const { csv, rowCount } = exportProgressCsv({
        targetUserId,
        filters,
        lang,
    });

    // Audit allowed access
    await AuditRepository.append({
        actorUserId: actor.userId,
        actorRole: actor.role,
        targetUserId,
        filters,
        rowCount,
        ip,
        userAgent,
        result: "ALLOW",
    });

    const filename = `training_progress_${targetUserId}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
