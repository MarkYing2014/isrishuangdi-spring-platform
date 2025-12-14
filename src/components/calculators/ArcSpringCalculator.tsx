"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Settings2, Circle, Layers, Activity, FileText } from "lucide-react";
import {
  ArcSpringInput,
  ArcSpringResult,
  HysteresisMode,
  SystemMode,
  MaterialKey,
  computeArcSpringCurve,
  getDefaultArcSpringInput,
  ARC_SPRING_MATERIALS,
  downloadArcSpringPDF,
} from "@/lib/arcSpring";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  step?: number;
  disabled?: boolean;
}

function NumberInput({ label, value, onChange, unit, min = 0, step = 0.1, disabled }: NumberInputProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">
        {label} {unit && <span className="text-xs">({unit})</span>}
      </Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        step={step}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}

export function ArcSpringCalculator() {
  const [input, setInput] = useState<ArcSpringInput>(getDefaultArcSpringInput());
  const [mounted, setMounted] = useState(false);
  const [calculated, setCalculated] = useState(true); // 默认显示示例数据的计算结果
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<ArcSpringResult>(() => computeArcSpringCurve(getDefaultArcSpringInput()));

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateInput = <K extends keyof ArcSpringInput>(key: K, value: ArcSpringInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }));
    setCalculated(false); // 参数变化后，标记为未计算
  };

  const updateSpring2 = <K extends keyof ArcSpringInput>(key: K, value: ArcSpringInput[K]) => {
    setInput((prev) => ({
      ...prev,
      spring2: { ...prev.spring2, [key]: value },
    }));
    setCalculated(false);
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    // 模拟短暂延迟，让用户看到计算状态
    setTimeout(() => {
      const newResult = computeArcSpringCurve(input);
      setResult(newResult);
      setCalculated(true);
      setIsCalculating(false);
    }, 100);
  };

  const chartData = useMemo(() => {
    if (!calculated) return [];
    return result.curve.map((p) => ({
      deltaDeg: p.deltaDeg.toFixed(1),
      M_load: p.M_load,
      M_unload: p.M_unload,
      alphaDeg: p.alphaDeg.toFixed(1),
      F: p.F.toFixed(1),
      x: p.x.toFixed(2),
    }));
  }, [result.curve, calculated]);

  const isDual = input.systemMode === "dual_parallel" || input.systemMode === "dual_staged";

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {result.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Cards */}
        <div className="space-y-4">
          {/* Geometry Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Geometry / 几何参数
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <NumberInput
                label="Wire Diameter d"
                value={input.d}
                onChange={(v) => updateInput("d", v)}
                unit="mm"
                step={0.1}
              />
              <NumberInput
                label="Mean Coil Diameter D"
                value={input.D}
                onChange={(v) => updateInput("D", v)}
                unit="mm"
                step={1}
              />
              <NumberInput
                label="Active Coils n"
                value={input.n}
                onChange={(v) => updateInput("n", v)}
                step={0.5}
              />
            </CardContent>
          </Card>

          {/* Arc Layout Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Arc Layout / 弧形布局
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">
                    Working Radius r <span className="text-xs">(mm)</span>
                  </Label>
                  <Input
                    type="number"
                    value={input.r}
                    onChange={(e) => updateInput("r", parseFloat(e.target.value) || 0)}
                    min={0}
                    step={1}
                    className="h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ⚠️ 力臂长度，非角度！Distance from flywheel center to spring axis.
                  </p>
                </div>
                <NumberInput
                  label="Free Angle α₀"
                  value={input.alpha0}
                  onChange={(v) => updateInput("alpha0", v)}
                  unit="deg"
                  step={1}
                />
                <NumberInput
                  label="Coil Bind Angle αc"
                  value={input.alphaC}
                  onChange={(v) => updateInput("alphaC", v)}
                  unit="deg"
                  step={1}
                />
              </div>
              
              {/* Space Constraints */}
              <div className="pt-2 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Space Constraints / 空间约束 (可选)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput
                    label="Max Housing Diameter"
                    value={input.maxHousingDiameter ?? 0}
                    onChange={(v) => updateInput("maxHousingDiameter", v > 0 ? v : undefined)}
                    unit="mm"
                    step={1}
                  />
                  <NumberInput
                    label="Min Clearance"
                    value={input.minClearance ?? 1}
                    onChange={(v) => updateInput("minClearance", v)}
                    unit="mm"
                    step={0.5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Material / 材料
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Material Standard</Label>
                <Select
                  value={input.materialKey}
                  onValueChange={(v) => updateInput("materialKey", v as MaterialKey)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARC_SPRING_MATERIALS.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {input.materialKey === "CUSTOM" && (
                <NumberInput
                  label="Shear Modulus G"
                  value={input.G_override ?? 80000}
                  onChange={(v) => updateInput("G_override", v)}
                  unit="N/mm²"
                  step={1000}
                />
              )}
            </CardContent>
          </Card>

          {/* Hysteresis & System Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Hysteresis & System / 迟滞与系统
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Hysteresis Mode</Label>
                  <Select
                    value={input.hysteresisMode ?? "none"}
                    onValueChange={(v) => updateInput("hysteresisMode", v as HysteresisMode)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (无迟滞)</SelectItem>
                      <SelectItem value="constant">Constant Tf (恒定摩擦)</SelectItem>
                      <SelectItem value="proportional">Proportional (比例摩擦)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {input.hysteresisMode === "constant" && (
                  <NumberInput
                    label="Friction Torque Tf"
                    value={input.Tf_const ?? 0}
                    onChange={(v) => updateInput("Tf_const", v)}
                    unit="N·mm"
                    step={100}
                  />
                )}

                {input.hysteresisMode === "proportional" && (
                  <NumberInput
                    label="Friction Coefficient cf"
                    value={input.cf ?? 0}
                    onChange={(v) => updateInput("cf", v)}
                    step={0.01}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">System Mode</Label>
                  <Select
                    value={input.systemMode ?? "single"}
                    onValueChange={(v) => updateInput("systemMode", v as SystemMode)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single (单级)</SelectItem>
                      <SelectItem value="dual_parallel">Dual Parallel (双级并联)</SelectItem>
                      <SelectItem value="dual_staged">Dual Staged (双级分段)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {input.systemMode === "dual_staged" && (
                  <NumberInput
                    label="Engage Angle"
                    value={input.engageAngle2 ?? 0}
                    onChange={(v) => updateInput("engageAngle2", v)}
                    unit="deg"
                    step={1}
                  />
                )}
              </div>

              {/* Spring 2 Parameters */}
              {isDual && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-3 block">Spring 2 Parameters / 第二弹簧参数</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <NumberInput
                      label="d₂"
                      value={input.spring2?.d ?? input.d}
                      onChange={(v) => updateSpring2("d", v)}
                      unit="mm"
                      step={0.1}
                    />
                    <NumberInput
                      label="D₂"
                      value={input.spring2?.D ?? input.D}
                      onChange={(v) => updateSpring2("D", v)}
                      unit="mm"
                      step={1}
                    />
                    <NumberInput
                      label="n₂"
                      value={input.spring2?.n ?? input.n}
                      onChange={(v) => updateSpring2("n", v)}
                      step={0.5}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calculate Button */}
          <Button
            className="w-full h-12 text-base"
            onClick={handleCalculate}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <>
                <span className="mr-2 animate-spin">⏳</span>
                Calculating... / 计算中...
              </>
            ) : calculated ? (
              <>
                <span className="mr-2">✓</span>
                Calculated / 已计算
              </>
            ) : (
              "Calculate / 计算"
            )}
          </Button>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Results / 计算结果</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadArcSpringPDF(input, result)}
                disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
              >
                <FileText className="w-4 h-4 mr-1" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!calculated ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">请点击"Calculate / 计算"按钮查看结果</p>
                  <p className="text-xs mt-1">Click the Calculate button to see results</p>
                </div>
              ) : (
              <>
              {/* Primary Results - Rotational Stiffness (核心参数) */}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200">
                <div className="text-xs text-indigo-600 font-medium">Rotational Stiffness R / 旋转刚度 (核心参数)</div>
                <div className="text-2xl font-bold text-indigo-700">
                  {isFinite(result.R_deg) ? result.R_deg.toFixed(2) : "—"} <span className="text-sm font-normal">N·mm/deg</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Spring Rate k (切向)</div>
                  <div className="text-sm font-semibold">
                    {isFinite(result.k) ? result.k.toFixed(2) : "—"} N/mm
                  </div>
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">Max Angle Δα</div>
                  <div className="text-sm font-semibold">
                    {isFinite(result.deltaAlphaMax) ? result.deltaAlphaMax.toFixed(1) : "—"}°
                  </div>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-xs text-muted-foreground">Max Torque (Load)</div>
                  <div className="text-sm font-semibold text-blue-600">
                    {isFinite(result.MMax_load) ? result.MMax_load.toFixed(0) : "—"} N·mm
                  </div>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="text-xs text-muted-foreground">Max Torque (Unload)</div>
                  <div className="text-sm font-semibold text-orange-600">
                    {isFinite(result.MMax_unload) ? result.MMax_unload.toFixed(0) : "—"} N·mm
                  </div>
                </div>
              </div>

              {/* Geometry & Safety */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Geometry & Safety / 几何与安全</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="text-muted-foreground">De (外径)</div>
                    <div className="font-medium">{isFinite(result.De) ? result.De.toFixed(1) : "—"} mm</div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="text-muted-foreground">Di (内径)</div>
                    <div className="font-medium">{isFinite(result.Di) ? result.Di.toFixed(1) : "—"} mm</div>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <div className="text-muted-foreground">Safety Margin</div>
                    <div className="font-medium">{isFinite(result.safetyMarginToSolid) ? result.safetyMarginToSolid.toFixed(1) : "—"}°</div>
                  </div>
                </div>
                {result.housingClearance !== undefined && (
                  <div className={`mt-2 p-2 rounded text-xs ${result.housingClearance < (input.minClearance ?? 1) ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    Housing Clearance: {result.housingClearance.toFixed(1)} mm
                    {result.housingClearance < (input.minClearance ?? 1) ? ' ⚠️ Too small!' : ' ✓ OK'}
                  </div>
                )}
              </div>

              {/* Stress Analysis (Wahl Factor) */}
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Stress Analysis / 应力分析</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-rose-50 dark:bg-rose-950 rounded">
                    <div className="text-rose-600">Spring Index C</div>
                    <div className="font-medium text-rose-700">{isFinite(result.springIndex) ? result.springIndex.toFixed(2) : "—"}</div>
                  </div>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950 rounded">
                    <div className="text-rose-600">Wahl Factor K_W</div>
                    <div className="font-medium text-rose-700">{isFinite(result.wahlFactor) ? result.wahlFactor.toFixed(3) : "—"}</div>
                  </div>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950 rounded">
                    <div className="text-rose-600">τ_max (剪切应力)</div>
                    <div className="font-medium text-rose-700">{isFinite(result.tauMax) ? result.tauMax.toFixed(0) : "—"} MPa</div>
                  </div>
                </div>
              </div>

              {/* Hysteresis / Damping */}
              {input.hysteresisMode !== "none" && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Damping / 阻尼</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded">
                      <div className="text-xs text-purple-600">Hysteresis Work (阻尼能量)</div>
                      <div className="text-sm font-semibold text-purple-700">
                        {isFinite(result.hysteresisWork) ? result.hysteresisWork.toFixed(0) : "—"} N·mm·deg
                      </div>
                    </div>
                    <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded">
                      <div className="text-xs text-purple-600">Damping Capacity (阻尼效率)</div>
                      <div className="text-sm font-semibold text-purple-700">
                        {isFinite(result.dampingCapacity) ? result.dampingCapacity.toFixed(1) : "—"} %
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dual System Info */}
              {isDual && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Dual System / 双级系统</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {result.engageAngleMarker !== undefined && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded">
                        <div className="text-amber-600">Engage Angle (拐点)</div>
                        <div className="font-medium text-amber-700">{result.engageAngleMarker.toFixed(1)}°</div>
                      </div>
                    )}
                    {result.spring2Clearance !== undefined && (
                      <div className={`p-2 rounded ${result.spring2Clearance < (input.minClearance ?? 1) ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        <div>Spring Clearance</div>
                        <div className="font-medium">{result.spring2Clearance.toFixed(1)} mm</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </>
              )}
            </CardContent>
          </Card>

          {/* Chart Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Torque–Angle Curve / 扭矩-角度曲线</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {!mounted || !calculated ? (
                  <div className="h-full w-full flex items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                    {!calculated ? "Click Calculate to view chart" : "Loading chart..."}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="deltaDeg"
                        label={{ value: "Δα (deg)", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        label={{ value: "M (N·mm)", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded p-2 shadow-sm text-xs">
                                <div>Δα: {data.deltaDeg}°</div>
                                <div className="text-blue-600">M_load: {Number(data.M_load).toFixed(0)} N·mm</div>
                                <div className="text-orange-600">M_unload: {Number(data.M_unload).toFixed(0)} N·mm</div>
                                <div>F: {data.F} N</div>
                                <div>x: {data.x} mm</div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="M_load"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        name="Load"
                      />
                      <Line
                        type="monotone"
                        dataKey="M_unload"
                        stroke="#ea580c"
                        strokeWidth={2}
                        dot={false}
                        name="Unload"
                      />

                      {/* Engage marker */}
                      {result.engageAngleMarker !== undefined && (
                        <ReferenceLine x={result.engageAngleMarker.toFixed(1)} stroke="#f59e0b" strokeDasharray="4 4" />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {input.hysteresisMode === "none"
                  ? "No hysteresis - Loading and Unloading curves overlap"
                  : "Hysteresis loop shows friction effect between loading and unloading"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ArcSpringCalculator;
