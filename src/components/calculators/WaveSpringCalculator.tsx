/**
 * Wave Spring Calculator V1
 * 波形弹簧计算器 V1
 * 
 * Features:
 * - Input form for wave spring geometry
 * - DesignRulePanel integration
 * - RiskRadar integration
 * - Key derived outputs: travel, k, load@Hw
 */

"use client";

import { useMemo, useState, lazy, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Waves, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { buildPipelineUrl } from "@/lib/pipeline/springPipelines";

import {
  calculateWaveSpring,
  getDefaultWaveSpringInput,
  DEFAULT_WAVE_SPRING_MATERIAL,
  type WaveSpringInput,
  type WaveSpringGeometry,
  type WaveSpringMode,
} from "@/lib/waveSpring/math";
import { buildWaveSpringDesignRuleReport } from "@/lib/designRules/waveSpringRules";
import { buildWaveRiskRadar } from "@/lib/riskRadar/builders";
import { useSpringDesignStore } from "@/lib/stores/springDesignStore";
import { computeAxialTravel, waveTravel } from "@/lib/travel/AxialTravelModel";
import { Info, Factory } from "lucide-react";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";
import { useWorkOrderStore } from "@/lib/stores/workOrderStore";
import { generateDesignCode } from "@/lib/stores/springDesignStore";

import { Calculator3DPreview } from "./Calculator3DPreview";
import { SavedDesignManager } from "@/components/analysis/SavedDesignManager";

interface WaveSpringCalculatorProps {
  isZh?: boolean;
}

function ResultRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">
        {value}
        {unit && <span className="ml-1 text-muted-foreground">{unit}</span>}
      </span>
    </div>
  );
}

