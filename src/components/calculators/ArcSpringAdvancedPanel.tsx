/**
 * Arc Spring Advanced Analysis Panel
 * 弧形弹簧高级分析面板
 * 
 * Displays P1/P2/P3 advanced analysis results:
 * - Manufacturability check
 * - Fatigue life prediction
 * - Design scoring
 * - Vibration analysis
 * - Temperature effects
 * - Centrifugal force effects (DMF)
 * - Creep/relaxation
 */

"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Factory,
  Activity,
  Thermometer,
  Clock,
  Waves,
  TrendingDown,
  Gauge,
  RotateCw,
} from "lucide-react";
import {
  checkArcManufacturability,
  calculateArcFatigueLife,
  calculateArcDesignScore,
  calculateArcVibration,
  calculateArcTemperatureEffects,
  calculateArcCentrifugalEffects,
  calculateArcCreep,
  type ArcManufacturabilityResult,
  type ArcFatigueLifeResult,
  type ArcDesignScore,
  type ArcVibrationResult,
  type ArcTemperatureResult,
  type ArcCentrifugalResult,
  type ArcCreepResult,
} from "@/lib/arcSpring/advanced";
import type { ArcSpringInput, ArcSpringResult } from "@/lib/arcSpring/types";

interface ArcSpringAdvancedPanelProps {
  isZh?: boolean;
  input: ArcSpringInput;
  result: ArcSpringResult;
  allowableTau?: number;
  packGroups?: any[]; // Integrating new platform pack groups
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "major":
      return <Badge className="bg-orange-500">Major</Badge>;
    case "minor":
      return <Badge className="bg-yellow-500 text-black">Minor</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
}

function RatingBadge({ rating }: { rating: string }) {
  switch (rating) {
    case "infinite":
      return <Badge className="bg-green-600">∞ Infinite</Badge>;
    case "high":
      return <Badge className="bg-green-500">High</Badge>;
    case "medium":
      return <Badge className="bg-yellow-500 text-black">Medium</Badge>;
    case "low":
      return <Badge className="bg-orange-500">Low</Badge>;
    case "very_low":
      return <Badge variant="destructive">Very Low</Badge>;
    default:
      return <Badge variant="secondary">{rating}</Badge>;
  }
}

function RiskBadge({ risk }: { risk: string }) {
  switch (risk) {
    case "safe":
      return <Badge className="bg-green-600">Safe</Badge>;
    case "warning":
      return <Badge className="bg-yellow-500 text-black">Warning</Badge>;
    case "danger":
      return <Badge variant="destructive">Danger</Badge>;
    default:
      return <Badge variant="secondary">{risk}</Badge>;
  }
}

function ScoreBadge({ rating }: { rating: string }) {
  switch (rating) {
    case "excellent":
      return <Badge className="bg-green-600">Excellent</Badge>;
    case "good":
      return <Badge className="bg-green-500">Good</Badge>;
    case "acceptable":
      return <Badge className="bg-yellow-500 text-black">Acceptable</Badge>;
    case "marginal":
      return <Badge className="bg-orange-500">Marginal</Badge>;
    case "poor":
      return <Badge variant="destructive">Poor</Badge>;
    default:
      return <Badge variant="secondary">{rating}</Badge>;
  }
}

