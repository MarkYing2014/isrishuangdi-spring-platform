/**
 * Spring Pipeline Configuration
 * 弹簧工作流程配置
 * 
 * Defines the unified workflow for all spring types:
 * Calculator → Analysis → Simulator → Report → CAD/RFQ
 */

import type { SpringType } from "@/lib/springTypes";

/**
 * Configuration for a spring type's workflow pipeline
 * 弹簧类型的工作流程配置
 */
export interface SpringPipelineConfig {
  type: SpringType;
  label: {
    en: string;
    zh: string;
  };
  /** Path to the calculator page */
  calculatorPath: string;
  /** Path to the engineering analysis page */
  analysisPath: string;
  /** Path to the 3D simulator page */
  simulatorPath: string;
  /** Path to the design report page */
  reportPath: string;
  /** Path to the CAD export page */
  cadExportPath: string;
  /** Path to the RFQ page */
  rfqPath: string;
  /** Icon name (for UI) */
  icon?: string;
  /** Whether this pipeline is fully implemented */
  implemented: boolean;
}

/**
 * Pipeline configurations for all spring types
 * 所有弹簧类型的管道配置
 */
export const SPRING_PIPELINES: Record<SpringType, SpringPipelineConfig> = {
  compression: {
    type: "compression",
    label: { en: "Compression Spring", zh: "压缩弹簧" },
    calculatorPath: "/tools/calculator?tab=compression",
    analysisPath: "/tools/analysis?type=compression",
    simulatorPath: "/tools/simulator?type=compression",
    reportPath: "/tools/report?type=compression",
    cadExportPath: "/tools/cad-export?type=compression",
    rfqPath: "/rfq?springType=compression",
    icon: "ArrowDownUp",
    implemented: true,
  },
  extension: {
    type: "extension",
    label: { en: "Extension Spring", zh: "拉伸弹簧" },
    calculatorPath: "/tools/calculator?tab=extension",
    analysisPath: "/tools/analysis?type=extension",
    simulatorPath: "/tools/simulator?type=extension",
    reportPath: "/tools/report?type=extension",
    cadExportPath: "/tools/cad-export?type=extension",
    rfqPath: "/rfq?springType=extension",
    icon: "ArrowUpDown",
    implemented: true,
  },
  torsion: {
    type: "torsion",
    label: { en: "Torsion Spring", zh: "扭转弹簧" },
    calculatorPath: "/tools/calculator?tab=torsion",
    analysisPath: "/tools/analysis?type=torsion",
    simulatorPath: "/tools/simulator?type=torsion",
    reportPath: "/tools/report?type=torsion",
    cadExportPath: "/tools/cad-export?type=torsion",
    rfqPath: "/rfq?springType=torsion",
    icon: "RotateCw",
    implemented: true,
  },
  conical: {
    type: "conical",
    label: { en: "Conical Spring", zh: "锥形弹簧" },
    calculatorPath: "/tools/calculator?tab=conical",
    analysisPath: "/tools/analysis?type=conical",
    simulatorPath: "/tools/simulator?type=conical",
    reportPath: "/tools/report?type=conical",
    cadExportPath: "/tools/cad-export?type=conical",
    rfqPath: "/rfq?springType=conical",
    icon: "Cone",
    implemented: true,
  },
  spiralTorsion: {
    type: "spiralTorsion",
    label: { en: "Spiral Torsion Spring", zh: "螺旋扭转弹簧" },
    calculatorPath: "/tools/calculator?tab=spiralTorsion",
    analysisPath: "/tools/analysis?type=spiralTorsion",
    simulatorPath: "/tools/simulator?type=spiralTorsion",
    reportPath: "/tools/report?type=spiralTorsion",
    cadExportPath: "/tools/cad-export?type=spiralTorsion",
    rfqPath: "/rfq?springType=spiralTorsion",
    icon: "Disc",
    implemented: false, // 3D model and other features coming soon
  },
  wave: {
    type: "wave",
    label: { en: "Wave Spring", zh: "波形弹簧" },
    calculatorPath: "/tools/wave-spring",
    analysisPath: "/tools/analysis?type=wave",
    simulatorPath: "/tools/simulator?type=wave",
    reportPath: "/tools/report?type=wave",
    cadExportPath: "/tools/cad-export?type=wave",
    rfqPath: "/rfq?springType=wave",
    icon: "Waves",
    implemented: true,
  },
  dieSpring: {
    type: "dieSpring",
    label: { en: "Die Spring", zh: "模具弹簧" },
    calculatorPath: "/tools/die-spring",
    analysisPath: "/tools/analysis?type=dieSpring",
    simulatorPath: "/tools/simulator?type=dieSpring",
    reportPath: "/tools/report?type=dieSpring",
    cadExportPath: "/tools/cad-export?type=dieSpring",
    rfqPath: "/rfq?springType=dieSpring",
    icon: "Square",
    implemented: true,
  },
  suspensionSpring: {
    type: "suspensionSpring",
    label: { en: "Suspension Spring", zh: "减震器弹簧" },
    calculatorPath: "/tools/suspension-spring",
    analysisPath: "/tools/analysis?type=suspensionSpring",
    simulatorPath: "/tools/simulator?type=suspensionSpring",
    reportPath: "/tools/report?type=suspensionSpring",
    cadExportPath: "/tools/cad-export?type=suspensionSpring",
    rfqPath: "/rfq?springType=suspensionSpring",
    icon: "Car",
    implemented: true,
  },
  arc: {
    type: "arc",
    label: { en: "Arc Spring", zh: "弧形弹簧" },
    calculatorPath: "/tools/calculator?type=arcSpring",
    analysisPath: "/tools/analysis?type=arc",
    simulatorPath: "/tools/simulator?type=arc", // Not implemented yet but route exists
    reportPath: "/tools/report?type=arc",
    cadExportPath: "/tools/cad-export?type=arcSpring",
    rfqPath: "/rfq?springType=arc",
    icon: "Circle",
    implemented: true,
  },
  variablePitchCompression: {
    type: "variablePitchCompression",
    label: { en: "Variable Pitch Compression", zh: "变节距压缩弹簧" },
    calculatorPath: "/tools/calculator?tab=variablePitchCompression",
    analysisPath: "/tools/analysis?type=variablePitchCompression",
    simulatorPath: "/tools/simulator?type=variablePitchCompression",
    reportPath: "/tools/report?type=variablePitchCompression",
    cadExportPath: "/tools/cad-export?type=variablePitchCompression",
    rfqPath: "/rfq?springType=variablePitchCompression",
    icon: "ArrowDownWideNarrow",
    implemented: true,
  },
  disk: {
    type: "disk",
    label: { en: "Disk / Belleville Spring", zh: "碟形弹簧" },
    calculatorPath: "/tools/calculator?tab=disk",
    analysisPath: "/tools/analysis?type=disk",
    simulatorPath: "/tools/simulator?type=disk",
    reportPath: "/tools/report?type=disk",
    cadExportPath: "/tools/cad-export?type=disk",
    rfqPath: "/rfq?springType=disk",
    icon: "Disc",
    implemented: true,
  },
  garter: {
    type: "garter",
    label: { en: "Garter Spring", zh: "箍簧" },
    calculatorPath: "/tools/calculator?tab=garter",
    analysisPath: "/tools/analysis?type=garter",
    simulatorPath: "/tools/simulator?type=garter",
    reportPath: "/tools/report?type=garter",
    cadExportPath: "/tools/cad-export?type=garter",
    rfqPath: "/rfq?springType=garter",
    icon: "CircleDashed",
    implemented: true,
  },
  torsionalSpringSystem: {
    type: "torsionalSpringSystem",
    label: { en: "Torsional Spring System", zh: "扭簧系统" },
    calculatorPath: "/tools/calculator?tab=torsionalSpringSystem",
    analysisPath: "/tools/analysis?type=torsionalSpringSystem",
    simulatorPath: "/tools/simulator?type=torsionalSpringSystem",
    reportPath: "/tools/report?type=torsionalSpringSystem",
    cadExportPath: "/tools/cad-export?type=torsionalSpringSystem",
    rfqPath: "/rfq?springType=torsionalSpringSystem",
    icon: "Settings2",
    implemented: true,
  },
};

