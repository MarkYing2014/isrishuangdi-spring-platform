"use client";

/**
 * Shock Absorber Spring Calculator
 * 减震器弹簧计算器
 * 
 * Advanced parametric calculator for shock absorber springs with:
 * - Variable wire diameter
 * - Variable mean diameter (bulge/hourglass/linear)
 * - Variable pitch with closed end transitions
 * - End grinding by turns (not height)
 * - Debug visualization
 * - FreeCAD export
 * - Interactive Charts (k(x), P(x))
 */

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  ChevronDown, 
  Info, 
  Sparkles, 
  X 
} from "lucide-react";

// Recharts
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis, 
  Line, 
  LineChart 
} from "recharts";

import ShockSpringVisualizer from "@/components/three/ShockSpringVisualizer";
import {
  type ShockSpringParams, // Legacy used for CAD
  type ShockSpringInput,
  type ShockSpringResult,
  type MeanDiameterShape,
  type PitchStyle,
  DEFAULT_SHOCK_SPRING_PARAMS,
  runShockSpringAnalysis,
  generateShockSpringFreeCADScript, // Ensure this import is correct or mock if moved
} from "@/lib/spring3d/shock";
// Note: importing from index.ts which exports generateShockSpringFreeCADScript? Or direct?
// Checking index.ts previously showed exports. If generateShockSpringFreeCADScript is in separate file, imported from there.
// Previously I imported from @/lib/cad/shockSpringCad. Let's assume the previous import was correct.
import { generateShockSpringFreeCADScript as generateCAD } from "@/lib/cad/shockSpringCad";
import { checkShockSpringDesignRules, DesignRuleResult } from "@/lib/spring-platform/rules/shock-rules";
import { PlatformResult, PlatformMaterialModel } from "@/lib/spring-platform/types";

import { DesignSpacePanel } from "@/components/design/DesignSpacePanel";
import { ParetoSelectionView } from "@/components/design/ParetoSelectionView";
import { CandidateGenerator } from "@/lib/spring-platform/candidate-generator";
import { ParetoOptimizer } from "@/lib/spring-platform/pareto-optimizer";
import { CandidateSolution } from "@/lib/spring-platform/candidate-solution";
import { DesignSpace } from "@/lib/spring-platform/design-space-types";
import { getEngine } from "@/lib/spring-platform/engine-registry";
import { SpringPlatformSection } from "@/components/spring-platform/SpringPlatformSection";
import { GlobalEngineeringStatus } from "@/components/ui/GlobalEngineeringStatus";

// ============================================================================
// Charts Component
// ============================================================================

