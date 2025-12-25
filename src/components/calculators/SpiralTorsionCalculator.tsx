"use client";

/**
 * Spiral Torsion Spring Calculator
 * 螺旋扭转弹簧计算器（带材卷绕式）
 * 
 * Reference: Handbook of Spring Design - Spiral Torsion Springs
 * 
 * Engineering formulas (PDF-consistent):
 * - Torque:      M = (π E b t³ θ_rev) / (6 L)     [N·mm]
 * - Spring rate: k_rev = (π E b t³) / (6 L)       [N·mm / revolution]
 * - Spring rate: k_deg = k_rev / 360              [N·mm / degree]
 * - Bending stress: σ = 6 M / (b t²)              [MPa]
 * 
 * Where:
 * - b = strip width (mm)
 * - t = strip thickness (mm)
 * - L = active length of strip (mm) - directly input, NOT calculated from OD/ID
 * - E = elastic modulus (MPa)
 * - θ_rev = rotation angle in revolutions
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
 * - This calculator does NOT compute torque beyond close-out limit
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { DimensionHint } from "./DimensionHint";
import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { Calculator3DPreview } from "./Calculator3DPreview";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  useSpringDesignStore, 
  type SpiralTorsionGeometry,
  type MaterialInfo,
  type AnalysisResult,
} from "@/lib/stores/springDesignStore";
import {
  SPIRAL_SPRING_MATERIALS,
  getSpiralSpringMaterial,
  type SpiralSpringMaterial,
} from "@/lib/spring3d/spiralSpringMaterials";
import { buildSpiralSpringDesignRuleReport } from "@/lib/designRules";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";

// ================================================================
// Types
// ================================================================

interface FormValues {
  // Strip geometry
  stripWidth: number;           // b - 带材宽度 (mm)
  stripThickness: number;       // t - 带材厚度 (mm)
  activeLength: number;         // L - 有效带材长度 (mm) - 直接输入，不从OD/ID计算
  innerDiameter: number;        // Di - 内径 (mm) - 仅用于空间校核
  outerDiameter: number;        // Do - 外径 (mm) - 仅用于空间校核
  activeCoils: number;          // Na - 有效圈数 - 仅用于参考
  
  // Working conditions
  preloadAngle: number;         // θ0 - 初始预紧角 (deg)
  minWorkingAngle: number;      // θ_min - 最小工作角度 (deg)
  maxWorkingAngle: number;      // θ_max - 最大工作角度 (deg)
  
  // Close-out parameters
  closeOutAngle: number;        // θ_co - close-out起点角 (deg), PDF: ~360° (1 rev)
  
  // Allowable stress (user override)
  allowableStressOverride: number | null;  // σ_allow (MPa) - 用户可覆盖材料默认值
  allowableStressRule: "0.45_UTS" | "0.50_YS" | "0.30_UTS" | "custom";  // 设计准则
  
  // End conditions
  windingDirection: "cw" | "ccw";
  innerEndType: "fixed" | "free" | "guided";
  outerEndType: "fixed" | "free" | "guided";
}

// Operating status for UI control
type OperatingStatus = "SAFE" | "WARNING" | "EXCEEDED";

interface SpiralTorsionResults {
  // Geometry
  innerDiameter: number;        // Di (mm) - 仅用于空间校核
  outerDiameter: number;        // Do (mm) - 仅用于空间校核
  activeLength: number;         // L - 有效带材长度 (mm) - 用于计算
  aspectRatio: number;          // b/t - 宽厚比
  
  // Material
  elasticModulus: number;       // E (MPa)
  allowableStress: number;      // σ_allow (MPa)
  allowableStressSource: string; // 来源说明 (e.g., "0.45 × UTS (经验默认)")
  tensileStrength: number | null; // UTS (MPa) - 用于显示
  
  // Spring rate
  springRateTheory: number;     // k_theory (N·mm/deg)
  springRateCorrected: number;  // k (N·mm/deg) with correction factors
  correctionFactorEnd: number;  // C_end - 端部修正系数
  correctionFactorPack: number; // C_pack - 叠层修正系数
  
  // Torque at key points
  preloadTorque: number;        // T0 (N·mm)
  minTorque: number;            // T(θ_min) (N·mm)
  maxTorque: number;            // T(θ_max) (N·mm)
  closeOutTorque: number;       // T(θ_co) (N·mm)
  
  // Stress
  maxStressLinear: number;      // σ_max in linear region (MPa)
  maxStressCloseOut: number;    // σ_max in close-out region (MPa)
  stressConcentrationFactor: number; // Kt - 端部应力集中系数
  
  // Safety
  safetyFactorLinear: number;   // n = σ_allow / σ_max (linear)
  safetyFactorCloseOut: number; // n = σ_allow / σ_max (close-out)
  
  // Energy
  energyStored: number;         // U = ∫T dθ (N·mm·rad)
  
  // Close-out indicators
  isInCloseOut: boolean;        // θ_max > θ_co
  closeOutGainFactor: number;   // 急剧增益系数
  
  // Operating status for UI control
  operatingStatus: OperatingStatus;  // SAFE / WARNING / EXCEEDED
  
  // Curve data for chart
  curvePoints: Array<{
    angle: number;              // θ (deg)
    torque: number;             // T (N·mm)
    region: "linear" | "closeout";
    stress: number;             // σ (MPa)
    flags: string[];
  }>;
  
  // Validation
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

// ================================================================
// Calculation Functions
// ================================================================

/**
 * Calculate spiral torsion spring properties
 */
