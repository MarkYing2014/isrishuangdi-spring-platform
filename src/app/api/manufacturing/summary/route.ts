/**
 * Manufacturing Dashboard Summary API
 * 生产监控仪表板数据 API
 * 
 * GET /api/manufacturing/summary
 */

import { NextRequest, NextResponse } from "next/server";
import { generateMockDashboard } from "@/lib/manufacturing/mock";
import type { TimeRange } from "@/lib/manufacturing/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const plantId = searchParams.get("plantId") ?? "P01";
    const lineId = searchParams.get("lineId") ?? undefined;
    const range = (searchParams.get("range") ?? "1h") as TimeRange;
    const riskLevel = (searchParams.get("risk") ?? "low") as "low" | "medium" | "high";
    const seed = searchParams.get("seed") ? parseInt(searchParams.get("seed")!, 10) : Date.now();

    // Generate mock data (in production, this would query real databases)
    const data = generateMockDashboard({
      seed,
      plantId,
      lineId,
      range,
      riskLevel,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Manufacturing summary API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch manufacturing data" },
      { status: 500 }
    );
  }
}
