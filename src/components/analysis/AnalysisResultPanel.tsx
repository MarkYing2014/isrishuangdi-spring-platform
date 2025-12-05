"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";
import type { SpringAnalysisResult } from "@/lib/engine/types";

interface AnalysisResultPanelProps {
  result: SpringAnalysisResult;
  className?: string;
}

/**
 * Unified analysis result panel for all spring types
 * 所有弹簧类型的统一分析结果面板
 */
export function AnalysisResultPanel({ result, className }: AnalysisResultPanelProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const formatNumber = (n: number, decimals = 2) =>
    Number(n.toFixed(decimals)).toLocaleString();

  const formatCycles = (n: number) => {
    if (!isFinite(n)) return "∞";
    if (n >= 1e7) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
    return n.toString();
  };

  const getSafetyColor = (status: "safe" | "warning" | "danger") => {
    switch (status) {
      case "safe": return "bg-green-500";
      case "warning": return "bg-amber-500";
      case "danger": return "bg-red-500";
    }
  };

  const getFatigueColor = (rating: string) => {
    switch (rating) {
      case "infinite": return "bg-green-500";
      case "high": return "bg-green-400";
      case "medium": return "bg-amber-500";
      case "low": return "bg-orange-500";
      case "very_low": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{isZh ? "工程分析结果" : "Engineering Analysis Results"}</span>
          {result.warnings.length > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              {result.warnings.length} {isZh ? "警告" : "warnings"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stress" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stress">{isZh ? "应力" : "Stress"}</TabsTrigger>
            <TabsTrigger value="safety">{isZh ? "安全" : "Safety"}</TabsTrigger>
            <TabsTrigger value="fatigue">{isZh ? "疲劳" : "Fatigue"}</TabsTrigger>
            {result.buckling && (
              <TabsTrigger value="buckling">{isZh ? "屈曲" : "Buckling"}</TabsTrigger>
            )}
          </TabsList>

          {/* Stress Tab */}
          <TabsContent value="stress" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">τ_nominal</p>
                <p className="font-medium">{formatNumber(result.stress.tauNominal)} MPa</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">K_w (Wahl)</p>
                <p className="font-medium">{formatNumber(result.stress.wahlFactor, 3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">K_surface</p>
                <p className="font-medium">{formatNumber(result.stress.surfaceFactor, 3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">K_size</p>
                <p className="font-medium">{formatNumber(result.stress.sizeFactor, 3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">K_temp</p>
                <p className="font-medium">{formatNumber(result.stress.tempFactor, 3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">K_total</p>
                <p className="font-semibold">{formatNumber(result.stress.totalCorrectionFactor, 3)}</p>
              </div>
            </div>
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground">
                {isZh ? "有效剪应力 τ_eff" : "Effective Shear Stress τ_eff"}
              </p>
              <p className="text-xl font-bold text-blue-600">
                {formatNumber(result.stress.tauEffective)} MPa
              </p>
            </div>
            {result.stress.bendingStress !== undefined && (
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">
                  {isZh ? "弯曲应力 σ" : "Bending Stress σ"}
                </p>
                <p className="text-lg font-semibold text-purple-600">
                  {formatNumber(result.stress.bendingStress)} MPa
                </p>
              </div>
            )}
          </TabsContent>

          {/* Safety Tab */}
          <TabsContent value="safety" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {isZh ? "许用应力 τ_allow" : "Allowable Stress τ_allow"}
                </p>
                <p className="font-medium">{formatNumber(result.safety.allowableStress)} MPa</p>
              </div>
              <Badge className={cn("text-white", getSafetyColor(result.safety.status))}>
                {isZh ? result.safety.message.zh : result.safety.message.en}
              </Badge>
            </div>
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground">
                {isZh ? "静态安全系数 SF" : "Static Safety Factor SF"}
              </p>
              <p className={cn(
                "text-2xl font-bold",
                result.safety.status === "safe" ? "text-green-600" :
                result.safety.status === "warning" ? "text-amber-600" : "text-red-600"
              )}>
                {formatNumber(result.safety.staticSafetyFactor)}
              </p>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p>{isZh ? "安全系数阈值：" : "Safety Factor Thresholds:"}</p>
              <ul className="mt-1 space-y-0.5">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  SF ≥ 1.5: {isZh ? "安全" : "Safe"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  1.2 ≤ SF &lt; 1.5: {isZh ? "临界" : "Marginal"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  SF &lt; 1.2: {isZh ? "不安全" : "Unsafe"}
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Fatigue Tab */}
          <TabsContent value="fatigue" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">τ_mean</p>
                <p className="font-medium">{formatNumber(result.fatigue.tauMean)} MPa</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">τ_alt</p>
                <p className="font-medium">{formatNumber(result.fatigue.tauAlt)} MPa</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isZh ? "应力比 R" : "Stress Ratio R"}
                </p>
                <p className="font-medium">{formatNumber(result.fatigue.stressRatio, 3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {isZh ? "无限寿命 SF" : "Infinite Life SF"}
                </p>
                <p className="font-medium">{formatNumber(result.fatigue.infiniteLifeSafetyFactor)}</p>
              </div>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {isZh ? "预估疲劳寿命" : "Estimated Fatigue Life"}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCycles(result.fatigue.estimatedCycles)} {isZh ? "次" : "cycles"}
                </p>
              </div>
              <Badge className={cn("text-white", getFatigueColor(result.fatigue.rating))}>
                {result.fatigue.rating === "infinite" ? "∞" : result.fatigue.rating.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isZh ? result.fatigue.message.zh : result.fatigue.message.en}
            </p>
          </TabsContent>

          {/* Buckling Tab (compression springs only) */}
          {result.buckling && (
            <TabsContent value="buckling" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isZh ? "细长比 λ" : "Slenderness λ"}
                  </p>
                  <p className="font-medium">{formatNumber(result.buckling.slendernessRatio)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isZh ? "临界载荷 P_cr" : "Critical Load P_cr"}
                  </p>
                  <p className="font-medium">{formatNumber(result.buckling.criticalLoad)} N</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isZh ? "工作载荷" : "Working Load"}
                  </p>
                  <p className="font-medium">{formatNumber(result.buckling.workingLoad)} N</p>
                </div>
              </div>
              <div className="border-t pt-2 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isZh ? "屈曲安全系数" : "Buckling Safety Factor"}
                  </p>
                  <p className={cn(
                    "text-2xl font-bold",
                    result.buckling.status === "safe" ? "text-green-600" :
                    result.buckling.status === "warning" ? "text-amber-600" : "text-red-600"
                  )}>
                    {formatNumber(result.buckling.bucklingSafetyFactor)}
                  </p>
                </div>
                <Badge className={cn("text-white", getSafetyColor(result.buckling.status))}>
                  {isZh ? result.buckling.message.zh : result.buckling.message.en}
                </Badge>
              </div>
              {result.buckling.recommendations && result.buckling.recommendations.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium text-amber-600 mb-1">
                    {isZh ? "建议措施：" : "Recommendations:"}
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {result.buckling.recommendations.map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Warnings Section */}
        {result.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-medium text-amber-700 mb-1">
              {isZh ? "警告" : "Warnings"}
            </p>
            <ul className="text-xs text-amber-600 space-y-0.5">
              {result.warnings.map((warning, i) => (
                <li key={i}>⚠ {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
