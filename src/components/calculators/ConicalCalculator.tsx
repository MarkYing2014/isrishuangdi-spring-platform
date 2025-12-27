"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { type SubmitHandler, useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";

import {
  calculateLoadAndStress,
  calculateConicalSpringNonlinear,
  extractConicalStageTransitions,
  type ConicalNonlinearCurvePoint,
  type ConicalNonlinearResult,
} from "@/lib/springMath";
import { SpringDesign } from "@/lib/springTypes";
import { buildConicalDesignRuleReport } from "@/lib/designRules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { DimensionHint } from "./DimensionHint";
import { MaterialSelector } from "./MaterialSelector";
import { Calculator3DPreview } from "./Calculator3DPreview";
import { 
  useSpringDesignStore,
  type ConicalGeometry,
  type ConicalEndType,
  type MaterialInfo,
  type AnalysisResult,
  generateDesignCode,
} from "@/lib/stores/springDesignStore";
import {
  getDefaultSpringMaterial,
  getSpringMaterial,
  type SpringMaterial,
} from "@/lib/materials/springMaterials";
import { getDefaultConicalSample } from "@/lib/springPresets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";

interface FormValues {
  wireDiameter: number;
  largeDiameter: number;
  smallDiameter: number;
  activeCoils: number;
  totalCoils: number;
  freeLength: number;
  shearModulus: number;
  deflection: number;
  endType: ConicalEndType;
}

type CalculationResult = ReturnType<typeof calculateLoadAndStress> | null;

