/**
 * FEA Run API
 * POST /api/fea/run
 *
 * Spawns Python fea_service.py, sends design JSON via stdin,
 * returns FEA results or error.
 */

import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const scriptPath = path.join(process.cwd(), "server/fea_service.py");
      const py = spawn("python3", ["-u", scriptPath], {
        cwd: process.cwd(),
      });

      let stdout = "";
      let stderr = "";

      py.stdout.on("data", (d) => (stdout += d.toString()));
      py.stderr.on("data", (d) => (stderr += d.toString()));
      py.on("error", (err) => reject(err));
      py.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Error(`Python exit code ${code}. stderr: ${stderr}`)
          );
        }
        try {
          const json = JSON.parse(stdout.trim() || "{}");
          resolve(json);
        } catch {
          reject(
            new Error(
              `Failed to parse Python JSON. stdout=${stdout} stderr=${stderr}`
            )
          );
        }
      });

      py.stdin.write(JSON.stringify(body));
      py.stdin.write("\n");
      py.stdin.end();
    });

    return new Response(JSON.stringify({ ok: true, result }), {
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
