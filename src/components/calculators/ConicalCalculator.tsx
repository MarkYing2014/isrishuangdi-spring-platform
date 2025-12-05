"use client";

import { useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import {
  calculateLoadAndStress,
  calculateConicalSpringNonlinear,
  extractConicalStageTransitions,
  type ConicalNonlinearCurvePoint,
  type ConicalNonlinearResult,
} from "@/lib/springMath";
import { SpringDesign } from "@/lib/springTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DimensionHint } from "./DimensionHint";

interface FormValues {
  wireDiameter: number;
  largeDiameter: number;
  smallDiameter: number;
  activeCoils: number;
  freeLength: number;
  shearModulus: number;
  deflection: number;
}

type CalculationResult = ReturnType<typeof calculateLoadAndStress> | null;

export function ConicalCalculator() {
  const [result, setResult] = useState<CalculationResult>(null);
  const [nonlinearResult, setNonlinearResult] = useState<ConicalNonlinearResult | null>(null);
  const [stageTransitions, setStageTransitions] = useState<ReturnType<typeof extractConicalStageTransitions> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"linear" | "nonlinear">("linear");
  
  // Derived: extract curve from nonlinear result
  const nonlinearCurve = nonlinearResult?.curve ?? null;

  const form = useForm<FormValues>({
    defaultValues: {
      wireDiameter: 3.0,
      largeDiameter: 30,
      smallDiameter: 15,
      activeCoils: 5,
      freeLength: 40,
      shearModulus: 79300,
      deflection: 15,
    },
  });

  const simulatorUrl = useMemo(() => {
    if (!result) return "";
    const values = form.getValues();
    // Use equivalent mean diameter for simulator
    const equivalentMeanDiameter = (values.largeDiameter + values.smallDiameter) / 2 - values.wireDiameter;
    const params = new URLSearchParams({
      type: "compression", // Simulator uses compression for now
      d: values.wireDiameter.toString(),
      Dm: equivalentMeanDiameter.toString(),
      Na: values.activeCoils.toString(),
      G: values.shearModulus.toString(),
      dx: values.deflection.toString(),
    });
    return `/tools/simulator?${params.toString()}`;
  }, [result, form]);

  const forceTesterUrl = useMemo(() => {
    const values = form.getValues();
    const params = new URLSearchParams({
      type: "conical",
      d: values.wireDiameter.toString(),
      D1: values.largeDiameter.toString(),
      D2: values.smallDiameter.toString(),
      Na: values.activeCoils.toString(),
      G: values.shearModulus.toString(),
      L0: values.freeLength.toString(),
      dxMax: values.deflection.toString(),
    });
    return `/tools/force-tester?${params.toString()}`;
  }, [form]);

  // Watch form values for URL generation
  const watchedValues = form.watch();

  const analysisUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: "conical",
      d: watchedValues.wireDiameter?.toString() ?? "3",
      D1: watchedValues.largeDiameter?.toString() ?? "30",
      D2: watchedValues.smallDiameter?.toString() ?? "15",
      Na: watchedValues.activeCoils?.toString() ?? "6",
      L0: watchedValues.freeLength?.toString() ?? "50",
      dxMin: "0",
      dxMax: watchedValues.deflection?.toString() ?? "15",
      material: "music_wire_a228",
    });
    return `/tools/analysis?${params.toString()}`;
  }, [watchedValues]);

  const onSubmitLinear: SubmitHandler<FormValues> = (values) => {
    setError(null);
    setMode("linear");
    setNonlinearResult(null);
    setStageTransitions(null);
    try {
      // Calculate equivalent mean diameter for approximation
      const equivalentMeanDiameter = (values.largeDiameter + values.smallDiameter) / 2 - values.wireDiameter;

      const design: SpringDesign = {
        type: "compression",
        wireDiameter: values.wireDiameter,
        meanDiameter: equivalentMeanDiameter,
        activeCoils: values.activeCoils,
        shearModulus: values.shearModulus,
        freeLength: values.freeLength,
      };

      const calc = calculateLoadAndStress(design, values.deflection);
      setResult(calc);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Calculation failed");
    }
  };

  const onCalculateNonlinear = () => {
    setError(null);
    setMode("nonlinear");
    setResult(null);
    const values = form.getValues();

    try {
      const nlResult = calculateConicalSpringNonlinear({
        wireDiameter: values.wireDiameter,
        largeOuterDiameter: values.largeDiameter,
        smallOuterDiameter: values.smallDiameter,
        activeCoils: values.activeCoils,
        shearModulus: values.shearModulus,
        freeLength: values.freeLength,
        maxDeflection: values.deflection,
        samplePoints: 50,
      });

      setNonlinearResult(nlResult);
      setStageTransitions(extractConicalStageTransitions(nlResult.curve));
    } catch (err) {
      setNonlinearResult(null);
      setStageTransitions(null);
      setError(err instanceof Error ? err.message : "Nonlinear calculation failed");
    }
  };

  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Conical Compression Spring / 锥形压缩弹簧</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmitLinear)}>
            {/* Large Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code="D₁"
                label="Large Outer Diameter"
                description="大端外径，锥形弹簧较大一端的外径。"
              />
              <Label htmlFor="largeDiameter">Large Diameter D₁ (mm) / 大端外径</Label>
              <Input
                id="largeDiameter"
                type="number"
                step="0.1"
                {...form.register("largeDiameter", { valueAsNumber: true })}
              />
            </div>

            {/* Small Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code="D₂"
                label="Small Outer Diameter"
                description="小端外径，锥形弹簧较小一端的外径。"
              />
              <Label htmlFor="smallDiameter">Small Diameter D₂ (mm) / 小端外径</Label>
              <Input
                id="smallDiameter"
                type="number"
                step="0.1"
                {...form.register("smallDiameter", { valueAsNumber: true })}
              />
            </div>

            {/* Wire Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code="d"
                label="Wire Diameter"
                description="线径，弹簧钢丝的直径。"
              />
              <Label htmlFor="wireDiameter">Wire Diameter d (mm) / 线径</Label>
              <Input
                id="wireDiameter"
                type="number"
                step="0.01"
                {...form.register("wireDiameter", { valueAsNumber: true })}
              />
            </div>

            {/* Free Length */}
            <div className="space-y-2">
              <DimensionHint
                code="L₀"
                label="Free Length"
                description="自由长度，弹簧未受力时的高度。"
              />
              <Label htmlFor="freeLength">Free Length L₀ (mm) / 自由长度</Label>
              <Input
                id="freeLength"
                type="number"
                step="0.1"
                {...form.register("freeLength", { valueAsNumber: true })}
              />
            </div>

            {/* Active Coils */}
            <div className="space-y-2">
              <Label htmlFor="activeCoils">Active Coils Na / 有效圈数</Label>
              <Input
                id="activeCoils"
                type="number"
                step="0.1"
                {...form.register("activeCoils", { valueAsNumber: true })}
              />
            </div>

            {/* Shear Modulus */}
            <div className="space-y-2">
              <Label htmlFor="shearModulus">Shear Modulus G (MPa) / 剪切模量</Label>
              <Input
                id="shearModulus"
                type="number"
                step="100"
                {...form.register("shearModulus", { valueAsNumber: true })}
              />
            </div>

            {/* Working Deflection */}
            <div className="space-y-2">
              <DimensionHint
                code="Δx"
                label="Working Deflection"
                description="工作压缩量，从自由长度压缩的行程。"
              />
              <Label htmlFor="deflection">Working Deflection Δx (mm) / 工作压缩量</Label>
              <Input
                id="deflection"
                type="number"
                step="0.1"
                {...form.register("deflection", { valueAsNumber: true })}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Linear / 线性计算
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCalculateNonlinear}
              >
                Nonlinear / 非线性曲线
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-slate-50">
        <CardHeader>
          <CardTitle>Results / 计算结果</CardTitle>
          {(result || nonlinearCurve) && (
            <p className="text-xs text-slate-400">
              Mode: {mode === "linear" ? "Linear Approximation / 线性近似" : "Nonlinear Analysis / 非线性分析"}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Linear Results */}
          {mode === "linear" && result && (
            <div className="space-y-4">
              {/* Approximation Notice */}
              <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                <p className="text-xs text-blue-200">
                  Note: Linear approximation using equivalent mean diameter.
                </p>
                <p className="text-xs text-blue-300/80">
                  注意：使用等效中径的线性近似计算。
                </p>
              </div>

              {/* Results */}
              <div className="space-y-3">
                <ResultRow label="Spring Rate k (N/mm) / 刚度" value={`≈ ${formatNumber(result.k)}`} />
                <ResultRow label="Force F at Δx (N) / 载荷" value={`≈ ${formatNumber(result.load)}`} />
                <ResultRow label="Shear Stress τ (MPa) / 剪应力" value={`≈ ${formatNumber(result.shearStress)}`} />
                <ResultRow label="Spring Index C / 旋绕比" value={formatNumber(result.springIndex)} />
                <ResultRow label="Wahl Factor Kw / 曲度系数" value={formatNumber(result.wahlFactor)} />
              </div>
            </div>
          )}

          {/* Nonlinear Results */}
          {mode === "nonlinear" && nonlinearCurve && nonlinearResult && stageTransitions && (
            <div className="space-y-4">
              {/* Warning if exceeded solid height */}
              {nonlinearResult.exceededSolidHeight && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium text-amber-200">
                    ⚠️ Max deflection exceeds total available travel before solid height.
                  </p>
                  <p className="text-xs text-amber-300/80">
                    最大压缩量超过弹簧可压缩行程（到实心高度）。曲线已截止于 {nonlinearResult.clampedMaxDeflection.toFixed(2)} mm。
                  </p>
                </div>
              )}

              {/* Nonlinear Notice */}
              <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
                <p className="text-xs text-green-200">
                  Nonlinear model: coils collapse progressively as deflection increases.
                </p>
                <p className="text-xs text-green-300/80">
                  非线性模型：随压缩量增加，线圈逐步贴底。
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-green-400">
                  <span>Solid Height: {nonlinearResult.solidHeight.toFixed(2)} mm</span>
                  <span>Max Travel: {nonlinearResult.totalDeflectionCapacity.toFixed(2)} mm</span>
                  <span>Pitch: {nonlinearResult.pitch.toFixed(2)} mm/coil</span>
                </div>
              </div>

              {/* Final Point Summary */}
              {nonlinearCurve.length > 0 && (
                <div className="space-y-3">
                  <ResultRow
                    label="Final Load F (N) / 最终载荷"
                    value={formatNumber(nonlinearCurve[nonlinearCurve.length - 1].load)}
                    highlight
                  />
                  <ResultRow
                    label="Final Stiffness k (N/mm) / 最终刚度"
                    value={formatNumber(nonlinearCurve[nonlinearCurve.length - 1].k)}
                  />
                  <ResultRow
                    label="Active Coils / 有效圈数"
                    value={`${nonlinearCurve[nonlinearCurve.length - 1].activeCoils}`}
                  />
                  <ResultRow
                    label="Collapsed Coils / 贴底圈数"
                    value={`${nonlinearCurve[nonlinearCurve.length - 1].collapsedCoils}`}
                  />
                </div>
              )}

              {/* Stage Transitions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">Coil Collapse Stages / 圈贴底阶段:</p>
                <div className="max-h-40 overflow-y-auto rounded-md border border-slate-700 bg-slate-800 p-2 text-xs">
                  {stageTransitions.map((stage, idx) => (
                    <div key={idx} className="border-b border-slate-700 py-1.5 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-200">
                          Stage {stage.stage}
                        </span>
                        <span className="text-green-400">
                          k = {stage.stiffness.toFixed(2)} N/mm
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-400">
                        {stage.stage === 0 
                          ? `0 coils collapsed, Na = ${stage.activeCoils}, from Δx = 0 mm`
                          : `${stage.stage} coil(s) collapsed, Na = ${stage.activeCoils}, from Δx ≈ ${stage.deflection.toFixed(2)} mm`
                        }
                      </div>
                      <div className="mt-0.5 text-slate-500">
                        {stage.stage === 0 
                          ? `阶段 ${stage.stage}：初始状态，有效圈数 ${stage.activeCoils}，从压缩量 0 mm 开始`
                          : `阶段 ${stage.stage}：已贴底 ${stage.stage} 圈，有效圈数 ${stage.activeCoils}，从压缩量约 ${stage.deflection.toFixed(2)} mm 开始`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curve Preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-300">F–Δx Curve Preview / 曲线预览:</p>
                <div className="h-24 rounded-md border border-slate-700 bg-slate-800 p-2">
                  <div className="relative h-full w-full">
                    {/* Simple SVG curve preview */}
                    <svg viewBox="0 0 100 50" className="h-full w-full" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="1"
                        points={nonlinearCurve
                          .map((p, i) => {
                            const maxLoad = nonlinearCurve[nonlinearCurve.length - 1].load || 1;
                            const maxX = nonlinearCurve[nonlinearCurve.length - 1].x || 1;
                            const x = (p.x / maxX) * 100;
                            const y = 50 - (p.load / maxLoad) * 45;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                      />
                    </svg>
                    <div className="absolute bottom-0 left-0 text-[8px] text-slate-500">0</div>
                    <div className="absolute bottom-0 right-0 text-[8px] text-slate-500">
                      {nonlinearCurve[nonlinearCurve.length - 1]?.x.toFixed(1)}mm
                    </div>
                    <div className="absolute left-0 top-0 text-[8px] text-slate-500">
                      {nonlinearCurve[nonlinearCurve.length - 1]?.load.toFixed(0)}N
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!result && !nonlinearCurve && (
            <p className="text-sm text-slate-200">
              Input parameters and choose a calculation mode.
              <br />
              <span className="text-slate-400">输入参数并选择计算模式。</span>
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button asChild variant="secondary" className="w-full" disabled={!result && !nonlinearCurve}>
              <a href={simulatorUrl || "#"}>Generate 3D Model / 生成3D模型</a>
            </Button>
            <Button asChild variant="outline" className="w-full border-green-600 text-green-400 hover:bg-green-950">
              <a href={forceTesterUrl}>Send to Force Tester / 发送到力–位移测试</a>
            </Button>
            <Button asChild variant="outline" className="w-full border-blue-600 text-blue-400 hover:bg-blue-950">
              <a href={analysisUrl}>Send to Engineering Analysis / 发送到工程分析</a>
            </Button>
          </div>
          <p className="text-center text-xs text-slate-500">
            3D model uses equivalent cylindrical spring / 3D模型使用等效圆柱弹簧
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "text-slate-200 font-medium" : "text-slate-300"}>{label}</span>
      <span className={highlight ? "font-bold text-green-400" : "font-semibold text-slate-50"}>{value}</span>
    </div>
  );
}
