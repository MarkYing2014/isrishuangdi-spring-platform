/**
 * Hook Parameters for CAD Export
 * 钩部参数用于 CAD 导出
 * 
 * 将 HookBuilder 的参数转换为 CAD 导出格式
 */

import type { ExtensionHookType } from "@/lib/springTypes";
import { getHookSpec, type HookSpec } from "@/lib/spring3d/HookBuilder";

/**
 * CAD 导出用钩部参数
 */
export interface CadHookParams {
  /** 钩类型 */
  hookType: ExtensionHookType;
  
  /** 环数量 (1 或 2) */
  loopCount: 1 | 2;
  
  /** 环角度 (度) */
  loopAngleDeg: number;
  
  /** 环半径 (mm) */
  loopRadius: number;
  
  /** 轴向间隙 (mm) */
  axialGap: number;
  
  /** 径向偏移 (mm) */
  radialOffset: number;
  
  /** 是否有延长段 */
  hasExtendedLeg: boolean;
  
  /** 延长段长度 (mm) */
  extendedLegLength: number;
  
  /** 环平面类型 */
  loopPlaneType: "axis-plane" | "orthogonal-plane";
  
  /** 环中心模式 */
  centerMode: "on-axis" | "radial-offset" | "crossover";
}

/**
 * 从 HookSpec 和几何参数计算 CAD 钩部参数
 */
export function calculateCadHookParams(
  hookType: ExtensionHookType,
  wireDiameter: number,
  meanDiameter: number
): CadHookParams {
  const spec = getHookSpec(hookType);
  const meanRadius = meanDiameter / 2;
  
  return {
    hookType,
    loopCount: spec.loopCount,
    loopAngleDeg: Math.abs(spec.loopAngleDeg),
    loopRadius: spec.hookRadiusFactor * meanRadius,
    axialGap: spec.axialGapFactor * wireDiameter,
    radialOffset: spec.radialOffsetFactor * wireDiameter,
    hasExtendedLeg: spec.hasExtendedLeg,
    extendedLegLength: spec.extendedLegLengthFactor * meanDiameter,
    loopPlaneType: spec.loopPlaneType,
    centerMode: spec.centerMode,
  };
}

/**
 * 钩类型标签（用于 CAD 图纸标注）
 */
export const HOOK_TYPE_LABELS: Record<ExtensionHookType, { en: string; zh: string }> = {
  machine: { en: "Machine Hook", zh: "机加工钩" },
  crossover: { en: "Crossover Hook", zh: "交叉钩" },
  side: { en: "Side Hook", zh: "侧钩" },
  extended: { en: "Extended Hook", zh: "延长钩" },
  doubleLoop: { en: "Double Loop", zh: "双环钩" },
};

/**
 * 生成钩部参数的 CAD 标注文本
 */
export function generateHookAnnotation(
  params: CadHookParams,
  language: "en" | "zh" = "en"
): string[] {
  const label = HOOK_TYPE_LABELS[params.hookType];
  const lines: string[] = [];
  
  lines.push(`Hook Type / 钩类型: ${label[language]}`);
  lines.push(`Loop Count / 环数: ${params.loopCount}`);
  lines.push(`Loop Angle / 环角度: ${params.loopAngleDeg}°`);
  lines.push(`Loop Radius / 环半径: ${params.loopRadius.toFixed(2)} mm`);
  lines.push(`Axial Gap / 轴向间隙: ${params.axialGap.toFixed(2)} mm`);
  
  if (params.radialOffset > 0) {
    lines.push(`Radial Offset / 径向偏移: ${params.radialOffset.toFixed(2)} mm`);
  }
  
  if (params.hasExtendedLeg) {
    lines.push(`Extended Leg / 延长段: ${params.extendedLegLength.toFixed(2)} mm`);
  }
  
  return lines;
}

/**
 * 将钩部参数转换为 Creo 参数格式
 * 用于 Creo Family Table 或 Relations
 */
export function toCreoParameters(params: CadHookParams): Record<string, string | number> {
  return {
    HOOK_TYPE: params.hookType.toUpperCase(),
    HOOK_LOOP_COUNT: params.loopCount,
    HOOK_LOOP_ANGLE: params.loopAngleDeg,
    HOOK_LOOP_RADIUS: params.loopRadius,
    HOOK_AXIAL_GAP: params.axialGap,
    HOOK_RADIAL_OFFSET: params.radialOffset,
    HOOK_HAS_EXTENDED_LEG: params.hasExtendedLeg ? "YES" : "NO",
    HOOK_EXTENDED_LEG_LENGTH: params.extendedLegLength,
    HOOK_PLANE_TYPE: params.loopPlaneType.toUpperCase().replace("-", "_"),
    HOOK_CENTER_MODE: params.centerMode.toUpperCase().replace("-", "_"),
  };
}
