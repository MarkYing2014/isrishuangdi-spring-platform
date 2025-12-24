import type { SpringMaterialId } from "@/lib/materials/springMaterials";

// ============================================================================
// SPRING TYPE DEFINITIONS
// 弹簧类型定义
// ============================================================================

export type SpringType = "compression" | "extension" | "torsion" | "conical" | "spiralTorsion" | "wave" | "dieSpring" | "suspensionSpring" | "arc" | "variablePitchCompression";

export const SPRING_TYPE_LABELS: Record<SpringType, { en: string; zh: string }> = {
  compression: { en: "Compression Spring", zh: "压缩弹簧" },
  extension: { en: "Extension Spring", zh: "拉伸弹簧" },
  torsion: { en: "Torsion Spring", zh: "扭转弹簧" },
  conical: { en: "Conical Spring", zh: "锥形弹簧" },
  spiralTorsion: { en: "Spiral Torsion Spring", zh: "螺旋扭转弹簧" },
  wave: { en: "Wave Spring", zh: "波形弹簧" },
  dieSpring: { en: "Die Spring", zh: "模具弹簧" },
  suspensionSpring: { en: "Suspension Spring", zh: "减震器弹簧" },
  arc: { en: "Arc Spring", zh: "弧形弹簧" },
  variablePitchCompression: { en: "Variable Pitch Compression", zh: "变节距压缩弹簧" },
};

// ============================================================================
// BASE DESIGN INTERFACE
// 基础设计接口
// ============================================================================

/**
 * Base interface for all spring designs
 * 所有弹簧设计的基础接口
 */
export interface SpringDesignBase {
  /** Optional design code or SKU */
  id?: string;
  /** Optional design code or SKU */
  code?: string;
  /** Spring type */
  type: SpringType;
  /** Wire diameter d in millimeters */
  wireDiameter: number;
  /** Material ID */
  materialId?: SpringMaterialId;
  /** Shear modulus G in MPa */
  shearModulus: number;
  /** Additional notes */
  notes?: string;
}

// ============================================================================
// COMPRESSION SPRING DESIGN
// 压缩弹簧设计
// ============================================================================

export interface CompressionSpringDesign extends SpringDesignBase {
  type: "compression";
  /** Mean diameter Dm in millimeters */
  meanDiameter: number;
  /** Active coils Na */
  activeCoils: number;
  /** Total coils Nt (active + inactive) */
  totalCoils?: number;
  /** Free length L0 in millimeters */
  freeLength?: number;
  /** Coil pitch in millimeters */
  pitch?: number;
  /** Whether the top end is ground flat */
  topGround?: boolean;
  /** Whether the bottom end is ground flat */
  bottomGround?: boolean;
  /** Solid height in millimeters */
  solidHeight?: number;
}

// ============================================================================
// CONICAL SPRING DESIGN
// 锥形弹簧设计
// ============================================================================

export interface ConicalSpringDesign extends SpringDesignBase {
  type: "conical";
  /** Large outer diameter D1 in millimeters (bottom) */
  largeOuterDiameter: number;
  /** Small outer diameter D2 in millimeters (top) */
  smallOuterDiameter: number;
  /** Free length L0 in millimeters */
  freeLength: number;
  /** Active coils Na */
  activeCoils: number;
  /** Solid height in millimeters */
  solidHeight?: number;
  /** Total deflection capacity in millimeters */
  totalDeflectionCapacity?: number;
}

// ============================================================================
// EXTENSION SPRING DESIGN
// 拉伸弹簧设计
// ============================================================================

/**
 * Extension Spring Hook Types - Single Source of Truth
 * 拉簧钩类型 - 单一真相源
 * 
 * 所有使用 Hook 类型的地方都应该引用这个定义：
 * - Calculator 表单
 * - ExtensionDesignMeta
 * - ExtensionSpringParams
 * - HookBuilder
 */
export const EXTENSION_HOOK_TYPES = [
  "machine",    // Machine Hook - 机器钩（最常用，弯出 3/4 圈）
  "side",       // Side Hook - 侧钩（环在侧面，最经济）
  "crossover",  // Crossover Hook - 交叉钩（线材跨过中心）
  "extended",   // Extended Hook - 延长钩（带延长段）
  "doubleLoop", // Double Loop - 双环钩
] as const;

export type ExtensionHookType = (typeof EXTENSION_HOOK_TYPES)[number];

