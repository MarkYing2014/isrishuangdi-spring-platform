/**
 * Spring Drawing Generator
 * 弹簧工程图生成器
 * 
 * 从参数化弹簧设计生成 2D 工程图规格
 * 包括视图布局、尺寸标注、技术要求
 */

import type {
  SpringDrawingSpec,
  ViewSpec,
  ViewGeometry,
  DimensionSpec,
  TechnicalNote,
  TitleBlockSpec,
  Point2D,
  Line2D,
  Arc2D,
  Circle2D,
  Spline2D,
  GeometryElement,
  ToleranceSpec,
  DrawingStandard,
  SheetSize,
} from "./types";
import type { 
  SpringGeometry,
  CompressionGeometry,
  ExtensionGeometry,
  TorsionGeometry,
  ConicalGeometry,
  MaterialInfo,
  AnalysisResult,
} from "@/lib/stores/springDesignStore";

// ============================================================================
// 默认公差规则
// ============================================================================

const DEFAULT_TOLERANCES = {
  wireDiameter: { type: "symmetric" as const, symmetric: 0.02 },
  meanDiameter: { type: "symmetric" as const, symmetric: 0.3 },
  freeLength: { type: "deviation" as const, upper: 1.0, lower: -1.0 },
  bodyLength: { type: "deviation" as const, upper: 0.5, lower: -0.5 },
  legLength: { type: "symmetric" as const, symmetric: 1.0 },
  angle: { type: "symmetric" as const, symmetric: 3 },
};

// ============================================================================
// 2D 投影算法
// ============================================================================

/**
 * 生成压缩弹簧主视图几何
 */
function generateCompressionFrontView(
  geometry: CompressionGeometry,
  scale: number
): GeometryElement[] {
  const { wireDiameter: d, meanDiameter: Dm, activeCoils: Na, totalCoils: Nt = Na + 2, freeLength: L0 = 50 } = geometry;
  const elements: GeometryElement[] = [];
  
  const OD = (Dm ?? 20) + d;
  const ID = (Dm ?? 20) - d;
  const pitch = L0 / Na;
  
  // 缩放因子
  const s = scale;
  
  // 外轮廓线（左右两条竖线）
  elements.push({
    id: "outline-left",
    start: { x: -OD/2 * s, y: 0 },
    end: { x: -OD/2 * s, y: L0 * s },
    style: "solid",
    weight: 0.5,
  });
  
  elements.push({
    id: "outline-right",
    start: { x: OD/2 * s, y: 0 },
    end: { x: OD/2 * s, y: L0 * s },
    style: "solid",
    weight: 0.5,
  });
  
  // 螺旋线投影（简化为锯齿线）
  const coilLines: Line2D[] = [];
  for (let i = 0; i < Nt; i++) {
    const y1 = i * pitch * s;
    const y2 = (i + 0.5) * pitch * s;
    const y3 = (i + 1) * pitch * s;
    
    // 左侧螺旋
    coilLines.push({
      id: `coil-left-${i}-1`,
      start: { x: -OD/2 * s, y: y1 },
      end: { x: -ID/2 * s, y: y2 },
      style: "solid",
      weight: 0.35,
    });
    coilLines.push({
      id: `coil-left-${i}-2`,
      start: { x: -ID/2 * s, y: y2 },
      end: { x: -OD/2 * s, y: y3 },
      style: "solid",
      weight: 0.35,
    });
    
    // 右侧螺旋
    coilLines.push({
      id: `coil-right-${i}-1`,
      start: { x: OD/2 * s, y: y1 },
      end: { x: ID/2 * s, y: y2 },
      style: "solid",
      weight: 0.35,
    });
    coilLines.push({
      id: `coil-right-${i}-2`,
      start: { x: ID/2 * s, y: y2 },
      end: { x: OD/2 * s, y: y3 },
      style: "solid",
      weight: 0.35,
    });
  }
  elements.push(...coilLines);
  
  // 中心线
  elements.push({
    id: "centerline-v",
    start: { x: 0, y: -5 * s },
    end: { x: 0, y: (L0 + 5) * s },
    style: "centerline",
    weight: 0.25,
  });
  
  // 顶部和底部端面线
  elements.push({
    id: "end-bottom",
    start: { x: -OD/2 * s, y: 0 },
    end: { x: OD/2 * s, y: 0 },
    style: "solid",
    weight: 0.5,
  });
  
  elements.push({
    id: "end-top",
    start: { x: -OD/2 * s, y: L0 * s },
    end: { x: OD/2 * s, y: L0 * s },
    style: "solid",
    weight: 0.5,
  });
  
  return elements;
}

