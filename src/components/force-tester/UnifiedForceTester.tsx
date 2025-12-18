"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-context";
import { cn } from "@/lib/utils";

import {
  InteractiveForceChart,
  SpringForceTable,
  SpringDeflectionSlider,
  CurrentPointCard,
  SNcurveChart,
  StressDeflectionChart,
} from "@/components/charts";

import { SpringAnalysisEngine } from "@/lib/engine/SpringAnalysisEngine";
import type {
  SpringGeometry,
  WorkingConditions,
  SpringAnalysisResult,
  ForceDeflectionPoint,
} from "@/lib/engine/types";
import { getSpringMaterial } from "@/lib/materials/springMaterials";
import { useSpringSimulationStore } from "@/lib/stores/springSimulationStore";

interface UnifiedForceTesterProps {
  /** Spring geometry */
  geometry: SpringGeometry;
  /** Working conditions */
  workingConditions: WorkingConditions;
  /** 3D visualization component */
  visualizer?: React.ReactNode;
  /** Callback when deflection changes */
  onDeflectionChange?: (deflection: number) => void;
  /** Callback for CAD export */
  onExportCAD?: () => void;
  /** Callback for PDF report */
  onExportPDF?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * Unified Force Tester Component
 * 统一力-位移测试组件
 * 
 * Provides consistent UI for all spring types:
 * - Compression springs
 * - Extension springs
 * - Torsion springs
 * - Conical springs
 */
export function UnifiedForceTester({
  geometry,
  workingConditions,
  visualizer,
  onDeflectionChange,
  onExportCAD,
  onExportPDF,
  className,
}: UnifiedForceTesterProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Current deflection state
  const [currentDeflection, setCurrentDeflection] = useState(0);

  // Run analysis
  const analysisResult = useMemo(() => {
    try {
      return SpringAnalysisEngine.analyze(geometry, workingConditions);
    } catch (error) {
      console.error("Analysis error:", error);
      return null;
    }
  }, [geometry, workingConditions]);

  // Get material info
  const material = useMemo(() => {
    return getSpringMaterial(geometry.materialId);
  }, [geometry.materialId]);

  // Current state at deflection
  const currentState = useMemo(() => {
    if (!analysisResult) return null;
    
    const point = analysisResult.forceCurve.find(
      (p) => Math.abs(p.deflection - currentDeflection) < 0.01
    ) || analysisResult.forceCurve.reduce((prev, curr) =>
      Math.abs(curr.deflection - currentDeflection) < Math.abs(prev.deflection - currentDeflection)
        ? curr
        : prev
    );

    return {
      deflection: currentDeflection,
      force: point?.force ?? 0,
      stiffness: point?.stiffness ?? analysisResult.springRate,
      stress: point?.stress ?? 0,
      activeCoils: point?.activeCoils,
      collapsedCoils: point?.collapsedCoils,
    };
  }, [analysisResult, currentDeflection]);

  // Get store actions for syncing deflection
  const setStoreDeflection = useSpringSimulationStore((state) => state.setDeflection);
  const setLinearDeflection = useSpringSimulationStore((state) => state.setLinearDeflection);
  const storeMode = useSpringSimulationStore((state) => state.mode);

  // Handle deflection change
  const handleDeflectionChange = useCallback((value: number) => {
    setCurrentDeflection(value);
    onDeflectionChange?.(value);
    
    // Sync with store for 3D visualization
    if (storeMode === "conical-nonlinear") {
      setStoreDeflection(value);
    } else {
      setLinearDeflection(value);
    }
  }, [onDeflectionChange, storeMode, setStoreDeflection, setLinearDeflection]);

  // Reset deflection when geometry changes
  useEffect(() => {
    setCurrentDeflection(0);
    setLinearDeflection(0);
  }, [geometry, setLinearDeflection]);

  // Format helpers
  const formatNumber = (n: number, decimals = 2) =>
    Number(n.toFixed(decimals)).toLocaleString();

  const formatCycles = (n: number) => {
    if (!isFinite(n)) return "∞";
    if (n >= 1e7) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return n.toString();
  };

  const getSafetyColor = (status: "safe" | "warning" | "danger") => {
    switch (status) {
      case "safe": return "bg-green-500";
      case "warning": return "bg-amber-500";
      case "danger": return "bg-red-500";
    }
  };

  // Get spring type label
  const getSpringTypeLabel = () => {
    switch (geometry.type) {
      case "compression": return isZh ? "压缩弹簧" : "Compression Spring";
      case "extension": return isZh ? "拉伸弹簧" : "Extension Spring";
      case "torsion": return isZh ? "扭转弹簧" : "Torsion Spring";
      case "conical": return isZh ? "锥形弹簧" : "Conical Spring";
    }
  };

  // Get deflection label based on spring type
  const getDeflectionLabel = () => {
    if (geometry.type === "torsion") {
      return { en: "Rotation Angle (°)", zh: "扭转角度 (°)" };
    }
    if (geometry.type === "extension") {
      return { en: "Extension Δx (mm)", zh: "伸长量 Δx (mm)" };
    }
    return { en: "Deflection Δx (mm)", zh: "压缩量 Δx (mm)" };
  };

  // Get force label based on spring type
  const getForceLabel = () => {
    if (geometry.type === "torsion") {
      return { en: "Torque (N·mm)", zh: "扭矩 (N·mm)" };
    }
    return { en: "Force (N)", zh: "载荷 (N)" };
  };

  if (!analysisResult) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            {isZh ? "分析计算中..." : "Analyzing..."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const deflectionLabel = getDeflectionLabel();
  const forceLabel = getForceLabel();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {isZh ? "力-位移测试" : "Force-Deflection Tester"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {getSpringTypeLabel()} • {material?.nameZh || material?.nameEn}
          </p>
        </div>
        <div className="flex gap-2">
          {onExportCAD && (
            <Button variant="outline" size="sm" onClick={onExportCAD}>
              {isZh ? "CAD 导出" : "CAD Export"}
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              {isZh ? "PDF 报告" : "PDF Report"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        {/* Left Column - Charts and Controls */}
        <div className="space-y-4">
          {/* Deflection Slider */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {isZh ? "位移控制" : "Deflection Control"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpringDeflectionSlider
                min={workingConditions.minDeflection}
                max={workingConditions.maxDeflection}
                value={currentDeflection}
                onChange={handleDeflectionChange}
                labelEn={deflectionLabel.en}
                labelZh={deflectionLabel.zh}
              />
            </CardContent>
          </Card>

          {/* 3D Visualization + Current State */}
          <div className="grid gap-4 md:grid-cols-[1fr,160px]">
            {/* 3D View */}
            <Card className="overflow-hidden">
              <div className="h-[420px] bg-slate-50">
                {visualizer || (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                    {isZh ? "3D 视图" : "3D View"}
                  </div>
                )}
              </div>
            </Card>

            {/* Current State Panel - Compact */}
            <Card className="bg-slate-50 h-fit">
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {isZh ? "当前状态" : "Current State"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm px-3 pb-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">Δx</span>
                  <span className="font-semibold text-blue-600">
                    {formatNumber(currentDeflection)} {geometry.type === "torsion" ? "°" : "mm"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">
                    {geometry.type === "torsion" ? "M" : "F"}
                  </span>
                  <span className="font-semibold text-green-600">
                    {formatNumber(currentState?.force ?? 0)} {geometry.type === "torsion" ? "N·mm" : "N"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">k</span>
                  <span className="font-medium">
                    {formatNumber(currentState?.stiffness ?? 0)} {geometry.type === "torsion" ? "N·mm/°" : "N/mm"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-muted-foreground">
                    {geometry.type === "torsion" ? "σ" : "τ"}
                  </span>
                  <span className="font-medium text-purple-600">
                    {formatNumber(currentState?.stress ?? 0)} MPa
                  </span>
                </div>
                {currentState?.activeCoils !== undefined && (
                  <>
                    <div className="border-t pt-2 flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">
                        {isZh ? "有效圈" : "Active"}
                      </span>
                      <span className="font-medium">{currentState.activeCoils}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground">
                        {isZh ? "贴底圈" : "Collapsed"}
                      </span>
                      <span className="font-medium text-slate-500">
                        {currentState.collapsedCoils ?? 0}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Tabs */}
          <Card>
            <CardContent className="pt-4">
              <Tabs defaultValue="force" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="force">
                    {isZh ? "力-位移" : "F-Δx"}
                  </TabsTrigger>
                  <TabsTrigger value="stress">
                    {isZh ? "应力" : "Stress"}
                  </TabsTrigger>
                  <TabsTrigger value="fatigue">
                    {isZh ? "S-N 曲线" : "S-N Curve"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="force" className="pt-4">
                  <div className="h-[280px]">
                    <InteractiveForceChart
                      data={analysisResult.forceCurve.map((p) => ({
                        deflection: p.deflection,
                        load: p.force,
                      }))}
                      currentDeflection={currentDeflection}
                      onDeflectionChange={handleDeflectionChange}
                      xAxisLabel={isZh ? deflectionLabel.zh : deflectionLabel.en}
                      yAxisLabel={isZh ? forceLabel.zh : forceLabel.en}
                      lineColor="#3b82f6"
                      markerColor="#ef4444"
                      showMarker={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="stress" className="pt-4">
                  <StressDeflectionChart
                    data={analysisResult.forceCurve}
                    currentDeflection={currentDeflection}
                    allowableStress={analysisResult.safety.allowableStress}
                    height={280}
                    xAxisLabel={isZh ? deflectionLabel.zh : deflectionLabel.en}
                  />
                </TabsContent>

                <TabsContent value="fatigue" className="pt-4">
                  {analysisResult.fatigue.snCurveData && (
                    <SNcurveChart
                      curveData={analysisResult.fatigue.snCurveData}
                      currentPoint={{
                        cycles: analysisResult.fatigue.estimatedCycles,
                        stress: analysisResult.fatigue.tauAlt,
                      }}
                      enduranceLimit={material?.snCurve.tau2}
                      height={280}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Force Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {isZh ? "力-位移数据表" : "Force-Deflection Table"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpringForceTable
                data={analysisResult.forceCurve.map((p) => ({
                  deflection: p.deflection,
                  load: p.force,
                }))}
                currentDeflection={currentDeflection}
                onRowClick={handleDeflectionChange}
                maxHeight="max-h-48"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Analysis Results */}
        <div className="space-y-4">
          {/* Safety Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{isZh ? "安全评估" : "Safety Assessment"}</span>
                <Badge className={cn("text-white", getSafetyColor(analysisResult.safety.status))}>
                  SF = {formatNumber(analysisResult.safety.staticSafetyFactor)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">τ_max</span>
                <span className="font-medium">{formatNumber(analysisResult.stress.tauEffective)} MPa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">τ_allow</span>
                <span>{formatNumber(analysisResult.safety.allowableStress)} MPa</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {isZh ? analysisResult.safety.message.zh : analysisResult.safety.message.en}
              </p>
            </CardContent>
          </Card>

          {/* Fatigue Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>{isZh ? "疲劳寿命" : "Fatigue Life"}</span>
                <Badge variant="outline">
                  {formatCycles(analysisResult.fatigue.estimatedCycles)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">τ_mean</span>
                <span>{formatNumber(analysisResult.fatigue.tauMean)} MPa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">τ_alt</span>
                <span>{formatNumber(analysisResult.fatigue.tauAlt)} MPa</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SF_∞</span>
                <span>{formatNumber(analysisResult.fatigue.infiniteLifeSafetyFactor)}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {isZh ? analysisResult.fatigue.message.zh : analysisResult.fatigue.message.en}
              </p>
            </CardContent>
          </Card>

          {/* Buckling (compression only) */}
          {analysisResult.buckling && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{isZh ? "屈曲分析" : "Buckling"}</span>
                  <Badge className={cn("text-white", getSafetyColor(analysisResult.buckling.status))}>
                    SF = {formatNumber(analysisResult.buckling.bucklingSafetyFactor)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">λ</span>
                  <span>{formatNumber(analysisResult.buckling.slendernessRatio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P_cr</span>
                  <span>{formatNumber(analysisResult.buckling.criticalLoad)} N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">P_work</span>
                  <span>{formatNumber(analysisResult.buckling.workingLoad)} N</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {isZh ? analysisResult.buckling.message.zh : analysisResult.buckling.message.en}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stress Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {isZh ? "应力修正" : "Stress Correction"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">K_w (Wahl)</span>
                <span>{formatNumber(analysisResult.stress.wahlFactor, 3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">K_surface</span>
                <span>{formatNumber(analysisResult.stress.surfaceFactor, 3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">K_size</span>
                <span>{formatNumber(analysisResult.stress.sizeFactor, 3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">K_temp</span>
                <span>{formatNumber(analysisResult.stress.tempFactor, 3)}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>K_total</span>
                <span>{formatNumber(analysisResult.stress.totalCorrectionFactor, 3)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Geometry Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {isZh ? "几何参数" : "Geometry"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">C (index)</span>
                <span>{formatNumber(analysisResult.geometry.springIndex)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dm</span>
                <span>{formatNumber(analysisResult.geometry.meanDiameter)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">d</span>
                <span>{formatNumber(analysisResult.geometry.wireDiameter)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Na</span>
                <span>{analysisResult.geometry.activeCoils}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nt</span>
                <span>{analysisResult.geometry.totalCoils}</span>
              </div>
              {analysisResult.geometry.solidHeight && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hs</span>
                  <span>{formatNumber(analysisResult.geometry.solidHeight)} mm</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>k</span>
                <span>{formatNumber(analysisResult.springRate)} {geometry.type === "torsion" ? "N·mm/°" : "N/mm"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {analysisResult.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700">
                  {isZh ? "警告" : "Warnings"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-amber-600 space-y-1">
                  {analysisResult.warnings.map((w, i) => (
                    <li key={i}>⚠ {w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
