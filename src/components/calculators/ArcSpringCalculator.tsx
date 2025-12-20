"use client";

import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Settings2, Circle, Layers, Activity, FileText, Printer, Download } from "lucide-react";
import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { ArcSpringAdvancedPanel } from "@/components/calculators/ArcSpringAdvancedPanel";
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
  printArcSpringReport,
} from "@/lib/arcSpring";
import { buildArcSpringDesignRuleReport } from "@/lib/designRules";
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

const ArcSpringVisualizer = dynamic(
  () => import("@/components/three/ArcSpringMesh").then((mod) => mod.ArcSpringVisualizer),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        Loading 3D...
      </div>
    ),
  }
);

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
        className="h-9 arc-no-spinner"
      />
    </div>
  );
}

interface SliderNumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}

function SliderNumberInput({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step,
  disabled,
}: SliderNumberInputProps) {
  const safeMax = Math.max(min, max);
  const [expandedMax, setExpandedMax] = useState(safeMax);

  useEffect(() => {
    setExpandedMax((prev) => Math.max(prev, safeMax));
  }, [safeMax]);

  useEffect(() => {
    if (!isFinite(value)) return;
    if (value > expandedMax) setExpandedMax(value);
  }, [value, expandedMax]);

  const effectiveMax = Math.max(min, expandedMax);
  const sliderValue = Math.min(Math.max(value, min), effectiveMax);
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <Label className="text-sm text-muted-foreground">
          {label} {unit && <span className="text-xs">({unit})</span>}
        </Label>
        <Input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          step={step}
          disabled={disabled}
          className="h-9 w-28 arc-no-spinner"
        />
      </div>
      <Slider
        value={[sliderValue]}
        min={min}
        max={effectiveMax}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        disabled={disabled}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>
          {min}{unit ? ` ${unit}` : ""}
        </span>
        <span>
          {effectiveMax}{unit ? ` ${unit}` : ""}
        </span>
      </div>
    </div>
  );
}
type ArcIssueField =
  | "d"
  | "D"
  | "n"
  | "r"
  | "alpha0"
  | "alphaC"
  | "countParallel"
  | "maxHousingDiameter"
  | "minClearance"
  | "hysteresisMode"
  | "Tf_const"
  | "cf"
  | "systemMode"
  | "engageAngle2";

