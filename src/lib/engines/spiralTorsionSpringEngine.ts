/**
 * Spiral Torsion Spring Engine
 * 螺旋扭转弹簧计算引擎 - 独立模块，可供 Windsurf / CNC / CAD 复用
 * 
 * Reference: Handbook of Spring Design - Spiral Torsion Springs
 * 
 * Engineering formulas (PDF-consistent):
 * - Torque:      M = (π E b t³ θ_rev) / (6 L)     [N·mm]
 * - Spring rate: k_rev = (π E b t³) / (6 L)       [N·mm / revolution]
 * - Spring rate: k_deg = k_rev / 360              [N·mm / degree]
 * - Bending stress: σ = 6 M / (b t²)              [MPa]
 * 
 * Angle semantics:
 * - preloadAngle: pre-twist at installation (degrees)
 * - minWorkingAngle / maxWorkingAngle: additional rotation from installed position (degrees)
 * - Total angle = preloadAngle + workingAngle
 * 
 * Close-out behavior (per PDF):
 * - Linear region valid only up to close-out (~1 revolution = 360°)
 * - Beyond close-out: torque increases rapidly and non-linearly
 * - Handbook does NOT provide a reliable post-close-out model
 * - This engine does NOT compute torque beyond close-out limit
 */

import type { SpringMaterial, SpringMaterialId } from "@/lib/materials/springMaterials";
import { getSpringMaterial } from "@/lib/materials/springMaterials";

// ============================================================================
// Types
// ============================================================================

/** 设计准则类型 */
export type AllowableStressRule = "0.45_UTS" | "0.50_YS" | "0.30_UTS" | "custom";

/** 操作状态 */
export type OperatingStatus = "SAFE" | "WARNING" | "EXCEEDED";

/** 端部条件 */
export type EndCondition = "fixed" | "free" | "guided";

/** 绕向 */
export type WindingDirection = "cw" | "ccw";

/** 螺旋扭转弹簧输入参数 */
export interface SpiralTorsionSpringInput {
  // Strip geometry
  stripWidth: number;           // b - 带材宽度 (mm)
  stripThickness: number;       // t - 带材厚度 (mm)
  activeLength: number;         // L - 有效带材长度 (mm) - 直接输入
  innerDiameter: number;        // Di - 内径 (mm) - 仅用于空间校核
  outerDiameter: number;        // Do - 外径 (mm) - 仅用于空间校核
  activeCoils: number;          // Na - 有效圈数 - 仅用于参考
  
  // Working conditions
  preloadAngle: number;         // θ0 - 初始预紧角 (deg)
  minWorkingAngle: number;      // θ_min - 最小工作角度 (deg) - 额外转角
  maxWorkingAngle: number;      // θ_max - 最大工作角度 (deg) - 额外转角
  
  // Close-out parameters
  closeOutAngle: number;        // θ_co - close-out起点角 (deg), PDF: ~360° (1 rev)
  
  // Allowable stress
  allowableStressOverride: number | null;  // σ_allow (MPa) - 用户覆盖
  allowableStressRule: AllowableStressRule;
  
  // End conditions
  windingDirection: WindingDirection;
  innerEndType: EndCondition;
  outerEndType: EndCondition;
  
  // Material
  materialId: SpringMaterialId;
}

/** 曲线数据点 */
export interface CurvePoint {
  angle: number;              // θ (deg)
  torque: number;             // T (N·mm)
  region: "linear" | "closeout";
  stress: number;             // σ (MPa)
  flags: string[];
}

/** 螺旋扭转弹簧计算结果 */
export interface SpiralTorsionSpringResult {
  // Geometry
  innerDiameter: number;        // Di (mm) - 仅用于空间校核
  outerDiameter: number;        // Do (mm) - 仅用于空间校核
  activeLength: number;         // L - 有效带材长度 (mm)
  aspectRatio: number;          // b/t - 宽厚比
  
  // Material
  elasticModulus: number;       // E (MPa)
  allowableStress: number;      // σ_allow (MPa)
  allowableStressSource: string; // 来源说明
  tensileStrength: number | null; // UTS (MPa)
  
  // Spring rate
  springRateTheory: number;     // k_theory (N·mm/deg)
  springRateCorrected: number;  // k (N·mm/deg) with correction factors
  correctionFactorEnd: number;  // C_end
  correctionFactorPack: number; // C_pack
  
  // Torque at key points
  preloadTorque: number;        // T0 (N·mm)
  minTorque: number;            // T(θ_min) (N·mm)
  maxTorque: number;            // T(θ_max) (N·mm)
  closeOutTorque: number;       // T(θ_co) (N·mm)
  