function calculateSpiralTorsionSpring(
  stripWidth: number,           // b (mm)
  stripThickness: number,       // t (mm)
  activeLength: number,         // L (mm) - 直接输入的有效带材长度
  innerDiameter: number,        // Di (mm) - 仅用于空间校核
  outerDiameter: number,        // Do (mm) - 仅用于空间校核
  activeCoils: number,          // Na - 仅用于参考
  preloadAngle: number,         // θ0 (deg)
  minWorkingAngle: number,      // θ_min (deg)
  maxWorkingAngle: number,      // θ_max (deg)
  closeOutAngle: number,        // θ_co (deg)
  innerEndType: string,
  outerEndType: string,
  allowableStressOverride: number | null,  // 用户覆盖值
  allowableStressRule: FormValues["allowableStressRule"],  // 设计准则 (类型收紧)
  material: SpiralSpringMaterial
): SpiralTorsionResults {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // ---------------------------------------------------------------
  // 1) Geometry validation (OD/ID 仅用于空间校核，不参与计算)
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
  
  // ---------------------------------------------------------------
  // 单位防呆校验 (Hard Guard) - 防止 rev 被当成 deg
  // ---------------------------------------------------------------
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
  // 2) Calculate geometry (OD/ID 不参与扭矩/应力计算)
  // ---------------------------------------------------------------
  const aspectRatio = stripWidth / stripThickness;
  
  // Aspect ratio validation
  if (aspectRatio < 3) {
    warnings.push("宽厚比过低 (b/t < 3)，可能屈曲");
  } else if (aspectRatio > 20) {
    warnings.push("宽厚比过高 (b/t > 20)，成形困难");
  }
  
  // Close-out angle validation (PDF: linear only up to ~360°)
  if (closeOutAngle > 360) {
    warnings.push("close-out角度 > 360°，超出线性区典型范围");
  }
  
  // ---------------------------------------------------------------
  // 3) Material properties
  // ---------------------------------------------------------------
  const elasticModulus = material.elasticModulus_MPa;
  const tensileStrength = material.ultimateStrength_MPa;
  const yieldStrength = material.yieldStrength_MPa;
  
  // For spiral torsion springs, the primary stress is BENDING stress (not shear)
  // allowableStress: 用户可覆盖，否则根据设计准则计算
  let allowableStress: number;
  let allowableStressSource: string;
  
  if (allowableStressOverride !== null && allowableStressOverride > 0) {
    // 用户自定义覆盖值
    allowableStress = allowableStressOverride;
    allowableStressSource = "用户自定义 / User Override";
  } else {
    // 根据设计准则计算
    switch (allowableStressRule) {
      case "0.45_UTS":
        allowableStress = tensileStrength * 0.45;
        allowableStressSource = `0.45 × UTS (${tensileStrength} MPa) = ${allowableStress.toFixed(0)} MPa (经验默认，可配置)`;
        break;
      case "0.50_YS":
        allowableStress = yieldStrength * 0.50;
        allowableStressSource = `0.50 × YS (${yieldStrength} MPa) = ${allowableStress.toFixed(0)} MPa (屈服强度准则)`;
        break;
      case "0.30_UTS":
        allowableStress = tensileStrength * 0.30;
        allowableStressSource = `0.30 × UTS (保守) = ${allowableStress.toFixed(0)} MPa (经验默认，可配置)`;
        break;
      default:
        allowableStress = tensileStrength * 0.45;
        allowableStressSource = `0.45 × UTS (默认) = ${allowableStress.toFixed(0)} MPa (经验默认，可配置)`;
    }
  }
  
  // ---------------------------------------------------------------
  // 4) Spring rate calculation - 使用 PDF 正确公式
  // ---------------------------------------------------------------
  // PDF 公式: M = πEbt³θ/(6L)，其中 θ 是 revolutions
  // 扭转刚度: k = πEbt³/(6L) in N·mm/revolution
  const springRateTheoryRev = (Math.PI * elasticModulus * stripWidth * Math.pow(stripThickness, 3)) / 
                               (6 * activeLength);
  
  // Convert to N·mm/deg (1 revolution = 360°)
  const springRateTheory = springRateTheoryRev / 360;
  
  // Correction factors
  // C_end: end condition factor (fixed-fixed = 1.0, fixed-free = 0.8, etc.)
  let correctionFactorEnd = 1.0;
  if (innerEndType === "fixed" && outerEndType === "fixed") {
    correctionFactorEnd = 1.0;
  } else if (innerEndType === "fixed" || outerEndType === "fixed") {
    correctionFactorEnd = 0.9;
  } else {
    correctionFactorEnd = 0.8;
  }
  
  // C_pack: packing/manufacturing factor (default 0.95)
  const correctionFactorPack = 0.95;
  
  // Corrected spring rate
  const springRateCorrected = springRateTheory * correctionFactorEnd * correctionFactorPack;
  
  // ---------------------------------------------------------------
  // 5) Torque calculations
  // ---------------------------------------------------------------
  const preloadTorque = springRateCorrected * preloadAngle;
  const minTorque = preloadTorque + springRateCorrected * minWorkingAngle;
  
  // Close-out torque (at θ_co)
  const closeOutTorque = preloadTorque + springRateCorrected * closeOutAngle;
  
  // Max torque - depends on whether we're in close-out region
  let maxTorque: number;
  let isInCloseOut = false;
  
  if (maxWorkingAngle <= closeOutAngle) {
    // Linear region only - 正常计算
    maxTorque = preloadTorque + springRateCorrected * maxWorkingAngle;
  } else {
    // ⚠️ 根据 PDF 纠偏：close-out 后不应继续计算真实扭矩
    // 只显示线性上限值 + 警告（从 errors 改为 warnings，不影响 isValid）
    isInCloseOut = true;
    maxTorque = closeOutTorque; // 只显示 close-out 起点的扭矩
    warnings.push("⚠️ 工作角度超过 close-out 限制 (θ > θ_co)");
    warnings.push("close-out 后扭矩急剧非线性增加，无法准确计算");
    warnings.push("建议：工作角度应 ≤ 0.8 × θ_co，或咨询制造商");
  }
  
  // Close-out gain factor - 不再计算，因为 close-out 后不给真实数值
  const closeOutGainFactor = 1.0; // 线性区始终为 1.0
  
  // ---------------------------------------------------------------
  // 6) Stress calculations
  // ---------------------------------------------------------------
  // Bending stress: σ = 6·T / (b·t²)
  const maxStressLinear = (6 * (preloadTorque + springRateCorrected * Math.min(maxWorkingAngle, closeOutAngle))) / 
                          (stripWidth * Math.pow(stripThickness, 2));
  
  const maxStressCloseOut = isInCloseOut 
    ? (6 * maxTorque) / (stripWidth * Math.pow(stripThickness, 2))
    : maxStressLinear;
  
  // Stress concentration factor (end effects)
  let stressConcentrationFactor = 1.0;
  if (innerEndType === "fixed") {
    stressConcentrationFactor = 1.2; // Inner end typically has higher stress
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
  // 8) Energy stored (单位: N·mm = mJ)
  // ---------------------------------------------------------------
  // Linear region: U = ∫T dθ = ∫(T0 + k·θ)dθ = T0·θ + 0.5·k·θ²
  // 注意: k 是 N·mm/deg，θ 需要转换为 rad 以得到正确的能量单位
  let energyStored: number;
  const thetaRad = maxWorkingAngle * (Math.PI / 180);
  
  // 清晰的单位转换: k_deg → k_rad
  const k_rad = springRateCorrected * (180 / Math.PI); // N·mm/rad
  
  if (!isInCloseOut) {
    // 线性区能量计算: U = T0·θ + 0.5·k·θ² (θ in rad)
    energyStored = preloadTorque * thetaRad + 0.5 * k_rad * thetaRad * thetaRad;
  } else {
    // ⚠️ close-out 后不计算能量，只计算到 close-out 点
    const thetaCoRad = closeOutAngle * (Math.PI / 180);
    energyStored = preloadTorque * thetaCoRad + 0.5 * k_rad * thetaCoRad * thetaCoRad;
  }
  
  // ---------------------------------------------------------------
  // 9) Generate curve points for chart
  // ---------------------------------------------------------------
  const curvePoints: SpiralTorsionResults["curvePoints"] = [];
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
      // ⚠️ close-out 后不计算真实扭矩，只显示线性上限
      torque = closeOutTorque; // 固定在 close-out 点的扭矩
      region = "closeout";
      flags.push("CLOSEOUT");
      flags.push("NO_CALC"); // 标记：此区域不可计算
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
    // Geometry
    innerDiameter,
    outerDiameter,
    activeLength,
    aspectRatio,
    
    // Material
    elasticModulus,
    allowableStress,
    allowableStressSource,
    tensileStrength,
    
    // Spring rate
    springRateTheory,
    springRateCorrected,
    correctionFactorEnd,
    correctionFactorPack,
    
    // Torque
    preloadTorque,
    minTorque,
    maxTorque,
    closeOutTorque,
    
    // Stress
    maxStressLinear: correctedStressLinear,
    maxStressCloseOut: correctedStressCloseOut,
    stressConcentrationFactor,
    
    // Safety
    safetyFactorLinear,
    safetyFactorCloseOut,
    
    // Energy
    energyStored,
    
    // Close-out
    isInCloseOut,
    closeOutGainFactor,
    
    // Operating status
    operatingStatus,
    
    // Curve
    curvePoints,
    
    // Validation
    isValid: errors.length === 0 && safetyFactorLinear >= 1.0,
    warnings,
    errors,
  };
}

