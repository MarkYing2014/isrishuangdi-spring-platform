/**
 * Suspension Spring Analysis Panel
 * 减震器弹簧工程分析面板
 * 
 * MVP Features:
 * - Summary Bar with key KPIs
 * - k(x) nonlinear stiffness curve visualization
 * - Fatigue estimation (Goodman)
 * - Design rules summary
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { SuspensionGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import { runSuspensionAnalysis, type SuspensionAnalysisResult } from "@/lib/suspensionSpring/analysis";
import { calculateSuspensionSpring } from "@/lib/suspensionSpring/math";
import type { SuspensionSpringInput } from "@/lib/suspensionSpring/types";

const SuspensionSpringVisualizer = dynamic(
  () => import("@/components/three/SuspensionSpringVisualizer").then((mod) => mod.SuspensionSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] bg-slate-50 rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);

interface SuspensionAnalysisPanelProps {
  isZh: boolean;
  geometry: SuspensionGeometry;
  material: MaterialInfo;
  analysisResult: AnalysisResult;
}

// Simple line chart component for k(x) curve
function KxCurveChart({ data, isZh }: { data: { x: number; k: number; hasContact: boolean }[]; isZh: boolean }) {
  if (data.length < 2) return null;

  const maxX = Math.max(...data.map(d => d.x));
  const maxK = Math.max(...data.map(d => d.k));
  const minK = Math.min(...data.map(d => d.k));
  const kRange = maxK - minK || 1;

  const width = 400;
  const height = 200;
  const padding = 40;

  const points = data.map((d, i) => {
    const x = padding + (d.x / maxX) * (width - 2 * padding);
    const y = height - padding - ((d.k - minK) / kRange) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Find contact onset point
  const contactIndex = data.findIndex(d => d.hasContact);
  const contactPoint = contactIndex >= 0 ? data[contactIndex] : null;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md">
        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#888" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#888" strokeWidth="1" />
        
        {/* Axis labels */}
        <text x={width / 2} y={height - 8} textAnchor="middle" className="text-xs fill-muted-foreground">
          {isZh ? "变形 x (mm)" : "Deflection x (mm)"}
        </text>
        <text x={12} y={height / 2} textAnchor="middle" transform={`rotate(-90, 12, ${height / 2})`} className="text-xs fill-muted-foreground">
          k (N/mm)
        </text>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={padding + t * (width - 2 * padding)} y1={padding} x2={padding + t * (width - 2 * padding)} y2={height - padding} stroke="#ddd" strokeWidth="0.5" />
        ))}

        {/* Contact zone shading */}
        {contactPoint && (
          <rect
            x={padding + (contactPoint.x / maxX) * (width - 2 * padding)}
            y={padding}
            width={(1 - contactPoint.x / maxX) * (width - 2 * padding)}
            height={height - 2 * padding}
            fill="rgba(251, 191, 36, 0.1)"
          />
        )}

        {/* Curve */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Contact onset marker */}
        {contactPoint && (
          <>
            <circle
              cx={padding + (contactPoint.x / maxX) * (width - 2 * padding)}
              cy={height - padding - ((contactPoint.k - minK) / kRange) * (height - 2 * padding)}
              r="4"
              fill="#f59e0b"
            />
            <text
              x={padding + (contactPoint.x / maxX) * (width - 2 * padding) + 8}
              y={height - padding - ((contactPoint.k - minK) / kRange) * (height - 2 * padding) - 8}
              className="text-xs fill-amber-600"
            >
              {isZh ? "接触起始" : "Contact"}
            </text>
          </>
        )}

        {/* Value labels */}
        <text x={padding - 5} y={height - padding + 5} textAnchor="end" className="text-xs fill-muted-foreground">0</text>
        <text x={width - padding} y={height - padding + 15} textAnchor="middle" className="text-xs fill-muted-foreground">{maxX.toFixed(0)}</text>
        <text x={padding - 5} y={padding + 5} textAnchor="end" className="text-xs fill-muted-foreground">{maxK.toFixed(1)}</text>
        <text x={padding - 5} y={height - padding - 5} textAnchor="end" className="text-xs fill-muted-foreground">{minK.toFixed(1)}</text>
      </svg>
      <p className="text-xs text-muted-foreground mt-2">
        {isZh ? "黄色区域：圈-圈接触开始，刚度非线性增加" : "Yellow zone: Coil contact begins, stiffness increases nonlinearly"}
      </p>
    </div>
  );
}

