/**
 * CAD Export Types
 * CAD 导出类型定义
 * 
 * 设计原则：
 * 1. 与现有 springTypes.ts 保持一致，避免重复定义
 * 2. 支持增量导出（只导出变更部分）
 * 3. 支持批量导出（多个设计一次请求）
 * 4. 包含版本控制和追溯信息
 */

import type { SpringMaterialId } from '@/lib/materials/springMaterials';
import type { 
  CompressionSpringGeometry,
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
} from '@/lib/engine/types';

// ============================================================================
// 导出格式
// ============================================================================

/** CAD 导出格式 */
export type CadExportFormat = 
  | 'STEP'           // STEP AP214 (通用 3D 交换格式)
  | 'IGES'           // IGES (旧版 3D 交换格式)
  | 'DXF'            // AutoCAD DXF (2D)
  | 'DWG'            // AutoCAD DWG (2D)
  | 'PDF_2D'         // 2D 工程图 PDF
  | 'PDF_3D'         // 3D PDF (可交互)
  | 'CREO_PRT'       // Creo 原生零件
  | 'CREO_DRW'       // Creo 原生工程图
  | 'SOLIDWORKS'     // SolidWorks 零件
  | 'STL'            // STL (3D 打印)
  | 'OBJ';           // OBJ (通用网格)

/** 导出格式分组 */
export const CAD_FORMAT_GROUPS = {
  '3D 模型': ['STEP', 'IGES', 'CREO_PRT', 'SOLIDWORKS', 'STL', 'OBJ'] as CadExportFormat[],
  '2D 图纸': ['PDF_2D', 'DXF', 'DWG', 'CREO_DRW'] as CadExportFormat[],
  '3D PDF': ['PDF_3D'] as CadExportFormat[],
} as const;

/** 格式元数据 */
export const CAD_FORMAT_META: Record<CadExportFormat, {
  label: string;
  labelZh: string;
  extension: string;
  description: string;
}> = {
  STEP: { label: 'STEP', labelZh: 'STEP 格式', extension: '.step', description: 'ISO 10303 标准交换格式' },
  IGES: { label: 'IGES', labelZh: 'IGES 格式', extension: '.igs', description: '旧版 3D 交换格式' },
  DXF: { label: 'DXF', labelZh: 'DXF 格式', extension: '.dxf', description: 'AutoCAD 交换格式' },
  DWG: { label: 'DWG', labelZh: 'DWG 格式', extension: '.dwg', description: 'AutoCAD 原生格式' },
  PDF_2D: { label: '2D PDF', labelZh: '2D 工程图', extension: '.pdf', description: '2D 工程图纸' },
  PDF_3D: { label: '3D PDF', labelZh: '3D PDF', extension: '.pdf', description: '可交互 3D PDF' },
  CREO_PRT: { label: 'Creo Part', labelZh: 'Creo 零件', extension: '.prt', description: 'Creo Parametric 零件' },
  CREO_DRW: { label: 'Creo Drawing', labelZh: 'Creo 图纸', extension: '.drw', description: 'Creo 工程图' },
  SOLIDWORKS: { label: 'SolidWorks', labelZh: 'SolidWorks', extension: '.sldprt', description: 'SolidWorks 零件' },
  STL: { label: 'STL', labelZh: 'STL 格式', extension: '.stl', description: '3D 打印格式' },
  OBJ: { label: 'OBJ', labelZh: 'OBJ 格式', extension: '.obj', description: '通用网格格式' },
};

// ============================================================================
// 单位设置
// ============================================================================

/** 单位系统 */
export type UnitSystem = 'SI' | 'Imperial';

/** 单位设置 */
export interface UnitSettings {
  system: UnitSystem;
  length: 'mm' | 'inch';
  force: 'N' | 'lbf' | 'kgf';
  stress: 'MPa' | 'psi' | 'ksi';
  angle: 'deg' | 'rad';
  torque: 'N·mm' | 'N·m' | 'lbf·in';
  temperature: '°C' | '°F';
}