/**
 * Get pipeline configuration for a spring type
 * 获取弹簧类型的管道配置
 */
export function getPipeline(type: SpringType): SpringPipelineConfig {
  return SPRING_PIPELINES[type];
}

/**
 * Get all implemented pipelines
 * 获取所有已实现的管道
 */
export function getImplementedPipelines(): SpringPipelineConfig[] {
  return Object.values(SPRING_PIPELINES).filter((p) => p.implemented);
}

/**
 * Build URL with design parameters for pipeline navigation
 * 构建带设计参数的管道导航 URL
 */
export function buildPipelineUrl(
  basePath: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${basePath}${basePath.includes("?") ? "&" : "?"}${queryString}` : basePath;
}

/**
 * Common parameter keys for URL serialization
 * URL 序列化的通用参数键
 */
export const PARAM_KEYS = {
  // Common
  type: "type",
  wireDiameter: "d",
  shearModulus: "G",
  materialId: "mat",
  activeCoils: "Na",
  freeLength: "L0",

  // Compression
  meanDiameter: "Dm",
  totalCoils: "Nt",
  deflection: "dx",

  // Conical
  largeOuterDiameter: "D1",
  smallOuterDiameter: "D2",
  maxDeflection: "dxMax",

  // Extension
  outerDiameter: "OD",
  bodyLength: "Lb",
  initialTension: "F0",
  extension: "ext",

  // Torsion
  legLength1: "leg1",
  legLength2: "leg2",
  workingAngle: "theta",
} as const;

/**
 * Serialize spring design to URL parameters
 * 将弹簧设计序列化为 URL 参数
 */
export function serializeDesignToParams(
  design: Record<string, unknown>
): Record<string, string> {
  const params: Record<string, string> = {};

  const keyMap: Record<string, string> = {
    type: PARAM_KEYS.type,
    wireDiameter: PARAM_KEYS.wireDiameter,
    shearModulus: PARAM_KEYS.shearModulus,
    materialId: PARAM_KEYS.materialId,
    activeCoils: PARAM_KEYS.activeCoils,
    freeLength: PARAM_KEYS.freeLength,
    meanDiameter: PARAM_KEYS.meanDiameter,
    totalCoils: PARAM_KEYS.totalCoils,
    largeOuterDiameter: PARAM_KEYS.largeOuterDiameter,
    smallOuterDiameter: PARAM_KEYS.smallOuterDiameter,
    outerDiameter: PARAM_KEYS.outerDiameter,
    bodyLength: PARAM_KEYS.bodyLength,
    initialTension: PARAM_KEYS.initialTension,
    legLength1: PARAM_KEYS.legLength1,
    legLength2: PARAM_KEYS.legLength2,
    workingAngle: PARAM_KEYS.workingAngle,
  };

  for (const [key, value] of Object.entries(design)) {
    if (value !== undefined && value !== null) {
      const paramKey = keyMap[key] || key;
      params[paramKey] = String(value);
    }
  }

  return params;
}

/**
 * Parse URL parameters to design object
 * 将 URL 参数解析为设计对象
 */
export function parseParamsToDesign(
  searchParams: URLSearchParams
): Record<string, string | number> {
  const design: Record<string, string | number> = {};

  const reverseKeyMap: Record<string, string> = {
    [PARAM_KEYS.type]: "type",
    [PARAM_KEYS.wireDiameter]: "wireDiameter",
    [PARAM_KEYS.shearModulus]: "shearModulus",
    [PARAM_KEYS.materialId]: "materialId",
    [PARAM_KEYS.activeCoils]: "activeCoils",
    [PARAM_KEYS.freeLength]: "freeLength",
    [PARAM_KEYS.meanDiameter]: "meanDiameter",
    [PARAM_KEYS.totalCoils]: "totalCoils",
    [PARAM_KEYS.largeOuterDiameter]: "largeOuterDiameter",
    [PARAM_KEYS.smallOuterDiameter]: "smallOuterDiameter",
    [PARAM_KEYS.outerDiameter]: "outerDiameter",
    [PARAM_KEYS.bodyLength]: "bodyLength",
    [PARAM_KEYS.initialTension]: "initialTension",
    [PARAM_KEYS.legLength1]: "legLength1",
    [PARAM_KEYS.legLength2]: "legLength2",
    [PARAM_KEYS.workingAngle]: "workingAngle",
    [PARAM_KEYS.deflection]: "deflection",
    [PARAM_KEYS.maxDeflection]: "maxDeflection",
    [PARAM_KEYS.extension]: "extension",
  };

  searchParams.forEach((value, key) => {
    const designKey = reverseKeyMap[key] || key;
    const numValue = Number(value);
    design[designKey] = Number.isFinite(numValue) && designKey !== "type" && designKey !== "materialId"
      ? numValue
      : value;
  });

  return design;
}
