/**
 * Die Spring Calculator V1
 * 模具弹簧计算器 V1
 * 
 * Features:
 * - Input form for rectangular wire die spring geometry
 * - DesignRulePanel integration
 * - RiskRadar integration
 * - Temperature derating
 * - 3D preview (reuses compression spring visualizer)
 */

"use client";

import { useMemo, useState, useCallback, lazy, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cog, AlertTriangle, CheckCircle, XCircle, Thermometer, Loader2 } from "lucide-react";

import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { buildPipelineUrl } from "@/lib/pipeline/springPipelines";
import {
  useSpringDesignStore,
  type DieSpringGeometry as StoreDieSpringGeometry,
  type AnalysisResult as StoreAnalysisResult,
} from "@/lib/stores/springDesignStore";
import { mapDieMaterialToStoreMaterial } from "@/lib/engineering/dieSpring/materialAdapter";

import { Calculator3DPreview } from "@/components/calculators/Calculator3DPreview";

import {
  calculateDieSpring,
  computeDieSpringRisk,
  type DieSpringInput,
  type DieSpringMaterialType,
  type DieSpringEndStyle,
  type DieSpringDuty,
  DIE_SPRING_MATERIALS,
  DIE_SPRING_END_STYLES,
  DUTY_LABELS,
  DUTY_COLORS,
} from "@/lib/dieSpring";
import { buildDieSpringDesignRuleReport } from "@/lib/designRules/dieSpringRules";
import { buildDieSpringRiskRadar } from "@/lib/riskRadar/builders";

type DutyColor = "blue" | "red" | "gold" | "green";

const DUTY_TO_COLOR: Record<DieSpringDuty, DutyColor> = {
  LD: "blue",
  MD: "red",
  HD: "gold",
  XHD: "green",
};

