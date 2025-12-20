"use client";

/**
 * KPI Strip Component
 * KPI 指标条组件
 * 
 * 显示关键生产指标：计划/实际产量、OEE、FPY、报警数、UPH、平均节拍
 */

import { Activity, AlertTriangle, Clock, Target, TrendingUp, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { KpiSummary } from "@/lib/manufacturing/types";

interface KpiStripProps {
  kpis: KpiSummary;
  className?: string;
}

interface KpiCardProps {
  title: string;
  titleZh: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  status?: "good" | "warning" | "critical";
  subtitle?: string;
}

function KpiCard({ title, titleZh, value, unit, icon, status = "good", subtitle }: KpiCardProps) {
  const statusColors = {
    good: "text-emerald-600",
    warning: "text-amber-600",
    critical: "text-rose-600",
  };

  const bgColors = {
    good: "bg-emerald-50",
    warning: "bg-amber-50",
    critical: "bg-rose-50",
  };

  return (
    <Card className={`${bgColors[status]} border-0`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {title} / {titleZh}
            </p>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${statusColors[status]}`}>
                {value}
              </span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${bgColors[status]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiStrip({ kpis, className = "" }: KpiStripProps) {
  const completionRate = kpis.planQty > 0 ? kpis.actualQty / kpis.planQty : 0;
  const completionStatus = completionRate >= 0.9 ? "good" : completionRate >= 0.7 ? "warning" : "critical";

  const oeeStatus = kpis.oee >= 0.85 ? "good" : kpis.oee >= 0.65 ? "warning" : "critical";
  const fpyStatus = kpis.fpy >= 0.95 ? "good" : kpis.fpy >= 0.90 ? "warning" : "critical";
  const alarmStatus = kpis.activeAlarmsCount === 0 ? "good" : kpis.activeAlarmsCount <= 2 ? "warning" : "critical";

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 ${className}`}>
      <KpiCard
        title="Plan/Actual"
        titleZh="计划/实际"
        value={`${kpis.actualQty}/${kpis.planQty}`}
        icon={<Target className="h-5 w-5 text-slate-600" />}
        status={completionStatus}
        subtitle={`${(completionRate * 100).toFixed(0)}% 完成`}
      />

      <KpiCard
        title="OEE"
        titleZh="设备综合效率"
        value={(kpis.oee * 100).toFixed(1)}
        unit="%"
        icon={<TrendingUp className="h-5 w-5 text-slate-600" />}
        status={oeeStatus}
      />

      <KpiCard
        title="FPY"
        titleZh="首次合格率"
        value={(kpis.fpy * 100).toFixed(1)}
        unit="%"
        icon={<Activity className="h-5 w-5 text-slate-600" />}
        status={fpyStatus}
      />

      <KpiCard
        title="Alarms"
        titleZh="活跃报警"
        value={kpis.activeAlarmsCount}
        icon={<AlertTriangle className="h-5 w-5 text-slate-600" />}
        status={alarmStatus}
      />

      <KpiCard
        title="UPH"
        titleZh="每小时产量"
        value={kpis.uph}
        unit="pcs/h"
        icon={<Zap className="h-5 w-5 text-slate-600" />}
        status="good"
      />

      <KpiCard
        title="Avg CT"
        titleZh="平均节拍"
        value={kpis.ctAvgSec.toFixed(1)}
        unit="s"
        icon={<Clock className="h-5 w-5 text-slate-600" />}
        status="good"
      />
    </div>
  );
}

export default KpiStrip;
