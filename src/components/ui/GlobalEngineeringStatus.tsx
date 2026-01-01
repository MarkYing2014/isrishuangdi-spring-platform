"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert,
  Zap,
  ArrowRight
} from "lucide-react";
import { PlatformResult } from "@/lib/spring-platform/types";

interface KPIItemProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: "pass" | "warning" | "fail";
}

function KPIItem({ label, value, unit, status = "pass" }: KPIItemProps) {
  const statusColor = {
    pass: "text-green-600",
    warning: "text-amber-600",
    fail: "text-red-600"
  };

  return (
    <div className="flex flex-col items-center justify-center border-r last:border-r-0 px-4 py-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <div className={`text-lg font-bold font-mono flex items-baseline gap-0.5 ${statusColor[status]}`}>
        {value}
        {unit && <span className="text-[10px] font-normal opacity-70 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

interface GlobalEngineeringStatusProps {
  result: PlatformResult;
  title?: string;
  onJumpToRules?: () => void;
}

export function GlobalEngineeringStatus({ result, title, onJumpToRules }: GlobalEngineeringStatusProps) {
  const rules = result.designRules || [];
  const hasFail = rules.some(r => r.status === "fail") || !result.isValid;
  const hasWarning = rules.some(r => r.status === "warning");
  
  let status: "pass" | "warning" | "fail" = "pass";
  if (hasFail) status = "fail";
  else if (hasWarning) status = "warning";

  const config = {
    pass: {
      bg: "bg-green-50 border-green-200",
      icon: <ShieldCheck className="h-8 w-8 text-green-600" />,
      text: "合格 / SAFE FOR PRODUCTION",
      subtext: "所有核心工程判据均已通过评审。 / All critical engineering criteria passed.",
      badge: "Pass",
      badgeColor: "bg-green-100 text-green-800"
    },
    warning: {
      bg: "bg-amber-50 border-amber-200",
      icon: <AlertTriangle className="h-8 w-8 text-amber-600" />,
      text: "需评审 / ENGINEERING REVIEW REQUIRED",
      subtext: "部分非核心参数接近限值，请谨慎核对。 / Some non-critical parameters near limits.",
      badge: "Review",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300"
    },
    fail: {
      bg: "bg-red-50 border-red-200",
      icon: <ShieldAlert className="h-8 w-8 text-red-600" />,
      text: "不合格 / REDESIGN REQUIRED",
      subtext: "检测到严重设计缺陷，方案无法用于生产。 / Critical design failure detected.",
      badge: "Fail",
      badgeColor: "bg-red-100 text-red-800"
    }
  };

  const current = config[status];

  // Derive some primary KPIs from result
  // Note: Standardize these across engines in PlatformResult if possible
  const springIndex = result.springIndex?.toFixed(1) || "-";
  const energy = result.totalEnergy ? result.totalEnergy.toFixed(2) : (result.cases[result.cases.length-1]?.energy?.toFixed(2) || "-");
  
  // Find Fatigue SF if exists in cases or rules
  const minSF = result.cases.reduce((min, c) => Math.min(min, c.sfMin ?? 999), 999);
  const displaySF = minSF === 999 ? "-" : minSF.toFixed(2);

  // Find Max Stress Ratio
  const maxStress = result.cases.reduce((max, c) => Math.max(max, c.stress ?? 0), 0);
  // This needs tauAllow from material usually, assuming result.rawResult might have it or just show value
  
  return (
    <Card className={`overflow-hidden border-2 transition-all duration-300 ${current.bg} mb-6 shadow-sm`}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row items-stretch">
          {/* Status Icon & Main Conclusion */}
          <div className="flex-1 p-5 flex items-start gap-4">
            <div className="mt-1 shrink-0 animate-in fade-in zoom-in duration-500">{current.icon}</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight uppercase">{current.text}</h3>
                <Badge variant="outline" className={`${current.badgeColor} font-bold text-[10px] px-1.5 py-0`}>
                  {current.badge}
                </Badge>
                {result.workflowStatus && (
                  <Badge className="bg-slate-900/90 text-white text-[9px] font-black px-1.5 shadow-sm border-0">
                    {result.workflowStatus}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground/80 leading-relaxed max-w-[400px]">
                {result.workflowStatus === 'APPROVED' 
                  ? "此设计已批准生产。所有工程假设均已确认为有效。 / Design approved for production. All assumptions verified."
                  : current.subtext}
              </p>
              
              {status !== "pass" && onJumpToRules && (
                <button 
                  onClick={onJumpToRules}
                  className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-2 uppercase tracking-tighter"
                >
                  <AlertCircle className="h-3 w-3" />
                  查看报警项 / View Redlines
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* KPI Dashboard - The "Professional Dashboard" part */}
          <div className="bg-white/40 border-l border-t md:border-t-0 p-4 flex items-center justify-around min-w-[300px]">
            <KPIItem 
              label="疲劳安全 / Fatigue SF" 
              value={displaySF} 
              status={minSF < 1.0 ? "fail" : (minSF < 1.3 ? "warning" : "pass")}
            />
            <KPIItem 
              label="旋绕比 / Index C" 
              value={springIndex} 
              status={(parseFloat(springIndex) < 4 || parseFloat(springIndex) > 16) ? "warning" : "pass"}
            />
            <KPIItem 
              label="储能 / Energy" 
              value={energy} 
              unit="J" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
