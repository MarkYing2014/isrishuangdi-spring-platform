"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/components/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText, Download, Clock, AlertTriangle, CheckCircle } from "lucide-react";

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
  SolveForTargetInput,
  PlatformWorkflowStatus
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
import { EngineeringAssumptionsPanel } from "@/components/ui/engineering/EngineeringAssumptionsPanel";
import { EngineeringRequirementsPanel } from "@/components/ui/engineering/EngineeringRequirementsPanel";
import { EngineeringRequirements, DEFAULT_ENGINEERING_REQUIREMENTS } from "@/lib/audit/engineeringRequirements";
import { AuditEngine } from "@/lib/audit/AuditEngine";

// Phase 9 Report Imports
import {
    buildSpringDesignReport,
    printReport,
    downloadReportHTML,
    type ReportOptions,
} from "@/lib/spring-platform/reporting";

// Phase 15 Evolution
import { DesignEvolutionHub } from "./DesignEvolutionHub";
import { 
  DesignSnapshot, 
  EvolutionState, 
  SnapshotPin 
} from "@/lib/spring-platform/types";
import { saveEvolution, loadEvolution } from "@/lib/spring-platform/evolution-storage";
import { GlobalEngineeringStatusPanel } from "@/components/ui/engineering/GlobalEngineeringStatusPanel";

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
  // Language context
  const { language } = useLanguage();
  
  // State
  const [loadPointCount, setLoadPointCount] = useState<number>(3);
  const [modules, setModules] = useState<PlatformModules>(DEFAULT_PLATFORM_MODULES);
  const [expanded, setExpanded] = useState(true);
  const [designMode, setDesignMode] = useState<PlatformDesignMode>("verification");
  const [workflowStatus, setWorkflowStatus] = useState<PlatformWorkflowStatus>("CONCEPT");
  
  // Phase 15: Evolution State
  const [evolution, setEvolution] = useState<EvolutionState>({ snapshots: [] });
  const projectId = useMemo(() => `${springType}_${geometry.H0}_${geometry.d}`, [springType, geometry.H0, geometry.d]);

  // Load persistence
  useEffect(() => {
    const saved = loadEvolution(projectId);
    setEvolution(saved);
  }, [projectId]);

  // Save persistence
  useEffect(() => {
    saveEvolution(projectId, evolution);
  }, [evolution, projectId]);
  
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
  
  // Phase 6 Deliverability: Engineering Requirements (does NOT affect calculations)
  const [engineeringRequirements, setEngineeringRequirements] = useState<EngineeringRequirements>(
    DEFAULT_ENGINEERING_REQUIREMENTS
  );

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

  // Phase 6 Deliverability: Compute full audit with engineering requirements
  const auditResult = useMemo(() => {
    if (!result) return undefined;
    
    return AuditEngine.evaluate({
      springType,
      geometry: debouncedGeometry,
      results: result,
      engineeringRequirements,
    });
  }, [result, springType, debouncedGeometry, engineeringRequirements]);

  const deliverabilityAudit = useMemo(() => auditResult?.audits.deliverability, [auditResult]);


  // Phase 7: Sync result to parent
  useEffect(() => {
    if (result) {
      onResultChange?.({
        ...result,
        workflowStatus
      });
    }
  }, [result, onResultChange, workflowStatus]);

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
      evolutionState: evolution,
      engineeringRequirements,
      deliverabilityAudit,
    });

    if (method === "print") {
      printReport(report, { type });
    } else {
      downloadReportHTML(report, { type });
    }
    
    setShowExportMenu(false);
  }, [result, springType, geometry, materialId, material, propsMaterial]);


  // Phase 14.2: Baseline Metrics for comparative reasoning
  const baselineMetrics = useMemo(() => {
    if (!result) return null;
    const g = geometry;
    const isDisc = springType === 'disc';
    
    return {
      massProxy: isDisc 
        ? (g.D * g.D - (g.D * 0.5) * (g.D * 0.5)) * g.t * (g.series || 1) * (g.parallel || 1)
        : (g.d * g.d * (g.D || 30) * Math.max(1, g.n || 5)),
      maxStressRatio: result.maxStress / result.tauAllow,
      totalEnergy: result.totalEnergy
    };
  }, [result, geometry, springType]);

  // Phase 15: Snapshot Capture
  const takeSnapshot = useCallback((label?: string) => {
    if (!result) return;

    const fatigueRule = result.designRules?.find(r => r.id === "fatigueSF" || r.id === "f_safety");
    const fatigueSF = typeof fatigueRule?.value === "number" ? fatigueRule.value : null;

    const newSnapshot: DesignSnapshot = {
        meta: {
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            label: label || `迭代 ${evolution.snapshots.length + 1}`
        },
        payload: {
            springType,
            input: { ...geometry, materialId },
            modules: modules as unknown as Record<string, boolean>,
            axisMode: inputMode,
            engineeringRequirements // Phase 6 Deliverability: persist requirements
        },
        summary: {
            status: result.isValid ? "pass" : "fail",
            kpi: {
                springRate: result.springRate,
                maxStress: result.maxStress,
                fatigueSF: fatigueSF,
                mass: baselineMetrics?.massProxy || null
            },
            loadCases: result.cases.map(c => ({
                name: c.id,
                x: c.inputValue,
                y: c.load || 0,
                stress: c.stress || null,
                status: c.status as any
            }))
        }
    };

    setEvolution(prev => ({
        ...prev,
        snapshots: [newSnapshot, ...prev.snapshots],
        selectedSnapshotId: newSnapshot.meta.id
    }));
  }, [result, geometry, materialId, modules, inputMode, springType, evolution.snapshots, baselineMetrics, engineeringRequirements]);

  if (!result) return null;

  return (
    <Card className="border-primary/20 shadow-sm overflow-hidden">
      <CardHeader 
        className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors bg-muted/5 border-b"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5 px-1 bg-primary/10 border-primary/20 text-primary font-bold">SEOS</Badge>
            工程操作系统 / Spring Engineering Operating System
          </CardTitle>
          <ChevronDown className={`h-4 w-4 transition-all duration-300 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="px-4 pb-4 pt-4 space-y-4">
          <GlobalEngineeringStatusPanel 
            result={result} 
            deliverabilityAudit={deliverabilityAudit}
            safetyStatus={auditResult?.safetyStatus}
            onJumpToRules={() => {
              const rulesElement = document.getElementById("design-rules-panel");
              if (rulesElement) rulesElement.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {/* Design Rules Panel - Scroll target for "查看失效项" */}
          {result.designRules && result.designRules.filter((r: any) => r.status !== 'pass').length > 0 && (
            <div 
              id="design-rules-panel"
              className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 space-y-3"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span>设计规则详情 / Design Rule Findings</span>
              </div>
              <div className="divide-y divide-amber-200/50">
                {result.designRules.filter((r: any) => r.status !== 'pass').map((rule: any, i: number) => (
                  <div key={i} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {rule.status === 'fail' ? (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                      <span className="font-medium text-slate-700">{rule.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500">{rule.value}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] h-5 px-1.5 ${
                          rule.status === 'fail' 
                            ? 'bg-red-100 text-red-700 border-red-200' 
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        {rule.status === 'fail' ? 'FAIL' : 'WARN'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-amber-600 italic">
                请调整设计参数以解决上述问题。/ Please adjust design parameters to resolve these issues.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 items-end">
            {/* Point Count Selector */}
            {/* Point Count Selector */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Points / 点数</Label>
              <input
                type="number"
                min={1}
                max={20}
                className="h-8 px-2 py-1 rounded-lg border border-input bg-background text-xs w-24 focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                value={loadPointCount}
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= 20) {
                        setLoadPointCount(val);
                    }
                }}
              />
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
                  { id: "designOpt", labelZh: "优化", labelEn: "Optimize" },
                  { id: "evolution", labelZh: "审核", labelEn: "Audit" }
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

            {/* Phase 14.3: Workflow Status */}
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border rounded-lg">
                <Label className="text-[9px] font-black text-muted-foreground uppercase opacity-70">Status / 状态</Label>
                <select 
                    className="bg-transparent text-[10px] font-bold outline-none cursor-pointer text-primary"
                    value={workflowStatus}
                    onChange={(e) => setWorkflowStatus(e.target.value as PlatformWorkflowStatus)}
                >
                    <option value="CONCEPT">草图 / CONCEPT</option>
                    <option value="REVIEW">评审 / REVIEW</option>
                    <option value="APPROVED">批准 / APPROVED</option>
                    <option value="RFQ">询价 / RFQ</option>
                </select>
                <Badge 
                    variant="outline" 
                    className={`text-[8px] h-4 ${workflowStatus === 'APPROVED' ? 'bg-green-500 text-white' : (workflowStatus === 'REVIEW' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white')}`}
                >
                    {workflowStatus}
                </Badge>
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
                            baselineMetrics={baselineMetrics}
                        />
                    )}
                </div>
            )}

            {designMode === ("evolution" as any) && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-primary/5 p-4 rounded-lg border border-primary/20">
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-primary">工程审计回放 / Evolution Hub</h4>
                            <p className="text-[10px] text-muted-foreground italic">记录每一个关键决策，生成可追溯的工程故事。</p>
                        </div>
                        <Button 
                            className="h-8 text-[10px] font-bold gap-2"
                            onClick={() => takeSnapshot()}
                        >
                            <Clock className="h-3.5 w-3.5" /> 保存当前快照 / Snapshot
                        </Button>
                    </div>
                    
                    <DesignEvolutionHub 
                        state={evolution}
                        onView={(id) => setEvolution(prev => ({ ...prev, selectedSnapshotId: id }))}
                        onPin={(id, pin) => setEvolution(prev => ({
                            ...prev,
                            snapshots: prev.snapshots.map(s => s.meta.id === id ? { ...s, meta: { ...s.meta, pinned: pin } } : s)
                        }))}
                        onDelete={(id) => setEvolution(prev => ({
                            ...prev,
                            snapshots: prev.snapshots.filter(s => s.meta.id !== id)
                        }))}
                        onUpdateComment={(id, comment) => setEvolution(prev => ({
                            ...prev,
                            snapshots: prev.snapshots.map(s => s.meta.id === id ? { ...s, meta: { ...s.meta, comment } } : s)
                        }))}
                    />
                </div>
            )}
          </div>

          {/* Phase 14.2: Assumption Panel */}
          <div className="pt-4 border-t border-dashed">
            <EngineeringAssumptionsPanel springType={springType} />
          </div>

          {/* Phase 6 Deliverability: Engineering Requirements Panel */}
          <div className="pt-4">
            <EngineeringRequirementsPanel
              language={language}
              value={engineeringRequirements}
              onChange={setEngineeringRequirements}
              deliverabilityAudit={deliverabilityAudit}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
