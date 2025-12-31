"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

import { LoadPointCard, LoadPointList } from "@/components/ui/LoadPointCard";
import { ModuleSelector } from "@/components/ui/ModuleSelector";
import { MaterialSelector } from "@/components/ui/MaterialSelector";
import {
  CalcModeSelector,
  TargetLoadPanel,
  StiffnessCandidatesInput,
  StiffnessComparisonTable,
} from "./DesignModeComponents";
import {
  type LoadPointCount,
  type InputMode,
  type DisplayModules,
  type CalcMode,
  type TargetLoadInput,
  type CompressionMultiPointResult,
  calculateMultiPointCompression,
  createDefaultLoadPointInputs,
  solveActiveCoilsForTarget,
  generateStiffnessOptions,
  DEFAULT_MODULES,
  DEFAULT_CANDIDATE_STIFFNESSES,
} from "@/lib/compressionSpringMultiPoint";
import { 
  type SpringMaterial, 
  getSpringMaterial as getMaterialById 
} from "@/lib/materials/springMaterials";
import type { LoadCaseResult } from "@/lib/spring-platform/types";
import type { LoadPointResult } from "@/lib/compressionSpringMultiPoint";

// Adapter: Convert legacy LoadPointResult to LoadCaseResult
function adaptLoadPointsToLoadCases(loadPoints: LoadPointResult[]): LoadCaseResult[] {
  return loadPoints.map((lp, idx) => ({
    id: lp.label ?? `L${idx + 1}`,
    labelEn: `Point ${idx + 1}`,
    labelZh: `点 ${idx + 1}`,
    inputValue: lp.H,
    load: lp.P,
    stress: lp.Tk,
    status: lp.status === "error" ? "danger" : lp.status === "warning" ? "warning" : "ok",
    statusReason: lp.status === "ok" ? "none" : lp.status === "error" ? "coil_bind" : "stress_over_limit",
    messageEn: lp.statusMessage ?? "",
    messageZh: lp.statusMessage ?? "",
  } as LoadCaseResult));
}

// ============================================================================
// Types
// ============================================================================

interface MultiPointSectionProps {
  /** Wire diameter d (mm) */
  d: number;
  /** Mean diameter D (mm) */
  D: number;
  /** Active coils n */
  n: number;
  /** Free length H0 (mm) */
  H0: number;
  /** Solid height Hb (mm) - calculated as totalCoils * d if not provided */
  Hb?: number;
  /** Total coils for Hb calculation */
  totalCoils?: number;
  /** Shear modulus G (MPa) */
  G: number;
  /** Optional allowable stress for warning detection */
  tau_allow?: number;
  /** Material ID for sync */
  materialId?: string;
  /** Callback when material changes */
  onMaterialChange?: (material: SpringMaterial) => void;
  /** Callback to apply parameters (n, H0, etc.) back to main form */
  onApplyParameters?: (params: { n?: number, H0?: number }) => void;
  /** Callback when calculation result changes */
  onResultChange?: (result: CompressionMultiPointResult) => void;
}

// ============================================================================
// Load Point Count Selector
// ============================================================================

function LoadPointCountSelector({
  value,
  onChange,
}: {
  value: LoadPointCount;
  onChange: (count: LoadPointCount) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium">负荷点数:</Label>
      <select
        className="h-8 px-2 py-1 rounded-md border border-input bg-background text-sm"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as LoadPointCount)}
      >
        <option value={3}>3 点</option>
        <option value={4}>4 点</option>
        <option value={5}>5 点</option>
      </select>
    </div>
  );
}

// ============================================================================
// Input Mode Selector
// ============================================================================

