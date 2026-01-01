"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText, Download } from "lucide-react";

import { LoadPointList } from "@/components/ui/LoadPointCard";
import { ModuleSelector, DEFAULT_PLATFORM_MODULES } from "@/components/ui/ModuleSelector";
import { MaterialSelector } from "@/components/ui/MaterialSelector";
import { TargetLoadPanel } from "@/components/ui/TargetLoadPanel";
import { StiffnessSelectionPanel } from "@/components/ui/StiffnessSelectionPanel";
import { 
  PlatformSpringType, 
  PlatformInputMode, 
  PlatformModules, 
  PlatformResult,
  PlatformDesignMode,
  SolveForTargetInput
} from "@/lib/spring-platform/types";
import { getEngine } from "@/lib/spring-platform/engine-registry";
import { 
  type SpringMaterial, 
  getSpringMaterial as getMaterialById 
} from "@/lib/materials/springMaterials";

// Phase 6 Imports
import { DesignSpacePanel } from "@/components/design/DesignSpacePanel";
import { ParetoSelectionView } from "@/components/design/ParetoSelectionView";
import { CandidateGenerator } from "@/lib/spring-platform/candidate-generator";
import { ParetoOptimizer } from "@/lib/spring-platform/pareto-optimizer";
import { CandidateSolution } from "@/lib/spring-platform/candidate-solution";
import { DesignSpace } from "@/lib/spring-platform/design-space-types";
import { PLATFORM_AXIS_MAP } from "@/lib/spring-platform/axis-definition";

// Phase 9 Report Imports
import {
    buildSpringDesignReport,
    printReport,
    downloadReportHTML,
    type ReportOptions,
} from "@/lib/spring-platform/reporting";

// ============================================================================
// Types
// ============================================================================

interface SpringPlatformSectionProps {
  /** Type of spring */
  springType: PlatformSpringType;
  /** Spring geometry (differs by type) */
  geometry: any;
  /** Material settings */
  material: {
    id?: string;
    G?: number;
    E?: number;
    tauAllow?: number;
  };
  /** Callbacks */
  onMaterialChange?: (material: SpringMaterial) => void;
  onApplyParameters?: (params: any) => void;
  onResultChange?: (result: PlatformResult) => void;
}

/** Result Summary Component */
function ResultSummary({ result }: { result: PlatformResult }) {
  const fmt = (v: number, decimals = 2) => v.toFixed(decimals);
  const isRotation = result.springType === "torsion" || result.springType === "arc";
  
  const axis = PLATFORM_AXIS_MAP[result.springType] || PLATFORM_AXIS_MAP.compression;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      <div className="bg-muted rounded-md p-2">
        <div className="text-xs text-muted-foreground font-bold tracking-tighter">
            {isRotation ? "扭转刚度 / Torque Rate" : "刚度 k / Rate k"}
        </div>
        <div className="font-medium text-xs">
          {fmt(result.springRate, isRotation ? 4 : 3)} {axis.yUnit}/{axis.xUnit}
        </div>
      </div>
      <div className="bg-muted rounded-md p-2">
        <div className="text-xs text-muted-foreground font-bold tracking-tighter">指数 C / Index C</div>
        <div className="font-medium">{fmt(result.springIndex, 2)}</div>
      </div>
      <div className="bg-muted rounded-md p-2">
        <div className="text-xs text-muted-foreground font-bold tracking-tighter">Wahl 系数 / Wahl Factor</div>
        <div className="font-medium">{fmt(result.wahlFactor, 3)}</div>
      </div>
      {result.H0 !== undefined && (
        <div className="bg-muted rounded-md p-2">
          <div className="text-xs text-muted-foreground font-bold tracking-tighter">自由长度 L0 / Free Length L0</div>
          <div className="font-medium">{fmt(result.H0, 1)} mm</div>
        </div>
      )}
    </div>
  );
}

