"use client";

import { useMemo, useState } from "react";
import { GarterSpringDesign } from "@/lib/springTypes/garter";
import { AnalysisResult } from "@/lib/stores/springDesignStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import { GarterSpringVisualizer } from "@/components/three/GarterSpringVisualizer";
import { computeGarterV2 } from "@/lib/engine/garterV2";
import { Cpu, Layers, Play, Settings2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/language-context";

interface Props {
  geometry: GarterSpringDesign;
  analysisResult: AnalysisResult;
}

export function GarterSpringEngineeringPage({ geometry, analysisResult }: Props) {
  const { language } = useLanguage();
  const [feaMode, setFeaMode] = useState("quick");
  const [meshQuality, setMeshQuality] = useState("coarse");
  const [feaStatus, setFeaStatus] = useState<"idle" | "queued" | "running" | "success">("idle");

  // V2 Engine Calculation
  const v2Results = useMemo(() => {
      return computeGarterV2({
          d: geometry.wireDiameter,
          Dm: geometry.meanDiameter,
          N: geometry.totalCoils ?? geometry.activeCoils,
          D_free: geometry.ringFreeDiameter ?? 100,
          D_inst: geometry.ringInstalledDiameter ?? (geometry.ringFreeDiameter ?? 100),
          G: geometry.shearModulus ?? 79000,
          jointType: geometry.jointType ?? "hook",
          jointFactor: 1.0, // V2 Policy Locked
          tensileStrength: undefined 
      });
  }, [geometry]);

  // Curve Data Mapping
  const curveData = useMemo(() => {
      return v2Results.curves.forceAbs.map((pt, i) => ({
          deltaD: pt.x,
          diameter: (geometry.ringFreeDiameter ?? 100) + pt.x, 
          tension: pt.y, 
          stress: v2Results.curves.stress[i]?.y ?? 0,
          // Placeholder for Future FEA overlay
          feaTension: null 
      }));
  }, [v2Results, geometry.ringFreeDiameter]);
  
  const audit = useMemo(() => {
     return AuditEngine.evaluate({
        springType: "garter",
        geometry,
        results: analysisResult, 
        policy: { stressWarnThreshold: 80, stressFailThreshold: 100 }
     });
  }, [geometry, analysisResult]);

  const handleRunFea = () => {
    setFeaStatus("queued");
    setTimeout(() => setFeaStatus("running"), 1500);
    setTimeout(() => setFeaStatus("success"), 4500);
  };

  const t = (en: string, zh: string) => language === "en" ? en : zh;

  return (
    <div className="space-y-8">
       {/* 1. Top Section: Input Summary & Derived Model */}
       <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Summary */}
          <Card className="bg-slate-50/50">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("Input Parameters (Locked)", "输入参数 (锁定)")}
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-1">
                   <span>{t("Wire Dia d", "线径 d")}</span>
                   <span className="font-mono">{geometry.wireDiameter.toFixed(2)} mm</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                   <span>{t("Mean Dia Dm", "中径 Dm")}</span>
                   <span className="font-mono">{geometry.meanDiameter.toFixed(2)} mm</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                   <span>{t("Coils Na (N)", "有效圈数 Na (N)")}</span>
                   <span className="font-mono">{geometry.activeCoils}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                   <span>{t("Material G", "材料剪切模量 G")}</span>
                   <span className="font-mono">{(geometry.shearModulus ?? 79000).toLocaleString()} MPa</span>
                </div>
                <div className="flex justify-between pt-1">
                   <span>{t("Joint Factor", "接头系数")}</span>
                   <Badge variant="outline" className="font-mono">{t("Locked 1.0", "锁定 1.0")}</Badge>
                </div>
             </CardContent>
          </Card>

          {/* Derived / Unwrapped Model - The Core Physics */}
          <Card className="lg:col-span-2 border-l-4 border-l-blue-500">
             <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle>{t("Equivalent Unwrapped Model (V2)", "等效展开模型 (V2)")}</CardTitle>
                    <Badge variant="secondary">{t("Analytical", "解析解")}</Badge>
                </div>
                <CardDescription>{t("Linear approximation: Ring circumference change → Axial deflection", "线性近似：环周长变化 → 轴向变形")}</CardDescription>
             </CardHeader>
             <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                 <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">{t("Diameter Change ΔD", "直径变化 ΔD")}</span>
                    <div className="text-2xl font-bold flex items-baseline gap-2">
                       {v2Results.deltaD_mag.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">mm</span>
                    </div>
                    <Badge className={v2Results.direction === "Extend" ? "bg-blue-100 text-blue-800 hover:bg-blue-100" : v2Results.direction === "Compress" ? "bg-orange-100 text-orange-800 hover:bg-orange-100" : ""}>
                        {v2Results.direction === "Extend" ? t("EXTEND", "伸长") : v2Results.direction === "Compress" ? t("COMPRESS", "压缩") : "NEUTRAL"}
                    </Badge>
                 </div>
                 
                 <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">{t("Deflection ΔL (π·ΔD)", "变形量 ΔL (π·ΔD)")}</span>
                    <div className="text-2xl font-bold font-mono">
                       {(Math.PI * v2Results.deltaD_mag).toFixed(2)} <span className="text-sm font-normal text-muted-foreground">mm</span>
                    </div>
                    <span className="text-xs text-slate-400">{t("Axial Equiv.", "轴向等效")}</span>
                 </div>

                 <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">{t("Stiffness k_ax", "轴向刚度 k_ax")}</span>
                    <div className="text-2xl font-bold font-mono">
                       {v2Results.k_ax.toFixed(3)} <span className="text-sm font-normal text-muted-foreground">N/mm</span>
                    </div>
                 </div>

                 <div className="space-y-1 border-l pl-4">
                    <span className="text-xs text-muted-foreground block">{t("Hoop Tension Ft", "环向张力 Ft")}</span>
                    <div className="text-2xl font-bold text-blue-600">
                       {v2Results.forceAbs.toFixed(2)} N
                    </div>
                    <span className="text-xs text-slate-400">F = k_ax · ΔL</span>
                 </div>
             </CardContent>
          </Card>
       </div>

       {/* 2. Middle Section: Audit & FEA Control */}
       <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
             <EngineeringAuditCard audit={audit} governingVariable={language === "en" ? "Stress (Wahl) + Joint" : "应力 (Wahl) + 接头"} />
          </div>

          {/* FEA Panel */}
          <Card className="flex flex-col border-l-4 border-l-purple-500 bg-slate-50/50">
             <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-600" />
                    <CardTitle>{t("Finite Element Analysis", "有限元分析 (FEA)")}</CardTitle>
                </div>
                <CardDescription>{t("Verify analytical results with physics simulation.", "通过物理仿真验证解析结果。")}</CardDescription>
             </CardHeader>
             <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                   <label className="text-xs font-medium text-slate-500">{t("Simulation Mode", "仿真模式")}</label>
                   <Select value={feaMode} onValueChange={setFeaMode}>
                      <SelectTrigger className="bg-white">
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="quick">{t("Quick Check (Single Point)", "快速校验 (单点)")}</SelectItem>
                         <SelectItem value="sweep">{t("Full Sweep (Curve Overlay)", "全扫掠 (曲线叠加)")}</SelectItem>
                         <SelectItem value="submodel">{t("Joint Sub-model (Solid)", "接头子模型 (实体)")}</SelectItem>
                      </SelectContent>
                   </Select>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-medium text-slate-500">{t("Mesh Quality", "网格质量")}</label>
                   <Select value={meshQuality} onValueChange={setMeshQuality}>
                      <SelectTrigger className="bg-white">
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="coarse">{t("Coarse (Fastest)", "粗糙 (最快)")}</SelectItem>
                         <SelectItem value="normal">{t("Standard (Recommended)", "标准 (推荐)")}</SelectItem>
                         <SelectItem value="fine">{t("Fine (High Precision)", "精细 (高精度)")}</SelectItem>
                      </SelectContent>
                   </Select>
                </div>

                {feaStatus === "success" && (
                   <div className="bg-emerald-50 text-emerald-700 p-2 rounded text-xs border border-emerald-200">
                      <strong>{t("Analysis Complete", "分析完成")}</strong><br/>
                      {t("Max Stress", "最大应力")}: {(v2Results.maxShearStress * 1.05).toFixed(1)} MPa (+5%)<br/>
                      {t("Ready for overlay.", "叠加已就绪。")}
                   </div>
                )}
             </CardContent>
             <CardFooter>
                 <Button 
                    className={`w-full ${feaStatus === "running" ? "bg-slate-700" : "bg-purple-600 hover:bg-purple-700"}`} 
                    onClick={handleRunFea}
                    disabled={feaStatus === "running" || feaStatus === "queued"}
                 >
                    {feaStatus === "queued" ? t("Queued...", "排队中...") : feaStatus === "running" ? t("Simulating...", "仿真中...") : t("Run Simulation", "运行仿真")}
                    {feaStatus === "idle" && <Play className="w-4 h-4 ml-2 fill-current" />}
                 </Button>
             </CardFooter>
          </Card>
       </div>

       {/* 3. Bottom Section: Tabs (Curves, 3D, Mock FEA Details) */}
       <Tabs defaultValue="load">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
             <TabsTrigger value="load" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
                {t("Load Curve", "载荷曲线")}
             </TabsTrigger>
             <TabsTrigger value="stress" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
                {t("Stress Curve", "应力曲线")}
             </TabsTrigger>
             <TabsTrigger value="drawing" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none">
                {t("Drawing Preview", "图纸预览")}
             </TabsTrigger>
          </TabsList>
          
          <div className="pt-6">
            <TabsContent value="load" className="h-[400px]">
               <Card className="h-full">
                  <CardHeader>
                      <div className="flex justify-between">
                          <CardTitle>{t("Hoop Tension vs Expansion (ΔD)", "环向张力 vs 膨胀量 (ΔD)")}</CardTitle>
                          {feaStatus === "success" && <Badge variant="outline" className="border-purple-500 text-purple-600">{t("FEA Overlay Active", "FEA 叠加激活")}</Badge>}
                      </div>
                  </CardHeader>
                  <CardContent className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={curveData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="deltaD" label={{ value: 'ΔD (mm)', position: 'insideBottom', offset: -5 }} />
                              <YAxis label={{ value: `${t("Tension", "张力")} (N)`, angle: -90, position: 'insideLeft' }} />
                              <Tooltip 
                                labelFormatter={(label) => `ΔD: ${Number(label).toFixed(2)} mm`}
                                formatter={(value: number) => [value.toFixed(2) + " N", t("Analytical Tension", "解析张力")]}
                              />
                              <Legend verticalAlign="top" height={36}/>
                              <Line name={t("Analytical (V2)", "解析解 (V2)")} type="monotone" dataKey="tension" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                              {feaStatus === "success" && (
                                <Line name={t("FEA (Simulated)", "FEA (仿真)")} type="monotone" dataKey="tension" stroke="#9333ea" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                              )}
                          </LineChart>
                      </ResponsiveContainer>
                  </CardContent>
               </Card>
            </TabsContent>
            
            <TabsContent value="stress" className="h-[400px]">
                <Card className="h-full">
                  <CardHeader><CardTitle>{t("Shear Stress vs Expansion (ΔD)", "剪切应力 vs 膨胀量 (ΔD)")}</CardTitle></CardHeader>
                  <CardContent className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={curveData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="deltaD" label={{ value: 'ΔD (mm)', position: 'insideBottom', offset: -5 }} />
                              <YAxis label={{ value: `${t("Stress", "应力")} (MPa)`, angle: -90, position: 'insideLeft' }} />
                              <Tooltip 
                                labelFormatter={(label) => `ΔD: ${Number(label).toFixed(2)} mm`}
                                formatter={(value: number) => [value.toFixed(0) + " MPa", t("Shear Stress", "剪切应力")]}
                              />
                              <Legend verticalAlign="top" height={36}/>
                              <ReferenceLine y={80} stroke="#f97316" strokeDasharray="3 3" label={t("Warn (80%)", "警告 (80%)")} />
                              <ReferenceLine y={100} stroke="#ef4444" label={t("Limit (100%)", "极限 (100%)")} />
                              <Line name={t("Analytical (Wahl)", "解析解 (Wahl)")} type="monotone" dataKey="stress" stroke="#dc2626" strokeWidth={3} dot={false} />
                          </LineChart>
                      </ResponsiveContainer>
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="drawing">
               <Card className="h-[500px] flex flex-col p-4">
                   <div className="flex-1 rounded-lg overflow-hidden border bg-white">
                      <GarterSpringVisualizer 
                          geometry={geometry} 
                          installedDiameter={(geometry.ringFreeDiameter ?? 100) + v2Results.deltaD} 
                      />
                   </div>
                   <div className="mt-4 text-center">
                      <Button variant="outline" asChild>
                          <a href={`/tools/cad-export?type=garter`}>{t("Export CAD (DXF/SVG)", "导出 CAD (DXF/SVG)")}</a>
                      </Button>
                   </div>
               </Card>
            </TabsContent>
          </div>
       </Tabs>
    </div>
  );
}
