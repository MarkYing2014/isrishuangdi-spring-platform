"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/components/language-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, AlertTriangle, CheckCircle2, ShieldAlert, Activity, Wand2 } from "lucide-react";

import { AxialPackInput, PlatformResult, AxialPackResult } from "@/lib/spring-platform/types";
import { getEngine } from "@/lib/spring-platform/engine-registry";
import { AxialPackVisualizer } from "@/components/three/AxialPackVisualizer";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { DesignOptimizerDialog } from "@/components/calculators/DesignOptimizerDialog";
import { AxialSystemReport } from "@/components/axial/AxialSystemReport";
import { AxialOptimizerSection } from "@/components/calculators/optimizer/AxialOptimizerSection";

const MATERIALS: Record<string, { label: string; labelZh: string; G: number; E: number; tauAllow: number }> = {
    "ferrous-carbon-music": { label: "Music Wire (ASTM A228)", labelZh: "琴钢丝 (SWC)", G: 79000, E: 206000, tauAllow: 800 },
    "stainless-302": { label: "Stainless 302 (ASTM A313)", labelZh: "不锈钢 302 (SUS)", G: 69000, E: 193000, tauAllow: 550 },
    "chrome-silicon": { label: "Chrome Silicon (ASTM A401)", labelZh: "铬硅钢丝 (SWOSC-V)", G: 79300, E: 206000, tauAllow: 900 },
    "oil-tempered": { label: "Oil Tempered (ASTM A229)", labelZh: "油淬火钢丝 (SWO)", G: 79000, E: 206000, tauAllow: 650 },
};

const AXIAL_SAMPLES: Record<string, { name: string; nameZh: string; input: AxialPackInput }> = {
    "asp-hd-return": {
        name: "HD Clutch Return (Truck)",
        nameZh: "重卡离合器回位 (HD)",
        input: {
            baseSpring: { d: 4.0, Dm: 28.0, Na: 5.5, Nt: 7.5, L0: 65.0, materialId: "chrome-silicon", endCondition: "closed" },
            pack: { N: 12, Rbc: 160, plateThickness: 6, ringOD: 360, ringID: 100, guided: true },
            loadcase: { stroke: 0 },
            options: { units: "mm" }
        }
    },
    "asp-pc-cushion": {
        name: "Passenger Cushion (Sedan)",
        nameZh: "乘用车缓冲弹簧 (Std)",
        input: {
            baseSpring: { d: 2.2, Dm: 18.0, Na: 7.0, Nt: 9.0, L0: 45.0, materialId: "ferrous-carbon-music", endCondition: "closed" },
            pack: { N: 8, Rbc: 85, plateThickness: 4, ringOD: 200, ringID: 0, guided: false },
            loadcase: { stroke: 0 },
            options: { units: "mm" }
        }
    },
    "asp-piston-hv": {
        name: "HV Piston Return (EV)",
        nameZh: "新能源活塞回位 (EV)",
        input: {
            baseSpring: { d: 1.8, Dm: 14.0, Na: 12.0, Nt: 14.0, L0: 55.0, materialId: "stainless-302", endCondition: "closed" },
            pack: { N: 16, Rbc: 110, plateThickness: 3, ringOD: 242, ringID: 0, guided: true },
            loadcase: { stroke: 0 },
            options: { units: "mm" }
        }
    }
};

// Define safe defaults
const DEFAULT_PACK_INPUT: AxialPackInput = {
    baseSpring: {
        d: 2.0, Dm: 20.0, Na: 6.0, Nt: 8.0, L0: 50.0, materialId: "ferrous-carbon-music",
        endCondition: "closed"
    },
    pack: {
        N: 8, Rbc: 60, plateThickness: 5,
        ringOD: 150, ringID: 0,
        guided: false
    },
    loadcase: { stroke: 0 },
    options: { units: "mm" }
};

