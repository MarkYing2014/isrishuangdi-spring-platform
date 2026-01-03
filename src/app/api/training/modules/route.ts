/**
 * Training Modules API
 * GET: List all training modules
 */

import { NextResponse } from "next/server";
import { getAllModules } from "@/lib/training";

export async function GET() {
    const modules = getAllModules();
    return NextResponse.json({ modules });
}
