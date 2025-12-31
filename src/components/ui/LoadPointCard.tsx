"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";

import {
  type LoadPointResult,
  type LoadPointStatus,
  type InputMode,
  type DisplayModules,
  DEFAULT_MODULES,
} from "@/lib/compressionSpringMultiPoint";

// ============================================================================
// Types
// ============================================================================

interface LoadPointCardProps {
  /** Point index (0-based) */
  index: number;
  /** Calculated result for this point */
  result: LoadPointResult;
  /** Input mode: height or deflection */
  inputMode: InputMode;
  /** Current input value (H or δ depending on mode) */
  inputValue: number;
  /** Callback when input changes */
  onInputChange: (value: number) => void;
  /** Free length H0 for validation */
  H0: number;
  /** Solid height Hb for validation */
  Hb: number;
  /** Whether this is the solid height display point */
  isSolidPoint?: boolean;
  /** Module display settings */
  modules?: DisplayModules;
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status, message }: { status: LoadPointStatus; message?: string }) {
  if (status === "ok") {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        OK
      </Badge>
    );
  }
  
  if (status === "warning") {
    return (
      <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {message || "Warning"}
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive">
      <AlertCircle className="h-3 w-3 mr-1" />
      {message || "Error"}
    </Badge>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LoadPointCard({
  index,
  result,
  inputMode,
  inputValue,
  onInputChange,
  H0,
  Hb,
  isSolidPoint = false,
  modules = DEFAULT_MODULES,
}: LoadPointCardProps) {
  const label = result.label || `L${index + 1}`;
  
  // Determine which field is editable based on input mode
  const isHeightMode = inputMode === "height";
  
  // Module visibility flags
  const showLoad = modules.loadAnalysis;
  const showStress = modules.stressCheck;
  const showStatus = modules.stressCheck || modules.solidAnalysis;
  
  // Format helpers
  const fmt = (v: number, decimals = 2) => v.toFixed(decimals);
  
  return (
    <Card className={`${result.status === "error" && showStatus ? "border-red-300 bg-red-50" : result.status === "warning" && showStatus ? "border-yellow-300 bg-yellow-50" : ""}`}>
      <CardHeader className="py-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {label}
            {isSolidPoint && <span className="text-xs text-muted-foreground ml-2">(压并)</span>}
          </CardTitle>
          {showStatus && <StatusBadge status={result.status} message={result.statusMessage} />}
        </div>
      </CardHeader>
      <CardContent className="py-2 space-y-3">
        {/* Input Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Height H */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              高度 H (mm)
            </Label>
            {isHeightMode && !isSolidPoint ? (
              <NumericInput
                value={inputValue}
                onChange={(v) => onInputChange(v ?? 0)}
                step={0.5}
                min={Hb}
                max={H0}
                className="h-8"
              />
            ) : (
              <div className="h-8 px-3 py-1.5 bg-muted rounded-md text-sm">
                {fmt(result.H)}
              </div>
            )}
          </div>
          
          {/* Deflection δ */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              压缩量 δ (mm)
            </Label>
            {!isHeightMode && !isSolidPoint ? (
              <NumericInput
                value={inputValue}
                onChange={(v) => onInputChange(v ?? 0)}
                step={0.5}
                min={0}
                max={H0 - Hb}
                className="h-8"
              />
            ) : (
              <div className="h-8 px-3 py-1.5 bg-muted rounded-md text-sm">
                {fmt(result.delta)}
              </div>
            )}
          </div>
        </div>
        
        {/* Output Row - Conditional based on modules */}
        {(showLoad || showStress) && (
          <div className={`grid gap-3 ${showLoad && showStress ? "grid-cols-2" : "grid-cols-1"}`}>
            {/* Load P */}
            {showLoad && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  力 P (N)
                </Label>
                <div className="h-8 px-3 py-1.5 bg-blue-50 rounded-md text-sm font-medium text-blue-900">
                  {fmt(result.P, 1)}
                </div>
              </div>
            )}
            
            {/* Stress τk */}
            {showStress && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  应力 τk (MPa)
                </Label>
                <div className={`h-8 px-3 py-1.5 rounded-md text-sm font-medium ${
                  showStatus && result.status === "error" ? "bg-red-100 text-red-900" :
                  showStatus && result.status === "warning" ? "bg-yellow-100 text-yellow-900" :
                  "bg-green-50 text-green-900"
                }`}>
                  {fmt(result.Tk, 0)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Load Point List Component
// ============================================================================

interface LoadPointListProps {
  /** Calculation results for all points */
  results: LoadPointResult[];
  /** Input mode */
  inputMode: InputMode;
  /** Current input values array */
  inputValues: number[];
  /** Callback when an input changes */
  onInputChange: (index: number, value: number) => void;
  /** Free length H0 */
  H0: number;
  /** Solid height Hb */
  Hb: number;
  /** Module display settings */
  modules?: DisplayModules;
}

export function LoadPointList({
  results,
  inputMode,
  inputValues,
  onInputChange,
  H0,
  Hb,
  modules,
}: LoadPointListProps) {
  return (
    <div className="space-y-3">
      {results.map((result, index) => (
        <LoadPointCard
          key={result.label}
          index={index}
          result={result}
          inputMode={inputMode}
          inputValue={inputValues[index] ?? 0}
          onInputChange={(value) => onInputChange(index, value)}
          H0={H0}
          Hb={Hb}
          modules={modules}
        />
      ))}
    </div>
  );
}
