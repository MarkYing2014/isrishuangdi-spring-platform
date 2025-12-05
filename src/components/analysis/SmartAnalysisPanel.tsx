"use client";

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/language-context";

import type { SpringGeometry, SpringAnalysisResult, WorkingConditions } from "@/lib/engine/types";
import {
  calculateStressDistribution,
  type StressDistributionResult,
  STRESS_COLOR_THRESHOLDS,
} from "@/lib/engine/stressDistribution";
import {
  calculateFatigueDamage,
  type FatigueDamageResult,
  DAMAGE_THRESHOLDS,
} from "@/lib/engine/fatigueDamage";
import {
  diagnoseFailureModes,
  getFailureModeIcon,
  type DiagnosticsResult,
} from "@/lib/engine/failureDiagnostics";
import {
  generateDesignSuggestions,
  type SuggestionsResult,
} from "@/lib/engine/designSuggestions";
import {
  optimizeSpringDesign,
  DEFAULT_CONSTRAINTS,
  DEFAULT_WEIGHTS,
  type DesignTargets,
  type OptimizationResult,
} from "@/lib/engine/optimizer";

interface SmartAnalysisPanelProps {
  geometry: SpringGeometry;
  analysisResult: SpringAnalysisResult;
  workingConditions: WorkingConditions;
  springRate: number;
  currentDeflection: number;
  onDeflectionChange?: (deflection: number) => void;
}

