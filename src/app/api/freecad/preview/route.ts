/**
 * FreeCAD Preview API
 * FreeCAD 预览 API
 * 
 * POST /api/freecad/preview
 * 
 * 调用 FreeCAD 生成 3D 模型并返回 OBJ/glTF 用于 Web 预览
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const execAsync = promisify(exec);

// Generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// FreeCAD 命令路径
const FREECAD_PATHS_WINDOWS = [
  "C:\\Program Files\\FreeCAD 0.21\\bin\\FreeCADCmd.exe",
  "C:\\Program Files\\FreeCAD 0.20\\bin\\FreeCADCmd.exe",
  "C:\\Program Files\\FreeCAD\\bin\\FreeCADCmd.exe",
];

const FREECAD_PATHS_MACOS = [
  "/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd",
  "/Applications/FreeCAD.app/Contents/Resources/bin/freecad",
  "/Applications/FreeCAD.app/Contents/MacOS/FreeCAD",
];

const FREECAD_PATHS_LINUX = [
  "/usr/bin/freecadcmd",
  "/usr/bin/freecad",
  "/usr/local/bin/freecadcmd",
];

// FreeCAD Python 解释器路径
const FREECAD_PYTHON_MACOS = "/Applications/FreeCAD.app/Contents/Resources/bin/python";
const FREECAD_PYTHON_WINDOWS = [
  "C:\\Program Files\\FreeCAD 0.21\\bin\\python.exe",
  "C:\\Program Files\\FreeCAD 0.20\\bin\\python.exe",
  "C:\\Program Files\\FreeCAD\\bin\\python.exe",
];

function getFreeCADPython(): string | null {
  const fs = require("fs");

  if (process.env.FREECAD_PYTHON) {
    return process.env.FREECAD_PYTHON;
  }

  if (process.platform === "darwin") {
    if (fs.existsSync(FREECAD_PYTHON_MACOS)) {
      return FREECAD_PYTHON_MACOS;
    }
  }

  if (process.platform === "win32") {
    for (const p of FREECAD_PYTHON_WINDOWS) {
      if (fs.existsSync(p)) {
        return `"${p}"`;
      }
    }
  }

  for (const p of FREECAD_PATHS_LINUX) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

const FREECAD_PYTHON = getFreeCADPython();
const SCRIPT_PATH = path.join(process.cwd(), "cad-worker/freecad/run_export.py");
const TEMP_DIR = path.join(process.cwd(), ".tmp/freecad-preview");

interface PreviewRequest {
  springType: "compression" | "extension" | "torsion" | "conical" | "spiral_torsion" | "spiralTorsion" | "variable_pitch_compression" | "suspension_spring" | "arc" | "ARC_SPRING";
  geometry: {
    wireDiameter?: number;
    meanDiameter?: number;
    outerDiameter?: number;
    activeCoils?: number;
    totalCoils?: number;
    freeLength?: number;
    bodyLength?: number;
    hookType?: string;
    legLength1?: number;
    legLength2?: number;
    windingDirection?: "left" | "right";
    // Torsion specific
    freeAngle?: number;
    workingAngle?: number;
    // Conical specific
    largeOuterDiameter?: number;
    smallOuterDiameter?: number;
    endType?: "natural" | "closed" | "closed_ground";
    // Compression specific
    topGround?: boolean;
    bottomGround?: boolean;
    // Spiral Torsion specific
    innerDiameter?: number;
    turns?: number;
    stripWidth?: number;
    stripThickness?: number;
    handedness?: "cw" | "ccw";
  };
}

/**
 * 检查 FreeCAD 是否可用
 */
