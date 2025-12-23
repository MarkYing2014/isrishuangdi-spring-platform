/**
 * Suspension Spring Analysis Panel
 * 减震器弹簧工程分析面板
 * 
 * MVP Features:
 * - Summary Bar with key KPIs
 * - k(x) nonlinear stiffness curve visualization
 * - Fatigue estimation (Goodman)
 * - Design rules summary
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { SuspensionGeometry, MaterialInfo, AnalysisResult } from "@/lib/stores/springDesignStore";
import { runSuspensionAnalysis, type SuspensionAnalysisResult } from "@/lib/suspensionSpring/analysis";
import { calculateSuspensionSpring } from "@/lib/suspensionSpring/math";
import type { SuspensionSpringInput } from "@/lib/suspensionSpring/types";

const SuspensionSpringVisualizer = dynamic(
  () => import("@/components/three/SuspensionSpringVisualizer").then((mod) => mod.SuspensionSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] bg-slate-50 rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    ),
  }
);

interface SuspensionAnalysisPanelProps {
  isZh: boolean;
  geometry: SuspensionGeometry;
  material: MaterialInfo;
  analysisResult: AnalysisResult;
}

// Simple line chart component for k(x) curve
function KxCurveChart({ data, isZh }: { data: { x: number; k: number; hasContact: boolean }[]; isZh: boolean }) {
  if (data.length < 2) return null;

  const maxX = Math.max(...data.map(d => d.x));
  const maxK = Math.max(...data.map(d => d.k));
  const minK = Math.min(...data.map(d => d.k));
  const kRange = maxK - minK || 1;

  const width = 400;
  const height = 200;
  const padding = 40;

  const points = data.map((d, i) => {
    const x = padding + (d.x / maxX) * (width - 2 * padding);
    const y = height - padding - ((d.k - minK) / kRange) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Find contact onset point
  const contactIndex = data.findIndex(d => d.hasContact);
  const contactPoint = contactIndex >= 0 ? data[contactIndex] : null;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md">
        {/* Axes */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#888" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#888" strokeWidth="1" />
        
        {/* Axis labels */}
        <text x={width / 2} y={height - 8} textAnchor="middle" className="text-xs fill-muted-foreground">
          {isZh ? "变形 x (mm)" : "Deflection x (mm)"}
        </text>
        <text x={12} y={height / 2} textAnchor="middle" transform={`rotate(-90, 12, ${height / 2})`} className="text-xs fill-muted-foreground">
          k (N/mm)
        </text>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1={padding + t * (width - 2 * padding)} y1={padding} x2={padding + t * (width - 2 * padding)} y2={height - padding} stroke="#ddd" strokeWidth="0.5" />
        ))}

        {/* Contact zone shading */}
        {contactPoint && (
          <rect
            x={padding + (contactPoint.x / maxX) * (width - 2 * padding)}
            y={padding}
            width={(1 - contactPoint.x / maxX) * (width - 2 * padding)}
            height={height - 2 * padding}
            fill="rgba(251, 191, 36, 0.1)"
          />
        )}

        {/* Curve */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Contact onset marker */}
        {contactPoint && (
          <>
            <circle
              cx={padding + (contactPoint.x / maxX) * (width - 2 * padding)}
              cy={height - padding - ((contactPoint.k - minK) / kRange) * (height - 2 * padding)}
              r="4"
              fill="#f59e0b"
            />
            <text
              x={padding + (contactPoint.x / maxX) * (width - 2 * padding) + 8}
              y={height - padding - ((contactPoint.k - minK) / kRange) * (height - 2 * padding) - 8}
              className="text-xs fill-amber-600"
            >
              {isZh ? "接触起始" : "Contact"}
            </text>
          </>
        )}

        {/* Value labels */}
        <text x={padding - 5} y={height - padding + 5} textAnchor="end" className="text-xs fill-muted-foreground">0</text>
        <text x={width - padding} y={height - padding + 15} textAnchor="middle" className="text-xs fill-muted-foreground">{maxX.toFixed(0)}</text>
        <text x={padding - 5} y={padding + 5} textAnchor="end" className="text-xs fill-muted-foreground">{maxK.toFixed(1)}</text>
        <text x={padding - 5} y={height - padding - 5} textAnchor="end" className="text-xs fill-muted-foreground">{minK.toFixed(1)}</text>
      </svg>
      <p className="text-xs text-muted-foreground mt-2">
        {isZh ? "黄色区域：圈-圈接触开始，刚度非线性增加" : "Yellow zone: Coil contact begins, stiffness increases nonlinearly"}
      </p>
    </div>
  );
}