export function SmartAnalysisPanel({
  geometry,
  analysisResult,
  workingConditions,
  springRate,
  currentDeflection,
  onDeflectionChange,
}: SmartAnalysisPanelProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Optimization inputs
  const [targetStiffness, setTargetStiffness] = useState<number>(springRate);
  const [minFatigueLife, setMinFatigueLife] = useState<number>(1e6);
  const [minSafetyFactor, setMinSafetyFactor] = useState<number>(1.5);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);

  // Calculate current force
  const currentForce = springRate * currentDeflection;

  // Calculate stress distribution
  const stressDistribution = useMemo<StressDistributionResult | null>(() => {
    try {
      return calculateStressDistribution(geometry, currentForce, currentDeflection, 50);
    } catch {
      return null;
    }
  }, [geometry, currentForce, currentDeflection]);

  // Calculate fatigue damage
  const fatigueDamage = useMemo<FatigueDamageResult | null>(() => {
    if (!stressDistribution) return null;
    try {
      const minStress = springRate * workingConditions.minDeflection;
      const maxStress = springRate * workingConditions.maxDeflection;
      return calculateFatigueDamage(
        stressDistribution,
        geometry.materialId,
        1e6, // Default 1M cycles
        minStress,
        maxStress
      );
    } catch {
      return null;
    }
  }, [stressDistribution, geometry.materialId, springRate, workingConditions]);

  // Diagnose failure modes
  const diagnostics = useMemo<DiagnosticsResult | null>(() => {
    try {
      return diagnoseFailureModes(geometry, analysisResult, { fatigueDamage: fatigueDamage ?? undefined });
    } catch {
      return null;
    }
  }, [geometry, analysisResult, fatigueDamage]);

  // Generate suggestions
  const suggestions = useMemo<SuggestionsResult | null>(() => {
    if (!diagnostics) return null;
    try {
      return generateDesignSuggestions(geometry, analysisResult, diagnostics);
    } catch {
      return null;
    }
  }, [geometry, analysisResult, diagnostics]);

  // Run optimization
  const runOptimization = useCallback(() => {
    setIsOptimizing(true);
    
    // Run in setTimeout to not block UI
    setTimeout(() => {
      try {
        const targets: DesignTargets = {
          targetStiffness,
          minFatigueLife,
          minSafetyFactor,
        };
        
        const result = optimizeSpringDesign(
          targets,
          workingConditions,
          DEFAULT_CONSTRAINTS,
          DEFAULT_WEIGHTS,
          { populationSize: 30, generations: 50 }
        );
        
        setOptimizationResult(result);
      } catch (error) {
        console.error("Optimization error:", error);
      } finally {
        setIsOptimizing(false);
      }
    }, 100);
  }, [targetStiffness, minFatigueLife, minSafetyFactor, workingConditions]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isZh ? "智能诊断与优化" : "Smart Diagnostics & Optimization"}</span>
          {diagnostics && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                diagnostics.overallRisk === "low"
                  ? "bg-green-100 text-green-800"
                  : diagnostics.overallRisk === "medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : diagnostics.overallRisk === "high"
                  ? "bg-orange-100 text-orange-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {diagnostics.overallRisk.toUpperCase()} RISK
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stress" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stress">{isZh ? "应力分布" : "Stress Map"}</TabsTrigger>
            <TabsTrigger value="damage">{isZh ? "损伤图" : "Damage Map"}</TabsTrigger>
            <TabsTrigger value="diagnosis">{isZh ? "诊断" : "Diagnosis"}</TabsTrigger>
            <TabsTrigger value="suggestions">{isZh ? "建议" : "Suggestions"}</TabsTrigger>
            <TabsTrigger value="optimize">{isZh ? "优化" : "Optimize"}</TabsTrigger>
          </TabsList>

          {/* Stress Distribution Tab */}
          <TabsContent value="stress" className="space-y-4">
            {stressDistribution && (
              <div className="space-y-4">
                {/* Color Legend */}
                <div className="flex items-center gap-4 rounded-lg bg-slate-50 p-3">
                  <span className="text-sm font-medium">{isZh ? "应力图例" : "Stress Legend"}:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-8 rounded bg-blue-500" />
                    <span className="text-xs">&lt; {STRESS_COLOR_THRESHOLDS.BLUE_MAX * 100}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-8 rounded bg-green-500" />
                    <span className="text-xs">{STRESS_COLOR_THRESHOLDS.BLUE_MAX * 100}-{STRESS_COLOR_THRESHOLDS.GREEN_MAX * 100}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-8 rounded bg-yellow-500" />
                    <span className="text-xs">{STRESS_COLOR_THRESHOLDS.GREEN_MAX * 100}-{STRESS_COLOR_THRESHOLDS.YELLOW_MAX * 100}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-8 rounded bg-red-500" />
                    <span className="text-xs">&gt; {STRESS_COLOR_THRESHOLDS.YELLOW_MAX * 100}%</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stressDistribution.maxStress.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "最大应力 (MPa)" : "Max Stress (MPa)"}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stressDistribution.avgStress.toFixed(0)}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "平均应力 (MPa)" : "Avg Stress (MPa)"}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className={`text-2xl font-bold ${stressDistribution.criticalZoneCount > 0 ? "text-red-600" : "text-green-600"}`}>
                      {stressDistribution.criticalZoneCount}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "临界区域" : "Critical Zones"}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stressDistribution.hotSpots.length}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "热点数" : "Hot Spots"}</div>
                  </div>
                </div>

                {/* Hot Spots Table */}
                {stressDistribution.hotSpots.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <h4 className="mb-2 font-medium">{isZh ? "应力热点" : "Stress Hot Spots"}</h4>
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="py-1 text-left">{isZh ? "位置" : "Location"}</th>
                            <th className="py-1 text-right">{isZh ? "圈数" : "Coil"}</th>
                            <th className="py-1 text-right">{isZh ? "应力" : "Stress"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stressDistribution.hotSpots.slice(0, 5).map((spot, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-1">θ = {(spot.theta * 180 / Math.PI).toFixed(0)}°</td>
                              <td className="py-1 text-right">{spot.coilNumber.toFixed(1)}</td>
                              <td className="py-1 text-right text-red-600">{spot.stress.toFixed(0)} MPa</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Fatigue Damage Tab */}
          <TabsContent value="damage" className="space-y-4">
            {fatigueDamage && (
              <div className="space-y-4">
                {/* Status Banner */}
                <div className={`rounded-lg p-4 ${
                  fatigueDamage.status === "safe" ? "bg-green-100" :
                  fatigueDamage.status === "warning" ? "bg-yellow-100" :
                  fatigueDamage.status === "danger" ? "bg-orange-100" :
                  "bg-red-100"
                }`}>
                  <div className={`font-bold ${
                    fatigueDamage.status === "safe" ? "text-green-800" :
                    fatigueDamage.status === "warning" ? "text-yellow-800" :
                    fatigueDamage.status === "danger" ? "text-orange-800" :
                    "text-red-800"
                  }`}>
                    {isZh ? fatigueDamage.message.zh : fatigueDamage.message.en}
                  </div>
                </div>

                {/* Damage Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className={`text-2xl font-bold ${fatigueDamage.maxDamageIndex > 0.5 ? "text-red-600" : "text-green-600"}`}>
                      {fatigueDamage.maxDamageIndex.toFixed(3)}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "最大损伤指数" : "Max Damage Index"}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className="text-2xl font-bold">
                      {fatigueDamage.avgDamageIndex.toFixed(4)}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "平均损伤" : "Avg Damage"}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className={`text-2xl font-bold ${fatigueDamage.highDamageZoneCount > 0 ? "text-orange-600" : "text-green-600"}`}>
                      {fatigueDamage.highDamageZoneCount}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "高损伤区 (D>0.5)" : "High Damage (D>0.5)"}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3 text-center">
                    <div className={`text-2xl font-bold ${fatigueDamage.failurePredictedCount > 0 ? "text-red-600" : "text-green-600"}`}>
                      {fatigueDamage.failurePredictedCount}
                    </div>
                    <div className="text-xs text-muted-foreground">{isZh ? "预测失效" : "Failure Predicted"}</div>
                  </div>
                </div>

                {/* Miner Sum */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{isZh ? "Miner 累积损伤" : "Miner Cumulative Damage"}</span>
                    <span className={`text-xl font-bold ${fatigueDamage.minerSum > 1 ? "text-red-600" : "text-green-600"}`}>
                      {fatigueDamage.minerSum.toFixed(4)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                    <div 
                      className={`h-2 rounded-full ${fatigueDamage.minerSum > 1 ? "bg-red-500" : fatigueDamage.minerSum > 0.5 ? "bg-yellow-500" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, fatigueDamage.minerSum * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Diagnosis Tab */}
          <TabsContent value="diagnosis" className="space-y-4">
            {diagnostics && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm">{isZh ? diagnostics.summary.zh : diagnostics.summary.en}</p>
                </div>

                {diagnostics.failureModes.length === 0 ? (
                  <div className="rounded-lg bg-green-100 p-4 text-center text-green-800">
                    {isZh ? "未检测到显著失效模式 ✓" : "No significant failure modes detected ✓"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diagnostics.failureModes.map((mode, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-3 ${
                          mode.severity === "critical" ? "border-red-300 bg-red-50" :
                          mode.severity === "high" ? "border-orange-300 bg-orange-50" :
                          mode.severity === "medium" ? "border-yellow-300 bg-yellow-50" :
                          "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getFailureModeIcon(mode.type)}</span>
                            <span className="font-medium">{isZh ? mode.name.zh : mode.name.en}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-2 py-0.5 text-xs ${
                              mode.severity === "critical" ? "bg-red-200 text-red-800" :
                              mode.severity === "high" ? "bg-orange-200 text-orange-800" :
                              "bg-yellow-200 text-yellow-800"
                            }`}>
                              {mode.severity.toUpperCase()}
                            </span>
                            <span className="text-sm font-bold">{(mode.probability * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isZh ? mode.rootCause.zh : mode.rootCause.en}
                        </p>
                        <p className="mt-1 text-xs font-mono text-slate-600">
                          {mode.numericalJustification}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            {suggestions && (
              <div className="space-y-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm">{isZh ? suggestions.summary.zh : suggestions.summary.en}</p>
                </div>

                {suggestions.quickWins.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-700">{isZh ? "快速改进" : "Quick Wins"}</h4>
                    {suggestions.quickWins.map((suggestion, i) => (
                      <div key={i} className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{isZh ? suggestion.title.zh : suggestion.title.en}</span>
                          <span className="text-xs text-green-600">
                            {isZh ? "简单" : "Easy"} • {(suggestion.effectiveness * 100).toFixed(0)}% {isZh ? "有效" : "effective"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isZh ? suggestion.description.zh : suggestion.description.en}
                        </p>
                        {suggestion.parameterChange && (
                          <p className="mt-1 text-xs font-mono text-green-700">
                            {suggestion.parameterChange.parameter}: {suggestion.parameterChange.currentValue.toFixed(2)} → {suggestion.parameterChange.suggestedValue.toFixed(2)} {suggestion.parameterChange.unit}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.topPriority.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-orange-700">{isZh ? "高优先级" : "Top Priority"}</h4>
                    {suggestions.topPriority.filter(s => !suggestions.quickWins.includes(s)).map((suggestion, i) => (
                      <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{isZh ? suggestion.title.zh : suggestion.title.en}</span>
                          <span className={`text-xs ${
                            suggestion.difficulty === "easy" ? "text-green-600" :
                            suggestion.difficulty === "moderate" ? "text-yellow-600" :
                            "text-red-600"
                          }`}>
                            {suggestion.difficulty} • {suggestion.costImpact} cost
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isZh ? suggestion.expectedImprovement.zh : suggestion.expectedImprovement.en}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimize" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{isZh ? "目标刚度 (N/mm)" : "Target Stiffness (N/mm)"}</Label>
                <Input
                  type="number"
                  value={targetStiffness}
                  onChange={(e) => setTargetStiffness(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>{isZh ? "最小疲劳寿命" : "Min Fatigue Life"}</Label>
                <Select value={String(minFatigueLife)} onValueChange={(v) => setMinFatigueLife(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100000">10⁵ cycles</SelectItem>
                    <SelectItem value="1000000">10⁶ cycles</SelectItem>
                    <SelectItem value="10000000">10⁷ cycles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isZh ? "最小安全系数" : "Min Safety Factor"}</Label>
                <Input
                  type="number"
                  value={minSafetyFactor}
                  onChange={(e) => setMinSafetyFactor(Number(e.target.value))}
                  step={0.1}
                />
              </div>
            </div>

            <Button 
              onClick={runOptimization} 
              disabled={isOptimizing}
              className="w-full"
            >
              {isOptimizing ? (isZh ? "优化中..." : "Optimizing...") : (isZh ? "运行优化" : "Run Optimization")}
            </Button>

            {optimizationResult && (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 ${
                  optimizationResult.status === "success" ? "bg-green-100" :
                  optimizationResult.status === "partial" ? "bg-yellow-100" :
                  "bg-red-100"
                }`}>
                  <div className="font-bold">
                    {isZh ? optimizationResult.message.zh : optimizationResult.message.en}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="mb-3 font-medium">{isZh ? "最优解" : "Best Solution"}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">d:</span>
                      <span className="font-mono">{optimizationResult.bestSolution.wireDiameter} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dm:</span>
                      <span className="font-mono">{optimizationResult.bestSolution.meanDiameter} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Na:</span>
                      <span className="font-mono">{optimizationResult.bestSolution.activeCoils}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">L0:</span>
                      <span className="font-mono">{optimizationResult.bestSolution.freeLength} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isZh ? "材料" : "Material"}:</span>
                      <span className="font-mono">{optimizationResult.bestSolution.materialId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">k:</span>
                      <span className="font-mono">{optimizationResult.expectedPerformance.springRate} N/mm</span>
                    </div>
                  </div>
                </div>

                {optimizationResult.paretoFront.length > 1 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 font-medium">{isZh ? "Pareto 前沿解" : "Pareto Front Solutions"}</h4>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="py-1 text-left">d</th>
                            <th className="py-1 text-left">Dm</th>
                            <th className="py-1 text-left">Na</th>
                            <th className="py-1 text-right">SF</th>
                            <th className="py-1 text-right">Mass</th>
                          </tr>
                        </thead>
                        <tbody>
                          {optimizationResult.paretoFront.slice(0, 5).map((sol, i) => (
                            <tr key={i} className="border-b border-slate-100">
                              <td className="py-1">{sol.solution.wireDiameter}</td>
                              <td className="py-1">{sol.solution.meanDiameter}</td>
                              <td className="py-1">{sol.solution.activeCoils}</td>
                              <td className="py-1 text-right">{sol.objectives.safety.toFixed(2)}</td>
                              <td className="py-1 text-right">{(sol.objectives.mass * 1000).toFixed(1)}g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
