/**
 * CAD Export Service
 * CAD 导出服务
 * 
 * 负责：
 * 1. 从计算结果构建 CAD 导出请求
 * 2. 调用后端 API
 * 3. 处理导出状态和下载
 */

import type {
  CadExportRequest,
  CadExportResponse,
  CadExportDesign,
  CadExportFormat,
  CadMaterialInfo,
  AnalysisSummary,
  UnitSettings,
  DrawingSettings,
  TitleBlockInfo,
  SpringGeometry,
} from './types';
import {
  DEFAULT_UNITS,
  DEFAULT_DRAWING_SETTINGS,
} from './types';
import type { 
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
} from '@/lib/engine/types';
import { getSpringMaterial, type SpringMaterialId } from '@/lib/materials/springMaterials';
import { calculateCadHookParams } from './hookParams';

// ============================================================================
// 构建 CAD 导出设计数据
// ============================================================================

/**
 * 从几何参数构建材料信息
 */
export function buildMaterialInfo(materialId: SpringMaterialId): CadMaterialInfo {
  const material = getSpringMaterial(materialId);
  
  if (!material) {
    throw new Error(`Unknown material: ${materialId}`);
  }
  
  return {
    id: materialId,
    name: material.nameEn,
    standard: material.standard,
    shearModulus: material.shearModulus,
    elasticModulus: material.elasticModulus ?? 206000,
    density: material.density ?? 7850,
    tensileStrength: material.tensileStrength,
    surfaceTreatment: undefined,
    heatTreatment: undefined,
  };
}

/**
 * 构建分析结果摘要
 * 注意：这里只是占位，实际值应该从分析结果传入
 */
export function buildAnalysisSummary(
  geometry: SpringGeometry,
  analysisResult?: Partial<AnalysisSummary>
): AnalysisSummary {
  const isTorsion = geometry.type === 'torsion';
  
  return {
    springRate: analysisResult?.springRate ?? 0,
    springRateUnit: isTorsion ? 'N·mm/deg' : 'N/mm',
    maxDeflection: analysisResult?.maxDeflection,
    workingDeflection: analysisResult?.workingDeflection,
    workingLoad: analysisResult?.workingLoad,
    maxLoad: analysisResult?.maxLoad,
    maxStress: analysisResult?.maxStress,
    staticSafetyFactor: analysisResult?.staticSafetyFactor,
    fatigueSafetyFactor: analysisResult?.fatigueSafetyFactor,
    naturalFrequency: analysisResult?.naturalFrequency,
    bucklingSafetyFactor: geometry.type === 'compression' ? analysisResult?.bucklingSafetyFactor : undefined,
  };
}

/**
 * 生成设计编号
 */
export function generateDesignCode(geometry: SpringGeometry): string {
  const typePrefix = {
    compression: 'CS',
    extension: 'ES',
    torsion: 'TS',
    conical: 'CN',
  }[geometry.type];
  
  const d = geometry.wireDiameter.toFixed(1);
  const Dm = 'meanDiameter' in geometry ? geometry.meanDiameter.toFixed(0) : '0';
  const Na = geometry.activeCoils.toFixed(0);
  
  const timestamp = Date.now().toString(36).toUpperCase();
  
  return `${typePrefix}-${d}x${Dm}-N${Na}-${timestamp}`;
}

/**
 * 构建标题栏信息
 */
export function buildTitleBlock(
  geometry: SpringGeometry,
  options?: {
    projectName?: string;
    designer?: string;
    companyName?: string;
  }
): TitleBlockInfo {
  const designCode = generateDesignCode(geometry);
  
  const partName = {
    compression: '压缩弹簧 / Compression Spring',
    extension: '拉伸弹簧 / Extension Spring',
    torsion: '扭转弹簧 / Torsion Spring',
    conical: '锥形弹簧 / Conical Spring',
  }[geometry.type];
  
  return {
    projectName: options?.projectName ?? 'ISRI-SHUANGDI Spring Platform',
    partName,
    partNumber: designCode,
    revision: 'A',
    designer: options?.designer,
    date: new Date().toISOString().split('T')[0],
    companyName: options?.companyName,
    notes: [],
  };
}

/**
 * 构建完整的 CAD 导出设计数据
 */
export function buildCadExportDesign(
  geometry: SpringGeometry,
  options?: {
    units?: Partial<UnitSettings>;
    drawingSettings?: Partial<DrawingSettings>;
    titleBlock?: Partial<TitleBlockInfo>;
    analysisResult?: Partial<AnalysisSummary>;
  }
): CadExportDesign {
  const material = buildMaterialInfo(geometry.materialId);
  const analysis = buildAnalysisSummary(geometry, options?.analysisResult);
  const titleBlock = buildTitleBlock(geometry, options?.titleBlock);
  
  // 构建扩展参数
  let extensions: CadExportDesign['extensions'];
  
  if (geometry.type === 'extension') {
    const extGeom = geometry as ExtensionSpringGeometry;
    // 使用 HookBuilder 计算精确的钩部参数
    const hookType = extGeom.hookType ?? 'machine';
    const cadHookParams = calculateCadHookParams(
      hookType,
      extGeom.wireDiameter,
      extGeom.meanDiameter
    );
    
    extensions = {
      hookParams: {
        loopDiameter: cadHookParams.loopRadius * 2,
        gapToBody: cadHookParams.axialGap,
        bendRadius: cadHookParams.loopRadius,
        hookAngle: cadHookParams.loopAngleDeg,
      },
      // 添加完整的钩部参数用于 Creo
      hookDetails: {
        type: hookType,
        loopCount: cadHookParams.loopCount,
        loopAngleDeg: cadHookParams.loopAngleDeg,
        loopRadius: cadHookParams.loopRadius,
        axialGap: cadHookParams.axialGap,
        radialOffset: cadHookParams.radialOffset,
        hasExtendedLeg: cadHookParams.hasExtendedLeg,
        extendedLegLength: cadHookParams.extendedLegLength,
        loopPlaneType: cadHookParams.loopPlaneType,
        centerMode: cadHookParams.centerMode,
      },
    };
  } else if (geometry.type === 'torsion') {
    const torsionGeom = geometry as TorsionSpringGeometry;
    extensions = {
      legParams: {
        leg1BendAngle: torsionGeom.legAngle ?? 0,
        leg2BendAngle: torsionGeom.legAngle ?? 0,
      },
    };
  }
  
  return {
    springType: geometry.type,
    units: { ...DEFAULT_UNITS, ...options?.units },
    material,
    geometry,
    analysis,
    drawingSettings: { ...DEFAULT_DRAWING_SETTINGS, ...options?.drawingSettings },
    titleBlock: { ...titleBlock, ...options?.titleBlock },
    extensions,
  };
}

