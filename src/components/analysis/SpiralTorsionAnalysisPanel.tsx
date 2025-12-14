/**
 * Spiral Torsion Spring Analysis Panel
 * 螺旋扭转弹簧独立分析面板
 * 
 * 与 wire spring 完全分离，只展示 spiral 专用字段：
 * - 输入：b, t, L, Di/Do(空间), θ0/θmin/θmax, θco
 * - 输出：k_deg, T0/Tmin/Tmax/Tco, σmax, σ_allow/source, safety factor, operatingStatus
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { SpiralTorsionGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";

interface SpiralTorsionAnalysisPanelProps {
  isZh: boolean;
  geometry: SpiralTorsionGeometry;
  material: MaterialInfo;
  analysisResult: AnalysisResult;
}

export function SpiralTorsionAnalysisPanel({
  isZh,
  geometry,
  material,
  analysisResult,
}: SpiralTorsionAnalysisPanelProps) {
  // 从 analysisResult 中提取数据
  const springRate = analysisResult.springRate;
  const maxStress = analysisResult.maxStress ?? 0;
  const safetyFactor = analysisResult.staticSafetyFactor ?? 1;
  
  // 从 geometry 中提取 spiral 专用字段
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
    windingDirection,
    innerEndType,
    outerEndType,
  } = geometry;

  // 计算 operatingStatus
  const thetaRev = maxWorkingAngle / 360;
  const closeOutRev = closeOutAngle / 360;
  let operatingStatus: "SAFE" | "WARNING" | "EXCEEDED";
  if (thetaRev <= 0.8 * closeOutRev) {
    operatingStatus = "SAFE";
  } else if (thetaRev <= closeOutRev) {
    operatingStatus = "WARNING";
  } else {
    operatingStatus = "EXCEEDED";
  }

  // 计算扭矩（简化版，实际应从 store 读取完整结果）
  const preloadTorque = springRate * preloadAngle;
  const minTorque = preloadTorque + springRate * minWorkingAngle;
  const maxTorque = operatingStatus === "EXCEEDED" 
    ? preloadTorque + springRate * closeOutAngle  // Clamped
    : preloadTorque + springRate * maxWorkingAngle;
  const closeOutTorque = preloadTorque + springRate * closeOutAngle;

  return (
    <main className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/tools/calculator">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? "返回计算器" : "Back to Calculator"}
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {isZh ? "螺旋扭转弹簧工程分析" : "Spiral Torsion Spring Engineering Analysis"}
        </h1>
        <p className="text-muted-foreground">
          {isZh 
            ? "带材卷绕式弹簧 - 独立分析面板（不使用 wire spring 字段）" 
            : "Flat strip wound spring - Independent analysis panel (no wire spring fields)"}
        </p>
      </div>

      {/* Operating Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border ${
        operatingStatus === "SAFE" 
          ? "bg-emerald-500/10 border-emerald-500/50" 
          : operatingStatus === "WARNING"
            ? "bg-amber-500/10 border-amber-500/50"
            : "bg-red-500/10 border-red-500/50"
      }`}>
        <div className="flex items-center gap-3">
          {operatingStatus === "SAFE" && <CheckCircle className="w-6 h-6 text-emerald-500" />}
          {operatingStatus === "WARNING" && <AlertTriangle className="w-6 h-6 text-amber-500" />}
          {operatingStatus === "EXCEEDED" && <XCircle className="w-6 h-6 text-red-500" />}
          <div>
            <p className={`font-medium ${
              operatingStatus === "SAFE" ? "text-emerald-400" 
              : operatingStatus === "WARNING" ? "text-amber-400" 
              : "text-red-400"
            }`}>
              {operatingStatus === "SAFE" && (isZh ? "✓ 安全 - 线性工作区" : "✓ SAFE - Linear operating range")}
              {operatingStatus === "WARNING" && (isZh ? "⚠️ 警告 - 接近贴合区" : "⚠️ WARNING - Approaching close-out")}
              {operatingStatus === "EXCEEDED" && (isZh ? "❌ 超限 - 已超过贴合点" : "❌ EXCEEDED - Close-out limit exceeded")}
            </p>
            <p className="text-sm text-muted-foreground">
              θ/θ_co = {(thetaRev / closeOutRev).toFixed(2)} ({(thetaRev / closeOutRev * 100).toFixed(0)}%)
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Parameters - Spiral Specific */}
        <Card>
          <CardHeader>
            <CardTitle>{isZh ? "输入参数 (Spiral 专用)" : "Input Parameters (Spiral Specific)"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Strip Geometry */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isZh ? "带材几何" : "Strip Geometry"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">b (带材宽度):</span>
                <span>{stripWidth} mm</span>
                <span className="text-slate-400">t (带材厚度):</span>
                <span>{stripThickness} mm</span>
                <span className="text-slate-400">L (有效长度):</span>
                <span className="font-medium text-blue-400">{activeLength} mm</span>
                <span className="text-slate-400">b/t (宽厚比):</span>
                <span>{(stripWidth / stripThickness).toFixed(1)}</span>
              </div>
            </div>

            {/* Space Check */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isZh ? "空间校核" : "Space Check"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">Di (内径):</span>
                <span>{innerDiameter} mm</span>
                <span className="text-slate-400">Do (外径):</span>
                <span>{outerDiameter} mm</span>
              </div>
            </div>

            {/* Working Angles */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isZh ? "工作角度" : "Working Angles"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">θ₀ (预紧角):</span>
                <span>{preloadAngle}° ({(preloadAngle / 360).toFixed(3)} rev)</span>
                <span className="text-slate-400">θ_min:</span>
                <span>{minWorkingAngle}° ({(minWorkingAngle / 360).toFixed(3)} rev)</span>
                <span className="text-slate-400">θ_max:</span>
                <span className="font-medium">{maxWorkingAngle}° ({(maxWorkingAngle / 360).toFixed(3)} rev)</span>
                <span className="text-slate-400">θ_co (close-out):</span>
                <span className="text-amber-400">{closeOutAngle}° ({(closeOutAngle / 360).toFixed(3)} rev)</span>
              </div>
            </div>

            {/* End Conditions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isZh ? "端部条件" : "End Conditions"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">{isZh ? "内端" : "Inner End"}:</span>
                <span>{innerEndType ?? "fixed"}</span>
                <span className="text-slate-400">{isZh ? "外端" : "Outer End"}:</span>
                <span>{outerEndType ?? "fixed"}</span>
                <span className="text-slate-400">{isZh ? "绕向" : "Winding"}:</span>
                <span>{windingDirection === "cw" ? "CW / 顺时针" : "CCW / 逆时针"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Results - Spiral Specific */}
        <Card>
          <CardHeader>
            <CardTitle>{isZh ? "计算结果 (Spiral 专用)" : "Calculation Results (Spiral Specific)"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Spring Rate */}
            <div className="space-y-2 p-3 rounded-md bg-green-900/30 border border-green-700">
              <p className="text-sm font-medium text-green-400">
                {isZh ? "扭转刚度" : "Spring Rate"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">k (corrected):</span>
                <span className="font-medium text-green-300">{springRate.toFixed(4)} N·mm/°</span>
              </div>
            </div>

            {/* Torque */}
            <div className="space-y-2 p-3 rounded-md bg-cyan-900/30 border border-cyan-700">
              <p className="text-sm font-medium text-cyan-400">
                {isZh ? "扭矩" : "Torque"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">T₀ (preload):</span>
                <span>{preloadTorque.toFixed(2)} N·mm</span>
                <span className="text-slate-400">T(θ_min):</span>
                <span>{minTorque.toFixed(2)} N·mm</span>
                <span className="text-slate-400">T(θ_max):</span>
                <span className={`font-medium ${operatingStatus === "EXCEEDED" ? "text-red-300" : "text-cyan-300"}`}>
                  {maxTorque.toFixed(2)} N·mm
                  {operatingStatus === "EXCEEDED" && " (clamped)"}
                </span>
                <span className="text-slate-400">T(θ_co):</span>
                <span className="text-amber-300">{closeOutTorque.toFixed(2)} N·mm</span>
              </div>
            </div>

            {/* Stress */}
            <div className="space-y-2 p-3 rounded-md bg-blue-900/30 border border-blue-700">
              <p className="text-sm font-medium text-blue-400">
                {isZh ? "弯曲应力 (σ)" : "Bending Stress (σ)"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">σ_max:</span>
                <span>{maxStress.toFixed(1)} MPa</span>
                <span className="text-slate-400">σ_allow:</span>
                <span>{(material.tensileStrength ? material.tensileStrength * 0.45 : 0).toFixed(0)} MPa</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isZh ? "注：螺旋扭转弹簧主应力为弯曲应力 σ，非剪切应力 τ" : "Note: Primary stress is bending σ, not shear τ"}
              </p>
            </div>

            {/* Safety Factor */}
            <div className={`space-y-2 p-3 rounded-md border ${
              safetyFactor >= 1.2 
                ? "bg-emerald-900/30 border-emerald-700" 
                : safetyFactor >= 1.0 
                  ? "bg-amber-900/30 border-amber-700"
                  : "bg-red-900/30 border-red-700"
            }`}>
              <p className="text-sm font-medium text-slate-400">
                {isZh ? "安全系数" : "Safety Factor"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-400">n (linear):</span>
                <span className={`font-bold ${
                  safetyFactor >= 1.2 ? "text-emerald-400" 
                  : safetyFactor >= 1.0 ? "text-amber-400"
                  : "text-red-400"
                }`}>
                  {safetyFactor.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Close-out Warning */}
            {operatingStatus === "EXCEEDED" && (
              <div className="p-3 rounded-md bg-red-900/30 border border-red-700">
                <p className="text-sm font-medium text-red-400 mb-2">
                  ⚠️ {isZh ? "Close-out 警告" : "Close-out Warning"}
                </p>
                <ul className="text-xs text-red-200 space-y-1">
                  <li>• {isZh ? "工作角度超过 close-out 限制 (θ > θ_co)" : "Working angle exceeds close-out limit (θ > θ_co)"}</li>
                  <li>• {isZh ? "close-out 后扭矩急剧非线性增加，无法准确计算" : "Torque increases rapidly and non-linearly beyond close-out"}</li>
                  <li>• {isZh ? "建议：工作角度应 ≤ 0.8 × θ_co，或咨询制造商" : "Recommendation: θ ≤ 0.8 × θ_co, or consult manufacturer"}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Formula Reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{isZh ? "公式参考 (Handbook of Spring Design)" : "Formula Reference (Handbook of Spring Design)"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400 space-y-1">
          <p>M = πEbt³θ_rev/(6L)  (θ_rev in revolutions; θ_deg = 360·θ_rev)</p>
          <p>k_rev = πEbt³/(6L), k_deg = k_rev/360</p>
          <p>σ = 6M/(bt²) (弯曲应力, bending stress)</p>
          <p className="text-amber-400">⚠️ {isZh ? "线性区仅在 θ ≤ θ_co 有效" : "Linear region valid only for θ ≤ θ_co"}</p>
        </CardContent>
      </Card>
    </main>
  );
}