function SpringBreakdownTable({ 
  input, 
  result, 
  isZh,
  allowableTau,
  packGroups 
}: { 
  input: ArcSpringInput; 
  result: ArcSpringResult; 
  isZh: boolean;
  allowableTau: number;
  packGroups?: any[];
}) {
  // Check if we are using the new Pack Group system
  if (packGroups && packGroups.length > 0) {
      // New Platform Mode (Pack Groups)
      return (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">{isZh ? "分组" : "Group"}</th>
                <th className="p-2 font-medium">{isZh ? "数量" : "Count"}</th>
                <th className="p-2 font-medium">Stage 1 (Nmm/°)</th>
                <th className="p-2 font-medium">Stage 2</th>
                <th className="p-2 font-medium">Stage 3</th>
                <th className="p-2 font-medium">{isZh ? "拐点" : "Breaks"} (°)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {packGroups.map((group, idx) => (
                <tr key={idx}>
                    <td className="p-2 font-bold">
                        <Badge variant="outline" className="mr-2">{idx + 1}</Badge>
                        {group.name || `Pack ${idx + 1}`}
                    </td>
                    <td className="p-2 font-mono">{group.count}</td>
                    <td className="p-2 font-mono">{group.kStages[0]?.toFixed(2)}</td>
                    <td className="p-2 font-mono">{group.kStages[1]?.toFixed(2)}</td>
                    <td className="p-2 font-mono">{group.kStages[2]?.toFixed(2)}</td>
                    <td className="p-2 font-mono text-muted-foreground">
                        {group.phiBreaksDeg?.map((b: number) => b.toFixed(1)).join(" / ")}
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-2 bg-slate-50 text-[10px] text-muted-foreground border-t">
             {isZh ? "* 多级刚度由各分组叠加而成" : "* Multi-stage stiffness is a sum of all active packs based on angle."}
          </div>
        </div>
      );
  }

  // Legacy Mode (S1/S2)
  const isDual = input.systemMode === "dual_parallel" || input.systemMode === "dual_staged";
  const s2 = input.spring2;
  const s2Res = result.spring2Result;

  // Helpers
  const getSF = (tau: number) => (tau > 0 ? allowableTau / tau : NaN);
  const fmt = (n: number | undefined, d = 2) => (n !== undefined && isFinite(n) ? n.toFixed(d) : "—");
  
  const s1SF = getSF(result.tauMax);
  const s2SF = s2Res ? getSF(s2Res.tauMax) : NaN;

  const StatusIcon = ({ sf }: { sf: number }) => {
     if (!isFinite(sf)) return <span className="text-muted-foreground">-</span>;
     if (sf >= 1.2) return <CheckCircle className="w-3 h-3 text-green-600" />;
     if (sf >= 1.0) return <AlertTriangle className="w-3 h-3 text-amber-600" />;
     return <XCircle className="w-3 h-3 text-red-600" />;
  };

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-xs text-left">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="p-2 font-medium">Spring</th>
            <th className="p-2 font-medium">d (mm)</th>
            <th className="p-2 font-medium">D (mm)</th>
            <th className="p-2 font-medium">n</th>
            <th className="p-2 font-medium">k (N/mm)</th>
            <th className="p-2 font-medium">R (Nmm/°)</th>
            <th className="p-2 font-medium">τ Max (MPa)</th>
            <th className="p-2 font-medium">SF (Yield)</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {/* Spring 1 */}
          <tr>
            <td className="p-2 font-bold flex items-center gap-2">
               <Badge variant="outline" className="h-5 px-1">S1</Badge>
               {isZh ? "外弹簧" : "Outer"}
            </td>
            <td className="p-2 font-mono">{input.d}</td>
            <td className="p-2 font-mono">{input.D}</td>
            <td className="p-2 font-mono">{input.n}</td>
            <td className="p-2 font-mono">{fmt(result.k, 1)}</td>
            <td className="p-2 font-mono">{fmt(input.systemMode === 'dual_parallel' ? ((result.R_deg - (s2Res?.R_deg ?? 0))) : result.R_deg, 1)}</td>
            <td className="p-2 font-mono">{fmt(result.tauMax, 0)}</td>
            <td className="p-2 font-mono flex items-center gap-1">
               <StatusIcon sf={s1SF} />
               {fmt(s1SF)}
            </td>
          </tr>
          
          {/* Spring 2 */}
          {isDual && s2 && s2Res && (
            <tr>
              <td className="p-2 font-bold flex items-center gap-2">
                 <Badge variant="outline" className="h-5 px-1">S2</Badge>
                 {isZh ? "内弹簧" : "Inner"}
              </td>
              <td className="p-2 font-mono">{s2.d ?? input.d}</td>
              <td className="p-2 font-mono">{s2.D ?? input.D}</td>
              <td className="p-2 font-mono">{s2.n ?? input.n}</td>
              <td className="p-2 font-mono">{fmt(s2Res.k, 1)}</td>
              <td className="p-2 font-mono">{fmt(s2Res.R_deg, 1)}</td>
              <td className="p-2 font-mono">{fmt(s2Res.tauMax, 0)}</td>
              <td className="p-2 font-mono flex items-center gap-1">
                 <StatusIcon sf={s2SF} />
                 {fmt(s2SF)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {input.systemMode === "dual_staged" && (
         <div className="p-2 bg-slate-50 text-[10px] text-muted-foreground border-t">
            {isZh 
              ? `* 分段刚度：初始刚度 ${fmt(result.R_deg, 1)} Nmm/°，拐点 ${input.engageAngle2 ?? 0}° 后叠加 S2`
              : `* Staged Stiffness: Initial ${fmt(result.R_deg, 1)} Nmm/deg. S2 adds on after ${input.engageAngle2 ?? 0}deg.`
            }
         </div>
      )}
    </div>
  );
}
export function ArcSpringAdvancedPanel({
  isZh = false,
  input,
  result,
  allowableTau = 800,
  packGroups,
}: ArcSpringAdvancedPanelProps) {
  // User inputs for advanced analysis
  const [temperature, setTemperature] = useState(20);
  const [operatingRpm, setOperatingRpm] = useState(0);
  const [duration, setDuration] = useState(1000);
  const [frictionCoeff, setFrictionCoeff] = useState(0.15);

  // P1: Manufacturability
  const manufacturability = useMemo<ArcManufacturabilityResult>(() => {
    return checkArcManufacturability(input);
  }, [input]);

  // P1: Fatigue Life
  const fatigueLife = useMemo<ArcFatigueLifeResult>(() => {
    return calculateArcFatigueLife({
      tauMax_MPa: result.tauMax,
      tauMin_MPa: 0,
      materialKey: input.materialKey,
    });
  }, [result.tauMax, input.materialKey]);

  // Static safety factor
  const staticSF = useMemo(() => {
    return isFinite(result.tauMax) && result.tauMax > 0 ? allowableTau / result.tauMax : NaN;
  }, [result.tauMax, allowableTau]);

  // P1: Design Score
  const designScore = useMemo<ArcDesignScore>(() => {
    return calculateArcDesignScore({
      manufacturability,
      fatigueLife,
      staticSF: isFinite(staticSF) ? staticSF : 0,
      fatigueSF: fatigueLife.goodmanFoS,
      springIndex: result.springIndex,
    });
  }, [manufacturability, fatigueLife, staticSF, result.springIndex]);

  // P2: Vibration
  const vibration = useMemo<ArcVibrationResult>(() => {
    return calculateArcVibration({
      R_NmmPerDeg: result.R_deg,
      d_mm: input.d,
      D_mm: input.D,
      n: input.n,
      r_mm: input.r,
      alpha0_deg: input.alpha0,
      operatingRpm: operatingRpm > 0 ? operatingRpm : undefined,
    });
  }, [result.R_deg, input, operatingRpm]);

  // P2: Temperature
  const temperatureEffects = useMemo<ArcTemperatureResult>(() => {
    const G = 80000; // Default shear modulus
    return calculateArcTemperatureEffects({
      temperature_C: temperature,
      G0_MPa: G,
      k0_Nmm: result.k,
      R0_NmmPerDeg: result.R_deg,
    });
  }, [temperature, result.k, result.R_deg]);

  // P2: Centrifugal
  const centrifugal = useMemo<ArcCentrifugalResult>(() => {
    return calculateArcCentrifugalEffects({
      rpm: operatingRpm,
      r_mm: input.r,
      d_mm: input.d,
      D_mm: input.D,
      n: input.n,
      alpha0_deg: input.alpha0,
      frictionCoeff,
      baseFrictionTorque_Nmm: input.Tf_const ?? 0,
    });
  }, [operatingRpm, input, frictionCoeff]);

  // P3: Creep
  const creep = useMemo<ArcCreepResult>(() => {
    const stressRatio = allowableTau > 0 ? result.tauMax / allowableTau : 0.5;
    return calculateArcCreep({
      initialTorque_Nmm: result.MMax_load,
      temperature_C: temperature,
      duration_hours: duration,
      stressRatio: Math.min(1, stressRatio),
    });
  }, [result.MMax_load, temperature, duration, result.tauMax, allowableTau]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {isZh ? "弧形弹簧高级分析" : "Arc Spring Advanced Analysis"}
          <Badge
            className={
              designScore.overallScore >= 80
                ? "bg-green-600"
                : designScore.overallScore >= 60
                ? "bg-yellow-500 text-black"
                : "bg-red-600"
            }
          >
            {isZh ? "评分" : "Score"}: {designScore.overallScore}/100
          </Badge>
          <ScoreBadge rating={designScore.rating} />
          {/* Governing Badge for Dual Systems */}
          {(input.systemMode === "dual_parallel" || input.systemMode === "dual_staged") && (
             <Badge variant="outline" className="ml-auto border-blue-200 bg-blue-50 text-blue-700">
                {isZh ? "控制弹簧: " : "Governing: "}
                { result.governingSpring === 2 ? "S2 (Inner)" : "S1 (Outer)" }
             </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="score">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="score" className="text-xs">
              <Gauge className="w-3 h-3 mr-1" />
              {isZh ? "评分" : "Score"}
            </TabsTrigger>
            <TabsTrigger value="manufacturability" className="text-xs">
              <Factory className="w-3 h-3 mr-1" />
              {isZh ? "制造" : "Mfg"}
            </TabsTrigger>
            <TabsTrigger value="fatigue" className="text-xs">
              <TrendingDown className="w-3 h-3 mr-1" />
              {isZh ? "疲劳" : "Fatigue"}
            </TabsTrigger>
            <TabsTrigger value="vibration" className="text-xs">
              <Waves className="w-3 h-3 mr-1" />
              {isZh ? "振动" : "Vibration"}
            </TabsTrigger>
            <TabsTrigger value="temperature" className="text-xs">
              <Thermometer className="w-3 h-3 mr-1" />
              {isZh ? "温度" : "Temp"}
            </TabsTrigger>
            <TabsTrigger value="centrifugal" className="text-xs">
              <RotateCw className="w-3 h-3 mr-1" />
              {isZh ? "离心" : "RPM"}
            </TabsTrigger>
            <TabsTrigger value="creep" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {isZh ? "蠕变" : "Creep"}
            </TabsTrigger>
          </TabsList>

          {/* P1: Score Tab */}
          <TabsContent value="score" className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold">{designScore.overallScore}</div>
              <div>
                <div className="text-lg font-medium">
                  {isZh ? designScore.ratingZh : designScore.rating.toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isZh ? "综合设计评分" : "Overall Design Score"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {designScore.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-muted-foreground">
                    {isZh ? item.categoryZh : item.category}
                  </div>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        item.score / item.maxScore >= 0.8
                          ? "bg-green-500"
                          : item.score / item.maxScore >= 0.6
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-sm font-mono">
                    {item.score}/{item.maxScore}
                  </div>
                  <div className="w-24 text-xs text-muted-foreground">{item.notes}</div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* P1: Manufacturability Tab */}
          <TabsContent value="manufacturability" className="space-y-4">
            
            {/* Engineer Breakdown Table */}
            <SpringBreakdownTable 
                input={input} 
                result={result} 
                isZh={isZh} 
                allowableTau={allowableTau} 
                packGroups={packGroups}
            />

            <div className="flex items-center gap-2 mb-4">
              {manufacturability.isManufacturable ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">
                {manufacturability.isManufacturable
                  ? isZh
                    ? "可制造"
                    : "Manufacturable"
                  : isZh
                  ? "不可制造"
                  : "Not Manufacturable"}
              </span>
              <Badge variant="outline">
                {isZh ? "难度" : "Difficulty"}: {manufacturability.difficultyScore}/100
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {isZh ? manufacturability.summaryZh : manufacturability.summary}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground">{isZh ? "线长" : "Wire Length"}</div>
                <div className="font-mono">{manufacturability.wireLengthMm.toFixed(0)} mm</div>
              </div>
              <div className="p-2 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground">{isZh ? "自由匝距" : "Free Pitch"}</div>
                <div className="font-mono">{manufacturability.coilPitchFree.toFixed(2)} mm</div>
              </div>
              <div className="p-2 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground">{isZh ? "工作匝距" : "Work Pitch"}</div>
                <div className="font-mono">{manufacturability.coilPitchWork.toFixed(2)} mm</div>
              </div>
            </div>

            {manufacturability.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">{isZh ? "问题列表" : "Issues"}</h4>
                {manufacturability.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-lg bg-muted/50 flex items-start gap-3"
                  >
                    <SeverityBadge severity={issue.severity} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {isZh ? issue.descriptionZh : issue.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {issue.parameter}: {issue.currentValue} → {issue.requiredValue}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {isZh ? issue.suggestionZh : issue.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-1">
                {isZh ? "推荐工艺" : "Recommended Process"}
              </div>
              <div className="text-sm text-muted-foreground">
                {manufacturability.recommendedProcess}
              </div>
            </div>
          </TabsContent>

          {/* P1: Fatigue Tab */}
          <TabsContent value="fatigue" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <RatingBadge rating={fatigueLife.rating} />
              <span className="font-medium">
                {fatigueLife.estimatedCycles === Infinity
                  ? "∞"
                  : fatigueLife.estimatedCycles.toExponential(2)}{" "}
                {isZh ? "循环" : "cycles"}
              </span>
            </div>

            <p className="text-sm">
              {isZh ? fatigueLife.message.zh : fatigueLife.message.en}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "剪切应力幅值 τa" : "Shear Stress Amplitude τa"}
                </Label>
                <p className="text-lg font-mono">{fatigueLife.tauA.toFixed(1)} MPa</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "平均剪切应力 τm" : "Mean Shear Stress τm"}
                </Label>
                <p className="text-lg font-mono">{fatigueLife.tauM.toFixed(1)} MPa</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "Goodman 安全系数" : "Goodman FoS"}
                </Label>
                <p className="text-lg font-mono">
                  {fatigueLife.goodmanFoS?.toFixed(2) ?? "N/A"}
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "Gerber 安全系数" : "Gerber FoS"}
                </Label>
                <p className="text-lg font-mono">
                  {fatigueLife.gerberFoS?.toFixed(2) ?? "N/A"}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* P2: Vibration Tab */}
          <TabsContent value="vibration" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <RiskBadge risk={vibration.resonanceRisk} />
              <span className="font-medium">
                fn = {vibration.naturalFrequency_Hz.toFixed(2)} Hz (
                {vibration.naturalFrequency_rpm.toFixed(0)} rpm)
              </span>
            </div>

            <div className="mb-4">
              <Label>{isZh ? "工作转速 (rpm)" : "Operating Speed (rpm)"}</Label>
              <Input
                type="number"
                value={operatingRpm}
                onChange={(e) => setOperatingRpm(parseFloat(e.target.value) || 0)}
                className="w-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "固有频率" : "Natural Frequency"}
                </Label>
                <p className="text-lg font-mono">{vibration.naturalFrequency_Hz.toFixed(2)} Hz</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "临界转速" : "Critical Speed"}
                </Label>
                <p className="text-lg font-mono">{vibration.criticalSpeed_rpm.toFixed(0)} rpm</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "有效质量" : "Effective Mass"}
                </Label>
                <p className="text-lg font-mono">
                  {(vibration.effectiveMass_kg * 1000).toFixed(1)} g
                </p>
              </div>
              {vibration.operatingFrequencyRatio !== null && (
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">
                    {isZh ? "频率比 f/fn" : "Frequency Ratio f/fn"}
                  </Label>
                  <p className="text-lg font-mono">
                    {vibration.operatingFrequencyRatio.toFixed(3)}
                  </p>
                </div>
              )}
            </div>

            {vibration.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {isZh ? "建议" : "Recommendations"}
                  </span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {(isZh ? vibration.recommendationsZh : vibration.recommendations).map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* P2: Temperature Tab */}
          <TabsContent value="temperature" className="space-y-4">
            <div className="mb-4">
              <Label>{isZh ? "工作温度 (°C)" : "Operating Temperature (°C)"}</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[temperature]}
                  onValueChange={(v) => setTemperature(v[0])}
                  min={-40}
                  max={300}
                  step={5}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 20)}
                  className="w-20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "调整后 G" : "Adjusted G"}
                </Label>
                <p className="text-lg font-mono">
                  {(temperatureEffects.G_adjusted_MPa / 1000).toFixed(1)} GPa
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "调整后 R" : "Adjusted R"}
                </Label>
                <p className="text-lg font-mono">
                  {temperatureEffects.R_adjusted_NmmPerDeg.toFixed(2)} N·mm/°
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "温度系数" : "Temperature Factor"}
                </Label>
                <p className="text-lg font-mono">
                  {temperatureEffects.temperatureFactor.toFixed(3)}
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "刚度变化" : "Stiffness Change"}
                </Label>
                <p className="text-lg font-mono">
                  {temperatureEffects.stiffnessChange_percent.toFixed(1)}%
                </p>
              </div>
            </div>

            {temperatureEffects.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <ul className="text-sm text-orange-700 space-y-1">
                  {(isZh ? temperatureEffects.warningsZh : temperatureEffects.warnings).map((w, idx) => (
                    <li key={idx}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* P2: Centrifugal Tab */}
          <TabsContent value="centrifugal" className="space-y-4">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <Label>{isZh ? "工作转速 (rpm)" : "Operating Speed (rpm)"}</Label>
                <Input
                  type="number"
                  value={operatingRpm}
                  onChange={(e) => setOperatingRpm(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>{isZh ? "摩擦系数 μ" : "Friction Coefficient μ"}</Label>
                <Input
                  type="number"
                  value={frictionCoeff}
                  onChange={(e) => setFrictionCoeff(parseFloat(e.target.value) || 0.15)}
                  step={0.01}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "离心力" : "Centrifugal Force"}
                </Label>
                <p className="text-lg font-mono">{centrifugal.centrifugalForce_N.toFixed(2)} N</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "附加摩擦扭矩" : "Additional Friction Torque"}
                </Label>
                <p className="text-lg font-mono">
                  {centrifugal.additionalFrictionTorque_Nmm.toFixed(1)} N·mm
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "总摩擦扭矩" : "Total Friction Torque"}
                </Label>
                <p className="text-lg font-mono">
                  {centrifugal.totalFrictionTorque_Nmm.toFixed(1)} N·mm
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "摩擦增加" : "Friction Increase"}
                </Label>
                <p className="text-lg font-mono">
                  {centrifugal.frictionIncrease_percent.toFixed(1)}%
                </p>
              </div>
            </div>

            {centrifugal.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <ul className="text-sm text-yellow-700 space-y-1">
                  {(isZh ? centrifugal.warningsZh : centrifugal.warnings).map((w, idx) => (
                    <li key={idx}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* P3: Creep Tab */}
          <TabsContent value="creep" className="space-y-4">
            <div className="mb-4">
              <Label>{isZh ? "使用时长 (小时)" : "Duration (hours)"}</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[Math.log10(Math.max(1, duration))]}
                  onValueChange={(v) => setDuration(Math.pow(10, v[0]))}
                  min={0}
                  max={5}
                  step={0.1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value) || 1000)}
                  className="w-24"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "扭矩损失" : "Torque Loss"}
                </Label>
                <p className="text-lg font-mono">{creep.torqueLoss_percent.toFixed(2)}%</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "最终扭矩" : "Final Torque"}
                </Label>
                <p className="text-lg font-mono">{creep.finalTorque_Nmm.toFixed(0)} N·mm</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "蠕变速率" : "Creep Rate"}
                </Label>
                <p className="text-lg font-mono">
                  {creep.creepRate_percentPerHour.toExponential(2)} %/hr
                </p>
              </div>
              {creep.timeToRelax10Percent_hours && (
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">
                    {isZh ? "10%松弛时间" : "Time to 10% Relaxation"}
                  </Label>
                  <p className="text-lg font-mono">
                    {creep.timeToRelax10Percent_hours.toFixed(0)} hr
                  </p>
                </div>
              )}
            </div>

            {creep.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <ul className="text-sm text-yellow-700 space-y-1">
                  {(isZh ? creep.warningsZh : creep.warnings).map((w, idx) => (
                    <li key={idx}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ArcSpringAdvancedPanel;
