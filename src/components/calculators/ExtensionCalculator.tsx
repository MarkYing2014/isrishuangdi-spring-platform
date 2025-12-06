"use client";

import { useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import { calculateExtensionSpring, type ExtensionSpringInput } from "@/lib/springMath";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DimensionHint } from "./DimensionHint";

interface FormValues {
  outerDiameter: number;
  wireDiameter: number;
  activeCoils: number;
  bodyLength: number;
  freeLengthInsideHooks: number;
  shearModulus: number;
  initialTension: number;
  hookType: string;
  workingDeflection: number;
}

type CalculationResult = ReturnType<typeof calculateExtensionSpring> | null;

export function ExtensionCalculator() {
  const [result, setResult] = useState<CalculationResult>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: {
      outerDiameter: 12,
      wireDiameter: 1.5,
      activeCoils: 10,
      bodyLength: 25,
      freeLengthInsideHooks: 35,
      shearModulus: 79300,
      initialTension: 3,
      hookType: "machine",
      workingDeflection: 15,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    setError(null);
    try {
      const input: ExtensionSpringInput = {
        outerDiameter: values.outerDiameter,
        wireDiameter: values.wireDiameter,
        activeCoils: values.activeCoils,
        shearModulus: values.shearModulus,
        initialTension: values.initialTension || 0,
        workingDeflection: values.workingDeflection,
      };

      const calc = calculateExtensionSpring(input);
      setResult(calc);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Calculation failed");
    }
  };

  const forceTesterUrl = useMemo(() => {
    const values = form.getValues();
    const params = new URLSearchParams({
      type: "extension",
      OD: values.outerDiameter.toString(),
      d: values.wireDiameter.toString(),
      Na: values.activeCoils.toString(),
      Lb: values.bodyLength.toString(),
      Li: values.freeLengthInsideHooks.toString(),
      G: values.shearModulus.toString(),
      F0: values.initialTension.toString(),
      dxMax: values.workingDeflection.toString(),
    });
    return `/tools/force-tester?${params.toString()}`;
  }, [form]);

  // Simulator URL for 3D model - same as force tester for extension springs
  const simulatorUrl = forceTesterUrl;

  // Watch form values for URL generation
  const watchedValues = form.watch();

  const analysisUrl = useMemo(() => {
    const meanDiameter = (watchedValues.outerDiameter ?? 20) - (watchedValues.wireDiameter ?? 2);
    const params = new URLSearchParams({
      type: "extension",
      d: watchedValues.wireDiameter?.toString() ?? "2",
      Dm: meanDiameter.toString(),
      Na: watchedValues.activeCoils?.toString() ?? "10",
      Lb: watchedValues.bodyLength?.toString() ?? "40",
      Fi: watchedValues.initialTension?.toString() ?? "5",
      dxMin: "0",
      dxMax: watchedValues.workingDeflection?.toString() ?? "10",
      material: "music_wire_a228",
    });
    return `/tools/analysis?${params.toString()}`;
  }, [watchedValues]);

  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Extension Spring / 拉伸弹簧</p>
          <div className="mt-2 rounded-md bg-slate-100 p-2 text-xs text-slate-600">
            <p>Spring rate is computed from the body coils using the same formula as compression springs.</p>
            <p className="text-slate-500">刚度按弹簧本体等效压缩弹簧公式计算，总载荷 = 初拉力 + k·工作伸长量。</p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Outer Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code="OD"
                label="Outer Diameter"
                description="外径，从线圈外缘到外缘的距离。"
              />
              <Label htmlFor="outerDiameter">Outer Diameter OD (mm) / 外径</Label>
              <Input
                id="outerDiameter"
                type="number"
                step="0.1"
                {...form.register("outerDiameter", { valueAsNumber: true })}
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

            {/* Active Coils */}
            <div className="space-y-2">
              <DimensionHint
                code="Na"
                label="Active Coils"
                description="有效圈数，参与弹性变形的线圈数量。"
              />
              <Label htmlFor="activeCoils">Active Coils Na / 有效圈数</Label>
              <Input
                id="activeCoils"
                type="number"
                step="0.5"
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

            {/* Body Length */}
            <div className="space-y-2">
              <DimensionHint
                code="Lb"
                label="Body Length"
                description="弹簧本体长度，不含钩子的线圈部分。"
              />
              <Label htmlFor="bodyLength">Body Length Lb (mm) / 本体长度 <span className="text-slate-400">(reference)</span></Label>
              <Input
                id="bodyLength"
                type="number"
                step="0.1"
                {...form.register("bodyLength", { valueAsNumber: true })}
              />
            </div>

            {/* Free Length Inside Hooks */}
            <div className="space-y-2">
              <DimensionHint
                code="Lᵢ"
                label="Free Length Inside Hooks"
                description="钩内自由长度，钩内到钩内的距离。"
              />
              <Label htmlFor="freeLengthInsideHooks">Free Length Inside Hooks Lᵢ (mm) / 钩内自由长度 <span className="text-slate-400">(reference)</span></Label>
              <Input
                id="freeLengthInsideHooks"
                type="number"
                step="0.1"
                {...form.register("freeLengthInsideHooks", { valueAsNumber: true })}
              />
            </div>

            {/* Initial Tension */}
            <div className="space-y-2">
              <DimensionHint
                code="Fᵢ"
                label="Initial Tension"
                description="初拉力，弹簧开始伸长前需要克服的预紧力。"
              />
              <Label htmlFor="initialTension">Initial Tension Fᵢ (N) / 初拉力 <span className="text-slate-400">(optional, default 0)</span></Label>
              <Input
                id="initialTension"
                type="number"
                step="0.1"
                {...form.register("initialTension", { valueAsNumber: true })}
              />
            </div>

            {/* Hook Type */}
            <div className="space-y-2">
              <Label htmlFor="hookType">Hook Type / 钩型 <span className="text-slate-400">(reference)</span></Label>
              <select
                id="hookType"
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                {...form.register("hookType")}
              >
                <option value="machine">Machine Hook / 机器钩</option>
                <option value="crossover">Crossover Hook / 交叉钩</option>
                <option value="side">Side Hook / 侧钩</option>
                <option value="extended">Extended Hook / 延长钩</option>
                <option value="double-loop">Double Loop / 双环钩</option>
              </select>
            </div>

            {/* Working Deflection */}
            <div className="space-y-2">
              <DimensionHint
                code="Δx"
                label="Working Deflection"
                description="工作伸长量，从自由长度拉伸的行程。"
              />
              <Label htmlFor="workingDeflection">Working Deflection Δx (mm) / 工作伸长量</Label>
              <Input
                id="workingDeflection"
                type="number"
                step="0.1"
                {...form.register("workingDeflection", { valueAsNumber: true })}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full">
              Calculate / 计算
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 text-slate-50">
        <CardHeader>
          <CardTitle>Results / 计算结果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <div className="space-y-4">
              {/* Calculation Results */}
              <div className="space-y-3">
                <ResultRow label="Spring Rate k (N/mm) / 弹簧刚度" value={formatNumber(result.springRate)} />
                <ResultRow label="Initial Tension Fᵢ (N) / 初拉力" value={formatNumber(result.initialTension)} />
                <ResultRow label="Working Deflection Δx (mm) / 工作伸长量" value={formatNumber(result.workingDeflection)} />
                <ResultRow label="Elastic Load k·Δx (N) / 弹性载荷" value={formatNumber(result.elasticLoad)} />
                <div className="border-t border-slate-700 pt-2">
                  <ResultRow label="Total Load F (N) / 总载荷" value={formatNumber(result.totalLoad)} highlight />
                </div>
                <ResultRow label="Shear Stress τ (MPa) / 剪应力" value={formatNumber(result.shearStress)} />
                <ResultRow label="Spring Index C / 旋绕比" value={formatNumber(result.springIndex)} />
                <ResultRow label="Wahl Factor Kw / 曲度系数" value={formatNumber(result.wahlFactor)} />
                <ResultRow label="Mean Diameter Dm (mm) / 中径" value={formatNumber(result.meanDiameter)} />
              </div>

              {/* Formula Note */}
              <div className="rounded-md border border-slate-700 bg-slate-800 p-3 text-xs text-slate-400">
                <p>F_total = Fᵢ + k·Δx</p>
                <p>τ = Kw · 8·F·Dm / (π·d³)</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-200">
              Input parameters and run the calculation to view spring rate, load, and stress results.
              <br />
              <span className="text-slate-400">输入参数并点击计算，查看刚度、载荷与应力结果。</span>
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button asChild variant="secondary" className="w-full" disabled={!result}>
              <a href={simulatorUrl || "#"}>Generate 3D Model / 生成3D模型</a>
            </Button>
            <Button asChild variant="outline" className="w-full border-green-600 text-green-400 hover:bg-green-950">
              <a href={forceTesterUrl}>Send to Force Tester / 发送到力–位移测试</a>
            </Button>
            <Button asChild variant="outline" className="w-full border-blue-600 text-blue-400 hover:bg-blue-950">
              <a href={analysisUrl}>Send to Engineering Analysis / 发送到工程分析</a>
            </Button>
          </div>
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