/** 默认单位设置 */
export const DEFAULT_UNITS: UnitSettings = {
  system: 'SI',
  length: 'mm',
  force: 'N',
  stress: 'MPa',
  angle: 'deg',
  torque: 'N·mm',
  temperature: '°C',
};

// ============================================================================
// 材料信息（扩展版，用于 CAD 标注）
// ============================================================================

/** CAD 导出用材料信息 */
export interface CadMaterialInfo {
  /** 材料 ID（关联到材料库） */
  id: SpringMaterialId;
  /** 材料名称（用于标注） */
  name: string;
  /** 材料标准 */
  standard?: string;
  /** 剪切模量 G (MPa) */
  shearModulus: number;
  /** 弹性模量 E (MPa) */
  elasticModulus: number;
  /** 密度 (kg/m³) */
  density: number;
  /** 极限抗拉强度 (MPa) */
  tensileStrength?: number;
  /** 表面处理 */
  surfaceTreatment?: string;
  /** 热处理状态 */
  heatTreatment?: string;
}

// ============================================================================
// 分析结果摘要（用于图纸标注）
// ============================================================================

/** 分析结果摘要 */
export interface AnalysisSummary {
  /** 刚度 */
  springRate: number;
  /** 刚度单位 */
  springRateUnit: 'N/mm' | 'N·mm/deg' | 'lbf/in';
  
  /** 最大位移/角度 */
  maxDeflection?: number;
  /** 工作位移/角度 */
  workingDeflection?: number;
  
  /** 工作力/扭矩 */
  workingLoad?: number;
  /** 最大力/扭矩 */
  maxLoad?: number;
  
  /** 最大应力 (MPa) */
  maxStress?: number;
  /** 静态安全系数 */
  staticSafetyFactor?: number;
  /** 疲劳安全系数 */
  fatigueSafetyFactor?: number;
  
  /** 固有频率 (Hz) */
  naturalFrequency?: number;
  /** 屈曲安全系数（仅压簧） */
  bucklingSafetyFactor?: number;
}

// ============================================================================
// 图纸设置
// ============================================================================

/** 图纸尺寸 */
export type DrawingSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0' | 'Letter' | 'Legal' | 'Tabloid';

/** 图纸方向 */
export type DrawingOrientation = 'portrait' | 'landscape';

/** 视图类型 */
export type ViewType = 'front' | 'top' | 'right' | 'isometric' | 'section';

/** 图纸设置 */
export interface DrawingSettings {
  /** 图纸尺寸 */
  size: DrawingSize;
  /** 图纸方向 */
  orientation: DrawingOrientation;
  /** 比例 */
  scale: string;
  /** 包含的视图 */
  views: ViewType[];
  /** 是否显示尺寸标注 */
  showDimensions: boolean;
  /** 是否显示公差 */
  showTolerances: boolean;
  /** 是否显示材料表 */
  showMaterialTable: boolean;
  /** 是否显示技术要求 */
  showTechnicalRequirements: boolean;
  /** 语言 */
  language: 'zh' | 'en' | 'bilingual';
}

/** 默认图纸设置 */
export const DEFAULT_DRAWING_SETTINGS: DrawingSettings = {
  size: 'A4',
  orientation: 'landscape',
  scale: '1:1',
  views: ['front', 'top', 'isometric'],
  showDimensions: true,
  showTolerances: true,
  showMaterialTable: true,
  showTechnicalRequirements: true,
  language: 'bilingual',
};

// ============================================================================
// 标题栏信息
// ============================================================================

/** 标题栏信息 */
export interface TitleBlockInfo {
  /** 项目名称 */
  projectName?: string;
  /** 零件名称 */
  partName: string;
  /** 零件编号 */
  partNumber: string;
  /** 版本号 */
  revision: string;
  /** 设计者 */
  designer?: string;
  /** 审核者 */
  checker?: string;
  /** 批准者 */
  approver?: string;
  /** 日期 */
  date: string;
  /** 公司名称 */
  companyName?: string;
  /** 备注 */
  notes?: string[];
}

// ============================================================================
// CAD 导出请求
// ============================================================================

