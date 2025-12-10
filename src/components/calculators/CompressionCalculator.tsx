"use client";

import { useMemo, useState } from "react";
import { type SubmitHandler, type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { 
  calculateLoadAndStress, 
  performStressAnalysis,
  calculatePreload,
  type StressAnalysisResult,
  type PreloadResult,
} from "@/lib/springMath";
import { 
  getDefaultSpringMaterial, 
  getSizeFactor,
  type SpringMaterial,
  type SpringMaterialId,
} from "@/lib/materials/springMaterials";
import { SpringDesign } from "@/lib/springTypes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DimensionHint } from "./DimensionHint";
import { MaterialSelector } from "./MaterialSelector";
import { StressAnalysisCard } from "./StressAnalysisCard";
import { 
  useSpringDesignStore,
  type CompressionGeometry,
  type MaterialInfo,
  type AnalysisResult,
  generateDesignCode,
} from "@/lib/stores/springDesignStore";

const formSchema = z
  .object({
    wireDiameter: z.coerce.number().positive("Wire diameter must be > 0"),
    meanDiameter: z.coerce.number().positive("Mean diameter must be > 0"),
    activeCoils: z.coerce.number().positive("Active coils must be > 0"),
    totalCoils: z.coerce.number().positive("Total coils must be > 0"),
    shearModulus: z.coerce.number().positive("Shear modulus must be > 0"),
    freeLength: z.coerce.number().positive("Free length must be > 0").optional(),
    deflection: z.coerce.number().nonnegative("Deflection must be ≥ 0"),
    preloadDeflection: z.coerce.number().nonnegative("Preload must be ≥ 0").optional(),
    stressRatio: z.coerce.number().min(0).max(1).optional(),
    topGround: z.boolean().optional().default(false),
    bottomGround: z.boolean().optional().default(false),
  })
  .refine((data) => data.totalCoils >= data.activeCoils, {
    path: ["totalCoils"],
    message: "Total coils must be ≥ active coils",
  });

type FormValues = z.infer<typeof formSchema>;
type CalculationResult = ReturnType<typeof calculateLoadAndStress> | null;

export function CompressionCalculator() {
  const [result, setResult] = useState<CalculationResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<SpringMaterial>(getDefaultSpringMaterial());
  const [stressAnalysis, setStressAnalysis] = useState<StressAnalysisResult | null>(null);
  const [preloadResult, setPreloadResult] = useState<PreloadResult | null>(null);
  
  // 全局设计存储
  const setDesign = useSpringDesignStore(state => state.setDesign);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      wireDiameter: 3.2,
      meanDiameter: 24,
      activeCoils: 8,
      totalCoils: 10,
      shearModulus: getDefaultSpringMaterial().shearModulus,
      freeLength: 50,
      deflection: 10,
      preloadDeflection: 0,
      stressRatio: 0.3,
      topGround: true,
      bottomGround: true,
    },
  });

  // Handle material change
  const handleMaterialChange = (material: SpringMaterial) => {
    setSelectedMaterial(material);
    form.setValue("shearModulus", material.shearModulus);
  };

  const simulatorUrl = useMemo(() => {
    if (!result) return "";
    const values = form.getValues();
    const params = new URLSearchParams({
      type: "compression",
      d: values.wireDiameter.toString(),
      Dm: values.meanDiameter.toString(),
      Na: values.activeCoils.toString(),
      Nt: values.totalCoils.toString(),
      G: values.shearModulus.toString(),
      dx: values.deflection.toString(),
      topGround: String(values.topGround ?? false),
      bottomGround: String(values.bottomGround ?? false),
    });
    return `/tools/simulator?${params.toString()}`;
  }, [result, form]);

  // Watch form values for URL generation
  const watchedValues = form.watch();

  const forceTesterUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: "compression",
      d: watchedValues.wireDiameter?.toString() ?? "3.2",
      Dm: watchedValues.meanDiameter?.toString() ?? "24",
      Na: watchedValues.activeCoils?.toString() ?? "8",
      G: watchedValues.shearModulus?.toString() ?? "79300",
      L0: watchedValues.freeLength?.toString() ?? "50",
      dxMax: watchedValues.deflection?.toString() ?? "10",
    });
    return `/tools/force-tester?${params.toString()}`;
  }, [watchedValues]);

  const analysisUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: "compression",
      d: watchedValues.wireDiameter?.toString() ?? "3.2",
      Dm: watchedValues.meanDiameter?.toString() ?? "24",
      Na: watchedValues.activeCoils?.toString() ?? "8",
      L0: watchedValues.freeLength?.toString() ?? "50",
      dxMin: "0",
      dxMax: watchedValues.deflection?.toString() ?? "10",
      material: selectedMaterial.id,
    });
    return `/tools/analysis?${params.toString()}`;
  }, [watchedValues, selectedMaterial]);

  const cadExportUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: "compression",
      d: watchedValues.wireDiameter?.toString() ?? "3.2",
      Dm: watchedValues.meanDiameter?.toString() ?? "24",
      Na: watchedValues.activeCoils?.toString() ?? "8",
      Nt: watchedValues.totalCoils?.toString() ?? "10",
      L0: watchedValues.freeLength?.toString() ?? "50",
      material: selectedMaterial.id,
      k: result?.k?.toString() ?? "",
      dx: watchedValues.deflection?.toString() ?? "10",
    });
    return `/tools/cad-export?${params.toString()}`;
  }, [watchedValues, selectedMaterial, result]);

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    setError(null);
    try {
      const design: SpringDesign = {
        type: "compression",
        wireDiameter: values.wireDiameter,
        meanDiameter: values.meanDiameter,
        activeCoils: values.activeCoils,
        totalCoils: values.totalCoils,
        shearModulus: values.shearModulus,
        freeLength: values.freeLength,
        topGround: values.topGround,
        bottomGround: values.bottomGround,
      };

      const calc = calculateLoadAndStress(design, values.deflection);
      setResult(calc);

      // Perform stress analysis
      const sizeFactor = getSizeFactor(values.wireDiameter);
      const analysis = performStressAnalysis({
        materialId: selectedMaterial.id,
        tauNominal: calc.shearStress / calc.wahlFactor, // Remove Wahl to get nominal
        wahlFactor: calc.wahlFactor,
        surfaceFactor: selectedMaterial.surfaceFactor,
        sizeFactor,
        tempFactor: selectedMaterial.tempFactor,
        stressRatio: values.stressRatio,
      });
      setStressAnalysis(analysis);

      // Calculate preload if specified
      if (values.preloadDeflection && values.preloadDeflection > 0) {
        const preload = calculatePreload({
          springRate: calc.k,
          preloadDeflection: values.preloadDeflection,
          workingDeflection: values.deflection,
        });
        setPreloadResult(preload);
      } else {
        setPreloadResult(null);
      }
      
      // 写入全局 store
      const geometry: CompressionGeometry = {
        type: "compression",
        wireDiameter: values.wireDiameter,
        meanDiameter: values.meanDiameter,
        activeCoils: values.activeCoils,
        totalCoils: values.totalCoils,
        freeLength: values.freeLength ?? 50,
        topGround: values.topGround ?? false,
        bottomGround: values.bottomGround ?? false,
        shearModulus: selectedMaterial.shearModulus,
        materialId: selectedMaterial.id,
      };
      
      const materialInfo: MaterialInfo = {
        id: selectedMaterial.id,
        name: selectedMaterial.nameEn,
        shearModulus: selectedMaterial.shearModulus,
        elasticModulus: selectedMaterial.elasticModulus ?? 200000,
        density: selectedMaterial.density ?? 7850,
        tensileStrength: selectedMaterial.tensileStrength,
        surfaceFactor: selectedMaterial.surfaceFactor,
        tempFactor: selectedMaterial.tempFactor,
      };
      
      const analysisResultData: AnalysisResult = {
        springRate: calc.k,
        springRateUnit: "N/mm",
        workingLoad: calc.load,
        shearStress: calc.shearStress,
        wahlFactor: calc.wahlFactor,
        springIndex: calc.springIndex,
        staticSafetyFactor: analysis.safetyFactor.sfStatic,
        fatigueSafetyFactor: analysis.fatigueLife?.sfInfiniteLife,
        fatigueLife: analysis.fatigueLife?.estimatedCycles,
        workingDeflection: values.deflection,
        maxDeflection: values.deflection,
      };
      
      setDesign({
        springType: "compression",
        geometry,
        material: materialInfo,
        analysisResult: analysisResultData,
        meta: {
          designCode: generateDesignCode(geometry),
        },
      });
      
    } catch (err) {
      setResult(null);
      setStressAnalysis(null);
      setPreloadResult(null);
      setError(err instanceof Error ? err.message : "Calculation failed");
    }
  };

  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Helical Compression Spring / 圆柱压缩弹簧</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Material Selector */}
            <MaterialSelector
              value={selectedMaterial.id}
              onChange={handleMaterialChange}
              showDetails={true}
            />

            {/* Wire Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code="d"
                label="Wire Diameter"
                description="线径 d，弹簧钢丝的直径。"
              />
              <Label htmlFor="wireDiameter">Wire Diameter d (mm) / 线径</Label>
              <Input
                id="wireDiameter"
                type="number"
                step="0.01"
                {...form.register("wireDiameter", { valueAsNumber: true })}
              />
              {form.formState.errors.wireDiameter && (
                <p className="text-sm text-red-500">{form.formState.errors.wireDiameter.message}</p>
              )}
            </div>

            {/* Mean Diameter */}
            <div className="space-y-2">
              <DimensionHint
                code="Dm"
                label="Mean Coil Diameter"
                description="中径 Dm = (外径 + 内径) / 2。"
              />
              <Label htmlFor="meanDiameter">Mean Diameter Dm (mm) / 中径</Label>
              <Input
                id="meanDiameter"
                type="number"
                step="0.1"
                {...form.register("meanDiameter", { valueAsNumber: true })}
              />
              {form.formState.errors.meanDiameter && (
                <p className="text-sm text-red-500">{form.formState.errors.meanDiameter.message}</p>
              )}
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
              {form.formState.errors.activeCoils && (
                <p className="text-sm text-red-500">{form.formState.errors.activeCoils.message}</p>
              )}
            </div>

            {/* Total Coils */}
            <div className="space-y-2">
              <Label htmlFor="totalCoils">Total Coils Nt / 总圈数</Label>
              <Input
                id="totalCoils"
                type="number"
                step="0.1"
                {...form.register("totalCoils", { valueAsNumber: true })}
              />
              {form.formState.errors.totalCoils && (
                <p className="text-sm text-red-500">{form.formState.errors.totalCoils.message}</p>
              )}
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
              {form.formState.errors.shearModulus && (
                <p className="text-sm text-red-500">{form.formState.errors.shearModulus.message}</p>
              )}
            </div>

            {/* Free Length */}
            <div className="space-y-2">
              <Label htmlFor="freeLength">Free Length L₀ (mm) / 自由长度 <span className="text-slate-400">(optional)</span></Label>
              <Input
                id="freeLength"
                type="number"
                step="0.1"
                {...form.register("freeLength", { valueAsNumber: true })}
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
              {form.formState.errors.deflection && (
                <p className="text-sm text-red-500">{form.formState.errors.deflection.message}</p>
              )}
            </div>

            {/* Preload Deflection */}
            <div className="space-y-2">
              <Label htmlFor="preloadDeflection">
                Preload x₀ (mm) / 预压缩量 <span className="text-slate-400">(optional)</span>
              </Label>
              <Input
                id="preloadDeflection"
                type="number"
                step="0.1"
                min="0"
                {...form.register("preloadDeflection", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Initial compression before working load / 工作载荷前的初始压缩量
              </p>
            </div>

            {/* Stress Ratio for Fatigue */}
            <div className="space-y-2">
              <Label htmlFor="stressRatio">
                Stress Ratio τ_min/τ_max / 应力比 <span className="text-slate-400">(for fatigue)</span>
              </Label>
              <Input
                id="stressRatio"
                type="number"
                step="0.05"
                min="0"
                max="1"
                {...form.register("stressRatio", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                0 = pulsating, 0.5 = partial reversal / 0=脉动，0.5=部分反向
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register("topGround")} /> Top ground / 顶端磨平
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" {...form.register("bottomGround")} /> Bottom ground / 底端磨平
              </label>
            </div>

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
            <div className="space-y-3">
              <ResultRow label="Spring Rate k (N/mm) / 刚度" value={formatNumber(result.k)} />
              <ResultRow label="Force F at Δx (N) / 载荷" value={formatNumber(result.load)} />
              <ResultRow label="Shear Stress τ (MPa) / 剪应力" value={formatNumber(result.shearStress)} />
              <ResultRow label="Spring Index C / 旋绕比" value={formatNumber(result.springIndex)} />
              <ResultRow label="Wahl Factor Kw / 曲度系数" value={formatNumber(result.wahlFactor)} />
              <ResultRow label="Total Coils Nt / 总圈数" value={formatNumber(form.getValues("totalCoils"))} />
              <ResultRow
                label="Ground Ends / 磨平端"
                value={
                  form.getValues("topGround") || form.getValues("bottomGround")
                    ? `${form.getValues("topGround") ? "Top" : ""}${
                        form.getValues("topGround") && form.getValues("bottomGround") ? " & " : ""
                      }${form.getValues("bottomGround") ? "Bottom" : ""}`
                    : "None"
                }
              />
            </div>
          ) : (
            <p className="text-sm text-slate-200">
              Input parameters and run the calculation to view stiffness, load, and stress results.
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
            <Button asChild variant="outline" className="w-full border-purple-600 text-purple-400 hover:bg-purple-950" disabled={!result}>
              <a href={cadExportUrl}>Export CAD / 导出 CAD</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stress Analysis Card */}
      {stressAnalysis && (
        <div className="md:col-span-2">
          <StressAnalysisCard
            stressCorrection={stressAnalysis.stressCorrection}
            safetyFactor={stressAnalysis.safetyFactor}
            fatigueLife={stressAnalysis.fatigueLife}
            preload={preloadResult ?? undefined}
          />
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-slate-50">{value}</span>
    </div>
  );
}
