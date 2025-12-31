"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Layers 
} from "lucide-react";

import { 
  type LoadCaseResult, 
  type CaseStatus,
  type PlatformSpringType,
  type PlatformModules
} from "@/lib/spring-platform/types";

// ============================================================================
// Types
// ============================================================================

interface LoadPointCardProps {
  /** Spring type for context */
  springType: PlatformSpringType;
  /** Point index (0-based) */
  index: number;
  /** Calculated result for this point */
  result: LoadCaseResult;
  /** Current input value */
  inputValue: number;
  /** Callback when input changes */
  onInputChange: (value: number) => void;
  /** Limits for validation (H0/Hb or freeAngle etc) */
  limits?: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
  /** Module display settings */
  modules: PlatformModules;
}

// ============================================================================
// Small Helpers
// ============================================================================

function StatusIcon({ status }: { status: CaseStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <AlertCircle className="h-4 w-4 text-red-500" />;
}

// ============================================================================
// Main Component
// ============================================================================

export function LoadPointCard({
  springType,
  index,
  result,
  inputValue,
  onInputChange,
  limits,
  modules,
}: LoadPointCardProps) {
  const label = result.labelZh || `点位 ${index + 1}`;
  const fmt = (v: number, decimals = 2) => v.toFixed(decimals);

  // Determine labels and units
  const isRotation = springType === "torsion" || springType === "arc";
  
  const inputLabel = result.inputMode === "height" ? "高度 H / Height H" : 
                    result.inputMode === "deflection" ? (springType === "extension" ? "拉伸量 x / Extension x" : "压缩量 δ / Deflection δ") :
                    result.inputMode === "angle" ? "角度 θ / Angle θ" : "扭矩 M / Torque M";
  
  const inputUnit = isRotation ? (result.inputMode === "angle" ? "deg" : "N·mm") : "mm";
  const outputLabel = isRotation ? "扭矩 M / Torque M" : "负荷 P / Load P";
  const outputUnit = isRotation ? "N·mm" : "N";
  const stressLabel = isRotation ? "弯曲应力 σ / Stress σ" : "剪应力 τk / Stress τk";

  return (
    <Card className={`overflow-hidden border-muted-foreground/10 ${result.status === "danger" ? "border-red-300 bg-red-50/30" : result.status === "warning" ? "border-yellow-300 bg-yellow-50/30" : ""}`}>
      {/* Header */}
      <CardHeader className="py-2 px-3 border-b bg-muted/5 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-muted font-mono">{result.id || `P${index+1}`}</Badge>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{label}</span>
          
          {/* Phase 7: Stage Badge for piecewise springs */}
          {result.stage !== undefined && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-blue-500/10 text-blue-600 border-blue-200">
              <Layers className="h-2.5 w-2.5 mr-0.5" /> Stage {result.stage}
            </Badge>
          )}
        </div>
        <StatusIcon status={result.status} />
      </CardHeader>

      <CardContent className="py-3 px-3 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Input Variable */}
          <div className="space-y-1">
            <Label className="text-[9px] text-muted-foreground font-bold uppercase">{inputLabel} ({inputUnit})</Label>
            <NumericInput
              value={inputValue}
              onChange={(v) => onInputChange(v ?? 0)}
              step={isRotation ? 1 : 0.5}
              min={limits?.min}
              max={limits?.max}
              className="h-7 text-xs bg-background/50 focus:bg-background transition-colors"
            />
          </div>

          {/* Load / Torque */}
          {modules.loadAnalysis && (
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground font-bold uppercase">{outputLabel} ({outputUnit})</Label>
              <div className="h-7 px-2 py-1 bg-blue-500/5 rounded-md text-xs font-bold text-blue-700 flex items-center border border-blue-200/50">
                {result.load !== undefined ? fmt(result.load, isRotation ? 1 : 2) : "-"}
              </div>
            </div>
          )}

          {/* Stress Variable */}
          {modules.stressAnalysis && (
            <div className="space-y-1">
              <Label className="text-[9px] text-muted-foreground font-bold uppercase">{stressLabel} (MPa)</Label>
              <div className={`h-7 px-2 py-1 rounded-md text-xs font-bold flex items-center border ${
                result.status === "danger" ? "bg-red-500/10 text-red-700 border-red-200" :
                result.status === "warning" ? "bg-yellow-500/10 text-yellow-700 border-yellow-200" :
                "bg-green-500/5 text-green-700 border-green-200/50"
              }`}>
                {result.stress !== undefined ? fmt(result.stress, 0) : "-"}
              </div>
            </div>
          )}
        </div>

        {/* Status Message / Audit feedback */}
        {(result.messageEn || result.messageZh) && (
          <div className={`text-[10px] p-1.5 rounded-md border flex items-start gap-1.5 ${
            result.status === "danger" ? "bg-red-50 text-red-800 border-red-100" : "bg-yellow-50 text-yellow-800 border-yellow-100"
          }`}>
             <span className="font-bold opacity-70">[{result.statusReason?.toUpperCase()}]</span> 
             <span>{result.messageZh || result.messageEn}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// List Component
// ============================================================================

interface LoadPointListProps {
  springType: PlatformSpringType;
  results: LoadCaseResult[];
  inputValues: number[];
  onInputChange: (index: number, value: number) => void;
  modules: PlatformModules;
  limits?: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
}

export function LoadPointList({
  springType,
  results,
  inputValues,
  onInputChange,
  modules,
  limits,
}: LoadPointListProps) {
  return (
    <div className="space-y-2">
      {results.map((result, index) => (
        <LoadPointCard
          key={result.id || index}
          springType={springType}
          index={index}
          result={result}
          inputValue={inputValues[index] ?? 0}
          onInputChange={(value) => onInputChange(index, value)}
          modules={modules}
          limits={limits}
        />
      ))}
    </div>
  );
}
