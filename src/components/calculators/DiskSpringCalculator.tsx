"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLanguage } from "@/components/language-context";
import { Info, Calculator, Send, AlertTriangle, Factory } from "lucide-react";
import { useWorkOrderStore } from "@/lib/stores/workOrderStore";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { calculateDiskSpring, type DiskSpringResult } from "@/lib/springMath/diskSpring";
import { useSpringDesignStore } from "@/lib/stores/springDesignStore";
import { Calculator3DPreview } from "@/components/calculators/Calculator3DPreview";
import { buildPipelineUrl } from "@/lib/pipeline/springPipelines";
import { computeAxialTravel, diskTravel } from "@/lib/travel/AxialTravelModel";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";
import { getDefaultDiskSpringSample } from "@/lib/springPresets";

const Separator = ({ className }: { className?: string }) => <div className={`h-px bg-slate-200 w-full ${className || "my-1"}`} />;

export function DiskSpringCalculator() {
  // Get default sample for new users (DIN 2093 Series B standard)
  const defaultSample = getDefaultDiskSpringSample();
  
  // --- Form State --- Use OEM sample data as defaults
  const [outerDiameter, setOuterDiameter] = useState<number>(defaultSample.outerDiameter);
  const [innerDiameter, setInnerDiameter] = useState<number>(defaultSample.innerDiameter);
  const [thickness, setThickness] = useState<number>(defaultSample.thickness);
  const [freeConeHeight, setFreeConeHeight] = useState<number>(defaultSample.coneHeight);
  const [group, setGroup] = useState<"G1" | "G2" | "G3">("G2");

  const [parallelCount, setParallelCount] = useState<number>(1);
  const [seriesCount, setSeriesCount] = useState<number>(1);
  const [frictionCoeff, setFrictionCoeff] = useState<number>(0.08);

  const [sPreload, setSPreload] = useState<number>(0.5);
  const [sOperating, setSOperating] = useState<number>(defaultSample.deflection);
  const [sMax, setSMax] = useState<number>(defaultSample.coneHeight);

  const [E, setE] = useState<number>(206000);
  const [nu, setNu] = useState<number>(0.3);
  const [Sy, setSy] = useState<number>(1400);

  const [showStressColors, setShowStressColors] = useState(true);

  // --- Calculation ---
  const input = useMemo(() => ({
    type: "disk" as const,
    outerDiameter,
    innerDiameter,
    thickness,
    freeConeHeight,
    group,
    parallelCount,
    seriesCount,
    frictionCoeff,
    deflectionPreload: sPreload,
    deflectionOperating: sOperating,
    deflectionMax: sMax,
    elasticModulus: E,
    poissonRatio: nu,
    yieldStrength: Sy,
    wireDiameter: thickness, // Generic fallback
    shearModulus: E / (2 * (1 + nu)),
  }), [
    outerDiameter, innerDiameter, thickness, freeConeHeight, group,
    parallelCount, seriesCount, frictionCoeff,
    sPreload, sOperating, sMax,
    E, nu, Sy
  ]);

  const result = useMemo(() => calculateDiskSpring(input), [input]);

  // Unified Travel Model (Phase 4)
  const travelDerived = useMemo(() => {
    // Flattening limit: s_total = h0 * nS
    const h0Total = freeConeHeight * seriesCount;
    return computeAxialTravel(
      diskTravel(sPreload, sOperating),
      { hardLimit: h0Total, maxSafeTravel: h0Total * 0.75 }
    );
  }, [sPreload, sOperating, freeConeHeight, seriesCount]);

  const unifiedAudit = useMemo(() => {
    if (!result) return null;
    return AuditEngine.evaluate({
      springType: "disk",
      geometry: input,
      results: {
        ...result,
        travel_mm: travelDerived.delta,
        maxTravel: freeConeHeight * seriesCount,
        // Map disk specific terms to audit engine expectations
        maxStress: result.points.max.sigma_eq,
        allowableStress: Sy,
      }
    });
  }, [result, input, travelDerived.delta, freeConeHeight, seriesCount, Sy]);

  // --- Actions ---
  const handleSyncStore = useCallback(() => {
    useSpringDesignStore.getState().setDesign({
      springType: "disk",
      geometry: {
        type: "disk",
        outerDiameter,
        innerDiameter,
        thickness,
        freeConeHeight,
        group,
        parallelCount,
        seriesCount,
        frictionCoeff,
      },
      material: {
          id: "custom" as any,
          name: "Spring Steel (User)",
          shearModulus: E / (2 * (1 + nu)),
          elasticModulus: E,
          density: 7850,
      },
      analysisResult: {
        springRate: result.points.work.k_stack,
        springRateUnit: "N/mm",
        workingLoad: result.points.work.F_stack,
        maxLoad: result.points.max.F_stack,
        maxStress: result.points.max.sigma_eq,
        staticSafetyFactor: 1 / (result.points.max.ratio || 1),
        workingDeflection: travelDerived.delta,
        maxDeflection: sMax,
      }
    });
  }, [outerDiameter, innerDiameter, thickness, freeConeHeight, group, parallelCount, seriesCount, frictionCoeff, E, nu, result, sOperating, sMax]);

  const analysisUrl = useMemo(() => 
    buildPipelineUrl("/tools/analysis?type=disk", {
        De: String(outerDiameter),
        Di: String(innerDiameter),
        t: String(thickness),
        h0: String(freeConeHeight),
        nP: String(parallelCount),
        nS: String(seriesCount),
        s_pre: String(sPreload),
        s_work: String(sOperating),
        s_max: String(sMax),
    }), 
    [outerDiameter, innerDiameter, thickness, freeConeHeight, parallelCount, seriesCount, sPreload, sOperating, sMax]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
      {/* Left Column: Inputs */}
      <div className="lg:col-span-4 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-500" />
              几何参数 / Geometry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>外径 De (mm)</Label>
                <NumericInput value={outerDiameter} onChange={(v) => setOuterDiameter(v ?? 0)} min={1} />
              </div>
              <div className="space-y-2">
                <Label>内径 Di (mm)</Label>
                <NumericInput value={innerDiameter} onChange={(v) => setInnerDiameter(v ?? 0)} min={1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>厚度 t (mm)</Label>
                <NumericInput value={thickness} onChange={(v) => setThickness(v ?? 0)} min={0.1} />
              </div>
              <div className="space-y-2">
                <Label>锥高 h0 (mm)</Label>
                <NumericInput value={freeConeHeight} onChange={(v) => setFreeConeHeight(v ?? 0)} min={0} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>DIN 2093 Group</Label>
              <Select value={group} onValueChange={(v: any) => setGroup(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="G1">Group 1 (t &lt; 1.25)</SelectItem>
                  <SelectItem value="G2">Group 2 (1.25 ≤ t ≤ 6)</SelectItem>
                  <SelectItem value="G3">Group 3 (t &gt; 6)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-indigo-600">
              <Badge variant="outline" className="border-indigo-200 text-indigo-600 bg-indigo-50">Stacking</Badge>
              叠簧配置 / Stacking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>并联片数 nP (Parallel)</Label>
                <NumericInput value={parallelCount} onChange={(v) => setParallelCount(v ?? 1)} min={1} step={1} />
              </div>
              <div className="space-y-2">
                <Label>串联组数 nS (Series)</Label>
                <NumericInput value={seriesCount} onChange={(v) => setSeriesCount(v ?? 1)} min={1} step={1} />
              </div>
            </div>
            <div className="space-y-2">
               <Label className="flex justify-between items-center">
                  <span>摩擦系数 μ_f (Friction)</span>
                  <span className="text-xs text-muted-foreground">{frictionCoeff.toFixed(2)}</span>
               </Label>
               <input 
                  type="range" 
                  min="0.01" 
                  max="0.2" 
                  step="0.01" 
                  value={frictionCoeff} 
                  onChange={(e) => setFrictionCoeff(parseFloat(e.target.value))}
                  className="w-full"
               />
               <p className="text-[10px] text-muted-foreground italic">
                 Typical: 0.05 (lubricated) ~ 0.12 (dry). V1: Informational.
               </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">载荷工况 / Loadcases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-1/3 text-sm text-muted-foreground font-mono">Preload s1</div>
                  <NumericInput value={sPreload} onChange={(v) => setSPreload(v ?? 0)} className="flex-1" />
                  <span className="text-xs">mm</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1/3 text-sm text-muted-foreground font-mono font-medium">Work s2</div>
                  <NumericInput value={sOperating} onChange={(v) => setSOperating(v ?? 0)} className="flex-1" />
                  <span className="text-xs font-semibold">mm</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-1/3 text-sm text-muted-foreground font-mono">Max s3</div>
                  <NumericInput value={sMax} onChange={(v) => setSMax(v ?? 0)} className="flex-1" />
                  <span className="text-xs">mm</span>
                </div>
             </div>

             {/* Unified Engineering Audit Card */}
             {unifiedAudit && (
               <EngineeringAuditCard 
                 audit={unifiedAudit} 
                 governingVariable="Δx" 
               />
             )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
           <CardHeader className="pb-3 pb-2">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Material / 材料</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">E (MPa)</Label>
                    <NumericInput value={E} onChange={(v) => setE(v ?? 206000)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ν (Poisson)</Label>
                    <NumericInput value={nu} onChange={(v) => setNu(v ?? 0.3)} step={0.01} />
                  </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Yield Strength Sy (MPa)</Label>
                <NumericInput value={Sy} onChange={(v) => setSy(v ?? 1200)} />
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Right Column: Preview & Results */}
      <div className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-60px)]">
        {/* 3D Visualizer */}
        <div className="flex-1 rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-50 relative group">
          <Calculator3DPreview 
            expectedType="disk" 
            heightClassName="h-full" 
            geometryOverride={input}
            showStressColors={showStressColors}
            stressUtilization={result.points.max.ratio}
          />
          
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
             <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white/80 backdrop-blur-sm border shadow-sm"
                onClick={() => setShowStressColors(!showStressColors)}
              >
                {showStressColors ? "Visual: Standard" : "Visual: Stress"}
              </Button>
          </div>

          {/* Design Rule Badges */}
          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
              {result.designRules.notes.length > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex gap-1 items-center">
                  <AlertTriangle className="h-3 w-3" />
                  {result.designRules.notes[0].length > 20 ? result.designRules.notes[0].substring(0,20) + "..." : result.designRules.notes[0]}
                </Badge>
              )}
          </div>
        </div>

        {/* Results Summary & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="space-y-4">
             <h3 className="text-sm font-semibold text-slate-900 border-l-4 border-blue-500 pl-2">Performance Summary / 性能摘要</h3>
             <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Preload Force F1 (装配力):</span>
                   <span className="font-semibold tabular-nums text-blue-600">{result.points.preload.F_stack.toFixed(1)} N</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-700 font-medium">Operating Force F2 (工作力):</span>
                   <span className="font-bold tabular-nums text-lg text-slate-900">{result.points.work.F_stack.toFixed(1)} N</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Max Force F3 (最大载荷):</span>
                   <span className="font-semibold tabular-nums">{result.points.max.F_stack.toFixed(1)} N</span>
                </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-mono">Travel Δs (有效行程):</span>
                    <span className="font-semibold tabular-nums">{travelDerived.delta.toFixed(2)} mm</span>
                 </div>
                 <Separator className="my-1" />
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Stiffness k_work (总成刚度):</span>
                    <span className="font-medium">{result.points.work.k_stack.toFixed(2)} N/mm</span>
                 </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-muted-foreground">Energy Capacity W_max (总储能):</span>
                   <span className="font-medium">{(result.points.max.W_stack / 1000).toFixed(2)} J</span>
                </div>
             </div>
          </div>

          <div className="flex flex-col justify-end gap-3">
             <Button 
                variant="outline" 
                className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200"
                onClick={() => {
                   handleSyncStore();
                   window.location.href = analysisUrl;
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Engineering Analysis / 工程分析
             </Button>

             <Button
                type="button"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                disabled={!unifiedAudit || unifiedAudit.status === "FAIL"}
                onClick={() => {
                  if (!result || !result.designRules.geometryOk || !unifiedAudit) return;
                  handleSyncStore();
                  
                  // Create Work Order
                  const store = useWorkOrderStore.getState();
                  // We need to re-construct geometry/material if not waiting for handleSyncStore to settle (which updates store asynchronously potentially, but zustand is sync usually)
                  // However, let's use the input object we have locally to be safe.
                  
                  // Reconstruct material info locally since it's not fully in 'result'
                  const materialInfo = {
                    id: "custom" as any,
                    name: "Spring Steel (User)",
                    shearModulus: E / (2 * (1 + nu)),
                    elasticModulus: E,
                    density: 7850,
                    tensileStrength: Sy, // Used Sy as yield, rough approx for tensile if not better known
                    surfaceFactor: 1.0,
                    tempFactor: 1.0,
                  };

                  const wo = store.createWorkOrder({
                    designCode: `DISK-${outerDiameter}-${innerDiameter}-${thickness}`, // unique enough for now
                    springType: "disk",
                    geometry: {
                      type: "disk",
                      outerDiameter,
                      innerDiameter,
                      thickness,
                      freeConeHeight,
                      group,
                      parallelCount,
                      seriesCount,
                      frictionCoeff,
                    },
                    material: materialInfo,
                    analysis: {
                      springRate: result.points.work.k_stack,
                      springRateUnit: "N/mm",
                      workingLoad: result.points.work.F_stack,
                      maxLoad: result.points.max.F_stack,
                      maxStress: result.points.max.sigma_eq,
                      staticSafetyFactor: 1 / (result.points.max.ratio || 1),
                      workingDeflection: travelDerived.delta,
                      maxDeflection: sMax,
                    },
                    audit: unifiedAudit,
                    quantity: 1000,
                    createdBy: "Engineer",
                    notes: unifiedAudit.status === "WARN" ? "Warning: Engineering audit has warnings. Review required." : undefined
                  });
                  
                  window.location.href = `/manufacturing/workorder/${wo.workOrderId}`;
                }}
              >
                <Factory className="w-4 h-4 mr-2" />
                Create Work Order / 创建生产工单
              </Button>
             <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10"
                disabled={!result.designRules.geometryOk}
                onClick={() => {
                   handleSyncStore();
                   window.location.href = "/tools/cad-export?type=disk";
                }}
              >
                Export CAD / 导出 CAD
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