/**
 * 生成压缩弹簧俯视图几何
 */
function generateCompressionTopView(
  geometry: CompressionGeometry,
  scale: number
): GeometryElement[] {
  const { wireDiameter: d, meanDiameter: Dm } = geometry;
  const elements: GeometryElement[] = [];
  
  const OD = Dm + d;
  const ID = Dm - d;
  const s = scale;
  
  // 外圆
  elements.push({
    id: "outer-circle",
    center: { x: 0, y: 0 },
    radius: OD/2 * s,
    style: "solid",
    weight: 0.5,
  } as Circle2D);
  
  // 内圆
  elements.push({
    id: "inner-circle",
    center: { x: 0, y: 0 },
    radius: ID/2 * s,
    style: "solid",
    weight: 0.5,
  } as Circle2D);
  
  // 中心线
  elements.push({
    id: "centerline-h",
    start: { x: -(OD/2 + 5) * s, y: 0 },
    end: { x: (OD/2 + 5) * s, y: 0 },
    style: "centerline",
    weight: 0.25,
  });
  
  elements.push({
    id: "centerline-v",
    start: { x: 0, y: -(OD/2 + 5) * s },
    end: { x: 0, y: (OD/2 + 5) * s },
    style: "centerline",
    weight: 0.25,
  });
  
  return elements;
}

/**
 * 生成拉伸弹簧主视图几何
 */
function generateExtensionFrontView(
  geometry: ExtensionGeometry,
  scale: number
): GeometryElement[] {
  const { wireDiameter: d, outerDiameter: OD, activeCoils: Na, bodyLength: Lb, hookType } = geometry;
  const elements: GeometryElement[] = [];
  
  const ID = OD - 2 * d;
  const Dm = OD - d;
  const s = scale;
  
  // 本体轮廓
  elements.push({
    id: "body-left",
    start: { x: -OD/2 * s, y: 0 },
    end: { x: -OD/2 * s, y: Lb * s },
    style: "solid",
    weight: 0.5,
  });
  
  elements.push({
    id: "body-right",
    start: { x: OD/2 * s, y: 0 },
    end: { x: OD/2 * s, y: Lb * s },
    style: "solid",
    weight: 0.5,
  });
  
  // 密绕线圈（紧密排列）
  for (let i = 0; i < Na; i++) {
    const y = i * d * s;
    elements.push({
      id: `coil-${i}`,
      start: { x: -OD/2 * s, y: y },
      end: { x: OD/2 * s, y: y },
      style: "solid",
      weight: 0.25,
    });
  }
  
  // 钩部简化表示
  const hookRadius = Dm / 2;
  
  // 底部钩
  elements.push({
    id: "hook-bottom",
    center: { x: 0, y: -hookRadius * s },
    radius: hookRadius * s,
    startAngle: 0,
    endAngle: 180,
    style: "solid",
    weight: 0.5,
  } as Arc2D);
  
  // 顶部钩
  elements.push({
    id: "hook-top",
    center: { x: 0, y: (Lb + hookRadius) * s },
    radius: hookRadius * s,
    startAngle: 180,
    endAngle: 360,
    style: "solid",
    weight: 0.5,
  } as Arc2D);
  
  // 中心线
  elements.push({
    id: "centerline",
    start: { x: 0, y: (-hookRadius * 2 - 5) * s },
    end: { x: 0, y: (Lb + hookRadius * 2 + 5) * s },
    style: "centerline",
    weight: 0.25,
  });
  
  return elements;
}

// ============================================================================
// 尺寸标注生成
// ============================================================================

/**
 * 生成压缩弹簧尺寸标注
 */