/** Main Platform Section */
export function SpringPlatformSection({
  springType,
  geometry,
  material: propsMaterial,
  onMaterialChange,
  onResultChange,
  onApplyParameters,
}: SpringPlatformSectionProps) {
  // State
  const [loadPointCount, setLoadPointCount] = useState<number>(3);
  const [modules, setModules] = useState<PlatformModules>(DEFAULT_PLATFORM_MODULES);
  const [expanded, setExpanded] = useState(true);
  const [designMode, setDesignMode] = useState<PlatformDesignMode>("verification");
  
  // Input Mode state
  const defaultMode: PlatformInputMode = (springType === "torsion" || springType === "spiral") 
    ? "angle" 
    : ((springType === "arc" || springType === "disc" || springType === "shock") ? "deflection" : "height");
    
  const [inputMode, setInputMode] = useState<PlatformInputMode>(defaultMode);

  // Material handling
  const [localMaterialId, setLocalMaterialId] = useState<string>(propsMaterial.id || "65Mn");
  const materialId = propsMaterial.id || localMaterialId;
  const material = useMemo(() => getMaterialById(materialId as any), [materialId]);

  // Phase 6 State
  const [optSolutions, setOptSolutions] = useState<CandidateSolution[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // ==========================================================================
  // Canonical Value Persistence
  // ==========================================================================
  // Canonical values store the "physical state" (Length for heliacal, Angle for torsion)
  // this prevents rounding drift when toggling between Height and Deflection.
  const [canonicalValues, setCanonicalValues] = useState<number[]>([]);

  // Performance Guardrails: Debounce calculation inputs
  const [debouncedGeometry, setDebouncedGeometry] = useState(geometry);
  const [debouncedCanonical, setDebouncedCanonical] = useState(canonicalValues);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGeometry(geometry), 200);
    return () => clearTimeout(timer);
  }, [geometry]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCanonical(canonicalValues), 150);
    return () => clearTimeout(timer);
  }, [canonicalValues]);


  // Initialize canonical values when spring type or H0 changes
  useEffect(() => {
    const H0 = geometry.H0 || 50;
    const Hb = geometry.Hb || 10;
    
    let defaults: number[] = [];
    if (springType === "torsion" || springType === "spiral" || springType === "arc") {
      defaults = [15, 30, 45, 60, 75].slice(0, loadPointCount);
    } else if (springType === "shock" || springType === "disc") {
      // Deflection based (0, 10, 20...)
      // Assume some safe defaults if we don't know max stroke
      defaults = Array.from({ length: loadPointCount }, (_, i) => (i + 1) * 10);
    } else {
      const step = (H0 - Hb) / (loadPointCount + 1);
      defaults = Array.from({ length: loadPointCount }, (_, i) => H0 - step * (i + 1));
    }
    setCanonicalValues(defaults);
  }, [springType, loadPointCount, geometry.H0, geometry.Hb, geometry.series, geometry.h0, geometry.t]);

  // Perform Calculation (First pass to get rate for torque conversion)
  const baseResult = useMemo(() => {
    try {
      const engine = getEngine(springType);
      return engine.calculate({
        geometry,
        material: {
          ...propsMaterial,
          id: materialId as any,
          G: material?.shearModulus ?? propsMaterial.G ?? 79000,
          E: material?.elasticModulus ?? propsMaterial.E ?? 206000,
          tauAllow: material?.allowShearStatic ?? propsMaterial.tauAllow ?? 700,
        },
        cases: { mode: defaultMode, values: [0] }, // dummy point, safe for all modes
        modules: DEFAULT_PLATFORM_MODULES,
        springType,
      });
    } catch (e) {
      return null;
    }
  }, [springType, geometry, propsMaterial, material, materialId, defaultMode]);

  // Convert canonical to active input
  const inputValues = useMemo(() => {
    const H0 = geometry.H0 || 0;
    const R_arc = geometry.arcRadius || 100;

    return canonicalValues.map(v => {
      if (inputMode === "deflection") {
          // For Arc: s = R * phi(rad)
          if (springType === "arc") return R_arc * (v * Math.PI / 180);
          return v; // For Disc/Shock, canonical IS stroke (deflection), so just return it
      }
      if ((inputMode as string) === "height") {
          if (springType === "disc") {
              const H_free = (geometry.t + geometry.h0) * (geometry.series || 1);
              return H_free - v; // H = H_free - s
          }
          if (springType === "shock") {
             // For shock, canonical 'v' is deflection x.
             // H = H0 - x.
             // But we need H0. If geometry.H0 is missing, assume 0?
             // Actually ShockSpringEngine.calculate returns H0. We can use baseResult.
             const freeLen = baseResult?.H0 || geometry.H0 || 100;
             return freeLen - v;
          }
          if (springType === "compression" || springType === "extension" || springType === "conical") {
              return geometry.H0 - v; // For these, canonical is deflection (delta)
          }
      }
      if (inputMode === "torque" && baseResult) {
        // Torque M = k * theta
        return baseResult.springRate * v;
      }
      return v; // height or angle
    });
  }, [canonicalValues, inputMode, geometry.H0, geometry.arcRadius, geometry.t, geometry.h0, geometry.series, baseResult, springType]);

  // Handle Input Change -> Update Canonical
  const handleInputChange = (index: number, val: number) => {
    const next = [...canonicalValues];
    const H0 = geometry.H0 || 0;
    const R_arc = geometry.arcRadius || 100;

    if (inputMode === "height") {
      if (springType === "disc") {
          const H_free = (geometry.t + geometry.h0) * (geometry.series || 1);
          next[index] = H_free - val; // s = H_free - H
      } else if (springType === "shock") {
          const freeLen = baseResult?.H0 || geometry.H0 || 100;
          next[index] = Math.max(0, freeLen - val); // x = H0 - H, clamp >= 0
      } else {
          next[index] = H0 - val; // delta = H0 - H
      }
    } else if (inputMode === "angle") {
      next[index] = val;
    } else if (inputMode === "deflection") {
      if (springType === "arc") {
          // phi(deg) = (s / R) * 180 / pi
          next[index] = (val / R_arc) * 180 / Math.PI;
      } else {
          next[index] = Math.max(0, val); // Canonical is deflection, clamp 0
      }
    } else if (inputMode === "torque" && baseResult && baseResult.springRate > 0) {
      // theta = M / k
      next[index] = val / baseResult.springRate;
    }
    setCanonicalValues(next);
  };

  // ... (Calculation code redundant in snippet, keeping context)

  // Helper for dynamic labels
  const axis = PLATFORM_AXIS_MAP[springType] || PLATFORM_AXIS_MAP.compression;

  // ...
  


  // Perform Calculation for display
  const result = useMemo(() => {
    try {
      const engine = getEngine(springType);
      
      const res = engine.calculate({
        geometry: debouncedGeometry,
        material: {
          ...propsMaterial,
          id: materialId as any,
          G: material?.shearModulus ?? propsMaterial.G ?? 79000,
          E: material?.elasticModulus ?? propsMaterial.E ?? 206000,
          tauAllow: material?.allowShearStatic ?? propsMaterial.tauAllow ?? 700,
        },
        cases: {
          mode: springType === "torsion" ? "angle" : "height",
          values: debouncedCanonical,
        },
        modules,
        springType,
      });
      
      return res;
    } catch (e) {
      console.error("Platform calculation failed", e);
      return null;
    }
  }, [springType, debouncedGeometry, propsMaterial, materialId, material, debouncedCanonical, modules]);


  // Phase 7: Sync result to parent
  useEffect(() => {
    if (result) {
      onResultChange?.(result);
    }
  }, [result, onResultChange]);

  // Solver Wrap
  const handleSolve = useCallback((input: SolveForTargetInput) => {
    try {
      const engine = getEngine(springType);
      if (!engine.solveForTarget) return null;
      
      return engine.solveForTarget(
        { 
          geometry, 
          material: { 
            ...propsMaterial, 
            G: material?.shearModulus ?? propsMaterial.G ?? 79000, 
            E: material?.elasticModulus ?? propsMaterial.E ?? 206000, 
            id: materialId as any 
          } 
        }, 
        input
      );
    } catch (e) {
      console.error("Solve wrap failed", e);
      return null;
    }
  }, [springType, geometry, propsMaterial, material, materialId]);

  // Phase 6: Handle Optimization
  const handleGenerateDesigns = async (space: DesignSpace) => {
    setIsGenerating(true);
    try {
      const generator = new CandidateGenerator();
      const optimizer = new ParetoOptimizer();
      
      const context = {
        engine: getEngine(springType),
        material: {
            ...propsMaterial,
            id: materialId as any,
            G: material?.shearModulus ?? propsMaterial.G ?? 79000,
            E: material?.elasticModulus ?? propsMaterial.E ?? 206000,
            tauAllow: material?.allowShearStatic ?? propsMaterial.tauAllow ?? 700,
        },
        designSpace: space
      };

      const candidates = await generator.generateAll(context as any);
      const ranked = optimizer.optimize(candidates);
      setOptSolutions(ranked);
    } catch (e) {
      console.error("Design generation failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyDesign = (sol: CandidateSolution) => {
    // Save history for undo
    setHistory([...history, { ...geometry }]);
    onApplyParameters?.(sol.params);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    onApplyParameters?.(prev);
    setHistory(history.slice(0, -1));
  };

  // Phase 9: Report Export Handlers
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportReport = useCallback((type: "customer" | "engineering", method: "print" | "html") => {
    if (!result) return;
    
    const report = buildSpringDesignReport({
      springType,
      geometry,
      material: {
        id: materialId,
        name: material?.nameEn ?? materialId,
        G: material?.shearModulus ?? propsMaterial.G,
        E: material?.elasticModulus ?? propsMaterial.E,
        tauAllow: material?.allowShearStatic ?? propsMaterial.tauAllow,
      },
      result,
      options: {
        type,
        language: "bilingual",
        projectName: "Spring Design",
        includePareto: type === "engineering",
        includeVersionHash: type === "engineering",
      },
    });

    if (method === "print") {
      printReport(report, { type });
    } else {
      downloadReportHTML(report, { type });
    }
    
    setShowExportMenu(false);
  }, [result, springType, geometry, materialId, material, propsMaterial]);

  if (!result) return null;

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden">
      <CardHeader 
        className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors bg-muted/5 border-b"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5 px-1 bg-primary/10 border-primary/20 text-primary font-bold">GEN 2</Badge>
            工程设计平台 / Engineering Design Platform
          </CardTitle>
          <ChevronDown className={`h-4 w-4 transition-all duration-300 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="px-4 pb-4 pt-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Point Count Selector */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Points / 点数</Label>
              <select
                className="h-8 px-2 py-1 rounded-lg border border-input bg-background text-xs w-24 focus:ring-2 focus:ring-primary/20 outline-none"
                value={loadPointCount}
                onChange={(e) => setLoadPointCount(Number(e.target.value))}
              >
                {[3, 4, 5].map(v => <option key={v} value={v}>{v} 点位</option>)}
              </select>
            </div>

            {/* Input Mode Selector */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Mode / 输入方式</Label>
              <div className="flex rounded-lg overflow-hidden border border-input h-8 shadow-sm">
                 {(springType === "torsion" || springType === "spiral" || springType === "arc") ? (
                    <>
                         <button
                           type="button"
                           className={`px-2 py-1 text-[10px] font-bold transition-all ${inputMode === "angle" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
                           onClick={() => setInputMode("angle")}
                         >
                           {axis.xLabelZh} / {axis.xLabelEn}
                         </button>
                         {(springType === "torsion") && (
                             <button
                               type="button"
                               className={`px-2 py-1 text-[10px] font-bold border-l transition-all ${inputMode === "torque" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
                               onClick={() => setInputMode("torque")}
                             >
                               {axis.yLabelZh} / {axis.yLabelEn}
                             </button>
                         )}
                         {(springType === "arc") && (
                             <button
                               type="button"
                               className={`px-2 py-1 text-[10px] font-bold border-l transition-all ${inputMode === "deflection" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
                               onClick={() => setInputMode("deflection")}
                             >
                               位移 s / Arc Disp s
                             </button>
                         )}
                    </>
                 ) : (
                    <>
                     <button
                       type="button"
                       className={`px-2 py-1 text-[10px] font-bold transition-all ${inputMode === "height" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
                       onClick={() => setInputMode("height")}
                     >
                       高度 H / Height H
                     </button>
                     <button
                       type="button"
                       className={`px-2 py-1 text-[10px] font-bold border-l transition-all ${inputMode === "deflection" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-muted-foreground"}`}
                       onClick={() => setInputMode("deflection")}
                     >
                       {springType === "shock" ? "行程 x / Stroke x" : "挠度 f / Deflection f"}
                     </button>
                    </>
                 )}
              </div>
            </div>

            {/* Material Selector */}
            <MaterialSelector
              selectedId={materialId}
              onMaterialChange={(m) => {
                setLocalMaterialId(m.id);
                onMaterialChange?.(m);
              }}
              d={geometry.d}
              className="flex-1 min-w-[150px]"
            />
          </div>

          <div className="p-3 bg-muted/20 rounded-xl border border-muted-foreground/10">
            <ResultSummary result={result} />
          </div>

          <div className="flex items-center gap-4">
             <div className="flex p-1 bg-muted/40 rounded-lg w-fit border border-muted shadow-inner">
                {[
                  { id: "verification", labelZh: "核算", labelEn: "Verify" },
                  { id: "targetLoad", labelZh: "反算", labelEn: "Design" },
                  { id: "stiffnessSelection", labelZh: "对比", labelEn: "Compare" },
                  { id: "designOpt", labelZh: "优化", labelEn: "Optimize" }
                ].map(m => (
                  <button
                    key={m.id}
                    className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${designMode === m.id ? "bg-white shadow-md text-primary scale-[1.05]" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => setDesignMode(m.id as PlatformDesignMode)}
                  >
                    {m.labelZh} / {m.labelEn}
                  </button>
                ))}
            </div>

            <div className="flex-1 opacity-80 hover:opacity-100 transition-opacity">
                <ModuleSelector 
                    springType={springType}
                    modules={modules}
                    onModulesChange={setModules}
                    compact
                />
            </div>
            
            {/* Phase 9: Export Report Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-[10px] font-bold gap-1"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <FileText className="h-3 w-3" />
                报告 / Report
                <ChevronDown className={`h-3 w-3 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
              </Button>
              
              {showExportMenu && (
                <div 
                  className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <div className="px-3 py-1 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-b">
                    客户报告 / Customer Report
                  </div>
                  <button
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => handleExportReport("customer", "print")}
                  >
                    <FileText className="h-3 w-3" /> 打印 PDF / Print PDF
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => handleExportReport("customer", "html")}
                  >
                    <Download className="h-3 w-3" /> 下载 HTML / Download HTML
                  </button>
                  
                  <div className="px-3 py-1 text-[9px] text-muted-foreground font-bold uppercase tracking-wider border-t border-b mt-1">
                    工程报告 / Engineering Report
                  </div>
                  <button
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => handleExportReport("engineering", "print")}
                  >
                    <FileText className="h-3 w-3" /> 打印 PDF / Print PDF
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-2"
                    onClick={() => handleExportReport("engineering", "html")}
                  >
                    <Download className="h-3 w-3" /> 下载 HTML / Download HTML
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            {designMode === "verification" && (
                <LoadPointList
                    springType={springType}
                    results={result.cases}
                    inputValues={inputValues}
                    onInputChange={handleInputChange}
                    modules={modules}
                    limits={{
                        min: geometry.Hb || 0,
                        max: geometry.H0 || 999,
                        minLabel: "Hb",
                        maxLabel: "H0"
                    }}
                />
            )}

            {designMode === "targetLoad" && (
                <TargetLoadPanel 
                    springType={springType} 
                    inputMode={inputMode}
                    onSolve={handleSolve}
                    onApply={(params) => {
                        onApplyParameters?.(params);
                        setDesignMode("verification");
                    }}
                />
            )}

            {designMode === "stiffnessSelection" && (
                <StiffnessSelectionPanel 
                    springType={springType}
                    geometry={geometry}
                    material={{
                        ...propsMaterial,
                        G: material?.shearModulus ?? propsMaterial.G ?? 79000,
                        E: material?.elasticModulus ?? propsMaterial.E ?? 206000,
                        tauAllow: material?.allowShearStatic ?? propsMaterial.tauAllow ?? 700,
                        id: materialId as any
                    }}
                    onApply={(params) => {
                        onApplyParameters?.(params);
                        setDesignMode("verification");
                    }}
                />
            )}

            {designMode === "designOpt" && (
                <div className="space-y-6">
                    <DesignSpacePanel 
                        springType={springType}
                        initialParams={{ ...geometry, H0: result.H0 }}
                        onGenerate={handleGenerateDesigns}
                        isGenerating={isGenerating}
                    />
                    
                    {optSolutions.length > 0 && (
                        <ParetoSelectionView 
                            solutions={optSolutions}
                            onApply={handleApplyDesign}
                            onUndo={handleUndo}
                            hasHistory={history.length > 0}
                        />
                    )}
                </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
