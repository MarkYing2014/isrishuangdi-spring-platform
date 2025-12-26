"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Activity, Settings2, Info } from "lucide-react";
import { NumericInput } from "@/components/ui/numeric-input";
import { useLanguage } from "@/components/language-context";
import { 
  TorsionalSpringSystemDesign, 
  TorsionalSpringGroup 
} from "@/lib/torsional/torsionalSystemTypes";
import { 
  calculateTorsionalSystem 
} from "@/lib/torsional/torsionalSystemMath";
import { 
  getDefaultTorsionalSystemDesign,
  TORSIONAL_SYSTEM_SAMPLES,
  normalizeTorsionalDesign
} from "@/lib/torsional/torsionalSystem";
import { buildTorsionalSystemDesignRuleReport } from "@/lib/torsional/torsionalSystemRules";
import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

import { TorsionalSystemReport } from "@/components/torsional/TorsionalSystemReport";

const TorsionalSystemVisualizer = dynamic(
  () => import("@/components/three/TorsionalSystemVisualizer").then(mod => mod.TorsionalSystemVisualizer),
  { ssr: false }
);

export function TorsionalSystemCalculator() {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const [design, setDesign] = useState<TorsionalSpringSystemDesign>(getDefaultTorsionalSystemDesign());
  const [exploded, setExploded] = useState(false);

  // Analysis
  const result = useMemo(() => calculateTorsionalSystem(design), [design]);

  // Actions
  const addGroup = () => {
    const prevGroup = design.groups[design.groups.length - 1];
    const newGroup: TorsionalSpringGroup = {
      ...prevGroup,
      id: `group-${Date.now()}`,
      name: `Group ${design.groups.length + 1}`,
      // Temporary placeholder, normalize will fix it
      theta_start: prevGroup.theta_start + 5 
    };
    
    setDesign(normalizeTorsionalDesign({ 
      ...design, 
      id: `st-${Date.now()}`, // Force remount
      groups: [...design.groups, newGroup] 
    }));
  };

  const removeGroup = (id: string) => {
    if (design.groups.length <= 1) return;
    setDesign(normalizeTorsionalDesign({
      ...design,
      id: `st-${Date.now()}`, // Force remount
      groups: design.groups.filter(g => g.id !== id)
    }));
  };


  const updateGroup = (id: string, updates: Partial<TorsionalSpringGroup>) => {
    setDesign({
      ...design,
      groups: design.groups.map(g => g.id === id ? { ...g, ...updates } : g)
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 p-4 bg-slate-50/30 rounded-xl min-h-screen">
      {/* Left Column: Inputs (Sticky Sidebar) */}
      <div className="xl:col-span-4 space-y-6">
        <div className="sticky top-6 space-y-6">
            {/* Real-World Samples */}
            <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur-sm">
                <CardHeader className="py-2 px-4 border-b">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {isZh ? "工程案例库" : "Real-World Samples"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 grid grid-cols-1 gap-1">
                    {Object.entries(TORSIONAL_SYSTEM_SAMPLES).map(([key, sample]) => (
                        <Button 
                            key={key} 
                            variant="ghost" 
                            size="sm" 
                            className="justify-start h-8 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => setDesign(normalizeTorsionalDesign({ 
                                ...sample, 
                                id: `preset-${Date.now()}` 
                            }))}
                        >
                            <Badge variant="outline" className="mr-2 h-4 text-[9px] font-mono border-slate-300">TSP</Badge>
                            {sample.name}
                        </Button>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 text-xs font-bold text-slate-400"
                        onClick={() => setDesign(getDefaultTorsionalSystemDesign())}
                    >
                        <Badge variant="outline" className="mr-2 h-4 text-[9px] font-mono opacity-50">INIT</Badge>
                        {isZh ? "重置为默认" : "Reset to Default"}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b bg-slate-900 text-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-blue-400" />
                        {isZh ? "设计工作区" : "Design Workspace"}
                    </CardTitle>
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={addGroup} 
                        className="h-7 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 hover:bg-white/10 px-2"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        {isZh ? "添加组" : "Add Group"}
                    </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                    {design.groups.map((group, idx) => (
                    <div key={group.id} className="p-4 rounded-xl border bg-white shadow-sm space-y-3 relative group transition-all hover:border-blue-200">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center bg-slate-900 text-white rounded text-[8px]">{idx + 1}</span>
                                {group.name}
                            </h4>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-rose-500 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeGroup(group.id)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Count (n)</Label>
                                <NumericInput value={group.n} onChange={v => updateGroup(group.id, { n: v ?? 1 })} min={1} className="h-8 text-xs font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Rate (k, N/mm)</Label>
                                <NumericInput value={group.k} onChange={v => updateGroup(group.id, { k: v ?? 1 })} min={0.1} className="h-8 text-xs font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Radius (R, mm)</Label>
                                <NumericInput value={group.R} onChange={v => updateGroup(group.id, { R: v ?? 1 })} min={1} className="h-8 text-xs font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Start (θ, deg)</Label>
                                <NumericInput value={group.theta_start} onChange={v => updateGroup(group.id, { theta_start: v ?? 0 })} min={0} className="h-8 text-xs font-mono border-blue-400/30" />
                            </div>
                        </div>

                        <div className="pt-3 border-t grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <Label className="text-[8px] text-slate-300 font-black uppercase text-center block">d</Label>
                                <NumericInput value={group.d} onChange={v => updateGroup(group.id, { d: v ?? 1 })} className="h-7 text-xs px-1 text-center font-mono bg-slate-50/50" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[8px] text-slate-300 font-black uppercase text-center block">Dm</Label>
                                <NumericInput value={group.Dm} onChange={v => updateGroup(group.id, { Dm: v ?? 1 })} className="h-7 text-xs px-1 text-center font-mono bg-slate-50/50" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[8px] text-slate-300 font-black uppercase text-center block">L_free</Label>
                                <NumericInput value={group.L_free} onChange={v => updateGroup(group.id, { L_free: v ?? 1 })} className="h-7 text-xs px-1 text-center font-mono bg-slate-50/50" />
                            </div>
                        </div>
                    </div>
                    ))}
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="py-2 px-4 border-b">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {isZh ? "系统及总成参数" : "System & Assembly"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase">Friction Tf (Nm)</Label>
                            <NumericInput value={design.frictionTorque} onChange={v => setDesign({ ...design, frictionTorque: v ?? 0 })} className="h-8 font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase text-blue-600">Work Angle (deg)</Label>
                            <NumericInput value={design.referenceAngle} onChange={v => setDesign({ ...design, referenceAngle: v ?? 0 })} className="h-8 font-mono border-blue-500" />
                        </div>
                    </div>

                    <div className="pt-3 border-t grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase">Assembly OD (mm)</Label>
                            <NumericInput value={design.outerOD} onChange={v => setDesign({ ...design, outerOD: v ?? 100 })} className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase">Assembly ID (mm)</Label>
                            <NumericInput value={design.innerID} onChange={v => setDesign({ ...design, innerID: v ?? 20 })} className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase">Plate Thick (mm)</Label>
                            <NumericInput value={design.carrierThickness} onChange={v => setDesign({ ...design, carrierThickness: v ?? 1 })} className="h-8 text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase">Bolt/Rivet (n)</Label>
                            <NumericInput value={design.boltCount} onChange={v => setDesign({ ...design, boltCount: v ?? 4 })} className="h-8 text-xs font-mono" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                            <Label className="text-[9px] font-black text-slate-400 uppercase">Bolt Circle Radius (mm)</Label>
                            <NumericInput value={design.boltCircleRadius} onChange={v => setDesign({ ...design, boltCircleRadius: v ?? 50 })} className="h-8 text-xs font-mono" />
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
      </div>

      {/* Right Column: Main Content Area */}
      <div className="xl:col-span-8 space-y-8">
         {/* 3D Engineering Sandbox - Promoted to Center Stage */}
         <Card className="border-slate-200 shadow-2xl bg-white overflow-hidden border-t-4 border-t-blue-600">
            <CardHeader className="py-3 px-6 border-b bg-slate-900 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    3D Digital Twin Simulation
                </CardTitle>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-800 rounded-md p-0.5 mr-4 border border-slate-700">
                        <Button 
                            variant={!exploded ? "secondary" : "ghost"} 
                            size="sm" 
                            className={`h-6 text-[8px] font-black uppercase px-2 transition-all ${!exploded ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-slate-500 hover:text-white'}`}
                            onClick={() => setExploded(false)}
                        >
                            Assembled
                        </Button>
                        <Button 
                            variant={exploded ? "secondary" : "ghost"} 
                            size="sm" 
                            className={`h-6 text-[8px] font-black uppercase px-2 transition-all ${exploded ? 'bg-amber-600 text-white hover:bg-amber-500' : 'text-slate-500 hover:text-white'}`}
                            onClick={() => setExploded(true)}
                        >
                            Exploded
                        </Button>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-[8px] font-bold uppercase tracking-widest px-2 py-0.5">
                        Live Feed
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0 relative h-[650px]">
                <TorsionalSystemVisualizer design={design} result={result} exploded={exploded} />
                <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-2 pointer-events-none">
                    <Badge className="bg-slate-900/90 backdrop-blur border border-slate-700 text-[9px] uppercase font-bold tracking-widest px-3 py-1 shadow-2xl">
                        Real-time Kinematics
                    </Badge>
                    <Badge variant="outline" className="bg-white/90 backdrop-blur-md border-emerald-200 text-emerald-600 text-[9px] font-black uppercase tracking-tighter shadow-md w-fit px-3 py-1">
                        Factory Policy: Clutch Damper (V1)
                    </Badge>
                </div>
            </CardContent>
         </Card>

         <TorsionalSystemReport design={design} result={result} />
      </div>
    </div>
  );
}
