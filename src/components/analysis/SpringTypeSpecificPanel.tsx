"use client";

/**
 * Spring Type Specific Analysis Panel
 * 弹簧类型特定分析面板
 * 
 * Provides type-specific analysis for each spring type:
 * - Extension: Hook stress analysis
 * - Torsion: Leg stress analysis
 * - Conical: Per-coil stress distribution
 * - Compression: Buckling analysis (already in main panel)
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { useLanguage } from "@/components/language-context";

import type { SpringGeometry, SpringAnalysisResult } from "@/lib/engine/types";
import {
  calculateHookStress,
  type HookStressResult,
  type HookType,
  HOOK_FACTORS,
} from "@/lib/engine/hookStress";
import {
  calculateWahlFactor,
  calculateNominalShearStress,
} from "@/lib/engine/stress";
import { getSpringMaterial } from "@/lib/materials/springMaterials";

interface SpringTypeSpecificPanelProps {
  geometry: SpringGeometry;
  analysisResult: SpringAnalysisResult;
  springRate: number;
  maxForce: number;
}

// ============================================================================
// Extension Spring Hook Analysis
// ============================================================================

interface ExtensionHookAnalysisProps {
  geometry: SpringGeometry & { type: "extension" };
  maxForce: number;
  bodyShearStress: number;
  isZh: boolean;
}

function ExtensionHookAnalysis({
  geometry,
  maxForce,
  bodyShearStress,
  isZh,
}: ExtensionHookAnalysisProps) {
  const hookType = (geometry.hookType ?? "machine") as HookType;

  const hookResult = useMemo<HookStressResult | null>(() => {
    try {
      return calculateHookStress(geometry, maxForce, bodyShearStress, hookType);
    } catch {
      return null;
    }
  }, [geometry, maxForce, bodyShearStress, hookType]);

  if (!hookResult) {
    return (
      <div className="text-sm text-muted-foreground">
        {isZh ? "无法计算钩环应力" : "Unable to calculate hook stress"}
      </div>
    );
  }

  const statusColor =
    hookResult.status === "safe"
      ? "bg-green-100 text-green-800"
      : hookResult.status === "warning"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  const StatusIcon =
    hookResult.status === "safe"
      ? CheckCircle
      : hookResult.status === "warning"
      ? AlertTriangle
      : XCircle;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {isZh ? "钩环应力分析" : "Hook Stress Analysis"}
        </h4>
        <Badge className={statusColor}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {hookResult.status.toUpperCase()}
        </Badge>
      </div>

      {/* Hook Type Info */}
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{isZh ? "钩型" : "Hook Type"}</span>
          <span className="font-medium">
            {isZh
              ? HOOK_FACTORS[hookType].description.zh
              : HOOK_FACTORS[hookType].description.en}
          </span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-muted-foreground">
            {isZh ? "应力集中系数 Kf" : "Stress Concentration Kf"}
          </span>
          <span className="font-medium">{hookResult.stressConcentrationFactor.toFixed(2)}</span>
        </div>
      </div>

      {/* Stress Values */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "弯曲应力" : "Bending Stress"}
          </div>
          <div className="text-lg font-semibold">
            {hookResult.bendingStress.toFixed(0)} <span className="text-sm font-normal">MPa</span>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "扭转应力" : "Torsional Stress"}
          </div>
          <div className="text-lg font-semibold">
            {hookResult.torsionalStress.toFixed(0)} <span className="text-sm font-normal">MPa</span>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "组合应力 (von Mises)" : "Combined Stress (von Mises)"}
          </div>
          <div className="text-lg font-semibold">
            {hookResult.combinedStress.toFixed(0)} <span className="text-sm font-normal">MPa</span>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "本体剪应力" : "Body Shear Stress"}
          </div>
          <div className="text-lg font-semibold">
            {bodyShearStress.toFixed(0)} <span className="text-sm font-normal">MPa</span>
          </div>
        </div>
      </div>

      {/* Safety Factors Comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>{isZh ? "钩环安全系数" : "Hook Safety Factor"}</span>
          <span
            className={`font-medium ${
              hookResult.hookSafetyFactor < 1.2 ? "text-red-600" : ""
            }`}
          >
            {hookResult.hookSafetyFactor.toFixed(2)}
          </span>
        </div>
        <Progress
          value={Math.min(100, (hookResult.hookSafetyFactor / 3) * 100)}
          className="h-2"
        />

        <div className="flex items-center justify-between text-sm">
          <span>{isZh ? "本体安全系数" : "Body Safety Factor"}</span>
          <span className="font-medium">{hookResult.bodySafetyFactor.toFixed(2)}</span>
        </div>
        <Progress
          value={Math.min(100, (hookResult.bodySafetyFactor / 3) * 100)}
          className="h-2"
        />
      </div>

      {/* Critical Location */}
      <div
        className={`rounded-lg p-3 text-sm ${
          hookResult.criticalLocation !== "body"
            ? "bg-yellow-50 text-yellow-800"
            : "bg-green-50 text-green-800"
        }`}
      >
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{isZh ? hookResult.message.zh : hookResult.message.en}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Torsion Spring Leg Analysis
// ============================================================================

