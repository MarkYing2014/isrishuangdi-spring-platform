/**
 * Spiral Torsion Spring Advanced Analysis Panel
 * 螺旋扭转弹簧高级分析面板
 * 
 * Displays P1/P2/P3 advanced analysis results:
 * - Manufacturability check
 * - Fatigue life prediction
 * - Vibration analysis
 * - Temperature effects
 * - Creep/relaxation
 * - Friction/hysteresis
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
} from "lucide-react";
import {
  checkSpiralManufacturability,
  calculateSpiralFatigueLife,
  calculateSpiralVibration,
  calculateSpiralTemperatureEffects,
  calculateSpiralCreep,
  calculateSpiralFriction,
  type SpiralManufacturabilityResult,
  type SpiralFatigueLifeResult,
  type SpiralVibrationResult,
  type SpiralTemperatureResult,
  type SpiralCreepResult,
  type SpiralFrictionResult,
} from "@/lib/spring3d/spiralSpringAdvanced";
import type { SpiralTorsionGeometry } from "@/lib/stores/springDesignStore";

interface SpiralAdvancedAnalysisPanelProps {
  isZh: boolean;
  geometry: SpiralTorsionGeometry;
  springRate: number;
  preloadTorque: number;
  maxTorque: number;
  sigmaMin: number;
  sigmaMax: number;
  Su?: number | null;
  Se?: number | null;
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

export function SpiralAdvancedAnalysisPanel({
  isZh,
  geometry,
  springRate,
  preloadTorque,
  maxTorque,
  sigmaMin,
  sigmaMax,
  Su,
  Se,
}: SpiralAdvancedAnalysisPanelProps) {
  // User inputs for advanced analysis
  const [temperature, setTemperature] = useState(20);
  const [operatingFrequency, setOperatingFrequency] = useState(0);
  const [duration, setDuration] = useState(1000);
  const [frictionCoeff, setFrictionCoeff] = useState(0.15);

  // P1: Manufacturability
  const manufacturability = useMemo<SpiralManufacturabilityResult>(() => {
    return checkSpiralManufacturability({
      stripWidth: geometry.stripWidth,
      stripThickness: geometry.stripThickness,
      activeLength: geometry.activeLength,
      innerDiameter: geometry.innerDiameter,
      outerDiameter: geometry.outerDiameter,
      activeCoils: geometry.activeCoils,
      materialId: geometry.spiralMaterialId,
      productionVolume: "medium",
    });
  }, [geometry]);

  // P1: Fatigue Life
  const fatigueLife = useMemo<SpiralFatigueLifeResult>(() => {
    return calculateSpiralFatigueLife({
      sigmaMin_MPa: sigmaMin,
      sigmaMax_MPa: sigmaMax,
      materialId: geometry.spiralMaterialId,
      Su_MPa: Su,
      Se_MPa: Se,
    });
  }, [sigmaMin, sigmaMax, geometry.spiralMaterialId, Su, Se]);

  // P2: Vibration
  const vibration = useMemo<SpiralVibrationResult>(() => {
    return calculateSpiralVibration({
      springRate_NmmPerDeg: springRate,
      stripWidth_mm: geometry.stripWidth,
      stripThickness_mm: geometry.stripThickness,
      activeLength_mm: geometry.activeLength,
      operatingFrequency_Hz: operatingFrequency > 0 ? operatingFrequency : undefined,
    });
  }, [springRate, geometry, operatingFrequency]);

  // P2: Temperature
  const temperatureEffects = useMemo<SpiralTemperatureResult>(() => {
    return calculateSpiralTemperatureEffects({
      temperature_C: temperature,
      E0_MPa: 205000, // Default for spring steel
      k0_NmmPerDeg: springRate,
      activeLength_mm: geometry.activeLength,
      Su0_MPa: Su,
      Se0_MPa: Se,
    });
  }, [temperature, springRate, geometry.activeLength, Su, Se]);

  // P3: Creep
  const creep = useMemo<SpiralCreepResult>(() => {
    const stressRatio = Su ? sigmaMax / (Su * 0.7) : 0.5;
    return calculateSpiralCreep({
      initialTorque_Nmm: maxTorque,
      temperature_C: temperature,
      duration_hours: duration,
      stressRatio: Math.min(1, stressRatio),
    });
  }, [maxTorque, temperature, duration, Su, sigmaMax]);

  // P3: Friction
  const friction = useMemo<SpiralFrictionResult>(() => {
    const maxAngle = springRate > 0 ? (maxTorque - preloadTorque) / springRate : 0;
    return calculateSpiralFriction({
      springRate_NmmPerDeg: springRate,
      preloadTorque_Nmm: preloadTorque,
      maxAngle_deg: maxAngle,
      frictionCoefficient: frictionCoeff,
      activeCoils: geometry.activeCoils,
      meanRadius_mm: (geometry.innerDiameter + geometry.outerDiameter) / 4,
    });
  }, [springRate, preloadTorque, maxTorque, frictionCoeff, geometry]);

  // Overall score calculation
  const overallScore = useMemo(() => {
    let score = 100;

    // Manufacturability penalty
    if (!manufacturability.isManufacturable) {
      score = Math.min(score, 40);
    }
    score -= manufacturability.criticalCount * 25;
    score -= manufacturability.majorCount * 10;
    score -= manufacturability.minorCount * 2;

    // Fatigue penalty
    if (fatigueLife.rating === "very_low") score -= 30;
    else if (fatigueLife.rating === "low") score -= 15;
    else if (fatigueLife.rating === "medium") score -= 5;

    // Vibration penalty
    if (vibration.resonanceRisk === "danger") score -= 20;
    else if (vibration.resonanceRisk === "warning") score -= 10;

    // Temperature penalty
    if (temperatureEffects.warnings.length > 0) {
      score -= temperatureEffects.warnings.length * 5;
    }

    // Creep penalty
    if (creep.torqueLoss_percent > 10) score -= 15;
    else if (creep.torqueLoss_percent > 5) score -= 5;

    return Math.max(0, Math.min(100, score));
  }, [manufacturability, fatigueLife, vibration, temperatureEffects, creep]);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          {isZh ? "螺旋弹簧高级分析" : "Spiral Spring Advanced Analysis"}
          <Badge
            className={
              overallScore >= 80
                ? "bg-green-600"
                : overallScore >= 60
                ? "bg-yellow-500 text-black"
                : "bg-red-600"
            }
          >
            {isZh ? "评分" : "Score"}: {overallScore}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manufacturability">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="manufacturability" className="text-xs">
              <Factory className="w-3 h-3 mr-1" />
              {isZh ? "可制造性" : "Mfg"}
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
            <TabsTrigger value="creep" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {isZh ? "蠕变" : "Creep"}
            </TabsTrigger>
            <TabsTrigger value="friction" className="text-xs">
              <Activity className="w-3 h-3 mr-1" />
              {isZh ? "摩擦" : "Friction"}
            </TabsTrigger>
          </TabsList>

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

            <p className="text-sm text-muted-foreground mb-4">{manufacturability.summary}</p>

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
                      <p className="font-medium text-sm">{issue.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.parameter}: {issue.currentValue} → {issue.requiredValue}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">{issue.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">{isZh ? "推荐工艺" : "Recommended Process"}</h4>
                <p className="text-sm">{manufacturability.recommendedProcess}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">{isZh ? "工装要求" : "Tooling Requirements"}</h4>
                <ul className="text-sm space-y-1">
                  {manufacturability.toolingRequirements.map((req, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      • {req}
                    </li>
                  ))}
                </ul>
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
                  {isZh ? "应力幅值 σa" : "Stress Amplitude σa"}
                </Label>
                <p className="text-lg font-mono">{fatigueLife.sigmaA.toFixed(1)} MPa</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "平均应力 σm" : "Mean Stress σm"}
                </Label>
                <p className="text-lg font-mono">{fatigueLife.sigmaM.toFixed(1)} MPa</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "疲劳极限 Se" : "Endurance Limit Se"}
                </Label>
                <p className="text-lg font-mono">
                  {fatigueLife.Se ? `${fatigueLife.Se.toFixed(0)} MPa` : "N/A"}
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "极限强度 Su" : "Ultimate Strength Su"}
                </Label>
                <p className="text-lg font-mono">
                  {fatigueLife.Su ? `${fatigueLife.Su.toFixed(0)} MPa` : "N/A"}
                </p>
              </div>
            </div>

            {fatigueLife.basquinA && fatigueLife.basquinB && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  Basquin: S = {fatigueLife.basquinA.toFixed(0)} × N^(-
                  {fatigueLife.basquinB.toFixed(3)})
                </p>
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
                  {isZh ? "临界转速" : "Critical Speed"}
                </Label>
                <p className="text-lg font-mono">{vibration.criticalSpeed_rpm.toFixed(0)} rpm</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "转动惯量" : "Moment of Inertia"}
                </Label>
                <p className="text-lg font-mono">
                  {vibration.momentOfInertia_kgmm2.toExponential(2)} kg·mm²
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
                  {vibration.recommendations.map((rec, idx) => (
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
                  {isZh ? "调整后弹性模量" : "Adjusted E"}
                </Label>
                <p className="text-lg font-mono">
                  {(temperatureEffects.E_adjusted_MPa / 1000).toFixed(1)} GPa
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "调整后刚度" : "Adjusted k"}
                </Label>
                <p className="text-lg font-mono">
                  {temperatureEffects.k_adjusted_NmmPerDeg.toFixed(2)} N·mm/°
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
                  {isZh ? "热膨胀" : "Thermal Expansion"}
                </Label>
                <p className="text-lg font-mono">
                  {temperatureEffects.thermalExpansion_mm.toFixed(3)} mm
                </p>
              </div>
            </div>

            {temperatureEffects.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">
                    {isZh ? "警告" : "Warnings"}
                  </span>
                </div>
                <ul className="text-sm text-orange-700 space-y-1">
                  {temperatureEffects.warnings.map((w, idx) => (
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
                  value={[Math.log10(duration)]}
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
                <p className="text-lg font-mono">{creep.finalTorque_Nmm.toFixed(1)} N·mm</p>
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
                  {creep.warnings.map((w, idx) => (
                    <li key={idx}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* P3: Friction Tab */}
          <TabsContent value="friction" className="space-y-4">
            <div className="mb-4">
              <Label>{isZh ? "摩擦系数" : "Friction Coefficient"}</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[frictionCoeff]}
                  onValueChange={(v) => setFrictionCoeff(v[0])}
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={frictionCoeff}
                  onChange={(e) => setFrictionCoeff(parseFloat(e.target.value) || 0.15)}
                  className="w-20"
                  step={0.01}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "摩擦扭矩" : "Friction Torque"}
                </Label>
                <p className="text-lg font-mono">{friction.frictionTorque_Nmm.toFixed(2)} N·mm</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "滞后损失" : "Hysteresis Loss"}
                </Label>
                <p className="text-lg font-mono">{friction.hysteresisLoss_percent.toFixed(2)}%</p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "有效刚度" : "Effective Rate"}
                </Label>
                <p className="text-lg font-mono">
                  {friction.effectiveSpringRate_NmmPerDeg.toFixed(2)} N·mm/°
                </p>
              </div>
              <div className="p-3 border rounded-lg">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "每周期能量损失" : "Energy Loss/Cycle"}
                </Label>
                <p className="text-lg font-mono">
                  {friction.energyLossPerCycle_Nmm.toFixed(2)} N·mm
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="p-3 border rounded-lg bg-green-50">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "加载扭矩" : "Loading Torque"}
                </Label>
                <p className="text-lg font-mono text-green-700">
                  {friction.loadingTorque_Nmm.toFixed(1)} N·mm
                </p>
              </div>
              <div className="p-3 border rounded-lg bg-blue-50">
                <Label className="text-xs text-muted-foreground">
                  {isZh ? "卸载扭矩" : "Unloading Torque"}
                </Label>
                <p className="text-lg font-mono text-blue-700">
                  {friction.unloadingTorque_Nmm.toFixed(1)} N·mm
                </p>
              </div>
            </div>

            {friction.recommendations.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <ul className="text-sm text-yellow-700 space-y-1">
                  {friction.recommendations.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
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
