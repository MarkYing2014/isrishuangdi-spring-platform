import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoveRight, History, Scale, Zap } from "lucide-react";
import { CandidateSolution } from "@/lib/spring-platform/candidate-solution";

interface ParetoSelectionViewProps {
  solutions: CandidateSolution[];
  onApply: (solution: CandidateSolution) => void;
  onUndo: () => void;
  hasHistory: boolean;
}

export function ParetoSelectionView({ solutions, onApply, onUndo, hasHistory }: ParetoSelectionViewProps) {
  // Sort by Pareto Rank then Mass
  const sorted = [...solutions].sort((a, b) => {
    if (a.paretoRank !== b.paretoRank) return a.paretoRank - b.paretoRank;
    return a.metrics.massProxy - b.metrics.massProxy;
  });

  return (
    <div className="space-y-4">
      {/* Undo / History Bar */}
      {hasHistory && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={onUndo}>
            <History className="h-3 w-3" /> 撤销更改 / Undo Changes
          </Button>
        </div>
      )}

      {/* Solutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.slice(0, 12).map((sol) => (
          <SolutionCard key={sol.id} solution={sol} onApply={() => onApply(sol)} />
        ))}
      </div>
      
      {sorted.length > 12 && (
        <div className="text-center text-[10px] text-muted-foreground italic">
          显示前 12 个最优方案 / Showing top 12 optimal schemes
        </div>
      )}
    </div>
  );
}

function SolutionCard({ solution, onApply }: { solution: CandidateSolution, onApply: () => void }) {
  const { params, metrics, paretoRank } = solution;
  
  return (
    <Card className={`relative overflow-hidden transition-all hover:border-primary/50 group ${paretoRank === 1 ? "border-primary/30 bg-primary/5" : ""}`}>
      {paretoRank === 1 && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] px-2 py-0.5 font-black uppercase tracking-widest rounded-bl-lg shadow-sm">
          Rank 1 / 最优集合
        </div>
      )}
      
      <CardContent className="p-3 space-y-3">
        {/* Params */}
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase font-bold">Geometry / 几何参数</div>
            <div className="text-xs font-mono font-bold">
              {params.t !== undefined ? (
                `t${params.t.toFixed(2)} h0${params.h0.toFixed(2)} Ns${params.series} Np${params.parallel}`
              ) : (
                `d${params.d.toFixed(2)} D${params.D.toFixed(1)} n${params.n.toFixed(2)}`
              )}
            </div>
          </div>
          <Badge variant={solution.platformResult.isValid ? "outline" : "destructive"} className="text-[8px] h-4">
            {solution.platformResult.isValid ? "有效 / Valid" : "无效 / Invalid"}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded border border-muted-foreground/10">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-bold">
              <Scale className="h-2.5 w-2.5 text-blue-500" /> 质量 / Mass
            </div>
            <div className="text-xs font-bold text-primary">{(metrics.massProxy / 100).toFixed(1)}</div>
          </div>
          <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded border border-muted-foreground/10">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-bold">
              <Zap className="h-2.5 w-2.5 text-orange-500" /> 应力比 / Stress
            </div>
            <div className={`text-xs font-bold ${metrics.maxStressRatio > 0.9 ? "text-orange-500" : "text-green-600"}`}>
              {(metrics.maxStressRatio * 100).toFixed(1)}%
            </div>
          </div>
          
          {metrics.totalEnergy !== undefined && (
             <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded border border-muted-foreground/10 col-span-2">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-bold">
                  <Zap className="h-2.5 w-2.5 text-yellow-500" /> 储能 / Energy
                </div>
                <div className="text-xs font-bold text-yellow-600">
                  {metrics.totalEnergy.toFixed(3)} J
                </div>
             </div>
          )}
        </div>

        {/* Apply Button */}
        <Button 
          variant="secondary" 
          className="w-full h-7 text-[10px] font-bold gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
          onClick={onApply}
        >
          应用方案 / Apply Design <MoveRight className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