function generateCompressionDimensions(
  geometry: CompressionGeometry,
  viewId: string,
  scale: number
): DimensionSpec[] {
  const { wireDiameter: d, meanDiameter: Dm, activeCoils: Na, totalCoils: Nt, freeLength: L0 } = geometry;
  const dimensions: DimensionSpec[] = [];
  
  const OD = Dm + d;
  const s = scale;
  
  // 尺寸标注位置规划 (避免重叠)
  // - 线径 d: 左侧上方
  // - 外径 OD: 底部
  // - 自由长度 L0: 右侧
  // - Na, Nt: 右侧引出线
  
  // 线径 d (左侧，指向线圈截面)
  dimensions.push({
    id: "dim-d",
    type: "linear",
    label: "d",
    value: d,
    unit: "mm",
    tolerance: DEFAULT_TOLERANCES.wireDiameter,
    fromPoint: { x: -OD/2 * s - 5, y: L0 * 0.8 * s },
    toPoint: { x: (-OD/2 + d) * s - 5, y: L0 * 0.8 * s },
    orientation: "horizontal",
    viewId,
    offset: 25,
  });
  
  // 外径 OD (底部，水平标注)
  dimensions.push({
    id: "dim-OD",
    type: "diameter",
    label: "OD",
    value: OD,
    unit: "mm",
    tolerance: DEFAULT_TOLERANCES.meanDiameter,
    fromPoint: { x: -OD/2 * s, y: -5 },
    toPoint: { x: OD/2 * s, y: -5 },
    orientation: "horizontal",
    viewId,
    offset: 15,
    prefix: "⌀",
  });
  
  // 自由长度 L0 (右侧，垂直标注)
  dimensions.push({
    id: "dim-L0",
    type: "linear",
    label: "L₀",
    value: L0,
    unit: "mm",
    tolerance: DEFAULT_TOLERANCES.freeLength,
    fromPoint: { x: OD/2 * s + 15, y: 0 },
    toPoint: { x: OD/2 * s + 15, y: L0 * s },
    orientation: "vertical",
    viewId,
    offset: 20,
  });
  
  // 有效圈数 Na（参考尺寸，右上方引出）
  dimensions.push({
    id: "dim-Na",
    type: "leader",
    label: "Na",
    value: Na,
    fromPoint: { x: OD/2 * s + 35, y: L0 * 0.65 * s },
    toPoint: { x: OD/2 * s + 55, y: L0 * 0.65 * s },
    orientation: "horizontal",
    viewId,
    isReference: true,
  });
  
  // 总圈数 Nt（参考尺寸，右下方引出）
  dimensions.push({
    id: "dim-Nt",
    type: "leader",
    label: "Nt",
    value: Nt,
    fromPoint: { x: OD/2 * s + 35, y: L0 * 0.35 * s },
    toPoint: { x: OD/2 * s + 55, y: L0 * 0.35 * s },
    orientation: "horizontal",
    viewId,
    isReference: true,
  });
  
  return dimensions;
}

// ============================================================================
// 技术要求生成
// ============================================================================

/**
 * 生成压缩弹簧技术要求
 */
function generateCompressionTechnicalNotes(
  geometry: CompressionGeometry,
  material: MaterialInfo,
  analysis?: AnalysisResult
): TechnicalNote[] {
  const notes: TechnicalNote[] = [];
  let index = 1;
  
  // 材料
  notes.push({
    index: index++,
    textEn: `Material: ${material.name}`,
    textZh: `材料：${material.name}`,
  });
  
  // 表面处理
  notes.push({
    index: index++,
    textEn: "Surface treatment: Zinc plating or as specified",
    textZh: "表面处理：镀锌或按规定",
  });
  
  // 端面磨平
  if (geometry.topGround || geometry.bottomGround) {
    const groundText = geometry.topGround && geometry.bottomGround 
      ? "both ends" 
      : geometry.topGround ? "top end" : "bottom end";
    notes.push({
      index: index++,
      textEn: `Ground ends: ${groundText}`,
      textZh: `端面磨平：${groundText === "both ends" ? "两端" : groundText === "top end" ? "顶端" : "底端"}`,
    });
  }
  
  // 刚度
  if (analysis?.springRate) {
    notes.push({
      index: index++,
      textEn: `Spring rate: ${analysis.springRate.toFixed(2)} N/mm ±10%`,
      textZh: `弹簧刚度：${analysis.springRate.toFixed(2)} N/mm ±10%`,
    });
  }
  
  // 旋向
  notes.push({
    index: index++,
    textEn: "Winding direction: Right hand (unless specified)",
    textZh: "旋向：右旋（除非另有规定）",
  });
  
  // 未注公差
  notes.push({
    index: index++,
    textEn: "General tolerances: ISO 2768-mK",
    textZh: "未注公差：ISO 2768-mK",
  });
  
  return notes;
}

