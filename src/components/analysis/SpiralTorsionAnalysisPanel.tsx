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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle, XCircle, ArrowLeft, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { SpiralTorsionGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import { getSpringMaterial, type SpringMaterialId } from "@/lib/materials/springMaterials";
import { buildSpiralReportModel } from "@/lib/reports/SpiralSpringReportTemplate";
import { generateSpiralReportDraftHTML } from "@/lib/reports/SpiralSpringReportDraftHtml";
import {
  END_KT_DEFAULTS,
  END_KT_LABELS,
  type EndKtType,
} from "@/lib/spring3d/spiralSpringFormulas";
import { computeSpiralSpringAdvancedDerived } from "@/lib/spring3d/spiralSpringAnalysis";
import {
  SPIRAL_SPRING_MATERIALS,
  getSpiralSpringMaterial,
  type SpiralHeatTreatment,
  type SpiralReliability,
  type SpiralSpringMaterial,
  type SpiralStrengthBasis,
  type SpiralSurfaceFinish,
} from "@/lib/spring3d/spiralSpringMaterials";
import { GoodmanChart, SpiralCloseoutChart, SpiralTorqueBandChart } from "@/components/charts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SpiralFeaPanel } from "@/components/analysis/SpiralFeaPanel";

const SpiralTorsionSpringVisualizer = dynamic(
  () => import("@/components/three/SpiralTorsionSpringMesh").then((mod) => mod.SpiralTorsionSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] bg-slate-50 rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);

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
  const thetaMaxUsed = operatingStatus === "EXCEEDED" ? closeOutAngle : maxWorkingAngle;
  const maxTorque = preloadTorque + springRate * thetaMaxUsed;
  const closeOutTorque = preloadTorque + springRate * closeOutAngle;

  const allowableStress_MPa = useMemo(() => {
    const sf = analysisResult.staticSafetyFactor;
    const sigma = analysisResult.maxStress;
    if (sf === undefined || sigma === undefined) return undefined;
    if (!isFinite(sf) || !isFinite(sigma) || sf <= 0) return undefined;
    return sf * sigma;
  }, [analysisResult.maxStress, analysisResult.staticSafetyFactor]);

  const unitSelfCheckWarnedRef = useRef(false);

  const [innerEndKtType, setInnerEndKtType] = useState<EndKtType>("clamped");
  const [outerEndKtType, setOuterEndKtType] = useState<EndKtType>("clamped");
  const [innerKtOverride, setInnerKtOverride] = useState<number | null>(null);
  const [outerKtOverride, setOuterKtOverride] = useState<number | null>(null);

  const [toleranceT, setToleranceT] = useState(0.02);
  const [toleranceB, setToleranceB] = useState(0.1);
  const [toleranceL, setToleranceL] = useState(5);
  const [toleranceE, setToleranceE] = useState(0);
  const [toleranceEMode, setToleranceEMode] = useState<"MPa" | "%">("MPa");
  const [hardeningFactor, setHardeningFactor] = useState(8);

  const [enableNonlinearCloseout, setEnableNonlinearCloseout] = useState(false);
  const thetaContactStartTouchedRef = useRef(false);
  const [thetaContactStartDeg, setThetaContactStartDeg] = useState(() => 0.85 * closeOutAngle);
  const [hardeningA, setHardeningA] = useState(6.0);
  const [hardeningP, setHardeningP] = useState(2.5);

  const [spiralMatId, setSpiralMatId] = useState<SpiralSpringMaterial["id"]>(() => geometry.spiralMaterialId ?? "sae1095");
  const [spiralSurface, setSpiralSurface] = useState<SpiralSurfaceFinish>("as_rolled");
  const [spiralReliability, setSpiralReliability] = useState<SpiralReliability>(0.95);
  const [shotPeened, setShotPeened] = useState(false);
  const [strengthBasis, setStrengthBasis] = useState<SpiralStrengthBasis>("nominal");
  const [heatTreatment, setHeatTreatment] = useState<SpiralHeatTreatment>("default");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDraft, setIsExportingDraft] = useState(false);

  const closeoutInputError =
    !isFinite(closeOutAngle) || closeOutAngle <= 0
      ? (isZh ? "θco 必须 > 0" : "thetaCo must be > 0")
      : enableNonlinearCloseout && (thetaContactStartDeg < 0 || thetaContactStartDeg > closeOutAngle)
        ? (isZh ? "θ_contactStart 必须满足 0 ≤ θ_contactStart ≤ θco" : "thetaContactStart must satisfy 0 ≤ thetaContactStart ≤ thetaCo")
        : null;
  const canExportReport = closeoutInputError === null;

  const [reportProjectName, setReportProjectName] = useState("");
  const [reportEngineer, setReportEngineer] = useState("");
  const [reportPartNo, setReportPartNo] = useState("");

  const [fatigueCriterion, setFatigueCriterion] = useState<"goodman" | "gerber" | "soderberg">("goodman");

  useEffect(() => {
    const m = getSpiralSpringMaterial(spiralMatId);
    if (!m) return;
    setSpiralSurface(m.defaultSurface);
    setSpiralReliability(m.defaultReliability);
  }, [spiralMatId]);

  useEffect(() => {
    if (thetaContactStartTouchedRef.current) return;
    setThetaContactStartDeg(0.85 * closeOutAngle);
  }, [closeOutAngle]);

  const materialFull = useMemo(() => {
    const id = geometry.materialId;
    if (!id) return undefined;
    return getSpringMaterial(id as SpringMaterialId);
  }, [geometry.materialId]);

  const derived = useMemo(() => {
    return computeSpiralSpringAdvancedDerived({
      springRate_NmmPerDeg: springRate,
      preloadTorque_Nmm: preloadTorque,
      minTorque_Nmm: minTorque,
      maxTorque_Nmm: maxTorque,
      b_mm: stripWidth,
      t_mm: stripThickness,
      L_mm: activeLength,
      thetaMaxUsed_deg: thetaMaxUsed,
      closeOutAngle_deg: closeOutAngle,
      maxWorkingAngle_deg: maxWorkingAngle,
      material,
      materialFactors: {
        surfaceFactor: materialFull?.surfaceFactor,
        tempFactor: materialFull?.tempFactor,
        sizeFactor: materialFull?.sizeFactor,
      },
      endKt: {
        innerEndKtType,
        outerEndKtType,
        innerKtOverride,
        outerKtOverride,
      },
      tolerance: {
        toleranceT_mm: toleranceT,
        toleranceB_mm: toleranceB,
        toleranceL_mm: toleranceL,
        toleranceE,
        toleranceEMode,
      },
      closeout: {
        enableNonlinearCloseout,
        thetaContactStartDeg,
        hardeningA,
        hardeningP,
        hardeningFactorLegacy: hardeningFactor,
      },
      engineeringMaterial: {
        materialId: spiralMatId,
        surface: spiralSurface,
        reliability: spiralReliability,
        shotPeened,
        strengthBasis,
        heatTreatment,
      },
    });
  }, [
    springRate,
    preloadTorque,
    minTorque,
    maxTorque,
    stripWidth,
    stripThickness,
    activeLength,
    thetaMaxUsed,
    closeOutAngle,
    maxWorkingAngle,
    material,
    materialFull?.surfaceFactor,
    materialFull?.tempFactor,
    materialFull?.sizeFactor,
    innerEndKtType,
    outerEndKtType,
    innerKtOverride,
    outerKtOverride,
    toleranceB,
    toleranceT,
    toleranceL,
    toleranceE,
    toleranceEMode,
    hardeningFactor,
    enableNonlinearCloseout,
    thetaContactStartDeg,
    hardeningA,
    hardeningP,
    spiralMatId,
    spiralSurface,
    spiralReliability,
    shotPeened,
    strengthBasis,
    heatTreatment,
  ]);

  const resetEngineeringMaterial = useCallback(() => {
    const m = getSpiralSpringMaterial(spiralMatId);
    setSpiralSurface(m?.defaultSurface ?? "as_rolled");
    setSpiralReliability(0.95);
    setShotPeened(false);
    setStrengthBasis("nominal");
    setHeatTreatment("default");
  }, [spiralMatId]);

  const applyRecommendedEngineeringMaterial = useCallback(() => {
    const m = getSpiralSpringMaterial(spiralMatId);
    if (m?.defaultSurface) setSpiralSurface(m.defaultSurface);
    setSpiralReliability(0.95);
    setShotPeened(derived.review.fatigueRYG !== "GREEN");
    setStrengthBasis("nominal");
    setHeatTreatment("default");
  }, [derived.review.fatigueRYG, spiralMatId]);

  useEffect(() => {
    if (unitSelfCheckWarnedRef.current) return;
    const k = springRate;
    if (!isFinite(k) || Math.abs(k) < 1e-12) return;

    const thetaMaxUsed = operatingStatus === "EXCEEDED" ? closeOutAngle : maxWorkingAngle;
    const points = [0, thetaMaxUsed / 2, thetaMaxUsed];
    const eps = 1e-6;

    const torqueAtTheta = (thetaDeg: number) => preloadTorque + k * thetaDeg;

    const failed = points.some((thetaDeg) => {
      const T = torqueAtTheta(thetaDeg);
      const thetaBack = (T - preloadTorque) / k;
      return !isFinite(thetaBack) || Math.abs(thetaBack - thetaDeg) > eps;
    });

    if (failed) {
      unitSelfCheckWarnedRef.current = true;
      console.warn("[SpiralTorsion] unit mismatch: expected (T - T0)/k ≈ θ", {
        springRate: k,
        preloadTorque,
        points,
      });
    }
  }, [springRate, preloadTorque, maxWorkingAngle, closeOutAngle, operatingStatus]);

  return (
    <main className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          <Link href="/tools/analysis">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? "返回" : "Back"}
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            disabled={isExportingPdf || !canExportReport}
            onClick={() => {
              void (async () => {
                setIsExportingPdf(true);
                try {
                  const model = buildSpiralReportModel({
                    geometry,
                    calculatorMaterial: material,
                    analysisResult,
                    derived,
                    extras: {
                      reportMeta: {
                        language: "bilingual",
                        projectName: reportProjectName || undefined,
                        engineer: reportEngineer || undefined,
                        partNo: reportPartNo || undefined,
                        fatigueCriterion,
                      },
                      innerEndKtType,
                      outerEndKtType,
                      toleranceT,
                      toleranceB,
                      toleranceL,
                      toleranceE,
                      toleranceEMode,
                      hardeningFactor,
                      enableNonlinearCloseout,
                      thetaContactStartDeg,
                      hardeningA,
                      hardeningP,
                      engineeringMaterial: {
                        materialId: spiralMatId,
                        surface: spiralSurface,
                        reliability: spiralReliability,
                        shotPeened,
                        strengthBasis,
                        heatTreatment,
                      },
                    },
                  });

                  const response = await fetch("/api/reports/spiral-torsion", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(model),
                  });

                  if (!response.ok) {
                    const err = await response.json().catch(() => null);
                    throw new Error(err?.error ?? `HTTP ${response.status}`);
                  }

                  const blob = await response.blob();
                  const cd = response.headers.get("content-disposition");
                  const match = cd ? /filename=\"?([^\";]+)\"?/i.exec(cd) : null;
                  const filename = match?.[1] ?? "spiral-torsion-report.pdf";

                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  console.error("[Spiral] PDF export failed", e);
                } finally {
                  setIsExportingPdf(false);
                }
              })();
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            {isExportingPdf ? (isZh ? "导出中..." : "Exporting...") : isZh ? "导出 PDF" : "Export PDF"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={isExportingDraft || !canExportReport}
            className="transition-colors hover:bg-purple-200 hover:text-purple-950 dark:hover:bg-purple-900/40 dark:hover:text-purple-100"
            title={isZh ? "导出草稿：下载 JSON + 打开/下载 HTML 预览" : "Draft export: download JSON + open/download HTML preview"}
            onClick={() => {
              setIsExportingDraft(true);
              try {
                const model = buildSpiralReportModel({
                  geometry,
                  calculatorMaterial: material,
                  analysisResult,
                  derived,
                  extras: {
                    reportMeta: {
                      language: "bilingual",
                      projectName: reportProjectName || undefined,
                      engineer: reportEngineer || undefined,
                      partNo: reportPartNo || undefined,
                      fatigueCriterion,
                    },
                    innerEndKtType,
                    outerEndKtType,
                    toleranceT,
                    toleranceB,
                    toleranceL,
                    toleranceE,
                    toleranceEMode,
                    hardeningFactor,
                    enableNonlinearCloseout,
                    thetaContactStartDeg,
                    hardeningA,
                    hardeningP,
                    engineeringMaterial: {
                      materialId: spiralMatId,
                      surface: spiralSurface,
                      reliability: spiralReliability,
                      shotPeened,
                      strengthBasis,
                      heatTreatment,
                    },
                  },
                });
                console.log("[Spiral] Draft Report Model", model);

                const json = JSON.stringify(model, null, 2);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `spiral-torsion-report-model-${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

                const html = generateSpiralReportDraftHTML(model);
                const htmlBlob = new Blob([html], { type: "text/html" });
                const htmlUrl = URL.createObjectURL(htmlBlob);
                const opened = window.open(htmlUrl, "_blank");
                if (!opened) {
                  const ah = document.createElement("a");
                  ah.href = htmlUrl;
                  ah.download = `spiral-torsion-report-draft-${Date.now()}.html`;
                  document.body.appendChild(ah);
                  ah.click();
                  ah.remove();
                }
                setTimeout(() => URL.revokeObjectURL(htmlUrl), 10_000);
              } finally {
                setIsExportingDraft(false);
              }
            }}
          >
            {isExportingDraft ? (isZh ? "导出草稿..." : "Exporting draft...") : isZh ? "导出 PDF（草稿）" : "Export PDF (Draft)"}
          </Button>

          {closeoutInputError && (
            <div className="text-xs text-red-600 dark:text-red-300 mt-2">{closeoutInputError}</div>
          )}
        </div>

        <div className="grid gap-2 mb-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{isZh ? "项目 / Project" : "Project"}</Label>
            <Input value={reportProjectName} onChange={(e) => setReportProjectName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{isZh ? "工程师 / Engineer" : "Engineer"}</Label>
            <Input value={reportEngineer} onChange={(e) => setReportEngineer(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{isZh ? "零件号 / Part No." : "Part No."}</Label>
            <Input value={reportPartNo} onChange={(e) => setReportPartNo(e.target.value)} className="h-9" />
          </div>
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
            <div className="space-y-2 p-3 rounded-md bg-green-50 border border-green-200 dark:bg-green-900/30 dark:border-green-700">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {isZh ? "扭转刚度" : "Spring Rate"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">k (corrected):</span>
                <span className="font-medium text-green-700 dark:text-green-300">{springRate.toFixed(4)} N·mm/°</span>
              </div>
            </div>

            {/* Torque */}
            <div className="space-y-2 p-3 rounded-md bg-cyan-50 border border-cyan-200 dark:bg-cyan-900/30 dark:border-cyan-700">
              <p className="text-sm font-medium text-cyan-800 dark:text-cyan-300">
                {isZh ? "扭矩" : "Torque"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">T₀ (preload):</span>
                <span>{preloadTorque.toFixed(2)} N·mm</span>
                <span className="text-slate-700 dark:text-slate-300">T(θ_min):</span>
                <span>{minTorque.toFixed(2)} N·mm</span>
                <span className="text-slate-700 dark:text-slate-300">T(θ_max):</span>
                <span
                  className={`font-medium ${
                    operatingStatus === "EXCEEDED" ? "text-red-700 dark:text-red-300" : "text-cyan-700 dark:text-cyan-300"
                  }`}
                >
                  {maxTorque.toFixed(2)} N·mm
                  {operatingStatus === "EXCEEDED" && " (clamped)"}
                </span>
                <span className="text-slate-700 dark:text-slate-300">T(θ_co):</span>
                <span className="text-amber-700 dark:text-amber-300">{closeOutTorque.toFixed(2)} N·mm</span>
              </div>
            </div>

            {/* Stress */}
            <div className="space-y-2 p-3 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {isZh ? "弯曲应力 (σ)" : "Bending Stress (σ)"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">σ_max:</span>
                <span>{maxStress.toFixed(1)} MPa</span>
                <span className="text-slate-700 dark:text-slate-300">σ_allow:</span>
                <span>{(material.tensileStrength ? material.tensileStrength * 0.45 : 0).toFixed(0)} MPa</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {isZh ? "注：螺旋扭转弹簧主应力为弯曲应力 σ，非剪切应力 τ" : "Note: Primary stress is bending σ, not shear τ"}
              </p>
            </div>

            {/* Safety Factor */}
            <div className={`space-y-2 p-3 rounded-md border ${
              safetyFactor >= 1.2 
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700" 
                : safetyFactor >= 1.0 
                  ? "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700"
                  : "bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700"
            }`}>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-300">
                {isZh ? "安全系数" : "Safety Factor"}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-300">n (linear):</span>
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
              <div className="p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-700">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                  ⚠️ {isZh ? "Close-out 警告" : "Close-out Warning"}
                </p>
                <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                  <li>• {isZh ? "工作角度超过 close-out 限制 (θ > θ_co)" : "Working angle exceeds close-out limit (θ > θ_co)"}</li>
                  <li>• {isZh ? "close-out 后扭矩急剧非线性增加，无法准确计算" : "Torque increases rapidly and non-linearly beyond close-out"}</li>
                  <li>• {isZh ? "建议：工作角度应 ≤ 0.8 × θ_co，或咨询制造商" : "Recommendation: θ ≤ 0.8 × θ_co, or consult manufacturer"}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{isZh ? "工程级分析增强" : "Engineering Enhancements"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ends" className="w-full">
              <TabsList className="mb-4 flex flex-wrap">
                <TabsTrigger value="preview">{isZh ? "预览" : "Preview"}</TabsTrigger>
                <TabsTrigger value="fea">FEA</TabsTrigger>
                <TabsTrigger value="material">{isZh ? "材料" : "Material"}</TabsTrigger>
                <TabsTrigger value="ends">{isZh ? "端部" : "Ends"}</TabsTrigger>
                <TabsTrigger value="fatigue">{isZh ? "疲劳" : "Fatigue"}</TabsTrigger>
                <TabsTrigger value="tolerance">{isZh ? "公差" : "Tolerance"}</TabsTrigger>
                <TabsTrigger value="closeout">{isZh ? "贴合/硬化" : "Close-out"}</TabsTrigger>
                <TabsTrigger value="review">{isZh ? "评审" : "Review"}</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-3">
                <div className="h-[420px] rounded-lg overflow-hidden">
                  <SpiralTorsionSpringVisualizer
                    innerDiameter={innerDiameter}
                    outerDiameter={outerDiameter}
                    turns={geometry.activeCoils}
                    stripWidth={stripWidth}
                    stripThickness={stripThickness}
                    handedness={windingDirection ?? "cw"}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {isZh ? "Three.js 预览：拖动旋转，滚轮缩放" : "Three.js preview: drag to rotate, scroll to zoom"}
                </p>
              </TabsContent>

              <TabsContent value="fea" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg overflow-hidden border border-border">
                    <div className="h-[420px] bg-slate-50">
                      <SpiralTorsionSpringVisualizer
                        innerDiameter={innerDiameter}
                        outerDiameter={outerDiameter}
                        turns={geometry.activeCoils}
                        stripWidth={stripWidth}
                        stripThickness={stripThickness}
                        handedness={windingDirection ?? "cw"}
                      />
                    </div>
                  </div>

                  <SpiralFeaPanel
                    isZh={isZh}
                    geometry={geometry}
                    springRate_NmmPerDeg={springRate}
                    preloadTorque_Nmm={preloadTorque}
                    suggestedTorque_Nmm={maxTorque}
                    suggestedAngle_deg={thetaMaxUsed}
                    allowableStress_MPa={allowableStress_MPa}
                  />
                </div>
              </TabsContent>

              <TabsContent value="material" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={resetEngineeringMaterial}>
                        {isZh ? "重置" : "Reset"}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={applyRecommendedEngineeringMaterial}>
                        {isZh ? "应用推荐" : "Apply recommended"}
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{isZh ? "工程材料" : "Engineering Material"}</Label>
                      <Select value={spiralMatId} onValueChange={(v) => setSpiralMatId(v as SpiralSpringMaterial["id"])}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPIRAL_SPRING_MATERIALS.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.standard})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{isZh ? "强度基准" : "Strength basis"}</Label>
                        <Select value={strengthBasis} onValueChange={(v) => setStrengthBasis(v as SpiralStrengthBasis)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nominal">{isZh ? "名义（不修正）" : "Nominal (no adjustment)"}</SelectItem>
                            <SelectItem value="thickness_heat_treatment">{isZh ? "按厚度/热处理修正" : "Adjusted by thickness/HT"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{isZh ? "热处理状态" : "Heat treatment"}</Label>
                        <Select
                          value={heatTreatment}
                          onValueChange={(v) => setHeatTreatment(v as SpiralHeatTreatment)}
                          disabled={strengthBasis === "nominal"}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{isZh ? "默认/未知" : "Default/Unknown"}</SelectItem>
                            <SelectItem value="spring_tempered">{isZh ? "弹簧回火" : "Spring tempered"}</SelectItem>
                            <SelectItem value="hardened_tempered">{isZh ? "淬火+回火" : "Hardened & tempered"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{isZh ? "表面" : "Surface"}</Label>
                        <Select value={spiralSurface} onValueChange={(v) => setSpiralSurface(v as SpiralSurfaceFinish)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="polished">{isZh ? "抛光" : "Polished"}</SelectItem>
                            <SelectItem value="oil_tempered">{isZh ? "油淬回火" : "Oil Tempered"}</SelectItem>
                            <SelectItem value="as_rolled">{isZh ? "轧制态" : "As Rolled"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{isZh ? "可靠度" : "Reliability"}</Label>
                        <Select value={String(spiralReliability)} onValueChange={(v) => setSpiralReliability(Number(v) as SpiralReliability)}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.9">90%</SelectItem>
                            <SelectItem value="0.95">95%</SelectItem>
                            <SelectItem value="0.99">99%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3">
                      <div>
                        <div className="text-sm font-medium">{isZh ? "喷丸" : "Shot Peen"}</div>
                        <div className="text-xs text-muted-foreground">
                          {isZh ? "用于提高疲劳极限（k_peen）" : "Improves endurance limit (k_peen)"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {isZh
                            ? "假设：仅通过 k_peen 作用于 Se′；不显式建模残余应力/均值应力迁移。"
                            : "Assumption: k_peen applies to Se' only; residual stress / mean-stress shift not modeled."}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={shotPeened}
                          onChange={(e) => setShotPeened(e.target.checked)}
                          className="size-4 rounded border-slate-300"
                        />
                        {isZh ? "启用" : "Enable"}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <div className="text-sm font-medium mb-2">{isZh ? "材料属性（只读）" : "Material Properties (Read-only)"}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">E</span>
                        <span>{getSpiralSpringMaterial(spiralMatId)?.elasticModulus_MPa.toFixed(0)} MPa</span>
                        <span className="text-muted-foreground">Su</span>
                        <span>{getSpiralSpringMaterial(spiralMatId)?.ultimateStrength_MPa.toFixed(0)} MPa</span>
                        <span className="text-muted-foreground">Sy</span>
                        <span>{getSpiralSpringMaterial(spiralMatId)?.yieldStrength_MPa.toFixed(0)} MPa</span>
                        <span className="text-muted-foreground">Se′</span>
                        <span>{getSpiralSpringMaterial(spiralMatId)?.SePrime_MPa.toFixed(0)} MPa</span>
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <div className="text-sm font-medium mb-2">{isZh ? "疲劳修正（用于 Goodman）" : "Fatigue Corrections (for Goodman)"}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">k_surface</span>
                        <span>{derived.kSurface !== null ? derived.kSurface.toFixed(3) : "—"}</span>
                        <span className="text-muted-foreground">k_reliability</span>
                        <span>{derived.kReliability !== null ? derived.kReliability.toFixed(3) : "—"}</span>
                        <span className="text-muted-foreground">k_peen</span>
                        <span>{derived.kPeen !== null ? derived.kPeen.toFixed(3) : "—"}</span>
                        <span className="text-muted-foreground">Se</span>
                        <span className="font-medium">{derived.Se !== null ? derived.Se.toFixed(0) : "—"} MPa</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {isZh
                          ? "Se = Se′ × k_surface × k_reliability × k_peen。"
                          : "Se = Se′ × k_surface × k_reliability × k_peen."}
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <div className="text-sm font-medium mb-2">{isZh ? "强度修正（可选）" : "Strength Adjustment (Optional)"}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">basis</span>
                        <span>{derived.strengthBasis ?? "nominal"}</span>
                        <span className="text-muted-foreground">heat treatment</span>
                        <span>{derived.heatTreatment ?? "default"}</span>
                        <span className="text-muted-foreground">k_thickness</span>
                        <span>{derived.kThickness !== undefined ? Number(derived.kThickness).toFixed(3) : "1.000"}</span>
                        <span className="text-muted-foreground">k_heat_treatment</span>
                        <span>{derived.kHeatTreatment !== undefined ? Number(derived.kHeatTreatment).toFixed(3) : "1.000"}</span>
                        <span className="text-muted-foreground">Su_used</span>
                        <span>{derived.Su !== null && derived.Su !== undefined ? Number(derived.Su).toFixed(0) : "—"} MPa</span>
                        <span className="text-muted-foreground">Sy_used</span>
                        <span>{derived.Sy !== null && derived.Sy !== undefined ? Number(derived.Sy).toFixed(0) : "—"} MPa</span>
                        <span className="text-muted-foreground">Se′_used</span>
                        <span>{derived.SePrime !== null && derived.SePrime !== undefined ? Number(derived.SePrime).toFixed(0) : "—"} MPa</span>
                      </div>
                      {Array.isArray((derived as any).strengthAssumptions) && (derived as any).strengthAssumptions.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                          {(derived as any).strengthAssumptions.slice(0, 6).map((s: string, idx: number) => (
                            <div key={idx}>{s}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="review" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{isZh ? "工程评审" : "Engineering Review"}</div>
                  <Badge
                    className={`${
                      derived.review.overall === "GREEN"
                        ? "bg-emerald-600 text-white"
                        : derived.review.overall === "YELLOW"
                          ? "bg-amber-500 text-white"
                          : "bg-red-600 text-white"
                    }`}
                  >
                    {derived.review.overall}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{isZh ? "静强度" : "Static"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge
                        className={`${
                          derived.review.staticRYG === "GREEN"
                            ? "bg-emerald-600 text-white"
                            : derived.review.staticRYG === "YELLOW"
                              ? "bg-amber-500 text-white"
                              : "bg-red-600 text-white"
                        }`}
                      >
                        {derived.review.staticRYG}
                      </Badge>
                      <div className="text-xs text-muted-foreground">Sy/σmax (bending)</div>
                      <div className="text-sm font-medium">
                        {derived.review.staticSF !== null ? derived.review.staticSF.toFixed(2) : "—"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{isZh ? "疲劳" : "Fatigue"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge
                        className={`${
                          derived.review.fatigueRYG === "GREEN"
                            ? "bg-emerald-600 text-white"
                            : derived.review.fatigueRYG === "YELLOW"
                              ? "bg-amber-500 text-white"
                              : "bg-red-600 text-white"
                        }`}
                      >
                        {derived.review.fatigueRYG}
                      </Badge>
                      <div className="text-xs text-muted-foreground">Goodman SF</div>
                      <div className="text-sm font-medium">
                        {derived.review.fatigueSF !== null ? derived.review.fatigueSF.toFixed(2) : "—"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{isZh ? "贴合" : "Close-out"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge
                        className={`${
                          derived.review.closeoutRYG === "GREEN"
                            ? "bg-emerald-600 text-white"
                            : derived.review.closeoutRYG === "YELLOW"
                              ? "bg-amber-500 text-white"
                              : "bg-red-600 text-white"
                        }`}
                      >
                        {derived.review.closeoutRYG}
                      </Badge>
                      <div className="text-xs text-muted-foreground">θmax/θco</div>
                      <div className="text-sm font-medium">
                        {derived.review.closeoutRatio !== null ? derived.review.closeoutRatio.toFixed(2) : "—"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{isZh ? "几何" : "Geometry"}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Badge
                        className={`${
                          derived.review.geometryRYG === "GREEN"
                            ? "bg-emerald-600 text-white"
                            : derived.review.geometryRYG === "YELLOW"
                              ? "bg-amber-500 text-white"
                              : "bg-red-600 text-white"
                        }`}
                      >
                        {derived.review.geometryRYG}
                      </Badge>
                      <div className="text-xs text-muted-foreground">b/t</div>
                      <div className="text-sm font-medium">
                        {derived.review.btRatio !== null ? derived.review.btRatio.toFixed(1) : "—"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{isZh ? "评审信息" : "Messages"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {derived.review.messages.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{isZh ? "无" : "None"}</div>
                    ) : (
                      <ul className="text-sm space-y-1">
                        {derived.review.messages.map((m, i) => (
                          <li key={i} className="text-muted-foreground">{m}</li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ends" className="space-y-4">
                <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                  <div className="text-sm font-medium">{isZh ? "端部应力集中 (Kt)" : "End Stress Concentration (Kt)"}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{isZh ? "内端" : "Inner End"}</Label>
                      <Select value={innerEndKtType} onValueChange={(v) => setInnerEndKtType(v as EndKtType)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={isZh ? "选择端部形式" : "Select end type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(END_KT_LABELS) as EndKtType[]).map((t) => {
                            const label = isZh
                              ? `${END_KT_LABELS[t].zh} / ${END_KT_LABELS[t].en}`
                              : `${END_KT_LABELS[t].en} / ${END_KT_LABELS[t].zh}`;
                            return (
                              <SelectItem key={t} value={t}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={END_KT_DEFAULTS[innerEndKtType].toString()}
                        value={innerKtOverride ?? ""}
                        onChange={(e) =>
                          setInnerKtOverride(e.target.value === "" ? null : parseFloat(e.target.value) || null)
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{isZh ? "外端" : "Outer End"}</Label>
                      <Select value={outerEndKtType} onValueChange={(v) => setOuterEndKtType(v as EndKtType)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={isZh ? "选择端部形式" : "Select end type"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(END_KT_LABELS) as EndKtType[]).map((t) => {
                            const label = isZh
                              ? `${END_KT_LABELS[t].zh} / ${END_KT_LABELS[t].en}`
                              : `${END_KT_LABELS[t].en} / ${END_KT_LABELS[t].zh}`;
                            return (
                              <SelectItem key={t} value={t}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={END_KT_DEFAULTS[outerEndKtType].toString()}
                        value={outerKtOverride ?? ""}
                        onChange={(e) =>
                          setOuterKtOverride(e.target.value === "" ? null : parseFloat(e.target.value) || null)
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <span className="text-muted-foreground">governingKt:</span>
                    <span className="font-medium">{derived.governingKt.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isZh ? "疲劳/峰值应力使用 governingKt × σ_nominal。" : "Fatigue and peak stress use governingKt × σ_nominal."}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="fatigue" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-purple-200 bg-purple-50 p-4 text-slate-900 dark:border-purple-700 dark:bg-purple-950/30 dark:text-slate-100">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                        {isZh ? "疲劳评估" : "Fatigue Assessment"}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {isZh ? "单位: MPa" : "Unit: MPa"}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 dark:text-slate-300">{isZh ? "准则" : "Criterion"}</Label>
                        <Select value={fatigueCriterion} onValueChange={(v) => setFatigueCriterion(v as typeof fatigueCriterion)}>
                          <SelectTrigger className="h-9 bg-white/60 dark:bg-slate-950/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="goodman">Goodman</SelectItem>
                            <SelectItem value="gerber">Gerber</SelectItem>
                            <SelectItem value="soderberg">Soderberg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 dark:text-slate-300">{isZh ? "选中准则 FoS" : "Selected FoS"}</Label>
                        <div
                          className={`h-9 flex items-center rounded-md border px-3 text-sm font-semibold bg-white/60 dark:bg-slate-950/20 ${
                            (derived.fatigueCriteria?.[fatigueCriterion] ?? null) !== null &&
                            (derived.fatigueCriteria?.[fatigueCriterion] ?? 0) >= 1
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {derived.fatigueCriteria?.[fatigueCriterion] !== null &&
                          derived.fatigueCriteria?.[fatigueCriterion] !== undefined
                            ? derived.fatigueCriteria[fatigueCriterion]!.toFixed(2)
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">σ_a (amplitude)</span>
                      <span className="font-medium">{derived.sigmaA.toFixed(1)}</span>
                      <span className="text-slate-600 dark:text-slate-300">σ_m (mean)</span>
                      <span className="font-medium">{derived.sigmaM.toFixed(1)}</span>
                      <span className="text-slate-600 dark:text-slate-300">Se (endurance)</span>
                      <span className="font-medium">{derived.Se !== null ? derived.Se.toFixed(0) : "—"}</span>
                      <span className="text-slate-600 dark:text-slate-300">Su (UTS)</span>
                      <span className="font-medium">{derived.Su !== null ? derived.Su.toFixed(0) : "—"}</span>
                      <span className="text-slate-600 dark:text-slate-300">FoS (Goodman)</span>
                      <span className="font-medium">{derived.fatigueCriteria?.goodman !== null ? derived.fatigueCriteria?.goodman?.toFixed(2) : "—"}</span>
                      <span className="text-slate-600 dark:text-slate-300">FoS (Gerber)</span>
                      <span className="font-medium">{derived.fatigueCriteria?.gerber !== null ? derived.fatigueCriteria?.gerber?.toFixed(2) : "—"}</span>
                      <span className="text-slate-600 dark:text-slate-300">FoS (Soderberg)</span>
                      <span className="font-medium">{derived.fatigueCriteria?.soderberg !== null ? derived.fatigueCriteria?.soderberg?.toFixed(2) : "—"}</span>
                    </div>

                    <div className="mt-3 text-xs text-slate-700 dark:text-slate-300">
                      {isZh
                        ? "默认评审使用 Goodman。σ 使用 governingKt×σ_nominal 修正。Goodman：σ_a/Se + σ_m/Su ≤ 1；Gerber：σ_a/Se + (σ_m/Su)^2 ≤ 1；Soderberg：σ_a/Se + σ_m/Sy ≤ 1。"
                        : "Review uses Goodman by default. Stress is corrected using governingKt×σ_nominal. Goodman: σ_a/Se + σ_m/Su ≤ 1; Gerber: σ_a/Se + (σ_m/Su)^2 ≤ 1; Soderberg: σ_a/Se + σ_m/Sy ≤ 1."}
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{isZh ? "疲劳图（σ_a–σ_m）" : "Fatigue Plot (σ_a–σ_m)"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <GoodmanChart
                        sigmaA={derived.sigmaA}
                        sigmaM={derived.sigmaM}
                        Se={derived.Se}
                        Su={derived.Su}
                        Sy={derived.Sy}
                        criterion={fatigueCriterion}
                        height={320}
                      />
                      <div className="mt-2 text-xs text-muted-foreground">
                        {fatigueCriterion === "soderberg"
                          ? isZh
                            ? "当前选择为 Soderberg（需要 Sy）。"
                            : "Current selection: Soderberg (requires Sy)."
                          : fatigueCriterion === "gerber"
                            ? isZh
                              ? "当前选择为 Gerber。"
                              : "Current selection: Gerber."
                            : isZh
                              ? "当前选择为 Goodman。"
                              : "Current selection: Goodman."}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tolerance" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Δt (mm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={toleranceT}
                          onChange={(e) => setToleranceT(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Δb (mm)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={toleranceB}
                          onChange={(e) => setToleranceB(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">ΔL (mm)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={toleranceL}
                          onChange={(e) => setToleranceL(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">ΔE</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={toleranceEMode} onValueChange={(v) => setToleranceEMode(v as "MPa" | "%")}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MPa">{isZh ? "绝对值 (MPa)" : "Absolute (MPa)"}</SelectItem>
                              <SelectItem value="%">{isZh ? "百分比 (%)" : "Percent (%)"}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            step={toleranceEMode === "%" ? 0.1 : 100}
                            value={toleranceE}
                            onChange={(e) => setToleranceE(parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 p-3 rounded-md bg-amber-900/30 border border-amber-700">
                      <div className="text-sm font-medium text-amber-300">{isZh ? "公差敏感性 (k ∝ b·t³/L)" : "Tolerance Sensitivity (k ∝ b·t³/L)"}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-slate-400">k_min:</span>
                        <span>{derived.kMin.toFixed(4)} N·mm/°</span>
                        <span className="text-slate-400">k_max:</span>
                        <span>{derived.kMax.toFixed(4)} N·mm/°</span>
                        <span className="text-slate-400">T@θmax band:</span>
                        <span>{derived.TMaxBandMin.toFixed(1)} ~ {derived.TMaxBandMax.toFixed(1)} N·mm</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {isZh ? "敏感度排序：t(×3) > b(×1) ≈ L(×1)。" : "Sensitivity: t(×3) > b(×1) ≈ L(×1)."}
                      </div>
                    </div>

                    <div className="space-y-2 p-3 rounded-md bg-emerald-900/30 border border-emerald-700">
                      <div className="text-sm font-medium text-emerald-300">{isZh ? "公差敏感性" : "Tolerance Sensitivity"}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-slate-400">k_min:</span>
                        <span>{derived.kMin.toFixed(4)} N·mm/deg</span>
                        <span className="text-slate-400">k_max:</span>
                        <span>{derived.kMax.toFixed(4)} N·mm/deg</span>
                        <span className="text-slate-400">T@θmax band:</span>
                        <span>
                          [{derived.TMaxBandMin.toFixed(1)} ~ {derived.TMaxBandMax.toFixed(1)}] N·mm
                        </span>
                        <span className="text-slate-400">curve samples:</span>
                        <span>{derived.torqueBandCurve.length}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {isZh ? "一阶近似：Δk/k ≈ Δb/b + 3Δt/t - ΔL/L。" : "First-order: Δk/k ≈ Δb/b + 3Δt/t - ΔL/L."}
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{isZh ? "扭矩-角度公差带" : "Torque–Angle Band"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SpiralTorqueBandChart data={derived.torqueBandCurve} height={320} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="closeout" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hardening Factor</Label>
                      <Input
                        type="number"
                        step="1"
                        min={1}
                        value={hardeningFactor}
                        onChange={(e) => setHardeningFactor(Math.max(1, Math.round(parseFloat(e.target.value) || 1)))}
                      />
                    </div>

                    <div className="space-y-2 p-3 rounded-md border border-border bg-muted/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{isZh ? "Close-out 渐进硬化模型" : "Close-out Progressive Hardening"}</div>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={enableNonlinearCloseout}
                            onChange={(e) => setEnableNonlinearCloseout(e.target.checked)}
                            className="size-4 rounded border-slate-300"
                          />
                          {isZh ? "启用" : "Enable"}
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">θ_contactStart (deg)</Label>
                          <Input
                            type="number"
                            step="1"
                            min={0}
                            max={Math.max(0, closeOutAngle)}
                            value={thetaContactStartDeg}
                            onChange={(e) => {
                              thetaContactStartTouchedRef.current = true;
                              setThetaContactStartDeg(parseFloat(e.target.value) || 0);
                            }}
                            className="h-9"
                          />
                          {enableNonlinearCloseout &&
                            (thetaContactStartDeg < 0 || thetaContactStartDeg > closeOutAngle) &&
                            isFinite(closeOutAngle) &&
                            closeOutAngle > 0 && (
                              <div className="text-[11px] text-red-600 dark:text-red-300">
                                {isZh
                                  ? "要求：0 ≤ θ_contactStart ≤ θco"
                                  : "Requirement: 0 ≤ thetaContactStart ≤ thetaCo"}
                              </div>
                            )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">A</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={hardeningA}
                            onChange={(e) => setHardeningA(parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">p</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={hardeningP}
                            onChange={(e) => setHardeningP(parseFloat(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                      </div>

                      {enableNonlinearCloseout && (
                        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                          <span className="text-muted-foreground">θ_contactStart_used:</span>
                          <span>{derived.thetaContactStartUsed.toFixed(1)} deg</span>
                          <span className="text-muted-foreground">T@θmax (linear/clamped):</span>
                          <span>{maxTorque.toFixed(1)} N·mm</span>
                          <span className="text-muted-foreground">T@θmax (nonlinear):</span>
                          <span>{derived.nonlinearTorqueAtMax !== null ? derived.nonlinearTorqueAtMax.toFixed(1) : "—"} N·mm</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {isZh
                          ? "θ ≤ θ_contactStart 采用线性刚度；之后刚度按 k(θ)=k0·(1 + A·((θ-θc1)/(θco-θc1))^p) 增长，并数值积分得到 T(θ)。"
                          : "For θ ≤ θ_contactStart, stiffness is linear; beyond that, k(θ)=k0·(1 + A·((θ-θc1)/(θco-θc1))^p) and T(θ) is obtained via numerical integration."}
                      </div>
                    </div>

                    {derived.maxTorqueHardening !== null && (
                      <div className="space-y-2 p-3 rounded-md bg-red-900/30 border border-red-700">
                        <div className="text-sm font-medium text-red-300">{isZh ? "Close-out 后非线性（估算）" : "Post Close-out Nonlinearity (Estimate)"}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-slate-400">T_clamped:</span>
                          <span>{maxTorque.toFixed(2)} N·mm</span>
                          <span className="text-slate-400">T_hardening:</span>
                          <span className="font-medium text-red-200">{derived.maxTorqueHardening.toFixed(2)} N·mm</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {isZh ? "该值为分段硬化模型的粗略估算，用于风险提示，不作为供货图纸校核。" : "A rough piecewise hardening estimate for risk awareness; not for supplier drawing validation."}
                        </div>
                      </div>
                    )}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{isZh ? "贴合/硬化曲线" : "Close-out Curve"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SpiralCloseoutChart
                        linear={derived.curveCloseoutLinear}
                        nonlinear={derived.curveCloseoutNonlinear}
                        thetaCoDeg={closeOutAngle}
                        height={320}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
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