export function ArcSpringCalculator() {
  const [input, setInput] = useState<ArcSpringInput>(getDefaultArcSpringInput());
  const [mounted, setMounted] = useState(false);
  const [calculated, setCalculated] = useState(true); // 默认显示示例数据的计算结果
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<ArcSpringResult>(() => computeArcSpringCurve(getDefaultArcSpringInput()));
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [highlightField, setHighlightField] = useState<ArcIssueField | null>(null);
  const [highlightSeq, setHighlightSeq] = useState(0);
  const [showDeadCoils, setShowDeadCoils] = useState(false);
  const [deadCoilsPerEnd, setDeadCoilsPerEnd] = useState(1);
  const [deadTightnessK, setDeadTightnessK] = useState(2);
  const [deadTightnessSigma, setDeadTightnessSigma] = useState(0.08);
  const [allowableTau, setAllowableTau] = useState(800);
  const [allowableTauFatigue, setAllowableTauFatigue] = useState(500);
  const [showStressColors, setShowStressColors] = useState(false);
  const [stressBeta, setStressBeta] = useState(0.25);

  const designRuleReport = useMemo(
    () =>
      buildArcSpringDesignRuleReport(input, {
        showDeadCoils,
        deadCoilsPerEnd,
      }),
    [input, showDeadCoils, deadCoilsPerEnd]
  );

  const hasRuleError = designRuleReport.summary.status === "FAIL";

  useEffect(() => {
    setMounted(true);
  }, []);

  const fieldRefs = React.useRef<Partial<Record<ArcIssueField, HTMLDivElement | null>>>({});
  const setFieldRef = (field: ArcIssueField) => (el: HTMLDivElement | null) => {
    fieldRefs.current[field] = el;
  };

  const jumpToField = (field: ArcIssueField) => {
    const el = fieldRefs.current[field];
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    const focusable = el.querySelector<HTMLElement>("input, select, textarea, button");
    focusable?.focus();

    setHighlightField(field);
    setHighlightSeq((x) => x + 1);
  };

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

  const fastCheck = useMemo(() => {
    const tauMax = result?.tauMax;
    const sf = isFinite(tauMax) && tauMax > 0 ? allowableTau / tauMax : NaN;
    const sfFatigue = isFinite(tauMax) && tauMax > 0 ? allowableTauFatigue / tauMax : NaN;
    const status: "green" | "yellow" | "red" =
      isFinite(sf) && sf >= 1.5 ? "green" : isFinite(sf) && sf >= 1.0 ? "yellow" : "red";
    return { tauMax, sf, sfFatigue, status };
  }, [result, allowableTau, allowableTauFatigue]);

  useEffect(() => {
    if (!autoCalculate) return;
    if (hasRuleError) return;
    setIsCalculating(true);
    const t = setTimeout(() => {
      const newResult = computeArcSpringCurve(input);
      setResult(newResult);
      setCalculated(true);
      setIsCalculating(false);
    }, 300);
    return () => clearTimeout(t);
  }, [autoCalculate, input, hasRuleError]);

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
      <style jsx>{`
        :global(.arc-no-spinner::-webkit-outer-spin-button),
        :global(.arc-no-spinner::-webkit-inner-spin-button) {
          -webkit-appearance: none;
          margin: 0;
        }
        :global(.arc-no-spinner) {
          appearance: textfield;
          -moz-appearance: textfield;
        }

        @keyframes arcFieldFlash {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.0);
            background: transparent;
          }
          20% {
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.45);
            background: rgba(59, 130, 246, 0.06);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.0);
            background: transparent;
          }
        }

        :global(.arc-field-highlight) {
          border-radius: 10px;
          animation: arcFieldFlash 1600ms ease-out;
        }
      `}</style>

      <DesignRulePanel
        report={designRuleReport}
        title="Design Rules / 设计规则"
        subheader={
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {autoCalculate ? "Auto-calculate enabled (300ms debounce)" : "Manual calculate mode"}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={autoCalculate}
                onChange={(e) => setAutoCalculate(e.target.checked)}
              />
              Auto / 自动
            </label>
          </div>
        }
        onFindingClick={(f) => {
          const field = (f.evidence as { field?: unknown } | undefined)?.field;
          if (typeof field === "string") jumpToField(field as ArcIssueField);
        }}
      />

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
              <div
                ref={setFieldRef("d")}
                className={highlightField === "d" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
              >
                <SliderNumberInput
                  label="Wire Diameter d"
                  value={input.d}
                  onChange={(v) => updateInput("d", v)}
                  unit="mm"
                  min={0.5}
                  max={10}
                  step={0.1}
                />
              </div>
              <div
                ref={setFieldRef("D")}
                className={highlightField === "D" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
              >
                <SliderNumberInput
                  label="Mean Coil Diameter D"
                  value={input.D}
                  onChange={(v) => updateInput("D", v)}
                  unit="mm"
                  min={5}
                  max={120}
                  step={1}
                />
              </div>
              <div
                ref={setFieldRef("n")}
                className={highlightField === "n" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
              >
                <SliderNumberInput
                  label="Active Coils n"
                  value={input.n}
                  onChange={(v) => updateInput("n", v)}
                  min={1}
                  max={30}
                  step={0.5}
                />
              </div>
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
              <div className="grid grid-cols-4 gap-4">
                <div
                  ref={setFieldRef("r")}
                  className={highlightField === "r" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label="Working Radius r"
                    value={input.r}
                    onChange={(v) => updateInput("r", v)}
                    unit="mm"
                    min={10}
                    max={200}
                    step={1}
                  />
                </div>
                <div
                  ref={setFieldRef("alpha0")}
                  className={highlightField === "alpha0" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label="Free Angle α₀"
                    value={input.alpha0}
                    onChange={(v) => updateInput("alpha0", v)}
                    unit="deg"
                    min={10}
                    max={180}
                    step={1}
                  />
                </div>
                <div
                  ref={setFieldRef("alphaC")}
                  className={highlightField === "alphaC" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label="Coil Bind Angle αc"
                    value={input.alphaC}
                    onChange={(v) => updateInput("alphaC", v)}
                    unit="deg"
                    min={0}
                    max={Math.max(0, (input.alpha0 ?? 0) - 1)}
                    step={1}
                  />
                </div>
                <div
                  ref={setFieldRef("countParallel")}
                  className={highlightField === "countParallel" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label="Parallel Count"
                    value={input.countParallel ?? 1}
                    onChange={(v) => updateInput("countParallel", Math.max(1, Math.round(v)))}
                    min={1}
                    max={12}
                    step={1}
                  />
                </div>
              </div>
              
              {/* Space Constraints */}
              <div className="pt-2 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Space Constraints / 空间约束 (可选)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    ref={setFieldRef("maxHousingDiameter")}
                    className={highlightField === "maxHousingDiameter" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                  >
                    <SliderNumberInput
                      label="Max Housing Diameter"
                      value={input.maxHousingDiameter ?? 0}
                      onChange={(v) => updateInput("maxHousingDiameter", v > 0 ? v : undefined)}
                      unit="mm"
                      min={0}
                      max={200}
                      step={1}
                    />
                  </div>
                  <div
                    ref={setFieldRef("minClearance")}
                    className={highlightField === "minClearance" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                  >
                    <SliderNumberInput
                      label="Min Clearance"
                      value={input.minClearance ?? 1}
                      onChange={(v) => updateInput("minClearance", v)}
                      unit="mm"
                      min={0}
                      max={10}
                      step={0.5}
                    />
                  </div>
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
                <div>
                  <SliderNumberInput
                    label="Shear Modulus G"
                    value={input.G_override ?? 80000}
                    onChange={(v) => updateInput("G_override", v)}
                    unit="N/mm²"
                    min={60000}
                    max={90000}
                    step={500}
                  />
                </div>
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
                  <SliderNumberInput
                    label="Friction Torque Tf"
                    value={input.Tf_const ?? 0}
                    onChange={(v) => updateInput("Tf_const", v)}
                    unit="N·mm"
                    min={0}
                    max={20000}
                    step={100}
                  />
                )}

                {input.hysteresisMode === "proportional" && (
                  <SliderNumberInput
                    label="Friction Coefficient cf"
                    value={input.cf ?? 0}
                    onChange={(v) => updateInput("cf", v)}
                    min={0}
                    max={1}
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
                  <SliderNumberInput
                    label="Engage Angle"
                    value={input.engageAngle2 ?? 0}
                    onChange={(v) => updateInput("engageAngle2", v)}
                    unit="deg"
                    min={0}
                    max={Math.max(0, (input.alpha0 ?? 0) - (input.alphaC ?? 0) - 1)}
                    step={1}
                  />
                )}
              </div>

              {/* Spring 2 Parameters */}
              {isDual && (
                <div className="pt-4 border-t">
                  <Label className="text-sm font-medium mb-3 block">Spring 2 Parameters / 第二弹簧参数</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <SliderNumberInput
                      label="d₂"
                      value={input.spring2?.d ?? input.d}
                      onChange={(v) => updateSpring2("d", v)}
                      unit="mm"
                      min={0.5}
                      max={10}
                      step={0.1}
                    />
                    <SliderNumberInput
                      label="D₂"
                      value={input.spring2?.D ?? input.D}
                      onChange={(v) => updateSpring2("D", v)}
                      unit="mm"
                      min={5}
                      max={120}
                      step={1}
                    />
                    <SliderNumberInput
                      label="n₂"
                      value={input.spring2?.n ?? input.n}
                      onChange={(v) => updateSpring2("n", v)}
                      min={1}
                      max={30}
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
            disabled={isCalculating || hasRuleError}
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
          {/* 3D Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">3D Preview / 三维预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3 pb-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showDeadCoils}
                    onChange={(e) => setShowDeadCoils(e.target.checked)}
                  />
                  Dead Coils / 两端接触圈
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">per end</div>
                  <Input
                    type="number"
                    value={deadCoilsPerEnd}
                    onChange={(e) => setDeadCoilsPerEnd(Math.max(0, Math.round(parseFloat(e.target.value) || 0)))}
                    min={0}
                    step={1}
                    disabled={!showDeadCoils}
                    className="h-8 w-20 arc-no-spinner"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pb-3">
                <div className="text-xs text-muted-foreground">k</div>
                <Input
                  type="number"
                  value={deadTightnessK}
                  onChange={(e) => setDeadTightnessK(Math.max(0, parseFloat(e.target.value) || 0))}
                  min={0}
                  step={0.5}
                  disabled={!showDeadCoils}
                  className="h-8 w-20 arc-no-spinner"
                />
                <div className="text-xs text-muted-foreground">σ</div>
                <Input
                  type="number"
                  value={deadTightnessSigma}
                  onChange={(e) => setDeadTightnessSigma(Math.max(0, parseFloat(e.target.value) || 0))}
                  min={0}
                  step={0.01}
                  disabled={!showDeadCoils}
                  className="h-8 w-20 arc-no-spinner"
                />
              </div>
              <div className="flex items-center justify-between gap-3 pb-3">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showStressColors}
                    onChange={(e) => setShowStressColors(e.target.checked)}
                  />
                  Stress Colors / 应力伪色
                </label>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">β</div>
                  <Input
                    type="number"
                    value={stressBeta}
                    onChange={(e) => setStressBeta(Math.max(0, Math.min(0.9, parseFloat(e.target.value) || 0)))}
                    min={0}
                    max={0.9}
                    step={0.05}
                    disabled={!showStressColors}
                    className="h-8 w-20 arc-no-spinner"
                  />
                </div>
              </div>
              <div className="h-[360px] rounded-lg overflow-hidden bg-slate-50">
                <ArcSpringVisualizer
                  d={input.d}
                  D={input.D}
                  n={input.n}
                  r={input.r}
                  alpha0Deg={input.alpha0}
                  useDeadCoils={showDeadCoils}
                  deadCoilsPerEnd={deadCoilsPerEnd}
                  deadTightnessK={deadTightnessK}
                  deadTightnessSigma={deadTightnessSigma}
                  colorMode={showStressColors ? "approx_stress" : "solid"}
                  approxTauMax={isFinite(result.tauMax) ? result.tauMax : undefined}
                  approxStressBeta={stressBeta}
                  autoRotate={false}
                  wireframe={false}
                  showCenterline={false}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                d={input.d.toFixed(2)}mm, D={input.D.toFixed(1)}mm, n={input.n.toFixed(2)}, r={input.r.toFixed(1)}mm, α₀={input.alpha0.toFixed(1)}°
                {showDeadCoils ? `, dead=${deadCoilsPerEnd}×2, k=${deadTightnessK.toFixed(2)}, σ=${deadTightnessSigma.toFixed(2)}` : ""}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Fast Engineering Check / 快速工程判定</CardTitle>
              {fastCheck.status === "green" && (
                <Badge className="bg-emerald-600 text-white">Green</Badge>
              )}
              {fastCheck.status === "yellow" && (
                <Badge className="bg-amber-500 text-white">Yellow</Badge>
              )}
              {fastCheck.status === "red" && (
                <Badge variant="destructive">Red</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Engineering approximation (spring theory + correction factors). For fast trend guidance, not full 3D FEA.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Allowable τ (yield)</div>
                  <Input
                    type="number"
                    value={allowableTau}
                    onChange={(e) => setAllowableTau(Math.max(0, parseFloat(e.target.value) || 0))}
                    step={50}
                    className="h-8 arc-no-spinner"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Allowable τ (fatigue)</div>
                  <Input
                    type="number"
                    value={allowableTauFatigue}
                    onChange={(e) => setAllowableTauFatigue(Math.max(0, parseFloat(e.target.value) || 0))}
                    step={50}
                    className="h-8 arc-no-spinner"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">τ_max (MPa)</div>
                  <div className="font-medium">{isFinite(result.tauMax) ? result.tauMax.toFixed(0) : "—"}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">SF (yield)</div>
                  <div className="font-medium">{isFinite(fastCheck.sf) ? fastCheck.sf.toFixed(2) : "—"}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">SF (fatigue)</div>
                  <div className="font-medium">{isFinite(fastCheck.sfFatigue) ? fastCheck.sfFatigue.toFixed(2) : "—"}</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground">k (N/mm)</div>
                  <div className="font-medium">{isFinite(result.k) ? result.k.toFixed(2) : "—"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Results / 计算结果</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printArcSpringReport(input, result)}
                  disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Print Report
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadArcSpringPDF(input, result)}
                  disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Export PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
                  className="border-violet-500/50 text-violet-600 bg-violet-500/10 hover:bg-violet-500/20"
                >
                  <a href={`/tools/cad-export?type=arcSpring&d=${input.d}&D=${input.D}&Na=${input.n}&alpha0=${input.alpha0}&r=${input.r}&mat=${input.materialKey}`}>
                    <Download className="w-4 h-4 mr-1" />
                    Export CAD
                  </a>
                </Button>
              </div>
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

      {/* Advanced Analysis Panel */}
      {calculated && isFinite(result.k) && (
        <ArcSpringAdvancedPanel
          isZh={false}
          input={input}
          result={result}
          allowableTau={allowableTau}
        />
      )}
    </div>
  );
}

export default ArcSpringCalculator;
