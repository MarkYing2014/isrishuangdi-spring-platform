"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { computeAngles, arcAngles } from "@/lib/angle/AngleModel";
import { AlertCircle, Settings2, Circle, Layers, Activity, FileText, Printer, Download, BookOpen, HelpCircle, Info, AlertTriangle, Factory } from "lucide-react";
import { AuditEngine } from "@/lib/audit/AuditEngine";
import { EngineeringAuditCard } from "@/components/audit/EngineeringAuditCard";
import { DesignRulePanel } from "@/components/design-rules/DesignRulePanel";
import { ArcSpringAdvancedPanel } from "@/components/calculators/ArcSpringAdvancedPanel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { LanguageText, useLanguage } from "@/components/language-context";
import { useSpringDesignStore, type ArcGeometry, generateDesignCode } from "@/lib/stores/springDesignStore";
import { useWorkOrderStore } from "@/lib/stores/workOrderStore";
import { useRouter } from "next/navigation";
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

import { Calculator3DPreview } from "@/components/calculators/Calculator3DPreview";

// Remove old ArcSpringVisualizer dynamic import as it's now wrapped in Calculator3DPreview


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
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground/80">
        {label} {unit && `(${unit})`}
      </Label>
      <NumericInput
        value={value}
        onChange={(v) => onChange(v ?? 0)}
        min={min}
        step={step}
        disabled={disabled}
        className="h-9 w-full arc-no-spinner"
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Label className="text-xs font-medium text-muted-foreground/80 flex items-center justify-between">
          <span>{label}</span>
          {unit && <span className="text-[10px] opacity-60">({unit})</span>}
        </Label>
        <NumericInput
          value={Number.isFinite(value) ? value : 0}
          onChange={(v) => onChange(v ?? 0)}
          min={min}
          step={step}
          disabled={disabled}
          className="h-9 w-full arc-no-spinner"
        />
      </div>
      <div className="space-y-1">
        <Slider
          value={[sliderValue]}
          min={min}
          max={effectiveMax}
          step={step}
          onValueChange={(v) => onChange(v[0] ?? 0)}
          disabled={disabled}
          className="py-1"
        />
        <div className="flex justify-between text-[9px] text-muted-foreground/60 font-mono">
          <span>{min}</span>
          <span>{effectiveMax}</span>
        </div>
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
  | "alphaWork"
  | "alphaC"
  | "countParallel"
  | "maxHousingDiameter"
  | "minClearance"
  | "hysteresisMode"
  | "Tf_const"
  | "cf"
  | "systemMode"
  | "engageAngle2";

const ARC_SPRING_SAMPLES = [
  {
    id: "dm24002-013",
    nameEn: "DMF Primary Spring (DM24002-013)",
    nameZh: "双质量飞轮主弹簧 (DM24002-013)",
    input: {
      d: 3.7,
      D: 12.2,
      n: 50.3,
      r: 120.0,
      alpha0: 127.0,
      alphaWork: 115.0,
      alphaC: 103.0,
      materialKey: "EN10270_2" as MaterialKey,
      systemMode: "single" as const,
      hysteresisMode: "proportional" as const,
      cf: 0.12,
    }
  },
  {
    id: "dmf-secondary-small",
    nameEn: "DMF Secondary Spring (Compact)",
    nameZh: "双质量飞轮次级弹簧 (紧凑型)",
    input: {
      d: 2.0,
      D: 8.5,
      n: 35.0,
      r: 95.0,
      alpha0: 90.0,
      alphaWork: 80.0,
      alphaC: 72.0,
      materialKey: "EN10270_2" as MaterialKey,
      systemMode: "single" as const,
      hysteresisMode: "proportional" as const,
      cf: 0.10,
    }
  },
  {
    id: "high-torque-heavy",
    nameEn: "High-Torque Performance Spring",
    nameZh: "高性能高扭矩型弹簧",
    input: {
      d: 5.0,
      D: 28.0,
      n: 12.0,
      r: 130.0,
      alpha0: 60.0,
      alphaWork: 50.0,
      alphaC: 42.0,
      materialKey: "EN10270_2" as MaterialKey,
      systemMode: "single" as const,
      hysteresisMode: "constant" as const,
      Tf_const: 5000,
    }
  }
];

