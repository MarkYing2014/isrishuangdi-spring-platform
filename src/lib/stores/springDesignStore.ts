/**
 * Spring Design Store
 * 弹簧设计数据全局存储 - 单一真相源 (Single Source of Truth)
 * 
 * 架构原则：
 * 1. currentDesign (geometry) 是唯一的设计数据源
 * 2. CAD 导出、3D 预览、FreeCAD 都从这里读取
 * 3. 禁止在其他地方硬编码 type: "compression" 等值
 * 
 * TODO: 逐步将这些类型迁移到 springTypes.ts 统一管理
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SpringType, ExtensionHookType } from "@/lib/springTypes";
import type { SpringMaterialId } from "@/lib/materials/springMaterials";
import type { SpiralSpringMaterial } from "@/lib/spring3d/spiralSpringMaterials";

// ============================================================================
// 几何参数类型 (Store 专用，与 springTypes.ts 保持兼容)
// ============================================================================

/** 压缩弹簧几何参数 */
export interface CompressionGeometry {
  type: "compression";
  wireDiameter: number;
  meanDiameter: number;
  activeCoils: number;
  totalCoils: number;
  freeLength: number;
  pitch?: number;
  topGround?: boolean;
  bottomGround?: boolean;
  shearModulus?: number;
  materialId?: SpringMaterialId;
}

/** 拉伸弹簧几何参数 */
export interface ExtensionGeometry {
  type: "extension";
  wireDiameter: number;
  outerDiameter: number;
  meanDiameter?: number;
  activeCoils: number;
  bodyLength: number;
  freeLength?: number;
  hookType?: ExtensionHookType;
  initialTension?: number;
  shearModulus?: number;
  materialId?: SpringMaterialId;
}

/** 扭转弹簧几何参数 */
export interface TorsionGeometry {
  type: "torsion";
  wireDiameter: number;
  outerDiameter?: number;
  meanDiameter: number;
  activeCoils: number;
  bodyLength?: number;
  legLength1: number;
  legLength2: number;
  freeAngle?: number;
  workingAngle?: number;
  thetaDi?: number;
  thetaDo?: number;
  windingDirection?: "left" | "right";
  shearModulus?: number;
  materialId?: SpringMaterialId;
}

/** 锥形弹簧端面类型 */
export type ConicalEndType = "natural" | "closed" | "closed_ground";

/** 锥形弹簧几何参数 */
export interface ConicalGeometry {
  type: "conical";
  wireDiameter: number;
  largeOuterDiameter: number;
  smallOuterDiameter: number;
  activeCoils: number;
  totalCoils?: number;
  freeLength: number;
  endType?: ConicalEndType;  // 端面类型: natural=自然端, closed=并紧, closed_ground=并紧磨平
  shearModulus?: number;
  materialId?: SpringMaterialId;
}

/** 螺旋扭转弹簧几何参数 (带材卷绕式) */
export interface SpiralTorsionGeometry {
  type: "spiralTorsion";
  stripWidth: number;           // b - 带材宽度 (mm)
  stripThickness: number;       // t - 带材厚度 (mm)
  activeLength: number;         // L - 有效带材长度 (mm)
  innerDiameter: number;        // Di - 内径 (mm) - 空间校核
  outerDiameter: number;        // Do - 外径 (mm) - 空间校核
  activeCoils: number;          // Na - 有效圈数 - 参考
  preloadAngle: number;         // θ0 - 预紧角 (deg)
  minWorkingAngle: number;      // θ_min - 最小工作角度 (deg)
  maxWorkingAngle: number;      // θ_max - 最大工作角度 (deg)
  closeOutAngle: number;        // θ_co - close-out角 (deg)
  windingDirection?: "cw" | "ccw";
  innerEndType?: "fixed" | "free" | "guided";
  outerEndType?: "fixed" | "free" | "guided";
  materialId?: SpringMaterialId;
  spiralMaterialId?: SpiralSpringMaterial["id"];
}

/** 所有几何参数联合类型 - 这是 Store 的核心类型 */
export type SpringGeometry = 
  | CompressionGeometry 
  | ExtensionGeometry 
  | TorsionGeometry 
  | ConicalGeometry
  | SpiralTorsionGeometry;

// ============================================================================
// 材料信息
// ============================================================================

