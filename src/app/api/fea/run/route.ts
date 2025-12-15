/**
 * FEA Run API
 * POST /api/fea/run
 *
 * Pure frontend FEA calculation using engineering formulas.
 * Compatible with Vercel and other serverless platforms.
 */

import { NextRequest } from "next/server";
import { runFeaCalculation } from "@/lib/fea/feaCalculator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { springType, geometry, loadCase, allowableStress } = body;

    if (!springType || !geometry) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing springType or geometry",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const result = runFeaCalculation({
      springType,
      geometry,
      loadCase: loadCase || { springType, loadValue: 0 },
      allowableStress,
    });

    if (!result.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: result.error,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ ok: true, result: result.result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FEA service error";
    console.error("[FEA API Error]", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
