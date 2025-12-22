/**
 * FreeCAD Export API
 * FreeCAD 导出 API
 * 
 * POST /api/freecad/export
 * 
 * 调用 FreeCAD 生成 STEP/IGES/STL 文件
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
// Generate UUID without external dependency
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const execAsync = promisify(exec);

// FreeCAD 命令路径（根据系统配置）
// Windows 默认安装路径
const FREECAD_PATHS_WINDOWS = [
  "C:\\Program Files\\FreeCAD 0.21\\bin\\FreeCADCmd.exe",
  "C:\\Program Files\\FreeCAD 0.20\\bin\\FreeCADCmd.exe",
  "C:\\Program Files\\FreeCAD\\bin\\FreeCADCmd.exe",
  "C:\\Program Files (x86)\\FreeCAD\\bin\\FreeCADCmd.exe",
];

// macOS 默认安装路径
const FREECAD_PATHS_MACOS = [
  "/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd",
  "/Applications/FreeCAD.app/Contents/Resources/bin/freecad",
  "/Applications/FreeCAD.app/Contents/MacOS/FreeCAD",
];

// Linux 默认路径
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

// 获取 FreeCAD Python 解释器
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

  // Linux - 尝试系统 freecadcmd
  for (const p of FREECAD_PATHS_LINUX) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

const FREECAD_PYTHON = getFreeCADPython();
const SCRIPT_PATH = path.join(process.cwd(), "cad-worker/freecad/run_export.py");
const TEMP_DIR = path.join(process.cwd(), ".tmp/freecad");

interface ExportRequest {
  springType: "compression" | "extension" | "torsion" | "conical";
  geometry: {
    wireDiameter: number;
    meanDiameter?: number;
    outerDiameter?: number;
    activeCoils: number;
    totalCoils?: number;
    freeLength?: number;
    bodyLength?: number;
    // Extension
    hookType?: string;
    hookRadius?: number;
    hookAngle?: number;
    // Torsion
    legLength1?: number;
    legLength2?: number;
    windingDirection?: "left" | "right";
    freeAngle?: number;
    // Conical
    largeOuterDiameter?: number;
    smallOuterDiameter?: number;
  };
  export: {
    formats: ("STEP" | "IGES" | "STL" | "FCStd")[];
    name?: string;
  };
}

interface ExportResponse {
  status: "success" | "error" | "unavailable";
  message?: string;
  files?: {
    format: string;
    fileName: string;
    downloadUrl: string;
    fileSize?: number;
  }[];
  jobId?: string;
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
 * POST /api/freecad/export
 */
