/**
 * Engineering Drawing Types
 * 工程图纸类型定义
 * 
 * 定义标准工程图的视图、尺寸标注、标题栏等规范
 * 支持 ISO / DIN / ASME / GB 标准
 */

// ============================================================================
// 标准与图纸尺寸
// ============================================================================

/** 图纸标准 */
export type DrawingStandard = "ISO" | "DIN" | "ASME" | "GB";

/** 图纸尺寸 */
export type SheetSize = "A4" | "A3" | "A2" | "A1" | "A0";

/** 图纸尺寸规格 (mm) */
export const SHEET_SIZES: Record<SheetSize, { width: number; height: number }> = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
  A2: { width: 594, height: 420 },
  A1: { width: 841, height: 594 },
  A0: { width: 1189, height: 841 },
};

/** 图纸方向 */
export type SheetOrientation = "landscape" | "portrait";

// ============================================================================
// 视图定义
// ============================================================================

/** 视图投影类型 */
export type ProjectionType = 
  | "front"      // 主视图
  | "right"      // 右视图
  | "left"       // 左视图
  | "top"        // 俯视图
  | "bottom"     // 仰视图
  | "back"       // 后视图
  | "isometric"  // 等轴测
  | "section";   // 剖视图

/** 剖面定义 */
export interface SectionPlane {
  /** 剖面名称，如 "A-A" */
  name: string;
  /** 剖面法向量 */
  normal: [number, number, number];
  /** 剖面上的一点 */
  point: [number, number, number];
  /** 剖面线样式 */
  lineStyle?: "solid" | "dashed";
}

/** 视图规格 */
export interface ViewSpec {
  /** 视图 ID */
  id: string;
  /** 视图名称 */
  name: string;
  /** 视图名称（中文） */
  nameZh?: string;
  /** 投影类型 */
  projection: ProjectionType;
  /** 剖面定义（仅剖视图） */
  sectionPlane?: SectionPlane;
  /** 比例 */
  scale: number;
  /** 视图中心位置 (mm from origin) */
  position: { x: number; y: number };
  /** 是否显示中心线 */
  showCenterLines?: boolean;
  /** 是否显示隐藏线 */
  showHiddenLines?: boolean;
  /** 旋转角度 (degrees) */
  rotation?: number;
}

// ============================================================================
// 尺寸标注
// ============================================================================

/** 尺寸标注类型 */
export type DimensionType = 
  | "linear"     // 线性尺寸
  | "diameter"   // 直径
  | "radius"     // 半径
  | "angular"    // 角度
  | "ordinate"   // 坐标尺寸
  | "leader";    // 引线标注

/** 尺寸标注方向 */
export type DimensionOrientation = 
  | "horizontal" 
  | "vertical" 
  | "aligned" 
  | "radial" 
  | "angular";

/** 公差类型 */
export type ToleranceType = 
  | "symmetric"   // ±0.1
  | "deviation"   // +0.2/-0.1
  | "limits"      // 24.2/23.9
  | "fit";        // H7/g6

/** 公差规格 */
export interface ToleranceSpec {
  type: ToleranceType;
  /** 对称公差值 */
  symmetric?: number;
  /** 上偏差 */
  upper?: number;
  /** 下偏差 */
  lower?: number;
  /** 配合代号 */
  fitCode?: string;
}

/** 尺寸标注规格 */
export interface DimensionSpec {
  /** 尺寸 ID */
  id: string;
  /** 尺寸类型 */
  type: DimensionType;
  /** 标注文字/符号，如 "Dm", "L0", "Na" */
  label: string;
  /** 数值 */
  value: number;
  /** 单位 */
  unit?: string;
  /** 公差 */
  tolerance?: ToleranceSpec;
  /** 起点 ID（几何元素或坐标） */
  fromPoint: string | { x: number; y: number };
  /** 终点 ID */
  toPoint: string | { x: number; y: number };
  /** 标注方向 */
  orientation: DimensionOrientation;
  /** 所属视图 ID */
  viewId: string;
  /** 标注线偏移距离 */
  offset?: number;
  /** 前缀，如 "⌀" */
  prefix?: string;
  /** 后缀，如 "mm" */
  suffix?: string;
  /** 是否为参考尺寸（加括号） */
  isReference?: boolean;
}