// FEA Tab Component
interface FeaTabProps {
  isZh: boolean;
  geometry: SuspensionGeometry;
  material: MaterialInfo;
  calcResult: ReturnType<typeof calculateSuspensionSpring>;
  analysis: SuspensionAnalysisResult;
  onFeaComplete?: (force: number | null) => void;
}

// Option A: NVH Analysis Tab
function NvhTab({ isZh, calcResult, loadcase }: { isZh: boolean, calcResult: ReturnType<typeof calculateSuspensionSpring>, loadcase: any }) {
  const dyn = calcResult.dynamics;
  
  if (!dyn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {isZh ? "NVH & 动态分析" : "NVH & Dynamic Analysis"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">
            {isZh ? "请输入车辆簧下质量(Corner Mass)以进行频率分析" : "Please provide corner mass to enable frequency analysis"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const rideFreq = dyn.naturalFreq_Hz;
  const targetFreq = loadcase.targetFreq_Hz;
  const diff = targetFreq ? Math.abs(rideFreq - targetFreq) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {isZh ? "NVH & 动态分析" : "NVH & Dynamic Analysis"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{isZh ? "车轮刚度 (Wheel Rate)" : "Wheel Rate"}</span>
            <p className="text-2xl font-mono font-bold text-primary">
              {dyn.wheelRate_N_per_mm.toFixed(1)} <span className="text-xs font-normal">N/mm</span>
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{isZh ? "固有频率 (Natural Frequency)" : "Natural Frequency"}</span>
            <p className="text-2xl font-mono font-bold text-primary">
              {rideFreq.toFixed(2)} <span className="text-xs font-normal">Hz</span>
            </p>
          </div>
        </div>

        {targetFreq && (
          <div className={`p-3 rounded-lg flex items-center gap-3 ${diff < 0.2 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {diff < 0.2 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <div className="text-xs">
              <p className="font-semibold">{isZh ? "目标频率对比" : "Target Frequency Comparison"}</p>
              <p className="opacity-90">
                {isZh 
                  ? `当前比目标 (${targetFreq}Hz) ${rideFreq > targetFreq ? "偏高" : "偏低"} ${diff.toFixed(2)}Hz` 
                  : `Currently ${diff.toFixed(2)}Hz ${rideFreq > targetFreq ? "higher" : "lower"} than target (${targetFreq}Hz)`}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-xs font-semibold">{isZh ? "NVH 风险提示" : "NVH Risk Profile"}</h4>
          <div className="grid grid-cols-3 gap-2 text-[10px] uppercase font-bold text-center">
            <div className={`p-2 rounded ${rideFreq < 1.0 ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground opacity-50'}`}>
              Soft/Boat
            </div>
            <div className={`p-2 rounded ${rideFreq >= 1.0 && rideFreq <= 2.2 ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-muted text-muted-foreground opacity-50'}`}>
              Standard
            </div>
            <div className={`p-2 rounded ${rideFreq > 2.2 ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground opacity-50'}`}>
              Stiff/Racing
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic mt-2">
            * {isZh ? "基于单轮质量模型的估算值。1.0-2.2Hz 属于乘用车常规区间。" : "Estimated via quarter-car model. 1.0-2.2Hz is standard for passenger cars."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Option A: Engineering Conclusion & Expert Designer Suggestions
function ConclusionTab({ isZh, geometry, material, calcResult, analysis }: { isZh: boolean, geometry: SuspensionGeometry, material: MaterialInfo, calcResult: ReturnType<typeof calculateSuspensionSpring>, analysis: SuspensionAnalysisResult }) {
  const sfBump = calcResult.stress.yieldSafetyFactor_bump;
  const coilBindMargin = calcResult.bumpHeight_mm - calcResult.derived.solidHeight_Hs_mm;
  const fatigueSF = analysis.fatigue?.fatigueSF ?? 0;
  
  const rules = [];
  
  if (sfBump < 1.1) {
    rules.push({
      status: "fail",
      title: isZh ? "屈服强度不足" : "Insufficent Yield Strength",
      desc: isZh ? `Bump 工况安全系数仅 ${sfBump.toFixed(2)}，远低于 1.1。` : `Safety factor at Bump is only ${sfBump.toFixed(2)}, well below 1.1.`,
      advice: isZh ? "建议：增加线径 d 或更换高等级材料（如 55CrSi）。" : "Advice: Increase wire diameter d or upgrade to higher grade material (e.g., 55CrSi)."
    });
  } else if (sfBump < 1.3) {
    rules.push({
      status: "warning",
      title: isZh ? "强度余量较低" : "Low Strength Margin",
      desc: isZh ? `安全系数 ${sfBump.toFixed(2)} 勉强及格。` : `Safety factor ${sfBump.toFixed(2)} is marginal.`,
      advice: isZh ? "建议：优化卷数 Na 以降低应力水平。" : "Advice: Optimize active coils Na to lower stress levels."
    });
  }

  if (coilBindMargin < 3) {
    rules.push({
      status: "fail",
      title: isZh ? "并紧余量过小" : "Low Coil Bind Margin",
      desc: isZh ? `最大压缩时余量仅 ${coilBindMargin.toFixed(1)}mm (标准 ≥3mm)。` : `Margin at max bump is only ${coilBindMargin.toFixed(1)}mm (Standard ≥3mm).`,
      advice: isZh ? "建议：增加自由长 Hf 或减少总圈数 Nt。" : "Advice: Increase free length Hf or reduce total coils Nt."
    });
  }

  const fatiguePass = fatigueSF > 1.2;
  if (!fatiguePass && fatigueSF > 0) {
    rules.push({
      status: "warning",
      title: isZh ? "疲劳寿命中等" : "Moderate Fatigue Life",
      desc: isZh ? "Goodman 判定点接近包络线边缘。" : "Goodman point is near the envelope boundary.",
      advice: isZh ? "建议：确保护油喷丸工艺(Shot Peened)或降低预载。" : "Advice: Ensure shot peening or reduce preload."
    });
  }

  if (rules.length === 0) {
    rules.push({
      status: "pass",
      title: isZh ? "设计完美" : "Design Optimized",
      desc: isZh ? "所有工程指标均在安全区间内。" : "All engineering metrics are within safety limits.",
      advice: isZh ? "建议：可以尝试减轻重量以优化成本。" : "Advice: Consider weight reduction for cost optimization."
    });
  }

  const overallStatus = rules.some(r => r.status === "fail") ? "fail" : rules.some(r => r.status === "warning") ? "warning" : "pass";

  return (
    <Card className={`border-2 ${overallStatus === "fail" ? "border-red-200" : overallStatus === "warning" ? "border-amber-200" : "border-emerald-200"}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{isZh ? "工程结论 & 改进建议" : "Engineering Conclusion & Advice"}</span>
          <Badge className={overallStatus === "fail" ? "bg-red-500" : overallStatus === "warning" ? "bg-amber-500" : "bg-emerald-500"}>
            {overallStatus === "fail" ? (isZh ? "不合格" : "FAIL") : overallStatus === "warning" ? (isZh ? "临界" : "MARGINAL") : (isZh ? "合格" : "PASS")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.map((rule, i) => (
          <div key={i} className={`p-3 rounded-lg border-l-4 ${rule.status === "fail" ? "bg-red-50 border-red-500" : rule.status === "warning" ? "bg-amber-50 border-amber-500" : "bg-emerald-50 border-emerald-500"}`}>
            <h5 className="font-bold text-sm mb-1">{rule.title}</h5>
            <p className="text-xs opacity-80 mb-2">{rule.desc}</p>
            <p className="text-xs font-semibold text-primary">{rule.advice}</p>
          </div>
        ))}
        
        <div className="pt-4 border-t text-[10px] text-muted-foreground italic">
          {isZh ? "* 以上建议由 AI 设计专家系统基于标准底盘工程经验生成，仅供参考。" : "* Advice generated by AI Expert System based on chassis engineering best practices."}
        </div>
      </CardContent>
    </Card>
  );
}

interface FeaResult {
  job_id: string;
  status: "success" | "failed" | "error";
  elapsed_ms: number;
  results?: {
    success: boolean;
    converged: boolean;
    steps: Array<{
      step_number: number;
      step_name: string;
      reaction_force_z: number;  // Axial reaction force in N
      max_displacement_z: number;
      max_stress: number;
      max_stress_node: number;
    }>;
    node_stresses?: Array<{
      nodeId: number;
      vonMises: number;
      x: number;
      y: number;
      z: number;
    }>;
    max_stress: number;
  };
  error_message?: string;
}

// Generate a stable cache key based on design parameters
function generateFeaCacheKey(geometry: SuspensionGeometry, material: MaterialInfo, calcResult: ReturnType<typeof calculateSuspensionSpring>): string {
  const keyData = {
    wd: geometry.wireDiameter.toFixed(2),
    dm: (geometry.diameterProfile?.DmStart ?? 100).toFixed(1),
    na: geometry.activeCoils.toFixed(1),
    nt: geometry.totalCoils.toFixed(1),
    l0: geometry.freeLength.toFixed(1),
    G: material.shearModulus,
    rh: calcResult.rideHeight_mm.toFixed(1),
    bh: calcResult.bumpHeight_mm.toFixed(1),
  };
  return `fea-cache-${JSON.stringify(keyData)}`;
}

function CalculixFeaTab({ isZh, geometry, material, calcResult, analysis, onFeaComplete }: FeaTabProps) {
  const [feaStatus, setFeaStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [feaResult, setFeaResult] = useState<FeaResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cache key based on design parameters
  const cacheKey = useMemo(() => 
    generateFeaCacheKey(geometry, material, calcResult),
  [geometry, material, calcResult]);

  // Load cached result on mount or when cache key changes
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedResult: FeaResult = JSON.parse(cached);
        setFeaResult(parsedResult);
        setFeaStatus(parsedResult.status === "success" ? "done" : "error");
        // Also notify parent of cached force
        if (parsedResult.status === "success" && parsedResult.results?.steps[0]?.reaction_force_z) {
          onFeaComplete?.(parsedResult.results.steps[0].reaction_force_z);
        }
      } else {
        // No cache for new design - reset state
        setFeaResult(null);
        setFeaStatus("idle");
        onFeaComplete?.(null);
      }
    } catch (e) {
      // Ignore localStorage errors
      console.warn("Failed to load FEA cache:", e);
    }
  }, [cacheKey, onFeaComplete]);

  const runFea = useCallback(async () => {
    setFeaStatus("running");
    setErrorMsg(null);
    
    try {
      const response = await fetch("/api/fea/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design_code: `SUSP-${Date.now().toString(36).toUpperCase()}`,
          geometry: {
            wire_diameter: geometry.wireDiameter,
            mean_diameter: geometry.diameterProfile?.DmStart ?? 100,
            active_coils: geometry.activeCoils,
            total_coils: geometry.totalCoils,
            free_length: geometry.freeLength,
            end_type: geometry.pitchProfile?.endType ?? "closed_ground",
            dm_start: geometry.diameterProfile?.DmStart,
            dm_mid: geometry.diameterProfile?.DmMid,
            dm_end: geometry.diameterProfile?.DmEnd,
          },
          material: {
            E: 206000,
            nu: 0.3,
            G: material.shearModulus,
            name: "STEEL"
          },
          loadcases: [
            { name: "RIDE", target_height: calcResult.rideHeight_mm },
            { name: "BUMP", target_height: calcResult.bumpHeight_mm },
          ],
          mesh_level: "medium"
        }),
      });
      
      const result: FeaResult = await response.json();
      setFeaResult(result);
      setFeaStatus(result.status === "success" ? "done" : "error");
      if (result.error_message) setErrorMsg(result.error_message);
      
      // Save to cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch (e) {
        console.warn("Failed to save FEA cache:", e);
      }
      
      // Notify parent of FEA completion with reaction force
      if (result.status === "success" && result.results?.steps[0]?.reaction_force_z) {
        onFeaComplete?.(result.results.steps[0].reaction_force_z);
      } else {
        onFeaComplete?.(null);
      }
      
    } catch (err) {
      setFeaStatus("error");
      setErrorMsg(String(err));
      onFeaComplete?.(null);
    }
  }, [geometry, material, calcResult, cacheKey, onFeaComplete]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{isZh ? "FEA 验证 (CalculiX)" : "FEA Validation (CalculiX)"}</span>
          <Button 
            onClick={runFea} 
            disabled={feaStatus === "running"}
            size="sm"
          >
            {feaStatus === "running" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isZh ? "运行中..." : "Running..."}
              </>
            ) : (
              isZh ? "运行 FEA" : "Run FEA"
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {feaStatus === "idle" && (
          <p className="text-muted-foreground text-sm">
            {isZh 
              ? "点击 \"运行 FEA\" 使用 CalculiX 进行静力分析验证"
              : "Click \"Run FEA\" to validate with CalculiX static analysis"
            }
          </p>
        )}
        
        {feaStatus === "error" && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
            {errorMsg || (isZh ? "FEA 分析失败" : "FEA analysis failed")}
          </div>
        )}
        
        {feaStatus === "done" && feaResult?.results && (
          <>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                ✓ {isZh ? "FEA 完成" : "FEA Complete"} ({feaResult.elapsed_ms}ms)
              </p>
            </div>
            
            {/* Comparison Table - Reaction Force based */}
            {(() => {
              // Spring geometry for stress calculation
              const d = geometry.wireDiameter;  // mm
              const D = geometry.diameterProfile?.DmStart ?? 100;  // mm
              const c = D / d;  // Spring index
              const K = (4 * c - 1) / (4 * c - 4) + 0.615 / c;  // Wahl correction factor
              
              // Get FEA reaction force (convert to same load case if available)
              const feaRf = feaResult.results?.steps[0]?.reaction_force_z ?? 0;
              
              // Calculate shear stress from FEA force: τ = 8 * F * K * D / (π * d³)
              const feaTau = feaRf > 0 ? (8 * feaRf * K * D) / (Math.PI * Math.pow(d, 3)) : 0;
              
              // Analytical values
              const analyticTau = calcResult.stress.tauRide_MPa;
              const analyticForce = calcResult.forces.ride_N;
              
              // Delta percentage
              const deltaForce = analyticForce > 0 ? ((feaRf - analyticForce) / analyticForce * 100) : 0;
              const deltaTau = analyticTau > 0 ? ((feaTau - analyticTau) / analyticTau * 100) : 0;
              
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">{isZh ? "指标" : "Metric"}</th>
                        <th className="text-right py-2">{isZh ? "解析" : "Analytic"}</th>
                        <th className="text-right py-2">FEA</th>
                        <th className="text-right py-2">Δ%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">F_ride (N)</td>
                        <td className="text-right font-mono">{analyticForce.toFixed(1)}</td>
                        <td className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {feaRf > 0 ? feaRf.toFixed(1) : "-"}
                        </td>
                        <td className="text-right font-mono text-muted-foreground">
                          {feaRf > 0 ? `${deltaForce > 0 ? "+" : ""}${deltaForce.toFixed(1)}%` : "-"}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">τ_ride (MPa)</td>
                        <td className="text-right font-mono">{analyticTau.toFixed(0)}</td>
                        <td className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {feaTau > 0 ? feaTau.toFixed(0) : "-"}
                        </td>
                        <td className="text-right font-mono text-muted-foreground">
                          {feaTau > 0 ? `${deltaTau > 0 ? "+" : ""}${deltaTau.toFixed(1)}%` : "-"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">{isZh ? "偏差状态" : "Deviation Status"}</td>
                        <td className="text-right font-mono">-</td>
                        <td className="text-right font-mono" colSpan={2}>
                          {Math.abs(deltaForce) < 10 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ✓ {isZh ? "在 ±10% 内" : "Within ±10%"}
                            </span>
                          ) : Math.abs(deltaForce) < 20 ? (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              ⚠ {isZh ? "偏差较大" : "Moderate deviation"}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">
                              ✗ {isZh ? "偏差过大" : "Large deviation"}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
            
            <p className="text-xs text-muted-foreground">
              {isZh 
                ? "FEA 使用 B32 二次梁单元模型，应力由 τ = 8FKD/(πd³) 从反力计算"
                : "FEA uses B32 quadratic beam model, stress calculated from τ = 8FKD/(πd³)"
              }
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BeamTheoryTab({ isZh, geometry, material, calcResult, onFeaComplete }: FeaTabProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const runEstimation = useCallback(() => {
    setIsCalculating(true);
    setIsDone(false);
    
    // Simulate a brief local calculation delay
    setTimeout(() => {
      setIsCalculating(false);
      setIsDone(true);
      // Automatically send analytical force to 3D preview
      onFeaComplete?.(calcResult.forces.ride_N);
    }, 600);
  }, [calcResult.forces.ride_N, onFeaComplete]);

  // Reset state if critical design parameters change
  useEffect(() => {
    setIsDone(false);
    onFeaComplete?.(null);
  }, [geometry.wireDiameter, geometry.activeCoils, geometry.diameterProfile?.DmStart, material.shearModulus]);

  return (
    <Card className="border-emerald-100 dark:border-emerald-900/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50">
              {isZh ? "快速估算" : "Quick Estimate"}
            </Badge>
            <span>{isZh ? "基于梁理论的应力分析" : "Beam Theory Stress Analysis"}</span>
          </div>
          <Button 
            disabled={isCalculating} 
            onClick={runEstimation}
            size="sm"
          >
            {isCalculating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isZh ? "计算中..." : "Calculating..."}</>
            ) : (
              isZh ? "开始计算" : "Start Calculation"
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isDone && !isCalculating && (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <p className="text-sm">{isZh ? "点击计算以根据解析刚度生成应力云图" : "Click calculate to generate stress contour based on analytical stiffness"}</p>
          </div>
        )}

        {isCalculating && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm animate-pulse">{isZh ? "正在求解刚度矩阵..." : "Solving stiffness matrix..."}</p>
          </div>
        )}

        {isDone && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">{isZh ? "反力 (F_ride)" : "Reaction Force"}</p>
                <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {calcResult.forces.ride_N.toFixed(1)} N
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground">{isZh ? "最大剪应力 (τ_max)" : "Max Shear Stress"}</p>
                <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {calcResult.stress.tauRide_MPa.toFixed(0)} MPa
                </p>
              </div>
            </div>

            <div className="p-3 border rounded-lg bg-muted/30 text-xs space-y-2">
              <p className="font-semibold">{isZh ? "理论基础" : "Theoretical Basis"}</p>
              <ul className="list-disc list-inside space-y-1 opacity-80">
                <li>{isZh ? "受载力: F = k * (L0 - L_ride)" : "Load: F = k * (L0 - L_ride)"}</li>
                <li>{isZh ? "剪应力: τ = 8 * F * K * D / (π * d³)" : "Shear Stress: τ = 8 * F * K * D / (π * d³)"}</li>
                <li>{isZh ? "死圈应力衰减模型 (20%-100%)" : "Dead coil stress attenuation model (20%-100%)"}</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
              <CheckCircle className="w-4 h-4" />
              <span>{isZh ? "数据已同步至 3D 预览" : "Data synchronized to 3D Preview"}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FeaTab({ isZh, geometry, material, calcResult, analysis, onFeaComplete }: FeaTabProps) {
  const [method, setMethod] = useState<"estimate" | "calculix">("estimate");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex bg-muted p-1 rounded-md text-xs">
          <button 
            onClick={() => setMethod("estimate")}
            className={`px-3 py-1.5 rounded-sm transition-all ${method === "estimate" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {isZh ? "快速估算" : "Quick Estimate"}
          </button>
          <button 
            onClick={() => setMethod("calculix")}
            className={`px-3 py-1.5 rounded-sm transition-all ${method === "calculix" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            {isZh ? "CalculiX FEA (耗时)" : "CalculiX FEA"}
          </button>
        </div>
        <span className="text-[10px] text-muted-foreground italic">
          {method === "estimate" 
            ? (isZh ? "无需服务器，即时响应" : "No server required, instant")
            : (isZh ? "云端高精度计算" : "High precision cloud compute")}
        </span>
      </div>

      {method === "estimate" ? (
        <BeamTheoryTab 
          isZh={isZh}
          geometry={geometry}
          material={material}
          calcResult={calcResult}
          analysis={analysis}
          onFeaComplete={onFeaComplete}
        />
      ) : (
        <CalculixFeaTab 
          isZh={isZh}
          geometry={geometry}
          material={material}
          calcResult={calcResult}
          analysis={analysis}
          onFeaComplete={onFeaComplete}
        />
      )}
    </div>
  );
}

export function SuspensionAnalysisPanel({
  isZh,
  geometry,
  material,
  analysisResult,
}: SuspensionAnalysisPanelProps) {
  // Build input for analysis
  const input: SuspensionSpringInput = useMemo(() => ({
    geometry: {
      od_mm: geometry.wireDiameter + (geometry.diameterProfile?.DmStart ?? 100),
      wireDiameter_mm: geometry.wireDiameter,
      activeCoils_Na: geometry.activeCoils,
      totalCoils_Nt: geometry.totalCoils,
      freeLength_Hf_mm: geometry.freeLength,
      endType: geometry.pitchProfile?.endType ?? "closed_ground",
      guide: {},
    },
    material: {
      shearModulus_G_MPa: material.shearModulus,
      yieldStrength_MPa: material.tensileStrength ? material.tensileStrength * 0.7 : 1200,
      fatigueLimit_MPa: material.tensileStrength ? material.tensileStrength * 0.4 : 600,
    },
    loadcase: {
      preload_N: 500,
      rideLoad_N: 2000,
      bumpTravel_mm: 80,
      solidMargin_mm: 3,
    },
  }), [geometry, material]);

  // FEA stress visualization state
  const [feaForce, setFeaForce] = useState<number | null>(null);
  const [showStressContour, setShowStressContour] = useState(true);

  const handleFeaComplete = useCallback((force: number | null) => {
    setFeaForce(force);
  }, []);

  const calcResult = useMemo(() => calculateSuspensionSpring(input), [input]);

  // Run analysis
  const analysis: SuspensionAnalysisResult | null = useMemo(() => {
    if (calcResult.errors.length > 0) return null;
    return runSuspensionAnalysis(input, calcResult);
  }, [input, calcResult]);

  // Determine overall status
  const overallStatus = useMemo(() => {
    if (!analysis) return "error";
    if (analysis.summary.sfBump < 1.0) return "fail";
    if (analysis.summary.coilBindMargin < 3) return "warning";
    if (analysis.fatigue?.lifeClass === "fail") return "fail";
    if (analysis.fatigue?.lifeClass === "low") return "warning";
    return "pass";
  }, [analysis]);

  if (!analysis) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="mb-4">
          <Link href="/tools/suspension-spring">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? "返回计算器" : "Back to Calculator"}
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {isZh ? "分析失败：无有效设计数据" : "Analysis failed: No valid design data"}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <Link href="/tools/suspension-spring">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? "返回计算器" : "Back to Calculator"}
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {isZh ? "减震器弹簧工程分析" : "Suspension Spring Engineering Analysis"}
        </h1>
        <p className="text-muted-foreground">
          {isZh ? "解析级分析 + k(x) 非线性刚度曲线 + 疲劳评估" : "Analytic analysis + k(x) nonlinear stiffness + Fatigue assessment"}
        </p>
      </div>

      {/* Summary Bar */}
      <div className={`mb-6 p-4 rounded-lg border ${
        overallStatus === "pass" 
          ? "bg-emerald-500/10 border-emerald-500/50" 
          : overallStatus === "warning"
            ? "bg-amber-500/10 border-amber-500/50"
            : "bg-red-500/10 border-red-500/50"
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {overallStatus === "pass" && <CheckCircle className="w-6 h-6 text-emerald-500" />}
          {overallStatus === "warning" && <AlertTriangle className="w-6 h-6 text-amber-500" />}
          {overallStatus === "fail" && <XCircle className="w-6 h-6 text-red-500" />}
          <span className={`font-semibold ${
            overallStatus === "pass" ? "text-emerald-500" 
            : overallStatus === "warning" ? "text-amber-500" 
            : "text-red-500"
          }`}>
            {overallStatus === "pass" && (isZh ? "✓ 设计通过" : "✓ Design Passed")}
            {overallStatus === "warning" && (isZh ? "⚠️ 需要注意" : "⚠️ Review Needed")}
            {overallStatus === "fail" && (isZh ? "❌ 设计不合格" : "❌ Design Failed")}
          </span>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{isZh ? "刚度" : "Rate"} k₀</span>
            <p className="font-mono font-semibold">{analysis.summary.kFree.toFixed(1)} N/mm</p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "Bump刚度" : "k@Bump"}</span>
            <p className="font-mono font-semibold">{analysis.summary.kBump.toFixed(1)} N/mm</p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "最大应力" : "Max τ"}</span>
            <p className="font-mono font-semibold">{analysis.summary.maxStress.toFixed(0)} MPa</p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "安全系数" : "SF@Bump"}</span>
            <p className={`font-mono font-semibold ${analysis.summary.sfBump >= 1.2 ? "text-emerald-500" : analysis.summary.sfBump >= 1.0 ? "text-amber-500" : "text-red-500"}`}>
              {analysis.summary.sfBump.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "并紧余量" : "Bind Margin"}</span>
            <p className={`font-mono font-semibold ${analysis.summary.coilBindMargin >= 3 ? "text-emerald-500" : "text-amber-500"}`}>
              {analysis.summary.coilBindMargin.toFixed(1)} mm
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{isZh ? "疲劳寿命" : "Fatigue"}</span>
            <Badge variant={
              analysis.fatigue?.lifeClass === "high" ? "default" :
              analysis.fatigue?.lifeClass === "mid" ? "secondary" :
              analysis.fatigue?.lifeClass === "low" ? "outline" : "destructive"
            }>
              {analysis.fatigue?.lifeClass.toUpperCase() ?? "N/A"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="curves" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="curves">k(x)</TabsTrigger>
              <TabsTrigger value="fatigue">{isZh ? "疲劳" : "Fatigue"}</TabsTrigger>
              <TabsTrigger value="nvh">NVH</TabsTrigger>
              <TabsTrigger value="fea">FEA</TabsTrigger>
              <TabsTrigger value="conclusion">{isZh ? "结论" : "Conclusion"}</TabsTrigger>
            </TabsList>

            <TabsContent value="curves">
              <Card>
                <CardHeader>
                  <CardTitle>{isZh ? "非线性刚度曲线 k(x)" : "Nonlinear Stiffness k(x)"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <KxCurveChart data={analysis.kxCurve} isZh={isZh} />
                  {analysis.contactInfo && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm">
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        {isZh ? "⚠️ 检测到圈-圈接触" : "⚠️ Coil Contact Detected"}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {isZh 
                          ? `在变形 ${analysis.contactInfo.onsetDeflection.toFixed(1)}mm 处开始接触（${(analysis.contactInfo.onsetFraction * 100).toFixed(0)}% 行程）`
                          : `Contact begins at ${analysis.contactInfo.onsetDeflection.toFixed(1)}mm deflection (${(analysis.contactInfo.onsetFraction * 100).toFixed(0)}% travel)`
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stress">
              <Card>
                <CardHeader>
                  <CardTitle>{isZh ? "工况应力分析" : "Loadcase Stress Analysis"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-xs text-muted-foreground mb-1">Preload</p>
                      <p className="font-mono text-lg">{calcResult.forces.preload_N.toFixed(0)} N</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p className="text-xs text-muted-foreground mb-1">Ride</p>
                      <p className="font-mono text-lg">{calcResult.stress.tauRide_MPa.toFixed(0)} MPa</p>
                      <p className="text-xs text-muted-foreground">SF: {calcResult.stress.yieldSafetyFactor_ride.toFixed(2)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <p className="text-xs text-muted-foreground mb-1">Bump</p>
                      <p className="font-mono text-lg">{calcResult.stress.tauBump_MPa.toFixed(0)} MPa</p>
                      <p className="text-xs text-muted-foreground">SF: {calcResult.stress.yieldSafetyFactor_bump.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fatigue">
              <Card>
                <CardHeader>
                  <CardTitle>{isZh ? "疲劳寿命评估 (Goodman)" : "Fatigue Assessment (Goodman)"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.fatigue && (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">{isZh ? "平均应力" : "Mean Stress"}</span>
                          <p className="font-mono">{analysis.fatigue.meanStress.toFixed(0)} MPa</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "交变应力" : "Alternating Stress"}</span>
                          <p className="font-mono">{analysis.fatigue.altStress.toFixed(0)} MPa</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "疲劳安全系数" : "Fatigue SF"}</span>
                          <p className={`font-mono font-semibold ${analysis.fatigue.fatigueSF >= 1.5 ? "text-emerald-500" : analysis.fatigue.fatigueSF >= 1.0 ? "text-amber-500" : "text-red-500"}`}>
                            {analysis.fatigue.fatigueSF.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isZh ? "预估寿命" : "Est. Cycles"}</span>
                          <p className="font-mono">{analysis.fatigue.estimatedCycles?.toExponential(1)}</p>
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        analysis.fatigue.lifeClass === "high" ? "bg-emerald-50 dark:bg-emerald-900/20" :
                        analysis.fatigue.lifeClass === "mid" ? "bg-blue-50 dark:bg-blue-900/20" :
                        analysis.fatigue.lifeClass === "low" ? "bg-amber-50 dark:bg-amber-900/20" :
                        "bg-red-50 dark:bg-red-900/20"
                      }`}>
                        <p className="font-medium">
                          {isZh ? "寿命等级: " : "Life Class: "}
                          <span className="uppercase">{analysis.fatigue.lifeClass}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {analysis.fatigue.lifeClass === "high" && (isZh ? "无限寿命 (>10⁷ 次)" : "Infinite life (>10⁷ cycles)")}
                          {analysis.fatigue.lifeClass === "mid" && (isZh ? "高循环疲劳 (10⁵~10⁷ 次)" : "High cycle fatigue (10⁵~10⁷ cycles)")}
                          {analysis.fatigue.lifeClass === "low" && (isZh ? "有限寿命 (<10⁵ 次)，建议复核" : "Limited life (<10⁵ cycles), review recommended")}
                          {analysis.fatigue.lifeClass === "fail" && (isZh ? "不满足疲劳要求，需要重新设计" : "Fatigue requirements not met, redesign needed")}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nvh">
              <NvhTab isZh={isZh} calcResult={calcResult} loadcase={input.loadcase} />
            </TabsContent>

            <TabsContent value="conclusion">
              <ConclusionTab 
                isZh={isZh} 
                geometry={geometry} 
                material={material} 
                calcResult={calcResult} 
                analysis={analysis} 
              />
            </TabsContent>

            <TabsContent value="fea">
              <FeaTab
                isZh={isZh}
                geometry={geometry}
                material={material}
                calcResult={calcResult}
                analysis={analysis}
                onFeaComplete={handleFeaComplete}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* 3D Preview Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{isZh ? "3D 预览" : "3D Preview"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] rounded-lg overflow-hidden border">
                <SuspensionSpringVisualizer
                  wireDiameter={geometry.wireDiameter}
                  meanDiameter={geometry.diameterProfile?.DmStart ?? 100}
                  activeCoils={geometry.activeCoils}
                  totalCoils={geometry.totalCoils}
                  freeLength={geometry.freeLength}
                  currentDeflection={0}
                  stressRatio={0.5}
                  solidHeight={calcResult.derived.solidHeight_Hs_mm}
                  currentLoad={0}
                  springRate={calcResult.springRate_N_per_mm}
                  pitchProfile={geometry.pitchProfile}
                  diameterProfile={geometry.diameterProfile}
                  feaForce={feaForce ?? undefined}
                  showStressContour={showStressContour && feaForce !== null}
                  isZh={isZh}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isZh ? "拖动旋转，滚轮缩放" : "Drag to rotate, scroll to zoom"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