export interface MaterialInfo {
  id: SpringMaterialId;
  name: string;
  shearModulus: number;  // G (MPa)
  elasticModulus: number;  // E (MPa)
  density: number;  // kg/m³
  tensileStrength?: number;  // UTS (MPa)
  surfaceFactor?: number;
  tempFactor?: number;
}

// ============================================================================
// 分析结果
// ============================================================================

export interface AnalysisResult {
  // 基本计算结果
  springRate: number;  // 刚度 (N/mm 或 N·mm/deg)
  springRateUnit: "N/mm" | "N·mm/deg";
  
  // 载荷
  workingLoad?: number;  // 工作载荷 (N)
  maxLoad?: number;  // 最大载荷 (N)
  initialTension?: number; // 初拉力 (N) - 拉簧专用
  
  // 应力
  shearStress?: number;  // 剪切应力 (MPa)
  maxStress?: number;  // 最大应力 (MPa)
  wahlFactor?: number;  // Wahl 系数
  springIndex?: number;  // 旋绕比 C
  
  // 安全系数
  staticSafetyFactor?: number;  // 静态安全系数
  fatigueSafetyFactor?: number;  // 疲劳安全系数
  
  // 疲劳分析
  fatigueLife?: number;  // 疲劳寿命 (cycles)
  enduranceLimit?: number;  // 疲劳极限 (MPa)
  
  // 变形
  workingDeflection?: number;  // 工作变形 (mm)
  maxDeflection?: number;  // 最大变形 (mm)
  solidHeight?: number;  // 并紧高度 (mm)
}

// ============================================================================
// 设计元数据
// ============================================================================

export interface DesignMeta {
  designCode?: string;  // 设计编号
  projectName?: string;  // 项目名称
  designer?: string;  // 设计者
  createdAt: string;  // 创建时间
  updatedAt: string;  // 更新时间
  notes?: string;  // 备注
}

// ============================================================================
// Store 状态
// ============================================================================

interface SpringDesignState {
  // ========== 核心数据 (Single Source of Truth) ==========
  /** 
   * 当前设计 - 所有模块应该从这里读取
   * @deprecated 使用 geometry 字段，currentDesign 是别名
   */
  springType: SpringType | null;
  
  /**
   * 当前设计几何参数 - 这是真正的数据源
   * CAD 导出、3D 预览、FreeCAD 都应该读取这个字段
   */
  geometry: SpringGeometry | null;
  
  /** 材料信息 */
  material: MaterialInfo | null;
  
  /** 分析结果 */
  analysisResult: AnalysisResult | null;
  
  /** 设计元数据 */
  meta: DesignMeta | null;
  
  /** 是否有有效设计 */
  hasValidDesign: boolean;
  
  // ========== 操作方法 ==========
  setSpringType: (type: SpringType) => void;
  setGeometry: (geometry: SpringGeometry) => void;
  setMaterial: (material: MaterialInfo) => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setMeta: (meta: Partial<DesignMeta>) => void;
  
  /** 
   * 完整设置（计算器使用）
   * 所有计算器在计算完成后都应该调用这个方法
   */
  setDesign: (params: {
    springType: SpringType;
    geometry: SpringGeometry;
    material: MaterialInfo;
    analysisResult: AnalysisResult;
    meta?: Partial<DesignMeta>;
  }) => void;
  
  /** 清除所有数据 */
  clear: () => void;
}

// ============================================================================
// 辅助函数 - 类型守卫
// ============================================================================

/** 检查是否为压缩弹簧设计 */
export function isCompressionDesign(design: SpringGeometry | null): design is CompressionGeometry {
  return design?.type === "compression";
}

/** 检查是否为拉伸弹簧设计 */
export function isExtensionDesign(design: SpringGeometry | null): design is ExtensionGeometry {
  return design?.type === "extension";
}

/** 检查是否为扭转弹簧设计 */
export function isTorsionDesign(design: SpringGeometry | null): design is TorsionGeometry {
  return design?.type === "torsion";
}

/** 检查是否为锥形弹簧设计 */
export function isConicalDesign(design: SpringGeometry | null): design is ConicalGeometry {
  return design?.type === "conical";
}

// ============================================================================
// 创建 Store
// ============================================================================

