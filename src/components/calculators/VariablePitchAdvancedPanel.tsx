/**
 * Variable Pitch Compression Spring Advanced Analysis Panel
 * 变节距压缩弹簧高级分析面板
 * 
 * Displays P1/P2/P3 advanced analysis results:
 * - Manufacturability check
 * - Fatigue life prediction
 * - Design scoring
 * - Buckling risk assessment
 * - Vibration analysis
 * - Temperature effects
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowDownUp,
} from "lucide-react";
import {
  checkVPManufacturability,
  calculateVPFatigueLife,
  calculateVPDesignScore,
  calculateVPBuckling,
  calculateVPVibration,
  calculateVPTemperatureEffects,
  calculateVPCreep,
  type VPManufacturabilityResult,
  type VPFatigueLifeResult,
  type VPDesignScore,
  type VPBucklingResult,
  type VPVibrationResult,
  type VPTemperatureResult,
  type VPCreepResult,
} from "@/lib/variablePitch/advanced";
import type { VariablePitchSegment } from "@/lib/springMath";

interface VariablePitchAdvancedPanelProps {
  isZh?: boolean;
  wireDiameter: number;
  meanDiameter: number;
  shearModulus: number;
  activeCoils: number;
  freeLength?: number;
  segments: VariablePitchSegment[];
  currentDeflection: number;
  currentLoad: number;
  currentSpringRate: number;
  currentShearStress: number;
  allowableShearStress: number;
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

export function VariablePitchAdvancedPanel({
  isZh = false,
  wireDiameter,
  meanDiameter,
  shearModulus,
  activeCoils,
  freeLength,
  segments,
  currentDeflection,
  currentLoad,
  currentSpringRate,
  currentShearStress,
  allowableShearStress,
}: VariablePitchAdvancedPanelProps) {
  // User inputs for advanced analysis
  const [temperature, setTemperature] = useState(20);
  const [operatingFrequency, setOperatingFrequency] = useState(0);
  const [duration, setDuration] = useState(1000);
  const [endCondition, setEndCondition] = useState<"fixed-fixed" | "fixed-free" | "fixed-guided" | "free-free">("fixed-guided");

  // P1: Manufacturability
  const manufacturability = useMemo<VPManufacturabilityResult>(() => {
    return checkVPManufacturability({
      wireDiameter,
      meanDiameter,
      activeCoils,
      segments,
    });
  }, [wireDiameter, meanDiameter, activeCoils, segments]);

  // P1: Fatigue Life
  const fatigueLife = useMemo<VPFatigueLifeResult>(() => {
    return calculateVPFatigueLife({
      tauMax_MPa: currentShearStress,
      tauMin_MPa: 0,
    });
  }, [currentShearStress]);

  // Static safety factor
  const staticSF = useMemo(() => {
    return currentShearStress > 0 ? allowableShearStress / currentShearStress : Infinity;
  }, [currentShearStress, allowableShearStress]);

  // P2: Buckling
  const buckling = useMemo<VPBucklingResult>(() => {
    return calculateVPBuckling({
      wireDiameter_mm: wireDiameter,
      meanDiameter_mm: meanDiameter,
      freeLength_mm: freeLength ?? 50,
      deflection_mm: currentDeflection,
      currentLoad_N: currentLoad,
      shearModulus_MPa: shearModulus,
      endCondition,
    });
  }, [wireDiameter, meanDiameter, freeLength, currentDeflection, currentLoad, shearModulus, endCondition]);

  // P1: Design Score
  const designScore = useMemo<VPDesignScore>(() => {
    return calculateVPDesignScore({
      manufacturability,
      fatigueLife,
      staticSF: isFinite(staticSF) ? staticSF : 0,
      fatigueSF: fatigueLife.goodmanFoS,
      springIndex: meanDiameter / wireDiameter,
      slendernessRatio: buckling.slendernessRatio,
      bucklingRisk: buckling.bucklingRisk,
    });
  }, [manufacturability, fatigueLife, staticSF, meanDiameter, wireDiameter, buckling]);

  // P2: Vibration
  const vibration = useMemo<VPVibrationResult>(() => {
    return calculateVPVibration({
      springRate_Nmm: currentSpringRate,
      wireDiameter_mm: wireDiameter,
      meanDiameter_mm: meanDiameter,
      activeCoils,
      operatingFrequency_Hz: operatingFrequency > 0 ? operatingFrequency : undefined,
    });
  }, [currentSpringRate, wireDiameter, meanDiameter, activeCoils, operatingFrequency]);

  // P2: Temperature
  const temperatureEffects = useMemo<VPTemperatureResult>(() => {
    return calculateVPTemperatureEffects({
      temperature_C: temperature,
      G0_MPa: shearModulus,
      k0_Nmm: currentSpringRate,
    });
  }, [temperature, shearModulus, currentSpringRate]);

  // P3: Creep
  const creep = useMemo<VPCreepResult>(() => {
    const stressRatio = allowableShearStress > 0 ? currentShearStress / allowableShearStress : 0.5;
    return calculateVPCreep({
      initialLoad_N: currentLoad,
      temperature_C: temperature,
      duration_hours: duration,
      stressRatio: Math.min(1, stressRatio),
    });
  }, [currentLoad, temperature, duration, currentShearStress, allowableShearStress]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {isZh ? "变节距弹簧高级分析" : "Variable Pitch Advanced Analysis"}
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
            <TabsTrigger value="buckling" className="text-xs">
              <ArrowDownUp className="w-3 h-3 mr-1" />
              {isZh ? "屈曲" : "Buckling"}
            </TabsTrigger>
            <TabsTrigger value="vibration" className="text-xs">
              <Waves className="w-3 h-3 mr-1" />
              {isZh ? "振动" : "Vibration"}
            </TabsTrigger>
            <TabsTrigger value="temperature" className="text-xs">
              <Thermometer className="w-3 h-3 mr-1" />
              {isZh ? "温度" : "Temp"}
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
                <div className="text-xs text-muted-foreground">{isZh ? "最小节距" : "Min Pitch"}</div>
                <div className="font-mono">{manufacturability.minPitch.toFixed(2)} mm</div>
              </div>
              <div className="p-2 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground">{isZh ? "最大节距" : "Max Pitch"}</div>
                <div className="font-mono">{manufacturability.maxPitch.toFixed(2)} mm</div>
              </div>
              <div className="p-2 border rounded-lg text-center">
                <div className="text-xs text-muted-foreground">{isZh ? "节距比" : "Pitch Ratio"}</div>
                <div className="font-mono">{manufacturability.pitchRatio.toFixed(2)}</div>
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

          {/* P2: Buckling Tab */}
          <TabsContent value="buckling" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <RiskBadge risk={buckling.bucklingRisk} />
              <span className="font-medium">
                SF = {isFinite(buckling.safetyFactor) ? buckling.safetyFactor.toFixed(2) : "∞"}
              </span>
            </div>

            <div className="mb-4">
              <Label>{isZh ? "端部条件" : "End Condition"}</Label>
              <Select value={endCondition} onValueChange={(v) => setEndCondition(v as typeof endCondition)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed-fixed">Fixed-Fixed</SelectItem>
                  <SelectItem value="fixed-guided">Fixed-Guided</SelectItem>
                  <SelectItem value="fixed-free">Fixed-Free</SelectItem>
                  <SelectItem value="free-free">Free-Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "细长比 λ" : "Slenderness Ratio λ"}
                </Label>
                <p className="text-lg font-mono">{buckling.slendernessRatio.toFixed(2)}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "临界载荷" : "Critical Load"}
                </Label>
                <p className="text-lg font-mono">{buckling.criticalLoad_N.toFixed(1)} N</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "有效长度" : "Effective Length"}
                </Label>
                <p className="text-lg font-mono">{buckling.effectiveLength_mm.toFixed(1)} mm</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "端部系数 K" : "End Factor K"}
                </Label>
                <p className="text-lg font-mono">{buckling.endConditionFactor.toFixed(3)}</p>
              </div>
            </div>

            {buckling.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {isZh ? "建议" : "Recommendations"}
                  </span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {(isZh ? buckling.recommendationsZh : buckling.recommendations).map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
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
              <Label>{isZh ? "工作频率 (Hz)" : "Operating Frequency (Hz)"}</Label>
              <Input
                type="number"
                value={operatingFrequency}
                onChange={(e) => setOperatingFrequency(parseFloat(e.target.value) || 0)}
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
                  {isZh ? "涌动频率" : "Surging Frequency"}
                </Label>
                <p className="text-lg font-mono">{vibration.surgingFrequency_Hz.toFixed(1)} Hz</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "有效质量" : "Effective Mass"}
                </Label>
                <p className="text-lg font-mono">
                  {(vibration.effectiveMass_kg * 1000).toFixed(2)} g
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
                  {isZh ? "调整后 k" : "Adjusted k"}
                </Label>
                <p className="text-lg font-mono">
                  {temperatureEffects.k_adjusted_Nmm.toFixed(2)} N/mm
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
                  {isZh ? "载荷损失" : "Load Loss"}
                </Label>
                <p className="text-lg font-mono">{creep.loadLoss_percent.toFixed(2)}%</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "最终载荷" : "Final Load"}
                </Label>
                <p className="text-lg font-mono">{creep.finalLoad_N.toFixed(1)} N</p>
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

export default VariablePitchAdvancedPanel;
