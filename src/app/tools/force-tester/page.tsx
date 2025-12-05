"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";

import dynamic from "next/dynamic";
import {
  generateForceDeflectionCurve,
  calculateConicalSpringNonlinear,
  extractConicalStageTransitions,
  calculateExtensionSpring,
  calculateSpringRate,
  type ConicalNonlinearResult,
} from "@/lib/springMath";
import { 
  buildConicalDesignReportData, 
  type ConicalDesignReportData 
} from "@/lib/reports/conicalReport";
import { 
  useSpringSimulationStore, 
  findNearestCurvePoint,
  type ConicalDesignMeta,
  type CompressionDesignMeta,
  type ExtensionDesignMeta,
  type LinearCurvePoint,
} from "@/lib/stores/springSimulationStore";
import { SpringDesign } from "@/lib/springTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  InteractiveForceChart, 
  SpringForceTable, 
  SpringDeflectionSlider,
  CurrentPointCard,
} from "@/components/charts";
import { ConicalDesignReportPanel } from "@/components/reports/ConicalDesignReportPanel";
import { FileDown, Send, Box } from "lucide-react";

// Dynamic import for 3D visualizers to avoid SSR issues
const ConicalSpringVisualizer = dynamic(
  () => import("@/components/three/ConicalSpringVisualizer").then(mod => mod.ConicalSpringVisualizer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg"><p className="text-sm text-muted-foreground">Loading 3D...</p></div> }
);

const CompressionSpringVisualizer = dynamic(
  () => import("@/components/three/CompressionSpringVisualizer").then(mod => mod.CompressionSpringVisualizer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg"><p className="text-sm text-muted-foreground">Loading 3D...</p></div> }
);

const DEFAULTS = {
  k: 20,
  L0: 50,
  dx: 25,
  step: 5,
};

const formSchema = z.object({
  k: z.coerce.number().positive("Spring rate must be > 0"),
  freeLength: z.coerce.number().positive("Free length must be > 0"),
  maxDeflection: z.coerce.number().positive("Max deflection must be > 0"),
  step: z.coerce.number().positive("Step must be > 0"),
});

type FormValues = z.infer<typeof formSchema>;

export default function SpringForceTesterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading Force Tester...</div>}>
      <ForceTesterContent />
    </Suspense>
  );
}