  // Stress
  maxStressLinear: number;      // σ_max in linear region (MPa)
  maxStressCloseOut: number;    // σ_max in close-out region (MPa)
  stressConcentrationFactor: number; // Kt
  
  // Safety
  safetyFactorLinear: number;   // n = σ_allow / σ_max (linear)
  safetyFactorCloseOut: number; // n = σ_allow / σ_max (close-out)
  
  // Energy
  energyStored: number;         // U (N·mm = mJ)
  
  // Close-out indicators
  isInCloseOut: boolean;        // θ_max > θ_co
  closeOutGainFactor: number;   // 线性区始终为 1.0
  
  // Operating status
  operatingStatus: OperatingStatus;
  
  // Curve data for chart
  curvePoints: CurvePoint[];
  
  // Validation
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// ============================================================================
// Calculation Engine
// ============================================================================

/**
 * 计算螺旋扭转弹簧
 * @param input 输入参数
 * @returns 计算结果
 */
export function calculateSpiralTorsionSpring(input: SpiralTorsionSpringInput): SpiralTorsionSpringResult | null {
  const material = getSpringMaterial(input.materialId);
  if (!material) return null;
  
  return calculateWithMaterial(input, material);
}

/**
 * 使用指定材料计算螺旋扭转弹簧
 */
export function calculateWithMaterial(
  input: SpiralTorsionSpringInput,
  material: SpringMaterial
): SpiralTorsionSpringResult {
  const {
    stripWidth,
    stripThickness,
    activeLength,
    innerDiameter,
    outerDiameter,
    preloadAngle,
    minWorkingAngle,
    maxWorkingAngle,
    closeOutAngle,
    allowableStressOverride,
    allowableStressRule,
    innerEndType,
    outerEndType,
  } = input;
  
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // ---------------------------------------------------------------
  // 1) Geometry validation
  // ---------------------------------------------------------------
  if (outerDiameter <= innerDiameter) {
    warnings.push("空间校核：外径应大于内径 (Do > Di)");
  }
  if (outerDiameter <= innerDiameter + 2 * stripThickness) {
    warnings.push("空间校核：外径应满足 Do > Di + 2t");
  }
  if (stripWidth <= 0 || stripThickness <= 0) {
    errors.push("带材宽度和厚度必须大于0");
  }
  if (activeLength <= 0) {
    errors.push("有效带材长度必须大于0");
  }
  if (maxWorkingAngle < minWorkingAngle) {
    errors.push("最大工作角度必须大于最小工作角度");
  }
  
  // 单位防呆校验
  if (maxWorkingAngle > 0 && maxWorkingAngle <= 5) {
    warnings.push("⚠️ 角度值很小 (≤5°)，请确认输入的是度(°)而非圈数(rev)");
  }
  if (maxWorkingAngle > 720) {
    errors.push("❌ 工作角度过大 (>720°)，请确认输入的是度(°)而非圈数(rev)");
  }
  if (preloadAngle > 0 && preloadAngle <= 3) {
    warnings.push("⚠️ 预紧角很小 (≤3°)，请确认输入的是度(°)而非圈数(rev)");
  }
  
  // ---------------------------------------------------------------
  // 2) Calculate geometry
  // ---------------------------------------------------------------
  const aspectRatio = stripWidth / stripThickness;
  
  if (aspectRatio < 3) {
    warnings.push("宽厚比过低 (b/t < 3)，可能屈曲");
  } else if (aspectRatio > 20) {
    warnings.push("宽厚比过高 (b/t > 20)，成形困难");
  }
  
  if (closeOutAngle > 360) {
    warnings.push("close-out角度 > 360°，超出线性区典型范围");
  }
  
  // ---------------------------------------------------------------
  // 3) Material properties
  // ---------------------------------------------------------------
  const poissonRatio = 0.29;
  const elasticModulus = material.elasticModulus ?? 2 * material.shearModulus * (1 + poissonRatio);
  const tensileStrength = material.tensileStrength ?? null;
  
  // allowableStress 计算
  let allowableStress: number;
  let allowableStressSource: string;
  
  if (allowableStressOverride !== null && allowableStressOverride > 0) {
    allowableStress = allowableStressOverride;
    allowableStressSource = "用户自定义 / User Override";
  } else if (tensileStrength) {
    switch (allowableStressRule) {
      case "0.45_UTS":
        allowableStress = tensileStrength * 0.45;
        allowableStressSource = `0.45 × UTS (${tensileStrength} MPa) = ${allowableStress.toFixed(0)} MPa (经验默认，可配置)`;
        break;
      case "0.50_YS":
        allowableStress = tensileStrength * 0.85 * 0.50;
        allowableStressSource = `0.50 × YS (≈0.85×UTS) = ${allowableStress.toFixed(0)} MPa (经验默认，可配置)`;
        break;
      case "0.30_UTS":
        allowableStress = tensileStrength * 0.30;
        allowableStressSource = `0.30 × UTS (保守) = ${allowableStress.toFixed(0)} MPa (经验默认，可配置)`;
        break;
      default:
        allowableStress = tensileStrength * 0.45;
        allowableStressSource = `0.45 × UTS (默认) = ${allowableStress.toFixed(0)} MPa (经验默认，可配置)`;
    }
  } else {
    allowableStress = material.allowShearStatic * 1.25;
    allowableStressSource = `1.25 × τ_allow (${material.allowShearStatic} MPa) = ${allowableStress.toFixed(0)} MPa (无UTS数据，保守估计)`;
    warnings.push("材料无 UTS 数据，许用应力为保守估计值");
  }
  
  // ---------------------------------------------------------------
  // 4) Spring rate calculation - PDF formula
  // ---------------------------------------------------------------
  const springRateTheoryRev = (Math.PI * elasticModulus * stripWidth * Math.pow(stripThickness, 3)) / 
                               (6 * activeLength);
  const springRateTheory = springRateTheoryRev / 360;
  
  // Correction factors
  let correctionFactorEnd = 1.0;
  if (innerEndType === "fixed" && outerEndType === "fixed") {
    correctionFactorEnd = 1.0;
  } else if (innerEndType === "fixed" || outerEndType === "fixed") {
    correctionFactorEnd = 0.9;
  } else {
    correctionFactorEnd = 0.8;
  }
  
  const correctionFactorPack = 1.0;
  const springRateCorrected = springRateTheory * correctionFactorEnd * correctionFactorPack;
  
  // ---------------------------------------------------------------
  // 5) Torque calculations
  // ---------------------------------------------------------------
  const preloadTorque = springRateCorrected * preloadAngle;
  const minTorque = preloadTorque + springRateCorrected * minWorkingAngle;
  const closeOutTorque = preloadTorque + springRateCorrected * closeOutAngle;
  
  let maxTorque: number;
  let isInCloseOut = false;
  
  if (maxWorkingAngle <= closeOutAngle) {
    maxTorque = preloadTorque + springRateCorrected * maxWorkingAngle;
  } else {
    isInCloseOut = true;
    maxTorque = closeOutTorque;
    warnings.push("⚠️ 工作角度超过 close-out 限制 (θ > θ_co)");
    warnings.push("close-out 后扭矩急剧非线性增加，无法准确计算");
    warnings.push("建议：工作角度应 ≤ 0.8 × θ_co，或咨询制造商");
  }
  
  const closeOutGainFactor = 1.0;
  
  // ---------------------------------------------------------------
  // 6) Stress calculations
  // ---------------------------------------------------------------
  const maxStressLinear = (6 * (preloadTorque + springRateCorrected * Math.min(maxWorkingAngle, closeOutAngle))) / 
                          (stripWidth * Math.pow(stripThickness, 2));
  
  const maxStressCloseOut = isInCloseOut 
    ? (6 * maxTorque) / (stripWidth * Math.pow(stripThickness, 2))
    : maxStressLinear;
  
  let stressConcentrationFactor = 1.0;
  if (innerEndType === "fixed") {
    stressConcentrationFactor = 1.2;
  }
  
  const correctedStressLinear = maxStressLinear * stressConcentrationFactor;
  const correctedStressCloseOut = maxStressCloseOut * stressConcentrationFactor;
  
  // ---------------------------------------------------------------
  // 7) Safety factors
  // ---------------------------------------------------------------
  const safetyFactorLinear = allowableStress / correctedStressLinear;
  const safetyFactorCloseOut = allowableStress / correctedStressCloseOut;
  
  if (safetyFactorLinear < 1.0) {
    errors.push("线性区安全系数 < 1.0，应力超过许用值");
  } else if (safetyFactorLinear < 1.2) {
    warnings.push("线性区安全系数较低 (< 1.2)");
  }
  
  if (isInCloseOut && safetyFactorCloseOut < 1.0) {
    errors.push("close-out区安全系数 < 1.0，应力超过许用值");
  }
  
  // ---------------------------------------------------------------
  // 8) Energy stored
  // ---------------------------------------------------------------
  const thetaRad = maxWorkingAngle * (Math.PI / 180);
  const k_rad = springRateCorrected * (180 / Math.PI);
  
  let energyStored: number;
  if (!isInCloseOut) {
    energyStored = preloadTorque * thetaRad + 0.5 * k_rad * thetaRad * thetaRad;
  } else {
    const thetaCoRad = closeOutAngle * (Math.PI / 180);
    energyStored = preloadTorque * thetaCoRad + 0.5 * k_rad * thetaCoRad * thetaCoRad;
  }
  
  // ---------------------------------------------------------------
  // 9) Generate curve points
  // ---------------------------------------------------------------
  const curvePoints: CurvePoint[] = [];
  const numPoints = 50;
  const maxAngle = Math.max(maxWorkingAngle * 1.2, closeOutAngle * 1.1);
  
  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * maxAngle;
    let torque: number;
    let region: "linear" | "closeout";
    const flags: string[] = [];
    
    if (angle <= closeOutAngle) {
      torque = preloadTorque + springRateCorrected * angle;
      region = "linear";
    } else {
      torque = closeOutTorque;
      region = "closeout";
      flags.push("CLOSEOUT");
      flags.push("NO_CALC");
    }
    
    const stress = (6 * torque) / (stripWidth * Math.pow(stripThickness, 2)) * stressConcentrationFactor;
    
    if (stress > allowableStress) {
      flags.push("OVER_STRESS");
    }
    
    curvePoints.push({ angle, torque, region, stress, flags });
  }
  
