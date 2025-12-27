"use client";

/**
 * Die Spring Life Badge - Audit Status Display
 * 模具弹簧寿命标签 - 审核状态显示
 * 
 * Displays:
 * - Life class (LONG/NORMAL/SHORT)
 * - Stroke utilization percentage
 * - PASS/WARN/FAIL color indicator
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

import {
  DieSpringSpec,
  DieSpringLifeClass,
  DieSpringAuditStatus,
  DieSpringAuditResult,
  LIFE_CLASS_INFO,
} from "@/lib/dieSpring/types";
import { getStrokeLimitForLifeClass } from "@/lib/dieSpring/math";

// ============================================================================
// PROPS
// ============================================================================

export interface DieSpringLifeBadgeProps {
  /** Audit result from auditDieSpring() */
  auditResult?: DieSpringAuditResult | null;
  /** Life class for display */
  lifeClass?: DieSpringLifeClass;
  /** Stroke utilization percentage */
  utilization?: number;
  /** Applied stroke (mm) */
  appliedStroke?: number;
  /** Spec for displaying stroke limit */
  spec?: DieSpringSpec | null;
  /** Language preference */
  isZh?: boolean;
  /** Badge size */
  size?: "sm" | "md" | "lg";
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DieSpringLifeBadge({
  auditResult,
  lifeClass = "NORMAL",
  utilization,
  appliedStroke,
  spec,
  isZh = false,
  size = "md",
}: DieSpringLifeBadgeProps) {
  // Derive status
  const status: DieSpringAuditStatus = auditResult?.status ?? "PASS";
  
  // Get life class info
  const lifeInfo = LIFE_CLASS_INFO[lifeClass];
  
  // Calculate utilization if not provided
  const displayUtilization = useMemo(() => {
    if (utilization !== undefined) return utilization;
    if (spec && appliedStroke !== undefined) {
      const limit = getStrokeLimitForLifeClass(spec.strokeLimits, lifeClass);
      return (appliedStroke / limit) * 100;
    }
    return null;
  }, [utilization, spec, appliedStroke, lifeClass]);

  // Style based on status
  const statusConfig = useMemo(() => {
    switch (status) {
      case "PASS":
        return {
          variant: "outline" as const,
          className: "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400",
          Icon: CheckCircle2,
          iconClassName: "text-green-500",
        };
      case "WARN":
        return {
          variant: "outline" as const,
          className: "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
          Icon: AlertTriangle,
          iconClassName: "text-yellow-500",
        };
      case "FAIL":
        return {
          variant: "outline" as const,
          className: "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400",
          Icon: XCircle,
          iconClassName: "text-red-500",
        };
    }
  }, [status]);

  // Size classes
  const sizeClasses = {
    sm: "h-5 text-xs px-1.5 gap-1",
    md: "h-6 text-sm px-2 gap-1.5",
    lg: "h-7 text-base px-2.5 gap-2",
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <Badge 
      variant={statusConfig.variant}
      className={`${statusConfig.className} ${sizeClasses[size]} font-medium inline-flex items-center`}
      title={isZh ? lifeInfo.description.zh : lifeInfo.description.en}
    >
      <statusConfig.Icon size={iconSize[size]} className={statusConfig.iconClassName} />
      <span>{isZh ? lifeInfo.name.zh : lifeInfo.name.en}</span>
      {displayUtilization !== null && (
        <span className="opacity-75">
          {displayUtilization.toFixed(0)}%
        </span>
      )}
    </Badge>
  );
}

export default DieSpringLifeBadge;
