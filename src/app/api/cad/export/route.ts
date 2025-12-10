import { NextRequest, NextResponse } from "next/server";
import type { 
  CadExportRequest, 
  CadExportResponse, 
  CadExportFormat,
  ExportedFile,
  CadExportDesign,
  SpringGeometry,
} from "@/lib/cad/types";

function extractGeometryInfo(geometry: SpringGeometry) {
  const wireDiameter = geometry.wireDiameter;
  const activeCoils = geometry.activeCoils;
  let meanDiameter = 0;
  let freeLength: number | undefined;
  
  if (geometry.type === 'compression') {
    meanDiameter = geometry.meanDiameter;
    freeLength = geometry.freeLength;
  } else if (geometry.type === 'extension') {
    meanDiameter = geometry.meanDiameter;
  } else if (geometry.type === 'torsion') {
    meanDiameter = geometry.meanDiameter;
  } else if (geometry.type === 'conical') {
    const largeDm = geometry.largeOuterDiameter - wireDiameter;
    const smallDm = geometry.smallOuterDiameter - wireDiameter;
    meanDiameter = (largeDm + smallDm) / 2;
    freeLength = geometry.freeLength;
  }
  return { wireDiameter, meanDiameter, activeCoils, freeLength };
}

function generateStepContent(design: CadExportDesign): string {
  const { geometry, material, titleBlock } = design;
  const info = extractGeometryInfo(geometry);
  const timestamp = new Date().toISOString();
  const partNumber = titleBlock?.partNumber ?? 'SPR-' + Date.now();
  
  return 'ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION((\'Spring CAD Export\'), \'2;1\');\nFILE_NAME(\'' + partNumber + '.step\', \'' + timestamp + '\', (\'System\'), (\'ISRI-SHUANGDI\'), \'\', \'\', \'\');\nFILE_SCHEMA((\'AUTOMOTIVE_DESIGN\'));\nENDSEC;\nDATA;\n/* Spring Type: ' + geometry.type + ' */\n/* Wire Diameter: ' + info.wireDiameter + ' mm */\n/* Mean Diameter: ' + info.meanDiameter + ' mm */\n/* Active Coils: ' + info.activeCoils + ' */\n/* Material: ' + material.name + ' */\n#1 = PRODUCT(\'' + partNumber + '\', \'' + geometry.type + ' Spring\', \'\', (#2));\n#2 = PRODUCT_CONTEXT(\'\', #3, \'mechanical\');\n#3 = APPLICATION_CONTEXT(\'automotive design\');\nENDSEC;\nEND-ISO-10303-21;\n';
}

function generateSvgContent(design: CadExportDesign): string {
  const { geometry, material, titleBlock } = design;
  const info = extractGeometryInfo(geometry);
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="842" height="595">\n<rect x="10" y="10" width="822" height="575" fill="none" stroke="black" stroke-width="2"/>\n<text x="30" y="40" font-family="Arial" font-size="16" font-weight="bold">ISRI-SHUANGDI</text>\n<text x="30" y="80" font-family="Arial" font-size="14">' + geometry.type + ' Spring</text>\n<text x="30" y="120" font-family="Arial" font-size="11">Wire Diameter: ' + info.wireDiameter + ' mm</text>\n<text x="30" y="140" font-family="Arial" font-size="11">Mean Diameter: ' + info.meanDiameter + ' mm</text>\n<text x="30" y="160" font-family="Arial" font-size="11">Active Coils: ' + info.activeCoils + '</text>\n<text x="30" y="180" font-family="Arial" font-size="11">Material: ' + material.name + '</text>\n<text x="30" y="570" font-family="Arial" font-size="10">Part: ' + (titleBlock?.partNumber ?? 'N/A') + '</text>\n</svg>';
}

function generateDxfContent(design: CadExportDesign): string {
  const info = extractGeometryInfo(design.geometry);
  return '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nCIRCLE\n8\n0\n10\n0.0\n20\n0.0\n40\n' + (info.meanDiameter / 2) + '\n0\nENDSEC\n0\nEOF\n';
}

function generateStlContent(design: CadExportDesign): string {
  const partNumber = design.titleBlock?.partNumber ?? 'spring';
  return 'solid ' + partNumber + '\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0.5 1 0\nendloop\nendfacet\nendsolid ' + partNumber + '\n';
}

function generateFileContent(format: CadExportFormat, design: CadExportDesign) {
  switch (format) {
    case 'STEP':
      return { content: generateStepContent(design), mimeType: 'application/step', extension: '.step' };
    case 'PDF_2D':
      return { content: generateSvgContent(design), mimeType: 'image/svg+xml', extension: '.svg' };
    case 'DXF':
      return { content: generateDxfContent(design), mimeType: 'application/dxf', extension: '.dxf' };
    case 'STL':
      return { content: generateStlContent(design), mimeType: 'application/sla', extension: '.stl' };
    default:
      return { content: generateStepContent(design), mimeType: 'application/step', extension: '.step' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CadExportRequest;

    if (!body.design) {
      return NextResponse.json({ error: "design is required" }, { status: 400 });
    }

    if (!body.formats || body.formats.length === 0) {
      return NextResponse.json({ error: "At least one export format is required" }, { status: 400 });
    }

    const { design, formats, designCode, requestId } = body;
    const actualRequestId = requestId ?? 'REQ-' + Date.now().toString(36);

    const files: ExportedFile[] = [];
    
    for (const format of formats) {
      const { content, mimeType, extension } = generateFileContent(format, design);
      const fileName = (designCode ?? 'spring') + extension;
      
      const base64Content = Buffer.from(content).toString('base64');
      const dataUrl = 'data:' + mimeType + ';base64,' + base64Content;
      
      files.push({
        format,
        fileName,
        downloadUrl: dataUrl,
        fileSize: content.length,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const response: CadExportResponse = {
      requestId: actualRequestId,
      status: 'completed',
      files,
      processingTime: 100,
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error("CAD export error:", error);
    
    const response: CadExportResponse = {
      requestId: 'ERR-' + Date.now().toString(36),
      status: 'failed',
      error: {
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Spring CAD Export API",
    version: "2.0.0",
    status: "operational",
    supportedTypes: ["compression", "extension", "torsion", "conical"],
    supportedFormats: ["STEP", "PDF_2D", "DXF", "STL"],
  });
}