export function ArcSpringCalculator() {
  const router = useRouter();
  const { language } = useLanguage();
  const isZh = language === "zh";
  const [input, setInput] = useState<ArcSpringInput>(getDefaultArcSpringInput());
  const [mounted, setMounted] = useState(false);
  const [calculated, setCalculated] = useState(true); // 默认显示示例数据的计算结果
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<ArcSpringResult>(() => computeArcSpringCurve(getDefaultArcSpringInput()));
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [highlightField, setHighlightField] = useState<ArcIssueField | null>(null);
  const [highlightSeq, setHighlightSeq] = useState(0);
  const [showDeadCoils, setShowDeadCoils] = useState(false);
  const [symmetricDeadCoils, setSymmetricDeadCoils] = useState(true);
  const [deadCoilsPerEnd, setDeadCoilsPerEnd] = useState(1);
  const [deadCoilsLeft, setDeadCoilsLeft] = useState(1);
  const [deadCoilsRight, setDeadCoilsRight] = useState(1); // Usually different per user feedback
  const [deadTightnessK, setDeadTightnessK] = useState(2);
  const [deadTightnessSigma, setDeadTightnessSigma] = useState(0.08);
  const [allowableTau, setAllowableTau] = useState(800);
  const [allowableTauFatigue, setAllowableTauFatigue] = useState(500);
  const [showStressColors, setShowStressColors] = useState(false);
  const [stressBeta, setStressBeta] = useState(0.25);

  const storedGeometry = useSpringDesignStore(state => state.geometry);
  const lastSavedJsonRef = useRef<string>("");
  const isHydratingRef = useRef<boolean>(false);
  
  // Hydrate from store
  useEffect(() => {
    if (storedGeometry && storedGeometry.type === "arc") {
      const g = storedGeometry as ArcGeometry;
      const gJson = JSON.stringify(g);
      
      // Skip if this update came from our own persistence logic
      if (gJson === lastSavedJsonRef.current && input.d !== undefined) return;
      lastSavedJsonRef.current = gJson;
      
      isHydratingRef.current = true;
      const def = getDefaultArcSpringInput();
      const hydratedInput: ArcSpringInput = {
        ...def,
        d: g.wireDiameter ?? def.d,
        D: g.meanDiameter ?? def.D,
        n: g.coils ?? def.n,
        r: g.workingRadius ?? def.r,
        alpha0: g.unloadedAngle ?? def.alpha0,
        alphaWork: g.workingAngle ?? g.unloadedAngle ?? def.alpha0,
        alphaC: g.solidAngle ?? def.alphaC,
        hysteresisMode: input.hysteresisMode,
        systemMode: input.systemMode,
      };
      
      setInput(hydratedInput);
      setResult(computeArcSpringCurve(hydratedInput));
      setCalculated(true);
      
      // Reset hydration flag after state update
      setTimeout(() => {
        isHydratingRef.current = false;
      }, 50);
    }
  }, [storedGeometry]);

  const designRuleReport = useMemo(
    () =>
      buildArcSpringDesignRuleReport(input, {
        showDeadCoils,
        deadCoilsPerEnd: symmetricDeadCoils ? deadCoilsPerEnd : undefined,
        deadCoilsStart: symmetricDeadCoils ? undefined : deadCoilsLeft,
        deadCoilsEnd: symmetricDeadCoils ? undefined : deadCoilsRight,
      }),
    [input, showDeadCoils, symmetricDeadCoils, deadCoilsPerEnd, deadCoilsLeft, deadCoilsRight]
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
    setCalculated(false);
  };

  // Persistence Effect: Save to store when input changes (debounced)
  useEffect(() => {
    if (!mounted) return;
    
    // Only save if we have a valid single or mapped structure
    // Mapping ArcSpringInput back to ArcGeometry
    const geometry: ArcGeometry = {
      type: "arc",
      wireDiameter: input.d,
      meanDiameter: input.D,
      coils: input.n,
      workingRadius: input.r,
      unloadedAngle: input.alpha0,
      workingAngle: input.alphaWork ?? 0,
      solidAngle: input.alphaC,
      materialId: input.materialKey === "CUSTOM" ? undefined : input.materialKey as any,
    };

    // Use a small timeout to avoid thrashing the store on every keystroke/slider move
    const timer = setTimeout(() => {
      // Direct store manipulation for geometry since setEds might be compression-specific
      const finalGeometry = { ...geometry };
      lastSavedJsonRef.current = JSON.stringify(finalGeometry);
      
      useSpringDesignStore.setState(state => ({
        geometry: finalGeometry,
        springType: "arc",
        hasValidDesign: true, 
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [input, mounted]);

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
    if (isHydratingRef.current) return; // Skip calculation flash if we just hydrated from store

    const t = setTimeout(() => {
      setIsCalculating(true);
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

  const angleDerived = useMemo(() => computeAngles(arcAngles(
    input.alpha0,
    input.alphaWork ?? input.alpha0
  )), [input.alpha0, input.alphaWork]);

  const unifiedAudit = useMemo(() => {
    if (!result) return null;
    return AuditEngine.evaluate({
      springType: "arc",
      geometry: input,
      results: {
        ...result,
        angles: angleDerived,
        // Map arc specific terms to audit engine expectations
        maxStress: result.tauMax,
        allowableStress: allowableTau,
      }
    });
  }, [result, input, angleDerived, allowableTau]);

  const isDual = input.systemMode === "dual_parallel" || input.systemMode === "dual_staged";

  // Work Order Logic
  const { createWorkOrder } = useWorkOrderStore();
  const handleCreateWorkOrder = () => {
    try {
        if (!result || !calculated) {
             alert(isZh ? "请先计算设计结果" : "Please calculate the design first.");
             return;
        }

        // Confirm validation if Audit/Rule Failed
        if (hasRuleError) {
             const proceed = window.confirm(
                  isZh 
                  ? "⚠️ 设计规则判定未通过 (Design Invalid)。\n\n确定要强制创建工单吗？"
                  : "⚠️ Design Rules Failed (Design Level).\n\nAre you sure you want to FORCE create a work order?"
             );
             if (!proceed) return;
        }

        const auditStatus = reportStatusToAuditStatus(designRuleReport.summary.status);

        // Map to WorkOrder
        const wo = createWorkOrder({
            designCode: (storedGeometry as any).code || generateDesignCode(storedGeometry as any),
            quantity: 100,
            priority: "normal",
            springType: "arc",
            geometry: storedGeometry as unknown as ArcGeometry, // Cast for store compatibility
            material: {
                id: input.materialKey,
                name: input.materialKey,
                shearModulus: input.G_override ?? 80000, // Approximate fallback
                // other props
            } as any,
            analysis: result as any,
            audit: { 
                status: auditStatus, 
                summary: designRuleReport.summary, 
                audits: {}, // Arc design rules structure is different, passing empty object or findings if compatible
                findings: designRuleReport.findings, // Pass findings array
                notes: [] 
            } as any, 
            createdBy: "User", // Placeholder
            notes: auditStatus === "WARN" || auditStatus === "FAIL" 
                ? `[${auditStatus}] Engineering Audit Issues Override / 工程审核问题强制覆盖` 
                : undefined
        });

        const url = `/manufacturing/workorder/${wo.workOrderId}`;
        router.push(url);
    } catch(e: any) {
         console.error("Failed to create work order", e);
         alert(isZh ? `系统错误：创建工单失败。\n${e?.message}` : `System Error: Failed to create Work Order.\n${e?.message}`);
    }
  };

  const reportStatusToAuditStatus = (s: string): "PASS" | "WARN" | "FAIL" => {
      if (s === "FAIL") return "FAIL";
      if (s === "review_required" || s === "WARN") return "WARN";
      return "PASS";
  };

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
          {/* Quick Samples Card */}
          <Card className="border-indigo-100 bg-indigo-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-700">
                <BookOpen className="w-4 h-4" />
                <LanguageText en="Real-World Samples" zh="真实案例数据" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ARC_SPRING_SAMPLES.map((sample) => (
                  <Button
                    key={sample.id}
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 bg-white/80 hover:bg-indigo-100 hover:border-indigo-200"
                    onClick={() => {
                      const newInput = { ...getDefaultArcSpringInput(), ...sample.input };
                      setInput(newInput);
                      setResult(computeArcSpringCurve(newInput));
                      setCalculated(true);
                      // Immediately update store to avoid debounce delay for 3D preview
                      useSpringDesignStore.setState({
                        geometry: {
                          type: "arc",
                          wireDiameter: newInput.d,
                          meanDiameter: newInput.D,
                          coils: newInput.n,
                          workingRadius: newInput.r,
                          unloadedAngle: newInput.alpha0,
                          workingAngle: newInput.alphaWork ?? 0,
                          solidAngle: newInput.alphaC,
                          materialId: newInput.materialKey === "CUSTOM" ? undefined : newInput.materialKey as any,
                        },
                        springType: "arc",
                        hasValidDesign: true,
                      });
                    }}
                  >
                    {isZh ? sample.nameZh : sample.nameEn}
                  </Button>
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 text-muted-foreground underline"
                    onClick={() => {
                      const def = getDefaultArcSpringInput();
                      setInput(def);
                      setResult(computeArcSpringCurve(def));
                      setCalculated(true);
                      // Immediately update store to avoid debounce delay for 3D preview
                      useSpringDesignStore.setState({
                        geometry: {
                          type: "arc",
                          wireDiameter: def.d,
                          meanDiameter: def.D,
                          coils: def.n,
                          workingRadius: def.r,
                          unloadedAngle: def.alpha0,
                          workingAngle: def.alphaWork ?? 0,
                          solidAngle: def.alphaC,
                          materialId: def.materialKey === "CUSTOM" ? undefined : def.materialKey as any,
                        },
                        springType: "arc",
                        hasValidDesign: true,
                      });
                    }}
                >
                    Reset / 重置
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Geometry Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Circle className="w-4 h-4" />
                <LanguageText en="Geometry" zh="几何参数" />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                ref={setFieldRef("d")}
                className={highlightField === "d" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
              >
                <SliderNumberInput
                  label={isZh ? "线径 d" : "Wire Diameter d"}
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
                  label={isZh ? "线圈中径 D" : "Mean Coil Diameter D"}
                  value={input.D}
                  onChange={(v) => updateInput("D", v)}
                  unit="mm"
                  min={5}
                  max={120}
                  step={0.1}
                />
              </div>
              <div
                ref={setFieldRef("n")}
                className={highlightField === "n" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
              >
                <SliderNumberInput
                  label={isZh ? "有效圈数 n" : "Active Coils n"}
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
                <LanguageText en="Arc Layout" zh="弧形布局" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <div
                  ref={setFieldRef("r")}
                  className={highlightField === "r" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Label className="text-xs font-medium text-muted-foreground/80">
                      {isZh ? "工作半径 r" : "Working Radius r"} (mm)
                    </Label>
                    <span title={isZh ? "用于行程映射的半径: s = r · Δα" : "Arc radius used for stroke mapping: s = r · Δα"}>
                      <HelpCircle 
                        className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" 
                      />
                    </span>
                  </div>
                  <NumericInput
                    value={input.r}
                    onChange={(v) => updateInput("r", v ?? 0)}
                    min={10}
                    max={200}
                    step={0.1}
                    className="h-9 w-full arc-no-spinner mb-2"
                  />
                  <Slider
                    value={[input.r]}
                    min={10}
                    max={200}
                    step={0.1}
                    onValueChange={(v) => updateInput("r", v[0] ?? 0)}
                    className="py-1"
                  />
                </div>
                <div
                  ref={setFieldRef("alpha0")}
                  className={highlightField === "alpha0" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label={isZh ? "自由弧度角 θfree" : "Free Angle θfree"}
                    value={input.alpha0}
                    onChange={(v) => updateInput("alpha0", v)}
                    unit="deg"
                    min={10}
                    max={180}
                    step={0.1}
                  />
                </div>
                <div
                  ref={setFieldRef("alphaWork")}
                  className={highlightField === "alphaWork" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label={isZh ? "工作弧度角 θwork" : "Work Angle θwork"}
                    value={input.alphaWork ?? input.alpha0}
                    onChange={(v) => updateInput("alphaWork", v)}
                    unit="deg"
                    min={0}
                    max={input.alpha0}
                    step={0.1}
                  />
                </div>
                <div
                  ref={setFieldRef("alphaC")}
                  className={highlightField === "alphaC" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label={isZh ? "压并角度 αc" : "Coil Bind Angle αc"}
                    value={input.alphaC}
                    onChange={(v) => updateInput("alphaC", v)}
                    unit="deg"
                    min={0}
                    max={Math.max(0, (input.alpha0 ?? 0) - 1)}
                    step={0.1}
                  />
                </div>
                <div
                  ref={setFieldRef("countParallel")}
                  className={highlightField === "countParallel" ? `arc-field-highlight arc-field-highlight-${highlightSeq}` : ""}
                >
                  <SliderNumberInput
                    label={isZh ? "并联数量" : "Parallel Count"}
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
                      label={isZh ? "最大外壳内径" : "Max Housing Diameter"}
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
                      label={isZh ? "最小间隙" : "Min Clearance"}
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

              {/* Unified Engineering Audit Card */}
              {unifiedAudit && (
                <div className="pt-4 border-t">
                  <EngineeringAuditCard 
                    audit={unifiedAudit} 
                    governingVariable="Δθ" 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <LanguageText en="Material" zh="材料参数" />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground/80">
                  {isZh ? "材料标准" : "Material Standard"}
                </Label>
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
                    label={isZh ? "剪切模量 G" : "Shear Modulus G"}
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
              <div className="flex flex-col gap-2 pb-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={showDeadCoils}
                      onChange={(e) => setShowDeadCoils(e.target.checked)}
                    />
                    Dead Coils / 两端接触圈
                  </label>
                  
                  {showDeadCoils && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                       <input
                         type="checkbox"
                         checked={symmetricDeadCoils}
                         onChange={(e) => setSymmetricDeadCoils(e.target.checked)}
                       />
                       Symmetric / 对称
                    </label>
                  )}
                </div>

                {showDeadCoils && (
                  symmetricDeadCoils ? (
                    <div className="flex items-center justify-between gap-2 pl-4">
                      <div className="text-xs text-muted-foreground">Per End / 单端圈数</div>
                      <NumericInput
                        value={deadCoilsPerEnd}
                        onChange={(v) => {
                          const val = Math.max(0, v ?? 0);
                          setDeadCoilsPerEnd(val);
                          setDeadCoilsLeft(val);
                          setDeadCoilsRight(val);
                        }}
                        min={0}
                        step={0.1}
                        className="h-8 w-24 arc-no-spinner"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 pl-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Left / 左端</div>
                        <NumericInput
                          value={deadCoilsLeft}
                          onChange={(v) => setDeadCoilsLeft(Math.max(0, v ?? 0))}
                          min={0}
                          step={0.1}
                          className="h-8 w-full arc-no-spinner"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Right / 右端</div>
                        <NumericInput
                          value={deadCoilsRight}
                          onChange={(v) => setDeadCoilsRight(Math.max(0, v ?? 0))}
                          min={0}
                          step={0.1}
                          className="h-8 w-full arc-no-spinner"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pb-3">
                <div className="text-xs text-muted-foreground">k</div>
                <NumericInput
                  value={deadTightnessK}
                  onChange={(v) => setDeadTightnessK(Math.max(0, v ?? 0))}
                  min={0}
                  step={0.5}
                  disabled={!showDeadCoils}
                  className="h-8 w-20 arc-no-spinner"
                />
                <div className="text-xs text-muted-foreground">σ</div>
                <NumericInput
                  value={deadTightnessSigma}
                  onChange={(v) => setDeadTightnessSigma(Math.max(0, v ?? 0))}
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
                  <NumericInput
                    value={stressBeta}
                    onChange={(v) => setStressBeta(Math.max(0, Math.min(0.9, v ?? 0)))}
                    min={0}
                    max={0.9}
                    step={0.05}
                    disabled={!showStressColors}
                    className="h-8 w-20 arc-no-spinner"
                  />
                </div>
              </div>
              <div className="h-[360px] rounded-lg overflow-hidden bg-slate-50">
                <Calculator3DPreview
                  expectedType="arc"
                  showStressColors={showStressColors}
                  stressUtilization={unifiedAudit?.audits.stress.stressRatio}
                  stressBeta={stressBeta}
                  heightClassName="h-full"
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                d={input.d.toFixed(2)}mm, D={input.D.toFixed(1)}mm, n={input.n.toFixed(2)}, r={input.r.toFixed(1)}mm, α₀={input.alpha0.toFixed(1)}°
                {showDeadCoils ? (
                  symmetricDeadCoils
                    ? `, dead=${deadCoilsPerEnd.toFixed(2)}×2`
                    : `, dead L=${deadCoilsLeft.toFixed(2)} R=${deadCoilsRight.toFixed(2)}`
                ) : ""}
                {showDeadCoils ? `, k=${deadTightnessK.toFixed(2)}, σ=${deadTightnessSigma.toFixed(2)}` : ""}
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
                  <NumericInput
                    value={allowableTau}
                    onChange={(v) => setAllowableTau(Math.max(0, v ?? 0))}
                    step={50}
                    className="h-8 arc-no-spinner"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Allowable τ (fatigue)</div>
                  <NumericInput
                    value={allowableTauFatigue}
                    onChange={(v) => setAllowableTauFatigue(Math.max(0, v ?? 0))}
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
              <div className="flex flex-wrap gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sky-500/50 text-sky-600 bg-sky-500/10 hover:bg-sky-500/20"
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("type", "arc");
                    params.set("d", input.d.toString());
                    params.set("D", input.D.toString());
                    params.set("n", input.n.toString());
                    params.set("r", input.r.toString());
                    params.set("alpha0", input.alpha0.toString());
                    params.set("alphaC", input.alphaC.toString());
                    params.set("mat", input.materialKey);
                    if (input.alphaWork) params.set("alphaWork", input.alphaWork.toString());
                    
                    router.push(`/tools/analysis?${params.toString()}`);
                  }}
                >
                  <Activity className="w-4 h-4 mr-1" />
                  <LanguageText en="Analysis" zh="工程分析" />
                </Button>

                <Button 
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                  disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
                  onClick={handleCreateWorkOrder}
                >
                   <Factory className="w-4 h-4 mr-1" />
                   <LanguageText en="Work Order" zh="生产工单" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printArcSpringReport(input, result)}
                  disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  <LanguageText en="Print" zh="打印" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadArcSpringPDF(input, result)}
                  disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  <LanguageText en="PDF" zh="PDF" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!calculated || (result.warnings.length > 0 && !isFinite(result.k))}
                  className="border-violet-500/50 text-violet-600 bg-violet-500/10 hover:bg-violet-500/20"
                  onClick={() => {
                      const params = new URLSearchParams();
                      params.set("type", "arcSpring");
                      params.set("d", input.d.toString());
                      params.set("D", input.D.toString());
                      params.set("Na", input.n.toString());
                      params.set("alpha0", input.alpha0.toString());
                      params.set("r", input.r.toString());
                      params.set("mat", input.materialKey);
                      router.push(`/tools/cad-export?${params.toString()}`);
                  }}
                >
                    <Download className="w-4 h-4 mr-1" />
                    <LanguageText en="CAD" zh="CAD" />
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
                  <div className="text-xs text-muted-foreground">Tangential stiffness k_t</div>
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

              {/* Working Point (Optional) */}
              {result.M_work !== undefined && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-100">
                  <div className="col-span-3 text-xs text-emerald-600 font-medium pb-1 border-b border-emerald-200 mb-1">
                    {isZh ? "工作状态" : "Working State"} (at α_work = {input.alphaWork?.toFixed(1)}°, Δα = {result.deltaAlphaWork?.toFixed(1)}°)
                  </div>
                  <div>
                    <div className="text-xs text-emerald-600/80">{isZh ? "工作扭矩" : "Working Torque"}</div>
                    <div className="text-sm font-bold text-emerald-700">
                      {result.M_work.toFixed(0)} N·mm
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-600/80">{isZh ? "工作应力" : "Working Stress"}</div>
                    <div className="text-sm font-bold text-emerald-700">
                      {result.tauWork?.toFixed(0)} MPa
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-600/80">{isZh ? "安全系数" : "SF (Work)"}</div>
                    <div className="text-sm font-bold text-emerald-700">
                      {result.tauWork ? (allowableTau / result.tauWork).toFixed(2) : "-"}
                    </div>
                  </div>
                </div>
              )}

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
                    <div className="text-muted-foreground">{isZh ? "安全裕度" : "Safety Margin"}</div>
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
              <CardTitle className="text-base">
                <LanguageText en="Torque–Angle Curve" zh="扭矩-角度曲线" />
              </CardTitle>
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
                  ? isZh ? "无迟滞 - 加载和卸载曲线重合" : "No hysteresis - Loading and Unloading curves overlap"
                  : isZh ? "迟滞回线显示了加载和卸载之间的摩擦效应" : "Hysteresis loop shows friction effect between loading and unloading"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Analysis Panel */}
      {calculated && isFinite(result.k) && (
        <ArcSpringAdvancedPanel
          isZh={isZh}
          input={input}
          result={result}
          allowableTau={allowableTau}
        />
      )}

      {/* Engineering Specifications (SEC) & FAQ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pb-20">
        {/* SEC Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4" />
              <LanguageText en="Engineering Specifications (SEC)" zh="技术规范与工程标准 (SEC)" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">
                <LanguageText en="Standard Compatibility" zh="标准兼容性" />
              </h4>
              <p>
                <LanguageText 
                  en="Calculations align with EN 13906-1 physical principles for helical compression springs, mapped to an arc axis. All material data follow EN 10270 standards."
                  zh="计算逻辑遵循 EN 13906-1 螺旋压缩弹簧物理准则，并映射至圆弧轴线。材料数据严格采用 EN 10270 标准。"
                />
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">
                <LanguageText en="Stiffness Relation" zh="刚度关系原理" />
              </h4>
              <p>
                <LanguageText 
                  en="The rotational stiffness R (N·mm/deg) is derived from axial stiffness k (N/mm) and working radius r: R = k · r² · (π/180)."
                  zh="旋转刚度 R (N·mm/deg) 由轴向刚度 k (N/mm) 与工作半径 r 导出：R = k · r² · (π/180)。"
                />
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">
                <LanguageText en="Manufacturing Limits" zh="制造与精度限制" />
              </h4>
              <ul className="list-disc list-inside space-y-1">
                <li><LanguageText en="Spring Index (D/d): 4 - 20 recommended." zh="弹簧指数 (D/d): 推荐范围 4 - 20。" /></li>
                <li><LanguageText en="Min Free Pitch: 1.1 * d." zh="最小自由节距: 1.1 * d。" /></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="w-4 h-4" />
              <LanguageText en="Frequently Asked Questions (FAQ)" zh="常见问题解答 (FAQ)" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <LanguageText en="What is the difference between Single and Dual systems?" zh="单级与双级系统有什么区别？" />
                </AccordionTrigger>
                <AccordionContent>
                  <LanguageText 
                    en="Single systems use a single spring for the entire shift. Dual systems use two springs (parallel or staged) to provide non-linear torque-angle characteristics, often used in Dual Mass Flywheels (DMF)."
                    zh="单级系统在整个行程中使用单一弹簧。双级系统使用两根弹簧（并联或级联）来提供非线性的扭矩-角度特性，通常用于双质量飞轮 (DMF)。"
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  <LanguageText en="How should I choose the Working Radius (r)?" zh="我该如何选择工作半径 (r)？" />
                </AccordionTrigger>
                <AccordionContent>
                  <LanguageText 
                    en="The working radius is the distance from the center of the arc tool to the spring centerline. It directly determines the torque leverage. Increasing r increases torque but also increases centrifugal stress."
                    zh="工作半径是从圆弧中心到弹簧中心线的距离。它直接决定了扭矩力臂。增大 r 会增加扭矩，但也会增加离心应力。"
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  <LanguageText en="What does 'Hysteresis Mode' affect?" zh="“迟滞模式”有什么影响？" />
                </AccordionTrigger>
                <AccordionContent>
                  <LanguageText 
                    en="Hysteresis accounts for internal and external friction. 'Proportional' mode varies friction with load, which is more realistic for DMF applications involving centrifugal forces."
                    zh="迟滞用于衡量内外摩擦。 “比例”模式使摩擦力随载荷变化，这对于涉及离心力的 DMF 应用更为真实。"
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ArcSpringCalculator;
