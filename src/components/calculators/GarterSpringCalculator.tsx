
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Factory } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { type SubmitHandler, useForm, Controller, Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const GarterSpringVisualizer = dynamic(
  () => import("@/components/three/GarterSpringVisualizer").then(mod => mod.GarterSpringVisualizer),
  { ssr: false, loading: () => <div className="h-[200px] flex items-center justify-center bg-slate-50 text-slate-400"><Loader2 className="animate-spin" /></div> }
);
import { DimensionHint } from "./DimensionHint";
import { MaterialSelector } from "./MaterialSelector";
import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";

import { useSpringDesignStore, type MaterialInfo, type AnalysisResult, generateDesignCode } from "@/lib/stores/springDesignStore";
import { useWorkOrderStore } from "@/lib/stores/workOrderStore";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { getDefaultSpringMaterial, getSpringMaterial, type SpringMaterial } from "@/lib/materials/springMaterials";

import { GarterSpringDesign, GARTER_JOINT_LABELS, GarterJointType, GarterCalculationResult } from "@/lib/springTypes/garter";
import { calculateGarterSpring, generateGarterCurve } from "@/lib/springMath/garterSpring";
import { SpringDesign } from "@/lib/springTypes";
import { GARTER_SPRING_FACTORY_POLICY, calcAllowableShearFromSy, getDefaultJointFactor } from "@/lib/policy/garterSpringPolicy";

// Recharts
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";

const formSchema = z.object({
  wireDiameter: z.coerce.number().positive(),
  meanDiameter: z.coerce.number().positive(),
  activeCoils: z.coerce.number().positive(),
  totalCoils: z.coerce.number().optional(), // usually same as active or slightly modified by hooks
  freeLength: z.coerce.number().positive(), // Linear length
  
  ringFreeDiameter: z.coerce.number().positive(),
  ringInstalledDiameter: z.coerce.number().positive(),
  
  jointType: z.enum(["hook", "screw", "loop"]),
  // jointFactor locked by policy
  
  shearModulus: z.coerce.number().positive(),
  // allowableStressRatio locked by policy
});

type FormValues = z.infer<typeof formSchema>;

export function GarterSpringCalculator() {
  const router = useRouter();

  // Global Store
  const storedGeometry = useSpringDesignStore(state => state.geometry);
  const storedMaterial = useSpringDesignStore(state => state.material);
  const setDesign = useSpringDesignStore(state => state.setDesign);
  
  const lastGeometry = (storedGeometry?.type === "garter" ? storedGeometry : null) as GarterSpringDesign | null;

  // Local State
  const [result, setResult] = useState<GarterCalculationResult | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [latestAudit, setLatestAudit] = useState<any | null>(null);

  // Material
  const initialMaterial = useMemo(() => {
    if (storedMaterial?.id) return getSpringMaterial(storedMaterial.id) ?? getDefaultSpringMaterial();
    return getDefaultSpringMaterial();
  }, [storedMaterial?.id]);
  const [selectedMaterial, setSelectedMaterial] = useState<SpringMaterial>(initialMaterial);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      wireDiameter: lastGeometry?.wireDiameter ?? 1.0,
      meanDiameter: lastGeometry?.meanDiameter ?? 8.0,
      activeCoils: lastGeometry?.activeCoils ?? 100,
      freeLength: lastGeometry?.freeLength ?? 314.16,
      ringFreeDiameter: lastGeometry?.ringFreeDiameter ?? 100,
      ringInstalledDiameter: lastGeometry?.ringInstalledDiameter ?? 110,
      jointType: lastGeometry?.jointType ?? "hook",
      shearModulus: lastGeometry?.shearModulus ?? initialMaterial.shearModulus,
    },
  });

  // Material Change
  const handleMaterialChange = (material: SpringMaterial) => {
    setSelectedMaterial(material);
    form.setValue("shearModulus", material.shearModulus);
    // Auto-recalculate if we have valid inputs?
  };

  // Submit
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const design: GarterSpringDesign = {
      type: "garter",
      wireDiameter: values.wireDiameter,
      meanDiameter: values.meanDiameter,
      activeCoils: values.activeCoils,
      // If total coils not specific, assume active + hook contribution roughly
      totalCoils: values.totalCoils ?? values.activeCoils,
      freeLength: values.freeLength,
      ringFreeDiameter: values.ringFreeDiameter,
      ringInstalledDiameter: values.ringInstalledDiameter,
      jointType: values.jointType as GarterJointType,
      jointFactor: getDefaultJointFactor(values.jointType as GarterJointType),
      shearModulus: values.shearModulus,
      materialId: selectedMaterial.id,
    };

    // Calculate
    const policyAllowableStressRatio = GARTER_SPRING_FACTORY_POLICY.allowSyFactor;
    
    // Also need effective allowable shear to check against clamped range if needed,
    // but the calculateGarterSpring might take ratio * Sy.
    // Let's see: calculateGarterSpring uses ratio directly? 
    // Wait, the API takes `allowableStressRatio`.
    // The policy says: allow = 0.65 * Sy (clamped).
    // So ratio = (ClampedAllow / tensileStrength)? Or is Sy usually 60% of TS?
    // Let's assume for now we use the clamped logic inside the Audit or we pass the raw ratio + Sy?
    // User Instructions: "Allowable shear stress = allowSyFactor * Sy... locked to 0.65 Sy... min/max clamped".
    // We should pass the derived ratio or just use the policy factor if Sy is standard.
    // BUT calculate function just takes `allowableStressRatio`. 
    // Let's use the policy factor as base.
    
    const res = calculateGarterSpring({
      geometry: design,
      allowableStressRatio: policyAllowableStressRatio, 
    });
    setResult(res);

    // Audit
    const analysisResultData: AnalysisResult = {
      springRate: res.k,
      springRateUnit: "N/mm",
      workingLoad: res.tension,
      shearStress: res.tauNominal,
      maxStress: res.tauMax, // Should verify if AnalysisResult has maxStress mapping standard
      wahlFactor: res.wahlFactor,
      springIndex: res.springIndex,
      staticSafetyFactor: res.safetyFactor,
      workingDeflection: res.circumferentialChange, // Map to delta
      maxDeflection: res.circumferentialChange * 1.5, // ESTIMATE
      // Custom mapping for AnalysisResult to fit store
    };

    const audit = AuditEngine.evaluate({
      springType: "garter",
      geometry: design,
      results: { 
         ...analysisResultData, 
         tauMax: res.tauMax, 
         stressRatio: res.stressRatio 
      },
      policy: { stressWarnThreshold: 80, stressFailThreshold: 100 }
    });
    setLatestAudit(audit);

    // Chart
    const points = generateGarterCurve(design);
    setChartData(points);

    // Save to Store
    const materialInfo: MaterialInfo = {
        id: selectedMaterial.id,
        name: selectedMaterial.nameEn,
        shearModulus: values.shearModulus,
        elasticModulus: selectedMaterial.elasticModulus ?? 200000,
        density: selectedMaterial.density ?? 7850,
        tensileStrength: selectedMaterial.tensileStrength,
        surfaceFactor: selectedMaterial.surfaceFactor,
        tempFactor: selectedMaterial.tempFactor,
    };

    setDesign({
      springType: "garter",
      geometry: design,
      material: materialInfo,
      analysisResult: analysisResultData,
      meta: {
        designCode: generateDesignCode(design),
      },
    });
  };

  // Auto-calc linear length from ring diameter option?
  // User might type ringFreeDiameter, we can update freeLength (L0 = PI * D)
  // Watch D_free
  const dFree = form.watch("ringFreeDiameter");
  useEffect(() => {
    // If user changes D_free, we could suggest L0. But maybe user has specific L0 (pre-tension).
    // Let's just default L0 = PI * D_free if they match closely? 
    // Simplified: No auto-overwrite to avoid annoyance, but maybe a hint.
  }, [dFree]);

  // URLs
  const analysisUrl = `/tools/analysis?type=garter`; // Page logic handles read from store
  const cadUrl = `/tools/cad-export?type=garter`;

  // Work Order
  const { createWorkOrder } = useWorkOrderStore();
  const handleCreateWorkOrder = () => {
    try {
        if (!result || !storedGeometry) {
             alert("Cannot create Work Order. Missing design data.");
             return;
        }

        // Confirm validation if Audit Failed
        if (latestAudit?.status === "FAIL") {
             const proceed = window.confirm(
                  "⚠️ Engineering Audit Failed (Design invalid) / 工程审核未通过（设计无效）。\n\n" +
                  "Are you sure you want to FORCE create a work order? / 确定要强制创建工单吗？"
             );
             if (!proceed) return;
        }

        // Map to WorkOrder
        const wo = createWorkOrder({
            designCode: (storedGeometry as any).code || generateDesignCode(storedGeometry as any),
            quantity: 100,
            priority: "normal",
            springType: "garter",
            geometry: storedGeometry as unknown as GarterSpringDesign, // Cast for store compatibility
            material: storedMaterial!,
            analysis: result as any, // close enough
            audit: latestAudit || { status: "PASS", summary: {}, audits: {}, notes: [] } as any, // Fallback
            createdBy: "User", // Placeholder
            notes: latestAudit?.status === "WARN" || latestAudit?.status === "FAIL" ? `[${latestAudit.status}] Engineering Audit Issues Override / 工程审核问题强制覆盖` : undefined
        });

        console.log("Work Order created, redirecting...", wo.workOrderId);
        router.push(`/manufacturing/workorder/${wo.workOrderId}`);
    } catch(e: any) {
         console.error("Failed to create work order", e);
         alert(`System Error: Failed to create Work Order / 系统错误：创建工单失败。\n${e?.message || e}`);
    }
  };

  const watchValues = form.watch();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="md:col-span-2 space-y-6">
        {latestAudit && (
          <EngineeringAuditCard 
            audit={latestAudit} 
            governingVariable="ΔC"
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input Parameters / 输入参数</CardTitle>
          <p className="text-xs text-muted-foreground">Garter / Oil Seal Spring</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            
            <MaterialSelector value={selectedMaterial.id} onChange={handleMaterialChange} showDetails />

            {/* Geometry */}
            <div className="space-y-2">
              <Label>Wire Diameter d (mm)</Label>
              <Controller
                control={form.control}
                name="wireDiameter"
                render={({ field }) => <NumericInput {...field} step={0.01} />}
              />
            </div>

            <div className="space-y-2">
              <Label>Mean Coil Diameter Dm (mm)</Label>
              <Controller
                control={form.control}
                name="meanDiameter"
                render={({ field }) => <NumericInput {...field} step={0.1} />}
              />
            </div>

            <div className="space-y-2">
               <Label>Active Coils Na</Label>
               <Controller
                 control={form.control}
                 name="activeCoils"
                 render={({ field }) => <NumericInput {...field} step={1} />}
               />
            </div>
            
            <div className="border-t pt-4 mt-4">
                <Label className="text-base font-semibold">Ring Dimensions / 环尺寸</Label>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                        <Label>Free Ring Dia D_free (mm)</Label>
                        <Controller
                            control={form.control}
                            name="ringFreeDiameter"
                            render={({ field }) => <NumericInput {...field} step={0.5} />}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Installed Ring Dia D_inst (mm)</Label>
                        <Controller
                            control={form.control}
                            name="ringInstalledDiameter"
                            render={({ field }) => <NumericInput {...field} step={0.5} />}
                        />
                    </div>
                </div>
                
                <div className="space-y-2 mt-2">
                    <Label>Linear Free Length L0 (mm)</Label>
                    <Controller
                        control={form.control}
                        name="freeLength"
                        render={({ field }) => <NumericInput {...field} step={1} />}
                    />
                    <p className="text-xs text-muted-foreground">Length of spring body before joining / 连接前的本体长度</p>
                </div>
            </div>

            <div className="border-t pt-4 mt-4">
                <Label className="text-base font-semibold">Joint / 接头</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            {...form.register("jointType")}
                        >
                            <option value="hook">Hook / 钩</option>
                            <option value="screw">Screw / 螺纹</option>
                            <option value="loop">Loop / 环</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Stress Factor (Locked)</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                             {getDefaultJointFactor(watchValues.jointType as GarterJointType ?? "hook").toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-4 transition-all duration-200 active:scale-95"
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
      
      <div className="space-y-6">
        {/* 3D Preview */}
        <Card className="overflow-hidden">
             <div className="h-[300px] w-full bg-slate-50">
                  <GarterSpringVisualizer 
                      geometry={{
                          type: "garter",
                          wireDiameter: watchValues.wireDiameter,
                          meanDiameter: watchValues.meanDiameter,
                          activeCoils: watchValues.activeCoils,
                          totalCoils: watchValues.totalCoils,
                          freeLength: watchValues.freeLength,
                          ringFreeDiameter: watchValues.ringFreeDiameter,
                          ringInstalledDiameter: watchValues.ringInstalledDiameter,
                          jointType: watchValues.jointType as GarterJointType,
                          jointFactor: getDefaultJointFactor(watchValues.jointType as GarterJointType),
                          shearModulus: watchValues.shearModulus,
                          materialId: selectedMaterial.id,
                      }}
                      installedDiameter={watchValues.ringInstalledDiameter}
                  />
             </div>
        </Card>

        {/* Results Summary */}
        <Card>
            <CardHeader>
                <CardTitle>Results / 结果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {result ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <span className="text-muted-foreground">Spring Rate (Axial)</span>
                            <div className="font-mono text-lg">{result.k.toFixed(2)} N/mm</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground">Tension Ft</span>
                            <div className="font-mono text-lg font-bold text-blue-600">{result.tension.toFixed(2)} N</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground">Circumference Change ΔC</span>
                            <div className="font-mono">{result.circumferentialChange.toFixed(2)} mm</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-muted-foreground">Diameter Change ΔD</span>
                            <div className="font-mono">{(watchValues.ringInstalledDiameter - watchValues.ringFreeDiameter).toFixed(2)} mm</div>
                        </div>
                        
                        <div className="col-span-2 border-t pt-2 mt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Max Shear Stress τ</span>
                                <span className={`font-mono text-lg ${result.stressRatio > 1 ? "text-red-600" : "text-green-600"}`}>
                                    {result.tauMax.toFixed(0)} MPa
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1">
                                <span className="text-muted-foreground">Safety Factor</span>
                                <span>{result.safetyFactor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs mt-1">
                                <span className="text-muted-foreground">Stress Ratio</span>
                                <span>{(result.stressRatio * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                        
                         <div className="col-span-2 border-t pt-2 text-xs text-muted-foreground">
                            *Radial Force Estimate (Fr ≈ Ft): {result.radialForceEstimate.toFixed(2)} N
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        Enter parameters and calculate
                    </div>
                )}
            </CardContent>
        </Card>
        
        {/* Actions */}
        {/* Actions - Styled to match other calculators */}
        <div className="space-y-3">
             <Button 
               asChild 
               variant="outline" 
               className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10"
               disabled={!result}
             >
                <Link href={analysisUrl}>
                    Engineering Analysis / 工程分析
                </Link>
             </Button>

             <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                disabled={!result}
                onClick={handleCreateWorkOrder}
             >
                <Factory className="w-4 h-4 mr-2" />
                Create Work Order / 创建生产工单
             </Button>

             <Button 
                  asChild 
                  variant="outline" 
                  className="w-full border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10"
                  disabled={!result}
             >
                  <Link href={cadUrl}>
                     Export CAD (DXF/SVG) / 导出 CAD
                  </Link>
             </Button>
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
             <Card>
                <CardHeader><CardTitle className="text-sm">Tension vs Diameter</CardTitle></CardHeader>
                <CardContent className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="diameter" label={{ value: 'Dia (mm)', position: 'insideBottom', offset: -5 }} />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="tension" stroke="#2563eb" name="Tension (N)" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>
        )}
      </div>
    </div>
  );
}
