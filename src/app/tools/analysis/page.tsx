"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/language-context";
import { UnifiedForceTester } from "@/components/force-tester";
import { AdvancedAnalysisPanel } from "@/components/analysis/AdvancedAnalysisPanel";
import { SmartAnalysisPanel } from "@/components/analysis/SmartAnalysisPanel";
import { AdvancedSimulationPanel } from "@/components/analysis/AdvancedSimulationPanel";
import { getMaterialOptions, type SpringMaterialId } from "@/lib/materials/springMaterials";
import type {
  SpringGeometry,
  CompressionSpringGeometry,
  ExtensionSpringGeometry,
  TorsionSpringGeometry,
  ConicalSpringGeometry,
  WorkingConditions,
} from "@/lib/engine/types";
import {
  createReportData,
  printReport,
  downloadReportHTML,
} from "@/lib/reports/SpringReportGenerator";
import { SpringAnalysisEngine } from "@/lib/engine/SpringAnalysisEngine";
import { useSpringSimulationStore } from "@/lib/stores/springSimulationStore";
import { useSpringAnalysisStore } from "@/lib/stores/springAnalysisStore";
import { EXTENSION_HOOK_LABELS } from "@/lib/springTypes";
import Link from "next/link";
import { Brain } from "lucide-react";

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

type SpringType = "compression" | "extension" | "torsion" | "conical";

