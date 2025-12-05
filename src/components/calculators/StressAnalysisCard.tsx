"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { 
  StressCorrectionResult, 
  SafetyFactorResult, 
  FatigueLifeResult,
  PreloadResult,
} from "@/lib/springMath";
import { cn } from "@/lib/utils";

interface StressAnalysisCardProps {
  stressCorrection?: StressCorrectionResult;
  safetyFactor?: SafetyFactorResult;
  fatigueLife?: FatigueLifeResult;
  preload?: PreloadResult;
  className?: string;
}

/**
 * Card component displaying stress analysis results
 * 显示应力分析结果的卡片组件
 */
export function StressAnalysisCard({
  stressCorrection,
  safetyFactor,
  fatigueLife,
  preload,
  className,
}: StressAnalysisCardProps) {
  if (!stressCorrection && !safetyFactor && !fatigueLife && !preload) {
    return null;
  }

  const formatNumber = (n: number, decimals = 2) => 
    Number(n.toFixed(decimals)).toLocaleString();

  const formatCycles = (n: number) => {
    if (!isFinite(n)) return "∞";
    if (n >= 1e7) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return n.toString();
  };

  const getSafetyStatusColor = (status: SafetyFactorResult["status"]) => {
    switch (status) {
      case "safe": return "bg-green-500";
      case "warning": return "bg-amber-500";
      case "danger": return "bg-red-500";
    }
  };

  const getFatigueRatingColor = (rating: FatigueLifeResult["rating"]) => {
    switch (rating) {
      case "infinite": return "bg-green-500";
      case "high": return "bg-green-400";
      case "medium": return "bg-amber-500";
      case "low": return "bg-orange-500";
      case "very_low": return "bg-red-500";
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Stress & Safety Analysis / 应力与安全分析
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Stress Correction Section */}
        {stressCorrection && (
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">
              Stress Correction / 应力修正
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">τ_nominal:</span>
              <span>{formatNumber(stressCorrection.tauNominal)} MPa</span>
              
              <span className="text-muted-foreground">K_w (Wahl):</span>
              <span>{formatNumber(stressCorrection.factors.wahl, 3)}</span>
              
              <span className="text-muted-foreground">K_surface:</span>
              <span>{formatNumber(stressCorrection.factors.surface, 3)}</span>
              
              <span className="text-muted-foreground">K_size:</span>
              <span>{formatNumber(stressCorrection.factors.size, 3)}</span>
              
              <span className="text-muted-foreground">K_temp:</span>
              <span>{formatNumber(stressCorrection.factors.temp, 3)}</span>
              
              <span className="text-muted-foreground font-medium">K_total:</span>
              <span className="font-medium">{formatNumber(stressCorrection.kTotal, 3)}</span>
              
              <span className="text-muted-foreground font-medium">τ_effective:</span>
              <span className="font-semibold text-blue-600">
                {formatNumber(stressCorrection.tauEffective)} MPa
              </span>
            </div>
          </div>
        )}

        {/* Safety Factor Section */}
        {safetyFactor && (
          <div className="space-y-2 border-t pt-2">
            <h4 className="font-medium text-slate-700">
              Static Safety Factor / 静态安全系数
            </h4>
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">τ_allow:</span>
                <span>{formatNumber(safetyFactor.tauAllowStatic)} MPa</span>
                
                <span className="text-muted-foreground font-medium">SF_static:</span>
                <span className="font-semibold">{formatNumber(safetyFactor.sfStatic)}</span>
              </div>
              <Badge className={cn("text-white", getSafetyStatusColor(safetyFactor.status))}>
                {safetyFactor.statusText.en}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {safetyFactor.statusText.zh}
            </p>
          </div>
        )}

        {/* Fatigue Life Section */}
        {fatigueLife && (
          <div className="space-y-2 border-t pt-2">
            <h4 className="font-medium text-slate-700">
              Fatigue Life Estimation / 疲劳寿命估算
            </h4>
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">τ_mean:</span>
                <span>{formatNumber(fatigueLife.tauMean)} MPa</span>
                
                <span className="text-muted-foreground">τ_alt:</span>
                <span>{formatNumber(fatigueLife.tauAlt)} MPa</span>
                
                <span className="text-muted-foreground font-medium">Est. Cycles:</span>
                <span className="font-semibold">{formatCycles(fatigueLife.estimatedCycles)}</span>
                
                <span className="text-muted-foreground">SF_infinite:</span>
                <span>{formatNumber(fatigueLife.sfInfiniteLife)}</span>
              </div>
              <Badge className={cn("text-white", getFatigueRatingColor(fatigueLife.rating))}>
                {fatigueLife.rating === "infinite" ? "∞" : fatigueLife.rating.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {fatigueLife.ratingText.en} / {fatigueLife.ratingText.zh}
            </p>
          </div>
        )}

        {/* Preload Section */}
        {preload && preload.preloadDeflection > 0 && (
          <div className="space-y-2 border-t pt-2">
            <h4 className="font-medium text-slate-700">
              Preload / 预紧
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Preload x₀:</span>
              <span>{formatNumber(preload.preloadDeflection)} mm</span>
              
              <span className="text-muted-foreground">Preload F₀:</span>
              <span className="font-medium">{formatNumber(preload.preloadForce)} N</span>
              
              <span className="text-muted-foreground">Working F:</span>
              <span>{formatNumber(preload.workingForce)} N</span>
              
              <span className="text-muted-foreground">Preload Ratio:</span>
              <span className="font-medium">{formatNumber(preload.preloadRatio * 100, 1)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