async function checkFreeCADAvailable(): Promise<boolean> {
  if (!FREECAD_PYTHON) {
    return false;
  }
  try {
    await execAsync(`${FREECAD_PYTHON} --version`);
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/freecad/preview
 * 生成 3D 预览模型
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PreviewRequest = await request.json();

    if (!body.springType || !body.geometry) {
      return NextResponse.json({
        status: "error",
        message: "Missing required fields",
      }, { status: 400 });
    }

    // Check if CAD_WORKER_URL is set
    const CAD_WORKER_URL = process.env.CAD_WORKER_URL;

    // If Worker URL is set, try to define to it first
    if (CAD_WORKER_URL) {
      try {
        console.log(`[FreeCAD Preview] Delegating to worker at ${CAD_WORKER_URL}`);

        // Prepare payload for worker (same format as export but requesting STL)
        // Note: The worker needs "export" field with formats=["STL"]
        const workerPayload = {
          springType: body.springType === "spiralTorsion" ? "spiral_torsion" :
            body.springType === "ARC_SPRING" ? "ARC_SPRING" :
              body.springType,
          geometry: body.geometry,
          export: {
            formats: ["STL"],
            name: `preview_${Date.now()}`,
          },
        };

        const workerRes = await fetch(`${CAD_WORKER_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(workerPayload),
        });

        if (!workerRes.ok) {
          const errorText = await workerRes.text();
          console.error(`[FreeCAD Preview] Worker failed: ${workerRes.status} ${errorText}`);
          return NextResponse.json({
            status: "error",
            message: `Cloud worker failed (${workerRes.status}): ${errorText.slice(0, 100)}`
          }, { status: 500 });
        }

        const workerData = await workerRes.json();

        // The worker returns { status: "success", files: [...] }
        // We need to adapt it to the preview response format: { status: "success", data: base64 }

        const stlFile = workerData.files?.find((f: { format: string }) => f.format === "STL");

        if (!stlFile || !stlFile.downloadUrl) {
          return NextResponse.json({
            status: "error",
            message: "Worker did not return STL file"
          }, { status: 500 });
        }

        // downloadUrl is "data:application/sla;base64,..."
        // We need just the base64 part
        const base64Data = stlFile.downloadUrl.split(",")[1];

        return NextResponse.json({
          status: "success",
          format: "stl",
          data: base64Data,
          mimeType: "application/sla",
        });

      } catch (e) {
        console.error(`[FreeCAD Preview] Worker error: ${e}`);
        // If the worker is configured but unreachable, we should probably fail rather than fallback, 
        // to avoid misleading "Not Installed" message.
        return NextResponse.json({
          status: "error", // Use error status, not unavailable
          message: `Worker connection refused: ${e instanceof Error ? e.message : String(e)}`
        }, { status: 502 });
      }
    }

    // 检查 FreeCAD
    const available = await checkFreeCADAvailable();
    if (!available) {
      return NextResponse.json({
        status: "unavailable",
        message: "FreeCAD is not installed",
      });
    }

    // 创建临时目录
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    const jobId = generateUUID();
    const jobDir = path.join(TEMP_DIR, jobId);
    await mkdir(jobDir, { recursive: true });

    // 写入设计文件 - 请求 STL 格式用于预览
    const designFile = path.join(jobDir, "design.json");
    const exportName = `preview_${jobId}`;

    // 标准化 springType
    const normalizedSpringType = body.springType === "spiralTorsion" ? "spiral_torsion" :
      body.springType === "ARC_SPRING" ? "ARC_SPRING" : // Backend supports ARC_SPRING directly
        body.springType;

    const designData = {
      springType: normalizedSpringType,
      geometry: body.geometry,
      export: {
        formats: ["STL"],  // 使用 STL 格式，Three.js 可以直接加载
        name: exportName,
      },
    };

    console.log(`[FreeCAD Preview] Design data:`, JSON.stringify(designData, null, 2));

    await writeFile(designFile, JSON.stringify(designData, null, 2));

    // 调用 FreeCAD Python
    const command = `${FREECAD_PYTHON} ${SCRIPT_PATH} ${designFile} ${jobDir}`;
    console.log(`[FreeCAD Preview] Running: ${command}`);

    let stdout: string, stderr: string;
    try {
      const result = await execAsync(command, {
        timeout: 120000,  // 增加到 120 秒
        maxBuffer: 50 * 1024 * 1024,  // 50MB
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (execError) {
      console.error(`[FreeCAD Preview] Exec error:`, execError);
      return NextResponse.json({
        status: "error",
        message: `FreeCAD execution failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`,
      }, { status: 500 });
    }

    console.log(`[FreeCAD Preview] stdout:\n${stdout}`);
    if (stderr) {
      console.error(`[FreeCAD Preview] stderr:\n${stderr}`);
    }

    // 检查是否执行了端面磨平
    if (stdout.includes("should_grind=True")) {
      console.log(`[FreeCAD Preview] Ground ends should be applied`);
    }
    if (stdout.includes("Conical spring ground ends:")) {
      console.log(`[FreeCAD Preview] Ground ends were applied successfully`);
    }

    // 解析结果
    const resultMatch = stdout.match(/RESULT_JSON:(.+)/);
    if (!resultMatch) {
      return NextResponse.json({
        status: "error",
        message: `Failed to parse FreeCAD output. stdout: ${stdout.slice(0, 500)}`,
      }, { status: 500 });
    }

    const result = JSON.parse(resultMatch[1]);

    // 读取生成的 STL 文件
    const stlFile = result.files.find((f: { format: string }) => f.format === "STL");
    if (!stlFile) {
      return NextResponse.json({
        status: "error",
        message: "STL file not generated",
      }, { status: 500 });
    }

    const stlBuffer = await readFile(stlFile.path);
    const stlBase64 = stlBuffer.toString("base64");

    // 清理临时文件（延迟）
    setTimeout(async () => {
      try {
        const { rm } = await import("fs/promises");
        await rm(jobDir, { recursive: true, force: true });
      } catch (e) {
        console.error(`[FreeCAD Preview] Cleanup failed: ${e}`);
      }
    }, 30000);

    return NextResponse.json({
      status: "success",
      format: "stl",
      data: stlBase64,
      mimeType: "application/sla",
    });

  } catch (error) {
    console.error("[FreeCAD Preview] Error:", error);

    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