/** 弹簧几何参数（复用现有类型） */
export type SpringGeometry = 
  | CompressionSpringGeometry 
  | ExtensionSpringGeometry 
  | TorsionSpringGeometry 
  | ConicalSpringGeometry;

/** CAD 导出设计数据 */
export interface CadExportDesign {
  /** 弹簧类型 */
  springType: 'compression' | 'extension' | 'torsion' | 'conical';
  
  /** 单位设置 */
  units: UnitSettings;
  
  /** 材料信息 */
  material: CadMaterialInfo;
  
  /** 几何参数（复用现有类型） */
  geometry: SpringGeometry;
  
  /** 分析结果摘要 */
  analysis?: AnalysisSummary;
  
  /** 图纸设置 */
  drawingSettings?: DrawingSettings;
  
  /** 标题栏信息 */
  titleBlock?: TitleBlockInfo;
  
  /** 
   * 扩展参数（用于特殊需求）
   * 例如：钩部详细参数、腿部弯曲参数等
   */
  extensions?: {
    /** 拉簧钩部参数（简化版） */
    hookParams?: {
      loopDiameter?: number;
      gapToBody?: number;
      bendRadius?: number;
      hookAngle?: number;
    };
    /** 拉簧钩部详细参数（用于 Creo 建模） */
    hookDetails?: {
      type: string;
      loopCount: 1 | 2;
      loopAngleDeg: number;
      loopRadius: number;
      axialGap: number;
      radialOffset: number;
      hasExtendedLeg: boolean;
      extendedLegLength: number;
      loopPlaneType: 'axis-plane' | 'orthogonal-plane';
      centerMode: 'on-axis' | 'radial-offset';
    };
    /** 扭簧腿部参数 */
    legParams?: {
      leg1BendAngle?: number;
      leg2BendAngle?: number;
      leg1BendRadius?: number;
      leg2BendRadius?: number;
    };
    /** 自定义参数 */
    custom?: Record<string, unknown>;
  };
}

/** CAD 导出请求体 */
export interface CadExportRequest {
  /** 请求 ID（用于追踪） */
  requestId?: string;
  
  /** 设计编号 */
  designCode: string;
  
  /** 设计数据 */
  design: CadExportDesign;
  
  /** 导出格式列表 */
  formats: CadExportFormat[];
  
  /** 导出选项 */
  options?: {
    /** 是否压缩为 ZIP */
    compressToZip?: boolean;
    /** 文件名前缀 */
    fileNamePrefix?: string;
    /** 是否包含预览图 */
    includePreview?: boolean;
    /** 优先级（用于队列） */
    priority?: 'low' | 'normal' | 'high';
  };
}

/** 导出文件信息 */
export interface ExportedFile {
  /** 格式 */
  format: CadExportFormat;
  /** 文件名 */
  fileName: string;
  /** 下载 URL */
  downloadUrl: string;
  /** 文件大小 (bytes) */
  fileSize?: number;
  /** 过期时间 */
  expiresAt?: string;
}

/** CAD 导出响应 */
export interface CadExportResponse {
  /** 请求 ID */
  requestId: string;
  
  /** 状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  /** 导出文件列表 */
  files?: ExportedFile[];
  
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  
  /** 处理时间 (ms) */
  processingTime?: number;
}

// ============================================================================
// 批量导出
// ============================================================================

/** 批量导出请求 */
export interface BatchCadExportRequest {
  /** 批次 ID */
  batchId?: string;
  
  /** 导出项目列表 */
  items: CadExportRequest[];
  
  /** 批量选项 */
  options?: {
    /** 是否合并为单个 ZIP */
    mergeToSingleZip?: boolean;
    /** 并行处理数量 */
    parallelCount?: number;
  };
}

/** 批量导出响应 */
export interface BatchCadExportResponse {
  /** 批次 ID */
  batchId: string;
  
  /** 总数 */
  total: number;
  
  /** 已完成数 */
  completed: number;
  
  /** 失败数 */
  failed: number;
  
  /** 各项结果 */
  results: CadExportResponse[];
  
  /** 合并文件（如果启用） */
  mergedFile?: ExportedFile;
}