interface DieSpringCalculatorProps {
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

export function DieSpringCalculator({ isZh: propIsZh }: DieSpringCalculatorProps) {
  const { language } = useLanguage();
  const isZh = propIsZh ?? (language === "zh");

  const router = useRouter();
  const setDesign = useSpringDesignStore((state) => state.setDesign);

  // Geometry state
  const [od_mm, setOd] = useState(25);
  const [freeLength_mm, setFreeLength] = useState(50);
  const [workingLength_mm, setWorkingLength] = useState(40);
  const [coils, setCoils] = useState(8);
  const [wire_b_mm, setWireB] = useState(4);
  const [wire_t_mm, setWireT] = useState(2);
  const [endStyle, setEndStyle] = useState<DieSpringEndStyle>("closed_ground");

  // Material state
  const [material, setMaterial] = useState<DieSpringMaterialType>("CHROME_ALLOY");

  // Duty and current height for risk visualization
  const [duty, setDuty] = useState<DieSpringDuty>("MD");
  const [currentHeight_mm, setCurrentHeight] = useState(workingLength_mm);

  // Operating conditions
  const [temperature_C, setTemperature] = useState<number | undefined>(undefined);
  const [holeDiameter_mm, setHoleDiameter] = useState<number | undefined>(undefined);
  const [rodDiameter_mm, setRodDiameter] = useState<number | undefined>(undefined);

  // Hydrate from store
  const storedGeometry = useSpringDesignStore(state => state.geometry);
  
  useEffect(() => {
    if (storedGeometry && storedGeometry.type === "dieSpring") {
      const g = storedGeometry as StoreDieSpringGeometry;
      setOd(g.outerDiameter);
      setFreeLength(g.freeLength);
      setWorkingLength(g.workingLength);
      setCoils(g.totalCoils);
      setWireB(g.wireWidth);
      setWireT(g.wireThickness);
      
      if (g.holeDiameter) setHoleDiameter(g.holeDiameter);
      if (g.rodDiameter) setRodDiameter(g.rodDiameter);
      if (g.materialId) {
         // Map material ID back to enum if possible, or just ignore for now as UI uses enum
         // This might be tricky if enum != id. 
         // For now, let's assume user re-selects or default.
      }
    }
  }, [storedGeometry]);


  // Build input object
  const input = useMemo<DieSpringInput>(() => ({
    geometry: {
      od_mm,
      freeLength_mm,
      workingLength_mm,
      coils,
      wire_b_mm,
      wire_t_mm,
      endStyle,
    },
    material,
    operating: {
      temperature_C,
      holeDiameter_mm,
      rodDiameter_mm,
    },
  }), [od_mm, freeLength_mm, workingLength_mm, coils, wire_b_mm, wire_t_mm, endStyle, material, temperature_C, holeDiameter_mm, rodDiameter_mm]);

  // Calculate result
  const result = useMemo(() => calculateDieSpring(input), [input]);

  // Design rules report
  const designRuleReport = useMemo(() => buildDieSpringDesignRuleReport(input, result), [input, result]);

  // Risk radar
  const riskRadar = useMemo(() => buildDieSpringRiskRadar({
    input,
    result,
  }), [input, result]);

  // Build URLs for pipeline navigation
  const designParams = useMemo(() => ({
    od: String(od_mm),
    L0: String(freeLength_mm),
    Lw: String(workingLength_mm),
    coils: String(coils),
    wire_b: String(wire_b_mm),
    wire_t: String(wire_t_mm),
    endStyle,
    material,
    temperature: temperature_C !== undefined ? String(temperature_C) : undefined,
    holeDia: holeDiameter_mm !== undefined ? String(holeDiameter_mm) : undefined,
    rodDia: rodDiameter_mm !== undefined ? String(rodDiameter_mm) : undefined,
  }), [od_mm, freeLength_mm, workingLength_mm, coils, wire_b_mm, wire_t_mm, endStyle, material, temperature_C, holeDiameter_mm, rodDiameter_mm]);

  const cadExportUrl = useMemo(() => 
    buildPipelineUrl("/tools/cad-export?type=dieSpring", designParams), 
    [designParams]
  );

  const dutyColor = DUTY_TO_COLOR[duty];

  const handleSendToEngineering = useCallback(() => {
    if (!result.ok) return;

    const materialInfo = mapDieMaterialToStoreMaterial(material);
    const designCode = `DS-${Math.round(od_mm)}-${Math.round(freeLength_mm)}-${Date.now()
      .toString(36)
      .toUpperCase()}`;
    const innerDiameter = Math.max(0, od_mm - 2 * wire_b_mm);

    const dieGeometry: StoreDieSpringGeometry = {
      type: "dieSpring",
      designCode,
      dutyColor,
      outerDiameter: od_mm,
      innerDiameter,
      freeLength: freeLength_mm,
      workingLength: workingLength_mm,
      totalCoils: coils,
      wireWidth: wire_b_mm,
      wireThickness: wire_t_mm,
      holeDiameter: holeDiameter_mm,
      rodDiameter: rodDiameter_mm,
      meanDiameter: result.meanDiameter_mm,
      solidHeight: result.solidHeight_mm,
      materialId: materialInfo.id,
    };

    const analysisResult: StoreAnalysisResult = {
      springRate: result.springRate_Nmm,
      springRateUnit: "N/mm",
      workingLoad: result.loadAtWorking_N,
      maxLoad: result.deratedLoad_N ?? result.loadAtWorking_N,
      shearStress: result.stress_MPa,
      maxStress: result.stress_MPa,
      springIndex: result.springIndex,
      workingDeflection: result.travel_mm,
      maxDeflection: result.travel_mm,
      solidHeight: result.solidHeight_mm,
    };

    setDesign({
      springType: "dieSpring",
      geometry: dieGeometry,
      material: materialInfo,
      analysisResult,
      meta: {
        designCode,
        updatedAt: new Date().toISOString(),
      },
    });

    const engineeringUrl = buildPipelineUrl("/tools/engineering/die-spring", {
      type: "die",
      designCode,
      od: String(od_mm),
      ID: innerDiameter ? String(innerDiameter) : undefined,
      L0: String(freeLength_mm),
      Lw: String(workingLength_mm),
      Nt: String(coils),
      b: String(wire_b_mm),
      t: String(wire_t_mm),
      dutyColor,
      material,
    });

    router.push(engineeringUrl);
  }, [
    result,
    material,
    od_mm,
    freeLength_mm,
    workingLength_mm,
    coils,
    wire_b_mm,
    wire_t_mm,
    holeDiameter_mm,
    rodDiameter_mm,
    dutyColor,
    setDesign,
    router,
  ]);

  // Compute deflection risk for visualization
  const deflectionRisk = useMemo(() => computeDieSpringRisk({
    duty,
    freeLength_mm,
    currentHeight_mm,
    springRate_Nmm: result.springRate_Nmm,
  }), [duty, freeLength_mm, currentHeight_mm, result.springRate_Nmm]);

  // Format number helper
  const fmt = (n: number | undefined, decimals = 2) => {
    if (n === undefined || !isFinite(n)) return "—";
    return n.toFixed(decimals);
  };

  const mat = DIE_SPRING_MATERIALS[material];

  return (
    <div className="space-y-6">
      {/* Design Rules Panel */}
      <DesignRulePanel
        report={designRuleReport}
        title={isZh ? "设计规范校核" : "Design Rule Check"}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            {isZh ? "模具弹簧计算器" : "Die Spring Calculator"}
            <Badge variant="outline" className="ml-2">V1</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isZh
              ? "矩形截面线材，高载荷模具应用"
              : "Rectangular wire, high-load tooling applications"}
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
                    <Label>{isZh ? "外径 OD (mm)" : "Outer Diameter OD (mm)"}</Label>
                    <NumericInput
                      value={od_mm}
                      onChange={(v) => setOd(v ?? 0)}
                      step={0.5}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "自由长度 L0 (mm)" : "Free Length L0 (mm)"}</Label>
                    <NumericInput
                      value={freeLength_mm}
                      onChange={(v) => setFreeLength(v ?? 0)}
                      step={1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "工作长度 Lw (mm)" : "Working Length Lw (mm)"}</Label>
                    <NumericInput
                      value={workingLength_mm}
                      onChange={(v) => setWorkingLength(v ?? 0)}
                      step={1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "总圈数" : "Total Coils"}</Label>
                    <NumericInput
                      value={coils}
                      onChange={(v) => setCoils(v ?? 0)}
                      step={0.5}
                      min={0}
                    />
                  </div>
                  {/* Smart Wire Section */}
                  <div className="col-span-2 space-y-2 border p-2 rounded bg-slate-50 dark:bg-slate-900/50">
                    <Label className="text-xs font-semibold text-muted-foreground">{isZh ? "线材截面 (b × t)" : "Wire Section (b × t)"}</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-[10px]">{isZh ? "宽度 b (mm)" : "Width b (mm)"}</Label>
                            <NumericInput
                                value={wire_b_mm}
                                onChange={(v) => setWireB(v ?? 0)}
                                step={0.1}
                                min={0}
                                placeholder="e.g. 4.0"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px]">{isZh ? "厚度 t (mm)" : "Thickness t (mm)"}</Label>
                            <NumericInput
                                value={wire_t_mm}
                                onChange={(v) => setWireT(v ?? 0)}
                                step={0.1}
                                min={0}
                                placeholder="e.g. 2.0"
                            />
                        </div>
                    </div>
                    {/* Paste Helper */}
                    <div className="flex gap-2">
                        <Input 
                            placeholder={isZh ? "粘贴规格如 '3.23*4.05'" : "Paste text like '3.23*4.05'"}
                            className="h-7 text-xs"
                            onChange={(e) => {
                                const val = e.target.value;
                                // Simple parser for "A x B" or "A*B" or "AxB"
                                const parts = val.replace(/[δ\s]/g, "").split(/[x×*]/i);
                                if (parts.length === 2) {
                                    const b = parseFloat(parts[0]);
                                    const t = parseFloat(parts[1]);
                                    if (!isNaN(b) && !isNaN(t)) {
                                        // Heuristic: usually b > t for die springs, but users might paste t x b
                                        // Let's assume standard "b x t" (Radial x Axial)? 
                                        // Or just take order.
                                        // User example: 3.23*4.05.
                                        setWireB(Math.max(b, t)); // User usually implies wider side is Width? 
                                        // Actually Die Springs are "Rectangular Wire". Width (Radial) and Thickness (Axial).
                                        // Let's just set b=0, t=1.
                                        setWireB(parts[0] ? parseFloat(parts[0]) : wire_b_mm);
                                        setWireT(parts[1] ? parseFloat(parts[1]) : wire_t_mm);
                                        e.target.value = ""; // Clear after paste
                                    }
                                }
                            }}
                        />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "端部形式" : "End Type"}</Label>
                    <Select value={endStyle} onValueChange={(v) => setEndStyle(v as DieSpringEndStyle)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(DIE_SPRING_END_STYLES) as DieSpringEndStyle[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {isZh ? DIE_SPRING_END_STYLES[key].nameZh : DIE_SPRING_END_STYLES[key].name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Material Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "材料" : "Material"}
                </h3>
                <div className="rounded-md border bg-muted/20 p-4">
                  <div className="space-y-1">
                    <Label>{isZh ? "材料类型" : "Material Type"}</Label>
                    <Select value={material} onValueChange={(v) => setMaterial(v as DieSpringMaterialType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(DIE_SPRING_MATERIALS).map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {isZh ? m.nameZh : m.name} ({m.yieldStrength_MPa} MPa)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {isZh ? "屈服强度" : "Yield"}: {mat.yieldStrength_MPa} MPa | 
                    {isZh ? " 最高温度" : " Max Temp"}: {mat.maxTemperature_C}°C
                  </div>
                </div>
              </div>

              {/* Duty & Risk Visualization Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "负荷等级 & 风险可视化" : "Duty Rating & Risk Visualization"}
                </h3>
                <div className="rounded-md border bg-muted/20 p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>{isZh ? "负荷等级" : "Duty Rating"}</Label>
                      <Select value={duty} onValueChange={(v) => setDuty(v as DieSpringDuty)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(["LD", "MD", "HD", "XHD"] as DieSpringDuty[]).map((d) => (
                            <SelectItem key={d} value={d}>
                              <span className="flex items-center gap-2">
                                <span 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: DUTY_COLORS[d] }}
                                />
                                {isZh ? DUTY_LABELS[d].zh : DUTY_LABELS[d].en}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{isZh ? "当前高度 H (mm)" : "Current Height H (mm)"}</Label>
                      <NumericInput
                        value={currentHeight_mm}
                        onChange={(v) => setCurrentHeight(v ?? 0)}
                        step={1}
                        min={result.solidHeight_mm || 0}
                        max={freeLength_mm}
                      />
                    </div>
                  </div>
                  {/* Current Height Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Hs: {fmt(result.solidHeight_mm)} mm</span>
                      <span>Hf: {freeLength_mm} mm</span>
                    </div>
                    <input
                      type="range"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      min={result.solidHeight_mm || 0}
                      max={freeLength_mm}
                      step={0.5}
                      value={currentHeight_mm}
                      onChange={(e) => setCurrentHeight(parseFloat(e.target.value))}
                    />
                  </div>
                  {/* Risk Status Display */}
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center p-2 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">{isZh ? "挠度" : "Deflection"}</div>
                      <div className="font-mono">{fmt(deflectionRisk.deflection_mm)} mm</div>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">{isZh ? "挠度比" : "Defl. Ratio"}</div>
                      <div className="font-mono">{fmt(deflectionRisk.deflectionRatio * 100, 1)}%</div>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <div className="text-xs text-muted-foreground">{isZh ? "载荷" : "Load"}</div>
                      <div className="font-mono">{fmt(deflectionRisk.load_N, 1)} N</div>
                    </div>
                    <div className={`text-center p-2 rounded ${
                      deflectionRisk.status === "OK" ? "bg-green-100 text-green-800" :
                      deflectionRisk.status === "WARNING" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      <div className="text-xs">{isZh ? "状态" : "Status"}</div>
                      <div className="font-semibold">{deflectionRisk.status}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operating Conditions Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Thermometer className="w-4 h-4" />
                  {isZh ? "工作条件（可选）" : "Operating Conditions (Optional)"}
                </h3>
                <div className="grid grid-cols-3 gap-3 rounded-md border bg-muted/20 p-4">
                  <div className="space-y-1">
                    <Label>{isZh ? "温度 (°C)" : "Temperature (°C)"}</Label>
                    <NumericInput
                      value={temperature_C ?? 0}
                      onChange={(v) => setTemperature(v)}
                      allowEmpty
                      decimalScale={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "导向孔径 (mm)" : "Hole Dia (mm)"}</Label>
                    <NumericInput
                      value={holeDiameter_mm ?? 0}
                      onChange={(v) => setHoleDiameter(v)}
                      allowEmpty
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "导向杆径 (mm)" : "Rod Dia (mm)"}</Label>
                    <NumericInput
                      value={rodDiameter_mm ?? 0}
                      onChange={(v) => setRodDiameter(v)}
                      allowEmpty
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons - 工程分析和CAD出图 */}
              <div className="space-y-3 pt-4 border-t">
                <Button
                  onClick={handleSendToEngineering}
                  disabled={!result.ok}
                  variant="outline"
                  className="w-full border-sky-500/50 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-sky-500/10 disabled:opacity-60"
                >
                  {isZh ? "发送到工程分析" : "Send to Engineering Analysis"}
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full border-violet-500/50 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400 hover:text-violet-300 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/10"
                  disabled={!result.ok}
                >
                  <a href={cadExportUrl}>
                    {isZh ? "导出 CAD 模型" : "Export CAD Model"}
                  </a>
                </Button>
              </div>
            </div>

            {/* Right: Results */}
            <div className="space-y-5">
              {/* 3D Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "3D 预览" : "3D Preview"}
                </h3>
                <div className="mt-3">
                  <Calculator3DPreview
                    expectedType="dieSpring"
                    geometryOverride={{
                      type: "dieSpring",
                      outerDiameter: od_mm,
                      wireThickness: wire_t_mm,
                      wireWidth: wire_b_mm,
                      totalCoils: coils,
                      freeLength: freeLength_mm,
                      endStyle: endStyle,
                      duty: duty,
                      risk: deflectionRisk.risk,
                    }}
                  />
                </div>
              </div>

              {/* Status Alert */}
              {!result.ok ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>{isZh ? "计算错误" : "Calculation Error"}</AlertTitle>
                  <AlertDescription>
                    {result.errors.join("; ")}
                  </AlertDescription>
                </Alert>
              ) : result.warnings.length > 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{isZh ? "警告" : "Warnings"}</AlertTitle>
                  <AlertDescription>
                    {result.warnings.join("; ")}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-500/50 bg-green-50/50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">
                    {isZh ? "设计有效" : "Design Valid"}
                  </AlertTitle>
                </Alert>
              )}

              {/* Primary Results */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "计算结果" : "Results"}
                </h3>
                <div className="space-y-2 rounded-md border bg-muted/20 p-4">
                  <ResultRow
                    label={isZh ? "行程 (L0 - Lw)" : "Travel (L0 - Lw)"}
                    value={fmt(result.travel_mm)}
                    unit="mm"
                  />
                  <ResultRow
                    label={isZh ? "刚度 k" : "Spring Rate k"}
                    value={fmt(result.springRate_Nmm, 3)}
                    unit="N/mm"
                  />
                  <ResultRow
                    label={isZh ? "工作载荷" : "Load @ Working"}
                    value={fmt(result.loadAtWorking_N)}
                    unit="N"
                  />
                  {result.deratedLoad_N !== undefined && (
                    <ResultRow
                      label={isZh ? "降额载荷" : "Derated Load"}
                      value={fmt(result.deratedLoad_N)}
                      unit="N"
                    />
                  )}
                </div>
              </div>

              {/* Geometry Results */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "几何参数" : "Geometry"}
                </h3>
                <div className="space-y-2 rounded-md border bg-muted/20 p-4">
                  <ResultRow
                    label={isZh ? "中径 Dm" : "Mean Diameter Dm"}
                    value={fmt(result.meanDiameter_mm)}
                    unit="mm"
                  />
                  <ResultRow
                    label={isZh ? "等效线径 d_eq" : "Equiv. Wire d_eq"}
                    value={fmt(result.equivalentWireDiameter_mm, 3)}
                    unit="mm"
                  />
                  <ResultRow
                    label={isZh ? "弹簧指数 C" : "Spring Index C"}
                    value={fmt(result.springIndex)}
                  />
                  <ResultRow
                    label={isZh ? "b/t 比" : "b/t Ratio"}
                    value={fmt(wire_b_mm / wire_t_mm)}
                  />
                </div>
              </div>

              {/* Stress Results */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "应力分析" : "Stress Analysis"}
                </h3>
                <div className="space-y-2 rounded-md border bg-muted/20 p-4">
                  <ResultRow
                    label={isZh ? "最大应力 σ" : "Max Stress σ"}
                    value={fmt(result.stress_MPa, 1)}
                    unit="MPa"
                  />
                  <ResultRow
                    label={isZh ? "应力/屈服比" : "Stress / Yield"}
                    value={fmt(result.stressRatio * 100, 1)}
                    unit="%"
                  />
                  <ResultRow
                    label={isZh ? "压缩比" : "Compression Ratio"}
                    value={fmt(result.compressionRatio * 100, 1)}
                    unit="%"
                  />
                  <ResultRow
                    label={isZh ? "细长比 L0/Dm" : "Slenderness L0/Dm"}
                    value={fmt(result.slendernessRatio)}
                  />
                  {result.tempLoadLossPct !== undefined && (
                    <ResultRow
                      label={isZh ? "温度载荷损失" : "Temp Load Loss"}
                      value={fmt(result.tempLoadLossPct, 1)}
                      unit="%"
                    />
                  )}
                </div>
              </div>

              {/* Risk Radar */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "风险雷达" : "Risk Radar"}
                </h3>
                <div className="rounded-md border bg-muted/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
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
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DieSpringCalculator;
