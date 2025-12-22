import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

// FreeCAD Python 解释器路径
const FREECAD_PYTHON = process.platform === "darwin"
  ? "/Applications/FreeCAD.app/Contents/Resources/bin/python"
  : process.platform === "win32"
    ? "C:\\Program Files\\FreeCAD 0.21\\bin\\python.exe"
    : "/usr/bin/python3";

// 脚本路径
const SCRIPT_PATH = path.join(process.cwd(), "cad-worker/freecad/run_export.py");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { springType, geometry, material, analysis } = body;

    // Check for CAD_WORKER_URL (Remote Worker)
    const CAD_WORKER_URL = process.env.CAD_WORKER_URL;

    // Prepare geometry with defaults
    const processedGeometry = {
      ...geometry,
      // Ensure totalCoils is set (logic from original local implementation)
      totalCoils: geometry.totalCoils || (geometry.activeCoils ? geometry.activeCoils + 2 : undefined),
    };

    if (CAD_WORKER_URL) {
      try {
        console.log(`[FreeCAD Drawing] Delegating to worker at ${CAD_WORKER_URL}`);

        const workerPayload = {
          springType,
          geometry: processedGeometry,
          export: {
            formats: ["SVG"],
            name: `drawing_${Date.now()}`,
          },
        };

        const workerRes = await fetch(`${CAD_WORKER_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workerPayload),
        });

        if (!workerRes.ok) {
          const errorText = await workerRes.text();
          console.error(`[FreeCAD Drawing] Worker failed: ${workerRes.status} ${errorText}`);
          throw new Error(`Cloud worker failed (${workerRes.status}): ${errorText.slice(0, 100)}`);
        }

        const workerData = await workerRes.json();

        // Find SVG file
        const svgFile = workerData.files?.find((f: { format: string }) => f.format === "SVG");

        if (!svgFile || !svgFile.downloadUrl) {
          throw new Error("Worker did not return SVG file");
        }

        // Decode base64 SVG content
        // downloadUrl is "data:image/svg+xml;base64,..." or similar
        const base64Data = svgFile.downloadUrl.split(",")[1];
        const svgContent = Buffer.from(base64Data, 'base64').toString('utf-8');

        return NextResponse.json({
          status: "success",
          svg: svgContent,
        });

      } catch (e) {
        console.error(`[FreeCAD Drawing] Worker error: ${e}`);
        return NextResponse.json({
          status: "error",
          message: `Worker connection refused: ${e instanceof Error ? e.message : String(e)}`
        }, { status: 502 });
      }
    }

    // Local FreeCAD Fallback
    // 检查 FreeCAD
    if (!existsSync(FREECAD_PYTHON)) {
      return NextResponse.json({
        status: "error",
        message: "FreeCAD not installed (Local)",
      }, { status: 500 });
    }

    // 创建临时目录
    const jobId = randomUUID();
    const jobDir = path.join(process.cwd(), ".tmp/freecad-drawing", jobId);
    await mkdir(jobDir, { recursive: true });

    // 准备设计文件
    const exportName = `drawing_${jobId.slice(0, 8)}`;
    const designFile = path.join(jobDir, "design.json");

    await writeFile(designFile, JSON.stringify({
      springType,
      geometry: processedGeometry,
      material,
      analysis,
      export: {
        formats: ["SVG"],
        name: exportName,
      },
    }, null, 2));

    // 调用 FreeCAD
    const command = `${FREECAD_PYTHON} ${SCRIPT_PATH} ${designFile} ${jobDir}`;
    console.log(`[FreeCAD Drawing] Running: ${command}`);

    let stdout: string, stderr: string;
    try {
      const result = await execAsync(command, {
        timeout: 120000,
        maxBuffer: 50 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError) {
      console.error(`[FreeCAD Drawing] Exec error:`, execError);
      return NextResponse.json({
        status: "error",
        message: `FreeCAD execution failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`,
      }, { status: 500 });
    }

    console.log(`[FreeCAD Drawing] stdout: ${stdout}`);

    // 查找生成的 SVG 文件
    const svgPath = path.join(jobDir, `${exportName}.svg`);

    if (!existsSync(svgPath)) {
      return NextResponse.json({
        status: "error",
        message: "SVG file not generated",
      }, { status: 500 });
    }

    // 读取 SVG 内容
    const svgContent = await readFile(svgPath, "utf-8");

    // 清理临时文件（延迟）
    setTimeout(async () => {
      try {
        const { rm } = await import("fs/promises");
        await rm(jobDir, { recursive: true, force: true });
      } catch (e) {
        console.error(`[FreeCAD Drawing] Cleanup failed: ${e}`);
      }
    }, 30000);

    return NextResponse.json({
      status: "success",
      svg: svgContent,
    });

  } catch (error) {
    console.error("[FreeCAD Drawing] Error:", error);
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
