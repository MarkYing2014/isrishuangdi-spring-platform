"use client";

import { useMemo, useState, useCallback } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import { calculateExtensionSpring, type ExtensionSpringInput } from "@/lib/springMath";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DimensionHint } from "./DimensionHint";
import { 
  EXTENSION_HOOK_TYPES, 
  EXTENSION_HOOK_LABELS, 
  type ExtensionHookType 
} from "@/lib/springTypes";
import {
  getDefaultSpringMaterial,
  getSpringMaterial,
  type SpringMaterial,
} from "@/lib/materials/springMaterials";
import { 
  useSpringDesignStore,
  type ExtensionGeometry,
  type MaterialInfo,
  type AnalysisResult,
  generateDesignCode,
} from "@/lib/stores/springDesignStore";

interface FormValues {
  outerDiameter: number;
  wireDiameter: number;
  activeCoils: number;
  bodyLength: number;
  freeLengthInsideHooks: number;
  shearModulus: number;
  initialTension: number;
  hookType: ExtensionHookType;
  workingDeflection: number;
}

type CalculationResult = ReturnType<typeof calculateExtensionSpring> | null;

export function ExtensionCalculator() {
  const [error, setError] = useState<string | null>(null);
  
  // 全局设计存储
  const storedGeometry = useSpringDesignStore(state => state.geometry);
  const storedMaterial = useSpringDesignStore(state => state.material);
  const storedAnalysis = useSpringDesignStore(state => state.analysisResult);
  const setDesign = useSpringDesignStore(state => state.setDesign);

  const lastExtensionGeometry = storedGeometry?.type === "extension" ? storedGeometry : null;
  
  // 从 store 恢复上次的计算结果
  const initialResult = useMemo<CalculationResult>(() => {
    if (lastExtensionGeometry && storedAnalysis) {
      const meanDiameter = lastExtensionGeometry.meanDiameter ?? 
        (lastExtensionGeometry.outerDiameter - lastExtensionGeometry.wireDiameter);
      return {
        meanDiameter,
        springIndex: storedAnalysis.springIndex ?? meanDiameter / lastExtensionGeometry.wireDiameter,
        wahlFactor: storedAnalysis.wahlFactor ?? 1.2,
        springRate: storedAnalysis.springRate,
        initialTension: storedAnalysis.initialTension ?? 0,
        workingDeflection: storedAnalysis.workingDeflection ?? 0,
        elasticLoad: (storedAnalysis.workingLoad ?? 0) - (storedAnalysis.initialTension ?? 0),
        totalLoad: storedAnalysis.workingLoad ?? 0,
        shearStress: storedAnalysis.shearStress ?? 0,
      };
    }
    return null;
  }, [lastExtensionGeometry, storedAnalysis]);
  
  const [result, setResult] = useState<CalculationResult>(initialResult);
  const initialMaterial = useMemo<SpringMaterial>(() => {
    if (storedMaterial?.id) {
      return getSpringMaterial(storedMaterial.id) ?? getDefaultSpringMaterial();
    }
    return getDefaultSpringMaterial();
  }, [storedMaterial?.id]);
  const defaultDeflection = storedAnalysis?.maxDeflection ?? storedAnalysis?.workingDeflection ?? 15;

  const form = useForm<FormValues>({
    defaultValues: {
      outerDiameter: lastExtensionGeometry?.outerDiameter ?? 12,
      wireDiameter: lastExtensionGeometry?.wireDiameter ?? 1.5,
      activeCoils: lastExtensionGeometry?.activeCoils ?? 10,
      bodyLength: lastExtensionGeometry?.bodyLength ?? 25,
      freeLengthInsideHooks: lastExtensionGeometry?.freeLength ?? 35,
      shearModulus: lastExtensionGeometry?.shearModulus ?? initialMaterial.shearModulus,
      initialTension: lastExtensionGeometry?.initialTension ?? 3,
      hookType: lastExtensionGeometry?.hookType ?? "machine",
      workingDeflection: defaultDeflection,
    },
  });

  const persistDesign = useCallback(
    (values: FormValues, calc: NonNullable<CalculationResult>) => {
      const meanDiameter = values.outerDiameter - values.wireDiameter;

      const geometry: ExtensionGeometry = {
        type: "extension",
        wireDiameter: values.wireDiameter,
        outerDiameter: values.outerDiameter,
        meanDiameter,
        activeCoils: values.activeCoils,
        bodyLength: values.bodyLength,
        freeLength: values.freeLengthInsideHooks,
        hookType: values.hookType,
        initialTension: values.initialTension,
        shearModulus: values.shearModulus,
        materialId: initialMaterial.id,
      };

      const material: MaterialInfo = {
        id: initialMaterial.id,
        name: initialMaterial.nameEn,
        shearModulus: values.shearModulus,
        elasticModulus: initialMaterial.elasticModulus ?? 206000,
        density: initialMaterial.density ?? 7850,
      };

      const analysisResult: AnalysisResult = {
        springRate: calc.springRate,
        springRateUnit: "N/mm",
        workingLoad: calc.totalLoad,
        initialTension: calc.initialTension,
        workingDeflection: calc.workingDeflection,
        maxDeflection: values.workingDeflection,
        shearStress: calc.shearStress,
        springIndex: calc.springIndex,
        wahlFactor: calc.wahlFactor,
      };

      setDesign({
        springType: "extension",
        geometry,
        material,
        analysisResult,
        meta: {
          designCode: generateDesignCode(geometry),
        },
      });
    },
    [initialMaterial, setDesign]
  );

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

      persistDesign(values, calc);
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
      hookType: values.hookType,  // 传递钩类型
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
      hookType: watchedValues.hookType ?? "machine",
    });
    return `/tools/analysis?${params.toString()}`;
  }, [watchedValues]);

  const cadExportUrl = useMemo(() => {
    const meanDiameter = (watchedValues.outerDiameter ?? 20) - (watchedValues.wireDiameter ?? 2);
    const params = new URLSearchParams({
      type: "extension",
      d: watchedValues.wireDiameter?.toString() ?? "2",
      Dm: meanDiameter.toString(),
      Na: watchedValues.activeCoils?.toString() ?? "10",
      Lb: watchedValues.bodyLength?.toString() ?? "40",
      Fi: watchedValues.initialTension?.toString() ?? "5",
      material: "music_wire_a228",
      hookType: watchedValues.hookType ?? "machine",
      k: result?.springRate?.toString() ?? "",
      dx: watchedValues.workingDeflection?.toString() ?? "10",
    });
    return `/tools/cad-export?${params.toString()}`;
  }, [watchedValues, result]);

  const handleNavigateToCad = () => {
    if (!result) return;
    persistDesign(form.getValues(), result);
  };

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

            {/* Hook Type - uses EXTENSION_HOOK_TYPES from springTypes.ts */}
            <div className="space-y-2">
              <Label htmlFor="hookType">Hook Type / 钩型 <span className="text-slate-400">(reference)</span></Label>
              <select
                id="hookType"
                className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                {...form.register("hookType")}
              >
                {EXTENSION_HOOK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EXTENSION_HOOK_LABELS[type].en} / {EXTENSION_HOOK_LABELS[type].zh}
                  </option>
                ))}
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

            <Button 
              type="submit" 
              className="w-full transition-all duration-200 active:scale-95"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Calculating... / 计算中...
                </>
              ) : form.formState.isSubmitSuccessful && result ? (
                <>
                  <span className="mr-2">✓</span>
                  Calculated / 已计算
                </>
              ) : (
                "Calculate / 计算"
              )}
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

          {/* Action Buttons - 重新设计的按钮样式 */}
          <div className="space-y-3">
            <Button 
              asChild 
              className="w-full bg-slate-700 hover:bg-slate-600 text-white border-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg" 
              disabled={!result}
            >
              <a href={simulatorUrl || "#"}>Generate 3D Model / 生成3D模型</a>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="w-full border-emerald-500/50 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400 hover:text-emerald-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/10"
            >
              <a href={forceTesterUrl}>Send to Force Tester / 发送到力–位移测试</a>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10"
            >
              <a href={analysisUrl}>Send to Engineering Analysis / 发送到工程分析</a>
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10" 
              disabled={!result}
              onClick={handleNavigateToCad}
            >
              <a href={cadExportUrl}>Export CAD / 导出 CAD</a>
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