export function WaveSpringCalculator({ isZh: propIsZh }: WaveSpringCalculatorProps) {
  const router = useRouter();
  const setDesign = useSpringDesignStore((state) => state.setDesign);
  const { language } = useLanguage();
  const isZh = propIsZh ?? (language === "zh");
  // Geometry state
  const [id, setId] = useState(20);
  const [od, setOd] = useState(30);
  const [thickness_t, setThickness] = useState(0.5);
  const [radialWall_b, setRadialWall] = useState(4);
  const [turns_Nt, setTurns] = useState(5);
  const [wavesPerTurn_Nw, setWavesPerTurn] = useState(3);
  const [freeHeight_Hf, setFreeHeight] = useState(10);
  const [workingHeight_Hw, setWorkingHeight] = useState(7);

  // Material state
  const [materialId, setMaterialId] = useState(DEFAULT_WAVE_SPRING_MATERIAL.id);
  const [E_MPa, setE] = useState(DEFAULT_WAVE_SPRING_MATERIAL.E_MPa);

  // Mode state (for future use)
  const [mode, setMode] = useState<WaveSpringMode>("loadAtWorkingHeight");

  // Global store for hydration
  const storedGeometry = useSpringDesignStore(state => state.geometry);

  useEffect(() => {
    if (storedGeometry && storedGeometry.type === "wave") {
      const g = storedGeometry as any; // Cast to WaveGeometry if explicit type available, using 'any' for now to match file imports
      // Update local state
      setId(g.id);
      setOd(g.od);
      setThickness(g.thickness_t);
      setRadialWall(g.radialWall_b);
      setTurns(g.turns_Nt);
      setWavesPerTurn(g.wavesPerTurn_Nw);
      setFreeHeight(g.freeHeight_Hf);
      setWorkingHeight(g.workingHeight_Hw);
      
      if (g.materialId) {
        setMaterialId(g.materialId); 
        // Note: E is separate in this component state, but might be derived from materialId change.
        // We might need to look up material properties or store E in geometry.
        // Assuming user will re-select if needed or E propagates from material logic if connected.
        // For now just setting ID which drives material object in input useMemo.
      }
    }
  }, [storedGeometry]);

  // Build input object
  const input = useMemo<WaveSpringInput>(() => ({
    units: "mm",
    geometry: {
      id,
      od,
      thickness_t,
      radialWall_b,
      turns_Nt,
      wavesPerTurn_Nw,
      freeHeight_Hf,
      workingHeight_Hw,
    },
    material: {
      id: materialId,
      E_MPa,
      name: DEFAULT_WAVE_SPRING_MATERIAL.name,
    },
    targets: {
      mode,
    },
  }), [id, od, thickness_t, radialWall_b, turns_Nt, wavesPerTurn_Nw, freeHeight_Hf, workingHeight_Hw, materialId, E_MPa, mode]);

  // Calculate result
  const result = useMemo(() => calculateWaveSpring(input), [input]);

  // Design rules report
  const designRuleReport = useMemo(() => buildWaveSpringDesignRuleReport({ input, result }), [input, result]);

  // Risk radar
  const riskRadar = useMemo(() => buildWaveRiskRadar({ input, result }), [input, result]);

  // Unified Travel Model (Phase 4)
  const travelDerived = useMemo(() => {
    // Solid height policy
    const solidHeight = turns_Nt * thickness_t;
    return computeAxialTravel(
      waveTravel(freeHeight_Hf, workingHeight_Hw),
      { hardLimit: freeHeight_Hf - solidHeight }
    );
  }, [freeHeight_Hf, workingHeight_Hw, turns_Nt, thickness_t]);

  const unifiedAudit = useMemo(() => {
    if (!result) return null;
    return AuditEngine.evaluate({
      springType: "wave",
      geometry: input.geometry,
      results: {
        ...result,
        travel_mm: travelDerived.delta,
        maxTravel: freeHeight_Hf - (turns_Nt * thickness_t),
        // Map wave specific terms to audit engine expectations
        maxStress: result.stressMax_MPa,
        allowableStress: (result as any).allowableStress_MPa || 1200, // Fallback
      }
    });
  }, [result, input.geometry, travelDerived.delta, freeHeight_Hf, turns_Nt, thickness_t]);

  // Phase 5: Auto-sync to global store to enable Save/Export/Analysis
  useEffect(() => {
    if (result && result.isValid) {
      setDesign({
        springType: "wave",
        geometry: {
          type: "wave",
          ...input.geometry
        },
        material: {
          id: materialId as any,
          name: input.material?.name || "17-7PH",
          elasticModulus: E_MPa,
          shearModulus: E_MPa / (2 * (1 + 0.3)), // estimate
          density: 7800,
        },
        analysisResult: {
          springRate: result.springRate_Nmm,
          springRateUnit: "N/mm",
          workingLoad: result.loadAtWorkingHeight_N,
          maxStress: result.stressMax_MPa,
          springIndex: result.meanDiameter_mm / thickness_t,
          workingDeflection: result.travel_mm,
          maxDeflection: result.travel_mm, // Synchronize for unified audit
        }
      });
    }
  }, [result, input.geometry, materialId, E_MPa, input.material?.name, thickness_t, setDesign]);

  // Build URLs for pipeline navigation
  const designParams = useMemo(() => ({
    id: String(id),
    od: String(od),
    t: String(thickness_t),
    b: String(radialWall_b),
    Nt: String(turns_Nt),
    Nw: String(wavesPerTurn_Nw),
    Hf: String(freeHeight_Hf),
    Hw: String(workingHeight_Hw),
    E: String(E_MPa),
    material: materialId,
  }), [id, od, thickness_t, radialWall_b, turns_Nt, wavesPerTurn_Nw, freeHeight_Hf, workingHeight_Hw, E_MPa, materialId]);

  const analysisUrl = useMemo(() => 
    buildPipelineUrl("/tools/engineering/wave-spring", designParams), 
    [designParams]
  );

  const cadExportUrl = useMemo(() => 
    buildPipelineUrl("/tools/cad-export?type=wave", designParams), 
    [designParams]
  );

  const handleSendToEngineering = () => {
    setDesign({
      springType: "wave",
      geometry: {
        type: "wave",
        ...input.geometry
      },
      material: {
        id: materialId as any,
        name: input.material?.name || "17-7PH",
        elasticModulus: E_MPa,
        shearModulus: E_MPa / (2 * (1 + 0.3)), // estimate
        density: 7800,
      },
      analysisResult: {
        springRate: result.springRate_Nmm,
        springRateUnit: "N/mm",
        workingLoad: result.loadAtWorkingHeight_N,
        maxStress: result.stressMax_MPa,
        springIndex: result.meanDiameter_mm / thickness_t,
        workingDeflection: result.travel_mm,
      }
    });
    router.push(analysisUrl);
  };

  const handleExportCad = () => {
    setDesign({
      springType: "wave",
      geometry: {
        type: "wave",
        ...input.geometry
      },
      material: {
        id: materialId as any,
        name: input.material?.name || "17-7PH",
        elasticModulus: E_MPa,
        shearModulus: E_MPa / (2 * (1 + 0.3)), // estimate
        density: 7800,
      },
      analysisResult: {
        springRate: result.springRate_Nmm,
        springRateUnit: "N/mm",
        workingLoad: result.loadAtWorkingHeight_N,
        maxStress: result.stressMax_MPa,
        springIndex: result.meanDiameter_mm / thickness_t,
        workingDeflection: result.travel_mm,
      }
    });
    router.push(cadExportUrl);
  };

  const handleSaveToHistory = () => {
    // We already have handleSendToEngineering which sets the current design.
    // We can also trigger a save here or just let the SavedDesignManager handle it.
  };

  // Format number helper
  const fmt = (n: number, decimals = 2) => {
    if (!isFinite(n)) return "—";
    return n.toFixed(decimals);
  };

  return (
    <div className="space-y-6">
      {/* Design Rules Panel */}
      <DesignRulePanel
        report={designRuleReport}
        title={isZh ? "设计规则 / Design Rules" : "Design Rules"}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Waves className="w-5 h-5" />
            {isZh ? "波形弹簧计算器" : "Wave Spring Calculator"}
            <Badge variant="outline" className="ml-2">V1</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isZh
              ? "轴向承载，超薄安装高度 / Crest-to-crest wave spring"
              : "Axial load, ultra-low height / Crest-to-crest wave spring"}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Input Form */}
            <div className="space-y-5">
              {/* Geometry Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "几何参数" : "Geometry"}
                </h3>
                <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/20 p-4">
                  <div className="space-y-1">
                    <Label>{isZh ? "内径 ID (mm)" : "Inner Diameter ID (mm)"}</Label>
                    <NumericInput
                      value={id}
                      onChange={(v) => setId(v ?? 0)}
                      step={0.1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "外径 OD (mm)" : "Outer Diameter OD (mm)"}</Label>
                    <NumericInput
                      value={od}
                      onChange={(v) => setOd(v ?? 0)}
                      step={0.1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "厚度 t (mm)" : "Thickness t (mm)"}</Label>
                    <NumericInput
                      value={thickness_t}
                      onChange={(v) => setThickness(v ?? 0)}
                      step={0.01}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "径向壁宽 b (mm)" : "Radial Wall b (mm)"}</Label>
                    <NumericInput
                      value={radialWall_b}
                      onChange={(v) => setRadialWall(v ?? 0)}
                      step={0.1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "圈数 Nt" : "Turns Nt"}</Label>
                    <NumericInput
                      value={turns_Nt}
                      onChange={(v) => setTurns(v ?? 1)}
                      step={1}
                      min={1}
                      decimalScale={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "每圈波数 Nw" : "Waves/Turn Nw"}</Label>
                    <NumericInput
                      value={wavesPerTurn_Nw}
                      onChange={(v) => setWavesPerTurn(v ?? 1)}
                      step={1}
                      min={1}
                      decimalScale={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "自由高度 Hf (mm)" : "Free Height Hf (mm)"}</Label>
                    <NumericInput
                      value={freeHeight_Hf}
                      onChange={(v) => setFreeHeight(v ?? 0)}
                      step={0.1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "工作高度 Hw (mm)" : "Working Height Hw (mm)"}</Label>
                    <NumericInput
                      value={workingHeight_Hw}
                      onChange={(v) => setWorkingHeight(v ?? 0)}
                      step={0.1}
                      min={0}
                    />
                  </div>
                </div>

                {/* Unified Engineering Audit Card */}
                {unifiedAudit && (
                  <EngineeringAuditCard 
                    audit={unifiedAudit} 
                    governingVariable="Δx" 
                  />
                )}
              </div>

              {/* Material Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "材料" : "Material"}
                </h3>
                <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/20 p-4">
                  <div className="space-y-1">
                    <Label>{isZh ? "材料" : "Material"}</Label>
                    <Select value={materialId} onValueChange={setMaterialId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="17-7PH">17-7PH Stainless Steel</SelectItem>
                        <SelectItem value="302SS">302 Stainless Steel</SelectItem>
                        <SelectItem value="Inconel">Inconel X-750</SelectItem>
                        <SelectItem value="BeCu">Beryllium Copper</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "弹性模量 E (MPa)" : "Elastic Modulus E (MPa)"}</Label>
                    <NumericInput
                      value={E_MPa}
                      onChange={(v) => setE(v ?? 0)}
                      step={1000}
                      min={0}
                      decimalScale={0}
                    />
                  </div>
                </div>
              </div>

              {/* Errors and Warnings */}
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="w-4 h-4" />
                  <AlertTitle>{isZh ? "错误" : "Errors"}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 space-y-1 text-xs">
                      {result.errors.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {result.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertTitle>{isZh ? "警告" : "Warnings"}</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-1 space-y-1 text-xs">
                      {result.warnings.map((warn, i) => (
                        <li key={i}>• {warn}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* V2 Placeholder */}
              <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                {isZh
                  ? "V2 预留：子类型选择（波形垫圈 / 多圈嵌套）"
                  : "V2 Reserved: Subtype selection (wave washer / multi-turn nested)"}
              </div>

              {/* Action Buttons - 工程分析和CAD出图 */}
              <div className="space-y-3 pt-4 border-t">
                <Button 
                  onClick={handleSendToEngineering}
                  variant="outline" 
                   className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10"
                >
                  {isZh ? "发送到工程分析 / Engineering Analysis" : "Send to Engineering Analysis / 发送到工程分析"}
                </Button>
                
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                  disabled={!unifiedAudit || unifiedAudit.status === "FAIL"}
                  onClick={() => {
                    if (!result || !result.isValid || !unifiedAudit) return;
                    
                    // Create Work Order
                    const store = useWorkOrderStore.getState();
                    const wo = store.createWorkOrder({
                      designCode: generateDesignCode({type: "wave", ...input.geometry}),
                      springType: "wave",
                      geometry: { type: "wave", ...input.geometry },
                      material: {
                        id: materialId as any,
                        name: input.material?.name || "17-7PH",
                        shearModulus: E_MPa / (2 * (1 + 0.3)),
                        elasticModulus: E_MPa,
                        density: 7800,
                        tensileStrength: 1200, // Approximate for stainless/inconel in wave springs if not provided
                        surfaceFactor: 1.0,
                        tempFactor: 1.0,
                      },
                      analysis: {
                        springRate: result.springRate_Nmm,
                        springRateUnit: "N/mm",
                        workingLoad: result.loadAtWorkingHeight_N,
                        maxStress: result.stressMax_MPa,
                        springIndex: result.meanDiameter_mm / thickness_t,
                        workingDeflection: result.travel_mm,
                        maxDeflection: result.travel_mm,
                      },
                      audit: unifiedAudit,
                      quantity: 1000,
                      createdBy: "Engineer",
                      notes: unifiedAudit.status === "WARN" ? "Warning: Engineering audit has warnings. Review required." : undefined
                    });
                    
                    window.location.href = `/manufacturing/workorder/${wo.workOrderId}`;
                  }}
                >
                  <Factory className="w-4 h-4 mr-2" />
                  {isZh ? "创建生产工单 / Create Work Order" : "Create Work Order / 创建生产工单"}
                </Button>
                <Button 
                  onClick={handleExportCad}
                  variant="outline" 
                  className="w-full border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10"
                  disabled={!result.isValid}
                >
                  {isZh ? "导出 CAD / Export CAD" : "Export CAD / 导出 CAD"}
                </Button>
                
                <div className="flex justify-center py-2">
                  <SavedDesignManager />
                </div>
              </div>
            </div>

            {/* Right: Results and Risk Radar */}
            <div className="space-y-5">
              {/* Key Results */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {result.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    {isZh ? "计算结果" : "Results"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ResultRow
                    label={isZh ? "有效行程 Δs" : "Used Travel Δs"}
                    value={fmt(travelDerived.delta)}
                    unit="mm"
                  />
                  <ResultRow
                    label={isZh ? "刚度 k" : "Spring Rate k"}
                    value={fmt(result.springRate_Nmm, 3)}
                    unit="N/mm"
                  />
                  <ResultRow
                    label={isZh ? "工作高度载荷" : "Load @ Hw"}
                    value={fmt(result.loadAtWorkingHeight_N)}
                    unit="N"
                  />
                  <div className="border-t pt-3 mt-3">
                    <ResultRow
                      label={isZh ? "中径 Dm" : "Mean Diameter Dm"}
                      value={fmt(result.meanDiameter_mm)}
                      unit="mm"
                    />
                    <ResultRow
                      label={isZh ? "波幅" : "Wave Amplitude"}
                      value={fmt(result.waveAmplitude_mm, 3)}
                      unit="mm"
                    />
                    <ResultRow
                      label={isZh ? "总波数" : "Total Waves"}
                      value={result.totalWaves.toString()}
                    />
                    <ResultRow
                      label={isZh ? "最大应力 σ" : "Max Stress σ"}
                      value={fmt(result.stressMax_MPa, 1)}
                      unit="MPa"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 3D Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {isZh ? "3D 预览" : "3D Preview"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mt-3">
                    <Calculator3DPreview 
                      expectedType="wave" 
                      geometryOverride={{
                        type: "wave",
                        id,
                        od,
                        thickness_t,
                        radialWall_b,
                        turns_Nt,
                        wavesPerTurn_Nw,
                        freeHeight_Hf,
                        workingHeight_Hw,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Risk Radar Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {isZh ? "风险雷达" : "Risk Radar"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {isZh ? "总体状态" : "Overall Status"}
                    </span>
                    <Badge
                      className={
                        riskRadar.overallStatus === "ENGINEERING_OK"
                          ? "bg-green-600"
                          : riskRadar.overallStatus === "MANUFACTURING_RISK"
                          ? "bg-yellow-500 text-black"
                          : "bg-red-600"
                      }
                    >
                      {riskRadar.overallStatus === "ENGINEERING_OK"
                        ? isZh ? "工程通过" : "OK"
                        : riskRadar.overallStatus === "MANUFACTURING_RISK"
                        ? isZh ? "制造风险" : "Mfg Risk"
                        : isZh ? "高风险" : "High Risk"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">{isZh ? "工程" : "Eng"}</div>
                      <Badge
                        variant="outline"
                        className={
                          riskRadar.dimensions.engineering.status === "OK"
                            ? "border-green-500 text-green-600"
                            : riskRadar.dimensions.engineering.status === "WARN"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-red-500 text-red-600"
                        }
                      >
                        {riskRadar.dimensions.engineering.status}
                      </Badge>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">{isZh ? "制造" : "Mfg"}</div>
                      <Badge
                        variant="outline"
                        className={
                          riskRadar.dimensions.manufacturing.status === "OK"
                            ? "border-green-500 text-green-600"
                            : riskRadar.dimensions.manufacturing.status === "WARN"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-red-500 text-red-600"
                        }
                      >
                        {riskRadar.dimensions.manufacturing.status}
                      </Badge>
                    </div>
                    <div className="rounded border p-2">
                      <div className="text-muted-foreground">{isZh ? "质量" : "Quality"}</div>
                      <Badge
                        variant="outline"
                        className={
                          riskRadar.dimensions.quality.status === "OK"
                            ? "border-green-500 text-green-600"
                            : riskRadar.dimensions.quality.status === "WARN"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-red-500 text-red-600"
                        }
                      >
                        {riskRadar.dimensions.quality.status}
                      </Badge>
                    </div>
                  </div>
                  {riskRadar.findings.length > 0 && (
                    <div className="mt-2 space-y-1 text-xs">
                      {riskRadar.findings.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge
                            variant="outline"
                            className={
                              f.level === "ERROR"
                                ? "border-red-500 text-red-600"
                                : f.level === "WARNING"
                                ? "border-yellow-500 text-yellow-600"
                                : "border-blue-500 text-blue-600"
                            }
                          >
                            {f.level}
                          </Badge>
                          <span>{isZh ? f.title.zh : f.title.en}</span>
                        </div>
                      ))}
                      {riskRadar.findings.length > 3 && (
                        <div className="text-muted-foreground">
                          +{riskRadar.findings.length - 3} {isZh ? "更多" : "more"}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WaveSpringCalculator;
