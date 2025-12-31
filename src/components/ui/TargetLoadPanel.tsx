"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { 
  PlatformSpringType, 
  PlatformInputMode, 
  SolveForTargetInput,
  SolveForTargetResult
} from "@/lib/spring-platform/types";

interface TargetLoadPanelProps {
  springType: PlatformSpringType;
  inputMode: PlatformInputMode;
  onSolve: (input: SolveForTargetInput) => SolveForTargetResult | null;
  onApply: (params: any) => void;
}

export function TargetLoadPanel({
  springType,
  inputMode,
  onSolve,
  onApply
}: TargetLoadPanelProps) {
  // Local state for target points
  const [mode, setMode] = useState<"singlePoint" | "twoPoint">(
    springType === "extension" ? "twoPoint" : "singlePoint"
  );
  
  const [t1, setT1] = useState({ x: 0, y: 0 });
  const [t2, setT2] = useState({ x: 0, y: 0 });

  // Labels
  const xLabel = inputMode === "height" ? "高度 H" : 
                (inputMode === "angle" ? "角度 θ" : (springType === "extension" ? "拉伸 x" : "压缩 δ"));
  const yLabel = springType === "torsion" ? "扭矩 M" : "负荷 P";
  const xUnit = springType === "torsion" ? "deg" : "mm";
  const yUnit = springType === "torsion" ? "Nmm" : "N";

  // Perform solving
  const solveResult = useMemo(() => {
    if (t1.x === 0 || t1.y === 0) return null;
    if (mode === "twoPoint" && (t2.x === 0 || t2.y === 0)) return null;

    return onSolve({
      mode,
      target1: t1,
      target2: mode === "twoPoint" ? t2 : undefined
    });
  }, [mode, t1, t2, onSolve]);

  return (
    <div className="space-y-4 pt-2">
      {/* Mode Switcher for Extension */}
      {springType === "extension" && (
        <div className="flex items-center gap-2 mb-2 p-1 bg-muted/30 rounded-lg w-fit">
          <button
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === "singlePoint" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("singlePoint")}
          >
            单点匹配 (固定 P0)
          </button>
          <button
            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${mode === "twoPoint" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("twoPoint")}
          >
            两点拟合 (求 k, P0)
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Target 1 */}
        <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-2 border-b pb-2 mb-1">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">1</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">目标点位 1 / Target 1</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground">{xLabel} ({xUnit})</Label>
              <NumericInput 
                value={t1.x} 
                onChange={v => setT1(prev => ({ ...prev, x: v ?? 0 }))}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-muted-foreground">{yLabel} ({yUnit})</Label>
              <NumericInput 
                value={t1.y} 
                onChange={v => setT1(prev => ({ ...prev, y: v ?? 0 }))}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Target 2 (if twoPoint) */}
        {mode === "twoPoint" && (
          <div className="p-3 border rounded-lg bg-card shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 border-b pb-2 mb-1">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">2</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">目标点位 2 / Target 2</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">{xLabel} ({xUnit})</Label>
                <NumericInput 
                  value={t2.x} 
                  onChange={v => setT2(prev => ({ ...prev, x: v ?? 0 }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium text-muted-foreground">{yLabel} ({yUnit})</Label>
                <NumericInput 
                  value={t2.y} 
                  onChange={v => setT2(prev => ({ ...prev, y: v ?? 0 }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Solving Status / Result */}
      {solveResult && (
        <div className={`p-4 rounded-xl border-2 transition-all ${solveResult.ok ? "border-emerald-500/30 bg-emerald-50/50" : "border-red-500/30 bg-red-50/50"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${solveResult.ok ? "bg-emerald-500" : "bg-red-500"}`}>
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  {solveResult.ok ? "已求得最优设计方案" : "方案求解失败"}
                  <span className="text-xs font-normal text-muted-foreground block text-[10px]">Optimal Design Found</span>
                </h4>
              </div>
            </div>
            {solveResult.ok && <Badge className="bg-emerald-500">READY</Badge>}
          </div>

          {solveResult.ok && solveResult.solvedParams && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(solveResult.solvedParams).map(([key, val]) => (
                  <div key={key} className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-500/20 shadow-sm text-center">
                    <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                      {key === 'n' ? '有效圈数 n' : (key === 'P0' ? '初拉力 P0' : key)}
                    </div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {(val as number).toFixed(2)}
                      <span className="text-[10px] ml-1 font-normal opacity-70">
                        {key === 'n' ? 'coils' : (key === 'P0' ? 'N' : '')}
                      </span>
                    </div>
                  </div>
                ))}
                {solveResult.derived?.k && (
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-blue-500/20 shadow-sm text-center">
                    <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">算得刚度 k</div>
                    <div className="text-sm font-black text-blue-600">
                      {solveResult.derived.k.toFixed(3)}
                      <span className="text-[10px] ml-1 font-normal opacity-70">N/mm</span>
                    </div>
                  </div>
                )}
              </div>

              {solveResult.warnings && solveResult.warnings.length > 0 && (
                <div className="p-2 bg-yellow-100/50 rounded-md border border-yellow-200 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="text-[10px] text-yellow-800">
                    {solveResult.warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                </div>
              )}

              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-lg shadow-emerald-600/20"
                onClick={() => onApply(solveResult.solvedParams)}
              >
                应用到计算器 / Apply Solution
              </Button>
            </div>
          )}

          {!solveResult.ok && (
            <div className="p-3 bg-red-100/50 rounded-lg border border-red-200 space-y-1">
              <div className="flex items-center gap-2 text-red-800 font-bold text-xs mb-1">
                <Info className="h-3 w-3" />
                求解错误 / Solver Errors:
              </div>
              <ul className="list-disc list-inside text-[10px] text-red-700 space-y-0.5">
                {solveResult.errors?.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Help Note */}
      <div className="text-[10px] text-muted-foreground p-3 border border-dashed rounded-lg bg-muted/10 leading-relaxed italic">
        <p>💡 **提示/Tip**: 反算设计基于目标力值自动推导最优有效圈数 $n$。对于拉簧，可选择两点法同时求得刚度 $k$ 和初拉力 $P_0$。</p>
        <p>Reverse solution derives $n$ from target load. For extension springs, the two-point method solves for both $k$ and $P_0$.</p>
      </div>
    </div>
  );
}