/**
 * Hook Type Labels for UI
 * 钩类型标签（用于界面显示）
 */
export const EXTENSION_HOOK_LABELS: Record<ExtensionHookType, { en: string; zh: string }> = {
  machine: { en: "Machine Hook", zh: "机器钩" },
  side: { en: "Side Hook", zh: "侧钩" },
  crossover: { en: "Crossover Hook", zh: "交叉钩" },
  extended: { en: "Extended Hook", zh: "延长钩" },
  doubleLoop: { en: "Double Loop", zh: "双环钩" },
};

// Legacy type alias for backward compatibility
// 旧类型别名（向后兼容）
export type HookType = ExtensionHookType;

export interface ExtensionSpringDesign extends SpringDesignBase {
  type: "extension";
  /** Outer diameter OD in millimeters */
  outerDiameter: number;
  /** Mean diameter Dm in millimeters (calculated: OD - d) */
  meanDiameter?: number;
  /** Active coils Na */
  activeCoils: number;
  /** Body length Lb in millimeters (coil body only) */
  bodyLength: number;
  /** Free length inside hooks Li in millimeters */
  freeLengthInsideHooks?: number;
  /** Total free length L0 including hooks */
  freeLength?: number;
  /** Initial tension F0 in Newtons */
  initialTension?: number;
  /** Hook type (unified, applies to both ends if A/B not specified) */
  hookType?: ExtensionHookType;
  /** Hook type at end A (overrides hookType) */
  hookTypeA?: ExtensionHookType;
  /** Hook type at end B (overrides hookType) */
  hookTypeB?: ExtensionHookType;
  /** Hook length at end A in millimeters */
  hookLengthA?: number;
  /** Hook length at end B in millimeters */
  hookLengthB?: number;
  /** Hook opening angle in degrees */
  hookAngle?: number;
}

// ============================================================================
// TORSION SPRING DESIGN
// 扭转弹簧设计
// ============================================================================

export type LegType = "straight" | "bent" | "hook" | "loop";

export interface TorsionSpringDesign extends SpringDesignBase {
  type: "torsion";
  /** Mean diameter Dm in millimeters */
  meanDiameter: number;
  /** Active coils Na */
  activeCoils: number;
  /** Total coils Nt */
  totalCoils?: number;
  /** Body length Lb in millimeters */
  bodyLength?: number;
  /** Leg 1 length in millimeters */
  legLength1: number;
  /** Leg 2 length in millimeters */
  legLength2: number;
  /** Leg 1 type */
  legType1?: LegType;
  /** Leg 2 type */
  legType2?: LegType;
  /** Free angle between legs in degrees */
  freeAngle?: number;
  /** Working angle deflection in degrees */
  workingAngle?: number;
  /** Winding direction: "left" or "right" */
  windingDirection?: "left" | "right";
  /** Elastic modulus E in MPa (used for torsion springs) */
  elasticModulus?: number;
}

// ============================================================================
// UNION TYPE FOR ALL SPRING DESIGNS
// 所有弹簧设计的联合类型
// ============================================================================

export type SpringDesign =
  | CompressionSpringDesign
  | ConicalSpringDesign
  | ExtensionSpringDesign
  | TorsionSpringDesign
  | VariablePitchCompressionDesign;

// ============================================================================
// LEGACY INTERFACE (for backward compatibility)
// 旧接口（向后兼容）
// ============================================================================

/**
 * @deprecated Use specific design interfaces instead
 */
export interface LegacySpringDesign {
  code?: string;
  type: SpringType;
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  totalCoils?: number;
  shearModulus: number;
  freeLength?: number;
  pitch?: number;
  topGround?: boolean;
  bottomGround?: boolean;
  notes?: string;
}

// ============================================================================
// CALCULATION RESULT INTERFACES
// 计算结果接口
// ============================================================================

/**
 * Base calculation result interface
 * 基础计算结果接口
 */
export interface SpringCalculationResultBase {
  /** Spring rate k in N/mm (or N·mm/deg for torsion) */
  k: number;
  /** Spring index C = Dm/d */
  springIndex: number;
  /** Wahl correction factor */
  wahlFactor: number;
  /** Nominal shear stress (before Wahl correction) in MPa */
  tauNominal: number;
  /** Maximum shear stress (with Wahl correction) in MPa */
  tauMax: number;
}