function ForceTesterContent() {
  const searchParams = useSearchParams();
  const readParam = (key: string, fallback: number) => {
    const raw = searchParams.get(key);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const dxRecommended = searchParams.get("dxRecommended");
  
  // Check spring type from URL
  const springType = searchParams.get("type") as "compression" | "extension" | "conical" | null;
  const isConical = springType === "conical";
  const isCompression = springType === "compression";
  const isExtension = springType === "extension";

  // Conical spring parameters from URL (supports both maxX and dxMax)
  const conicalParams = isConical ? {
    wireDiameter: readParam("d", 3),
    largeOuterDiameter: readParam("D1", 30),
    smallOuterDiameter: readParam("D2", 15),
    activeCoils: readParam("Na", 5),
    shearModulus: readParam("G", 79300),
    freeLength: readParam("L0", 40),
    maxDeflection: readParam("dxMax", readParam("maxX", 20)),
  } : null;

  // Compression spring parameters from URL
  const compressionParams = isCompression ? {
    wireDiameter: readParam("d", 3.2),
    meanDiameter: readParam("Dm", 24),
    activeCoils: readParam("Na", 8),
    shearModulus: readParam("G", 79300),
    freeLength: readParam("L0", 50),
    maxDeflection: readParam("dxMax", 20),
  } : null;

  // Extension spring parameters from URL
  const extensionParams = isExtension ? {
    outerDiameter: readParam("OD", 12),
    wireDiameter: readParam("d", 1.5),
    activeCoils: readParam("Na", 10),
    bodyLength: readParam("Lb", 25),
    freeLengthInsideHooks: readParam("Li", 35),
    shearModulus: readParam("G", 79300),
    initialTension: readParam("F0", 3),
    maxDeflection: readParam("dxMax", 15),
  } : null;

  const form = useForm<FormValues>({
    defaultValues: {
      k: readParam("k", DEFAULTS.k),
      freeLength: readParam("L0", DEFAULTS.L0),
      maxDeflection: readParam("dx", DEFAULTS.dx),
      step: readParam("step", DEFAULTS.step),
    },
  });

  const [rows, setRows] = useState<{ deflection: number; load: number }[]>([]);
  const [nonlinearResult, setNonlinearResult] = useState<ConicalNonlinearResult | null>(null);
  const [stageTransitions, setStageTransitions] = useState<ReturnType<typeof extractConicalStageTransitions> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Derived: extract curve from nonlinear result
  const nonlinearCurve = nonlinearResult?.curve ?? null;

  // Build report data when nonlinear result is available
  const reportData = useMemo<ConicalDesignReportData | null>(() => {
    if (!isConical || !conicalParams || !nonlinearResult || !stageTransitions) return null;
    
    return buildConicalDesignReportData({
      largeDiameter: conicalParams.largeOuterDiameter,
      smallDiameter: conicalParams.smallOuterDiameter,
      wireDiameter: conicalParams.wireDiameter,
      activeCoils: conicalParams.activeCoils,
      freeLength: conicalParams.freeLength,
      shearModulus: conicalParams.shearModulus,
      maxDeflection: conicalParams.maxDeflection,
      nonlinearResult,
      stages: stageTransitions,
    });
  }, [isConical, conicalParams, nonlinearResult, stageTransitions]);

  // RFQ URL with pre-filled parameters
  const rfqUrl = useMemo(() => {
    if (!reportData || !conicalParams) return "";
    const params = new URLSearchParams({
      springType: "conical",
      D1: conicalParams.largeOuterDiameter.toString(),
      D2: conicalParams.smallOuterDiameter.toString(),
      d: conicalParams.wireDiameter.toString(),
      Na: conicalParams.activeCoils.toString(),
      L0: conicalParams.freeLength.toString(),
      G: conicalParams.shearModulus.toString(),
      dxMax: conicalParams.maxDeflection.toString(),
      finalLoad: reportData.finalLoad.toFixed(2),
      finalK: reportData.finalStiffness.toFixed(2),
      finalStress: reportData.finalShearStress.toFixed(1),
    });
    return `/rfq?${params.toString()}`;
  }, [reportData, conicalParams]);

  // Export PDF handler
  const handleExportPdf = async () => {
    if (!reportData) return;
    
    setIsExporting(true);
    try {
      const response = await fetch("/api/reports/conical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `conical-spring-report-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Get simulation store
  const simStore = useSpringSimulationStore();

  // Auto-generate conical curve if params are present
  useEffect(() => {
    if (!isConical || !conicalParams) return;
    
    try {
      const nlResult = calculateConicalSpringNonlinear({
        wireDiameter: conicalParams.wireDiameter,
        largeOuterDiameter: conicalParams.largeOuterDiameter,
        smallOuterDiameter: conicalParams.smallOuterDiameter,
        activeCoils: conicalParams.activeCoils,
        shearModulus: conicalParams.shearModulus,
        freeLength: conicalParams.freeLength,
        maxDeflection: conicalParams.maxDeflection,
        samplePoints: 80, // More points for smoother nonlinear curve
      });
      setNonlinearResult(nlResult);
      setStageTransitions(extractConicalStageTransitions(nlResult.curve));
      // Also set rows for the table
      setRows(nlResult.curve.map(p => ({ deflection: p.x, load: p.load })));

      // Initialize simulation store for 3D visualization
      const designMeta: ConicalDesignMeta = {
        type: "conical",
        wireDiameter: conicalParams.wireDiameter,
        largeOuterDiameter: conicalParams.largeOuterDiameter,
        smallOuterDiameter: conicalParams.smallOuterDiameter,
        activeCoils: conicalParams.activeCoils,
        freeLength: conicalParams.freeLength,
        solidHeight: nlResult.solidHeight,
        totalDeflectionCapacity: nlResult.totalDeflectionCapacity,
      };
      simStore.initializeConical(nlResult.curve, designMeta, nlResult.clampedMaxDeflection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate conical curve");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConical, searchParams]);

  // Auto-generate compression spring curve if params are present
  useEffect(() => {
    if (!isCompression || !compressionParams) return;
    
    try {
      const design: SpringDesign = {
        type: "compression",
        wireDiameter: compressionParams.wireDiameter,
        meanDiameter: compressionParams.meanDiameter,
        activeCoils: compressionParams.activeCoils,
        shearModulus: compressionParams.shearModulus,
        freeLength: compressionParams.freeLength,
      };
      
      const springRate = calculateSpringRate(design);
      const curve = generateForceDeflectionCurve({
        spring: design,
        maxDeflection: compressionParams.maxDeflection,
        step: compressionParams.maxDeflection / 30, // 30 points for smoother curve
      });
      setRows(curve);

      // Initialize store for visualization
      const designMeta: CompressionDesignMeta = {
        type: "compression",
        wireDiameter: compressionParams.wireDiameter,
        meanDiameter: compressionParams.meanDiameter,
        activeCoils: compressionParams.activeCoils,
        freeLength: compressionParams.freeLength,
        shearModulus: compressionParams.shearModulus,
        springRate,
      };
      simStore.initializeCompression(curve, designMeta, compressionParams.maxDeflection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate compression curve");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompression, searchParams]);

  // Auto-generate extension spring curve if params are present
  useEffect(() => {
    if (!isExtension || !extensionParams) return;
    
    try {
      const step = extensionParams.maxDeflection / 30; // 30 points for smoother curve
      const curvePoints: LinearCurvePoint[] = [];
      
      // Calculate spring rate from first result
      const firstResult = calculateExtensionSpring({
        outerDiameter: extensionParams.outerDiameter,
        wireDiameter: extensionParams.wireDiameter,
        activeCoils: extensionParams.activeCoils,
        shearModulus: extensionParams.shearModulus,
        initialTension: extensionParams.initialTension,
        workingDeflection: 0,
      });
      const springRate = firstResult.springRate;
      
      for (let dx = 0; dx <= extensionParams.maxDeflection; dx += step) {
        const result = calculateExtensionSpring({
          outerDiameter: extensionParams.outerDiameter,
          wireDiameter: extensionParams.wireDiameter,
          activeCoils: extensionParams.activeCoils,
          shearModulus: extensionParams.shearModulus,
          initialTension: extensionParams.initialTension,
          workingDeflection: dx,
        });
        curvePoints.push({ deflection: dx, load: result.totalLoad });
      }
      
      setRows(curvePoints);

      // Initialize store for visualization
      const designMeta: ExtensionDesignMeta = {
        type: "extension",
        wireDiameter: extensionParams.wireDiameter,
        outerDiameter: extensionParams.outerDiameter,
        activeCoils: extensionParams.activeCoils,
        bodyLength: extensionParams.bodyLength,
        freeLengthInsideHooks: extensionParams.freeLengthInsideHooks,
        shearModulus: extensionParams.shearModulus,
        springRate,
        initialTension: extensionParams.initialTension,
      };
      simStore.initializeExtension(curvePoints, designMeta, extensionParams.maxDeflection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate extension curve");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExtension, searchParams]);

  // Handle slider change for conical springs
  const handleConicalSliderChange = (value: number) => {
    if (!nonlinearCurve || nonlinearCurve.length === 0) return;
    const nearest = findNearestCurvePoint(nonlinearCurve, value);
    simStore.setStateFromCurvePoint(nearest);
  };

  // Handle slider change for linear springs (compression/extension)
  const handleLinearSliderChange = (value: number) => {
    simStore.setLinearDeflection(value);
  };

  const onSubmit = (values: FormValues) => {
    setError(null);
    setNonlinearResult(null);
    setStageTransitions(null);
    try {
      const derivedDesign = deriveDesignForRate(values.k);
      const curve = generateForceDeflectionCurve({
        spring: derivedDesign,
        maxDeflection: values.maxDeflection,
        step: values.step,
      });
      setRows(curve);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Failed to generate curve");
    }
  };

  const cadExportUrl = useMemo(() => {
    const values = form.getValues();
    const params = new URLSearchParams({
      k: values.k.toString(),
      L0: values.freeLength.toString(),
      dx: values.maxDeflection.toString(),
      step: values.step.toString(),
    });
    return `/tools/cad-export?${params.toString()}`;
  }, [form]);

  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  // Get page title based on spring type
  const getPageTitle = () => {
    if (isConical) return "Conical Spring Force Tester";
    if (isCompression) return "Compression Spring Force Tester";
    if (isExtension) return "Extension Spring Force Tester";
    return "Spring Force Tester";
  };

  const getPageDescription = () => {
    if (isConical) return "Nonlinear force–deflection curve for conical compression springs. 锥形弹簧的非线性力-位移曲线。";
    if (isCompression) return "Linear force–deflection curve for compression springs. 压缩弹簧的力-位移曲线。";
    if (isExtension) return "Force–extension curve for extension springs (includes initial tension). 拉伸弹簧的力-伸长曲线（含初拉力）。";
    return "Generate a quick force–deflection table. 生成力-位移数据表。";
  };

  // Render for Compression Spring with unified layout
  if (isCompression && compressionParams && rows.length > 0) {
    return (
      <section className="space-y-6">
        {/* Page Header */}
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-primary/70">Module • Spring Force Tester</p>
          <h1 className="text-3xl font-semibold tracking-tight">Compression Spring Force Tester</h1>
          <p className="text-muted-foreground">
            Linear force–deflection curve for compression springs. 压缩弹簧的力-位移曲线。
          </p>
        </div>

        {/* Main Content: Parameters + 3D Visualization */}
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          {/* Left Panel - Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Spring Parameters / 弹簧参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-xs font-medium text-blue-700">Linear Analysis Mode</p>
                <p className="text-xs text-blue-600">线性分析模式 - 压缩弹簧</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wire Diameter d:</span>
                  <span className="font-medium">{compressionParams.wireDiameter} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mean Diameter Dm:</span>
                  <span className="font-medium">{compressionParams.meanDiameter} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Coils Na:</span>
                  <span className="font-medium">{compressionParams.activeCoils}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free Length L₀:</span>
                  <span className="font-medium">{compressionParams.freeLength} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shear Modulus G:</span>
                  <span className="font-medium">{compressionParams.shearModulus} MPa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Deflection:</span>
                  <span className="font-medium">{compressionParams.maxDeflection} mm</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-muted-foreground font-medium">Spring Rate k:</span>
                  <span className="font-bold text-blue-600">{formatNumber(simStore.currentStiffness)} N/mm</span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <Button asChild variant="ghost" className="w-full text-xs">
                  <a href="/tools/calculator?tab=compression">← Back to Calculator / 返回计算器</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - 3D Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                3D Visualization / 3D 可视化
              </CardTitle>
              <CardDescription>
                Drag the slider to animate the spring compression.
                <br />
                <span className="text-slate-400">拖动滑块查看弹簧压缩动画。</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deflection Slider */}
              <SpringDeflectionSlider
                min={0}
                max={compressionParams.maxDeflection}
                value={simStore.currentDeflection}
                onChange={handleLinearSliderChange}
                labelEn="Visualization Deflection Δx (mm)"
                labelZh="可视化压缩量 Δx (mm)"
              />

              {/* Current Point Card + 3D View */}
              <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
                <CurrentPointCard
                  deflection={simStore.currentDeflection}
                  force={simStore.currentLoad}
                  springRate={simStore.currentStiffness}
                  springType="compression"
                />
                <div className="h-72 w-full rounded-lg overflow-hidden border bg-slate-50">
                  <CompressionSpringVisualizer />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart + Table Section */}
        <Card>
          <CardHeader>
            <CardTitle>Force – Deflection Curve / 力-位移曲线</CardTitle>
            <CardDescription>
              Linear spring: F = k × Δx. / 线性弹簧：力与位移成正比。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 w-full">
              <InteractiveForceChart
                data={rows}
                currentDeflection={simStore.currentDeflection}
                onDeflectionChange={handleLinearSliderChange}
                xAxisLabel="Deflection (mm)"
                yAxisLabel="Force (N)"
                lineColor="#3b82f6"
                markerColor="#ef4444"
                showMarker={true}
              />
            </div>

            <SpringForceTable
              data={rows}
              currentDeflection={simStore.currentDeflection}
              onRowClick={handleLinearSliderChange}
            />

            <div className="pt-4 border-t">
              <Button asChild variant="secondary" className="w-full">
                <a href={cadExportUrl}>Send to CAD Export / 发送到CAD导出</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Render for Conical Spring with unified layout
  if (isConical && conicalParams && nonlinearCurve && nonlinearCurve.length > 0) {
    return (
      <section className="space-y-6">
        {/* Page Header */}
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-primary/70">Module • Spring Force Tester</p>
          <h1 className="text-3xl font-semibold tracking-tight">Conical Spring Force Tester</h1>
          <p className="text-muted-foreground">
            Nonlinear force–deflection curve for conical compression springs. 锥形弹簧的非线性力-位移曲线。
          </p>
        </div>

        {/* Main Content: Parameters + 3D Visualization */}
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          {/* Left Panel - Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Spring Parameters / 弹簧参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Warning if exceeded solid height */}
              {nonlinearResult?.exceededSolidHeight && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium text-amber-700">⚠️ Max deflection exceeds available travel</p>
                  <p className="text-xs text-amber-600">
                    最大压缩量超过可压缩行程。曲线截止于 {nonlinearResult.clampedMaxDeflection.toFixed(2)} mm。
                  </p>
                </div>
              )}

              <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
                <p className="text-xs font-medium text-green-700">Nonlinear Analysis Mode</p>
                <p className="text-xs text-green-600">非线性分析模式 - 锥形弹簧</p>
                {nonlinearResult && (
                  <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-green-600">
                    <span>Solid Height: {nonlinearResult.solidHeight.toFixed(2)} mm</span>
                    <span>Max Travel: {nonlinearResult.totalDeflectionCapacity.toFixed(2)} mm</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Large Diameter D₁:</span>
                  <span className="font-medium">{conicalParams.largeOuterDiameter} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Small Diameter D₂:</span>
                  <span className="font-medium">{conicalParams.smallOuterDiameter} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wire Diameter d:</span>
                  <span className="font-medium">{conicalParams.wireDiameter} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Coils Na:</span>
                  <span className="font-medium">{conicalParams.activeCoils}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free Length L₀:</span>
                  <span className="font-medium">{conicalParams.freeLength} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shear Modulus G:</span>
                  <span className="font-medium">{conicalParams.shearModulus} MPa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Deflection:</span>
                  <span className="font-medium">{conicalParams.maxDeflection} mm</span>
                </div>
              </div>

              {/* Stage Transitions */}
              {stageTransitions && stageTransitions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium">Coil Collapse Stages / 圈贴底阶段:</p>
                  <div className="max-h-32 overflow-y-auto rounded-md border bg-slate-50 p-2 text-xs">
                    {stageTransitions.map((stage, idx) => (
                      <div key={idx} className="py-1 border-b last:border-0">
                        <div className="font-medium text-slate-700">
                          Stage {stage.stage}: {stage.stage === 0 ? "Initial" : `${stage.stage} coil(s) collapsed`}
                        </div>
                        <div className="text-slate-500">
                          Δx ≈ {stage.deflection.toFixed(1)}mm, Na={stage.activeCoils}, k={stage.stiffness.toFixed(2)} N/mm
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t space-y-2">
                <Button 
                  onClick={handleExportPdf} 
                  disabled={isExporting || !reportData}
                  variant="outline"
                  className="w-full text-xs"
                >
                  <FileDown className="mr-2 h-3 w-3" />
                  {isExporting ? "Generating..." : "Export PDF Report"}
                </Button>
                <Button asChild variant="ghost" className="w-full text-xs">
                  <a href="/tools/calculator?tab=conical">← Back to Calculator / 返回计算器</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Panel - 3D Visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                3D Visualization / 3D 可视化
              </CardTitle>
              <CardDescription>
                Shows which coils are collapsed at the current deflection. Drag the slider to animate.
                <br />
                <span className="text-slate-400">当前压缩量下，显示哪些线圈已经贴底。拖动滑块查看动画。</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deflection Slider */}
              <SpringDeflectionSlider
                min={0}
                max={nonlinearResult?.clampedMaxDeflection ?? conicalParams.maxDeflection}
                value={simStore.currentDeflection}
                onChange={handleConicalSliderChange}
                labelEn="Visualization Deflection Δx (mm)"
                labelZh="可视化压缩量 Δx (mm)"
              />

              {/* Current Point Card + 3D View */}
              <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
                <CurrentPointCard
                  deflection={simStore.currentDeflection}
                  force={simStore.currentLoad}
                  springRate={simStore.currentStiffness}
                  springType="conical"
                  activeCoils={simStore.activeCoils}
                  collapsedCoils={simStore.collapsedCoils}
                />
                <div className="h-72 w-full rounded-lg overflow-hidden border bg-slate-50">
                  <ConicalSpringVisualizer />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart + Table Section */}
        <Card>
          <CardHeader>
            <CardTitle>Force – Deflection Curve / 力-位移曲线</CardTitle>
            <CardDescription>
              Nonlinear curve shows progressive stiffening as coils collapse. / 非线性曲线显示线圈贴底时刚度逐步增加。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 w-full">
              <InteractiveForceChart
                data={rows}
                currentDeflection={simStore.currentDeflection}
                onDeflectionChange={handleConicalSliderChange}
                xAxisLabel="Deflection (mm)"
                yAxisLabel="Force (N)"
                lineColor="#22c55e"
                markerColor="#ef4444"
                showMarker={true}
              />
            </div>

            {/* Nonlinear curve info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-md border bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Final Load / 最终载荷</p>
                <p className="font-semibold text-green-600">
                  {formatNumber(nonlinearCurve[nonlinearCurve.length - 1].load)} N
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Final Stiffness / 最终刚度</p>
                <p className="font-semibold">
                  {formatNumber(nonlinearCurve[nonlinearCurve.length - 1].k)} N/mm
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Coils / 有效圈数</p>
                <p className="font-semibold">{nonlinearCurve[nonlinearCurve.length - 1].activeCoils}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collapsed Coils / 贴底圈数</p>
                <p className="font-semibold">{nonlinearCurve[nonlinearCurve.length - 1].collapsedCoils}</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-left sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium">Deflection (mm)</th>
                    <th className="px-3 py-2 font-medium">Force (N)</th>
                    <th className="px-3 py-2 font-medium">k (N/mm)</th>
                    <th className="px-3 py-2 font-medium">Active Coils</th>
                  </tr>
                </thead>
                <tbody>
                  {nonlinearCurve.map((point, idx) => {
                    const isLast = idx === nonlinearCurve.length - 1;
                    const isHighlighted = Math.abs(point.x - simStore.currentDeflection) < 0.5;
                    return (
                      <tr 
                        key={idx} 
                        className={`border-t cursor-pointer hover:bg-slate-50 ${isLast ? "bg-green-50 font-semibold" : ""} ${isHighlighted && !isLast ? "bg-blue-50" : ""}`}
                        onClick={() => handleConicalSliderChange(point.x)}
                      >
                        <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""} ${isHighlighted ? "text-blue-700" : ""}`}>
                          {formatNumber(point.x)}
                          {isHighlighted && !isLast && <span className="ml-1 text-xs text-blue-500">◀</span>}
                        </td>
                        <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                          {formatNumber(point.load)}
                        </td>
                        <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                          {formatNumber(point.k)}
                        </td>
                        <td className={`px-3 py-2 ${isLast ? "text-green-700" : ""}`}>
                          {point.activeCoils}
                          {isLast && <span className="ml-2 text-xs text-green-600">(Final)</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t flex gap-2">
              <Button asChild variant="secondary" className="flex-1">
                <a href={rfqUrl}>
                  <Send className="mr-2 h-4 w-4" />
                  Request Quote / 询价
                </a>
              </Button>
              <Button onClick={() => setShowReport(!showReport)} variant="outline" className="flex-1">
                {showReport ? "Hide Report" : "Show Design Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Design Report Panel */}
        {showReport && reportData && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Design Report / 设计报告</h2>
            <ConicalDesignReportPanel data={reportData} />
          </div>
        )}
      </section>
    );
  }

  // Default fallback render (for manual input form)
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-primary/70">Module • Spring Force Tester</p>
        <h1 className="text-3xl font-semibold tracking-tight">Spring Force Tester</h1>
        <p className="text-muted-foreground">
          Generate a quick force–deflection table. 生成力-位移数据表。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        {/* Left Panel - Manual Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Input Parameters / 输入参数</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              {(
                [
                  { name: "k" as const, label: "Spring Rate k (N/mm)", step: "0.1" },
                  { name: "freeLength" as const, label: "Free Length L₀ (mm)", step: "0.1" },
                  { name: "maxDeflection" as const, label: "Max Working Deflection Δxₘₐₓ (mm)", step: "0.1" },
                  { name: "step" as const, label: "Step (mm)", step: "0.1" },
                ] as const
              ).map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    type="number"
                    step={field.step}
                    {...form.register(field.name, { valueAsNumber: true })}
                  />
                  {form.formState.errors[field.name] && (
                    <p className="text-sm text-red-500">{form.formState.errors[field.name]?.message}</p>
                  )}
                </div>
              ))}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full">
                Generate Curve / 生成曲线
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Panel - Chart and Table */}
        <Card>
          <CardHeader>
            <CardTitle>Force – Deflection Curve / 力-位移曲线</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 w-full">
              <InteractiveForceChart
                data={rows}
                currentDeflection={0}
                xAxisLabel="Deflection (mm)"
                yAxisLabel="Force (N)"
                lineColor="#3b82f6"
                showMarker={false}
              />
            </div>

            {rows.length > 0 ? (
              <SpringForceTable
                data={rows}
                currentDeflection={0}
              />
            ) : (
              <p className="text-sm text-slate-500">
                Fill in the form and generate a curve to inspect force levels.
                <br />
                <span className="text-xs text-slate-400">填写表单并生成曲线以查看力值。</span>
              </p>
            )}

            <Button asChild variant="secondary" className="w-full" disabled={rows.length === 0}>
              <a href={cadExportUrl}>Send to CAD Export / 发送到CAD导出</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function deriveDesignForRate(targetK: number): SpringDesign {
  const wireDiameter = 4; // mm
  const meanDiameter = 24; // mm
  const activeCoils = 8;
  const shearModulus = (targetK * 8 * meanDiameter ** 3 * activeCoils) / wireDiameter ** 4;

  return {
    type: "compression",
    wireDiameter,
    meanDiameter,
    activeCoils,
    shearModulus,
  };
}
