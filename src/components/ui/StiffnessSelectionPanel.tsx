"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, ListFilter, ArrowRight } from "lucide-react";
import { 
  PlatformSpringType, 
  PlatformResult 
} from "@/lib/spring-platform/types";
import { getEngine } from "@/lib/spring-platform/engine-registry";

interface StiffnessSelectionPanelProps {
  springType: PlatformSpringType;
  geometry: any;
  material: any;
  onApply: (params: any) => void;
}

export function StiffnessSelectionPanel({
  springType,
  geometry,
  material,
  onApply
}: StiffnessSelectionPanelProps) {
  const [kInput, setKInput] = useState<string>("0.8, 1.0, 1.2");
  const isRotation = springType === "torsion" || springType === "arc";
  const isArc = springType === "arc";
  const isShock = springType === "shock";

  // Parse candidate values
  const candidates = useMemo(() => {
    return kInput.split(/[,;\s]+/)
      .map(s => parseFloat(s))
      .filter(v => !isNaN(v) && v > 0);
  }, [kInput]);

  // Generate comparison data
  const comparisonResults = useMemo(() => {
    if (candidates.length === 0) return [];
    
    const engine = getEngine(springType);
    const G = material.G ?? 79000;
    const E = material.E ?? 206000;
    const { d, D } = geometry;

    return candidates.map(k => {
      // 1. Solve for parameters from the candidate value (k)
      let solvedGeo = { ...geometry };
      let n = geometry.n;

      if (isArc) {
          // For arc, 'k' in input actually represents a scaling factor (kScale)
          const baseKScales = geometry.kScales || [1, 1.5, 2.5];
          solvedGeo.kScales = baseKScales.map((ks: number) => ks * k);
      } else if (isShock) {
          // For shock, we calculate required turns (n) to achieve candidate stiffness k
          // Using helical approximation as a baseline for the solver
          const Dm = geometry.meanDia?.mid || 50;
          const d = geometry.wireDia?.mid || 10;
          n = (G * Math.pow(d, 4)) / (8 * Math.pow(Dm, 3) * k);
          solvedGeo.totalTurns = n;
      } else if (springType === "torsion") {
          // kt = (E * d^4 * PI) / (D * n * 64 * 180) -> n = (E * d^4 * PI) / (64 * 180 * D * k)
          n = (E * Math.pow(d, 4) * Math.PI) / (64 * 180 * D * k);
          solvedGeo.n = n;
      } else if (springType === "disc") {
          // For disc, direct k -> params solve is complex, skip logic but allow calc
          solvedGeo.n = n; 
      } else {
          // Helical: k = (G * d^4) / (8 * D^3 * n) -> n = (G * d^4) / (8 * D^3 * k)
          n = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * k);
          solvedGeo.n = n;
      }

      // 2. Perform full calculation
      const res = engine.calculate({
        geometry: solvedGeo,
        material,
        cases: {
          mode: isRotation ? "angle" : "height",
          // Use sample points for comparison
          values: isRotation ? [10, 30] : [geometry.H0 - 10, geometry.H0 - 20]
        },
        modules: {
          basicGeometry: true,
          loadAnalysis: true,
          stressAnalysis: true,
          solidAnalysis: true,
          fatigueAnalysis: false,
          dynamics: false
        }
      });

      return {
        k: k,
        n: solvedGeo.n,
        result: res
      };
    });
  }, [candidates, springType, isArc, isRotation, geometry, material]);

  return (
    <div className="space-y-4 pt-2">
      {/* Input Section */}
      <div className="space-y-2 p-4 border rounded-xl bg-muted/10 shadow-inner">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-bold flex items-center gap-2">
            <ListFilter className="h-3 w-3 text-primary" />
            {isArc ? "输入刚度比例系数 / Enter kScale values" : "输入候选刚度 / Enter Candidate Stiffnesses"}
          </Label>
          <Badge variant="outline" className="text-[9px] font-mono">COMMA SEPARATED</Badge>
        </div>
        <input
          type="text"
          className="w-full h-10 px-3 py-2 text-sm rounded-lg border bg-background font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder={isArc ? "0.8, 1.0, 1.2" : "e.g. 5, 10, 15"}
          value={kInput}
          onChange={(e) => setKInput(e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground italic px-1">
          {isArc 
            ? "提示：输入刚度倍数（如 0.8 表示当前刚度的 80%）进行多级曲线方案对比。"
            : (isShock 
                ? "提示：输入候选刚度 (N/mm)，系统将自动调整圈数进行方案对比。"
                : "提示：输入多个刚度值进行方案对比，系统将自动计算所需圈数及性能。")}
        </p>
      </div>

      {/* Comparison Table */}
      {comparisonResults.length > 0 && (
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm border-primary/10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[120px] text-[10px] font-bold uppercase py-2">
                    {isArc ? '刚度系数 kScale' : '刚度 k'}
                  </TableHead>
                  <TableHead className="w-[100px] text-[10px] font-bold uppercase py-2">
                    {isArc ? '配置 Config' : '圈数 n'}
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2">
                    {isRotation ? '扭矩 (T1/T2)' : '负荷 (P1/P2)'}
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2">应力 (τ1/τ2)</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2">状态 Status</TableHead>
                  <TableHead className="w-[60px] py-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonResults.map((item, idx) => {
                  const c1 = item.result.cases[0];
                  const c2 = item.result.cases[1];
                  const hasError = item.result.cases.some(c => c.status === "danger");
                  const hasWarning = item.result.cases.some(c => c.status === "warning");

                  return (
                    <TableRow key={idx} className={`text-xs ${hasError ? "bg-red-50/30" : hasWarning ? "bg-yellow-50/30" : ""}`}>
                      <TableCell className="font-mono font-bold text-primary">
                        {item.k.toFixed(isArc ? 2 : (springType === 'torsion' ? 4 : 2))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {isArc ? `Stage x${item.k.toFixed(2)}` : (item.n?.toFixed(2) ?? "-")}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {c1?.load?.toFixed(1)} / {c2?.load?.toFixed(1)} <span className="text-[9px]">{isRotation ? 'Nmm' : 'N'}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {c1?.stress?.toFixed(0)} / {c2?.stress?.toFixed(0)} <span className="text-[9px]">MPa</span>
                      </TableCell>
                      <TableCell>
                         {hasError ? (
                           <Badge variant="destructive" className="text-[9px] h-4 px-1">DANGER</Badge>
                         ) : hasWarning ? (
                           <Badge variant="outline" className="text-[9px] h-4 px-1 border-yellow-500 text-yellow-700 bg-yellow-50">WARN</Badge>
                         ) : (
                           <Badge variant="outline" className="text-[9px] h-4 px-1 border-green-500 text-green-700 bg-green-50">SAFE</Badge>
                         )}
                      </TableCell>
                      <TableCell className="px-1 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary hover:bg-primary/10"
                          onClick={() => {
                            if (isArc) {
                                const baseKScales = geometry.kScales || [1, 1.5, 2.5];
                                onApply({ kScales: baseKScales.map((ks: number) => ks * item.k) });
                            } else if (isShock) {
                                onApply({ totalTurns: Number(item.n?.toFixed(2) || geometry.totalTurns) });
                            } else {
                                onApply({ n: Number(item.n?.toFixed(2) || geometry.n) });
                            }
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {comparisonResults.length === 0 && (
        <div className="py-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
          <LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-20" />
          <p className="text-xs text-muted-foreground font-medium">输入数值开始对比方案</p>
          <p className="text-[10px] text-muted-foreground">Enter values above to compare design schemes</p>
        </div>
      )}
    </div>
  );
}