// ============================================================================
// 主生成函数
// ============================================================================

/**
 * 生成弹簧工程图规格
 */
export function generateSpringDrawingSpec(
  geometry: SpringGeometry,
  material: MaterialInfo,
  analysis?: AnalysisResult,
  options?: {
    standard?: DrawingStandard;
    sheetSize?: SheetSize;
    language?: "en" | "zh" | "de" | "bilingual";
    drawnBy?: string;
  }
): SpringDrawingSpec {
  const {
    standard = "ISO",
    sheetSize = "A4",
    language = "bilingual",
    drawnBy = "CAD System",
  } = options ?? {};
  
  const scale = 2; // 2:1 放大
  const now = new Date().toISOString().split("T")[0];
  
  // 标题栏
  const titleBlock: TitleBlockSpec = {
    partName: `${geometry.type.charAt(0).toUpperCase() + geometry.type.slice(1)} Spring`,
    partNameZh: geometry.type === "compression" ? "压缩弹簧" 
      : geometry.type === "extension" ? "拉伸弹簧"
      : geometry.type === "torsion" ? "扭转弹簧" : "锥形弹簧",
    partNumber: `SP-${geometry.type.toUpperCase().slice(0, 2)}-${Date.now().toString(36).toUpperCase()}`,
    material: material.name,
    scale: `${scale}:1`,
    drawnBy,
    drawnDate: now,
  };
  
  // 视图
  const views: ViewSpec[] = [];
  const viewGeometries: ViewGeometry[] = [];
  const dimensions: DimensionSpec[] = [];
  let technicalNotes: TechnicalNote[] = [];
  
  if (geometry.type === "compression") {
    // 主视图
    views.push({
      id: "front",
      name: "Front View",
      nameZh: "主视图",
      projection: "front",
      scale,
      position: { x: 80, y: 120 },
      showCenterLines: true,
    });
    
    const frontElements = generateCompressionFrontView(geometry, scale);
    viewGeometries.push({
      viewId: "front",
      elements: frontElements,
      boundingBox: calculateBoundingBox(frontElements),
    });
    
    // 俯视图
    views.push({
      id: "top",
      name: "Top View",
      nameZh: "俯视图",
      projection: "top",
      scale,
      position: { x: 200, y: 120 },
      showCenterLines: true,
    });
    
    const topElements = generateCompressionTopView(geometry, scale);
    viewGeometries.push({
      viewId: "top",
      elements: topElements,
      boundingBox: calculateBoundingBox(topElements),
    });
    
    // 尺寸标注
    dimensions.push(...generateCompressionDimensions(geometry, "front", scale));
    
    // 技术要求
    technicalNotes = generateCompressionTechnicalNotes(geometry, material, analysis);
  }
  
  // TODO: 添加其他弹簧类型的视图生成
  
  return {
    standard,
    sheetSize,
    orientation: "landscape",
    titleBlock,
    views,
    viewGeometries,
    dimensions,
    technicalNotes,
    language,
  };
}

/**
 * 计算几何元素的边界框
 */
function calculateBoundingBox(elements: GeometryElement[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const el of elements) {
    if ("start" in el && "end" in el) {
      // Line
      minX = Math.min(minX, el.start.x, el.end.x);
      minY = Math.min(minY, el.start.y, el.end.y);
      maxX = Math.max(maxX, el.start.x, el.end.x);
      maxY = Math.max(maxY, el.start.y, el.end.y);
    } else if ("center" in el && "radius" in el) {
      // Circle or Arc
      minX = Math.min(minX, el.center.x - el.radius);
      minY = Math.min(minY, el.center.y - el.radius);
      maxX = Math.max(maxX, el.center.x + el.radius);
      maxY = Math.max(maxY, el.center.y + el.radius);
    } else if ("points" in el) {
      // Spline
      for (const p of el.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
  }
  
  return { minX, minY, maxX, maxY };
}

export { DEFAULT_TOLERANCES };