export function SuspensionAnalysisPanel({
  isZh,
  geometry,
  material,
  analysisResult,
}: SuspensionAnalysisPanelProps) {
  // Build input for analysis
  const input: SuspensionSpringInput = useMemo(() => ({
    geometry: {
      od_mm: geometry.wireDiameter + (geometry.diameterProfile?.DmStart ?? 100),
      wireDiameter_mm: geometry.wireDiameter,
      activeCoils_Na: geometry.activeCoils,
      totalCoils_Nt: geometry.totalCoils,
      freeLength_Hf_mm: geometry.freeLength,
      endType: geometry.pitchProfile?.endType ?? "closed_ground",
      guide: {},
    },
    material: {
      shearModulus_G_MPa: material.shearModulus,
      yieldStrength_MPa: material.tensileStrength ? material.tensileStrength * 0.7 : 1200,
      fatigueLimit_MPa: material.tensileStrength ? material.tensileStrength * 0.4 : 600,
    },
    loadcase: {
      preload_N: 500,
      rideLoad_N: 2000,
      bumpTravel_mm: 80,
      solidMargin_mm: 3,
    },
  }), [geometry, material]);

  const calcResult = useMemo(() => calculateSuspensionSpring(input), [input]);

  // Run analysis
  const analysis: SuspensionAnalysisResult | null = useMemo(() => {
    if (calcResult.errors.length > 0) return null;
    return runSuspensionAnalysis(input, calcResult);
  }, [input, calcResult]);

  // Determine overall status
  const overallStatus = useMemo(() => {
    if (!analysis) return "error";
    if (analysis.summary.sfBump < 1.0) return "fail";
    if (analysis.summary.coilBindMargin < 3) return "warning";
    if (analysis.fatigue?.lifeClass === "fail") return "fail";
    if (analysis.fatigue?.lifeClass === "low") return "warning";
    return "pass";
  }, [analysis]);

  if (!analysis) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="mb-4">
          <Link href="/tools/suspension-spring">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? "返回计算器" : "Back to Calculator"}
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {isZh ? "分析失败：无有效设计数据" : "Analysis failed: No valid design data"}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <Link href="/tools/suspension-spring">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? "返回计算器" : "Back to Calculator"}
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {isZh ? "减震器弹簧工程分析" : "Suspension Spring Engineering Analysis"}
        </h1>
        <p className="text-muted-foreground">
          {isZh ? "解析级分析 + k(x) 非线性刚度曲线 + 疲劳评估" : "Analytic analysis + k(x) nonlinear stiffness + Fatigue assessment"}
        </p>
      </div>

      {/* Summary Bar */}
      <div className={`mb-6 p-4 rounded-lg border ${
        overallStatus === "pass" 
          ? "bg-emerald-500/10 border-emerald-500/50" 
          : overallStatus === "warning"
            ? "bg-amber-500/10 border-amber-500/50"
            : "bg-red-500/10 border-red-500/50"
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {overallStatus === "pass" && <CheckCircle className="w-6 h-6 text-emerald-500" />}
          {overallStatus === "warning" && <AlertTriangle className="w-6 h-6 text-amber-500" />}
          {overallStatus === "fail" && <XCircle className="w-6 h-6 text-red-500" />}
          <span className={`font-semibold ${
            overallStatus === "pass" ? "text-emerald-500" 
            : overallStatus === "warning" ? "text-amber-500" 
            : "text-red-500"
          }`}>
            {overallStatus === "pass" && (isZh ? "✓ 设计通过" : "✓ Design Passed")}
            {overallStatus === "warning" && (isZh ? "⚠️ 需要注意" : "⚠️ Review Needed")}
            {overallStatus === "fail" && (isZh ? "❌ 设计不合格" : "❌ Design Failed")}
          </span>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{isZh ? "刚度" : "Rate"} k₀</span>
            <p className="font-mono font-semibold">{analysis.summary.kFree.toFixed(1)} N/mm</p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "Bump刚度" : "k@Bump"}</span>
            <p className="font-mono font-semibold">{analysis.summary.kBump.toFixed(1)} N/mm</p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "最大应力" : "Max τ"}</span>
            <p className="font-mono font-semibold">{analysis.summary.maxStress.toFixed(0)} MPa</p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "安全系数" : "SF@Bump"}</span>
            <p className={`font-mono font-semibold ${analysis.summary.sfBump >= 1.2 ? "text-emerald-500" : analysis.summary.sfBump >= 1.0 ? "text-amber-500" : "text-red-500"}`}>
              {analysis.summary.sfBump.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "并紧余量" : "Bind Margin"}</span>
            <p className={`font-mono font-semibold ${analysis.summary.coilBindMargin >= 3 ? "text-emerald-500" : "text-amber-500"}`}>
              {analysis.summary.coilBindMargin.toFixed(1)} mm
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "疲劳寿命" : "Fatigue"}</span>
            <Badge variant={
              analysis.fatigue?.lifeClass === "high" ? "default" :
              analysis.fatigue?.lifeClass === "mid" ? "secondary" :
              analysis.fatigue?.lifeClass === "low" ? "outline" : "destructive"
            }>
              {analysis.fatigue?.lifeClass.toUpperCase() ?? "N/A"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="kx" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="kx">{isZh ? "k(x) 曲线" : "k(x) Curve"}</TabsTrigger>
              <TabsTrigger value="stress">{isZh ? "应力分析" : "Stress"}</TabsTrigger>
              <TabsTrigger value="fatigue">{isZh ? "疲劳评估" : "Fatigue"}</TabsTrigger>
            </TabsList>

            <TabsContent value="kx">
              <Card>
                <CardHeader>
                  <CardTitle>{isZh ? "非线性刚度曲线 k(x)" : "Nonlinear Stiffness k(x)"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <KxCurveChart data={analysis.kxCurve} isZh={isZh} />
                  {analysis.contactInfo && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        {isZh ? "⚠️ 检测到圈-圈接触" : "⚠️ Coil Contact Detected"}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {isZh 
                          ? `在变形 ${analysis.contactInfo.onsetDeflection.toFixed(1)}mm 处开始接触（${(analysis.contactInfo.onsetFraction * 100).toFixed(0)}% 行程）`
                          : `Contact begins at ${analysis.contactInfo.onsetDeflection.toFixed(1)}mm deflection (${(analysis.contactInfo.onsetFraction * 100).toFixed(0)}% travel)`
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stress">
              <Card>
                <CardHeader>
                  <CardTitle>{isZh ? "工况应力分析" : "Loadcase Stress Analysis"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-xs text-muted-foreground mb-1">Preload</p>
                      <p className="font-mono text-lg">{calcResult.forces.preload_N.toFixed(0)} N</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p className="text-xs text-muted-foreground mb-1">Ride</p>
                      <p className="font-mono text-lg">{calcResult.stress.tauRide_MPa.toFixed(0)} MPa</p>
                      <p className="text-xs text-muted-foreground">SF: {calcResult.stress.yieldSafetyFactor_ride.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <p className="text-xs text-muted-foreground mb-1">Bump</p>
                      <p className="font-mono text-lg">{calcResult.stress.tauBump_MPa.toFixed(0)} MPa</p>
                      <p className="text-xs text-muted-foreground">SF: {calcResult.stress.yieldSafetyFactor_bump.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fatigue">
              <Card>
                <CardHeader>
                  <CardTitle>{isZh ? "疲劳寿命评估 (Goodman)" : "Fatigue Assessment (Goodman)"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.fatigue && (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">{isZh ? "平均应力" : "Mean Stress"}</span>
                          <p className="font-mono">{analysis.fatigue.meanStress.toFixed(0)} MPa</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "交变应力" : "Alternating Stress"}</span>
                          <p className="font-mono">{analysis.fatigue.altStress.toFixed(0)} MPa</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "疲劳安全系数" : "Fatigue SF"}</span>
                          <p className={`font-mono font-semibold ${analysis.fatigue.fatigueSF >= 1.5 ? "text-emerald-500" : analysis.fatigue.fatigueSF >= 1.0 ? "text-amber-500" : "text-red-500"}`}>
                            {analysis.fatigue.fatigueSF.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "预估寿命" : "Est. Cycles"}</span>
                          <p className="font-mono">{analysis.fatigue.estimatedCycles?.toExponential(1)}</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        analysis.fatigue.lifeClass === "high" ? "bg-emerald-50 dark:bg-emerald-900/20" :
                        analysis.fatigue.lifeClass === "mid" ? "bg-blue-50 dark:bg-blue-900/20" :
                        analysis.fatigue.lifeClass === "low" ? "bg-amber-50 dark:bg-amber-900/20" :
                        "bg-red-50 dark:bg-red-900/20"
                      }`}>
                        <p className="font-medium">
                          {isZh ? "寿命等级: " : "Life Class: "}
                          <span className="uppercase">{analysis.fatigue.lifeClass}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.fatigue.lifeClass === "high" && (isZh ? "无限寿命 (>10⁷ 次)" : "Infinite life (>10⁷ cycles)")}
                          {analysis.fatigue.lifeClass === "mid" && (isZh ? "高循环疲劳 (10⁵~10⁷ 次)" : "High cycle fatigue (10⁵~10⁷ cycles)")}
                          {analysis.fatigue.lifeClass === "low" && (isZh ? "有限寿命 (<10⁵ 次)，建议复核" : "Limited life (<10⁵ cycles), review recommended")}
                          {analysis.fatigue.lifeClass === "fail" && (isZh ? "不满足疲劳要求，需要重新设计" : "Fatigue requirements not met, redesign needed")}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 3D Preview Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{isZh ? "3D 预览" : "3D Preview"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] rounded-lg overflow-hidden border">
                <SuspensionSpringVisualizer
                  wireDiameter={geometry.wireDiameter}
                  meanDiameter={geometry.diameterProfile?.DmStart ?? 100}
                  activeCoils={geometry.activeCoils}
                  totalCoils={geometry.totalCoils}
                  freeLength={geometry.freeLength}
                  currentDeflection={0}
                  stressRatio={0.5}
                  solidHeight={calcResult.derived.solidHeight_Hs_mm}
                  currentLoad={0}
                  springRate={calcResult.springRate_N_per_mm}
                  pitchProfile={geometry.pitchProfile}
                  diameterProfile={geometry.diameterProfile}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isZh ? "拖动旋转，滚轮缩放" : "Drag to rotate, scroll to zoom"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
