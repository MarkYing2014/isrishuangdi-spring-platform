/**
 * Training Sessions List API
 * GET: List all sessions for a user
 */

import { NextResponse } from "next/server";
import { listSessions } from "@/lib/training";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "demo";

    const sessions = listSessions(userId);
    return NextResponse.json({ sessions });
}
