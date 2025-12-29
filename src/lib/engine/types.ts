/**
 * Spring Analysis Engine - Type Definitions
 * 弹簧分析引擎 - 类型定义
 */

import type { SpringMaterialId } from '@/lib/materials/springMaterials';

// ============================================================================
// Spring Type Definitions
// ============================================================================

export type SpringType = 'compression' | 'extension' | 'torsion' | 'conical';

/**
 * Base spring geometry parameters
 * 基础弹簧几何参数
 */
export interface BaseSpringGeometry {
  /** Wire diameter d (mm) */
  wireDiameter: number;
  /** Active coils Na */
  activeCoils: number;
  /** Total coils Nt (optional, defaults to Na + 2 for ground ends) */
  totalCoils?: number;
  /** Material ID */
  materialId: SpringMaterialId;
}

/**
 * Compression spring geometry
 * 压缩弹簧几何参数
 */
export interface CompressionSpringGeometry extends BaseSpringGeometry {
  type: 'compression';
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Free length L0 (mm) */
  freeLength: number;
  /** Pitch p (mm) - optional, calculated from L0 if not provided */
  pitch?: number;
  /** End type */
  endType?: 'closed_ground' | 'closed_unground' | 'open' | 'open_ground';
}

/**
 * Extension spring geometry
 * 拉伸弹簧几何参数
 */
export interface ExtensionSpringGeometry extends BaseSpringGeometry {
  type: 'extension';
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Body length Lb (mm) */
  bodyLength: number;
  /** Initial tension Fi (N) */
  initialTension: number;
  /** Hook type */
  hookType?: 'machine' | 'crossover' | 'side' | 'extended' | 'doubleLoop';
}

/**
 * Torsion spring geometry
 * 扭转弹簧几何参数
 */
export interface TorsionSpringGeometry extends BaseSpringGeometry {
  type: 'torsion';
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Body length Lb (mm) */
  bodyLength: number;
  /** Leg length L1 (mm) */
  legLength1: number;
  /** Leg length L2 (mm) */
  legLength2: number;
  /** Leg angle (degrees) */
  legAngle?: number;
  /** Wind direction */
  windDirection?: 'left' | 'right';
}

/**
 * Conical spring geometry
 * 锥形弹簧几何参数
 */
export interface ConicalSpringGeometry extends BaseSpringGeometry {
  type: 'conical';
  /** Large end outer diameter D1 (mm) */
  largeOuterDiameter: number;
  /** Small end outer diameter D2 (mm) */
  smallOuterDiameter: number;
  /** Free length L0 (mm) */
  freeLength: number;
}

/**
 * Union type for all spring geometries
 */
export type SpringGeometry =
  | CompressionSpringGeometry
  | ExtensionSpringGeometry
  | TorsionSpringGeometry
  | ConicalSpringGeometry;

// ============================================================================
// Working Condition Definitions
// ============================================================================

/**
 * Working conditions for spring analysis
 * 弹簧工作条件
 */
export interface WorkingConditions {
  /** Minimum deflection/angle (mm or degrees) */
  minDeflection: number;
  /** Maximum deflection/angle (mm or degrees) */
  maxDeflection: number;
  /** Operating temperature (°C) */
  temperature?: number;
  /** Number of cycles for fatigue analysis */
  targetCycles?: number;
  /** Preload deflection (mm) - for compression springs */
  preloadDeflection?: number;
}

// ============================================================================
// Analysis Result Definitions
// ============================================================================

/**
 * Geometry calculation result
 * 几何计算结果
 */
export interface GeometryResult {
  /** Spring index C = Dm/d */
  springIndex: number;
  /** Mean diameter Dm (mm) */
  meanDiameter: number;
  /** Wire diameter d (mm) */
  wireDiameter: number;
  /** Active coils Na */
  activeCoils: number;
  /** Total coils Nt */
  totalCoils: number;
  /** Solid height Hs (mm) - for compression/conical */
  solidHeight?: number;
  /** Free length L0 (mm) */
  freeLength?: number;
  /** Pitch p (mm) */
  pitch?: number;
  /** Coil gap (mm) */
  coilGap?: number;
}

/**
 * Stress calculation result
 * 应力计算结果
 */
export interface StressResult {
  /** Nominal shear stress τ_nominal (MPa) */
  tauNominal: number;
  /** Wahl correction factor Kw */
  wahlFactor: number;
  /** Surface factor */
  surfaceFactor: number;
  /** Size factor */
  sizeFactor: number;
  /** Temperature factor */
  tempFactor: number;
  /** Total correction factor */
  totalCorrectionFactor: number;
  /** Effective (corrected) shear stress τ_eff (MPa) */
  tauEffective: number;
  /** For torsion springs: bending stress σ (MPa) */
  bendingStress?: number;
}

