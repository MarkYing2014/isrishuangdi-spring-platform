"use client";

/**
 * Die Spring Stroke Bar - Visual Stroke Limit Indicator
 * 模具弹簧行程条 - 可视化行程限制指示器
 * 
 * Shows:
 * - Green zone: safe stroke
 * - Yellow zone: warning (fatigue risk)
 * - Red zone: prohibited (exceeds limit)
 * - Two red limit lines: catalog max AND L0 - solidHeight
 */

import { useMemo } from "react";

import {
  DieSpringSpec,
  DieSpringLifeClass,
  LIFE_CLASS_INFO,
} from "@/lib/dieSpring/types";
import { getStrokeLimitForLifeClass, getMaxPhysicalStroke } from "@/lib/dieSpring/math";

// ============================================================================
// PROPS
// ============================================================================

export interface DieSpringStrokeBarProps {
  /** Die spring specification */
  spec: DieSpringSpec | null;
  /** Applied stroke (mm) */
  appliedStroke: number;
  /** Selected life class */
  lifeClass?: DieSpringLifeClass;
  /** Language preference */
  isZh?: boolean;
  /** Bar height */
  height?: number;
  /** Show labels */
  showLabels?: boolean;
  /** Class name override */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DieSpringStrokeBar({
  spec,
  appliedStroke,
  lifeClass = "NORMAL",
  isZh = false,
  height = 24,
  showLabels = true,
  className = "",
}: DieSpringStrokeBarProps) {
  // Compute limits and zones
  const limits = useMemo(() => {
    if (!spec) return null;

    const maxPhysicalStroke = getMaxPhysicalStroke(spec);
    const effectiveMax = Math.min(spec.strokeLimits.max, maxPhysicalStroke);
    const lifeLimit = getStrokeLimitForLifeClass(spec.strokeLimits, lifeClass);
    const warnLimit = lifeLimit * 0.8;

    return {
      maxPhysical: maxPhysicalStroke,
      catalogMax: spec.strokeLimits.max,
      effectiveMax,
      lifeLimit,
      warnLimit,
      long: spec.strokeLimits.long,
      normal: spec.strokeLimits.normal,
    };
  }, [spec, lifeClass]);

  if (!spec || !limits) {
    return (
      <div 
        className={`bg-muted rounded ${className}`}
        style={{ height }}
      >
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
          {isZh ? "选择弹簧以显示行程条" : "Select spring to show stroke bar"}
        </div>
      </div>
    );
  }

  // Calculate positions as percentages
  const scale = 100 / limits.effectiveMax;
  const strokePos = Math.min(100, appliedStroke * scale);
  const warnPos = Math.min(100, limits.warnLimit * scale);
  const lifePos = Math.min(100, limits.lifeLimit * scale);

  // Determine stroke position color
  const strokeColor = appliedStroke >= limits.lifeLimit
    ? "#ef4444" // red
    : appliedStroke >= limits.warnLimit
    ? "#eab308" // yellow
    : "#22c55e"; // green

  // Labels
  const lifeInfo = LIFE_CLASS_INFO[lifeClass];
  const lifeLimitLabel = `${isZh ? lifeInfo.name.zh : lifeInfo.name.en}: ${limits.lifeLimit.toFixed(1)} mm`;
  const maxLimitLabel = `${isZh ? "最大" : "Max"}: ${limits.effectiveMax.toFixed(1)} mm`;
  const currentLabel = `${isZh ? "当前" : "Current"}: ${appliedStroke.toFixed(1)} mm (${((appliedStroke / limits.lifeLimit) * 100).toFixed(0)}%)`;

  return (
    <div className={`relative ${className}`} style={{ height: height + (showLabels ? 20 : 0) }}>
      {/* Background bar with gradient zones */}
      <div 
        className="absolute inset-x-0 rounded overflow-hidden flex"
        style={{ height, top: 0 }}
      >
        {/* Green zone (0 to warn limit) */}
        <div 
          className="h-full bg-gradient-to-r from-green-500/20 to-green-500/40"
          style={{ width: `${warnPos}%` }}
        />
        {/* Yellow zone (warn to life limit) */}
        <div 
          className="h-full bg-gradient-to-r from-yellow-500/30 to-yellow-500/50"
          style={{ width: `${lifePos - warnPos}%` }}
        />
        {/* Red zone (life limit to max) */}
        <div 
          className="h-full bg-gradient-to-r from-red-500/30 to-red-500/60"
          style={{ width: `${100 - lifePos}%` }}
        />
      </div>

      {/* Life limit line */}
      <div 
        className="absolute w-0.5 bg-yellow-500/70 cursor-help"
        style={{ left: `${lifePos}%`, height, top: 0 }}
        title={lifeLimitLabel}
      >
        <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-yellow-500 rounded-full" />
      </div>

      {/* Max limit line */}
      <div 
        className="absolute w-0.5 bg-red-500 cursor-help"
        style={{ right: 0, height, top: 0 }}
        title={maxLimitLabel}
      >
        <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
      </div>

      {/* Current stroke indicator */}
      <div 
        className="absolute w-1 rounded-full cursor-help transition-all duration-200"
        style={{ 
          left: `${strokePos}%`, 
          transform: "translateX(-50%)",
          backgroundColor: strokeColor,
          boxShadow: `0 0 8px ${strokeColor}80`,
          height,
          top: 0,
        }}
        title={currentLabel}
      >
        <div 
          className="absolute -bottom-3 -translate-x-1/2 left-1/2 transform rotate-180"
          style={{
            width: 0,
            height: 0,
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: `6px solid ${strokeColor}`,
          }}
        />
      </div>

      {/* Labels */}
      {showLabels && (
        <div 
          className="absolute left-0 right-0 flex justify-between text-[10px] text-muted-foreground"
          style={{ top: height + 4 }}
        >
          <span>0</span>
          <span>{limits.effectiveMax.toFixed(0)} mm</span>
        </div>
      )}
    </div>
  );
}

export default DieSpringStrokeBar;
