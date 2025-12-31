"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertCircle, Calculator, Target, Layers } from "lucide-react";

import {
  type CalcMode,
  type TargetLoadInput,
  type StiffnessOptionResult,
  type LoadPointStatus,
  generateStiffnessOptions,
  solveActiveCoilsForTarget,
  DEFAULT_CANDIDATE_STIFFNESSES,
} from "@/lib/compressionSpringMultiPoint";

// ============================================================================
// Calc Mode Selector
// ============================================================================

interface CalcModeSelectorProps {
  value: CalcMode;
  onChange: (mode: CalcMode) => void;
}

export function CalcModeSelector({ value, onChange }: CalcModeSelectorProps) {
  const modes: { mode: CalcMode; label: string; icon: React.ReactNode; description: string }[] = [
    { mode: "verification", label: "验证 / Verify", icon: <Calculator className="h-4 w-4" />, description: "给定几何，计算力学 / Check design" },
    { mode: "targetLoad", label: "反算 / Reverse", icon: <Target className="h-4 w-4" />, description: "给定 (H, P)，求 n / Target load" },
    { mode: "stiffnessSelection", label: "选型 / Select", icon: <Layers className="h-4 w-4" />, description: "刚度方案对比 / Compare options" },
  ];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">计算模式 / Calculation Mode</Label>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => (
          <button
            key={m.mode}
            type="button"
            onClick={() => onChange(m.mode)}
            className={`p-3 rounded-lg border text-left transition-all ${
              value === m.mode
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-input bg-background hover:bg-muted"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {m.icon}
              <span className="font-medium text-sm">{m.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{m.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Target Load Input Panel (for Mode B)
// ============================================================================

interface TargetLoadPanelProps {
  target: TargetLoadInput;
  onTargetChange: (target: TargetLoadInput) => void;
  solveResult?: { n: number; k: number; isValid: boolean; message?: string };
  onApply?: (n: number) => void;
}

export function TargetLoadPanel({ target, onTargetChange, solveResult, onApply }: TargetLoadPanelProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          目标载荷点 / Target Load Point
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
          <Label className="text-xs">目标高度 / Target H (mm)</Label>
            <NumericInput
              value={target.H}
              onChange={(v) => onTargetChange({ ...target, H: v ?? 0 })}
              step={0.5}
              className="h-8"
            />
          </div>
          <div>
          <Label className="text-xs">目标力 / Target P (N)</Label>
            <NumericInput
              value={target.P}
              onChange={(v) => onTargetChange({ ...target, P: v ?? 0 })}
              step={1}
              className="h-8"
            />
          </div>
        </div>
        
        {solveResult && (
          <div className={`p-3 rounded-md ${solveResult.isValid ? "bg-green-100" : "bg-red-100"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  求解圈数 / Solved: n = {solveResult.n.toFixed(1)} 圈 / coils
                </div>
                <div className="text-xs text-muted-foreground">
                  对应刚度 / Rate: k = {solveResult.k.toFixed(3)} N/mm
                </div>
                {!solveResult.isValid && (
                  <div className="text-xs text-red-600 mt-1">{solveResult.message}</div>
                )}
              </div>
              {solveResult.isValid && onApply && (
                <Button size="sm" onClick={() => onApply(solveResult.n)}>
                  应用 / Apply
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Stiffness Candidates Input (for Mode C)
// ============================================================================

interface StiffnessCandidatesInputProps {
  candidates: number[];
  onCandidatesChange: (candidates: number[]) => void;
}

export function StiffnessCandidatesInput({ candidates, onCandidatesChange }: StiffnessCandidatesInputProps) {
  const addCandidate = () => {
    if (candidates.length < 8) {
      const lastValue = candidates[candidates.length - 1] || 3.0;
      onCandidatesChange([...candidates, lastValue + 0.5]);
    }
  };

  const removeCandidate = (index: number) => {
    if (candidates.length > 2) {
      onCandidatesChange(candidates.filter((_, i) => i !== index));
    }
  };

  const updateCandidate = (index: number, value: number) => {
    const next = [...candidates];
    next[index] = value;
    onCandidatesChange(next);
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            候选刚度 / Candidate Stiffnesses
          </CardTitle>
          <Button size="sm" variant="outline" onClick={addCandidate} disabled={candidates.length >= 8}>
            + 添加 / Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {candidates.map((k, i) => (
            <div key={i} className="flex items-center gap-1 bg-white rounded-md border px-2 py-1">
              <NumericInput
                value={k}
                onChange={(v) => updateCandidate(i, v ?? 0)}
                step={0.1}
                min={0.1}
                className="h-6 w-16 text-xs"
              />
              <span className="text-xs text-muted-foreground">N/mm</span>
              {candidates.length > 2 && (
                <button
                  onClick={() => removeCandidate(i)}
                  className="text-red-500 hover:text-red-700 text-xs ml-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Stiffness Comparison Table
// ============================================================================

function StatusIndicator({ status, isValid }: { status: LoadPointStatus; isValid: boolean }) {
  if (!isValid) {
    return <Badge variant="destructive" className="text-xs">无效</Badge>;
  }
  if (status === "ok") {
    return <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
  }
  if (status === "warning") {
    return <Badge className="bg-yellow-100 text-yellow-800 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />警告</Badge>;
  }
  return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" />错误</Badge>;
}

interface StiffnessComparisonTableProps {
  options: StiffnessOptionResult[];
  onSelect?: (option: StiffnessOptionResult) => void;
}

export function StiffnessComparisonTable({ options, onSelect }: StiffnessComparisonTableProps) {
  if (options.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        无候选刚度方案 / No stiffness options
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium">方案 / Option</th>
            <th className="px-3 py-2 text-right font-medium">k (N/mm)</th>
            <th className="px-3 py-2 text-right font-medium">n (圈 / coils)</th>
            <th className="px-3 py-2 text-right font-medium">Hb (mm)</th>
            <th className="px-3 py-2 text-right font-medium">P@L1 (N)</th>
            <th className="px-3 py-2 text-right font-medium">P@L2 (N)</th>
            <th className="px-3 py-2 text-right font-medium">Max τk (MPa)</th>
            <th className="px-3 py-2 text-center font-medium">状态 / Status</th>
            {onSelect && <th className="px-3 py-2 text-center font-medium">操作 / Action</th>}
          </tr>
        </thead>
        <tbody>
          {options.map((opt) => (
            <tr
              key={opt.label}
              className={`border-b transition-colors ${
                !opt.isValid ? "bg-red-50 opacity-60" : "hover:bg-muted/30"
              }`}
            >
              <td className="px-3 py-2 font-medium">{opt.label}</td>
              <td className="px-3 py-2 text-right">{opt.k.toFixed(2)}</td>
              <td className="px-3 py-2 text-right">{opt.n.toFixed(1)}</td>
              <td className="px-3 py-2 text-right">{opt.Hb.toFixed(1)}</td>
              <td className="px-3 py-2 text-right">{opt.loadPoints[0]?.P.toFixed(1) ?? "-"}</td>
              <td className="px-3 py-2 text-right">{opt.loadPoints[1]?.P.toFixed(1) ?? "-"}</td>
              <td className="px-3 py-2 text-right">{opt.maxTk.toFixed(0)}</td>
              <td className="px-3 py-2 text-center">
                <StatusIndicator status={opt.status} isValid={opt.isValid} />
              </td>
              {onSelect && (
                <td className="px-3 py-2 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!opt.isValid}
                    onClick={() => onSelect(opt)}
                  >
                    选用 / Select
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
