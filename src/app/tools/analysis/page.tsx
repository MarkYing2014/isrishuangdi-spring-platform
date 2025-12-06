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
  }, [springType, analysisResult, wireDiameter, meanDiameter, activeCoils, freeLength, bodyLength, initialTension, maxDeflection, largeOD, smallOD, conicalFreeLength, torsionBodyLength, legLength1, legLength2, initializeCompression, initializeConical, initializeExtension, initializeTorsion]);

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
        {/* Input Panel */}
        <div className="space-y-4">
          {/* Spring Type Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "弹簧类型" : "Spring Type"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={springType} onValueChange={(v) => setSpringType(v as SpringType)}>
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="compression">
                    {isZh ? "压缩" : "Compression"}
                  </TabsTrigger>
                  <TabsTrigger value="extension">
                    {isZh ? "拉伸" : "Extension"}
                  </TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="torsion">
                    {isZh ? "扭转" : "Torsion"}
                  </TabsTrigger>
                  <TabsTrigger value="conical">
                    {isZh ? "锥形" : "Conical"}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Material Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "材料" : "Material"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={materialId} onValueChange={(v) => setMaterialId(v as SpringMaterialId)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {materialOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {isZh ? opt.labelZh : opt.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Geometry Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "几何参数" : "Geometry"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">d (mm)</Label>
                  <Input
                    type="number"
                    value={wireDiameter}
                    onChange={(e) => setWireDiameter(Number(e.target.value))}
                    step={0.1}
                  />
                </div>
                {springType !== "conical" && (
                  <div>
                    <Label className="text-xs">Dm (mm)</Label>
                    <Input
                      type="number"
                      value={meanDiameter}
                      onChange={(e) => setMeanDiameter(Number(e.target.value))}
                      step={0.5}
                    />
                  </div>
                )}
                {springType === "conical" && (
                  <>
                    <div>
                      <Label className="text-xs">D1 (mm)</Label>
                      <Input
                        type="number"
                        value={largeOD}
                        onChange={(e) => setLargeOD(Number(e.target.value))}
                        step={0.5}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">D2 (mm)</Label>
                      <Input
                        type="number"
                        value={smallOD}
                        onChange={(e) => setSmallOD(Number(e.target.value))}
                        step={0.5}
                      />
                    </div>
                  </>
                )}
                <div>
                  <Label className="text-xs">Na</Label>
                  <Input
                    type="number"
                    value={activeCoils}
                    onChange={(e) => setActiveCoils(Number(e.target.value))}
                    step={0.5}
                  />
                </div>
              </div>

              {/* Type-specific parameters */}
              {springType === "compression" && (
                <div>
                  <Label className="text-xs">L0 (mm)</Label>
                  <Input
                    type="number"
                    value={freeLength}
                    onChange={(e) => setFreeLength(Number(e.target.value))}
                    step={1}
                  />
                </div>
              )}

              {springType === "extension" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Lb (mm)</Label>
                    <Input
                      type="number"
                      value={bodyLength}
                      onChange={(e) => setBodyLength(Number(e.target.value))}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Fi (N)</Label>
                    <Input
                      type="number"
                      value={initialTension}
                      onChange={(e) => setInitialTension(Number(e.target.value))}
                      step={0.5}
                    />
                  </div>
                </div>
              )}

              {springType === "torsion" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Lb (mm)</Label>
                    <Input
                      type="number"
                      value={torsionBodyLength}
                      onChange={(e) => setTorsionBodyLength(Number(e.target.value))}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">L1 (mm)</Label>
                    <Input
                      type="number"
                      value={legLength1}
                      onChange={(e) => setLegLength1(Number(e.target.value))}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">L2 (mm)</Label>
                    <Input
                      type="number"
                      value={legLength2}
                      onChange={(e) => setLegLength2(Number(e.target.value))}
                      step={1}
                    />
                  </div>
                </div>
              )}

              {springType === "conical" && (
                <div>
                  <Label className="text-xs">L0 (mm)</Label>
                  <Input
                    type="number"
                    value={conicalFreeLength}
                    onChange={(e) => setConicalFreeLength(Number(e.target.value))}
                    step={1}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Working Conditions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                {isZh ? "工作条件" : "Working Conditions"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">
                    {springType === "torsion" ? "θ_min (°)" : "Δx_min (mm)"}
                  </Label>
                  <Input
                    type="number"
                    value={minDeflection}
                    onChange={(e) => setMinDeflection(Number(e.target.value))}
                    step={1}
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    {springType === "torsion" ? "θ_max (°)" : "Δx_max (mm)"}
                  </Label>
                  <Input
                    type="number"
                    value={maxDeflection}
                    onChange={(e) => setMaxDeflection(Number(e.target.value))}
                    step={1}
                  />
                </div>
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