/**
 * Safety factor result
 * 安全系数结果
 */
export interface SafetyResult {
  /** Static safety factor SF = τ_allow / τ_eff */
  staticSafetyFactor: number;
  /** Allowable static shear stress (MPa) */
  allowableStress: number;
  /** Safety status */
  status: 'safe' | 'warning' | 'danger';
  /** Status message */
  message: {
    en: string;
    zh: string;
  };
}

/**
 * Fatigue analysis result
 * 疲劳分析结果
 */
export interface FatigueResult {
  /** Mean stress τ_mean (MPa) */
  tauMean: number;
  /** Alternating stress τ_alt (MPa) */
  tauAlt: number;
  /** Stress ratio R = τ_min / τ_max */
  stressRatio: number;
  /** Estimated fatigue life (cycles) */
  estimatedCycles: number;
  /** Safety factor for infinite life */
  infiniteLifeSafetyFactor: number;
  /** Fatigue rating */
  rating: 'infinite' | 'high' | 'medium' | 'low' | 'very_low';
  /** Rating message */
  message: {
    en: string;
    zh: string;
  };
  /** S-N curve data points for plotting */
  snCurveData?: Array<{ cycles: number; stress: number }>;
}

/**
 * Buckling analysis result (compression springs only)
 * 屈曲分析结果（仅压缩弹簧）
 */
export interface BucklingResult {
  /** Slenderness ratio λ = L0 / Dm */
  slendernessRatio: number;
  /** Critical buckling load Pcr (N) */
  criticalLoad: number;
  /** Working load at max deflection (N) */
  workingLoad: number;
  /** Buckling safety factor */
  bucklingSafetyFactor: number;
  /** Buckling risk status */
  status: 'safe' | 'warning' | 'danger';
  /** Status message */
  message: {
    en: string;
    zh: string;
  };
  /** Recommended actions if at risk */
  recommendations?: string[];
}

/**
 * Force-deflection curve point
 * 力-位移曲线点
 */
export interface ForceDeflectionPoint {
  /** Deflection (mm) or angle (degrees) */
  deflection: number;
  /** Force (N) or torque (N·mm) */
  force: number;
  /** Instantaneous stiffness (N/mm or N·mm/deg) */
  stiffness: number;
  /** Shear stress at this point (MPa) */
  stress?: number;
  /** Active coils at this point (for conical springs) */
  activeCoils?: number;
  /** Collapsed coils at this point (for conical springs) */
  collapsedCoils?: number;
}

/**
 * Complete spring analysis result
 * 完整弹簧分析结果
 */
export interface SpringAnalysisResult {
  /** Spring type */
  springType: SpringType;
  /** Geometry results */
  geometry: GeometryResult;
  /** Spring rate k (N/mm or N·mm/deg) */
  springRate: number;
  /** Stress results at max deflection */
  stress: StressResult;
  /** Safety factor results */
  safety: SafetyResult;
  /** Fatigue analysis results */
  fatigue: FatigueResult;
  /** Buckling results (compression springs only) */
  buckling?: BucklingResult;
  /** Force-deflection curve */
  forceCurve: ForceDeflectionPoint[];
  /** Analysis timestamp */
  timestamp: Date;
  /** Warnings and notes */
  warnings: string[];
}

// ============================================================================
// Report Generation Types
// ============================================================================

/**
 * Report configuration
 * 报告配置
 */
export interface ReportConfig {
  /** Company name */
  companyName?: string;
  /** Company logo URL */
  logoUrl?: string;
  /** Engineer name */
  engineerName?: string;
  /** Project/Model ID */
  modelId?: string;
  /** Include 3D snapshot */
  include3DSnapshot?: boolean;
  /** Include CAD export link */
  includeCADLink?: boolean;
  /** Language */
  language?: 'en' | 'zh' | 'bilingual';
}

/**
 * Report data structure
 * 报告数据结构
 */
export interface ReportData {
  /** Report configuration */
  config: ReportConfig;
  /** Spring geometry */
  geometry: SpringGeometry;
  /** Working conditions */
  workingConditions: WorkingConditions;
  /** Analysis results */
  results: SpringAnalysisResult;
  /** 3D snapshot image (base64) */
  snapshot3D?: string;
  /** CAD export URL */
  cadExportUrl?: string;
}
