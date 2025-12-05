"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/language-context";

import type { SpringGeometry, SpringAnalysisResult } from "@/lib/engine/types";
import {
  calculateDynamics,
  generateHarmonicScan,
  type DynamicsResult,
} from "@/lib/engine/dynamics";
import {
  calculateTemperatureEffects,
  generateTemperatureDecayCurve,
  type TemperatureEffectResult,
} from "@/lib/engine/temperature";
import {
  calculateCreepAnalysis,
  type CreepResult,
} from "@/lib/engine/creep";
import {
  calculateEnvironmentEffects,
  getEnvironmentOptions,
  type EnvironmentType,
  type EnvironmentEffectResult,
} from "@/lib/engine/environment";
import {
  calculateVerdict,
  type VerdictResult,
} from "@/lib/engine/verdict";

interface AdvancedAnalysisPanelProps {
  geometry: SpringGeometry;
  analysisResult: SpringAnalysisResult;
  springRate: number;
  maxStress: number;
  freeLength: number;
}

export function AdvancedAnalysisPanel({
  geometry,
  analysisResult,
  springRate,
  maxStress,
  freeLength,
}: AdvancedAnalysisPanelProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Input states
  const [workingFrequency, setWorkingFrequency] = useState<number>(0);
  const [operatingTemperature, setOperatingTemperature] = useState<number>(20);
  const [operatingTime, setOperatingTime] = useState<number>(1000);
  const [environmentType, setEnvironmentType] = useState<EnvironmentType>("indoor");

  // Calculate dynamics
  const dynamicsResult = useMemo<DynamicsResult | null>(() => {
    try {
      return calculateDynamics(geometry, springRate, workingFrequency > 0 ? workingFrequency : undefined);
    } catch {
      return null;
    }
  }, [geometry, springRate, workingFrequency]);

  // Calculate temperature effects
  const temperatureResult = useMemo<TemperatureEffectResult | null>(() => {
    try {
      return calculateTemperatureEffects(geometry.materialId, operatingTemperature);
    } catch {
      return null;
    }
  }, [geometry.materialId, operatingTemperature]);

  // Calculate creep
  const creepResult = useMemo<CreepResult | null>(() => {
    try {
      return calculateCreepAnalysis(
        geometry.materialId,
        maxStress,
        freeLength,
        operatingTime,
        operatingTemperature
      );
    } catch {
      return null;
    }
  }, [geometry.materialId, maxStress, freeLength, operatingTime, operatingTemperature]);

  // Calculate environment effects
  const environmentResult = useMemo<EnvironmentEffectResult | null>(() => {
    try {
      // Use mean stress as base for endurance calculation
      const baseEndurance = analysisResult.fatigue.tauMean * analysisResult.fatigue.infiniteLifeSafetyFactor;
      return calculateEnvironmentEffects(geometry.materialId, environmentType, baseEndurance);
    } catch {
      return null;
    }
  }, [geometry.materialId, environmentType, analysisResult.fatigue]);

  // Calculate verdict
  const verdictResult = useMemo<VerdictResult | null>(() => {
    try {
      return calculateVerdict(analysisResult, {
        dynamics: dynamicsResult ?? undefined,
        creep: creepResult ?? undefined,
        environment: environmentResult ?? undefined,
        temperature: temperatureResult ?? undefined,
      });
    } catch {
      return null;
    }
  }, [analysisResult, dynamicsResult, creepResult, environmentResult, temperatureResult]);

  const environmentOptions = getEnvironmentOptions();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isZh ? "高级工程分析" : "Advanced Engineering Analysis"}</span>
          {verdictResult && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                verdictResult.status === "PASS"
                  ? "bg-green-100 text-green-800"
                  : verdictResult.status === "CONDITIONAL_PASS"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {verdictResult.status}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dynamics" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dynamics">{isZh ? "动力学" : "Dynamics"}</TabsTrigger>
            <TabsTrigger value="temperature">{isZh ? "温度" : "Temperature"}</TabsTrigger>
            <TabsTrigger value="creep">{isZh ? "蠕变" : "Creep"}</TabsTrigger>
            <TabsTrigger value="environment">{isZh ? "环境" : "Environment"}</TabsTrigger>
            <TabsTrigger value="verdict">{isZh ? "判定" : "Verdict"}</TabsTrigger>
          </TabsList>

          {/* Dynamics Tab */}
          <TabsContent value="dynamics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isZh ? "工作频率 (Hz)" : "Working Frequency (Hz)"}</Label>
                <Input
                  type="number"
                  value={workingFrequency}
                  onChange={(e) => setWorkingFrequency(Number(e.target.value))}
                  placeholder="0 = no check"
                />
              </div>
              {dynamicsResult && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "弹簧质量" : "Spring Mass"}</span>
                    <span className="font-medium">{(dynamicsResult.springMass * 1000).toFixed(2)} g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "固有频率 fn" : "Natural Frequency fn"}</span>
                    <span className="font-medium">{dynamicsResult.naturalFrequency.toFixed(1)} Hz</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "冲击波速度" : "Surge Wave Velocity"}</span>
                    <span className="font-medium">{dynamicsResult.surgeWaveVelocity.toFixed(0)} m/s</span>
                  </div>
                  {workingFrequency > 0 && (
                    <div className={`mt-2 rounded p-2 text-sm ${
                      dynamicsResult.resonanceStatus.isAtRisk 
                        ? "bg-red-100 text-red-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {isZh 
                        ? dynamicsResult.resonanceStatus.message.zh 
                        : dynamicsResult.resonanceStatus.message.en}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Temperature Tab */}
          <TabsContent value="temperature" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isZh ? "工作温度 (°C)" : "Operating Temperature (°C)"}</Label>
                <Input
                  type="number"
                  value={operatingTemperature}
                  onChange={(e) => setOperatingTemperature(Number(e.target.value))}
                />
              </div>
              {temperatureResult && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "强度损失" : "Strength Loss"}</span>
                    <span className={`font-medium ${temperatureResult.strengthLossPercent > 20 ? "text-red-600" : ""}`}>
                      {temperatureResult.strengthLossPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "模量损失" : "Modulus Loss"}</span>
                    <span className="font-medium">{temperatureResult.modulusLossPercent.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "调整后许用应力" : "Adjusted Allowable"}</span>
                    <span className="font-medium">{temperatureResult.adjustedAllowableStress.toFixed(0)} MPa</span>
                  </div>
                  {temperatureResult.warning && (
                    <div className="mt-2 rounded bg-yellow-100 p-2 text-sm text-yellow-800">
                      {isZh ? temperatureResult.warning.zh : temperatureResult.warning.en}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Creep Tab */}
          <TabsContent value="creep" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isZh ? "工作时间 (小时)" : "Operating Time (hours)"}</Label>
                <Input
                  type="number"
                  value={operatingTime}
                  onChange={(e) => setOperatingTime(Number(e.target.value))}
                />
              </div>
              {creepResult && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "应力比 τ/Sy" : "Stress Ratio τ/Sy"}</span>
                    <span className={`font-medium ${creepResult.stressRatio > 0.75 ? "text-red-600" : ""}`}>
                      {(creepResult.stressRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "永久变形" : "Permanent Set"}</span>
                    <span className="font-medium">{creepResult.permanentSetPercent.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "蠕变寿命" : "Creep Lifetime"}</span>
                    <span className="font-medium">
                      {creepResult.creepLifetime > 1e8 ? "∞" : `${(creepResult.creepLifetime / 1000).toFixed(0)}k h`}
                    </span>
                  </div>
                  <div className={`mt-2 rounded p-2 text-sm ${
                    creepResult.riskLevel === "low" ? "bg-green-100 text-green-800" :
                    creepResult.riskLevel === "medium" ? "bg-yellow-100 text-yellow-800" :
                    creepResult.riskLevel === "high" ? "bg-orange-100 text-orange-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {isZh ? creepResult.message.zh : creepResult.message.en}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Environment Tab */}
          <TabsContent value="environment" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{isZh ? "工作环境" : "Operating Environment"}</Label>
                <Select value={environmentType} onValueChange={(v) => setEnvironmentType(v as EnvironmentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {environmentOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {isZh ? opt.labelZh : opt.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {environmentResult && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "腐蚀系数" : "Corrosion Factor"}</span>
                    <span className="font-medium">{environmentResult.effectiveCorrosionFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "疲劳衰减" : "Fatigue Reduction"}</span>
                    <span className={`font-medium ${environmentResult.fatigueReductionFactor < 0.8 ? "text-red-600" : ""}`}>
                      {(environmentResult.fatigueReductionFactor * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{isZh ? "SCC 风险" : "SCC Risk"}</span>
                    <span className={`font-medium ${
                      environmentResult.sccRisk === "high" ? "text-red-600" :
                      environmentResult.sccRisk === "medium" ? "text-yellow-600" : ""
                    }`}>
                      {environmentResult.sccRisk.toUpperCase()}
                    </span>
                  </div>
                  {environmentResult.warning && (
                    <div className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800">
                      {isZh ? environmentResult.warning.zh : environmentResult.warning.en}
                    </div>
                  )}
                  {environmentResult.recommendations.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <strong>{isZh ? "建议：" : "Recommendations:"}</strong>
                      <ul className="list-disc pl-4">
                        {environmentResult.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Verdict Tab */}
          <TabsContent value="verdict" className="space-y-4">
            {verdictResult && (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 text-center ${
                  verdictResult.status === "PASS" ? "bg-green-100" :
                  verdictResult.status === "CONDITIONAL_PASS" ? "bg-yellow-100" :
                  "bg-red-100"
                }`}>
                  <div className={`text-2xl font-bold ${
                    verdictResult.status === "PASS" ? "text-green-800" :
                    verdictResult.status === "CONDITIONAL_PASS" ? "text-yellow-800" :
                    "text-red-800"
                  }`}>
                    {verdictResult.status}
                  </div>
                  <p className="mt-1 text-sm">
                    {isZh ? verdictResult.message.zh : verdictResult.message.en}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">{isZh ? "检查项目" : "Criteria Check"}</h4>
                  <div className="grid gap-2">
                    {verdictResult.criteria.map((criterion, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded p-2 text-sm ${
                          criterion.passed ? "bg-green-50" :
                          criterion.severity === "critical" ? "bg-red-50" :
                          "bg-yellow-50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={criterion.passed ? "text-green-600" : "text-red-600"}>
                            {criterion.passed ? "✓" : "✗"}
                          </span>
                          {isZh ? criterion.nameZh : criterion.name}
                        </span>
                        <span className="text-muted-foreground">
                          {criterion.actualValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {verdictResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">{isZh ? "改进建议" : "Recommendations"}</h4>
                    <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                      {verdictResult.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
