import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Target, Move } from "lucide-react";
import { DesignSpace } from "@/lib/spring-platform/design-space-types";

interface DesignSpacePanelProps {
  springType: string;
  initialParams: any;
  onGenerate: (space: DesignSpace) => Promise<void>;
  isGenerating: boolean;
}

export function DesignSpacePanel({ springType, initialParams, onGenerate, isGenerating }: DesignSpacePanelProps) {
  const [ranges, setRanges] = useState({
    d: [initialParams.d * 0.8, initialParams.d * 1.2],
    D: [initialParams.D * 0.8, initialParams.D * 1.2],
    n: [Math.max(2, initialParams.n - 5), initialParams.n + 5],
  });

  const [target, setTarget] = useState({
    inputValue: initialParams.H0 ? initialParams.H0 * 0.8 : 30,
    targetValue: 50,
  });

  const handleGenerate = () => {
    onGenerate({
      springType: springType as any,
      ranges: {
        d: [ranges.d[0], ranges.d[1]],
        D: [ranges.D[0], ranges.D[1]],
        n: [ranges.n[0], ranges.n[1]],
        H0: initialParams.H0 ? [initialParams.H0, initialParams.H0] : undefined
      },
      targets: [
        {
          inputValue: target.inputValue,
          inputMode: springType === "torsion" ? "angle" : "height",
          targetValue: target.targetValue,
          tolerance: 0.1
        }
      ]
    });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          自动方案生成 / Automated Design Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Ranges */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
              <Move className="h-3 w-3" /> 搜索范围 / Search Ranges
            </Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">线径 d (Min/Max)</Label>
                <div className="flex gap-1">
                  <NumericInput value={ranges.d[0]} onChange={v => setRanges({...ranges, d: [v || 0, ranges.d[1]]})} className="h-7 text-xs" />
                  <NumericInput value={ranges.d[1]} onChange={v => setRanges({...ranges, d: [ranges.d[0], v || 0]})} className="h-7 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">中径 D (Min/Max)</Label>
                <div className="flex gap-1">
                  <NumericInput value={ranges.D[0]} onChange={v => setRanges({...ranges, D: [v || 0, ranges.D[1]]})} className="h-7 text-xs" />
                  <NumericInput value={ranges.D[1]} onChange={v => setRanges({...ranges, D: [ranges.D[0], v || 0]})} className="h-7 text-xs" />
                </div>
              </div>
            </div>
          </div>

          {/* Target */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> 性能目标 / Performance Target
            </Label>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">目标高度 H (mm)</Label>
                <NumericInput value={target.inputValue} onChange={v => setTarget({...target, inputValue: v || 0})} className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">目标负荷 P (N)</Label>
                <NumericInput value={target.targetValue} onChange={v => setTarget({...target, targetValue: v || 0})} className="h-7 text-xs" />
              </div>
            </div>
          </div>
        </div>

        <Button 
          className="w-full h-9 text-xs font-bold gap-2 shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? "生成中... / Generating..." : "开始搜索设计方案 / Search Design Schemes"}
        </Button>
      </CardContent>
    </Card>
  );
}