// ============================================================================
// CAD 导出 API 调用
// ============================================================================

const CAD_EXPORT_API_URL = '/api/cad/export';

/**
 * 发送 CAD 导出请求
 */
export async function requestCadExport(
  geometry: SpringGeometry,
  formats: CadExportFormat[],
  options?: {
    units?: Partial<UnitSettings>;
    drawingSettings?: Partial<DrawingSettings>;
    titleBlock?: Partial<TitleBlockInfo>;
    analysisResult?: Partial<AnalysisSummary>;
    compressToZip?: boolean;
    priority?: 'low' | 'normal' | 'high';
  }
): Promise<CadExportResponse> {
  const design = buildCadExportDesign(geometry, options);
  const designCode = generateDesignCode(geometry);
  
  const request: CadExportRequest = {
    requestId: `REQ-${Date.now().toString(36)}`,
    designCode,
    design,
    formats,
    options: {
      compressToZip: options?.compressToZip ?? formats.length > 1,
      fileNamePrefix: designCode,
      includePreview: true,
      priority: options?.priority ?? 'normal',
    },
  };
  
  const response = await fetch(CAD_EXPORT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`CAD export failed: ${response.status} ${response.statusText} - ${errorText}`);
  }
  
  return response.json();
}

/**
 * 轮询导出状态（用于异步导出）
 */
export async function pollExportStatus(
  requestId: string,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: (status: CadExportResponse) => void;
  }
): Promise<CadExportResponse> {
  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 2000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${CAD_EXPORT_API_URL}/status/${requestId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get export status: ${response.status}`);
    }
    
    const status: CadExportResponse = await response.json();
    
    options?.onProgress?.(status);
    
    if (status.status === 'completed' || status.status === 'failed') {
      return status;
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Export timeout: max attempts reached');
}

/**
 * 下载导出文件
 */
export async function downloadExportedFile(
  url: string,
  fileName: string
): Promise<void> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(downloadUrl);
}

// ============================================================================
// 便捷导出函数
// ============================================================================

/**
 * 快速导出 STEP 文件
 */
export async function exportToStep(geometry: SpringGeometry): Promise<string> {
  const result = await requestCadExport(geometry, ['STEP']);
  
  if (result.status === 'failed') {
    throw new Error(result.error?.message ?? 'Export failed');
  }
  
  const stepFile = result.files?.find(f => f.format === 'STEP');
  if (!stepFile) {
    throw new Error('STEP file not found in response');
  }
  
  return stepFile.downloadUrl;
}

/**
 * 快速导出 2D PDF 图纸
 */
export async function exportToPdf2D(
  geometry: SpringGeometry,
  drawingSettings?: Partial<DrawingSettings>
): Promise<string> {
  const result = await requestCadExport(geometry, ['PDF_2D'], { drawingSettings });
  
  if (result.status === 'failed') {
    throw new Error(result.error?.message ?? 'Export failed');
  }
  
  const pdfFile = result.files?.find(f => f.format === 'PDF_2D');
  if (!pdfFile) {
    throw new Error('PDF file not found in response');
  }
  
  return pdfFile.downloadUrl;
}

/**
 * 导出完整设计包（STEP + PDF）
 */
export async function exportDesignPackage(
  geometry: SpringGeometry,
  options?: {
    drawingSettings?: Partial<DrawingSettings>;
    titleBlock?: Partial<TitleBlockInfo>;
  }
): Promise<{
  stepUrl: string;
  pdfUrl: string;
  zipUrl?: string;
}> {
  const result = await requestCadExport(
    geometry, 
    ['STEP', 'PDF_2D'], 
    { ...options, compressToZip: true }
  );
  
  if (result.status === 'failed') {
    throw new Error(result.error?.message ?? 'Export failed');
  }
  
  const stepFile = result.files?.find(f => f.format === 'STEP');
  const pdfFile = result.files?.find(f => f.format === 'PDF_2D');
  
  if (!stepFile || !pdfFile) {
    throw new Error('Required files not found in response');
  }
  
  return {
    stepUrl: stepFile.downloadUrl,
    pdfUrl: pdfFile.downloadUrl,
    zipUrl: result.files?.find(f => f.fileName.endsWith('.zip'))?.downloadUrl,
  };
}