export async function POST(request: NextRequest): Promise<NextResponse<ExportResponse>> {
  try {
    const body: ExportRequest = await request.json();

    // Check if CAD_WORKER_URL is set
    const CAD_WORKER_URL = process.env.CAD_WORKER_URL;

    // If Worker URL is set, try to define to it first
    if (CAD_WORKER_URL) {
      try {
        console.log(`[FreeCAD] Delegating to worker at ${CAD_WORKER_URL}`);
        const workerRes = await fetch(`${CAD_WORKER_URL}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!workerRes.ok) {
          throw new Error(`Worker returned ${workerRes.status}`);
        }

        const workerData = await workerRes.json();
        return NextResponse.json(workerData);
      } catch (e) {
        console.error(`[FreeCAD] Worker delegation failed: ${e}, falling back to local.`);
        // Fallback to local execution if worker fails (or proceed to below if desired, but typically we want fallback)
      }
    }

    // 验证请求
    if (!body.springType || !body.geometry) {
      return NextResponse.json({
        status: "error",
        message: "Missing required fields: springType, geometry",
      }, { status: 400 });
    }

    // 检查 FreeCAD 是否可用
    const freecadAvailable = await checkFreeCADAvailable();
    if (!freecadAvailable) {
      // FreeCAD 不可用，返回模拟响应
      return NextResponse.json({
        status: "unavailable",
        message: "FreeCAD is not installed locally and no remote worker configured.",
        files: body.export.formats.map(format => ({
          format,
          fileName: `${body.export.name || body.springType}_spring.${format.toLowerCase()}`,
          downloadUrl: "#",
          fileSize: 0,
        })),
      });
    }

    // 创建临时目录
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true });
    }

    // 生成唯一 ID
    const jobId = generateUUID();
    const jobDir = path.join(TEMP_DIR, jobId);
    await mkdir(jobDir, { recursive: true });

    // 写入设计文件
    const designFile = path.join(jobDir, "design.json");
    await writeFile(designFile, JSON.stringify(body, null, 2));

    // 调用 FreeCAD Python
    const exportName = body.export.name || `${body.springType}_spring`;
    const command = `${FREECAD_PYTHON} ${SCRIPT_PATH} ${designFile} ${jobDir}`;

    console.log(`[FreeCAD] Running: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 秒超时
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    console.log(`[FreeCAD] stdout: ${stdout}`);
    if (stderr) {
      console.error(`[FreeCAD] stderr: ${stderr}`);
    }

    // 解析结果
    const resultMatch = stdout.match(/RESULT_JSON:(.+)/);
    if (!resultMatch) {
      return NextResponse.json({
        status: "error",
        message: "Failed to parse FreeCAD output",
      }, { status: 500 });
    }

    const result = JSON.parse(resultMatch[1]);

    // 构建下载 URL
    const files = await Promise.all(
      result.files.map(async (file: { format: string; path: string }) => {
        const filePath = file.path;
        const fileName = path.basename(filePath);

        // 读取文件并转为 base64 data URL
        const fileBuffer = await readFile(filePath);
        const base64 = fileBuffer.toString("base64");

        // 确定 MIME 类型
        const mimeTypes: Record<string, string> = {
          STEP: "application/step",
          IGES: "application/iges",
          STL: "application/sla",
          FCSTD: "application/octet-stream",
        };
        const mimeType = mimeTypes[file.format] || "application/octet-stream";

        return {
          format: file.format,
          fileName,
          downloadUrl: `data:${mimeType};base64,${base64}`,
          fileSize: fileBuffer.length,
        };
      })
    );

    // 清理临时文件（延迟执行）
    setTimeout(async () => {
      try {
        const { rm } = await import("fs/promises");
        await rm(jobDir, { recursive: true, force: true });
      } catch (e) {
        console.error(`[FreeCAD] Cleanup failed: ${e}`);
      }
    }, 60000); // 1 分钟后清理

    return NextResponse.json({
      status: "success",
      jobId,
      files,
    });

  } catch (error) {
    console.error("[FreeCAD] Export error:", error);

    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

/**
 * GET /api/freecad/export
 * 检查 FreeCAD 状态
 */
export async function GET(): Promise<NextResponse> {
  // Check if remote worker is configured
  if (process.env.CAD_WORKER_URL) {
    return NextResponse.json({
      available: true,
      version: "Remote Worker (Fly.io)",
      capabilities: ["STEP", "IGES", "STL", "FCStd"],
    });
  }

  const available = await checkFreeCADAvailable();

  if (available && FREECAD_PYTHON) {
    try {
      const { stdout } = await execAsync(`${FREECAD_PYTHON} -c "import FreeCAD; print(FreeCAD.Version())"`);
      return NextResponse.json({
        available: true,
        version: stdout.trim(),
        capabilities: ["STEP", "IGES", "STL", "FCStd"],
      });
    } catch {
      return NextResponse.json({
        available: true,
        version: "FreeCAD (version check failed)",
        capabilities: ["STEP", "IGES", "STL", "FCStd"],
      });
    }
  }

  return NextResponse.json({
    available: false,
    message: "FreeCAD is not installed. Please download and install FreeCAD to enable CAD export.",
    installInstructions: {
      windows: {
        url: "https://github.com/FreeCAD/FreeCAD/releases/download/0.21.2/FreeCAD-0.21.2-WIN-x64-installer-1.exe",
        steps: [
          "1. Download FreeCAD installer from the link above",
          "2. Run the installer and follow the prompts",
          "3. Default install path: C:\\Program Files\\FreeCAD 0.21",
          "4. Restart the application after installation",
        ],
      },
      macOS: {
        command: "brew install --cask freecad",
        url: "https://github.com/FreeCAD/FreeCAD/releases/download/0.21.2/FreeCAD-0.21.2-macOS-arm64.dmg",
      },
      linux: {
        command: "sudo apt install freecad",
        url: "https://github.com/FreeCAD/FreeCAD/releases",
      },
    },
  });
}