export default function SpringAnalysisPage() {
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
  const searchParams = useSearchParams();

  // Helper to read URL params
  const readParam = (key: string, fallback: number) => {
    const raw = searchParams.get(key);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  // Read spring type from URL
  const urlSpringType = searchParams.get("type") as SpringType | null;
  const urlMaterial = searchParams.get("material") as SpringMaterialId | null;
  
  // Check if we have URL parameters (data from calculator)
  const hasUrlParams = urlSpringType !== null;

  // Spring type selection
  const [springType, setSpringType] = useState<SpringType>(urlSpringType || "compression");
  const [materialId, setMaterialId] = useState<SpringMaterialId>(urlMaterial || "music_wire_a228");

  // Common parameters - read from URL if available
  const [wireDiameter, setWireDiameter] = useState(readParam("d", 3.2));
  const [activeCoils, setActiveCoils] = useState(readParam("Na", 8));

  // Compression spring parameters
  const [meanDiameter, setMeanDiameter] = useState(readParam("Dm", 24));
  const [freeLength, setFreeLength] = useState(readParam("L0", 60));

  // Extension spring parameters
  const [bodyLength, setBodyLength] = useState(readParam("Lb", 40));
  const [initialTension, setInitialTension] = useState(readParam("Fi", 5));
  
  // Read hookType from URL (for extension springs)
  const urlHookType = searchParams.get("hookType") as import("@/lib/springTypes").ExtensionHookType | null;
  const [hookType, setHookType] = useState<import("@/lib/springTypes").ExtensionHookType>(urlHookType || "machine");

  // Torsion spring parameters
  const [torsionBodyLength, setTorsionBodyLength] = useState(readParam("Lb", 10));
  const [legLength1, setLegLength1] = useState(readParam("L1", 25));
  const [legLength2, setLegLength2] = useState(readParam("L2", 25));

  // Conical spring parameters
  const [largeOD, setLargeOD] = useState(readParam("D1", 30));
  const [smallOD, setSmallOD] = useState(readParam("D2", 15));
  const [conicalFreeLength, setConicalFreeLength] = useState(readParam("L0", 50));

  // Working conditions
  const [minDeflection, setMinDeflection] = useState(readParam("dxMin", 0));
  const [maxDeflection, setMaxDeflection] = useState(readParam("dxMax", 20));

  // Build geometry based on spring type
  const geometry: SpringGeometry = useMemo(() => {
    switch (springType) {
      case "compression":
        return {
          type: "compression",
          wireDiameter,
          meanDiameter,
          activeCoils,
          freeLength,
          materialId,
        } as CompressionSpringGeometry;
      case "extension":
        return {
          type: "extension",
          wireDiameter,
          meanDiameter,
          activeCoils,
          bodyLength,
          initialTension,
          materialId,
        } as ExtensionSpringGeometry;
      case "torsion":
        return {
          type: "torsion",
          wireDiameter,
          meanDiameter,
          activeCoils,
          bodyLength: torsionBodyLength,
          legLength1,
          legLength2,
          materialId,
        } as TorsionSpringGeometry;
      case "conical":
        return {
          type: "conical",
          wireDiameter,
          largeOuterDiameter: largeOD,
          smallOuterDiameter: smallOD,
          activeCoils,
          freeLength: conicalFreeLength,
          materialId,
        } as ConicalSpringGeometry;
    }
  }, [
    springType, wireDiameter, meanDiameter, activeCoils, freeLength,
    bodyLength, initialTension, torsionBodyLength, legLength1, legLength2,
    largeOD, smallOD, conicalFreeLength, materialId
  ]);

  // Working conditions
  const workingConditions: WorkingConditions = useMemo(() => ({
    minDeflection,
    maxDeflection,
  }), [minDeflection, maxDeflection]);

  // Calculate analysis result
  const analysisResult = useMemo(() => {
    try {
      return SpringAnalysisEngine.analyze(geometry, workingConditions);
    } catch {
      return null;
    }
  }, [geometry, workingConditions]);

  // Get store actions
  const { initializeCompression, initializeConical, initializeExtension, initializeTorsion, reset: resetStore } = useSpringSimulationStore();
  
  // Global analysis store for Phase 6
  const { 
    setGeometry, 
    setWorkingConditions, 
    setMaterialId: setGlobalMaterialId,
    setAnalysisResult 
  } = useSpringAnalysisStore();

  // Sync to global analysis store when analysis result changes
  useEffect(() => {
    if (analysisResult) {
      setGeometry(geometry);
      setWorkingConditions(workingConditions);
      setGlobalMaterialId(materialId);
      setAnalysisResult(analysisResult);
    }
  }, [analysisResult, geometry, workingConditions, materialId, setGeometry, setWorkingConditions, setGlobalMaterialId, setAnalysisResult]);

  // Initialize spring simulation store when geometry changes
  useEffect(() => {
    if (!analysisResult) return;

    if (springType === "compression") {
      const springRate = (79300 * Math.pow(wireDiameter, 4)) / (8 * Math.pow(meanDiameter, 3) * activeCoils);
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
          shearModulus: 79300,
          springRate,
        },
        maxDeflection
      );
    } else if (springType === "extension") {
      // For extension springs
      const springRate = (79300 * Math.pow(wireDiameter, 4)) / (8 * Math.pow(meanDiameter, 3) * activeCoils);
      const curve = analysisResult.forceCurve.map(p => ({
        deflection: p.deflection,
        load: p.force,
      }));
      
      // Calculate outer diameter from mean diameter
      const outerDiameter = meanDiameter + wireDiameter;
      
      initializeExtension(
        curve,
        {
          type: "extension",
          wireDiameter,
          outerDiameter,
          activeCoils,
          bodyLength,
          freeLengthInsideHooks: bodyLength,
          initialTension,
          shearModulus: 79300,
          springRate,
          hookType, // Read from URL parameter or default to "machine"
        },
        maxDeflection
      );
    } else if (springType === "conical") {
      // For conical, use the nonlinear curve if available
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
    } else if (springType === "torsion") {
      // For torsion springs - use elastic modulus for spring rate calculation
      // E ≈ 2.5 * G for spring steel
      const elasticModulus = 79300 * 2.5; // ~198250 MPa
      const springRate = (elasticModulus * Math.pow(wireDiameter, 4)) / 
                         (64 * meanDiameter * activeCoils) * (Math.PI / 180);
      
      const curve = analysisResult.forceCurve.map(p => ({
        deflection: p.deflection,
        load: p.force,
      }));
      
      // Calculate pitch from body length and active coils
      const pitch = torsionBodyLength / activeCoils;
      
      initializeTorsion(
        curve,
        {
          type: "torsion",
          wireDiameter,
          meanDiameter,
          activeCoils,
          bodyLength: torsionBodyLength,
          pitch: pitch > wireDiameter ? pitch : wireDiameter, // Ensure pitch >= wire diameter
          legLength1,
          legLength2,
          freeAngle: 90, // Default free angle
          shearModulus: 79300,
          springRate,
          windingDirection: "right",
        },
        maxDeflection
      );
    }

    return () => {
      // Cleanup on unmount
    };
  }, [springType, analysisResult, wireDiameter, meanDiameter, activeCoils, freeLength, bodyLength, initialTension, maxDeflection, largeOD, smallOD, conicalFreeLength, torsionBodyLength, legLength1, legLength2, hookType, initializeCompression, initializeConical, initializeExtension, initializeTorsion]);

  // Handle PDF export
  const handleExportPDF = () => {
    try {
      const results = SpringAnalysisEngine.analyze(geometry, workingConditions);
      const reportData = createReportData(geometry, workingConditions, results, {
        language: isZh ? "zh" : "en",
      });
      printReport(reportData);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  // Handle HTML download
  const handleDownloadHTML = () => {
    try {
      const results = SpringAnalysisEngine.analyze(geometry, workingConditions);
      const reportData = createReportData(geometry, workingConditions, results, {
        language: "bilingual",
      });
      downloadReportHTML(reportData);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  // Get visualizer component
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
          <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-400 text-sm">
            {isZh ? "3D 视图开发中" : "3D View Coming Soon"}
          </div>
        );
    }
  };

  // If no URL params, show prompt to go to calculator first
  if (!hasUrlParams) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            {isZh ? "弹簧工程分析" : "Spring Engineering Analysis"}
          </h1>
          <p className="text-muted-foreground">
            {isZh
              ? "完整的弹簧应力、疲劳、安全系数和屈曲分析"
              : "Complete stress, fatigue, safety factor, and buckling analysis"}
          </p>
        </div>

        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{isZh ? "无弹簧数据" : "No Spring Data"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isZh 
                ? "请先从计算器页面定义弹簧参数，然后发送到此处进行工程分析。"
                : "Please start from the Calculator page to define spring parameters, then send here for engineering analysis."}
            </p>
            
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Button asChild variant="default">
                <a href="/tools/calculator?tab=compression">{isZh ? "压缩弹簧" : "Compression"}</a>
              </Button>
              <Button asChild variant="default">
                <a href="/tools/calculator?tab=extension">{isZh ? "拉伸弹簧" : "Extension"}</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/tools/calculator?tab=conical">{isZh ? "锥形弹簧" : "Conical"}</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/tools/calculator?tab=torsion">{isZh ? "扭转弹簧" : "Torsion"}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
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
              {springType !== "conical" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dm (mm):</span>
                  <span className="font-medium">{meanDiameter}</span>
                </div>
              )}
              {springType === "conical" && (
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
                    <span className="font-medium">{EXTENSION_HOOK_LABELS[hookType]?.en || hookType}</span>
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
        </div>

        {/* Force Tester Panel */}
        <UnifiedForceTester
          geometry={geometry}
          workingConditions={workingConditions}
          visualizer={getVisualizer()}
          onExportPDF={handleExportPDF}
        />
      </div>

      {/* Advanced Analysis Panel */}
      {analysisResult && (
        <div className="mt-6 space-y-6">
          <AdvancedAnalysisPanel
            geometry={geometry}
            analysisResult={analysisResult}
            springRate={analysisResult.geometry.springIndex > 0 ? 
              (79300 * Math.pow(wireDiameter, 4)) / (8 * Math.pow(meanDiameter, 3) * activeCoils) : 10}
            maxStress={analysisResult.stress.tauEffective}
            freeLength={springType === "compression" ? freeLength : 
                        springType === "conical" ? conicalFreeLength : 50}
          />
          
          {/* Smart Diagnostics & Optimization Panel */}
          <SmartAnalysisPanel
            geometry={geometry}
            analysisResult={analysisResult}
            workingConditions={workingConditions}
            springRate={analysisResult.geometry.springIndex > 0 ? 
              (79300 * Math.pow(wireDiameter, 4)) / (8 * Math.pow(meanDiameter, 3) * activeCoils) : 10}
            currentDeflection={maxDeflection}
          />
          
          {/* Advanced Simulation Panel (Phase 5) */}
          <AdvancedSimulationPanel
            geometry={geometry}
            springRate={analysisResult.geometry.springIndex > 0 ? 
              (79300 * Math.pow(wireDiameter, 4)) / (8 * Math.pow(meanDiameter, 3) * activeCoils) : 10}
            maxStress={analysisResult.stress.tauEffective}
            naturalFrequency={50}
            workingConditions={workingConditions}
          />
        </div>
      )}
    </main>
  );
}