export function AxialPackCalculator() {
    const { language } = useLanguage();
    const isZh = language === "zh";

    // --- State ---
    // --- State ---
    const [input, setInput] = useState<AxialPackInput>(DEFAULT_PACK_INPUT);
    const [stroke, setStroke] = useState(0); // Live visual stroke
    const [optimizerOpen, setOptimizerOpen] = useState(false);
    
    // --- Engine Calculation ---
    const result = useMemo(() => {
        const engine = getEngine("axialPack");
        const mat = MATERIALS[input.baseSpring.materialId] || MATERIALS["ferrous-carbon-music"];
        const materialModel = { id: input.baseSpring.materialId, G: mat.G, E: mat.E, tauAllow: mat.tauAllow };
        
        return engine.calculate({
            geometry: input,
            material: materialModel,
            cases: { mode: "deflection", values: [stroke] },
            modules: { basicGeometry: true, stressAnalysis: true } as any
        }) as AxialPackResult;
    }, [input, stroke]);

    // --- Engineering Audit (Phase 4) ---
    const audit = useMemo(() => {
        return AuditEngine.evaluate({
            springType: "axialPack", // Passed mainly for switch cases if any, but governingOverride handles generic
            geometry: input,
            results: result,
            policy: { stressFailThreshold: 110 } // Standard
        });
    }, [input, result]);

    // Helpers to update nested state
    const updateBase = (field: string, val: any) => {
        setInput(prev => ({ ...prev, baseSpring: { ...prev.baseSpring, [field]: val } }));
    };
    const updatePack = (field: string, val: any) => {
        setInput(prev => ({ ...prev, pack: { ...prev.pack, [field]: val } }));
    };

    // --- Derived Data for UI ---
    const maxStroke = result.rawResult?.pack?.maxStroke || 40;
    const k_total = result.springRate;
    const F_at_stroke = result.cases[0]?.load || 0;
    // const status = (result.designRules?.some((r:any) => r.status === "fail") || (stroke > maxStroke)) 
    //     ? "FAIL" 
    //     : (result.designRules?.some((r:any) => r.status === "warning") ? "WARN" : "PASS");
    
    // Semantic Status Logic
    // Valid Geometry = Design Rules OK
    // Safe Load = Audit OK
    const rulesStatus = result.designRules?.some((r:any) => r.status === "fail") ? "FAIL" : "PASS";
    const auditStatus = audit.status;

    const renderGlobalStatus = () => {
        if (auditStatus === "PASS") return <Badge className="bg-green-500 hover:bg-green-600">READY FOR RFQ</Badge>;
        
        if (rulesStatus === "PASS" && (auditStatus === "FAIL" || auditStatus === "WARN")) {
             return <Badge className="bg-orange-500 hover:bg-orange-600">DESIGNABLE (Review)</Badge>;
        }
        
        if (auditStatus === "WARN") return <Badge className="bg-yellow-500 hover:bg-yellow-600">WARNING</Badge>;
        return <Badge className="bg-red-500 hover:bg-red-600">NOT DELIVERABLE</Badge>;
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:h-[calc(100vh-140px)] min-h-[800px] h-auto pb-8">
            
            <DesignOptimizerDialog 
                open={optimizerOpen} 
                onOpenChange={setOptimizerOpen}
                baseTemplate={input}
                onApply={(newInput) => {
                    setInput(newInput);
                    setOptimizerOpen(false);
                }}
            />

            {/* LEFT PANEL: INPUTS */}
            <Card className="xl:col-span-3 h-full overflow-y-auto border-slate-200 shadow-sm flex flex-col gap-4">
                
                {/* Samples Library */}
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                    <CardHeader className="py-2 px-4 border-b">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {isZh ? "工程案例库" : "Real-World Samples"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 grid grid-cols-1 gap-1">
                        {Object.entries(AXIAL_SAMPLES).map(([key, sample]) => (
                            <Button 
                                key={key} 
                                variant="ghost" 
                                size="sm" 
                                className="justify-start h-8 text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                onClick={() => setInput({ ...sample.input })}
                            >
                                <Badge variant="outline" className="mr-2 h-4 text-[9px] font-mono border-slate-300">ASP</Badge>
                                {isZh ? sample.nameZh : sample.name}
                            </Button>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start h-8 text-xs font-bold text-slate-400"
                            onClick={() => setInput(DEFAULT_PACK_INPUT)}
                        >
                            <Badge variant="outline" className="mr-2 h-4 text-[9px] font-mono opacity-50">INIT</Badge>
                            {isZh ? "重置为默认" : "Reset to Default"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Definitions Card */}
                <Card className="flex-1 border-slate-200 shadow-sm flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                        <CardTitle className="text-lg">{isZh ? "参数定义" : "Definitions"}</CardTitle>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-blue-200 text-blue-700 hover:text-blue-800"
                            onClick={() => setOptimizerOpen(true)}
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                            {isZh ? "自动设计" : "Auto Design"}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-1">
                    
                    {/* Section 1: Single Spring */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                             <h3 className="font-semibold text-sm text-slate-700">{isZh ? "单簧规格" : "Single Spring"}</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{isZh ? "材料 Material" : "Material"}</Label>
                                <select 
                                    className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={input.baseSpring.materialId}
                                    onChange={(e) => updateBase("materialId", e.target.value)}
                                >
                                    {Object.entries(MATERIALS).map(([id, info]) => (
                                        <option key={id} value={id}>
                                            {isZh ? info.labelZh : info.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{isZh ? "线径 d" : "Wire d (mm)"}</Label>
                                    <Input type="number" step={0.1} value={input.baseSpring.d} onChange={e => updateBase("d", parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{isZh ? "中径 Dm" : "Mean Dm (mm)"}</Label>
                                    <Input type="number" step={0.5} value={input.baseSpring.Dm} onChange={e => updateBase("Dm", parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{isZh ? "有效圈 Na" : "Active Na"}</Label>
                                    <Input type="number" step={0.25} value={input.baseSpring.Na} onChange={e => updateBase("Na", parseFloat(e.target.value))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{isZh ? "自由长 L0" : "Free Len L0"}</Label>
                                    <Input type="number" step={1} value={input.baseSpring.L0} onChange={e => updateBase("L0", parseFloat(e.target.value))} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Section 2: Pack Layout */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">2</div>
                             <h3 className="font-semibold text-sm text-slate-700">{isZh ? "阵列配置" : "Pack Layout"}</h3>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{isZh ? "数量 N" : "Count N"}</Label>
                                    <Input type="number" min={1} max={80} value={input.pack.N} onChange={e => updatePack("N", Math.min(80, Math.max(1, parseInt(e.target.value))))} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{isZh ? "分布圆 Rbc" : "Radius Rbc"}</Label>
                                    <Input type="number" step={1} value={input.pack.Rbc} onChange={e => updatePack("Rbc", parseFloat(e.target.value))} />
                                </div>
                            </div>

                            {/* Constraints Toggle Section */}
                            <div className="p-3 bg-slate-50 rounded-md space-y-3 border">
                                <Label className="text-xs font-bold text-slate-500 block mb-2">{isZh ? "边界约束" : "Boundaries (Optional)"}</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">ID (Ring)</Label>
                                        <Input className="h-7 text-xs" placeholder="None" type="number" value={input.pack.ringID || ""} onChange={e => updatePack("ringID", parseFloat(e.target.value))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground">OD (Housing)</Label>
                                        <Input className="h-7 text-xs" placeholder="None" type="number" value={input.pack.ringOD || ""} onChange={e => updatePack("ringOD", parseFloat(e.target.value))} />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-[10px] text-muted-foreground">Plate Thickness (Stack)</Label>
                                        <Input className="h-7 text-xs" type="number" value={input.pack.plateThickness} onChange={e => updatePack("plateThickness", parseFloat(e.target.value))} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    {/* Section 3: Load Slider Control */}
                    <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-sm text-slate-700">{isZh ? "工况负荷" : "Load Case"}</h3>
                            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{stroke.toFixed(1)} mm</span>
                         </div>
                         <Slider 
                            value={[stroke]} 
                            max={maxStroke * 1.1} // Allow slight over-travel visual
                            step={0.1}
                            onValueChange={([v]) => setStroke(v)} 
                            className="py-2"
                         />
                         <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>0</span>
                            <span>Limit: {maxStroke.toFixed(1)}</span>
                         </div>
                    </div>
                </CardContent>
            </Card>
        </Card>

            {/* MIDDLE PANEL: 3D VIEW */}
            <div className="xl:col-span-6 h-full min-h-[500px] flex flex-col gap-4">
                <Card className="flex-1 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 relative bg-slate-100">
                        <AxialPackVisualizer input={input} stroke={stroke} showClearance={true} />
                        
                        {/* Overlay KPI */}
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow border border-slate-200 w-48 space-y-2">
                             <div className="flex justify-between items-baseline">
                                <span className="text-xs text-slate-500 font-bold">RATE (Total)</span>
                                <span className="text-sm font-mono font-bold text-slate-800">{k_total.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">N/mm</span></span>
                             </div>
                             <div className="flex justify-between items-baseline">
                                <span className="text-xs text-slate-500 font-bold">LOAD @ {stroke.toFixed(0)}mm</span>
                                <span className="text-sm font-mono font-bold text-blue-600">{(F_at_stroke/1000).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">kN</span></span>
                             </div>
                             <Separator className="my-1"/>
                             <div className="flex justify-between items-baseline">
                                <span className="text-xs text-slate-500 font-bold">CLEARANCE</span>
                                <span className={`text-sm font-mono font-bold ${(result.rawResult?.pack?.clearance?.ssMin < 0.5) ? 'text-red-500' : 'text-green-600'}`}>
                                    {result.rawResult?.pack?.clearance?.ssMin?.toFixed(2) ?? "-"} mm
                                </span>
                             </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* RIGHT PANEL: RESULTS & AUDIT */}
            <Card className="xl:col-span-3 h-full overflow-y-auto border-slate-200 shadow-sm flex flex-col">
                 <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{isZh ? "工程审查" : "Engineering Audit"}</CardTitle>
                    
                    <div className="flex gap-4 items-center">
                        {/* Inline Summary for Quick Visibility */}
                        <div className="flex gap-3 text-xs">
                                {/* DEBUG: Check Data Existence */}
                                {!result.stressAnalysis && <span className="text-[10px] text-red-500 font-bold border px-1 border-red-200 bg-red-50">NO DATA</span>}

                            <div className="flex items-center gap-1.5" title="Spring Shear Stress Status">
                                <div className={`w-2 h-2 rounded-full ${(result.stressAnalysis?.tauCorrected || 0) > (result.tauAllow||0) ? 'bg-red-500':'bg-green-500'}`}></div>
                                <span className="text-slate-600">{isZh ? "弹簧应力" : "Spring"}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Plate Bending Stress Status">
                                <div className={`w-2 h-2 rounded-full ${(result.stressAnalysis?.sigmaPlate || 0) > 350 ? 'bg-yellow-500':'bg-green-500'}`}></div>
                                <span className="text-slate-600">{isZh ? "压盘应力" : "Plate"}</span>
                            </div>
                        </div>
                    
                        {renderGlobalStatus()}
                    </div>
                </div>
            </CardHeader>
                 <CardContent className="space-y-6 pt-6">
                    
                    {/* Engineering Status Card */}
                    <div className={`p-4 rounded-lg border flex flex-col gap-2 relative overflow-hidden ${
                        auditStatus === "PASS" ? "bg-green-50/50 border-green-200" :
                        auditStatus === "WARN" ? "bg-yellow-50/50 border-yellow-200" :
                        "bg-red-50/50 border-red-200"
                    }`}>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className={`w-5 h-5 ${
                                auditStatus === "PASS" ? "text-green-600" :
                                auditStatus === "WARN" ? "text-yellow-600" :
                                "text-red-600"
                            }`} />
                            <h4 className="font-bold text-sm text-slate-800">
                                {auditStatus === "PASS" ? (isZh ? "工程状态良好" : "Engineering OK") : 
                                 (isZh ? `工程工况不满足 (${audit.summary.governingFailureModeZh})` : `Engineering Note: ${audit.summary.governingFailureMode}`)}
                            </h4>
                        </div>
                        
                        {/* Subtext Logic for "Designable but not Deliverable" */}
                        {rulesStatus === "PASS" && (auditStatus === "FAIL" || auditStatus === "WARN") && (
                            <p className="text-xs text-slate-600">
                                {isZh ? "几何结构有效，但轴向载荷不安全。" : "Valid Pack Geometry, Unsafe Axial Load"}
                            </p>
                        )}
                        
                        {/* Metric */}
                        <div className="flex justify-between text-xs mt-1 pt-2 border-t border-black/5">
                            <span className="text-muted-foreground">{isZh ? "控制模式" : "Governing Mode"}</span>
                            <span className="font-mono font-medium">{isZh ? audit.summary.governingFailureModeZh : audit.summary.governingFailureMode}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                             <span className="text-muted-foreground">{isZh ? "利用率 / 临界比" : "Utilization / Ratio"}</span>
                             <span className="font-mono font-bold">{audit.summary.criticalRatio.toFixed(0)}%</span>
                        </div>
                    </div>


                    {/* Design Rules Checklist */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{isZh ? "设计规则检查" : "Design Rules Checklist"}</h4>
                        <div className="space-y-2">
                            {result.designRules?.map((rule: any, i:number) => (
                                <div key={i} className={`flex items-start gap-3 p-2 rounded border ${rule.status === 'pass' ? 'bg-green-50 border-green-100' : rule.status === 'warning' ? 'bg-yellow-50 border-yellow-100' : 'bg-red-50 border-red-100'}`}>
                                    {rule.status === 'pass' ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" /> : <AlertTriangle className={`w-4 h-4 mt-0.5 ${rule.status==='fail'?'text-red-500':'text-yellow-600'}`} />}
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium text-slate-800">{rule.label}</span>
                                            <span className="text-xs font-mono text-slate-500">{rule.value}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-0.5">{rule.message}</p>
                                    </div>
                                </div>
                            ))}
                            {result.designRules?.length === 0 && <p className="text-xs text-slate-400">No active rules.</p>}
                        </div>
                    </div>

                    <Separator />

                    {/* Pack KPI Summary */}
                    <div className="space-y-3">
                         <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{isZh ?"组件性能" : "Pack Performance"}</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block">SOLID HEIGHT PACK</span>
                                <span className="text-sm font-mono text-slate-700">{result.rawResult?.pack?.Hs_pack.toFixed(1)} mm</span>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block">MAX STROKE</span>
                                <span className="text-sm font-mono text-slate-700">{maxStroke.toFixed(1)} mm</span>
                            </div>
                         </div>
                    </div>

                    <Separator />
                    
                    {/* RFQ Export Snippet */}
                    <div className="bg-slate-900 rounded-md p-3 relative group">
                        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-slate-400 hover:text-white" onClick={() => navigator.clipboard.writeText(JSON.stringify(input))}>
                            <Copy className="w-3 h-3" />
                        </Button>
                        <pre className="text-[10px] text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                            {`RFQ-AXIAL-PACK
${input.pack.N}x Parallel @ R${input.pack.Rbc}
Spring: ${input.baseSpring.d}x${input.baseSpring.Dm}x${input.baseSpring.L0}
Rate: ${k_total.toFixed(1)} N/mm
Clearance: ${(result.rawResult?.pack?.clearance?.ssMin ?? 0).toFixed(2)}mm`}
                        </pre>
                    </div>

                 </CardContent>
            </Card>

            {/* NEW PANEL: ADVANCED ANALYSIS (OEM REPORT) */}
            <div className="xl:col-span-3 h-full overflow-y-auto border-slate-200 shadow-sm flex flex-col">
                 <AxialSystemReport input={input} result={result} stroke={stroke} />
            </div>

            {/* OPTIMIZER SECTION - Full Width at Bottom */}
            <div className="xl:col-span-12">
                <AxialOptimizerSection 
                    baseTemplate={input}
                    onApply={(newInput) => {
                        setInput(newInput);
                    }}
                />
            </div>

        </div>
    );
}


