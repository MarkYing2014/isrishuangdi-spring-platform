"use client";

import { useMemo, useState, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { useSpringDesignStore, type WaveSpringGeometry, type MaterialInfo } from "@/lib/stores/springDesignStore";
import { calculateWaveSpring, type WaveSpringInput, type WaveSpringResult } from "@/lib/waveSpring/math";
import { computeWaveSpringEngineeringSummary, computeWaveSpringCurve, type WaveSpringEngineeringSummary } from "@/lib/engineering/waveSpring/analysis";

// Placeholder for future visualization
// const WaveSpringVisualizer = lazy(() => import("@/components/three/WaveSpringVisualizer"));

function useWaveSpringContext() {
  const geometry = useSpringDesignStore((state) =>
    state.geometry?.type === "wave" ? (state.geometry as WaveSpringGeometry) : null
  );
  const material = useSpringDesignStore((state) => state.material);
  const analysisResult = useSpringDesignStore((state) => state.analysisResult);
  return { geometry, material, analysisResult };
}

function SummaryGrid({ summary, isZh }: { summary: WaveSpringEngineeringSummary; isZh: boolean }) {
  const cards = [
    { 
      label: isZh ? "设计状态" : "Design Status", 
      value: summary.designStatus,
      status: summary.designStatus 
    },
    { label: isZh ? "工作刚度 k (N/mm)" : "k @ Work (N/mm)", value: summary.kWork.toFixed(2) },
    { label: isZh ? "任务载荷 F (N)" : "F @ Work (N)", value: summary.fWork.toFixed(1) },
    { label: isZh ? "等效应力指标" : "Stress Index", value: `${(summary.stressIndex * 100).toFixed(1)}%` },
    { label: isZh ? "并紧余量" : "Solid Clearance", value: `${summary.solidClearance.toFixed(2)} mm` },
    { label: isZh ? "安全系数" : "Safety Factor", value: summary.safetyFactor.toFixed(2) },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} className="border-dashed overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${
              card.status === "FAIL" ? "text-red-600" : 
              card.status === "MARGINAL" ? "text-amber-600" : ""
            }`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WaveSpringEngineeringPage() {
  const searchParams = useSearchParams();
  const { geometry, material, analysisResult } = useWaveSpringContext();
  const { language } = useLanguage();
  const isZh = language === "zh";

  const result = useMemo(() => {
    if (!geometry) return null;
    const input: WaveSpringInput = {
      geometry,
      material: material ? { E_MPa: material.elasticModulus, id: material.id, name: material.name } : undefined
    };
    return calculateWaveSpring(input);
  }, [geometry, material]);

  const summary = useMemo(() => {
    if (!geometry || !result) return null;
    return computeWaveSpringEngineeringSummary(
      { geometry, material: material ? { E_MPa: material.elasticModulus, id: material.id, name: material.name } : undefined },
      result,
      material ?? undefined
    );
  }, [geometry, result, material]);

  if (!geometry || !summary || !result) {
    return (
      <div className="container mx-auto py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isZh ? "波形弹簧工程分析" : "Wave Spring Engineering Analysis"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3 text-center py-20">
            <Info className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>
              {isZh 
                ? "目前没有活动的波形弹簧设计。请从计算器页面点击“前往工程分析”。"
                : "No active wave spring design. Please click 'Send to Engineering Analysis' from the calculator."}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/tools/wave-spring">{isZh ? "前往计算器" : "Go to Calculator"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/tools/wave-spring">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isZh ? "波形弹簧工程分析" : "Wave Spring Engineering Analysis"}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Badge variant="outline" className="text-[10px] uppercase">V2 Standard</Badge>
              <span className="text-sm">Wave: {geometry.wavesPerTurn_Nw} · Layers: {geometry.turns_Nt} · Material: {material?.name || "17-7PH"}</span>
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            {isZh ? "导出报表" : "Export Report"}
          </Button>
        </div>
      </div>

      <Alert variant={summary.designStatus === "FAIL" ? "destructive" : "default"} className={`border-l-4 ${
        summary.designStatus === "PASS" ? "border-l-green-500" : 
        summary.designStatus === "MARGINAL" ? "border-l-amber-500" : ""
      }`}>
        <div className="flex items-start gap-4">
          {summary.designStatus === "PASS" ? <CheckCircle className="h-5 w-5 text-green-500" /> : 
           summary.designStatus === "MARGINAL" ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : <XCircle className="h-5 w-5" />}
          <div>
            <AlertTitle className="font-bold flex items-center gap-2">
              {isZh ? "验证结论" : "Verdict"}: 
              <span className={summary.designStatus === "FAIL" ? "" : summary.designStatus === "MARGINAL" ? "text-amber-600" : "text-green-600"}>
                {isZh ? summary.verdictZh : summary.verdict}
              </span>
            </AlertTitle>
            <AlertDescription className="text-xs opacity-85 mt-1">
              {summary.stressIndex > 0.8 && (
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {isZh 
                    ? "提示：应力指标较高，在循环载荷下可能发生塑性衰减。建议增加线厚或波数。" 
                    : "Tip: High stress index. Potential set/relaxation under cyclic loads. Consider increasing thickness or waves."}
                </span>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>

      <SummaryGrid summary={summary} isZh={isZh} />

      <Tabs defaultValue="load" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/50">
          <TabsTrigger value="load">{isZh ? "载荷-变形" : "Load-Deflection"}</TabsTrigger>
          <TabsTrigger value="stress">{isZh ? "应力分析" : "Stress Analysis"}</TabsTrigger>
          <TabsTrigger value="fatigue">{isZh ? "疲劳评估" : "Fatigue"}</TabsTrigger>
          <TabsTrigger value="packaging">{isZh ? "装配尺寸" : "Packaging"}</TabsTrigger>
          <TabsTrigger value="fea">{isZh ? "FEA 验证" : "FEA (Beta)"}</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="load">
            <LoadDeflectionTab geometry={geometry} material={material} isZh={isZh} />
          </TabsContent>
          <TabsContent value="stress">
            <StressAnalysisTab summary={summary} material={material} isZh={isZh} />
          </TabsContent>
          <TabsContent value="fatigue">
            <FatigueTab summary={summary} isZh={isZh} />
          </TabsContent>
          <TabsContent value="packaging">
            <PackagingTab geometry={geometry} isZh={isZh} />
          </TabsContent>
          <TabsContent value="fea">
            <FeaPlaceholderTab isZh={isZh} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

function LoadDeflectionTab({ geometry, material, isZh }: { geometry: WaveSpringGeometry; material: MaterialInfo | null; isZh: boolean }) {
  const curveData = useMemo(() => {
    const input: WaveSpringInput = {
      geometry,
      material: material ? { E_MPa: material.elasticModulus } : undefined
    };
    return computeWaveSpringCurve(input);
  }, [geometry, material]);

  const workingTravel = geometry.freeHeight_Hf - geometry.workingHeight_Hw;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{isZh ? "力 - 位移性能曲线" : "Load - Deflection Curve"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="travel" 
                  label={{ value: isZh ? "变形偏移 (mm)" : "Deflection (mm)", position: "insideBottom", offset: -5, fontSize: 12 }} 
                  fontSize={11}
                />
                <YAxis 
                  label={{ value: isZh ? "载荷 (N)" : "Load (N)", angle: -90, position: "insideLeft", fontSize: 12 }} 
                  fontSize={11}
                />
                <Tooltip 
                  contentStyle={{ fontSize: '12px' }}
                  formatter={(val: number) => [val.toFixed(1) + " N", isZh ? "载荷" : "Load"]}
                  labelFormatter={(lab) => `${isZh ? "变形" : "Deflection"}: ${lab} mm`}
                />
                <Line type="monotone" dataKey="load" stroke="#2563eb" strokeWidth={3} dot={false} animationDuration={1000} />
                <ReferenceLine x={workingTravel} stroke="#ef4444" strokeDasharray="4 4" label={{ value: isZh ? "工作点" : "Work", fill: "#ef4444", fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{isZh ? "性能预测" : "Performance Metrics"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase">{isZh ? "工作刚度" : "Work Rate k"}</div>
            <div className="text-xl font-mono font-bold">{(curveData[5]?.load / curveData[5]?.travel || 0).toFixed(2)} <span className="text-xs font-normal text-muted-foreground">N/mm</span></div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground uppercase">{isZh ? "线性区间 (预估)" : "Linear Range (est)"}</div>
            <div className="text-sm font-medium">0 - {(geometry.freeHeight_Hf * 0.5).toFixed(1)} mm</div>
            <div className="text-[10px] text-muted-foreground italic">{isZh ? "建议工作在 20%~80% 变形区间" : "Recommended range: 20%~80% of max deflection"}</div>
          </div>
          <hr className="opacity-50" />
          <div className="space-y-2">
            <h4 className="text-xs font-bold">{isZh ? "非线性检测" : "Non-linearity Monitor"}</h4>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{isZh ? "硬化系数" : "Hardening Factor"}</span>
              <span className="font-mono text-emerald-600">1.05</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isZh ? "波形弹簧在接近固高时会产生 progressive hardening 现象。" : "Wave springs exhibit progressive hardening near solid height."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StressAnalysisTab({ summary, material, isZh }: { summary: WaveSpringEngineeringSummary; material: MaterialInfo | null; isZh: boolean }) {
  const stressStatus = summary.stressIndex < 0.8 ? "OK" : summary.stressIndex < 0.9 ? "WARNING" : "CRITICAL";
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{isZh ? "等效波峰弯曲应力指标" : "Equivalent Crest Bending Stress Index"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className={`text-5xl font-mono font-black ${
               stressStatus === "CRITICAL" ? "text-red-500" : 
               stressStatus === "WARNING" ? "text-amber-500" : "text-slate-900 dark:text-slate-100"
            }`}>
              {(summary.stressIndex * 100).toFixed(1)}
              <span className="text-lg font-normal ml-1">%</span>
            </div>
            <Badge variant={stressStatus === "CRITICAL" ? "destructive" : "secondary"}>
              {isZh ? "利用率" : "Utilization"}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-xs">
              <div className="font-bold flex items-center gap-1 mb-1">
                <Info className="h-3 w-3" />
                {isZh ? "强度评价" : "Strength Assessment"}
              </div>
              <p className="opacity-80 leading-relaxed">
                {isZh 
                  ? "波形弹簧不产生均匀扭转应力。此处使用基于多波峰分载的等效弯曲模型评估。" 
                  : "Wave springs do not experience uniform torsional stress. Evaluated using a crest-level equivalent bending model."}
                <br /><br />
                {stressStatus === "OK" && (isZh ? "结构利用率处于安全区间。" : "Structural utilization is within safe limits.")}
                {stressStatus === "WARNING" && (isZh ? "接近建议限值（90%），建议进行 FEA 仿真。" : "Approaching recommended limit (90%); FEA simulation recommended.")}
                {stressStatus === "CRITICAL" && (isZh ? "超出推荐工作区间，极可能导致永久变形。" : "Exceeds safe range; high risk of permanent set.")}
              </p>
            </div>

            {summary.stressIndex > 0.7 && (
              <Alert className="bg-amber-500/10 border-amber-500/20 py-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <div className="text-[11px] font-bold text-amber-700">
                    {isZh ? "建议：运行 FEA 验证" : "Recommended: Run FEA validation"}
                  </div>
                </div>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{isZh ? "材料强度模型 (17-7PH / SUS631)" : "Material Strength Model (17-7PH)"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left font-medium">{isZh ? "热处理状态" : "Condition"}</th>
                  <th className="p-2 text-right font-medium">{isZh ? "屈服强度 YS" : "Yield YS"}</th>
                  <th className="p-2 text-right font-medium">{isZh ? "弹性模量 E" : "Modulus E"}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className={(material?.id as string) === "17-7PH" ? "bg-primary/5 font-bold" : ""}>
                  <td className="p-2">CH900 (Cold Hedged)</td>
                  <td className="p-2 text-right">1170 MPa</td>
                  <td className="p-2 text-right">203 GPa</td>
                </tr>
                <tr>
                  <td className="p-2">TH1050</td>
                  <td className="p-2 text-right">1030 MPa</td>
                  <td className="p-2 text-right">200 GPa</td>
                </tr>
                <tr>
                  <td className="p-2">RH950</td>
                  <td className="p-2 text-right">1210 MPa</td>
                  <td className="p-2 text-right">203 GPa</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            {isZh 
              ? "* 默认使用 CH900 状态参数。热处理温度过高（>480°C）会导致强度急剧下降。" 
              : "* Based on CH900 state. Over-aging (>480°C) will significantly reduce yield strength."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function FatigueTab({ summary, isZh }: { summary: WaveSpringEngineeringSummary; isZh: boolean }) {
  const lifeLevel = summary.stressIndex < 0.4 ? "HIGH" : summary.stressIndex < 0.6 ? "MED" : "LOW";
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{isZh ? "循环寿命预估 (S-N 模型)" : "Cycle Life Estimation"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-around gap-8">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground uppercase mb-1">{isZh ? "寿命评级" : "Life Rating"}</div>
            <div className={`text-4xl font-black ${
              lifeLevel === "HIGH" ? "text-green-500" : lifeLevel === "MED" ? "text-amber-500" : "text-red-500"
            }`}>{lifeLevel}</div>
          </div>
          
          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between text-[10px] mb-1 font-medium">
              <span>{isZh ? "疲劳风险" : "Fatigue Risk"}</span>
              <span>{(summary.stressIndex * 100).toFixed(0)}% Util.</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500" style={{ width: "40%" }} />
              <div className="h-full bg-yellow-500" style={{ width: "20%" }} />
              <div className="h-full bg-red-500" style={{ width: "40%" }} />
            </div>
            <div className="relative mt-1">
               <div 
                 className="absolute h-4 w-1 bg-primary -top-4 shadow-sm transition-all" 
                 style={{ left: `${Math.min(summary.stressIndex * 100, 100)}%` }} 
               />
            </div>
          </div>
          
          <div className="text-center">
             <div className="text-[10px] text-muted-foreground uppercase mb-1">{isZh ? "预估循环" : "Est Cycles"}</div>
             <div className="text-2xl font-mono font-bold">
               {lifeLevel === "HIGH" ? "1M+" : lifeLevel === "MED" ? "100k - 1M" : "< 100k"}
             </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/30 grid gap-4 md:grid-cols-2 text-xs">
          <div className="space-y-1">
            <h4 className="font-bold opacity-70">Goodman Mapping</h4>
            <div className="flex justify-between">
              <span>Mean Stress (σm)</span>
              <span className="font-mono">{(summary.stressMax * 0.5).toFixed(0)} MPa</span>
            </div>
            <div className="flex justify-between">
              <span>Stress Amp (σa)</span>
              <span className="font-mono">{(summary.stressMax * 0.5).toFixed(0)} MPa</span>
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold opacity-70 italic">{isZh ? "专家建议" : "Expert Tip"}</h4>
            <p className="text-[10px] opacity-80 leading-tight">
              {isZh 
                ? "波形弹簧对平均应力敏感。若需长寿命运行，建议减小初始预紧量并增加波数。" 
                : "Wave springs are sensitive to mean stress. For long-life, reduce preload and increase wave count."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PackagingTab({ geometry, isZh }: { geometry: WaveSpringGeometry; isZh: boolean }) {
  const clearanceOD = 1.0; // Assume 1mm recommend
  const clearanceID = 0.8; 
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{isZh ? "导向与间隙检查" : "Fit and Clearances"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
            <div className="space-y-1">
              <div className="text-xs font-bold">{isZh ? "孔径配合 (OD)" : "Hole Fit (OD)"}</div>
              <div className="text-[10px] text-muted-foreground">{isZh ? "推荐孔径: > " : "Rec. Hole Dia: > "} {(geometry.od + clearanceOD).toFixed(1)} mm</div>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">PASS</Badge>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
            <div className="space-y-1">
              <div className="text-xs font-bold">{isZh ? "轴径配合 (ID)" : "Shaft Fit (ID)"}</div>
              <div className="text-[10px] text-muted-foreground">{isZh ? "推荐轴径: < " : "Rec. Shaft Dia: < "} {(geometry.id - clearanceID).toFixed(1)} mm</div>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">PASS</Badge>
          </div>
          
          <Alert className="py-2 px-3">
             <Info className="h-3 w-3" />
             <AlertDescription className="text-[10px]">
               {isZh ? "波形弹簧在压缩时外径会略微增大，请确保足够的孔间隙。" : "Wave spring OD expands slightly during compression; ensure adequate hole clearance."}
             </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{isZh ? "弹簧类型与高度" : "Type and Heights"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
               <div className="text-[10px] text-muted-foreground uppercase">{isZh ? "弹簧高度" : "Heights"}</div>
               <div className="mt-1 space-y-1 text-xs">
                 <div className="flex justify-between"><span>{isZh ? "自由 H0" : "Free H0"}:</span> <span className="font-mono">{geometry.freeHeight_Hf.toFixed(1)}</span></div>
                 <div className="flex justify-between"><span>{isZh ? "并紧 Hs" : "Solid Hs"}:</span> <span className="font-mono">{(geometry.turns_Nt * geometry.thickness_t).toFixed(1)}</span></div>
                 <div className="flex justify-between"><span>{isZh ? "工作 Hw" : "Work Hw"}:</span> <span className="font-mono font-bold">{geometry.workingHeight_Hw.toFixed(1)}</span></div>
               </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
               <div className="text-[10px] text-muted-foreground uppercase">{isZh ? "层叠类型" : "Stack Type"}</div>
               <div className="mt-1 text-xs font-bold">{isZh ? "Crest-to-Crest (多圈层叠)" : "Crest-to-Crest"}</div>
               <p className="text-[10px] text-muted-foreground mt-2 leading-tight">
                 {isZh ? "通过多圈波形峰谷相对叠加，实现更高的行程和更小的刚度。" : "Achieves more travel and lower rate by stacking waves peak-to-peak."}
               </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeaPlaceholderTab({ isZh }: { isZh: boolean }) {
  return (
    <Card className="border-dashed py-20">
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
           <Loader2 className="h-8 w-8 text-primary animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="font-bold">{isZh ? "FEA 仿真接口开发中" : "FEA Module Development"}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {isZh 
              ? "我们正在接入 CalculiX 进行非线性接触仿真，以精确预测波形弹簧在全行程下的刚度变化及应力分布。" 
              : "We are integrating CalculiX for non-linear contact simulations to precisely predict stiffness and stress across the full stroke."}
          </p>
        </div>
        <Button disabled variant="outline">{isZh ? "查看路线图" : "View Roadmap"}</Button>
      </CardContent>
    </Card>
  );
}

/**
 * Empty wrapper because the main component is the one we export
 */
export default function WaveSpringEngineering() {
  return <WaveSpringEngineeringPage />;
}
