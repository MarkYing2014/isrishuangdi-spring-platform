import { NextRequest, NextResponse } from "next/server";

/**
 * Spring CAD Export API
 * 弹簧 CAD 导出接口
 * 
 * Currently returns a placeholder STEP-like text file.
 * Future: integrate with actual CAD generation service (Creo, SolidWorks, etc.)
 */

export interface CadExportRequest {
  springType: "compression" | "extension" | "torsion" | "conical";
  
  // Common parameters
  wireDiameter: number;       // d, mm
  activeCoils: number;        // Na
  freeLength?: number;        // L0, mm
  
  // Compression/Extension specific
  meanDiameter?: number;      // Dm, mm
  outerDiameter?: number;     // OD, mm
  pitch?: number;             // mm
  
  // Conical specific
  largeOuterDiameter?: number;  // D1, mm
  smallOuterDiameter?: number;  // D2, mm
  
  // Extension specific
  hookType?: "german" | "english" | "machine" | "side";
  hookLength?: number;        // mm
  
  // Torsion specific
  legLengthA?: number;        // mm
  legLengthB?: number;        // mm
  legAngle?: number;          // degrees
  
  // Material
  materialId?: string;
  materialName?: string;
  
  // Additional metadata
  partNumber?: string;
  description?: string;
  units?: "mm" | "inch";
}

function generateStepPlaceholder(data: CadExportRequest): string {
  const timestamp = new Date().toISOString();
  const partNumber = data.partNumber || `SPR-${Date.now()}`;
  
  // Generate a placeholder STEP-like format
  // In production, this would call a CAD service or use a STEP library
  
  let content = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Spring CAD Export - Placeholder'), '2;1');
FILE_NAME('${partNumber}.step', '${timestamp}', ('ISRI-SHUANGDI Spring Platform'), (''), '', '', '');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;

DATA;
/* ============================================ */
/* Spring Design Parameters                     */
/* 弹簧设计参数                                  */
/* ============================================ */

/* Spring Type / 弹簧类型: ${data.springType} */
/* Wire Diameter / 线径: ${data.wireDiameter} mm */
/* Active Coils / 有效圈数: ${data.activeCoils} */
`;

  if (data.freeLength) {
    content += `/* Free Length / 自由长度: ${data.freeLength} mm */\n`;
  }

  if (data.springType === "compression" || data.springType === "extension") {
    if (data.meanDiameter) {
      content += `/* Mean Diameter / 中径: ${data.meanDiameter} mm */\n`;
    }
    if (data.outerDiameter) {
      content += `/* Outer Diameter / 外径: ${data.outerDiameter} mm */\n`;
    }
    if (data.pitch) {
      content += `/* Pitch / 节距: ${data.pitch} mm */\n`;
    }
  }

  if (data.springType === "conical") {
    content += `/* Large Outer Diameter / 大端外径: ${data.largeOuterDiameter} mm */\n`;
    content += `/* Small Outer Diameter / 小端外径: ${data.smallOuterDiameter} mm */\n`;
  }

  if (data.springType === "extension") {
    if (data.hookType) {
      content += `/* Hook Type / 钩型: ${data.hookType} */\n`;
    }
    if (data.hookLength) {
      content += `/* Hook Length / 钩长: ${data.hookLength} mm */\n`;
    }
  }

  if (data.springType === "torsion") {
    if (data.legLengthA) {
      content += `/* Leg A Length / 脚A长度: ${data.legLengthA} mm */\n`;
    }
    if (data.legLengthB) {
      content += `/* Leg B Length / 脚B长度: ${data.legLengthB} mm */\n`;
    }
    if (data.legAngle) {
      content += `/* Leg Angle / 脚角度: ${data.legAngle}° */\n`;
    }
  }

  if (data.materialId || data.materialName) {
    content += `\n/* Material / 材料: ${data.materialName || data.materialId} */\n`;
  }

  if (data.description) {
    content += `/* Description / 描述: ${data.description} */\n`;
  }

  content += `
/* ============================================ */
/* Geometry Definition (Placeholder)            */
/* 几何定义（占位符）                            */
/* ============================================ */

#1 = PRODUCT('${partNumber}', '${data.springType} Spring', '', (#2));
#2 = PRODUCT_CONTEXT('', #3, 'mechanical');
#3 = APPLICATION_CONTEXT('automotive design');

/* NOTE: This is a placeholder file.
   实际的 STEP 几何数据需要通过 CAD 服务生成。
   
   To generate actual 3D geometry:
   1. Connect to Creo/SolidWorks API
   2. Use parametric spring model template
   3. Export as STEP AP214/AP242
   
   Contact: engineering@isri-shuangdi.com
*/

ENDSEC;
END-ISO-10303-21;
`;

  return content;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CadExportRequest;

    // Validate required fields
    if (!body.springType) {
      return NextResponse.json(
        { error: "springType is required" },
        { status: 400 }
      );
    }

    if (!body.wireDiameter || body.wireDiameter <= 0) {
      return NextResponse.json(
        { error: "Valid wireDiameter is required" },
        { status: 400 }
      );
    }

    if (!body.activeCoils || body.activeCoils <= 0) {
      return NextResponse.json(
        { error: "Valid activeCoils is required" },
        { status: 400 }
      );
    }

    // Generate placeholder STEP content
    const stepContent = generateStepPlaceholder(body);
    
    // Create filename
    const partNumber = body.partNumber || `spring-${body.springType}`;
    const filename = `${partNumber}-${Date.now()}.step`;

    // Return as downloadable file
    return new Response(stepContent, {
      status: 200,
      headers: {
        "Content-Type": "application/step",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Spring-Type": body.springType,
        "X-Export-Status": "placeholder",
      },
    });
  } catch (error) {
    console.error("CAD export error:", error);
    return NextResponse.json(
      { error: "Failed to generate CAD export" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Spring CAD Export API",
    version: "1.0.0",
    status: "placeholder",
    supportedTypes: ["compression", "extension", "torsion", "conical"],
    formats: ["step"],
    note: "Currently returns placeholder STEP files. Future: integrate with CAD service.",
  });
}
