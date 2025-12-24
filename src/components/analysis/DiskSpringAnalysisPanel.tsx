"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Info, 
  Settings, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  Activity,
  BarChart3
} from "lucide-react";

const Separator = () => <div className="h-px bg-slate-200 w-full my-6" />;
import Link from "next/link";
import dynamic from "next/dynamic";

import { calculateDiskSpring, type DiskSpringResult, type DiskCurvePoint } from "@/lib/springMath/diskSpring";
import type { DiskGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import { VariablePitchCurvesChart, type VariablePitchCurveMode } from "@/components/charts/VariablePitchCurvesChart";
import { SavedDesignManager } from "@/components/analysis/SavedDesignManager";

const DiskSpringVisualizer = dynamic(
  () => import("@/components/three/DiskSpringVisualizer").then((mod) => mod.DiskSpringVisualizer),
  { ssr: false }
);

interface DiskSpringAnalysisPanelProps {
  isZh: boolean;
  geometry: DiskGeometry;
  material: MaterialInfo;
  analysisResult: AnalysisResult;
}

export function DiskSpringAnalysisPanel({
  isZh,
  geometry,
  material,
  analysisResult,
}: DiskSpringAnalysisPanelProps) {
  const [chartMode, setChartMode] = useState<VariablePitchCurveMode>("overlay_force_stress");

  // Re-calculate full result for analysis
  const fullResult = useMemo(() => {
    return calculateDiskSpring({
      ...geometry,
      deflectionPreload: 0,
      deflectionOperating: analysisResult.workingDeflection || 0,
      deflectionMax: analysisResult.maxDeflection || 0,
      elasticModulus: material.elasticModulus,
      yieldStrength: 1200, // Fallback if not in material
    } as any);
  }, [geometry, material, analysisResult]);

  // Map curve data for chart
  const chartData = useMemo(() => {
    return fullResult.curve.map((p) => ({
      deflection: p.s,
      load: p.F_stack,
      springRate: p.k_stack,
      shearStress: p.sigma_eq, // map sigma_eq to shearStress for generic chart
    }));
  }, [fullResult]);

  const markers = useMemo(() => [
    { deflection: analysisResult.workingDeflection || 0, label: isZh ? "工作点" : "Operating", color: "#3b82f6" },
    { deflection: analysisResult.maxDeflection || 0, label: isZh ? "最大点" : "Max", color: "#ef4444" },
  ], [analysisResult, isZh]);

  return (
    <main className="container mx-auto py-6 px-4 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tools/disk-spring">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {isZh ? "碟簧工程分析" : "Disk Spring Analysis"}
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">DIN 2092</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              {isZh ? "高级非线性特性与安全系数验证" : "Advanced Nonlinear Characteristics & Safety Verification"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <SavedDesignManager />
           <Button variant="outline" size="sm" className="gap-2 rounded-full">
             <Download className="h-4 w-4" />
             {isZh ? "导出报告" : "Export Report"}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Rules */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                {isZh ? "关键指标" : "Key Metrics"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
               <div className="grid grid-cols-1 gap-2">
                  <MetricRow label={isZh ? "工作载荷 F2" : "Work Force F2"} value={`${fullResult.points.work.F_stack.toFixed(1)} N`} />
                  <MetricRow label={isZh ? "最大力 F3" : "Max Force F3"} value={`${fullResult.points.max.F_stack.toFixed(1)} N`} />
                  <MetricRow label={isZh ? "最大应力" : "Max Stress"} value={`${fullResult.points.max.sigma_eq?.toFixed(0)} MPa`} highlight={fullResult.designRules.stress === "FAIL"} />
                  <MetricRow label={isZh ? "安全系数" : "Safety Factor"} value={`${(1 / (fullResult.points.max.ratio || 1)).toFixed(2)}`} color={fullResult.designRules.stress === "FAIL" ? "text-red-600" : "text-emerald-600"} />
               </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader className="pb-3 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {isZh ? "设计校验" : "Design Verification"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
               <RuleItem 
                  label={isZh ? "强度校验" : "Stress Check"} 
                  status={fullResult.designRules.stress} 
                  text={fullResult.designRules.stress === "OK" ? (isZh ? "应力水平安全" : "Stress is safe") : (isZh ? "应力过载" : "Stress Overload")}
               />
               <RuleItem 
                  label={isZh ? "并紧风险" : "Flattening Risk"} 
                  status={fullResult.designRules.flattening} 
                  text={fullResult.designRules.flattening === "OK" ? (isZh ? "位移裕量充足" : "Clearance OK") : (isZh ? "接近平状态" : "Near Flattening")}
               />
               <RuleItem 
                  label={isZh ? "叠放合理性" : "Stacking Rules"} 
                  status={fullResult.designRules.stacking} 
                  text={isZh ? `配置: ${geometry.parallelCount}并 ${geometry.seriesCount}串` : `Config: ${geometry.parallelCount}P ${geometry.seriesCount}S`}
               />
               
               {fullResult.designRules.notes.length > 0 && (
                 <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex gap-2 items-start text-amber-800 text-xs">
                       <Info className="h-4 w-4 shrink-0 mt-0.5" />
                       <ul className="list-disc pl-4 space-y-1">
                         {fullResult.designRules.notes.map((note, i) => <li key={i}>{note}</li>)}
                       </ul>
                    </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>

        {/* Center/Right: Charts & 3D */}
        <div className="lg:col-span-2 space-y-6">
           <Card className="h-fit">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                 <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    {isZh ? "载荷-位移-应力曲线" : "Force-Deflection-Stress Curve"}
                 </CardTitle>
                 <div className="flex gap-1">
                    <Button variant={chartMode === "force" ? "default" : "outline"} size="sm" className="h-7 text-[10px]" onClick={() => setChartMode("force")}>F</Button>
                    <Button variant={chartMode === "stress" ? "default" : "outline"} size="sm" className="h-7 text-[10px]" onClick={() => setChartMode("stress")}>S</Button>
                    <Button variant={chartMode === "stiffness" ? "default" : "outline"} size="sm" className="h-7 text-[10px]" onClick={() => setChartMode("stiffness")}>k</Button>
                    <Button variant={chartMode === "overlay_force_stress" ? "default" : "outline"} size="sm" className="h-7 text-[10px]" onClick={() => setChartMode("overlay_force_stress")}>F+S</Button>
                 </div>
              </CardHeader>
              <CardContent className="h-[320px]">
                 <VariablePitchCurvesChart data={chartData} mode={chartMode} markers={markers} />
              </CardContent>
           </Card>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="h-[350px] overflow-hidden">
                 <DiskSpringVisualizer 
                   {...geometry}
                   deflection={analysisResult.workingDeflection || 0}
                   nP={geometry.parallelCount}
                   nS={geometry.seriesCount}
                   showStressColors={true}
                   stressUtilization={fullResult.points.work.ratio}
                   springRate={fullResult.points.work.k_stack}
                 />
              </Card>

              <Card>
                 <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{isZh ? "工况点详情" : "Workpoint Details"}</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2">
                       <h4 className="text-xs font-semibold text-slate-500 uppercase">{isZh ? "工作点 s2" : "Operating Point s2"}</h4>
                       <div className="flex justify-between">
                          <span>{isZh ? "组内位移" : "Deflection/Disk"}:</span>
                          <span className="font-mono">{fullResult.points.work.s.toFixed(2)} mm</span>
                       </div>
                       <div className="flex justify-between font-bold">
                          <span>{isZh ? "轴向弹力 F2" : "Total Force F2"}:</span>
                          <span className="text-blue-600 font-mono">{fullResult.points.work.F_stack.toFixed(1)} N</span>
                       </div>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                       <h4 className="text-xs font-semibold text-slate-500 uppercase">{isZh ? "极限点 s3" : "Limit Point s3"}</h4>
                       <div className="flex justify-between">
                          <span>{isZh ? "极限应力" : "Peak Stress"}:</span>
                          <span className="font-mono text-slate-900">{fullResult.points.max.sigma_eq?.toFixed(1)} MPa</span>
                       </div>
                       <div className="flex justify-between">
                          <span>{isZh ? "位移占比" : "Deflection %"}:</span>
                          <span className="font-mono">{(fullResult.points.max.s / fullResult.meta.sLimit * 100).toFixed(1)}%</span>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>

      {/* Advanced Engineering Considerations */}
      <Card className="bg-slate-50/50 border-dashed">
        <CardHeader className="pb-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-600" />
            {isZh ? "高级工程考量 - 什么时候可能“不够”？" : "Advanced Engineering Considerations"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">{isZh ? "寿命与工艺补偿" : "Life & Process Compensation"}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isZh 
                  ? "当需要精确模拟喷丸(Shot Peening)、预压(Pre-stressing)或热处理导致的残余应力分布及等效刚度变化时。这些工艺会改变材料层面的屈服门槛。"
                  : "Required for modeling residual stress distributions from shot peening, pre-stressing, or heat treatment, which shift the effective yield threshold."}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">{isZh ? "高精密堆叠系统" : "High-Precision Stacks"}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isZh 
                  ? "对于阀门、精密夹具等对工作点误差极度敏感（<3%误差）的系统，需考虑单片制造公差与组合后的累积误差。"
                  : "Critical for valves or fixtures sensitive to <3% error. Requires consideration of manufacturing tolerances and cumulative stacking errors."}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">{isZh ? "非理想边界条件" : "Non-ideal Factors"}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isZh 
                  ? "考虑导向轴摩擦、端面接触变形或环境温度对模量的动态影响。摩擦力会导致加/卸载曲线产生明显的滞后环(Hysteresis)。"
                  : "Considers friction from guide rods, surface contact deformation, and thermal effects. Friction causes visible hysteresis between loading and unloading."}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
             <p className="text-[10px] text-slate-400 italic">
               {isZh 
                 ? "* 当前模型基于 DIN 2092 标准理论模型。对于上述超高精度场景，建议结合 FEA 有限元分析或实验数据进行 K 值修正。" 
                 : "* Current model is based on DIN 2092. For high-precision scenarios, FEA or experimental K-factor correction is recommended."}
             </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function MetricRow({ label, value, color = "", highlight = false }: { label: string; value: string; color?: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-slate-50 last:border-0 ${highlight ? 'bg-red-50 px-2 rounded -mx-2' : ''}`}>
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold tabular-nums opacity-90 ${color}`}>{value}</span>
    </div>
  );
}

function RuleItem({ label, status, text }: { label: string; status: "OK" | "WARN" | "FAIL"; text: string }) {
   const config = {
      OK: { icon: CheckCircle2, class: "text-emerald-600", bg: "bg-emerald-50" },
      WARN: { icon: AlertCircle, class: "text-amber-600", bg: "bg-amber-50" },
      FAIL: { icon: AlertCircle, class: "text-red-600", bg: "bg-red-50" },
   }[status];

   const Icon = config.icon;

   return (
      <div className={`flex items-start gap-3 p-2 rounded-lg ${config.bg}`}>
         <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.class}`} />
         <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider leading-none">{label}</p>
            <p className={`text-xs font-semibold ${config.class}`}>{text}</p>
         </div>
      </div>
   );
}
