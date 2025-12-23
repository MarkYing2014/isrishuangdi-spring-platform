"use client";

import { useMemo, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/language-context";
import { UnifiedForceTester } from "@/components/force-tester";
import { AdvancedAnalysisPanel } from "@/components/analysis/AdvancedAnalysisPanel";
import { SmartAnalysisPanel } from "@/components/analysis/SmartAnalysisPanel";
import { AdvancedSimulationPanel } from "@/components/analysis/AdvancedSimulationPanel";
import { SpringTypeSpecificPanel } from "@/components/analysis/SpringTypeSpecificPanel";
import { FeaPanel } from "@/components/analysis/FeaPanel";
import { getMaterialOptions, type SpringMaterialId } from "@/lib/materials/springMaterials";
import type { SpringGeometry as EngineSpringGeometry, WorkingConditions } from "@/lib/engine/types";
import {
  createReportData,
  printReport,
  downloadReportHTML,
} from "@/lib/reports/SpringReportGenerator";
import { SpringAnalysisEngine } from "@/lib/engine/SpringAnalysisEngine";
import { useSpringSimulationStore } from "@/lib/stores/springSimulationStore";
import { useSpringAnalysisStore } from "@/lib/stores/springAnalysisStore";
import {
  useSpringDesignStore,
  type SpringGeometry as StoreSpringGeometry,
  type MaterialInfo,
  type AnalysisResult,
} from "@/lib/stores/springDesignStore";
import { convertStoreGeometryToEngine } from "@/lib/engine/geometryAdapters";
import { EXTENSION_HOOK_LABELS, type ExtensionHookType, type SpringType } from "@/lib/springTypes";
import Link from "next/link";
import { Brain } from "lucide-react";
import { SpiralTorsionAnalysisPanel } from "@/components/analysis/SpiralTorsionAnalysisPanel";
import { isSpiralTorsionDesign } from "@/lib/stores/springDesignStore";

// Dynamic imports for 3D visualizers
const CompressionSpringVisualizer = dynamic(
  () => import("@/components/three/CompressionSpringVisualizer").then(mod => mod.CompressionSpringVisualizer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">Loading 3D...</div> }
);

const ConicalSpringVisualizer = dynamic(
  () => import("@/components/three/ConicalSpringVisualizer").then(mod => mod.ConicalSpringVisualizer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">Loading 3D...</div> }
);

const ExtensionSpringVisualizer = dynamic(
  () => import("@/components/three/ExtensionSpringVisualizer").then(mod => mod.ExtensionSpringVisualizer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">Loading 3D...</div> }
);

const TorsionSpringVisualizer = dynamic(
  () => import("@/components/three/TorsionSpringVisualizer").then(mod => mod.TorsionSpringVisualizer),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">Loading 3D...</div> }
);

export default function AnalysisPageContent() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}

function AnalysisContent() {
  const { language } = useLanguage();
  const isZh = language === "zh";
  const materialOptions = getMaterialOptions();
  const designGeometry = useSpringDesignStore(state => state.geometry);
  const designMaterial = useSpringDesignStore(state => state.material);
  const designAnalysis = useSpringDesignStore(state => state.analysisResult);

  if (!designGeometry || !designMaterial || !designAnalysis) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {isZh ? "弹簧工程分析" : "Spring Engineering Analysis"}
          </h1>
          <p className="text-muted-foreground">
            {isZh
              ? "请先在计算器中完成设计并保存到全局 store，再返回此处进行工程分析。"
              : "Please finish your design in the Calculator (which saves into the global store) before running engineering analysis here."}
          </p>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{isZh ? "未检测到设计数据" : "No Design Detected"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              {isZh
                ? "当前没有有效的弹簧设计记录。请先在“弹簧计算器”输入参数并点击计算，系统会把结果保存到全局 store。"
                : "No valid spring design is stored. Open the Calculator, enter your parameters and calculate—the system will save everything into the global store."}
            </p>
            <Button asChild variant="default">
              <a href="/tools/calculator">{isZh ? "前往弹簧计算器" : "Go to Calculator"}</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ⚠️ 螺旋扭转弹簧使用独立的分析面板，不与 wire spring 混用
  // 这是显式分支，不是 type guard 兼容
  if (isSpiralTorsionDesign(designGeometry)) {
    return (
      <SpiralTorsionAnalysisPanel
        isZh={isZh}
        geometry={designGeometry}
        material={designMaterial}
        analysisResult={designAnalysis}
      />
    );
  }

  // Wire spring (compression/extension/torsion/conical) 使用原有分析面板
  return (
    <AnalysisReady
      isZh={isZh}
      materialOptions={materialOptions}
      designGeometry={designGeometry}
      designMaterial={designMaterial}
      designAnalysis={designAnalysis}
    />
  );
}

interface AnalysisReadyProps {
  isZh: boolean;
  materialOptions: ReturnType<typeof getMaterialOptions>;
  designGeometry: StoreSpringGeometry;
  designMaterial: MaterialInfo;
  designAnalysis: AnalysisResult;
}

function AnalysisReady({
  isZh,
  materialOptions,
  designGeometry,
  designMaterial,
  designAnalysis,
}: AnalysisReadyProps) {
  // ⚠️ 注意：spiralTorsion 和 dieSpring 已在上层被拦截，此函数只处理 wire spring
  // 不要在这里添加 spiralTorsion 或 dieSpring 的兼容代码
  if (designGeometry.type === "spiralTorsion") {
    throw new Error("spiralTorsion should be handled by SpiralTorsionAnalysisPanel");
  }
  if (designGeometry.type === "dieSpring") {
    throw new Error("dieSpring should be handled by DieSpringEngineeringPage");
  }
  if (designGeometry.type === "wave") {
    throw new Error("waveSpring should be handled by WaveSpringEngineeringPage");
  }
  
  const springType = designGeometry.type;
  const materialId = designMaterial.id;
  
  // Wire spring 专用字段 - 不包含 spiralTorsion 或 dieSpring
  const wireDiameter = designGeometry.wireDiameter;
  const activeCoils = designGeometry.activeCoils;
  const shearModulus = designGeometry.shearModulus ?? designMaterial.shearModulus;
  const elasticModulus = designMaterial.elasticModulus ?? shearModulus * 2.5;

  let meanDiameter: number | undefined;
  let freeLength: number | undefined;
  let bodyLength: number | undefined;
  let initialTension: number | undefined;
  let hookType: ExtensionHookType | undefined;
  let outerDiameter: number | undefined;
  let largeOD: number | undefined;
  let smallOD: number | undefined;
  let conicalFreeLength: number | undefined;
  let torsionBodyLength: number | undefined;
  let legLength1: number | undefined;
  let legLength2: number | undefined;

  switch (designGeometry.type) {
    case "compression":
      meanDiameter = designGeometry.meanDiameter;
      freeLength = designGeometry.freeLength;
      break;
    case "extension":
      meanDiameter =
        designGeometry.meanDiameter ??
        (designGeometry.outerDiameter - designGeometry.wireDiameter);
      outerDiameter = designGeometry.outerDiameter;
      bodyLength = designGeometry.bodyLength;
      initialTension = designGeometry.initialTension ?? designAnalysis.initialTension ?? 0;
      hookType = designGeometry.hookType ?? "machine";
      break;
    case "torsion":
      meanDiameter = designGeometry.meanDiameter;
      torsionBodyLength =
        designGeometry.bodyLength ?? designGeometry.activeCoils * designGeometry.wireDiameter;
      bodyLength = torsionBodyLength;
      legLength1 = designGeometry.legLength1;
      legLength2 = designGeometry.legLength2;
      break;
    case "conical":
      largeOD = designGeometry.largeOuterDiameter;
      smallOD = designGeometry.smallOuterDiameter;
      conicalFreeLength = designGeometry.freeLength;
      freeLength = conicalFreeLength;
      break;
    // ⚠️ spiralTorsion 已在上层被拦截，不会到达这里
    // 不要添加 spiralTorsion case
  }

  const minDeflection = 0;
  const maxDeflection = designAnalysis.maxDeflection ?? designAnalysis.workingDeflection ?? 0;
  const torsionFreeAngle =
    springType === "torsion"
      ? designGeometry.freeAngle ?? designGeometry.workingAngle ?? 0
      : 0;
  const torsionWindingDirection =
    springType === "torsion" ? designGeometry.windingDirection ?? "right" : "right";

  const workingConditions: WorkingConditions = useMemo(
    () => ({
      minDeflection,
      maxDeflection,
    }),
    [minDeflection, maxDeflection]
  );

  const engineGeometry = useMemo(
    () => convertStoreGeometryToEngine(designGeometry, materialId),
    [designGeometry, materialId]
  );

  const analysisResult = useMemo(() => {
    try {
      return SpringAnalysisEngine.analyze(engineGeometry, workingConditions);
    } catch {
      return null;
    }
  }, [engineGeometry, workingConditions]);

  const { initializeCompression, initializeConical, initializeExtension, initializeTorsion } =
    useSpringSimulationStore();

  const {
    setGeometry: setAnalysisGeometry,
    setWorkingConditions,
    setMaterialId: setGlobalMaterialId,
    setAnalysisResult,
  } = useSpringAnalysisStore();

  useEffect(() => {
    if (!analysisResult) return;
    setAnalysisGeometry(engineGeometry);
    setWorkingConditions(workingConditions);
    setGlobalMaterialId(materialId);
    setAnalysisResult(analysisResult);
  }, [
    analysisResult,
    engineGeometry,
    materialId,
    setAnalysisGeometry,
    setWorkingConditions,
    setGlobalMaterialId,
    setAnalysisResult,
    workingConditions,
  ]);

  useEffect(() => {
    if (!analysisResult) return;

    if (springType === "compression" && meanDiameter && freeLength !== undefined) {
      const springRate =
        (shearModulus * Math.pow(wireDiameter, 4)) /
        (8 * Math.pow(meanDiameter, 3) * activeCoils);
      const curve = analysisResult.forceCurve.map(p => ({
        deflection: p.deflection,
        load: p.force,
      }));
      initializeCompression(
        curve,
        {
          type: "compression",
          wireDiameter,
          meanDiameter,
          activeCoils,
          freeLength,
          shearModulus,
          springRate,
        },
        maxDeflection
      );
    } else if (
      springType === "extension" &&
      meanDiameter &&
      outerDiameter &&
      bodyLength !== undefined
    ) {
      const springRate =
        (shearModulus * Math.pow(wireDiameter, 4)) /
        (8 * Math.pow(meanDiameter, 3) * activeCoils);
      const curve = analysisResult.forceCurve.map(p => ({
        deflection: p.deflection,
        load: p.force,
      }));
      const effectiveHookType: ExtensionHookType = hookType ?? "machine";
      initializeExtension(
        curve,
        {
          type: "extension",
          wireDiameter,
          outerDiameter,
          activeCoils,
          bodyLength,
          freeLengthInsideHooks: bodyLength,
          initialTension: initialTension ?? 0,
          shearModulus,
          springRate,
          hookType: effectiveHookType,
        },
        maxDeflection
      );
    } else if (
      springType === "conical" &&
      largeOD !== undefined &&
      smallOD !== undefined &&
      conicalFreeLength !== undefined
    ) {
      const curve = analysisResult.forceCurve.map(p => ({
        x: p.deflection,
        deflection: p.deflection,
        load: p.force,
        k: p.stiffness ?? 10,
        activeCoils: p.activeCoils ?? activeCoils,
        collapsedCoils: p.collapsedCoils ?? 0,
        stiffness: p.stiffness ?? 10,
      }));
      initializeConical(
        curve,
        {
          type: "conical",
          wireDiameter,
          largeOuterDiameter: largeOD,
          smallOuterDiameter: smallOD,
          activeCoils,
          freeLength: conicalFreeLength,
          solidHeight: (activeCoils + 2) * wireDiameter,
          totalDeflectionCapacity: conicalFreeLength - (activeCoils + 2) * wireDiameter,
        },
        maxDeflection
      );
    } else if (
      springType === "torsion" &&
      meanDiameter &&
      torsionBodyLength !== undefined &&
      legLength1 !== undefined &&
      legLength2 !== undefined
    ) {
      const springRate =
        ((elasticModulus * Math.pow(wireDiameter, 4)) /
          (64 * meanDiameter * activeCoils)) *
        (Math.PI / 180);
      const curve = analysisResult.forceCurve.map(p => ({
        deflection: p.deflection,
        load: p.force,
      }));
      const pitch = torsionBodyLength / activeCoils;
      initializeTorsion(
        curve,
        {
          type: "torsion",
          wireDiameter,
          meanDiameter,
          activeCoils,
          bodyLength: torsionBodyLength,
          pitch: pitch > wireDiameter ? pitch : wireDiameter,
          legLength1,
          legLength2,
          freeAngle: torsionFreeAngle,
          shearModulus,
          springRate,
          windingDirection: torsionWindingDirection,
        },
        maxDeflection
      );
    }
  }, [
    activeCoils,
    analysisResult,
    bodyLength,
    conicalFreeLength,
    elasticModulus,
    hookType,
    initializeCompression,
    initializeConical,
    initializeExtension,
    initializeTorsion,
    initialTension,
    largeOD,
    legLength1,
    legLength2,
    maxDeflection,
    meanDiameter,
    outerDiameter,
    shearModulus,
    smallOD,
    springType,
    torsionBodyLength,
    torsionFreeAngle,
    torsionWindingDirection,
    wireDiameter,
  ]);

  if (!analysisResult) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">
            {isZh ? "分析失败" : "Analysis Unavailable"}
          </h1>
          <p className="text-muted-foreground">
            {isZh
              ? "我们无法根据当前设计生成工程分析，请返回计算器重新计算。"
              : "We couldn’t generate an analysis for the current design. Please return to the Calculator and run the calculation again."}
          </p>
        </div>
        <Button asChild className="mt-6">
          <Link href="/tools/calculator">{isZh ? "返回计算器" : "Back to Calculator"}</Link>
        </Button>
      </main>
    );
  }

  const handleExportPDF = () => {
    try {
      const results = SpringAnalysisEngine.analyze(engineGeometry, workingConditions);
      const reportData = createReportData(engineGeometry, workingConditions, results, {
        language: isZh ? "zh" : "en",
      });
      printReport(reportData);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const handleDownloadHTML = () => {
    try {
      const results = SpringAnalysisEngine.analyze(engineGeometry, workingConditions);
      const reportData = createReportData(engineGeometry, workingConditions, results, {
        language: "bilingual",
      });
      downloadReportHTML(reportData);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const getVisualizer = () => {
    switch (springType) {
      case "compression":
        return <CompressionSpringVisualizer />;
      case "conical":
        return <ConicalSpringVisualizer />;
      case "extension":
        return <ExtensionSpringVisualizer />;
      case "torsion":
        return <TorsionSpringVisualizer />;
      default:
        return (
          <div className="h-full w-full flex items-center justify center bg-slate-900 text-slate-400 text-sm">
            {isZh ? "3D 视图开发中" : "3D View Coming Soon"}
          </div>
        );
    }
  };

  const safeHookType = hookType ?? "machine";
  const hookLabel =
    EXTENSION_HOOK_LABELS[safeHookType]?.[isZh ? "zh" : "en"] ??
    (isZh ? "默认钩型" : "Default Hook");
  const displayFreeLength =
    springType === "compression"
      ? freeLength ?? 0
      : springType === "conical"
      ? conicalFreeLength ?? 0
      : 50;
  const estimatedSpringRate =
    analysisResult && meanDiameter
      ? (shearModulus * Math.pow(wireDiameter, 4)) /
        (8 * Math.pow(meanDiameter, 3) * activeCoils)
      : 10;

  return (
    <main className="container mx	auto py-8 px-4">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {isZh ? "弹簧工程分析" : "Spring Engineering Analysis"}
          </h1>
          <p className="text-muted-foreground">
            {isZh
              ? "完整的弹簧应力、疲劳、安全系数和屈曲分析"
              : "Complete stress, fatigue, safety factor, and buckling analysis"}
          </p>
        </div>
        <Link href="/tools/advanced-analysis">
          <Button variant="outline" className="gap-2">
            <Brain className="h-4 w-4" />
            {isZh ? "高级分析" : "Advanced Analysis"}
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px,1fr]">
        {/* Input Panel - Read Only */}
        <div className="space-y-4">
          {/* Spring Type - Read Only */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "弹簧类型" : "Spring Type"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="px-3 py-2 bg-slate-100 rounded-md text-sm font-medium">
                {springType === "compression" && (isZh ? "压缩弹簧" : "Compression Spring")}
                {springType === "extension" && (isZh ? "拉伸弹簧" : "Extension Spring")}
                {springType === "torsion" && (isZh ? "扭转弹簧" : "Torsion Spring")}
                {springType === "conical" && (isZh ? "锥形弹簧" : "Conical Spring")}
              </div>
            </CardContent>
          </Card>

          {/* Material - Read Only */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "材料" : "Material"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="px-3 py-2 bg-slate-100 rounded-md text-sm font-medium">
                {materialOptions.find(opt => opt.value === materialId)?.[isZh ? "labelZh" : "labelEn"] || materialId}
              </div>
            </CardContent>
          </Card>

          {/* Geometry Parameters - Read Only */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "几何参数" : "Geometry"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isZh ? "（从计算器传入，只读）" : "(From Calculator, Read-Only)"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">d (mm):</span>
                <span className="font-medium">{wireDiameter}</span>
              </div>
              {springType !== "conical" ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dm (mm):</span>
                  <span className="font-medium">{meanDiameter ?? "--"}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">D1 (mm):</span>
                    <span className="font-medium">{largeOD}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">D2 (mm):</span>
                    <span className="font-medium">{smallOD}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Na:</span>
                <span className="font-medium">{activeCoils}</span>
              </div>

              {/* Type-specific parameters */}
              {springType === "compression" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">L0 (mm):</span>
                  <span className="font-medium">{freeLength}</span>
                </div>
              )}

              {springType === "extension" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lb (mm):</span>
                    <span className="font-medium">{bodyLength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fi (N):</span>
                    <span className="font-medium">{initialTension}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isZh ? "钩型" : "Hook Type"}:</span>
                    <span className="font-medium">{hookLabel}</span>
                  </div>
                </>
              )}

              {springType === "torsion" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lb (mm):</span>
                    <span className="font-medium">{torsionBodyLength}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">L1 (mm):</span>
                    <span className="font-medium">{legLength1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">L2 (mm):</span>
                    <span className="font-medium">{legLength2}</span>
                  </div>
                </>
              )}

              {springType === "conical" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">L0 (mm):</span>
                  <span className="font-medium">{conicalFreeLength}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Working Conditions - Read Only */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "工作条件" : "Working Conditions"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isZh ? "（从计算器传入，只读）" : "(From Calculator, Read-Only)"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {springType === "torsion" ? "θ_min (°):" : "Δx_min (mm):"}
                </span>
                <span className="font-medium">{minDeflection}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {springType === "torsion" ? "θ_max (°):" : "Δx_max (mm):"}
                </span>
                <span className="font-medium">{maxDeflection}</span>
              </div>
            </CardContent>
          </Card>

          {/* Export Buttons */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <Button className="w-full" onClick={handleExportPDF}>
                {isZh ? "打印 PDF 报告" : "Print PDF Report"}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleDownloadHTML}>
                {isZh ? "下载 HTML 报告" : "Download HTML Report"}
              </Button>
            </CardContent>
          </Card>

          {/* FEA Analysis Panel */}
          <FeaPanel />
        </div>

        {/* Force Tester Panel */}
        <UnifiedForceTester
          geometry={engineGeometry}
          workingConditions={workingConditions}
          visualizer={getVisualizer()}
          onExportPDF={handleExportPDF}
        />
      </div>

      {/* Advanced Analysis Panel */}
      {analysisResult && (
        <div className="mt-6 space-y-6">
          {/* Type-Specific Analysis Panel */}
          <SpringTypeSpecificPanel
            geometry={engineGeometry}
            analysisResult={analysisResult}
            springRate={analysisResult.geometry.springIndex > 0 ? estimatedSpringRate : 10}
            maxForce={estimatedSpringRate * maxDeflection}
          />
          
          <AdvancedAnalysisPanel
            geometry={engineGeometry}
            analysisResult={analysisResult}
            springRate={analysisResult.geometry.springIndex > 0 ? estimatedSpringRate : 10}
            maxStress={analysisResult.stress.tauEffective}
            freeLength={displayFreeLength}
          />
          
          {/* Smart Diagnostics & Optimization Panel */}
          <SmartAnalysisPanel
            geometry={engineGeometry}
            analysisResult={analysisResult}
            workingConditions={workingConditions}
            springRate={analysisResult.geometry.springIndex > 0 ? estimatedSpringRate : 10}
            currentDeflection={maxDeflection}
          />
          
          {/* Advanced Simulation Panel (Phase 5) */}
          <AdvancedSimulationPanel
            geometry={engineGeometry}
            springRate={analysisResult.geometry.springIndex > 0 ? estimatedSpringRate : 10}
            maxStress={analysisResult.stress.tauEffective}
            naturalFrequency={50}
            workingConditions={workingConditions}
          />
        </div>
      )}
    </main>
  );
}