// ================================================================
// Component
// ================================================================

export function SpiralTorsionCalculator() {
  const router = useRouter();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [materialId, setMaterialId] = useState<SpiralSpringMaterial["id"]>("sae1095");
  
  // 使用 useRef 跟踪是否已初始化，避免无限循环
  const initializedRef = useRef(false);
  
  // 在组件外部获取 Store 数据的快照（只在首次挂载时读取一次）
  const storeSnapshotRef = useRef<{
    geometry: ReturnType<typeof useSpringDesignStore.getState>['geometry'];
  } | null>(null);
  
  // 只在首次渲染时获取 Store 快照
  if (storeSnapshotRef.current === null) {
    storeSnapshotRef.current = {
      geometry: useSpringDesignStore.getState().geometry,
    };
  }
  
  const storedGeometry = storeSnapshotRef.current.geometry;
  const hasSpiralDesign = storedGeometry?.type === "spiralTorsion";

  const form = useForm<FormValues>({
    mode: "onChange",
    defaultValues: hasSpiralDesign ? {
      stripWidth: storedGeometry.stripWidth,
      stripThickness: storedGeometry.stripThickness,
      activeLength: storedGeometry.activeLength,
      innerDiameter: storedGeometry.innerDiameter,
      outerDiameter: storedGeometry.outerDiameter,
      activeCoils: storedGeometry.activeCoils,
      preloadAngle: storedGeometry.preloadAngle,
      minWorkingAngle: storedGeometry.minWorkingAngle,
      maxWorkingAngle: storedGeometry.maxWorkingAngle,
      closeOutAngle: storedGeometry.closeOutAngle,
      allowableStressOverride: null,
      allowableStressRule: "0.45_UTS",
      windingDirection: storedGeometry.windingDirection ?? "cw",
      innerEndType: storedGeometry.innerEndType ?? "fixed",
      outerEndType: storedGeometry.outerEndType ?? "fixed",
    } : {
      // Strip geometry
      stripWidth: 10,
      stripThickness: 0.5,
      activeLength: 500,
      innerDiameter: 15,
      outerDiameter: 50,
      activeCoils: 5,
      // Working conditions
      preloadAngle: 0,
      minWorkingAngle: 0,
      maxWorkingAngle: 90,
      // Close-out parameters
      closeOutAngle: 360,
      // Allowable stress
      allowableStressOverride: null,
      allowableStressRule: "0.45_UTS",
      // End conditions
      windingDirection: "cw",
      innerEndType: "fixed",
      outerEndType: "fixed",
    },
  });

  const { errors } = form.formState;

  // 在组件首次挂载时恢复 submitted 状态和材料 ID
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    if (hasSpiralDesign && storedGeometry.spiralMaterialId) {
      const m = getSpiralSpringMaterial(storedGeometry.spiralMaterialId);
      if (m) {
        setMaterialId(m.id);
        setSubmitted(true);
      }
    }
  }, [hasSpiralDesign, storedGeometry]);

  const watchedValues = form.watch();

  const btRatio =
    isFinite(watchedValues.stripWidth ?? NaN) && isFinite(watchedValues.stripThickness ?? NaN) && (watchedValues.stripThickness ?? 0) > 0
      ? (watchedValues.stripWidth ?? 0) / (watchedValues.stripThickness ?? 1)
      : null;

  const results = useMemo((): SpiralTorsionResults | null => {
    // if (!submitted) return null; // Reactive calculation

    const material = getSpiralSpringMaterial(materialId);
    if (!material) return null;
    
    return calculateSpiralTorsionSpring(
      watchedValues.stripWidth ?? 10,
      watchedValues.stripThickness ?? 0.5,
      watchedValues.activeLength ?? 500,  // L - 有效带材长度
      watchedValues.innerDiameter ?? 15,
      watchedValues.outerDiameter ?? 50,
      watchedValues.activeCoils ?? 5,
      watchedValues.preloadAngle ?? 0,
      watchedValues.minWorkingAngle ?? 0,
      watchedValues.maxWorkingAngle ?? 90,
      watchedValues.closeOutAngle ?? 360,  // PDF: 线性区约 1 revolution
      watchedValues.innerEndType ?? "fixed",
      watchedValues.outerEndType ?? "fixed",
      watchedValues.allowableStressOverride ?? null,  // 用户覆盖值
      watchedValues.allowableStressRule ?? "0.45_UTS",  // 设计准则
      material
    );
  }, [watchedValues, materialId]);

  const unifiedAudit = useMemo(() => {
    if (!results) return null;
    return AuditEngine.evaluate({
      springType: "spiralTorsion",
      geometry: {
        type: "spiralTorsion",
        ...watchedValues,
      },
      results: {
        ...results,
        maxStress: results.maxStressLinear,
      },
    });
  }, [results, watchedValues]);

  const designRuleReport = useMemo(() => {
    const geometry: SpiralTorsionGeometry = {
      type: "spiralTorsion",
      stripWidth: watchedValues.stripWidth ?? 10,
      stripThickness: watchedValues.stripThickness ?? 0.5,
      activeLength: watchedValues.activeLength ?? 500,
      innerDiameter: watchedValues.innerDiameter ?? 15,
      outerDiameter: watchedValues.outerDiameter ?? 50,
      activeCoils: watchedValues.activeCoils ?? 5,
      preloadAngle: watchedValues.preloadAngle ?? 0,
      minWorkingAngle: watchedValues.minWorkingAngle ?? 0,
      maxWorkingAngle: watchedValues.maxWorkingAngle ?? 90,
      closeOutAngle: watchedValues.closeOutAngle ?? 360,
      windingDirection: watchedValues.windingDirection ?? "cw",
      innerEndType: watchedValues.innerEndType ?? "fixed",
      outerEndType: watchedValues.outerEndType ?? "fixed",
      spiralMaterialId: materialId,
    };

    const analysisResult: AnalysisResult | null = results
      ? {
          springRate: results.springRateCorrected,
          springRateUnit: "N·mm/deg",
          maxStress: results.maxStressLinear,
          staticSafetyFactor: results.safetyFactorLinear,
          workingDeflection: watchedValues.maxWorkingAngle ?? 90,
          maxDeflection: watchedValues.closeOutAngle ?? 360,
        }
      : null;

    return buildSpiralSpringDesignRuleReport({
      geometry,
      analysisResult,
    });
  }, [watchedValues, materialId, results]);

  // 获取全局 Store 的 setDesign 方法
  const setDesign = useSpringDesignStore((state) => state.setDesign);

  // 当计算结果有效时，保存到全局 Store
  useEffect(() => {
    if (results?.isValid) {
      const material = getSpiralSpringMaterial(materialId);
      if (!material) return;

      // 构建几何参数
      const geometry: SpiralTorsionGeometry = {
        type: "spiralTorsion",
        stripWidth: watchedValues.stripWidth ?? 10,
        stripThickness: watchedValues.stripThickness ?? 0.5,
        activeLength: watchedValues.activeLength ?? 500,
        innerDiameter: watchedValues.innerDiameter ?? 15,
        outerDiameter: watchedValues.outerDiameter ?? 50,
        activeCoils: watchedValues.activeCoils ?? 5,
        preloadAngle: watchedValues.preloadAngle ?? 0,
        minWorkingAngle: watchedValues.minWorkingAngle ?? 0,
        maxWorkingAngle: watchedValues.maxWorkingAngle ?? 90,
        closeOutAngle: watchedValues.closeOutAngle ?? 360,
        windingDirection: watchedValues.windingDirection ?? "cw",
        innerEndType: watchedValues.innerEndType ?? "fixed",
        outerEndType: watchedValues.outerEndType ?? "fixed",
        spiralMaterialId: materialId,
      };

      // 构建材料信息
      const materialInfo: MaterialInfo = {
        id: material.id as any,
        name: material.name,
        shearModulus: material.elasticModulus_MPa / 2.6,
        elasticModulus: results.elasticModulus,
        density: 7850,
        tensileStrength: results.tensileStrength ?? undefined,
      };

      // 构建分析结果
      const analysisResult: AnalysisResult = {
        springRate: results.springRateCorrected,
        springRateUnit: "N·mm/deg",
        maxStress: results.maxStressLinear,
        staticSafetyFactor: results.safetyFactorLinear,
        workingDeflection: watchedValues.maxWorkingAngle ?? 90,
        maxDeflection: watchedValues.closeOutAngle ?? 360,
      };

      // 保存到全局 Store
      setDesign({
        springType: "spiralTorsion",
        geometry,
        material: materialInfo,
        analysisResult,
        meta: {
          designCode: `STS-${(watchedValues.stripWidth ?? 10).toFixed(1)}x${(watchedValues.stripThickness ?? 0.5).toFixed(2)}`,
          notes: `Operating Status: ${results.operatingStatus}`,
        },
      });
    }
  }, [results, watchedValues, materialId, setDesign]);

  const onSubmit = () => {
    setSubmitted(true);
  };

  const handleMaterialChange = (material: SpiralSpringMaterial) => {
    setMaterialId(material.id);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2 space-y-6">
        <DesignRulePanel report={designRuleReport} title="Design Rules / 设计规则" />
        
        {unifiedAudit && (
          <EngineeringAuditCard 
            audit={unifiedAudit} 
            governingVariable="Δθ" 
          />
        )}
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Spiral Torsion Spring / 螺旋扭转弹簧（带材卷绕式）</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Strip Geometry Section */}
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium text-muted-foreground">Strip Geometry / 带材几何</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <DimensionHint code="b" label="Strip Width" description="带材宽度，弹簧的轴向尺寸。" />
                  <Label htmlFor="stripWidth">Width b (mm) / 带材宽度</Label>
                  <Controller
                    control={form.control}
                    name="stripWidth"
                    rules={{ required: "b is required", min: { value: 0.001, message: "b must be > 0" } }}
                    render={({ field }) => (
                      <NumericInput
                        id="stripWidth"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        step={0.1}
                      />
                    )}
                  />
                  {errors.stripWidth?.message && (
                    <p className="text-xs text-red-600 dark:text-red-300">{String(errors.stripWidth.message)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <DimensionHint code="t" label="Strip Thickness" description="带材厚度，影响刚度和应力。" />
                  <Label htmlFor="stripThickness">Thickness t (mm) / 带材厚度</Label>
                  <Controller
                    control={form.control}
                    name="stripThickness"
                    rules={{ required: "t is required", min: { value: 0.001, message: "t must be > 0" } }}
                    render={({ field }) => (
                      <NumericInput
                        id="stripThickness"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        step={0.01}
                      />
                    )}
                  />
                  {errors.stripThickness?.message && (
                    <p className="text-xs text-red-600 dark:text-red-300">{String(errors.stripThickness.message)}</p>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                b/t = {btRatio === null || !isFinite(btRatio) ? "—" : btRatio.toFixed(2)}
                {btRatio !== null && isFinite(btRatio) && (btRatio < 6 || btRatio > 60)
                  ? " (out of recommended range 6–60)"
                  : ""}
                {(watchedValues.stripThickness ?? 0) > 0 && (watchedValues.stripThickness ?? 0) < 0.05
                  ? " | t is very small; check input units"
                  : ""}
              </div>

              {/* 有效带材长度 - 关键参数，直接输入 */}
              <div className="space-y-2">
                <DimensionHint code="L" label="Active Length" description="有效带材长度，用于扭矩计算。这是关键参数，直接影响刚度。" />
                <Label htmlFor="activeLength">Active Length L (mm) / 有效带材长度 ⭐</Label>
                <Controller
                  control={form.control}
                  name="activeLength"
                  rules={{ required: "L is required", min: { value: 0.1, message: "L must be > 0" } }}
                  render={({ field }) => (
                    <NumericInput
                      id="activeLength"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      step={1}
                    />
                  )}
                />
                {errors.activeLength?.message && (
                  <p className="text-xs text-red-600 dark:text-red-300">{String(errors.activeLength.message)}</p>
                )}
                <p className="text-xs text-muted-foreground">关键参数：直接用于扭矩公式 M = πEbt³θ/(6L)</p>
              </div>

              {/* OD/ID 仅用于空间校核 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <DimensionHint code="Di" label="Inner Diameter" description="内径，仅用于空间校核，不参与扭矩计算。" />
                  <Label htmlFor="innerDiameter" className="text-muted-foreground">Inner Dia Di (mm) / 内径 (空间校核)</Label>
                  <Controller
                    control={form.control}
                    name="innerDiameter"
                    render={({ field }) => (
                      <NumericInput
                        id="innerDiameter"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        step={0.1}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <DimensionHint code="Do" label="Outer Diameter" description="外径，仅用于空间校核，不参与扭矩计算。" />
                  <Label htmlFor="outerDiameter" className="text-muted-foreground">Outer Dia Do (mm) / 外径 (空间校核)</Label>
                  <Controller
                    control={form.control}
                    name="outerDiameter"
                    render={({ field }) => (
                      <NumericInput
                        id="outerDiameter"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        step={0.1}
                      />
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <DimensionHint code="Na" label="Active Coils" description="有效圈数，仅用于参考。" />
                <Label htmlFor="activeCoils" className="text-muted-foreground">Active Coils Na / 有效圈数 (参考)</Label>
                <Controller
                  control={form.control}
                  name="activeCoils"
                  render={({ field }) => (
                    <NumericInput
                      id="activeCoils"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      step={0.5}
                    />
                  )}
                />
              </div>
            </div>

            {/* Working Conditions Section - 带角度单位防错提示 */}
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium text-muted-foreground">Working Conditions / 工作条件</p>
              
              {/* 工程提示条 - 常驻 (中英文) */}
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-2">
                <p className="text-xs text-blue-600">
                  ℹ️ <strong>Engineering Note / 工程提示:</strong> Spiral torsion spring formulas use <strong>revolutions</strong> internally. Your input in <strong>degrees (°)</strong> will be automatically converted.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  螺旋扭转弹簧公式内部使用<strong>圈数(rev)</strong>计算。您输入的<strong>度(°)</strong>将自动转换。
                </p>
              </div>
              
              <div className="space-y-2">
                <DimensionHint code="θ0" label="Preload Angle" description="初始预紧角，安装时的预扭转角度。" />
                <Label htmlFor="preloadAngle">Preload Angle θ0 (°) / 预紧角</Label>
                <Controller
                  control={form.control}
                  name="preloadAngle"
                  render={({ field }) => (
                    <NumericInput
                      id="preloadAngle"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      step={1}
                      decimalScale={0}
                    />
                  )}
                />
                {/* 实时显示 revolution 换算 */}
                <p className="text-xs text-muted-foreground">
                  = {((watchedValues.preloadAngle ?? 0) / 360).toFixed(3)} revolution
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <DimensionHint code="θmin" label="Min Working Angle" description="最小工作角度，相对中性位。" />
                  <Label htmlFor="minWorkingAngle">Min Angle θmin (°) / 最小角度</Label>
                  <Controller
                    control={form.control}
                    name="minWorkingAngle"
                    rules={{
                      validate: (v) =>
                        !isFinite(v) || v <= (form.getValues("maxWorkingAngle") ?? v) || "θmin must be ≤ θmax",
                    }}
                    render={({ field }) => (
                      <NumericInput
                        id="minWorkingAngle"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        step={1}
                        decimalScale={0}
                      />
                    )}
                  />
                  {errors.minWorkingAngle?.message && (
                    <p className="text-xs text-red-600 dark:text-red-300">{String(errors.minWorkingAngle.message)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    = {((watchedValues.minWorkingAngle ?? 0) / 360).toFixed(3)} revolution
                  </p>
                </div>
                <div className="space-y-2">
                  <DimensionHint code="θmax" label="Max Working Angle" description="最大工作角度，相对中性位。" />
                  <Label htmlFor="maxWorkingAngle">Max Angle θmax (°) / 最大角度</Label>
                  <Controller
                    control={form.control}
                    name="maxWorkingAngle"
                    rules={{
                      validate: (v) =>
                        !isFinite(v) || v >= (form.getValues("minWorkingAngle") ?? v) || "θmax must be ≥ θmin",
                    }}
                    render={({ field }) => (
                      <NumericInput
                        id="maxWorkingAngle"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        step={1}
                        decimalScale={0}
                      />
                    )}
                  />
                  {errors.maxWorkingAngle?.message && (
                    <p className="text-xs text-red-600 dark:text-red-300">{String(errors.maxWorkingAngle.message)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    = {((watchedValues.maxWorkingAngle ?? 0) / 360).toFixed(3)} revolution
                  </p>
                </div>
              </div>

              {/* Close-out 联动状态提示 */}
              {(() => {
                const thetaRev = (watchedValues.maxWorkingAngle ?? 0) / 360;
                const closeOutRev = (watchedValues.closeOutAngle ?? 360) / 360;
                
                if (thetaRev <= 0.8 * closeOutRev) {
                  return (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2">
                      <p className="text-xs text-emerald-600">
                        ✓ Linear operating range (≤ {(0.8 * closeOutRev).toFixed(2)} rev)
                      </p>
                    </div>
                  );
                } else if (thetaRev <= closeOutRev) {
                  return (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
                      <p className="text-xs text-amber-600">
                        ⚠️ Approaching close-out ({(0.8 * closeOutRev).toFixed(2)} – {closeOutRev.toFixed(2)} rev)
                      </p>
                    </div>
                  );
                } else {
                  return (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2">
                      <p className="text-xs text-red-600">
                        ❌ Close-out exceeded — Torque is no longer linear beyond {closeOutRev.toFixed(2)} rev
                      </p>
                    </div>
                  );
                }
              })()}
            </div>

            {/* End Conditions */}
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium text-muted-foreground">End Conditions / 端部条件</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inner End / 内端</Label>
                  <select 
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    {...form.register("innerEndType")}
                  >
                    <option value="fixed">Fixed / 固定</option>
                    <option value="guided">Guided / 导向</option>
                    <option value="free">Free / 自由</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Outer End / 外端</Label>
                  <select 
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    {...form.register("outerEndType")}
                  >
                    <option value="fixed">Fixed / 固定</option>
                    <option value="guided">Guided / 导向</option>
                    <option value="free">Free / 自由</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Winding Direction / 绕向</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" value="cw" {...form.register("windingDirection")} />
                    Clockwise / 顺时针
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" value="ccw" {...form.register("windingDirection")} />
                    Counter-CW / 逆时针
                  </label>
                </div>
              </div>
            </div>

            {/* Advanced Parameters (Collapsible) */}
            <div className="space-y-3 rounded-md border p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <span>Advanced / Close-out Parameters / 高级参数</span>
                <span>{showAdvanced ? "▼" : "▶"}</span>
              </button>
              
              {showAdvanced && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <DimensionHint code="θco" label="Close-out Angle" description="close-out起点角，圈间开始接触的角度。PDF建议：线性区约1圈(360°)。" />
                    <Label htmlFor="closeOutAngle">Close-out Angle θco (°) / 贴合起点角</Label>
                    <Controller
                      control={form.control}
                      name="closeOutAngle"
                      rules={{ required: "θco is required", min: { value: 1, message: "θco must be > 0" } }}
                      render={({ field }) => (
                        <NumericInput
                          id="closeOutAngle"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          step={1}
                          decimalScale={0}
                        />
                      )}
                    />
                    {errors.closeOutAngle?.message && (
                      <p className="text-xs text-red-600 dark:text-red-300">{String(errors.closeOutAngle.message)}</p>
                    )}
                  </div>
                  
                  {/* 许用应力设置 - 可追溯 */}
                  <div className="space-y-2 rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                    <p className="text-xs font-medium text-blue-300">Allowable Stress / 许用应力设置</p>
                    <p className="text-xs text-blue-200 mb-2">
                      ⚠️ 螺旋扭转弹簧主应力为<strong>弯曲应力</strong>，需使用拉伸/弯曲许用值
                    </p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="allowableStressRule" className="text-xs">Design Rule / 设计准则</Label>
                      <select 
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        {...form.register("allowableStressRule")}
                      >
                        <option value="0.45_UTS">0.45 × UTS (静态弯曲，经验默认)</option>
                        <option value="0.50_YS">0.50 × YS (屈服强度准则)</option>
                        <option value="0.30_UTS">0.30 × UTS (保守设计)</option>
                        <option value="custom">Custom / 自定义</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="allowableStressOverride" className="text-xs">Override σ_allow (MPa) / 覆盖许用应力</Label>
                      <Controller
                        control={form.control}
                        name="allowableStressOverride"
                        render={({ field }) => (
                          <NumericInput
                            id="allowableStressOverride"
                            value={field.value ?? undefined}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            step={10}
                            placeholder="留空使用设计准则计算"
                          />
                        )}
                      />
                      <p className="text-xs text-blue-200">留空则根据材料和设计准则自动计算</p>
                    </div>
                  </div>
                  
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-200">
                      ⚠️ <strong>工程提示 (来自 Handbook of Spring Design)</strong>
                    </p>
                    <ul className="text-xs text-amber-200 mt-1 space-y-1">
                      <li>• 线性区仅在 close-out 之前有效（约 1 圈 / 360°）</li>
                      <li>• close-out 后扭矩急剧非线性增加，无法准确计算</li>
                      <li>• 建议工作角度 ≤ 0.8 × θ_co</li>
                      <li>• 高应力/close-out 设计应咨询制造商</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Material / 材料</Label>
              <Select
                value={materialId}
                onValueChange={(v) => {
                  const m = getSpiralSpringMaterial(v as SpiralSpringMaterial["id"]);
                  if (m) handleMaterialChange(m);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select material..." />
                </SelectTrigger>
                <SelectContent>
                  {SPIRAL_SPRING_MATERIALS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col">
                        <span>{m.name}</span>
                        <span className="text-xs text-muted-foreground">{m.standard}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(() => {
                const m = getSpiralSpringMaterial(materialId);
                if (!m) return null;
                return (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                    <div className="grid grid-cols-2 gap-1">
                      <span className="text-muted-foreground">E (MPa):</span>
                      <span className="font-medium">{m.elasticModulus_MPa.toLocaleString()}</span>
                      <span className="text-muted-foreground">Su (MPa):</span>
                      <span className="font-medium">{m.ultimateStrength_MPa.toLocaleString()}</span>
                      <span className="text-muted-foreground">Sy (MPa):</span>
                      <span className="font-medium">{m.yieldStrength_MPa.toLocaleString()}</span>
                      <span className="text-muted-foreground">Standard:</span>
                      <span className="font-medium">{m.standard}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <Button 
              type="submit" 
              className="w-full transition-all duration-200 active:scale-95"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Calculating... / 计算中...
                </>
              ) : form.formState.isSubmitSuccessful && submitted ? (
                <>
                  <span className="mr-2">✓</span>
                  Calculated / 已计算
                </>
              ) : (
                "Calculate / 计算"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
        <CardHeader>
          <CardTitle>Results / 计算结果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results ? (
            <div className="space-y-4">
              {/* Errors */}
              {results.errors.length > 0 && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
                  {results.errors.map((error, i) => (
                    <p key={i} className="text-xs text-red-800 dark:text-red-200">❌ {error}</p>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {results.warnings.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  {results.warnings.map((warning, i) => (
                    <p key={i} className="text-xs text-amber-800 dark:text-amber-200">⚠ {warning}</p>
                  ))}
                </div>
              )}

              {/* Geometry Results */}
              <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-400">Geometry / 几何参数</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">Active Length L:</span>
                  <span>{results.activeLength.toFixed(1)} mm</span>
                  <span className="text-slate-600 dark:text-slate-400">Aspect Ratio b/t:</span>
                  <span>{results.aspectRatio.toFixed(1)}</span>
                  <span className="text-slate-600 dark:text-slate-400">Di / Do (空间校核):</span>
                  <span>{results.innerDiameter.toFixed(1)} / {results.outerDiameter.toFixed(1)} mm</span>
                </div>
              </div>

              {/* Spring Rate */}
              <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-700 dark:bg-green-900/30">
                <p className="text-xs font-medium text-green-800 dark:text-green-300">Spring Rate / 扭转刚度</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300">k (corrected):</span>
                  <span className="text-green-700 dark:text-green-300 font-medium">{results.springRateCorrected.toFixed(4)} N·mm/°</span>
                  <span className="text-slate-700 dark:text-slate-300">k (theory):</span>
                  <span className="text-slate-900 dark:text-slate-300">{results.springRateTheory.toFixed(4)} N·mm/°</span>
                  <span className="text-slate-700 dark:text-slate-300">C_end × C_pack:</span>
                  <span>{(results.correctionFactorEnd * results.correctionFactorPack).toFixed(3)}</span>
                </div>
              </div>

              {/* Torque at Key Points */}
              <div className="space-y-2 rounded-md border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-700 dark:bg-cyan-900/30">
                <p className="text-xs font-medium text-cyan-800 dark:text-cyan-300">Torque / 扭矩</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300">T(θ_min):</span>
                  <span>{results.minTorque.toFixed(2)} N·mm</span>
                  <span className="text-slate-700 dark:text-slate-300">T(θ_max):</span>
                  <span className="text-cyan-700 dark:text-cyan-300 font-medium">{results.maxTorque.toFixed(2)} N·mm</span>
                  <span className="text-slate-700 dark:text-slate-300">T(θ_co):</span>
                  <span>{results.closeOutTorque.toFixed(2)} N·mm</span>
                  <span className="text-slate-700 dark:text-slate-300">Energy U:</span>
                  <span>{results.energyStored.toFixed(2)} N·mm·rad</span>
                </div>
              </div>

              {/* Operating Status - 红黄绿条 */}
              <div className={`rounded-md border p-2 ${
                results.operatingStatus === "SAFE" 
                  ? "border-emerald-500/50 bg-emerald-500/10" 
                  : results.operatingStatus === "WARNING"
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-red-500/50 bg-red-500/10"
              }`}>
                <p className={`text-xs font-medium ${
                  results.operatingStatus === "SAFE" 
                    ? "text-emerald-700 dark:text-emerald-400" 
                    : results.operatingStatus === "WARNING"
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-red-700 dark:text-red-400"
                }`}>
                  {results.operatingStatus === "SAFE" && "✓ SAFE - Linear operating range / 安全 - 线性工作区"}
                  {results.operatingStatus === "WARNING" && "⚠️ WARNING - Approaching close-out / 警告 - 接近贴合区"}
                  {results.operatingStatus === "EXCEEDED" && "❌ EXCEEDED - Close-out limit exceeded / 超限 - 已超过贴合点"}
                </p>
              </div>

              {/* Stress Results */}
              <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/30">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Stress / 应力</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300">σ_max (linear):</span>
                  <span>{results.maxStressLinear.toFixed(1)} MPa</span>
                  {results.isInCloseOut && (
                    <>
                      <span className="text-slate-700 dark:text-slate-300">σ_max (close-out):</span>
                      <span className="text-red-700 dark:text-red-300">{results.maxStressCloseOut.toFixed(1)} MPa</span>
                    </>
                  )}
                  <span className="text-slate-700 dark:text-slate-300">σ_allow:</span>
                  <span>{results.allowableStress.toFixed(0)} MPa</span>
                  <span className="text-slate-700 dark:text-slate-300">Kt:</span>
                  <span>{results.stressConcentrationFactor.toFixed(2)}</span>
                </div>
                {/* 许用应力来源 - 可追溯 */}
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 border-t border-slate-200 dark:border-slate-700 pt-1">
                  σ_allow derived from: {results.allowableStressSource}
                </p>
              </div>

              {/* Safety Factors */}
              <div className={`space-y-2 rounded-md border p-3 ${
                results.safetyFactorLinear >= 1.2 
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30" 
                  : results.safetyFactorLinear >= 1.0 
                    ? "border-amber-200 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30"
                    : "border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/30"
              }`}>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-300">Safety / 安全系数</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="text-slate-700 dark:text-slate-300">n (linear):</span>
                  <span className={`font-bold ${
                    results.safetyFactorLinear >= 1.2 
                      ? "text-emerald-700 dark:text-emerald-400" 
                      : results.safetyFactorLinear >= 1.0 
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-red-700 dark:text-red-400"
                  }`}>
                    {results.safetyFactorLinear.toFixed(2)}
                  </span>
                  {results.isInCloseOut && (
                    <>
                      <span className="text-slate-700 dark:text-slate-300">n (close-out):</span>
                      <span className={`font-bold ${
                        results.safetyFactorCloseOut >= 1.2 
                          ? "text-emerald-700 dark:text-emerald-400" 
                          : results.safetyFactorCloseOut >= 1.0 
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-red-700 dark:text-red-400"
                      }`}>
                        {results.safetyFactorCloseOut.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Close-out Indicators */}
              {results.isInCloseOut && (
                <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-700 dark:bg-red-900/30">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">⚠ Close-out Warning / 贴合警告</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-slate-700 dark:text-slate-300">Close-out Gain:</span>
                    <span className="text-red-700 dark:text-red-300 font-medium">{results.closeOutGainFactor.toFixed(2)}×</span>
                  </div>
                  <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                    工作角度已进入close-out区域，扭矩急剧增加！
                  </p>
                </div>
              )}

              {/* Formula Reference - 使用 PDF 正确公式 */}
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-2">
                <p className="font-medium text-slate-800 dark:text-slate-400">Handbook of Spring Design 公式:</p>
                <p>M = πEbt³θ_rev/(6L)  (θ_rev in revolutions; θ_deg = 360·θ_rev)</p>
                <p>k_rev = πEbt³/(6L), k_deg = k_rev/360</p>
                <p>σ = 6M/(bt²) (弯曲应力, bending stress)</p>
                <p className="text-amber-700 dark:text-amber-400">⚠️ 线性区仅在 θ ≤ θ_co 有效</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Input parameters and run the calculation to view results.
              <br />
              <span className="text-slate-600 dark:text-slate-400">输入参数并点击计算，查看结果。</span>
            </p>
          )}

          {/* Action Buttons - 统一的按钮样式（与其他计算器一致） */}
          {/* EXCEEDED 时禁用载荷相关按钮（Force Tester, CAD） */}
          <div className="space-y-3 pt-2">
            {/* Generate 3D Model button hidden for now
            <Button 
              className="w-full bg-slate-700 hover:bg-slate-600 text-white border-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              disabled={!results?.isValid}
            >
              Generate 3D Model / 生成3D模型
            </Button>
            */}
            <Button 
              variant="outline" 
              className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10"
              disabled={!results?.isValid}
              onClick={() => router.push("/tools/analysis")}
            >
              Send to Engineering Analysis / 发送到工程分析
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10"
              disabled={!results?.isValid || results?.operatingStatus === "EXCEEDED"}
              title={results?.operatingStatus === "EXCEEDED" ? "超出线性范围，载荷曲线不可用" : undefined}
              onClick={() => router.push("/tools/cad-export")}
            >
              Export CAD / 导出 CAD
              {results?.operatingStatus === "EXCEEDED" && " ⚠️"}
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">3D Preview / 3D 预览</p>
            <div className="mt-3">
            <div className="mt-3">
              <Calculator3DPreview 
                expectedType="spiralTorsion" 
                geometryOverride={{
                  type: "spiralTorsion",
                  innerDiameter: watchedValues.innerDiameter ?? 10,
                  outerDiameter: watchedValues.outerDiameter ?? 30,
                  activeCoils: watchedValues.activeCoils ?? 5,
                  stripWidth: watchedValues.stripWidth ?? 10,
                  stripThickness: watchedValues.stripThickness ?? 0.5,
                  windingDirection: watchedValues.windingDirection ?? "cw",
                }}
              />
            </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