export interface CompressionCalculationResult extends SpringCalculationResultBase {
  type: "compression";
  /** Load at working deflection in N */
  load: number;
  /** Working deflection in mm */
  deflection: number;
  /** Solid height in mm */
  solidHeight?: number;
}

export interface ConicalCalculationResult extends SpringCalculationResultBase {
  type: "conical";
  /** Load at working deflection in N */
  load: number;
  /** Working deflection in mm */
  deflection: number;
  /** Number of collapsed coils */
  collapsedCoils: number;
  /** Number of remaining active coils */
  activeCoils: number;
}

export interface ExtensionCalculationResult extends SpringCalculationResultBase {
  type: "extension";
  /** Load at working extension in N */
  load: number;
  /** Working extension in mm */
  extension: number;
  /** Initial tension in N */
  initialTension: number;
  /** Total load = initialTension + k * extension */
  totalLoad: number;
}

export interface TorsionCalculationResult extends SpringCalculationResultBase {
  type: "torsion";
  /** Torque at working angle in N·mm */
  torque: number;
  /** Working angle in degrees */
  angle: number;
  /** Bending stress in MPa (torsion springs use bending, not shear) */
  bendingStress: number;
}

export type SpringCalculationResult =
  | CompressionCalculationResult
  | ConicalCalculationResult
  | ExtensionCalculationResult
  | TorsionCalculationResult;

// ============================================================================
// TYPE GUARDS
// 类型守卫
// ============================================================================

export function isCompressionDesign(design: SpringDesign): design is CompressionSpringDesign {
  return design.type === "compression";
}

export function isConicalDesign(design: SpringDesign): design is ConicalSpringDesign {
  return design.type === "conical";
}

export function isExtensionDesign(design: SpringDesign): design is ExtensionSpringDesign {
  return design.type === "extension";
}

export function isTorsionDesign(design: SpringDesign): design is TorsionSpringDesign {
  return design.type === "torsion";
}

export function isVariablePitchDesign(design: SpringDesign): design is VariablePitchCompressionDesign {
  return design.type === "variablePitchCompression";
}

// ============================================================================
// SUSPENSION SPRING GEOMETRY
// 减震器弹簧/悬架弹簧高级几何
// ============================================================================

export type PitchMode = "uniform" | "twoStage" | "threeStage";
export type DiameterMode = "constant" | "barrel" | "conical";

export type SuspensionEndType = "open" | "closed" | "closed_ground";

/**
 * Detailed end specification for suspension springs
 * 端部详细规格（汽车减震弹簧用）
 */
export interface SuspensionEndSpec {
  type: SuspensionEndType;
  /** Dead coil turns per end (typically 0.75~1.5) */
  closedTurnsPerEnd: number;
  /** Ground flat influence turns per end (typically 0.25~0.75), only for closed_ground */
  groundTurnsPerEnd?: number;
  /** Seat drop height adjustment (mm, optional) */
  seatDrop?: number;
  /** Extra end angle (turns, for tangential/pigtail ends - future) */
  endAngleExtra?: number;
}

export interface PitchProfile {
  mode: PitchMode;
  pitchCenter?: number;
  pitchEnd?: number;
  endClosedTurns?: number;
  transitionTurns?: number;
  /** Simple end type (backward compatible) */
  endType?: SuspensionEndType;
  /** Detailed end spec (advanced - overrides endType if present) */
  endSpec?: SuspensionEndSpec;
}

export interface DiameterProfile {
  mode: DiameterMode;
  DmStart?: number;
  DmMid?: number;
  DmEnd?: number;
}

export interface SuspensionGeometry {
  pitchProfile: PitchProfile;
  diameterProfile: DiameterProfile;
}

// ============================================================================
// VARIABLE PITCH COMPRESSION SPRING DESIGN
// 变节距压缩弹簧设计
// ============================================================================

export interface VariablePitchSegment {
  coils: number;
  pitch: number;
}

export interface VariablePitchCompressionDesign extends SpringDesignBase {
  type: "variablePitchCompression";
  /** Mean diameter Dm in millimeters */
  meanDiameter: number;
  /** Active coils Na0 at free state */
  activeCoils: number;
  /** Total coils Nt */
  totalCoils: number;
  /** Free length L0 in millimeters */
  freeLength?: number;
  /** Coil segments with varying pitch */
  segments: VariablePitchSegment[];
}