interface TorsionLegAnalysisProps {
  geometry: SpringGeometry & { type: "torsion" };
  maxTorque: number;
  bodyBendingStress: number;
  isZh: boolean;
}

function TorsionLegAnalysis({
  geometry,
  maxTorque,
  bodyBendingStress,
  isZh,
}: TorsionLegAnalysisProps) {
  const material = getSpringMaterial(geometry.materialId);
  const allowableStress = material?.allowShearStatic ?? 800;

  // Calculate leg stresses
  const legAnalysis = useMemo(() => {
    const { wireDiameter, legLength1, legLength2 } = geometry;
    const PI = Math.PI;

    // Leg bending stress: σ = 32 * F * L / (π * d³)
    // Force at leg tip = Torque / arm length
    // For simplicity, assume force acts at leg tip

    // Leg 1 stress (longer leg typically has higher stress)
    const forceAtLeg1 = maxTorque / (legLength1 || wireDiameter * 5);
    const leg1BendingStress = (32 * forceAtLeg1 * (legLength1 || wireDiameter * 5)) / 
                              (PI * Math.pow(wireDiameter, 3));

    // Leg 2 stress
    const forceAtLeg2 = maxTorque / (legLength2 || wireDiameter * 5);
    const leg2BendingStress = (32 * forceAtLeg2 * (legLength2 || wireDiameter * 5)) / 
                              (PI * Math.pow(wireDiameter, 3));

    // Apply stress concentration at leg root (typically 1.2-1.5)
    const legStressConcentration = 1.3;
    const leg1EffectiveStress = leg1BendingStress * legStressConcentration;
    const leg2EffectiveStress = leg2BendingStress * legStressConcentration;

    // Safety factors
    const leg1SafetyFactor = allowableStress / leg1EffectiveStress;
    const leg2SafetyFactor = allowableStress / leg2EffectiveStress;
    const bodySafetyFactor = allowableStress / bodyBendingStress;

    // Critical location
    const minLegSF = Math.min(leg1SafetyFactor, leg2SafetyFactor);
    const criticalLocation = minLegSF < bodySafetyFactor * 0.9 
      ? (leg1SafetyFactor < leg2SafetyFactor ? "leg1" : "leg2")
      : "body";

    // Status
    const minSF = Math.min(minLegSF, bodySafetyFactor);
    const status = minSF >= 1.5 ? "safe" : minSF >= 1.2 ? "warning" : "danger";

    return {
      leg1: {
        length: legLength1 || wireDiameter * 5,
        bendingStress: leg1BendingStress,
        effectiveStress: leg1EffectiveStress,
        safetyFactor: leg1SafetyFactor,
      },
      leg2: {
        length: legLength2 || wireDiameter * 5,
        bendingStress: leg2BendingStress,
        effectiveStress: leg2EffectiveStress,
        safetyFactor: leg2SafetyFactor,
      },
      stressConcentration: legStressConcentration,
      bodySafetyFactor,
      criticalLocation,
      status,
    };
  }, [geometry, maxTorque, bodyBendingStress, allowableStress]);

  const statusColor =
    legAnalysis.status === "safe"
      ? "bg-green-100 text-green-800"
      : legAnalysis.status === "warning"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  const StatusIcon =
    legAnalysis.status === "safe"
      ? CheckCircle
      : legAnalysis.status === "warning"
      ? AlertTriangle
      : XCircle;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {isZh ? "腿部应力分析" : "Leg Stress Analysis"}
        </h4>
        <Badge className={statusColor}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {legAnalysis.status.toUpperCase()}
        </Badge>
      </div>

      {/* Leg 1 */}
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">{isZh ? "腿 1" : "Leg 1"}</span>
          <span className="text-sm text-muted-foreground">
            L = {legAnalysis.leg1.length.toFixed(1)} mm
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">{isZh ? "弯曲应力" : "Bending Stress"}</span>
            <div className="font-semibold">{legAnalysis.leg1.effectiveStress.toFixed(0)} MPa</div>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "安全系数" : "Safety Factor"}</span>
            <div
              className={`font-semibold ${
                legAnalysis.leg1.safetyFactor < 1.2 ? "text-red-600" : ""
              }`}
            >
              {legAnalysis.leg1.safetyFactor.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Leg 2 */}
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">{isZh ? "腿 2" : "Leg 2"}</span>
          <span className="text-sm text-muted-foreground">
            L = {legAnalysis.leg2.length.toFixed(1)} mm
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">{isZh ? "弯曲应力" : "Bending Stress"}</span>
            <div className="font-semibold">{legAnalysis.leg2.effectiveStress.toFixed(0)} MPa</div>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "安全系数" : "Safety Factor"}</span>
            <div
              className={`font-semibold ${
                legAnalysis.leg2.safetyFactor < 1.2 ? "text-red-600" : ""
              }`}
            >
              {legAnalysis.leg2.safetyFactor.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Body Comparison */}
      <div className="rounded-lg bg-slate-50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{isZh ? "本体弯曲应力" : "Body Bending Stress"}</span>
          <span className="font-medium">{bodyBendingStress.toFixed(0)} MPa</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">{isZh ? "本体安全系数" : "Body Safety Factor"}</span>
          <span className="font-medium">{legAnalysis.bodySafetyFactor.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">{isZh ? "腿根应力集中系数" : "Leg Root Stress Concentration"}</span>
          <span className="font-medium">{legAnalysis.stressConcentration.toFixed(2)}</span>
        </div>
      </div>

      {/* Critical Location */}
      <div
        className={`rounded-lg p-3 text-sm ${
          legAnalysis.criticalLocation !== "body"
            ? "bg-yellow-50 text-yellow-800"
            : "bg-green-50 text-green-800"
        }`}
      >
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {legAnalysis.criticalLocation === "body"
              ? isZh
                ? "本体为关键位置，腿部应力在安全范围内"
                : "Body is critical location, leg stresses are within safe range"
              : isZh
              ? `${legAnalysis.criticalLocation === "leg1" ? "腿 1" : "腿 2"} 为关键位置，建议增加腿长或减小载荷`
              : `${legAnalysis.criticalLocation === "leg1" ? "Leg 1" : "Leg 2"} is critical, consider increasing leg length or reducing load`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Conical Spring Per-Coil Analysis
// ============================================================================

interface ConicalCoilAnalysisProps {
  geometry: SpringGeometry & { type: "conical" };
  maxForce: number;
  isZh: boolean;
}

function ConicalCoilAnalysis({
  geometry,
  maxForce,
  isZh,
}: ConicalCoilAnalysisProps) {
  const material = getSpringMaterial(geometry.materialId);
  const allowableStress = material?.allowShearStatic ?? 800;

  // Calculate per-coil stress distribution
  const coilAnalysis = useMemo(() => {
    const { wireDiameter, largeOuterDiameter, smallOuterDiameter, activeCoils } = geometry;
    const PI = Math.PI;

    const largeMean = largeOuterDiameter - wireDiameter;
    const smallMean = smallOuterDiameter - wireDiameter;
    const diameterStep = (largeMean - smallMean) / (activeCoils - 1 || 1);

    const coils: Array<{
      index: number;
      meanDiameter: number;
      springIndex: number;
      wahlFactor: number;
      shearStress: number;
      safetyFactor: number;
      isCollapsed: boolean;
    }> = [];

    // Calculate stress for each coil (from large to small)
    for (let i = 0; i < activeCoils; i++) {
      const meanDiameter = largeMean - i * diameterStep;
      const springIndex = meanDiameter / wireDiameter;
      const wahlFactor = calculateWahlFactor(springIndex);
      const nominalStress = (8 * maxForce * meanDiameter) / (PI * Math.pow(wireDiameter, 3));
      const shearStress = nominalStress * wahlFactor;
      const safetyFactor = allowableStress / shearStress;

      // Simplified collapse check (coil collapses when deflection exceeds pitch)
      const isCollapsed = false; // Would need deflection info for accurate calculation

      coils.push({
        index: i + 1,
        meanDiameter,
        springIndex,
        wahlFactor,
        shearStress,
        safetyFactor,
        isCollapsed,
      });
    }

    // Find critical coil (highest stress = largest diameter)
    const criticalCoil = coils[0];
    const minSafetyFactor = Math.min(...coils.map((c) => c.safetyFactor));
    const status = minSafetyFactor >= 1.5 ? "safe" : minSafetyFactor >= 1.2 ? "warning" : "danger";

    return {
      coils,
      criticalCoil,
      minSafetyFactor,
      status,
      stressRatio: coils[coils.length - 1].shearStress / coils[0].shearStress,
    };
  }, [geometry, maxForce, allowableStress]);

  const statusColor =
    coilAnalysis.status === "safe"
      ? "bg-green-100 text-green-800"
      : coilAnalysis.status === "warning"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  const StatusIcon =
    coilAnalysis.status === "safe"
      ? CheckCircle
      : coilAnalysis.status === "warning"
      ? AlertTriangle
      : XCircle;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {isZh ? "逐圈应力分析" : "Per-Coil Stress Analysis"}
        </h4>
        <Badge className={statusColor}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {coilAnalysis.status.toUpperCase()}
        </Badge>
      </div>

      {/* Stress Distribution Summary */}
      <div className="rounded-lg bg-slate-50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{isZh ? "大端应力（最大）" : "Large End Stress (Max)"}</span>
          <span className="font-medium text-red-600">
            {coilAnalysis.coils[0].shearStress.toFixed(0)} MPa
          </span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">{isZh ? "小端应力（最小）" : "Small End Stress (Min)"}</span>
          <span className="font-medium text-green-600">
            {coilAnalysis.coils[coilAnalysis.coils.length - 1].shearStress.toFixed(0)} MPa
          </span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">{isZh ? "应力比（小/大）" : "Stress Ratio (Small/Large)"}</span>
          <span className="font-medium">{coilAnalysis.stressRatio.toFixed(2)}</span>
        </div>
      </div>

      {/* Per-Coil Table */}
      <div className="max-h-48 overflow-y-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100">
            <tr>
              <th className="px-2 py-1 text-left">{isZh ? "圈" : "Coil"}</th>
              <th className="px-2 py-1 text-right">Dm (mm)</th>
              <th className="px-2 py-1 text-right">C</th>
              <th className="px-2 py-1 text-right">τ (MPa)</th>
              <th className="px-2 py-1 text-right">SF</th>
            </tr>
          </thead>
          <tbody>
            {coilAnalysis.coils.map((coil) => (
              <tr
                key={coil.index}
                className={coil.index === 1 ? "bg-red-50" : ""}
              >
                <td className="px-2 py-1">{coil.index}</td>
                <td className="px-2 py-1 text-right">{coil.meanDiameter.toFixed(1)}</td>
                <td className="px-2 py-1 text-right">{coil.springIndex.toFixed(1)}</td>
                <td className="px-2 py-1 text-right">{coil.shearStress.toFixed(0)}</td>
                <td
                  className={`px-2 py-1 text-right ${
                    coil.safetyFactor < 1.2 ? "text-red-600 font-medium" : ""
                  }`}
                >
                  {coil.safetyFactor.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Critical Coil Info */}
      <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            {isZh
              ? `关键位置：第 1 圈（大端），应力 ${coilAnalysis.criticalCoil.shearStress.toFixed(0)} MPa，安全系数 ${coilAnalysis.criticalCoil.safetyFactor.toFixed(2)}`
              : `Critical: Coil 1 (large end), stress ${coilAnalysis.criticalCoil.shearStress.toFixed(0)} MPa, SF ${coilAnalysis.criticalCoil.safetyFactor.toFixed(2)}`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compression Spring Buckling Summary (Already in main panel, just summary here)
// ============================================================================

interface CompressionBucklingSummaryProps {
  analysisResult: SpringAnalysisResult;
  isZh: boolean;
}

function CompressionBucklingSummary({
  analysisResult,
  isZh,
}: CompressionBucklingSummaryProps) {
  const buckling = analysisResult.buckling;

  if (!buckling) {
    return (
      <div className="text-sm text-muted-foreground">
        {isZh ? "屈曲分析不适用" : "Buckling analysis not applicable"}
      </div>
    );
  }

  const statusColor =
    buckling.status === "safe"
      ? "bg-green-100 text-green-800"
      : buckling.status === "warning"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  const StatusIcon =
    buckling.status === "safe"
      ? CheckCircle
      : buckling.status === "warning"
      ? AlertTriangle
      : XCircle;

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {isZh ? "屈曲稳定性分析" : "Buckling Stability Analysis"}
        </h4>
        <Badge className={statusColor}>
          <StatusIcon className="mr-1 h-3 w-3" />
          {buckling.status.toUpperCase()}
        </Badge>
      </div>

      {/* Buckling Parameters */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "细长比 λ" : "Slenderness Ratio λ"}
          </div>
          <div className="text-lg font-semibold">{buckling.slendernessRatio.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "工作载荷" : "Working Load"}
          </div>
          <div className="text-lg font-semibold">
            {buckling.workingLoad.toFixed(1)} <span className="text-sm font-normal">N</span>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "临界载荷" : "Critical Load"}
          </div>
          <div className="text-lg font-semibold">
            {buckling.criticalLoad.toFixed(1)} <span className="text-sm font-normal">N</span>
          </div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            {isZh ? "屈曲安全系数" : "Buckling Safety Factor"}
          </div>
          <div
            className={`text-lg font-semibold ${
              buckling.bucklingSafetyFactor < 1.2 ? "text-red-600" : ""
            }`}
          >
            {buckling.bucklingSafetyFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {buckling.status !== "safe" && (
        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {isZh
                ? "建议：减小自由长度、增大平均直径、或使用导向装置"
                : "Recommendation: Reduce free length, increase mean diameter, or use guide"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SpringTypeSpecificPanel({
  geometry,
  analysisResult,
  springRate,
  maxForce,
}: SpringTypeSpecificPanelProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const bodyStress = analysisResult.stress.tauEffective;

  // Render type-specific content
  const renderContent = () => {
    switch (geometry.type) {
      case "extension":
        return (
          <ExtensionHookAnalysis
            geometry={geometry}
            maxForce={maxForce}
            bodyShearStress={bodyStress}
            isZh={isZh}
          />
        );

      case "torsion":
        return (
          <TorsionLegAnalysis
            geometry={geometry}
            maxTorque={maxForce} // For torsion springs, "force" is actually torque
            bodyBendingStress={analysisResult.stress.bendingStress ?? bodyStress}
            isZh={isZh}
          />
        );

      case "conical":
        return (
          <ConicalCoilAnalysis
            geometry={geometry}
            maxForce={maxForce}
            isZh={isZh}
          />
        );

      case "compression":
        return (
          <CompressionBucklingSummary
            analysisResult={analysisResult}
            isZh={isZh}
          />
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            {isZh ? "无类型特定分析" : "No type-specific analysis available"}
          </div>
        );
    }
  };

  // Get title based on spring type
  const getTitle = () => {
    switch (geometry.type) {
      case "extension":
        return isZh ? "拉伸弹簧 - 钩环分析" : "Extension Spring - Hook Analysis";
      case "torsion":
        return isZh ? "扭转弹簧 - 腿部分析" : "Torsion Spring - Leg Analysis";
      case "conical":
        return isZh ? "锥形弹簧 - 逐圈分析" : "Conical Spring - Per-Coil Analysis";
      case "compression":
        return isZh ? "压缩弹簧 - 屈曲分析" : "Compression Spring - Buckling Analysis";
      default:
        return isZh ? "类型特定分析" : "Type-Specific Analysis";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