export const useSpringDesignStore = create<SpringDesignState>()(
  persist(
    (set, get) => ({
      // 初始状态
      springType: null,
      geometry: null,
      material: null,
      analysisResult: null,
      meta: null,
      hasValidDesign: false,
      
      // 设置弹簧类型
      setSpringType: (type) => set({ 
        springType: type,
        hasValidDesign: false,
      }),
      
      // 设置几何参数
      setGeometry: (geometry) => set({ 
        geometry,
        springType: geometry.type,
        hasValidDesign: !!(geometry && get().material && get().analysisResult),
      }),
      
      // 设置材料
      setMaterial: (material) => set({ 
        material,
        hasValidDesign: !!(get().geometry && material && get().analysisResult),
      }),
      
      // 设置分析结果
      setAnalysisResult: (analysisResult) => set({ 
        analysisResult,
        hasValidDesign: !!(get().geometry && get().material && analysisResult),
      }),
      
      // 设置元数据
      setMeta: (metaUpdate) => set((state) => ({
        meta: {
          ...state.meta,
          ...metaUpdate,
          updatedAt: new Date().toISOString(),
        } as DesignMeta,
      })),
      
      // 完整设置（一次性设置所有数据）
      setDesign: ({ springType, geometry, material, analysisResult, meta }) => {
        const now = new Date().toISOString();
        set({
          springType,
          geometry,
          material,
          analysisResult,
          meta: {
            createdAt: get().meta?.createdAt ?? now,
            updatedAt: now,
            ...meta,
          },
          hasValidDesign: true,
        });
      },
      
      // 清除所有数据
      clear: () => set({
        springType: null,
        geometry: null,
        material: null,
        analysisResult: null,
        meta: null,
        hasValidDesign: false,
      }),
    }),
    {
      name: "spring-design-storage",
      // 只持久化部分数据
      partialize: (state) => ({
        springType: state.springType,
        geometry: state.geometry,
        material: state.material,
        analysisResult: state.analysisResult,
        meta: state.meta,
        hasValidDesign: state.hasValidDesign,
      }),
    }
  )
);

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成设计编号
 */
export function generateDesignCode(geometry: SpringGeometry): string {
  const prefixMap: Record<SpringGeometry["type"], string> = {
    compression: "CS",
    extension: "ES",
    torsion: "TS",
    conical: "CN",
    spiralTorsion: "STS",
  };
  const prefix = prefixMap[geometry.type];
  
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  
  // 螺旋扭转弹簧使用带材尺寸，其他使用线径
  if (geometry.type === "spiralTorsion") {
    const b = geometry.stripWidth.toFixed(1);
    const t = geometry.stripThickness.toFixed(2);
    return `${prefix}-${b}x${t}-${timestamp}`;
  }
  
  const d = geometry.wireDiameter.toFixed(1);
  let dim = "";
  if (geometry.type === "compression" || geometry.type === "torsion") {
    dim = geometry.meanDiameter.toFixed(0);
  } else if (geometry.type === "extension") {
    dim = geometry.outerDiameter.toFixed(0);
  } else if (geometry.type === "conical") {
    dim = geometry.largeOuterDiameter.toFixed(0);
  }
  
  return `${prefix}-${d}x${dim}-${timestamp}`;
}

/**
 * 从 geometry 获取 meanDiameter
 * 注意：螺旋扭转弹簧没有 meanDiameter 概念，返回 null
 * @returns meanDiameter (mm) 或 null（对于不适用的弹簧类型）
 */
export function getMeanDiameter(geometry: SpringGeometry): number | null {
  if (geometry.type === "compression" || geometry.type === "torsion") {
    return geometry.meanDiameter;
  } else if (geometry.type === "extension") {
    return geometry.outerDiameter - geometry.wireDiameter;
  } else if (geometry.type === "conical") {
    return (geometry.largeOuterDiameter + geometry.smallOuterDiameter) / 2 - geometry.wireDiameter;
  } else if (geometry.type === "spiralTorsion") {
    // ⚠️ 螺旋扭转弹簧不使用 meanDiameter 概念
    // 核心参数是 activeLength (L)，不是 Dm
    // 返回 null 明确表示"不适用"
    return null;
  }
  return null;
}

/** 检查是否为螺旋扭转弹簧设计 */
export function isSpiralTorsionDesign(design: SpringGeometry | null): design is SpiralTorsionGeometry {
  return design?.type === "spiralTorsion";
}