export function ConicalCalculator() {
  const router = useRouter();
  const [nonlinearResult, setNonlinearResult] = useState<ConicalNonlinearResult | null>(null);
  const [stageTransitions, setStageTransitions] = useState<ReturnType<typeof extractConicalStageTransitions> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"linear" | "nonlinear">("linear");
  const [isCalculatingNonlinear, setIsCalculatingNonlinear] = useState(false);
  
  // 全局设计存储
  const storedGeometry = useSpringDesignStore(state => state.geometry);
  const storedMaterial = useSpringDesignStore(state => state.material);
  const storedAnalysis = useSpringDesignStore(state => state.analysisResult);
  const setDesign = useSpringDesignStore(state => state.setDesign);
  const lastConicalGeometry = storedGeometry?.type === "conical" ? storedGeometry : null;
  const lastConicalAnalysis = lastConicalGeometry ? storedAnalysis : null;

  const designRuleReport = useMemo(() => {
    return buildConicalDesignRuleReport({
      geometry: lastConicalGeometry,
      analysisResult: lastConicalAnalysis,
      context: {
        nonlinearResult,
        nonlinearCurve: nonlinearResult?.curve ?? null,
      },
    });
  }, [lastConicalGeometry, lastConicalAnalysis, nonlinearResult]);
  
  // 从 store 恢复上次的计算结果
  const initialResult = useMemo<CalculationResult>(() => {
    if (lastConicalGeometry && lastConicalAnalysis) {
      const equivalentMeanDiameter = (lastConicalGeometry.largeOuterDiameter + lastConicalGeometry.smallOuterDiameter) / 2 
        - lastConicalGeometry.wireDiameter;
      return {
        k: lastConicalAnalysis.springRate,
        load: lastConicalAnalysis.workingLoad ?? 0,
        shearStress: lastConicalAnalysis.shearStress ?? 0,
        springIndex: lastConicalAnalysis.springIndex ?? equivalentMeanDiameter / lastConicalGeometry.wireDiameter,
        wahlFactor: lastConicalAnalysis.wahlFactor ?? 1.2,
      };
    }
    return null;
  }, [lastConicalGeometry, lastConicalAnalysis]);
  
  const [result, setResult] = useState<CalculationResult>(initialResult);
  const initialMaterial = useMemo<SpringMaterial>(() => {
    if (storedMaterial?.id) {
      return getSpringMaterial(storedMaterial.id) ?? getDefaultSpringMaterial();
    }
    return getDefaultSpringMaterial();
  }, [storedMaterial?.id]);

  const [selectedMaterial, setSelectedMaterial] = useState<SpringMaterial>(initialMaterial);
  
  // Derived: extract curve from nonlinear result
  const nonlinearCurve = nonlinearResult?.curve ?? null;

  const unifiedAudit = useMemo(() => {
    if (!lastConicalGeometry || !lastConicalAnalysis) return null;
    return AuditEngine.evaluate({
      springType: "conical",
      geometry: lastConicalGeometry,
      results: lastConicalAnalysis,
    });
  }, [lastConicalGeometry, lastConicalAnalysis]);

  // Get default sample for new users
  const defaultSample = getDefaultConicalSample();
  
  const form = useForm<FormValues>({
    defaultValues: {
      wireDiameter: lastConicalGeometry?.wireDiameter ?? defaultSample.wireDiameter,
      largeDiameter: lastConicalGeometry?.largeOuterDiameter ?? defaultSample.largeOuterDiameter,
      smallDiameter: lastConicalGeometry?.smallOuterDiameter ?? defaultSample.smallOuterDiameter,
      activeCoils: lastConicalGeometry?.activeCoils ?? defaultSample.activeCoils,
      totalCoils: lastConicalGeometry?.totalCoils ?? (defaultSample.activeCoils + 2),
      freeLength: lastConicalGeometry?.freeLength ?? defaultSample.freeLength,
      shearModulus: lastConicalGeometry?.shearModulus ?? defaultSample.shearModulus,
      deflection: lastConicalAnalysis?.workingDeflection ?? defaultSample.deflection,
      endType: lastConicalGeometry?.endType ?? "closed_ground",
    },
  });

  const handleMaterialChange = useCallback(
    (material: SpringMaterial) => {
      setSelectedMaterial(material);
      form.setValue("shearModulus", material.shearModulus);
    },
    [form]
  );

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

  // Update form when store hydrates or changes (fixes refresh issue)
  useEffect(() => {
    if (lastConicalGeometry) {
      const g = lastConicalGeometry;
      const a = lastConicalAnalysis;
      
      form.reset({
        wireDiameter: g.wireDiameter,
        largeDiameter: g.largeOuterDiameter,
        smallDiameter: g.smallOuterDiameter,
        activeCoils: g.activeCoils,
        totalCoils: g.totalCoils ?? g.activeCoils + 2,
        freeLength: g.freeLength,
        shearModulus: g.shearModulus ?? selectedMaterial.shearModulus ?? 79300,
        deflection: a?.workingDeflection ?? 15,
        endType: g.endType ?? "closed_ground",
      });

      if (g.materialId) {
        const mat = getSpringMaterial(g.materialId);
        if (mat) {
          setSelectedMaterial(mat);
        }
      }
    }
  }, [lastConicalGeometry, lastConicalAnalysis, form, selectedMaterial.shearModulus]);

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
      material: selectedMaterial.id,
    });
    return `/tools/analysis?${params.toString()}`;
  }, [watchedValues, selectedMaterial.id]);

  const cadExportUrl = useMemo(() => {
    const params = new URLSearchParams({
      type: "conical",
      d: watchedValues.wireDiameter?.toString() ?? "3",
      D1: watchedValues.largeDiameter?.toString() ?? "30",
      D2: watchedValues.smallDiameter?.toString() ?? "15",
      Na: watchedValues.activeCoils?.toString() ?? "6",
      Nt: watchedValues.totalCoils?.toString() ?? "7",
      L0: watchedValues.freeLength?.toString() ?? "50",
      endType: watchedValues.endType ?? "closed_ground",
      material: selectedMaterial.id,
      k: result?.k?.toString() ?? "",
      dx: watchedValues.deflection?.toString() ?? "15",
    });
    return `/tools/cad-export?${params.toString()}`;
  }, [watchedValues, result, selectedMaterial.id]);

  // 保存设计到全局 store
  const saveDesignToStore = useCallback((values: FormValues, calc: CalculationResult) => {
    const geometry: ConicalGeometry = {
      type: "conical",
      wireDiameter: values.wireDiameter,
      largeOuterDiameter: values.largeDiameter,
      smallOuterDiameter: values.smallDiameter,
      activeCoils: values.activeCoils,
      totalCoils: values.totalCoils,
      freeLength: values.freeLength,
      endType: values.endType,
      shearModulus: values.shearModulus,
      materialId: selectedMaterial.id,
    };
    
    const materialInfo: MaterialInfo = {
      id: selectedMaterial.id,
      name: selectedMaterial.nameEn,
      shearModulus: values.shearModulus,
      elasticModulus: selectedMaterial.elasticModulus ?? 207000,
      density: selectedMaterial.density ?? 7850,
    };
    
    const analysisResult: AnalysisResult = {
      springRate: calc?.k ?? 0,
      springRateUnit: "N/mm",
      workingLoad: calc?.load,
      shearStress: calc?.shearStress,
      springIndex: calc?.springIndex,
      wahlFactor: calc?.wahlFactor,
      workingDeflection: values.deflection,
    };
    
    setDesign({
      springType: "conical",
      geometry,
      material: materialInfo,
      analysisResult,
      meta: {
        designCode: generateDesignCode(geometry),
      },
    });
  }, [selectedMaterial, setDesign]);

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
      
      // 保存到全局 store
      saveDesignToStore(values, calc);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Calculation failed");
    }
  };

  const onCalculateNonlinear = async () => {
    setError(null);
    setMode("nonlinear");
    setResult(null);
    setIsCalculatingNonlinear(true);
    const values = form.getValues();

    try {
      // 模拟异步计算延迟，让用户看到加载状态
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
    } finally {
      setIsCalculatingNonlinear(false);
    }
  };

  const formatNumber = (value: number) => Number(value.toFixed(2)).toLocaleString();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2 space-y-6">
        <DesignRulePanel report={designRuleReport} title="Design Rules / 设计规则" />
        
        {unifiedAudit && (
          <EngineeringAuditCard 
            audit={unifiedAudit} 
            governingVariable="Δx" 
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Conical Spring / 圆锥弹簧</p>
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
              <Controller
                control={form.control}
                name="largeDiameter"
                render={({ field }) => (
                  <NumericInput
                    id="largeDiameter"
                    step={0.1}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
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
              <Controller
                control={form.control}
                name="smallDiameter"
                render={({ field }) => (
                  <NumericInput
                    id="smallDiameter"
                    step={0.1}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
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
              <Controller
                control={form.control}
                name="wireDiameter"
                render={({ field }) => (
                  <NumericInput
                    id="wireDiameter"
                    step={0.01}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
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
              <Controller
                control={form.control}
                name="freeLength"
                render={({ field }) => (
                  <NumericInput
                    id="freeLength"
                    step={0.1}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>

            {/* Active Coils */}
            <div className="space-y-2">
              <Label htmlFor="activeCoils">Active Coils Na / 有效圈数</Label>
              <Controller
                control={form.control}
                name="activeCoils"
                render={({ field }) => (
                  <NumericInput
                    id="activeCoils"
                    step={0.1}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>

            {/* Total Coils */}
            <div className="space-y-2">
              <DimensionHint
                code="Nt"
                label="Total Coils"
                description="总圈数，包括两端的死圈。通常 Nt = Na + 2（两端各 1 圈死圈）。"
              />
              <Label htmlFor="totalCoils">Total Coils Nt / 总圈数</Label>
              <Controller
                control={form.control}
                name="totalCoils"
                render={({ field }) => (
                  <NumericInput
                    id="totalCoils"
                    step={0.5}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>

            {/* End Type */}
            <div className="space-y-2">
              <DimensionHint
                code="End"
                label="End Type"
                description="端面形式：自然端（不磨平）、并紧（密绕但不磨平）、并紧磨平（密绕且磨平）。"
              />
              <Label>End Type / 端面形式</Label>
              <Select
                value={form.watch("endType")}
                onValueChange={(value: ConicalEndType) => form.setValue("endType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural / 自然端</SelectItem>
                  <SelectItem value="closed">Closed / 并紧</SelectItem>
                  <SelectItem value="closed_ground">Closed & Ground / 并紧磨平</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <MaterialSelector value={selectedMaterial.id} onChange={handleMaterialChange} showDetails={true} />

            {/* Shear Modulus */}
            <div className="space-y-2">
              <Label htmlFor="shearModulus">Shear Modulus G (MPa) / 剪切模量</Label>
              <Controller
                control={form.control}
                name="shearModulus"
                render={({ field }) => (
                  <NumericInput
                    id="shearModulus"
                    step={100}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    decimalScale={0}
                  />
                )}
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
              <Controller
                control={form.control}
                name="deflection"
                render={({ field }) => (
                  <NumericInput
                    id="deflection"
                    step={0.1}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button 
                type="submit" 
                className={`flex-1 transition-all duration-200 active:scale-95 ${
                  mode === "linear" && result 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : ""
                }`}
                disabled={form.formState.isSubmitting || isCalculatingNonlinear}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    计算中...
                  </>
                ) : mode === "linear" && result ? (
                  <>
                    <span className="mr-2">✓</span>
                    Linear / 已计算
                  </>
                ) : (
                  "Linear / 线性计算"
                )}
              </Button>
              <Button
                type="button"
                variant={mode === "nonlinear" && nonlinearResult ? "default" : "outline"}
                className={`flex-1 transition-all duration-200 active:scale-95 ${
                  mode === "nonlinear" && nonlinearResult 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : ""
                }`}
                onClick={onCalculateNonlinear}
                disabled={isCalculatingNonlinear || form.formState.isSubmitting}
              >
                {isCalculatingNonlinear ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    计算中...
                  </>
                ) : mode === "nonlinear" && nonlinearResult ? (
                  <>
                    <span className="mr-2">✓</span>
                    Nonlinear / 已计算
                  </>
                ) : (
                  "Nonlinear / 非线性曲线"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
        <CardHeader>
          <CardTitle>Results / 计算结果</CardTitle>
          {(result || nonlinearCurve) && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
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
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Note: Linear approximation using equivalent mean diameter.
                </p>
                <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
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
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    ⚠️ Max deflection exceeds total available travel before solid height.
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                    最大压缩量超过弹簧可压缩行程（到实心高度）。曲线已截止于 {nonlinearResult.clampedMaxDeflection.toFixed(2)} mm。
                  </p>
                </div>
              )}

              {/* Nonlinear Notice */}
              <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
                <p className="text-xs text-green-800 dark:text-green-200">
                  Nonlinear model: coils collapse progressively as deflection increases.
                </p>
                <p className="text-xs text-green-700/80 dark:text-green-300/80">
                  非线性模型：随压缩量增加，线圈逐步贴底。
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-400">
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
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Coil Collapse Stages / 圈贴底阶段:</p>
                <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white p-2 text-xs dark:border-slate-700 dark:bg-slate-800">
                  {stageTransitions.map((stage, idx) => (
                    <div key={idx} className="border-b border-slate-200 py-1.5 last:border-0 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          Stage {stage.stage}
                        </span>
                        <span className="text-emerald-700 dark:text-green-400">
                          k = {stage.stiffness.toFixed(2)} N/mm
                        </span>
                      </div>
                      <div className="mt-0.5 text-slate-700 dark:text-slate-300">
                        x = {stage.deflection.toFixed(2)} mm, active coils = {stage.activeCoils}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Curve Preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">F–Δx Curve Preview / 曲线预览:</p>
                <div className="h-24 rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
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
                    <div className="absolute bottom-0 left-0 text-[8px] text-slate-500 dark:text-slate-400">0</div>
                    <div className="absolute bottom-0 right-0 text-[8px] text-slate-500 dark:text-slate-400">
                      {nonlinearCurve[nonlinearCurve.length - 1]?.x.toFixed(1)}mm
                    </div>
                    <div className="absolute left-0 top-0 text-[8px] text-slate-500 dark:text-slate-400">
                      {nonlinearCurve[nonlinearCurve.length - 1]?.load.toFixed(0)}N
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!result && !nonlinearCurve && (
            <p className="text-sm text-slate-700 dark:text-slate-200">
              Input parameters and choose a calculation mode.
              <br />
              <span className="text-slate-600 dark:text-slate-400">输入参数并选择计算模式。</span>
            </p>
          )}

          {/* Action Buttons - 重新设计的按钮样式 */}
          <div className="space-y-3">
            {/* Generate 3D Model button hidden for now
            <Button 
              asChild 
              className="w-full bg-slate-700 hover:bg-slate-600 text-white border-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg" 
              disabled={!result && !nonlinearCurve}
            >
              <a href={simulatorUrl || "#"}>Generate 3D Model / 生成3D模型</a>
            </Button>
            */}
            <Button 
              variant="outline" 
              className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10"
              onClick={() => {
                const values = form.getValues();
                const calc = result; // Use current linear result if available
                saveDesignToStore(values, calc);
                router.push(analysisUrl);
              }}
            >
              Send to Engineering Analysis / 发送到工程分析
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10" 
              disabled={!result && !nonlinearResult}
              onClick={() => {
                const values = form.getValues();
                const calc = result;
                saveDesignToStore(values, calc);
                router.push(cadExportUrl);
              }}
            >
              Export CAD / 导出 CAD
            </Button>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">3D Preview / 3D 预览</p>
            <p className="mt-1 text-center text-xs text-slate-500">
              3D model uses equivalent cylindrical spring / 3D模型使用等效圆柱弹簧
            </p>
            <div className="mt-3">
              <Calculator3DPreview 
                expectedType="conical" 
                geometryOverride={{
                  type: "conical",
                  wireDiameter: watchedValues.wireDiameter ?? 3,
                  largeOuterDiameter: watchedValues.largeDiameter ?? 30,
                  smallOuterDiameter: watchedValues.smallDiameter ?? 15,
                  activeCoils: watchedValues.activeCoils ?? 6,
                  freeLength: watchedValues.freeLength ?? 50,
                  shearModulus: watchedValues.shearModulus ?? 79300,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={highlight ? "text-slate-900 dark:text-slate-200 font-medium" : "text-slate-700 dark:text-slate-300"}>
        {label}
      </span>
      <span className={highlight ? "font-bold text-emerald-700 dark:text-green-400" : "font-semibold text-slate-900 dark:text-slate-50"}>
        {value}
      </span>
    </div>
  );
}