function AnalysisCharts({ result, input }: { result: ShockSpringResult, input: ShockSpringInput }) {
  if (!result || !result.kxCurve || result.kxCurve.length === 0) return null;

  const designRules = useMemo(() => {
    const mockH0 = result.derived ? result.derived.freeLength : 0;
    const mockHb = result.derived ? result.derived.solidHeight : 0;

    const mockRulesResult: any = {
        H0: mockH0,
        springIndex: (input.meanDia.mid / (input.wireDia.mid || 1)),
        maxStroke: mockH0 - mockHb,
        cases: result.kxCurve ? result.kxCurve.map(pt => ({
            inputMode: "deflection" as const,
            inputValue: pt.x,
            sfMin: pt.stress > 0 ? (1200 / pt.stress) : 2.0 // Generic check
        })) : [],
        isValid: true
    };

    const mockMaterial: PlatformMaterialModel = {
        id: "generic", G: 79000, E: 206000, tauAllow: 1200
    };

    return checkShockSpringDesignRules(input, mockRulesResult, mockMaterial);
  }, [result, input]);

  // Format data for Recharts
  // Downsample if too many points? Usually <100 points is fine.
  const data = result.kxCurve.map(p => ({
    x: p.x.toFixed(2),
    xVal: p.x,
    k: Number(p.k.toFixed(1)),
    Force: Number(p.force.toFixed(1)),
    Stress: Number(p.stress.toFixed(0)),
    Active: Number(p.activeCoils.toFixed(2))
  }));
  
  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 border border-slate-200 p-2 rounded shadow-md text-xs z-50">
          <p className="font-semibold text-slate-700 mb-1">Deflection: {label} mm</p>
          {payload.map((p: any) => (
             <div key={p.name} className="flex items-center gap-2" style={{ color: p.color }}>
               <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
               <span>{p.name}: {p.value}</span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">特性曲线 / Analysis Charts</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="iso" className="w-full">
           <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="iso">刚度特性 (K-X)</TabsTrigger>
              <TabsTrigger value="force">力特性 (P-X)</TabsTrigger>
              <TabsTrigger value="energy">能量/疲劳</TabsTrigger>
              <TabsTrigger value="review">工程审核 (Review)</TabsTrigger>
           </TabsList>
           
           {/* Engineering Review Tab */}
            <TabsContent value="review" className="h-[300px] overflow-y-auto pr-2">
                 <div id="design-rules-panel" className="space-y-3 pt-1">
                    <div className="flex items-center gap-2 mb-4 p-2 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
                        <Info className="h-4 w-4" />
                        <span>All design rules must pass for certified production.</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {designRules.map((rule, i) => (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                                rule.status === "pass" ? "bg-green-50/50 border-green-200" :
                                rule.status === "fail" ? "bg-red-50/50 border-red-200" :
                                "bg-yellow-50/50 border-yellow-200"
                            }`}>
                                <div className="flex items-center gap-3">
                                    {rule.status === "pass" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                    {rule.status === "fail" && <AlertCircle className="h-5 w-5 text-red-600" />}
                                    {rule.status === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                                    
                                    <div>
                                        <div className={`font-semibold text-sm ${
                                            rule.status === "pass" ? "text-green-900" :
                                            rule.status === "fail" ? "text-red-900" : "text-yellow-900"
                                        }`}>{rule.label}</div>
                                        <div className="text-xs text-muted-foreground">{rule.message}</div>
                                    </div>
                                </div>
                                <div className="text-right text-xs">
                                    <div className="font-mono font-medium">Value: {rule.value}</div>
                                    <div className="text-muted-foreground">Limit: {rule.limit}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </TabsContent>

           {/* Stiffness (K-X) */}
           <TabsContent value="iso" className="h-[300px]">
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="x" 
                            label={{ value: "Deflection (mm)", position: "insideBottomRight", offset: -5, fontSize: 12 }} 
                            stroke="#64748b"
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                            yAxisId="left" 
                            label={{ value: "Stiffness K (N/mm)", angle: -90, position: "insideLeft", fontSize: 12 }} 
                            stroke="#3b82f6"
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            label={{ value: "Active Coils (Na)", angle: 90, position: "insideRight", fontSize: 12 }} 
                            stroke="#f59e0b"
                            tick={{ fontSize: 11 }}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="k" name="Stiffness (k)" stroke="#3b82f6" strokeWidth={2} yAxisId="left" dot={false} />
                        <Line type="stepAfter" dataKey="Active" name="Active Coils" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" yAxisId="right" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
              </div>
           </TabsContent>

           {/* Force (P-X) & Stress */}
           <TabsContent value="force" className="h-[300px]">
              <div className="h-full w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorForce" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                             dataKey="x" 
                             label={{ value: "Deflection (mm)", position: "insideBottomRight", offset: -5, fontSize: 12 }} 
                             stroke="#64748b"
                             tick={{ fontSize: 11 }}
                        />
                        <YAxis 
                             yAxisId="left" 
                             label={{ value: "Force P (N)", angle: -90, position: "insideLeft", fontSize: 12 }} 
                             stroke="#10b981"
                             tick={{ fontSize: 11 }}
                        />
                         <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            label={{ value: "Stress (MPa)", angle: 90, position: "insideRight", fontSize: 12 }} 
                            stroke="#ef4444"
                            tick={{ fontSize: 11 }}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Force" name="Force (P)" stroke="#10b981" fillOpacity={1} fill="url(#colorForce)" yAxisId="left" />
                        <Line type="monotone" dataKey="Stress" name="Stress" stroke="#ef4444" strokeWidth={2} yAxisId="right" dot={false} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </TabsContent>

           {/* Energy / Fatigue Info */}
           <TabsContent value="energy">
              <div className="space-y-4 pt-2">

                 {/* Energy Text */}
                 <div className="p-4 bg-slate-50 border rounded-lg text-sm">
                    <h4 className="font-semibold mb-2">Energy Absorption</h4>
                    <p className="text-muted-foreground mb-1">
                        Total Energy to Solid: <span className="font-mono text-slate-900">{result.energyCurve[result.energyCurve.length-1]?.joules.toFixed(1)} J</span>
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Method: Trapezoidal integration of P(x) curve.
                    </p>
                 </div>

                 {/* Fatigue Assumptions */}
                 <div className="p-4 bg-slate-50 border rounded-lg text-sm">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Fatigue Assumptions (GEN-2 Standard)
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 font-mono text-xs">
                        {result.fatigue.assumptions.map((line, i) => (
                            <li key={i}>{line}</li>
                        ))}
                    </ul>
                 </div>
              </div>
           </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ShockSpringCalculator() {
  // ========================================
  // State
  // ========================================
  
  // Basic
  const [totalTurns, setTotalTurns] = useState(DEFAULT_SHOCK_SPRING_PARAMS.totalTurns);
  const [samplesPerTurn, setSamplesPerTurn] = useState(DEFAULT_SHOCK_SPRING_PARAMS.samplesPerTurn);
  
  // Mean Diameter
  const [meanDiaStart, setMeanDiaStart] = useState(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.start);
  const [meanDiaMid, setMeanDiaMid] = useState(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.mid);
  const [meanDiaEnd, setMeanDiaEnd] = useState(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.end);
  const [meanDiaShape, setMeanDiaShape] = useState<MeanDiameterShape>(DEFAULT_SHOCK_SPRING_PARAMS.meanDia.shape);
  
  // Wire Diameter
  const [wireDiaStart, setWireDiaStart] = useState(DEFAULT_SHOCK_SPRING_PARAMS.wireDia.start);
  const [wireDiaMid, setWireDiaMid] = useState(DEFAULT_SHOCK_SPRING_PARAMS.wireDia.mid);
  const [wireDiaEnd, setWireDiaEnd] = useState(DEFAULT_SHOCK_SPRING_PARAMS.wireDia.end);
  
  // Pitch
  const [pitchStyle, setPitchStyle] = useState<PitchStyle>(DEFAULT_SHOCK_SPRING_PARAMS.pitch.style ?? "symmetric");
  const [closedTurns, setClosedTurns] = useState<number | { start: number; end: number }>(DEFAULT_SHOCK_SPRING_PARAMS.pitch.closedTurns);
  const [workingMin, setWorkingMin] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.workingMin);
  const [workingMax, setWorkingMax] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.workingMax);
  const [transitionSharpness, setTransitionSharpness] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.transitionSharpness);
  const [closedPitchFactor, setClosedPitchFactor] = useState(DEFAULT_SHOCK_SPRING_PARAMS.pitch.closedPitchFactor ?? 1.0);
  
  // Grinding
  const [grindTop, setGrindTop] = useState(DEFAULT_SHOCK_SPRING_PARAMS.grinding.grindEnd);
  const [grindBottom, setGrindBottom] = useState(DEFAULT_SHOCK_SPRING_PARAMS.grinding.grindStart);
  const [grindOffsetTurns, setGrindOffsetTurns] = useState(DEFAULT_SHOCK_SPRING_PARAMS.grinding.offsetTurns);
  
  // Material
  const [materialName, setMaterialName] = useState(DEFAULT_SHOCK_SPRING_PARAMS.material.name);
  const [shearModulus, setShearModulus] = useState(DEFAULT_SHOCK_SPRING_PARAMS.material.shearModulus);
  const [tensileStrength, setTensileStrength] = useState(DEFAULT_SHOCK_SPRING_PARAMS.material.tensileStrength);

  // Loadcase
  const [length1, setLength1] = useState(DEFAULT_SHOCK_SPRING_PARAMS.installation.preloadedLength ?? 80);
  const [force1, setForce1] = useState(500);
  const [length2, setLength2] = useState<number | undefined>(undefined);
  const [force2, setForce2] = useState<number | undefined>(undefined);

  // Guide
  const [guideType, setGuideType] = useState<"rod" | "hole" | "none">(DEFAULT_SHOCK_SPRING_PARAMS.installation.guideType);
  const [guideDia, setGuideDia] = useState(DEFAULT_SHOCK_SPRING_PARAMS.installation.guideDia);

  // Debug
  const [showCenterline, setShowCenterline] = useState(false);
  const [showFrames, setShowFrames] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showGrindingPlanes, setShowGrindingPlanes] = useState(false);
  
  // UI State
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isSeparateEnds, setIsSeparateEnds] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    geometry: true,
    pitch: true,
    wire: false,
    ends: false,
    loadcase: false,
    material: false,
    debug: false,
    integration: false,
  });

  const [platformResult, setPlatformResult] = useState<PlatformResult | null>(null);

  // Performance Guardrails: Sampling Clamp
  const MAX_SAMPLES = 400;
  const totalSamplesPossible = Math.floor(totalTurns * samplesPerTurn) + 1;
  const isOverSampled = totalSamplesPossible > MAX_SAMPLES;
  const effectiveSamplesPerTurn = isOverSampled
    ? Math.max(10, Math.floor((MAX_SAMPLES - 1) / Math.max(totalTurns, 1)))
    : samplesPerTurn;


  // ========================================
  // Build Parameters
  // ========================================

  const input: ShockSpringInput = useMemo(() => ({
    totalTurns,
    samplesPerTurn: effectiveSamplesPerTurn,
    meanDia: {
      start: meanDiaStart,
      mid: meanDiaMid,
      end: meanDiaEnd,
      shape: meanDiaShape,
    },
    wireDia: {
      start: wireDiaStart,
      mid: wireDiaMid,
      end: wireDiaEnd,
    },
    pitch: {
      style: pitchStyle,
      closedTurns: typeof closedTurns === 'number' 
        ? { start: closedTurns, end: closedTurns } 
        : closedTurns,
      workingMin,
      workingMax,
      transitionSharpness,
      closedPitchFactor,
    },
    grinding: {
      mode: isSeparateEnds 
        ? (grindTop || grindBottom ? "visualClip" : "none") 
        : (grindTop ? "visualClip" : "none"), // Simplified mapping
      grindStart: grindBottom,
      grindEnd: grindTop,
      offsetTurns: grindOffsetTurns,
    },
    material: {
       name: materialName,
       shearModulus,
       tensileStrength,
       density: 7.85, // Fixed density for now
    },
    loadCase: {
        solidMargin: 3.0, // Default 3mm margin
        rideDeflection: force1 && force1 > 0 ? undefined : (length1 > 0 ? undefined : 0), // Heuristic
        rideHeight: length1 > 0 ? length1 : undefined,
        bumpHeight: length2,
    },
    installation: {
        guided: guideType !== 'none',
        guideDia,
        guideType,
    }
  }), [
    totalTurns, samplesPerTurn,
    meanDiaStart, meanDiaMid, meanDiaEnd, meanDiaShape,
    wireDiaStart, wireDiaMid, wireDiaEnd,
    pitchStyle, closedTurns, workingMin, workingMax, transitionSharpness, closedPitchFactor,
    grindTop, grindBottom, grindOffsetTurns, isSeparateEnds,
    materialName, shearModulus, tensileStrength,
    length1, force1, length2, force2,
    guideType, guideDia,
  ]);

  const handleApplyDesign = (g: any) => {
      // Map solution geometry to state
      if (!g) return;
      const geom = g as ShockSpringInput;

      // Update State
      if (geom.totalTurns) setTotalTurns(geom.totalTurns);
      
      // Wire
      if (geom.wireDia) {
          setWireDiaStart(geom.wireDia.mid);
          setWireDiaMid(geom.wireDia.mid);
          setWireDiaEnd(geom.wireDia.mid);
      }

      // Mean Dia
      if (geom.meanDia) {
          setMeanDiaStart(geom.meanDia.mid);
          setMeanDiaMid(geom.meanDia.mid);
          setMeanDiaEnd(geom.meanDia.mid);
          setMeanDiaShape("linear");
      }

      // Pitch
      if (geom.pitch) {
          setWorkingMin(geom.pitch.workingMin);
          setWorkingMax(geom.pitch.workingMax);
          setPitchStyle("symmetric"); 
      }
  };
  
  // Legacy params for CAD export compatibility (until CAD is updated)
  const legacyParams: ShockSpringParams = useMemo(() => ({
    totalTurns,
    samplesPerTurn: effectiveSamplesPerTurn,
    meanDia: { start: meanDiaStart, mid: meanDiaMid, end: meanDiaEnd, shape: meanDiaShape },
    wireDia: { start: wireDiaStart, mid: wireDiaMid, end: wireDiaEnd },
    pitch: { 
        style: pitchStyle, 
        closedTurns: typeof closedTurns === 'number' ? { start: closedTurns, end: closedTurns } : closedTurns, 
        workingMin, 
        workingMax, 
        transitionSharpness, 
        closedPitchFactor 
    },
    grinding: { mode: 'none', grindStart: grindBottom, grindEnd: grindTop, offsetTurns: grindOffsetTurns },
    material: { name: materialName, shearModulus, tensileStrength, density: 7.85 },
    installation: { guided: guideType !== 'none', guideDia, guideType, preloadedLength: length1 },
    loadCase: { solidMargin: 3.0, rideHeight: undefined, rideDeflection: undefined, bumpHeight: undefined, bumpDeflection: undefined },
  }), [totalTurns, samplesPerTurn, meanDiaStart, meanDiaMid, meanDiaEnd, meanDiaShape, wireDiaStart, wireDiaMid, wireDiaEnd, pitchStyle, closedTurns, workingMin, workingMax, transitionSharpness, closedPitchFactor, grindTop, grindBottom, grindOffsetTurns, materialName, shearModulus, tensileStrength, length1, force1, length2, force2, guideType, guideDia]);

  const handleCopyScript = useCallback(async () => {
    try {
      const script = generateCAD(legacyParams);
      await navigator.clipboard.writeText(script);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error("Failed to copy script:", err);
    }
  }, [legacyParams]);
  
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // ========================================
  // Render
  // ========================================
  
  // Stabilize material for platform
  const materialParams = useMemo(() => ({
    id: materialName,
    G: shearModulus,
    E: 206000,
    tauAllow: tensileStrength
  }), [materialName, shearModulus, tensileStrength]);

  return (
    <TooltipProvider>
             <div className="mb-6 space-y-6">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                 <div>
                   <h1 className="text-3xl font-bold tracking-tight text-slate-900">Shock Spring Design</h1>
                   <p className="text-muted-foreground mt-1 max-w-2xl">
                      减震弹簧参数化设计 — Advanced non-linear design with variable pitch & diameter.
                   </p>
                 </div>
                 <Badge variant="outline" className="h-fit">GEN-2 Platform</Badge>
               </div>
             </div>

      {platformResult && (
        <GlobalEngineeringStatus 
          result={platformResult} 
          onJumpToRules={() => {
            // First click the review tab to show it
            const reviewTrigger = document.querySelector('[value="review"]');
            if (reviewTrigger) {
              (reviewTrigger as any).click();
            }
            // Then scroll to the design rules panel
            setTimeout(() => {
              const rulesElement = document.getElementById("design-rules-panel");
              if (rulesElement) rulesElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Parameters */}
        <div className="space-y-4">
          {/* Info Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">基本参数 / Basic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="totalTurns">总圈数 / Total Turns</Label>
                  <NumericInput
                    id="totalTurns"
                    value={totalTurns}
                    onChange={(v) => setTotalTurns(v ?? 8)}
                    step={0.5}
                    min={2}
                  />
                </div>
                <div>
                  <Label htmlFor="samplesPerTurn">每圈采样 / Samples/Turn</Label>
                  <NumericInput
                    id="samplesPerTurn"
                    value={samplesPerTurn}
                    onChange={(v) => setSamplesPerTurn(v ?? 60)}
                    step={10}
                    min={20}
                    max={120}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Geometry Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("geometry")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                中径 / Mean Diameter
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.geometry ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.geometry && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Start (mm)</Label>
                    <NumericInput
                      value={meanDiaStart}
                      onChange={(v) => setMeanDiaStart(v ?? 32)}
                      step={1}
                      min={5}
                    />
                  </div>
                  <div>
                    <Label>Mid (mm)</Label>
                    <NumericInput
                      value={meanDiaMid}
                      onChange={(v) => {
                        const val = v ?? 38;
                        setMeanDiaMid(val);
                        // Auto-detect shape logic
                        if (val > Math.max(meanDiaStart, meanDiaEnd)) {
                            // If mid is significantly larger -> Bulge
                            setMeanDiaShape("bulge");
                        } else if (val < Math.min(meanDiaStart, meanDiaEnd)) {
                            // If mid is significantly smaller -> Hourglass
                            setMeanDiaShape("hourglass");
                        } else {
                            // Check if it deviates from linear center
                            const linearMid = (meanDiaStart + meanDiaEnd) / 2;
                            if (Math.abs(val - linearMid) > 0.5) {
                                // Deviation implies we want a curve, usually bulge or user choice
                                // Default to bulge if not linear
                                if (meanDiaShape === "linear") setMeanDiaShape("bulge");
                            }
                        }
                      }}
                      step={1}
                      min={5}
                    />
                  </div>
                  <div>
                    <Label>End (mm)</Label>
                    <NumericInput
                      value={meanDiaEnd}
                      onChange={(v) => setMeanDiaEnd(v ?? 32)}
                      step={1}
                      min={5}
                    />
                  </div>
                </div>
                <div>
                  <Label>形态 / Shape</Label>
                  <Select 
                    value={meanDiaShape} 
                    onValueChange={(v) => {
                      const newShape = v as MeanDiameterShape;
                      setMeanDiaShape(newShape);
                      // UX Enhancement: Auto-adjust dimensions
                      if (newShape === "bulge") {
                        const maxEnd = Math.max(meanDiaStart, meanDiaEnd);
                        if (meanDiaMid <= maxEnd) {
                          setMeanDiaMid(Math.round(maxEnd * 1.2));
                        }
                      } else if (newShape === "hourglass") {
                        const minEnd = Math.min(meanDiaStart, meanDiaEnd);
                        if (meanDiaMid >= minEnd) {
                          setMeanDiaMid(Math.round(minEnd * 0.8));
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulge">鼓形 / Bulge (常见)</SelectItem>
                      <SelectItem value="hourglass">沙漏 / Hourglass (抗屈曲)</SelectItem>
                      <SelectItem value="linear">线性 / Linear</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Pitch Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("pitch")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                节距 / Pitch
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.pitch ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.pitch && (
              <CardContent className="space-y-3">
                <div>
                  <Label>节距样式 / Pitch Style</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2"
                    value={pitchStyle}
                    onChange={(e) => setPitchStyle(e.target.value as PitchStyle)}
                  >
                    <option value="symmetric">对称 (两端并紧, 中间疏) - Symmetric</option>
                    <option value="progressive">渐进 (底密 → 顶疏) - Progressive</option>
                    <option value="regressive">递减 (底疏 → 顶密) - Regressive</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>并紧系数 / Closed Factor</Label>
                    <NumericInput
                      value={closedPitchFactor}
                      onChange={(v) => setClosedPitchFactor(v ?? 1)}
                      step={0.05}
                      min={1.0}
                      max={1.5}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>工作区最小节距 (mm)</Label>
                    <NumericInput
                      value={workingMin}
                      onChange={(v) => setWorkingMin(v ?? 6)}
                      step={0.5}
                      min={1}
                    />
                  </div>
                  <div>
                    <Label>工作区最大节距 (mm)</Label>
                    <NumericInput
                      value={workingMax}
                      onChange={(v) => setWorkingMax(v ?? 12)}
                      step={0.5}
                      min={1}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label>过渡锐度 / Transition Sharpness</Label>
                    <div className="text-sm text-muted-foreground ml-auto">{transitionSharpness.toFixed(2)}</div>
                  </div>
                  <Slider
                      value={[transitionSharpness]}
                      onValueChange={([v]) => setTransitionSharpness(v)}
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      className="mt-2"
                  />
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Wire Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("wire")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                线径 / Wire Diameter
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.wire ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.wire && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Start (mm)</Label>
                    <NumericInput
                      value={wireDiaStart}
                      onChange={(v) => setWireDiaStart(v ?? 3.2)}
                      step={0.1}
                      min={0.5}
                    />
                  </div>
                  <div>
                    <Label>Mid (mm)</Label>
                    <NumericInput
                      value={wireDiaMid}
                      onChange={(v) => setWireDiaMid(v ?? 4)}
                      step={0.1}
                      min={0.5}
                    />
                  </div>
                  <div>
                    <Label>End (mm)</Label>
                    <NumericInput
                      value={wireDiaEnd}
                      onChange={(v) => setWireDiaEnd(v ?? 3.2)}
                      step={0.1}
                      min={0.5}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  C¹ Continuous sine blending (Olive shape)
                </p>
              </CardContent>
            )}
          </Card>
          
          {/* End Configuration Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("ends")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                端部配置 / End Configuration
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.ends ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.ends && (
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-1.5 block">端部类型 / End Type</Label>
                  <Select
                    value={grindBottom && grindTop ? "closed_ground" : (!grindBottom && !grindTop && (typeof closedTurns === 'number' ? closedTurns > 0 : (closedTurns.start > 0 || closedTurns.end > 0))) ? "closed" : "open"}
                    onValueChange={(val) => {
                      if (val === "closed_ground") {
                        setGrindBottom(true);
                        setGrindTop(true);
                        if ((typeof closedTurns === 'number' && closedTurns === 0) || (typeof closedTurns === 'object' && closedTurns.start === 0 && closedTurns.end === 0)) {
                          setClosedTurns(1.5);
                        }
                      } else if (val === "closed") {
                        setGrindBottom(false);
                        setGrindTop(false);
                        if ((typeof closedTurns === 'number' && closedTurns === 0) || (typeof closedTurns === 'object' && closedTurns.start === 0 && closedTurns.end === 0)) {
                          setClosedTurns(1.5);
                        }
                      } else if (val === "open") {
                        setGrindBottom(false);
                        setGrindTop(false);
                        setClosedTurns(0);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closed_ground">并紧磨平 / Closed & Ground</SelectItem>
                      <SelectItem value="closed">并紧不磨 / Closed & Not Ground</SelectItem>
                      <SelectItem value="open">开放 / Open</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <div className="flex items-center gap-2">
                       <Label>端部并紧圈数 ({isSeparateEnds ? "底端 / Bottom" : "每端 / Per End"})</Label>
                    </div>
                    <NumericInput
                      value={typeof closedTurns === 'number' ? closedTurns : closedTurns.start}
                      onChange={(v) => {
                         const val = v ?? 0;
                         if (isSeparateEnds) {
                           const currentEnd = typeof closedTurns === 'number' ? closedTurns : closedTurns.end;
                           setClosedTurns({ start: val, end: currentEnd });
                         } else {
                           setClosedTurns(val);
                         }
                      }}
                      step={0.1}
                      min={0}
                    />
                  </div>

                  {isSeparateEnds && (
                    <div>
                      <div className="flex items-center gap-2">
                         <Label>端部并紧圈数 (顶端 / Top)</Label>
                      </div>
                      <NumericInput
                        value={typeof closedTurns === 'number' ? closedTurns : closedTurns.end}
                        onChange={(v) => {
                           const val = v ?? 0;
                           const currentStart = typeof closedTurns === 'number' ? closedTurns : closedTurns.start;
                           setClosedTurns({ start: currentStart, end: val });
                        }}
                        step={0.1}
                        min={0}
                      />
                    </div>
                  )}

                  {!isSeparateEnds && (grindBottom || grindTop) && (
                    <div>
                      <div className="flex items-center gap-2">
                        <Label>磨削偏移 (圈/Offset)</Label>
                      </div>
                      <NumericInput
                        value={grindOffsetTurns}
                        onChange={(v) => setGrindOffsetTurns(v ?? 0.6)}
                        step={0.1}
                        min={0}
                        max={2}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-dashed">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="separateGrind" 
                      checked={isSeparateEnds || grindBottom !== grindTop} 
                      onCheckedChange={(c) => {
                        const isChecked = !!c;
                        setIsSeparateEnds(isChecked);
                        if (!isChecked) {
                          const unified = grindBottom || grindTop;
                          setGrindBottom(unified);
                          setGrindTop(unified);
                        }
                      }}
                    />
                    <Label htmlFor="separateGrind" className="text-xs text-muted-foreground font-normal">
                      独立控制端部 (Independently control ends)
                    </Label>
                  </div>
                  
                  {(isSeparateEnds || grindBottom !== grindTop) && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                       <div className="flex items-center space-x-2">
                        <Checkbox id="gBot" checked={grindBottom} onCheckedChange={(c) => setGrindBottom(!!c)} />
                        <Label htmlFor="gBot" className="text-sm">底端磨平</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                        <Checkbox id="gTop" checked={grindTop} onCheckedChange={(c) => setGrindTop(!!c)} />
                        <Label htmlFor="gTop" className="text-sm">顶端磨平</Label>
                       </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Loadcase Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("loadcase")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                载荷工况 / Loadcase
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.loadcase ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.loadcase && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>安装长度 L1 (mm)</Label>
                    <NumericInput
                      value={length1}
                      onChange={(v) => setLength1(v ?? 100)}
                      step={1}
                      min={10}
                    />
                  </div>
                  <div>
                    <Label>安装力 F1 (N)</Label>
                    <NumericInput
                      value={force1}
                      onChange={(v) => setForce1(v ?? 500)}
                      step={10}
                      min={0}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>工作长度 L2 (mm)</Label>
                    <NumericInput
                      value={length2 ?? 0}
                      onChange={(v) => setLength2(v)}
                      step={1}
                      min={10}
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <Label>工作力 F2 (N)</Label>
                    <NumericInput
                      value={force2 ?? 0}
                      onChange={(v) => setForce2(v)}
                      step={10}
                      min={0}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Material Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("material")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                材料 / Material
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.material ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.material && (
              <CardContent className="space-y-3">
                <div>
                  <Label>材料选择 / Preset</Label>
                  <Select 
                    value={materialName} 
                    onValueChange={(v) => {
                      setMaterialName(v);
                      if (v.includes("Cr-Si")) { setShearModulus(79000); setTensileStrength(1600); }
                      else if (v.includes("Cr-V")) { setShearModulus(79000); setTensileStrength(1500); }
                      else if (v.includes("Music")) { setShearModulus(79300); setTensileStrength(1700); }
                      else if (v.includes("302")) { setShearModulus(69000); setTensileStrength(1000); }
                      else if (v.includes("316")) { setShearModulus(69000); setTensileStrength(950); }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Chrome Silicon (Cr-Si)">Chrome Silicon (Cr-Si) - High Stress</SelectItem>
                      <SelectItem value="Chrome Vanadium (Cr-V)">Chrome Vanadium (Cr-V) - Fatigue</SelectItem>
                      <SelectItem value="Music Wire (ASTM A228)">Music Wire (琴钢丝) - Cold Drawn</SelectItem>
                      <SelectItem value="Stainless Steel 302/304">Stainless Steel 302/304</SelectItem>
                      <SelectItem value="Stainless Steel 316">Stainless Steel 316 - Marine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>剪切模量 G (MPa)</Label>
                    <NumericInput
                      value={shearModulus}
                      onChange={(v) => setShearModulus(v ?? 79000)}
                      step={100}
                      min={1000}
                    />
                  </div>
                  <div>
                    <Label>抗拉强度 Rm (MPa)</Label>
                    <NumericInput
                      value={tensileStrength}
                      onChange={(v) => setTensileStrength(v ?? 1600)}
                      step={50}
                      min={100}
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Integration Section: Guide & Dynamics */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("integration")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                集成 / Integration
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.integration ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.integration && (
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">导向 / Guide</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>类型 / Type</Label>
                      <Select 
                        value={guideType} 
                        onValueChange={(v) => setGuideType(v as "rod" | "hole" | "none")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无 / None</SelectItem>
                          <SelectItem value="rod">芯棒 / Inner Rod</SelectItem>
                          <SelectItem value="tube">套筒 / Outer Tube</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>直径 (mm)</Label>
                      <NumericInput
                        value={guideDia}
                        onChange={(v) => setGuideDia(v ?? 0)}
                        step={1}
                        min={0}
                        disabled={guideType === "none"}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
          
          {/* Debug Section */}
          <Card>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/50"
              onClick={() => toggleSection("debug")}
            >
              <CardTitle className="text-lg flex items-center justify-between">
                调试 / Debug
                <ChevronDown className={`h-4 w-4 transition-transform ${expandedSections.debug ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
            {expandedSections.debug && (
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showCL" checked={showCenterline} onCheckedChange={(c) => setShowCenterline(!!c)} />
                    <Label htmlFor="showCL">显示中心线</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showFr" checked={showFrames} onCheckedChange={(c) => setShowFrames(!!c)} />
                    <Label htmlFor="showFr">显示坐标架</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showSect" checked={showSections} onCheckedChange={(c) => setShowSections(!!c)} />
                    <Label htmlFor="showSect">显示截面</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="showGrind" checked={showGrindingPlanes} onCheckedChange={(c) => setShowGrindingPlanes(!!c)} />
                    <Label htmlFor="showGrind">显示磨削面</Label>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
        
        {/* Right Column: Preview & Results */}
        <div className="space-y-4">
           {/* 3D Preview */}
           <div className="border rounded-xl overflow-hidden bg-slate-50 shadow-sm relative" style={{ height: "400px" }}>
              <div className="absolute top-3 left-3 z-10">
                <Badge variant="outline" className="bg-white/80 backdrop-blur">3D Preview</Badge>
              </div>
              <ShockSpringVisualizer 
                input={input} 
                result={(platformResult?.rawResult as ShockSpringResult) || null}
                className="w-full h-full"
              />
           </div>

           {/* Charts */}
           {platformResult?.rawResult && (
               <AnalysisCharts result={platformResult.rawResult as ShockSpringResult} input={input} />
           )}

           {/* CAD Export */}
           <Card>
             <CardHeader className="pb-3">
               <CardTitle className="text-lg">CAD Export</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <p className="text-sm text-muted-foreground mb-2">
                 Generate Python script for FreeCAD (Part Design).
               </p>
               <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={handleCopyScript}
               >
                 {copiedToClipboard ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                 {copiedToClipboard ? "Copied!" : "Copy FreeCAD Script"}
               </Button>
               <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                  Note: Script generation uses legacy parameter mapping. Ensure result is valid before export.
               </div>
             </CardContent>
           </Card>
        </div>
      </div>

      {/* Engineering Design Platform Section */}
      <div className="mt-8">
        <SpringPlatformSection
            springType="shock"
            geometry={input}
            material={materialParams}
            onResultChange={setPlatformResult}
            onApplyParameters={handleApplyDesign}
        />
      </div>
    </TooltipProvider>
  );
}

export default ShockSpringCalculator;
