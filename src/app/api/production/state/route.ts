import { NextRequest, NextResponse } from "next/server";
import { getProductionSnapshot, type RiskLevel } from "@/lib/production";

export async function GET(req: NextRequest) {
  try {
    const mode = req.nextUrl.searchParams.get("mode") ?? "demo";
    const riskPreset = (req.nextUrl.searchParams.get("risk") ?? "OK") as RiskLevel;
    const seedParam = req.nextUrl.searchParams.get("seed");
    const seed = seedParam ? parseInt(seedParam, 10) : undefined;

    if (mode !== "demo" && mode !== "real") {
      return NextResponse.json({ error: "Invalid mode. Use 'demo' or 'real'." }, { status: 400 });
    }

    const snapshot = await getProductionSnapshot({
      mode: mode as "demo" | "real",
      riskPreset,
      seed,
    });

    return NextResponse.json(snapshot);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