function InputModeSelector({
  value,
  onChange,
}: {
  value: InputMode;
  onChange: (mode: InputMode) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium">输入方式:</Label>
      <div className="flex rounded-md overflow-hidden border border-input">
        <button
          type="button"
          className={`px-3 py-1 text-xs ${value === "height" ? "bg-primary text-primary-foreground" : "bg-background"}`}
          onClick={() => onChange("height")}
        >
          高度 H
        </button>
        <button
          type="button"
          className={`px-3 py-1 text-xs border-l ${value === "deflection" ? "bg-primary text-primary-foreground" : "bg-background"}`}
          onClick={() => onChange("deflection")}
        >
          压缩量 δ
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Result Summary
// ============================================================================

function ResultSummary({ result }: { result: CompressionMultiPointResult }) {
  const fmt = (v: number, decimals = 2) => v.toFixed(decimals);
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      <div className="bg-muted rounded-md p-2">
        <div className="text-xs text-muted-foreground">刚度 k</div>
        <div className="font-medium">{fmt(result.k, 3)} N/mm</div>
      </div>
      <div className="bg-muted rounded-md p-2">
        <div className="text-xs text-muted-foreground">弹簧指数 C</div>
        <div className="font-medium">{fmt(result.C, 2)}</div>
      </div>
      <div className="bg-muted rounded-md p-2">
        <div className="text-xs text-muted-foreground">压并力 Pb</div>
        <div className="font-medium">{fmt(result.Pb, 1)} N</div>
      </div>
      <div className="bg-muted rounded-md p-2">
        <div className="text-xs text-muted-foreground">压并应力 τb</div>
        <div className="font-medium">{fmt(result.Tkb, 0)} MPa</div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MultiPointSection({
  d,
  D,
  n,
  H0,
  Hb: providedHb,
  totalCoils,
  G: propsG,
  tau_allow: propsTauAllow,
  materialId: propsMaterialId,
  onMaterialChange: propsOnMaterialChange,
  onApplyParameters,
  onResultChange,
}: MultiPointSectionProps) {
  // Calculate solid height if not provided
  const Hb = providedHb ?? (totalCoils ?? n) * d;
  
  // State
  const [loadPointCount, setLoadPointCount] = useState<LoadPointCount>(3);
  const [inputMode, setInputMode] = useState<InputMode>("height");
  const [expanded, setExpanded] = useState(true);
  
  // Step 3: Module toggle state
  const [modules, setModules] = useState<DisplayModules>(DEFAULT_MODULES);
  
  // Step 4: Calculation mode state
  const [calcMode, setCalcMode] = useState<CalcMode>("verification");
  const [targetLoad, setTargetLoad] = useState<TargetLoadInput>({ H: H0 * 0.7, P: 50 });
  const [candidateStiffnesses, setCandidateStiffnesses] = useState<number[]>(
    DEFAULT_CANDIDATE_STIFFNESSES
  );
  
  // Material state - controlled if props provided, otherwise local
  const [localMaterialId, setLocalMaterialId] = useState<string>("65Mn");
  const materialId = propsMaterialId ?? localMaterialId;
  const material = useMemo(() => getMaterialById(materialId as any), [materialId]);
  
  // Handle material change
  const handleMaterialChange = useCallback((m: SpringMaterial) => {
    if (propsOnMaterialChange) {
      propsOnMaterialChange(m);
    } else {
      setLocalMaterialId(m.id);
    }
  }, [propsOnMaterialChange]);

  // Effective G and tau_allow
  const effectiveG = (material && material.id !== "custom") ? (material.G ?? material.shearModulus) : propsG;
  const effectiveTauAllow = (material && material.id !== "custom") ? (material.tauAllow ?? material.allowShearStatic) : propsTauAllow;
  
  // Initialize input values with defaults (stored as H values by default)
  const [inputValues, setInputValues] = useState<number[]>(() =>
    createDefaultLoadPointInputs(3, H0, Hb)
  );
  
  // Track previous H0 for delta updates
  const [prevH0, setPrevH0] = useState(H0);

  
  // ========================================
  // Step 2: Mode switch data conversion
  // ========================================
  
  // Handle input mode change with data conversion
  const handleModeChange = useCallback((newMode: InputMode) => {
    if (newMode === inputMode) return;
    
    // Convert existing values from current mode to new mode
    setInputValues((prev) => {
      return prev.map((value) => {
        if (inputMode === "height" && newMode === "deflection") {
          // H → δ: δ = H0 - H
          const delta = H0 - value;
          // Clamp to valid range
          return Math.max(0, Math.min(delta, H0 - Hb));
        } else {
          // δ → H: H = H0 - δ
          const H = H0 - value;
          // Clamp to valid range
          return Math.max(Hb, Math.min(H, H0));
        }
      });
    });
    
    setInputMode(newMode);
  }, [inputMode, H0, Hb]);

  // Handle applying results
  const handleApplyResults = useCallback((params: { n?: number; H0?: number }) => {
    if (onApplyParameters) {
      onApplyParameters(params);
    }
  }, [onApplyParameters]);
  
  // ========================================
  // Auto-update when H0 changes
  // ========================================
  
  // Sync input values when H0 changes (keep same deflections)
  if (H0 !== prevH0) {
    setPrevH0(H0);
    // If in height mode, adjust H values to maintain same relative position
    // If in deflection mode, values stay the same (deflections don't change)
    if (inputMode === "height") {
      setInputValues((prev) => {
        const deltaH0 = H0 - prevH0;
        return prev.map((H) => {
          const newH = H + deltaH0;
          // Clamp to valid range
          return Math.max(Hb, Math.min(newH, H0));
        });
      });
    }
  }
  
  // ========================================
  // Existing handlers
  // ========================================
  
  // Update input values when count changes
  const handleCountChange = useCallback((count: LoadPointCount) => {
    setLoadPointCount(count);
    setInputValues((prev) => {
      // Generate defaults based on current mode
      const defaults = createDefaultLoadPointInputs(count, H0, Hb);
      // Convert defaults to current mode if needed
      const modeDefaults = inputMode === "deflection" 
        ? defaults.map((H) => H0 - H)  // Convert H to δ  
        : defaults;
      // Preserve existing values where possible
      return modeDefaults.map((defaultVal, i) => prev[i] ?? defaultVal);
    });
  }, [H0, Hb, inputMode]);
  
  // Handle input value change with clamping
  const handleInputChange = useCallback((index: number, value: number) => {
    setInputValues((prev) => {
      const next = [...prev];
      // Clamp value based on mode
      if (inputMode === "height") {
        // H mode: Hb ≤ H ≤ H0
        next[index] = Math.max(Hb, Math.min(value, H0));
      } else {
        // δ mode: 0 ≤ δ ≤ (H0 - Hb)
        next[index] = Math.max(0, Math.min(value, H0 - Hb));
      }
      return next;
    });
  }, [inputMode, H0, Hb]);
  
  // Calculate result
  const result = useMemo(() => {
    const res = calculateMultiPointCompression(
      {
        d,
        D,
        n,
        H0,
        Hb,
        G: effectiveG,
        loadPointCount,
        inputMode,
        loadPointInputs: inputValues,
      },
      effectiveTauAllow,
      modules  // Step 3: pass modules for conditional status checking
    );
    
    // Notify parent of result change
    onResultChange?.(res);
    
    return res;
  }, [d, D, n, H0, Hb, effectiveG, loadPointCount, inputMode, inputValues, effectiveTauAllow, modules, onResultChange]);
  
  // Step 4: Reverse solve result (for targetLoad mode)
  const reverseResult = useMemo(() => {
    if (calcMode !== "targetLoad") return null;
    return solveActiveCoilsForTarget(d, D, effectiveG, H0, targetLoad);
  }, [calcMode, d, D, effectiveG, H0, targetLoad]);
  
  // Step 4: Stiffness options (for stiffnessSelection mode)
  const stiffnessOptions = useMemo(() => {
    if (calcMode !== "stiffnessSelection") return [];
    return generateStiffnessOptions(
      d, D, effectiveG, H0, totalCoils ?? n + 2,
      candidateStiffnesses, inputValues, inputMode, modules
    );
  }, [calcMode, d, D, effectiveG, H0, totalCoils, n, candidateStiffnesses, inputValues, inputMode, modules]);
  
  return (
    <Card>
      <CardHeader
        className="pb-2 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            多点位负荷分析 / Multi-Point Load Analysis
          </CardTitle>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-4">
          {/* Step 4: Calculation Mode Selector */}
          <CalcModeSelector value={calcMode} onChange={setCalcMode} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Material Selector */}
            <MaterialSelector
              selectedId={materialId}
              onMaterialChange={handleMaterialChange}
              d={d}
            />

            {/* Mode-specific panels within the grid if needed, or separately */}
          </div>

          {/* Mode-specific panels */}
          {calcMode === "targetLoad" && (
            <TargetLoadPanel
              target={targetLoad}
              onTargetChange={setTargetLoad}
              solveResult={reverseResult ?? undefined}
              onApply={(n) => handleApplyResults({ n })}
            />
          )}
          
          {calcMode === "stiffnessSelection" && (
            <StiffnessCandidatesInput
              candidates={candidateStiffnesses}
              onCandidatesChange={setCandidateStiffnesses}
            />
          )}
          
          {/* Controls Row - only show in verification mode */}
          {calcMode === "verification" && (
            <div className="flex flex-wrap gap-4 items-center">
              <LoadPointCountSelector
                value={loadPointCount}
                onChange={handleCountChange}
              />
              <InputModeSelector
                value={inputMode}
                onChange={handleModeChange}
              />
            </div>
          )}
          
          {/* Step 3: Module Selector */}
          <ModuleSelector
            springType="compression"
            modules={modules}
            onModulesChange={setModules}
            compact
          />
          
          {/* Stiffness Comparison Table - only in stiffnessSelection mode */}
          {calcMode === "stiffnessSelection" && (
            <StiffnessComparisonTable 
              options={stiffnessOptions} 
              onSelect={(opt) => handleApplyResults({ n: opt.n })}
            />
          )}
          
          {/* Summary - only in verification mode */}
          {calcMode === "verification" && (
            <ResultSummary result={result} />
          )}
          
          {/* Load Points - only in verification mode */}
          {calcMode === "verification" && (
            <LoadPointList
              springType="compression"
              results={adaptLoadPointsToLoadCases(result.loadPoints)}
              inputValues={inputValues}
              onInputChange={handleInputChange}
              modules={modules}
              limits={{
                min: Hb,
                max: H0,
                minLabel: "Hb",
                maxLabel: "H0"
              }}
            />
          )}
          
          {/* Solid Height Reference - only show if solidAnalysis enabled */}
          {modules.solidAnalysis && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              压并高度 / Solid Height: Hb = {Hb.toFixed(2)} mm | 自由长度 / Free Length: H0 = {H0.toFixed(2)} mm
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