// ============================================================================
// 几何元素
// ============================================================================

/** 2D 点 */
export interface Point2D {
  x: number;
  y: number;
}

/** 2D 线段 */
export interface Line2D {
  id: string;
  start: Point2D;
  end: Point2D;
  style: "solid" | "dashed" | "centerline" | "hidden";
  weight?: number;
}

/** 2D 圆弧 */
export interface Arc2D {
  id: string;
  center: Point2D;
  radius: number;
  startAngle: number;  // degrees
  endAngle: number;
  style: "solid" | "dashed" | "centerline" | "hidden";
  weight?: number;
}

/** 2D 圆 */
export interface Circle2D {
  id: string;
  center: Point2D;
  radius: number;
  style: "solid" | "dashed" | "centerline" | "hidden";
  weight?: number;
}

/** 2D 样条曲线 */
export interface Spline2D {
  id: string;
  points: Point2D[];
  style: "solid" | "dashed" | "centerline" | "hidden";
  weight?: number;
}

/** 几何元素联合类型 */
export type GeometryElement = Line2D | Arc2D | Circle2D | Spline2D;

/** 视图几何内容 */
export interface ViewGeometry {
  viewId: string;
  elements: GeometryElement[];
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

// ============================================================================
// 标题栏
// ============================================================================

/** 标题栏规格 */
export interface TitleBlockSpec {
  /** 零件名称 */
  partName: string;
  /** 零件名称（中文） */
  partNameZh?: string;
  /** 零件编号 */
  partNumber: string;
  /** 材料 */
  material: string;
  /** 材料（中文） */
  materialZh?: string;
  /** 表面处理 */
  surfaceFinish?: string;
  /** 重量 (g) */
  weight?: number;
  /** 比例 */
  scale: string;
  /** 图纸编号 */
  drawingNumber?: string;
  /** 版本 */
  revision?: string;
  /** 绘制者 */
  drawnBy: string;
  /** 绘制日期 */
  drawnDate: string;
  /** 审核者 */
  checkedBy?: string;
  /** 审核日期 */
  checkedDate?: string;
  /** 批准者 */
  approvedBy?: string;
  /** 批准日期 */
  approvedDate?: string;
  /** 公司名称 */
  companyName?: string;
  /** 公司 Logo URL */
  companyLogo?: string;
}

// ============================================================================
// 技术要求
// ============================================================================

/** 技术要求项 */
export interface TechnicalNote {
  /** 序号 */
  index: number;
  /** 内容（英文） */
  textEn: string;
  /** 内容（中文） */
  textZh?: string;
  /** 内容（德文） */
  textDe?: string;
}

// ============================================================================
// 完整图纸规格
// ============================================================================

/** 弹簧工程图规格 */
export interface SpringDrawingSpec {
  /** 图纸标准 */
  standard: DrawingStandard;
  /** 图纸尺寸 */
  sheetSize: SheetSize;
  /** 图纸方向 */
  orientation: SheetOrientation;
  /** 标题栏 */
  titleBlock: TitleBlockSpec;
  /** 视图列表 */
  views: ViewSpec[];
  /** 视图几何 */
  viewGeometries?: ViewGeometry[];
  /** 尺寸标注 */
  dimensions: DimensionSpec[];
  /** 技术要求 */
  technicalNotes: TechnicalNote[];
  /** 图纸语言 */
  language: "en" | "zh" | "de" | "bilingual";
}

// ============================================================================
// 弹簧特定标注规则
// ============================================================================

/** 压缩弹簧标注规则 */
export interface CompressionSpringDimensionRules {
  /** 线径 d */
  wireDiameter: { tolerance?: ToleranceSpec };
  /** 中径 Dm */
  meanDiameter: { tolerance?: ToleranceSpec };
  /** 外径 OD */
  outerDiameter?: { tolerance?: ToleranceSpec };
  /** 内径 ID */
  innerDiameter?: { tolerance?: ToleranceSpec };
  /** 自由长度 L0 */
  freeLength: { tolerance?: ToleranceSpec };
  /** 有效圈数 Na */
  activeCoils: { isReference?: boolean };
  /** 总圈数 Nt */
  totalCoils: { isReference?: boolean };
  /** 节距 p */
  pitch?: { tolerance?: ToleranceSpec };
  /** 并紧高度 Hs */
  solidHeight?: { isReference?: boolean };
  /** 端面磨平 */
  groundEnds?: boolean;
}

/** 拉伸弹簧标注规则 */
export interface ExtensionSpringDimensionRules {
  /** 线径 d */
  wireDiameter: { tolerance?: ToleranceSpec };
  /** 外径 OD */
  outerDiameter: { tolerance?: ToleranceSpec };
  /** 本体长度 Lb */
  bodyLength: { tolerance?: ToleranceSpec };
  /** 自由长度（钩内距） */
  freeLength: { tolerance?: ToleranceSpec };
  /** 有效圈数 Na */
  activeCoils: { isReference?: boolean };
  /** 初拉力 Fi */
  initialTension?: { tolerance?: ToleranceSpec };
  /** 钩部类型 */
  hookType: string;
  /** 钩部尺寸 */
  hookDimensions?: {
    loopRadius?: { tolerance?: ToleranceSpec };
    legLength?: { tolerance?: ToleranceSpec };
  };
}

/** 扭转弹簧标注规则 */
export interface TorsionSpringDimensionRules {
  /** 线径 d */
  wireDiameter: { tolerance?: ToleranceSpec };
  /** 外径 OD */
  outerDiameter: { tolerance?: ToleranceSpec };
  /** 本体长度 Lb */
  bodyLength: { tolerance?: ToleranceSpec };
  /** 有效圈数 Na */
  activeCoils: { isReference?: boolean };
  /** 腿长 1 */
  legLength1: { tolerance?: ToleranceSpec };
  /** 腿长 2 */
  legLength2: { tolerance?: ToleranceSpec };
  /** 自由角度 */
  freeAngle: { tolerance?: ToleranceSpec };
  /** 旋向 */
  windingDirection: "left" | "right";
}

/** 锥形弹簧标注规则 */
export interface ConicalSpringDimensionRules {
  /** 线径 d */
  wireDiameter: { tolerance?: ToleranceSpec };
  /** 大端外径 */
  largeOuterDiameter: { tolerance?: ToleranceSpec };
  /** 小端外径 */
  smallOuterDiameter: { tolerance?: ToleranceSpec };
  /** 自由长度 L0 */
  freeLength: { tolerance?: ToleranceSpec };
  /** 有效圈数 Na */
  activeCoils: { isReference?: boolean };
}

// ============================================================================
// FreeCAD 接口类型
// ============================================================================

/** FreeCAD 导出请求 */
export interface FreeCADExportRequest {
  /** 设计参数 */
  design: {
    springType: "compression" | "extension" | "torsion" | "conical";
    wireDiameter: number;
    meanDiameter?: number;
    outerDiameter?: number;
    activeCoils: number;
    totalCoils?: number;
    freeLength?: number;
    pitch?: number;
    // Extension specific
    hookType?: string;
    hookParams?: Record<string, number>;
    // Torsion specific
    legLength1?: number;
    legLength2?: number;
    windingDirection?: "left" | "right";
    // Conical specific
    largeOuterDiameter?: number;
    smallOuterDiameter?: number;
  };
  /** 输出格式 */
  outputFormats: ("STEP" | "IGES" | "STL" | "OBJ" | "FCStd")[];
  /** 是否生成工程图 */
  generateDrawing?: boolean;
  /** 工程图规格 */
  drawingSpec?: Partial<SpringDrawingSpec>;
}

/** FreeCAD 导出响应 */
export interface FreeCADExportResponse {
  /** 状态 */
  status: "success" | "processing" | "failed";
  /** 任务 ID */
  jobId?: string;
  /** 生成的文件 */
  files?: {
    format: string;
    fileName: string;
    downloadUrl: string;
    fileSize?: number;
  }[];
  /** 预览图 URL */
  previewUrl?: string;
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
  };
}
