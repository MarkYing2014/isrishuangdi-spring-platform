"use client";

import { useLanguage } from "@/components/language-context";
import { STRESS_COLOR_THRESHOLDS } from "@/lib/engine/stressDistribution";
import { DAMAGE_THRESHOLDS } from "@/lib/engine/fatigueDamage";

interface StressColorLegendProps {
  mode: 'stress' | 'damage';
  maxValue?: number;
  unit?: string;
  className?: string;
}

export function StressColorLegend({
  mode,
  maxValue,
  unit = "MPa",
  className = "",
}: StressColorLegendProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  if (mode === 'stress') {
    return (
      <div className={`rounded-lg bg-black/70 p-3 text-white ${className}`}>
        <div className="mb-2 text-xs font-medium">
          {isZh ? "应力分布" : "Stress Distribution"}
        </div>
        
        {/* Gradient bar */}
        <div className="mb-2 h-4 w-full rounded" style={{
          background: 'linear-gradient(to right, #3b82f6, #22c55e, #eab308, #ef4444)'
        }} />
        
        {/* Labels */}
        <div className="flex justify-between text-[10px]">
          <span>0%</span>
          <span>{(STRESS_COLOR_THRESHOLDS.BLUE_MAX * 100).toFixed(0)}%</span>
          <span>{(STRESS_COLOR_THRESHOLDS.GREEN_MAX * 100).toFixed(0)}%</span>
          <span>{(STRESS_COLOR_THRESHOLDS.YELLOW_MAX * 100).toFixed(0)}%</span>
          <span>100%</span>
        </div>
        
        {/* Max value */}
        {maxValue !== undefined && (
          <div className="mt-2 text-xs">
            τ_max = {maxValue.toFixed(0)} {unit}
          </div>
        )}
        
        {/* Legend items */}
        <div className="mt-2 space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded bg-blue-500" />
            <span>{isZh ? "低应力" : "Low stress"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded bg-green-500" />
            <span>{isZh ? "中等应力" : "Moderate"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded bg-yellow-500" />
            <span>{isZh ? "高应力" : "Elevated"}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-4 rounded bg-red-500" />
            <span>{isZh ? "临界区" : "Critical"}</span>
          </div>
        </div>
      </div>
    );
  }

  // Damage mode
  return (
    <div className={`rounded-lg bg-black/70 p-3 text-white ${className}`}>
      <div className="mb-2 text-xs font-medium">
        {isZh ? "疲劳损伤" : "Fatigue Damage"}
      </div>
      
      {/* Gradient bar */}
      <div className="mb-2 h-4 w-full rounded" style={{
        background: 'linear-gradient(to right, #22c55e, #eab308, #f97316, #dc2626)'
      }} />
      
      {/* Labels */}
      <div className="flex justify-between text-[10px]">
        <span>D=0</span>
        <span>{DAMAGE_THRESHOLDS.SAFE_MAX}</span>
        <span>{DAMAGE_THRESHOLDS.MODERATE_MAX}</span>
        <span>{DAMAGE_THRESHOLDS.HIGH_MAX}</span>
        <span>&gt;1</span>
      </div>
      
      {/* Legend items */}
      <div className="mt-2 space-y-1 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 rounded bg-green-500" />
          <span>{isZh ? "安全" : "Safe"} (D &lt; 0.3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 rounded bg-yellow-500" />
          <span>{isZh ? "中等" : "Moderate"} (0.3-0.5)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 rounded bg-orange-500" />
          <span>{isZh ? "高损伤" : "High"} (0.5-1.0)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-4 rounded bg-red-700 animate-pulse" />
          <span>{isZh ? "预测失效" : "Failure"} (D ≥ 1)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline legend for toolbar
 */
export function StressColorLegendInline({
  mode,
  className = "",
}: {
  mode: 'stress' | 'damage';
  className?: string;
}) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <span className="text-muted-foreground">
        {mode === 'stress' ? (isZh ? "应力:" : "Stress:") : (isZh ? "损伤:" : "Damage:")}
      </span>
      <div className="flex items-center gap-1">
        <div className="h-3 w-3 rounded-sm bg-blue-500" title="Low" />
        <div className="h-3 w-3 rounded-sm bg-green-500" title="Moderate" />
        <div className="h-3 w-3 rounded-sm bg-yellow-500" title="Elevated" />
        <div className="h-3 w-3 rounded-sm bg-red-500" title="Critical" />
      </div>
    </div>
  );
}
