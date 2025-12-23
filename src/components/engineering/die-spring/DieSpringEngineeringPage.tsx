"use client";

import { useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowLeft } from "lucide-react";
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

import { useSpringDesignStore, type DieSpringGeometry } from "@/lib/stores/springDesignStore";
import { findCatalogMatch, type DieSpringDutyColor } from "@/lib/engineering/dieSpring/catalog";
import {
  computeDieSpringEngineeringSummary,
  generateLoadDeflectionCurve,
  computeDieSpringStress,
  analyzeGuideClearance,
  estimateCycleLife,
  type DieSpringEngineeringSummary,
} from "@/lib/engineering/dieSpring/analysis";
import { getTemperatureLoadLoss } from "@/lib/dieSpring/temperatureLoadLoss";
import { type DieSpringDuty } from "@/lib/dieSpring/riskModel";
import type { DieSpringMaterialType } from "@/lib/dieSpring/types";

const DieSpringVisualizer = lazy(() => import("@/components/three/DieSpringVisualizer"));

function useDieSpringContext() {
  const geometry = useSpringDesignStore((state) =>
    state.geometry?.type === "dieSpring" ? (state.geometry as DieSpringGeometry) : null
  );
  const material = useSpringDesignStore((state) => state.material);
  const analysisResult = useSpringDesignStore((state) => state.analysisResult);
  return { geometry, material, analysisResult };
}

