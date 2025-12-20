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

import { useMemo, useState, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Cog, AlertTriangle, CheckCircle, XCircle, Thermometer, Loader2 } from "lucide-react";

import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";

const DieSpringVisualizer = lazy(() => import("@/components/three/DieSpringVisualizer"));

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

export function DieSpringCalculator({ isZh = false }: DieSpringCalculatorProps) {
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
        title={isZh ? "设计规则 / Design Rules" : "Design Rules"}
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
                    <Input
                      type="number"
                      value={od_mm}
                      onChange={(e) => setOd(parseFloat(e.target.value) || 0)}
                      step={0.5}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "自由长度 L0 (mm)" : "Free Length L0 (mm)"}</Label>
                    <Input
                      type="number"
                      value={freeLength_mm}
                      onChange={(e) => setFreeLength(parseFloat(e.target.value) || 0)}
                      step={1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "工作长度 Lw (mm)" : "Working Length Lw (mm)"}</Label>
                    <Input
                      type="number"
                      value={workingLength_mm}
                      onChange={(e) => setWorkingLength(parseFloat(e.target.value) || 0)}
                      step={1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "总圈数" : "Total Coils"}</Label>
                    <Input
                      type="number"
                      value={coils}
                      onChange={(e) => setCoils(parseFloat(e.target.value) || 0)}
                      step={0.5}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "线材宽度 b (mm)" : "Wire Width b (mm)"}</Label>
                    <Input
                      type="number"
                      value={wire_b_mm}
                      onChange={(e) => setWireB(parseFloat(e.target.value) || 0)}
                      step={0.1}
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "线材厚度 t (mm)" : "Wire Thickness t (mm)"}</Label>
                    <Input
                      type="number"
                      value={wire_t_mm}
                      onChange={(e) => setWireT(parseFloat(e.target.value) || 0)}
                      step={0.1}
                      min={0}
                    />
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
                      <Input
                        type="number"
                        value={currentHeight_mm}
                        onChange={(e) => setCurrentHeight(parseFloat(e.target.value) || workingLength_mm)}
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
                    <Input
                      type="number"
                      value={temperature_C ?? ""}
                      onChange={(e) => setTemperature(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="20"
                      step={10}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "导向孔径 (mm)" : "Hole Dia (mm)"}</Label>
                    <Input
                      type="number"
                      value={holeDiameter_mm ?? ""}
                      onChange={(e) => setHoleDiameter(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="—"
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{isZh ? "导向杆径 (mm)" : "Rod Dia (mm)"}</Label>
                    <Input
                      type="number"
                      value={rodDiameter_mm ?? ""}
                      onChange={(e) => setRodDiameter(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="—"
                      step={0.5}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Results */}
            <div className="space-y-5">
              {/* 3D Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">
                  {isZh ? "3D 预览" : "3D Preview"}
                </h3>
                <div className="h-[280px] rounded-md border bg-white overflow-hidden">
                  <Suspense
                    fallback={
                      <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                      </div>
                    }
                  >
                    <DieSpringVisualizer
                      outerDiameter={od_mm}
                      wireThickness={wire_t_mm}
                      wireWidth={wire_b_mm}
                      coils={coils}
                      freeLength={freeLength_mm}
                      endStyle={endStyle}
                      duty={duty}
                      risk={deflectionRisk.risk}
                      autoRotate={true}
                      backgroundColor="#ffffff"
                    />
                  </Suspense>
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
                    label="b/t"
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