  // ---------------------------------------------------------------
  // 10) Additional validations
  // ---------------------------------------------------------------
  if (maxWorkingAngle > closeOutAngle * 0.8 && maxWorkingAngle <= closeOutAngle) {
    warnings.push("建议工作角度 ≤ 0.8·θ_co 以保持安全裕度");
  }
  
  if (preloadAngle > 30) {
    warnings.push("预紧角过大 (> 30°)，可能有装配风险");
  }
  
  // ---------------------------------------------------------------
  // 11) Determine operating status
  // ---------------------------------------------------------------
  const thetaRev = maxWorkingAngle / 360;
  const closeOutRev = closeOutAngle / 360;
  let operatingStatus: OperatingStatus;
  
  if (thetaRev <= 0.8 * closeOutRev) {
    operatingStatus = "SAFE";
  } else if (thetaRev <= closeOutRev) {
    operatingStatus = "WARNING";
  } else {
    operatingStatus = "EXCEEDED";
  }
  
  return {
    innerDiameter,
    outerDiameter,
    activeLength,
    aspectRatio,
    elasticModulus,
    allowableStress,
    allowableStressSource,
    tensileStrength,
    springRateTheory,
    springRateCorrected,
    correctionFactorEnd,
    correctionFactorPack,
    preloadTorque,
    minTorque,
    maxTorque,
    closeOutTorque,
    maxStressLinear: correctedStressLinear,
    maxStressCloseOut: correctedStressCloseOut,
    stressConcentrationFactor,
    safetyFactorLinear,
    safetyFactorCloseOut,
    energyStored,
    isInCloseOut,
    closeOutGainFactor,
    operatingStatus,
    curvePoints,
    isValid: errors.length === 0 && safetyFactorLinear >= 1.0,
    warnings,
    errors,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 将角度从度转换为圈数
 */
export function degreesToRevolutions(degrees: number): number {
  return degrees / 360;
}

/**
 * 将角度从圈数转换为度
 */
export function revolutionsToDegrees(revolutions: number): number {
  return revolutions * 360;
}

/**
 * 生成设计编号
 */
export function generateDesignCode(input: SpiralTorsionSpringInput): string {
  const prefix = "STS"; // Spiral Torsion Spring
  const b = input.stripWidth.toFixed(1);
  const t = input.stripThickness.toFixed(2);
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  
  return `${prefix}-${b}x${t}-${timestamp}`;
}

/**
 * 验证输入参数
 */
export function validateInput(input: Partial<SpiralTorsionSpringInput>): string[] {
  const errors: string[] = [];
  
  if (!input.stripWidth || input.stripWidth <= 0) {
    errors.push("带材宽度必须大于0");
  }
  if (!input.stripThickness || input.stripThickness <= 0) {
    errors.push("带材厚度必须大于0");
  }
  if (!input.activeLength || input.activeLength <= 0) {
    errors.push("有效带材长度必须大于0");
  }
  if (input.maxWorkingAngle !== undefined && input.minWorkingAngle !== undefined) {
    if (input.maxWorkingAngle < input.minWorkingAngle) {
      errors.push("最大工作角度必须大于最小工作角度");
    }
  }
  
  return errors;
}