function SummaryGrid({ summary, isZh }: { summary: DieSpringEngineeringSummary; isZh: boolean }) {
  const cards = [
  { label: isZh ? "设计状态" : "Design Status", value: summary.designStatus },
  { label: isZh ? "刚度 k (N/mm)" : "k (N/mm)", value: summary.springRate_Nmm?.toFixed(2) ?? "—" },
  { label: isZh ? "工作载荷 (N)" : "F@Work (N)", value: summary.loadAtWork_N?.toFixed(1) ?? "—" },
  { label: isZh ? "应力比" : "Stress Ratio", value: summary.stressRatio?.toFixed(2) ?? "—" },
  { label: isZh ? "压缩比 %L" : "Deflection %L", value: summary.deflectionPercent ? `${(summary.deflectionPercent * 100).toFixed(1)}%` : "—" },
  { label: isZh ? "循环寿命" : "Cycle Life", value: summary.cycleLifeLevel },
  { label: isZh ? "导向风险" : "Guide Risk", value: summary.guideRisk },
  { label: isZh ? "温度损失 %" : "Temp Loss %", value: summary.tempLoadLossPercent?.toFixed(1) ?? "—" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DieSpringEngineeringPage() {
  const searchParams = useSearchParams();
  const { geometry, material, analysisResult } = useDieSpringContext();
  const { language } = useLanguage();
  const isZh = language === "zh";

  const derivedDuty = geometry?.dutyColor ?? (searchParams.get("dutyColor") as
    | "blue"
    | "red"
    | "gold"
    | "green"
    | null);

  const catalogMatch = useMemo(
    () => findCatalogMatch({ dutyColor: derivedDuty ?? undefined }),
    [derivedDuty]
  );

  const summary = useMemo(() => {
    if (!geometry || !material) return null;
    return computeDieSpringEngineeringSummary({
      geometry,
      material,
      analysisResult,
      catalogEntry: catalogMatch.entry,
    });
  }, [geometry, material, analysisResult, catalogMatch]);

  if (!geometry || !material || !summary) {
    return (
      <div className="container mx-auto py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isZh ? "模具弹簧工程分析" : "Die Spring Engineering Analysis"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              {isZh 
                ? "当前没有存储的模具弹簧设计。请使用模具弹簧计算器并点击“前往工程分析”，或使用所需的查询参数打开此页面。"
                : "No die spring design is currently stored. Use the Die Spring Calculator and click 'Send to Engineering Analysis', or open this page with the required query parameters."}
            </p>
            <p>{isZh ? "查询参数" : "Query snapshot"}: {searchParams.toString() || "—"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <Button asChild variant="outline" className="mb-4">
        <Link href="/tools/die-spring">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {isZh ? "返回计算器" : "Back to Calculator"}
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isZh ? "模具弹簧工程分析" : "Die Spring Engineering Analysis"}</h1>
          <p className="text-muted-foreground">
            {isZh ? "设计编号" : "designCode"}: {geometry.designCode ?? "—"} · {isZh ? "负荷等级" : "duty"}:{" "}
            <Badge>{derivedDuty ?? catalogMatch.entry.duty}</Badge>
          </p>
        </div>
      </div>

      <SummaryGrid summary={summary} isZh={isZh} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap justify-start">
          <TabsTrigger value="overview">{isZh ? "概览" : "Overview"}</TabsTrigger>
          <TabsTrigger value="selection">{isZh ? "选型" : "Selection"}</TabsTrigger>
          <TabsTrigger value="load">{isZh ? "载荷-变形" : "Load-Deflection"}</TabsTrigger>
          <TabsTrigger value="stress">{isZh ? "应力" : "Stress"}</TabsTrigger>
          <TabsTrigger value="cycle">{isZh ? "循环寿命" : "Cycle Life"}</TabsTrigger>
          <TabsTrigger value="guide">{isZh ? "导向与间隙" : "Guide & Hole/Rod"}</TabsTrigger>
          <TabsTrigger value="temperature">{isZh ? "温度" : "Temperature"}</TabsTrigger>
          <TabsTrigger value="fea">{isZh ? "FEA验证" : "FEA Validation"}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab geometry={geometry} summary={summary} isZh={isZh} />
        </TabsContent>

        <TabsContent value="selection">
          <Card>
            <CardHeader>
              <CardTitle>{isZh ? "选型与目录匹配" : "Selection & Catalog Match"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>{isZh ? "匹配负荷等级" : "Matched Duty"}: {catalogMatch.entry.name}</p>
              <p>{isZh ? "刚度范围" : "Spring Rate Range"}: {catalogMatch.entry.springRateRange_Nmm.join(" – ")} N/mm</p>
              <p>{isZh ? "利用率" : "Utilization Ratio"}: {catalogMatch.utilizationRatio?.toFixed(2) ?? "—"}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="load">
          <LoadDeflectionTab geometry={geometry} springRate={summary.springRate_Nmm ?? 0} isZh={isZh} />
        </TabsContent>
        <TabsContent value="stress">
          <StressTab geometry={geometry} load={summary.loadAtWork_N ?? 0} isZh={isZh} />
        </TabsContent>
        <TabsContent value="cycle">
          <CycleLifeTab geometry={geometry} isZh={isZh} />
        </TabsContent>
        <TabsContent value="guide">
          <GuideTab geometry={geometry} isZh={isZh} />
        </TabsContent>
        <TabsContent value="temperature">
          <TemperatureTab geometry={geometry} isZh={isZh} />
        </TabsContent>
        <TabsContent value="fea">
          <FeaTab geometry={geometry} isZh={isZh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

const DUTY_COLOR_TO_CODE: Record<DieSpringDutyColor, DieSpringDuty> = {
  blue: "LD",
  red: "MD",
  gold: "HD",
  green: "XHD",
};

function OverviewTab({ geometry, summary, isZh }: { geometry: DieSpringGeometry; summary: DieSpringEngineeringSummary; isZh: boolean }) {
  const statusIcon = summary.designStatus === "PASS" 
    ? <CheckCircle className="h-5 w-5 text-green-500" />
    : summary.designStatus === "MARGINAL"
    ? <AlertTriangle className="h-5 w-5 text-yellow-500" />
    : <XCircle className="h-5 w-5 text-red-500" />;

  const dutyCode = geometry.dutyColor ? DUTY_COLOR_TO_CODE[geometry.dutyColor] : "MD";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {statusIcon}
            {isZh ? "设计概要" : "Design Summary"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-muted-foreground">{isZh ? "设计编号" : "Design Code"}:</span>
            <span className="font-mono">{geometry.designCode ?? "—"}</span>
            <span className="text-muted-foreground">{isZh ? "负荷等级" : "Duty"}:</span>
            <span className="font-semibold">{dutyCode} ({geometry.dutyColor ?? "—"})</span>
            <span className="text-muted-foreground">{isZh ? "外径 × 内径" : "OD × ID"}:</span>
            <span className="font-mono">{geometry.outerDiameter.toFixed(1)} × {(geometry.innerDiameter ?? geometry.outerDiameter - 2 * geometry.wireWidth).toFixed(1)} mm</span>
            <span className="text-muted-foreground">{isZh ? "自由长度" : "Free Length"}:</span>
            <span className="font-mono">{geometry.freeLength.toFixed(1)} mm</span>
            <span className="text-muted-foreground">{isZh ? "工作长度" : "Working Length"}:</span>
            <span className="font-mono">{geometry.workingLength.toFixed(1)} mm</span>
            <span className="text-muted-foreground">{isZh ? "线材 (b × t)" : "Wire (b × t)"}:</span>
            <span className="font-mono">{geometry.wireWidth.toFixed(2)} × {geometry.wireThickness.toFixed(2)} mm</span>
            <span className="text-muted-foreground">{isZh ? "总圈数" : "Total Coils"}:</span>
            <span className="font-mono">{geometry.totalCoils}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{isZh ? "3D预览" : "3D Preview"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] rounded-md border bg-white overflow-hidden">
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
              <DieSpringVisualizer
                outerDiameter={geometry.outerDiameter}
                wireThickness={geometry.wireThickness}
                wireWidth={geometry.wireWidth}
                coils={geometry.totalCoils}
                freeLength={geometry.freeLength}
                duty={dutyCode}
                risk={0.5}
                autoRotate={true}
                backgroundColor="#ffffff"
              />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadDeflectionTab({ geometry, springRate, isZh }: { geometry: DieSpringGeometry; springRate: number; isZh: boolean }) {
  const curveData = useMemo(
    () => generateLoadDeflectionCurve(geometry, springRate, 25),
    [geometry, springRate]
  );

  const workingDeflection = geometry.freeLength - geometry.workingLength;
  const workingLoad = springRate * workingDeflection;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isZh ? "载荷–变形曲线" : "Load–Deflection Curve"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="deflection_mm"
                label={{ value: isZh ? "变形量 (mm)" : "Deflection (mm)", position: "insideBottom", offset: -10 }}
              />
              <YAxis
                label={{ value: isZh ? "载荷 (N)" : "Load (N)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                formatter={(value: number) => [value.toFixed(1), isZh ? "载荷 (N)" : "Load (N)"]}
                labelFormatter={(label: number) => `${isZh ? "变形量" : "Deflection"}: ${label.toFixed(2)} mm`}
              />
              <Line type="monotone" dataKey="load_N" stroke="#2563eb" strokeWidth={2} dot={false} />
              <ReferenceLine x={workingDeflection} stroke="#dc2626" strokeDasharray="5 5" label={isZh ? "工作点" : "Working"} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 rounded bg-muted/50">
            <div className="text-muted-foreground">{isZh ? "刚度 k" : "Spring Rate k"}</div>
            <div className="font-mono text-lg">{springRate.toFixed(3)} N/mm</div>
          </div>
          <div className="text-center p-3 rounded bg-muted/50">
            <div className="text-muted-foreground">{isZh ? "工作变形量" : "Working Deflection"}</div>
            <div className="font-mono text-lg">{workingDeflection.toFixed(2)} mm</div>
          </div>
          <div className="text-center p-3 rounded bg-muted/50">
            <div className="text-muted-foreground">{isZh ? "工作载荷" : "Load @ Working"}</div>
            <div className="font-mono text-lg">{workingLoad.toFixed(1)} N</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StressTab({ geometry, load, isZh }: { geometry: DieSpringGeometry; load: number; isZh: boolean }) {
  const stressAnalysis = useMemo(
    () => computeDieSpringStress(geometry, load),
    [geometry, load]
  );

  const stressStatus = stressAnalysis.stressRatio < 0.7 ? "OK" : stressAnalysis.stressRatio < 0.85 ? "WARNING" : "DANGER";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isZh ? "应力分析（矩形线材）" : "Stress Analysis (Rectangular Wire)"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={stressStatus === "OK" ? "default" : stressStatus === "WARNING" ? "default" : "destructive"}>
          <AlertTitle>{isZh ? "应力比" : "Stress Ratio"}: {(stressAnalysis.stressRatio * 100).toFixed(1)}%</AlertTitle>
          <AlertDescription>
            {stressStatus === "OK" && (isZh ? "应力水平在安全范围内。" : "Stress level is within safe limits.")}
            {stressStatus === "WARNING" && (isZh ? "应力较高。建议减小载荷或增大线材尺寸。" : "Stress is elevated. Consider reducing load or increasing wire size.")}
            {stressStatus === "DANGER" && (isZh ? "应力超过推荐限值。需要重新设计。" : "Stress exceeds recommended limits. Redesign required.")}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "最大应力 σ" : "Max Stress σ"}</div>
            <div className="font-mono text-lg">{stressAnalysis.stress_MPa.toFixed(1)} MPa</div>
          </div>
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "b/t 比值" : "b/t Ratio"}</div>
            <div className="font-mono text-lg">{stressAnalysis.btRatio.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "弹簧指数 C" : "Spring Index C"}</div>
            <div className="font-mono text-lg">{stressAnalysis.springIndex.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "等效线径 d_eq" : "Equiv. Wire d_eq"}</div>
            <div className="font-mono text-lg">{stressAnalysis.equivalentWireDiameter_mm.toFixed(3)} mm</div>
          </div>
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "β 系数" : "β Factor"}</div>
            <div className="font-mono text-lg">{stressAnalysis.betaFactor.toFixed(1)}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-4">
          <p><strong>{isZh ? "公式" : "Formula"}:</strong> σ = (P × D) / (b × t × √(b×t)) × β</p>
          <p>{isZh ? "其中" : "where"} β = {stressAnalysis.betaFactor} ({isZh ? "矩形线材保守系数" : "conservative factor for rectangular wire"})</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CycleLifeTab({ geometry, isZh }: { geometry: DieSpringGeometry; isZh: boolean }) {
  const dutyCode = geometry.dutyColor ? DUTY_COLOR_TO_CODE[geometry.dutyColor] : "MD";
  const cycleLife = useMemo(() => estimateCycleLife(geometry, dutyCode), [geometry, dutyCode]);

  const barColor = cycleLife.lifeCategory === "HIGH" ? "bg-green-500" : cycleLife.lifeCategory === "MEDIUM" ? "bg-yellow-500" : "bg-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isZh ? "循环寿命估算" : "Cycle Life Estimation"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-1">{isZh ? "变形利用率" : "Deflection Utilization"}</div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all`}
                style={{ width: `${Math.min(cycleLife.utilizationPercent, 100)}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold">{cycleLife.utilizationPercent.toFixed(0)}%</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "压缩比" : "Deflection Ratio"}</div>
            <div className="font-mono">{(cycleLife.deflectionRatio * 100).toFixed(1)}%</div>
          </div>
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? `最大允许 (${dutyCode})` : `Max Allowed (${dutyCode})`}</div>
            <div className="font-mono">{(cycleLife.maxAllowedRatio * 100).toFixed(0)}%</div>
          </div>
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "寿命等级" : "Life Category"}</div>
            <div className="font-semibold">{cycleLife.lifeCategory}</div>
          </div>
          <div className="p-3 rounded bg-muted/50 text-center">
            <div className="text-xs text-muted-foreground">{isZh ? "预估循环次数" : "Est. Cycles"}</div>
            <div className="font-mono text-sm">{cycleLife.estimatedCycles}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GuideTab({ geometry, isZh }: { geometry: DieSpringGeometry; isZh: boolean }) {
  const clearance = useMemo(() => analyzeGuideClearance(geometry), [geometry]);

  const holeIcon = clearance.holeStatus === "OK" ? <CheckCircle className="h-4 w-4 text-green-500" /> : clearance.holeStatus === "TIGHT" ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
  const rodIcon = clearance.rodStatus === "OK" ? <CheckCircle className="h-4 w-4 text-green-500" /> : clearance.rodStatus === "TIGHT" ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <XCircle className="h-4 w-4 text-red-500" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isZh ? "导向与间隙分析" : "Guide & Clearance Analysis"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>{clearance.recommendation}</AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              {holeIcon} {isZh ? "孔间隙 (外径 → 孔)" : "Hole Clearance (OD → Hole)"}
            </div>
            <div className="text-sm text-muted-foreground">
              {geometry.holeDiameter ? (
                <>
                  <p>{isZh ? "孔径" : "Hole Dia"}: {geometry.holeDiameter.toFixed(2)} mm</p>
                  <p>{isZh ? "弹簧外径" : "Spring OD"}: {geometry.outerDiameter.toFixed(2)} mm</p>
                  <p className="font-mono">{isZh ? "间隙" : "Clearance"}: {clearance.holeClearance_mm?.toFixed(2) ?? "—"} mm</p>
                  <p>{isZh ? "推荐" : "Recommended"}: ≥ 1.0 mm</p>
                </>
              ) : (
                <p>{isZh ? "未指定孔径。" : "No hole diameter specified."}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              {rodIcon} {isZh ? "轴间隙 (内径 → 轴)" : "Rod Clearance (ID → Rod)"}
            </div>
            <div className="text-sm text-muted-foreground">
              {geometry.rodDiameter ? (
                <>
                  <p>{isZh ? "弹簧内径" : "Spring ID"}: {(geometry.innerDiameter ?? geometry.outerDiameter - 2 * geometry.wireWidth).toFixed(2)} mm</p>
                  <p>{isZh ? "轴径" : "Rod Dia"}: {geometry.rodDiameter.toFixed(2)} mm</p>
                  <p className="font-mono">{isZh ? "间隙" : "Clearance"}: {clearance.rodClearance_mm?.toFixed(2) ?? "—"} mm</p>
                  <p>{isZh ? "推荐" : "Recommended"}: ≥ 0.8 mm</p>
                </>
              ) : (
                <p>{isZh ? "未指定轴径。" : "No rod diameter specified."}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemperatureTab({ geometry, isZh }: { geometry: DieSpringGeometry; isZh: boolean }) {
  const temperatures = [20, 80, 100, 120, 150, 180, 200, 220, 250];
  const material: DieSpringMaterialType = "CHROME_ALLOY";

  const tempData = temperatures.map((t) => ({
    temp: t,
    loss: t <= 20 ? 0 : getTemperatureLoadLoss(material, t),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isZh ? "温度载荷损失" : "Temperature Load Loss"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tempData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="temp" label={{ value: isZh ? "温度 (°C)" : "Temperature (°C)", position: "insideBottom", offset: -10 }} />
              <YAxis label={{ value: isZh ? "载荷损失 (%)" : "Load Loss (%)", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, isZh ? "载荷损失" : "Load Loss"]} />
              <Line type="monotone" dataKey="loss" stroke="#dc2626" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>{isZh ? "材料：铬合金钢（默认）" : "Material: Chrome Alloy Steel (default)"}</p>
          <p>{isZh ? "在高温环境下，模具弹簧会发生载荷松弛。请在高温应用中考虑降额载荷。" : "At elevated temperatures, die springs experience load relaxation. Plan for derated loads in high-temperature applications."}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaTab({ geometry, isZh }: { geometry: DieSpringGeometry; isZh: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{isZh ? "FEA验证" : "FEA Validation"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>{isZh ? "FEA集成（即将推出）" : "FEA Integration (Coming Soon)"}</AlertTitle>
          <AlertDescription>
            {isZh 
              ? "此选项卡将连接到 CalculiX FEA 后端，通过有限元分析验证解析结果。计划功能："
              : "This tab will connect to the CalculiX FEA backend to validate analytical results against finite element analysis. Features planned:"}
          </AlertDescription>
        </Alert>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
          <li>{isZh ? "矩形线材螺旋网格生成" : "Mesh generation for rectangular wire helix"}</li>
          <li>{isZh ? "载荷工况：轴向压缩至工作长度" : "Load case: axial compression to working length"}</li>
          <li>{isZh ? "比较 FEA 刚度与解析 k 值" : "Compare FEA spring rate vs. analytical k"}</li>
          <li>{isZh ? "应力分布可视化" : "Stress distribution visualization"}</li>
          <li>{isZh ? "细长弹簧屈曲模态分析" : "Buckling mode analysis for slender springs"}</li>
        </ul>
      </CardContent>
    </Card>
  );
}
