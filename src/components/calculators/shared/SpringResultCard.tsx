"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SpringType } from "@/lib/springTypes";
import type { SafetyFactorResult } from "@/lib/springMath";

interface ResultRowProps {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  status?: "safe" | "warning" | "danger";
}

/**
 * Single result row with label and value
 */
export function ResultRow({ label, value, unit, highlight, status }: ResultRowProps) {
  const statusColors = {
    safe: "text-emerald-700 dark:text-emerald-400",
    warning: "text-amber-700 dark:text-amber-400",
    danger: "text-red-700 dark:text-red-400",
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn("text-slate-700 dark:text-slate-300", highlight && "font-medium")}>{label}</span>
      <span className={cn(
        "font-semibold",
        status ? statusColors[status] : "text-slate-900 dark:text-slate-50",
        highlight && "text-emerald-700 dark:text-emerald-400"
      )}>
        {typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        {unit && <span className="ml-1 text-slate-500 dark:text-slate-400 font-normal">{unit}</span>}
      </span>
    </div>
  );
}

interface SpringResultCardProps {
  title?: string;
  subtitle?: string;
  springType: SpringType;
  children: React.ReactNode;
  className?: string;
  safetyFactor?: SafetyFactorResult;
}

/**
 * Unified result card for all spring calculators
 * 所有弹簧计算器的统一结果卡片
 */
export function SpringResultCard({
  title = "Results / 计算结果",
  subtitle,
  springType,
  children,
  className,
  safetyFactor,
}: SpringResultCardProps) {
  const getSafetyBadge = () => {
    if (!safetyFactor) return null;
    
    const colors = {
      safe: "bg-green-500",
      warning: "bg-amber-500",
      danger: "bg-red-500",
    };

    return (
      <Badge className={cn("text-white text-xs", colors[safetyFactor.status])}>
        SF = {safetyFactor.sfStatic.toFixed(2)}
      </Badge>
    );
  };

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>
            )}
          </div>
          {getSafetyBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface ResultSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Section within a result card
 */
export function ResultSection({ title, children, className }: ResultSectionProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-xs font-medium text-slate-700 dark:text-slate-400 uppercase tracking-wide">
        {title}
      </h4>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

interface EmptyResultProps {
  message?: string;
  messageZh?: string;
}

/**
 * Empty state for result card
 */
export function EmptyResult({ 
  message = "Input parameters and run the calculation to view results.",
  messageZh = "输入参数并点击计算，查看结果。"
}: EmptyResultProps) {
  return (
    <p className="text-sm text-slate-700 dark:text-slate-200">
      {message}
      <br />
      <span className="text-slate-600 dark:text-slate-400">{messageZh}</span>
    </p>
  );
}
