// src/components/audit/EngineeringAuditCard.tsx
"use client";

import React from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Info, 
  Activity, 
  Maximize2, 
  Zap, 
  Anchor,
  Compass
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-context";
import { SpringAuditResult, AuditStatus } from "@/lib/audit/types";

interface EngineeringAuditCardProps {
  audit: SpringAuditResult;
  governingVariable: string; // e.g., "Δθ" or "Δs"
}

export function EngineeringAuditCard({ audit, governingVariable }: EngineeringAuditCardProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  const statusIcons: Record<AuditStatus, React.ReactNode> = {
    PASS: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    WARN: <ShieldAlert className="w-5 h-5 text-amber-500" />,
    FAIL: <ShieldX className="w-5 h-5 text-rose-500" />,
    INFO: <Info className="w-5 h-5 text-blue-500" />,
  };

  const statusColors: Record<AuditStatus, string> = {
    PASS: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    WARN: "bg-amber-500/10 text-amber-600 border-amber-200",
    FAIL: "bg-rose-500/10 text-rose-600 border-rose-200",
    INFO: "bg-blue-500/10 text-blue-600 border-blue-200",
  };

  const getProgressColor = (status: AuditStatus) => {
    if (status === "FAIL") return "bg-rose-500";
    if (status === "WARN") return "bg-amber-500";
    if (status === "INFO") return "bg-blue-500";
    return "bg-emerald-500";
  };

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg bg-white/50 backdrop-blur-sm transition-all hover:shadow-xl">
      <CardHeader className="bg-slate-50/80 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 font-bold tracking-tight text-slate-800">
            {statusIcons[audit.status]}
            {isZh ? "工程审计 / Engineering Audit" : "Engineering Audit"}
          </CardTitle>
          <Badge variant="outline" className="font-mono text-[10px] bg-white text-slate-500 border-slate-200 uppercase tracking-widest px-2 py-0.5">
            PLATFORM STANDARD V1.0
          </Badge>
        </div>
        <p className="text-[11px] text-slate-500 font-medium mt-1 pl-7">
          {isZh ? "基于主失效模式确定的全局状态" : "Status is determined by the governing failure mode only."}
        </p>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Top Summary Section */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-inner overflow-hidden group">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-hover:bg-white/10" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                        {isZh ? "主失效模式" : "Governing Failure Mode"}
                    </p>
                    <h3 className="text-xl font-extrabold tracking-tight">
                        {isZh ? audit.summary.governingFailureModeZh : audit.summary.governingFailureMode}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 py-0 px-2 h-5 text-[10px]">
                            {isZh ? "工程变量" : "Gov Variable"}: {governingVariable}
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                            RATIO
                        </p>
                        <div className="text-2xl font-black font-mono">
                            {audit.summary.criticalRatio.toFixed(1)}%
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">
                            S.F.
                        </p>
                        <div className="text-2xl font-black font-mono">
                            {audit.summary.safetyFactor.toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Critical Ratio Progress Bar */}
            <div className="mt-6 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(audit.status)}`} 
                    style={{ width: `${Math.min(audit.summary.criticalRatio, 100).toFixed(4)}%` }} 
                />
            </div>
        </div>

        {/* Audit Breakdown Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AuditMetric 
                icon={<Compass className="w-3.5 h-3.5" />} 
                label={isZh ? "几何" : "Geometry"} 
                status={audit.audits.geometry.springIndex?.status || "PASS"} 
            />
            <AuditMetric 
                icon={<Activity className="w-3.5 h-3.5" />} 
                label={isZh ? "加载" : "Loadcase"} 
                status={audit.audits.loadcase.travel.status} 
            />
            <AuditMetric 
                icon={<Zap className="w-3.5 h-3.5" />} 
                label={isZh ? "应力" : "Stress"} 
                status={audit.audits.stress.status} 
            />
            <AuditMetric 
                icon={<Anchor className="w-3.5 h-3.5" />} 
                label={isZh ? "稳定" : "Stability"} 
                status={audit.audits.stability?.status || "PASS"} 
            />
        </div>

        <div className="h-px bg-slate-100" />

        {/* Detailed Section: Stress */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {isZh ? "详细分析: 额定应力" : "Detailed: Governing Stress"}
                </h4>
            </div>
            
            <div className="grid gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">{isZh ? "主导应力模型" : "Governing Stress Model"}</span>
                    <span className="font-bold text-slate-700">{isZh ? audit.audits.stress.governingModeZh : audit.audits.stress.governingMode}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">{isZh ? "最大值 (Max Stress)" : "Max Stress"}</span>
                    <span className="font-mono font-bold text-slate-900">{audit.audits.stress.maxStress.toFixed(1)} MPa</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">{isZh ? "允许值 (Allowable)" : "Allowable Stress"}</span>
                    <span className="font-mono font-medium text-slate-600">{audit.audits.stress.allowableStress.toFixed(1)} MPa</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${getProgressColor(audit.audits.stress.status)}`}
                            style={{ width: `${Math.min(audit.audits.stress.stressRatio, 100).toFixed(4)}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black font-mono w-10 text-right">{audit.audits.stress.stressRatio.toFixed(1)}%</span>
                </div>
            </div>
        </div>

        {/* Notes */}
        {audit.notes.length > 0 && (
            <div className="pt-2">
                <div className="flex gap-2 text-[11px] text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <ul className="space-y-1">
                        {audit.notes.map((note, idx) => (
                            <li key={idx} className="leading-relaxed">{note}</li>
                        ))}
                    </ul>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuditMetric({ icon, label, status }: { icon: React.ReactNode, label: string, status: AuditStatus }) {
    const borders: Record<AuditStatus, string> = {
        PASS: "border-emerald-200 bg-emerald-50/20",
        WARN: "border-amber-200 bg-amber-50/20",
        FAIL: "border-rose-200 bg-rose-50/20",
        INFO: "border-blue-200 bg-blue-50/20",
    };
    const texts: Record<AuditStatus, string> = {
        PASS: "text-emerald-700",
        WARN: "text-amber-700",
        FAIL: "text-rose-700",
        INFO: "text-blue-700",
    };

    return (
        <div className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all hover:scale-105 ${borders[status]}`}>
            <div className={`p-1.5 rounded-lg bg-white shadow-sm ${texts[status]}`}>
                {icon}
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-tight text-slate-500">
                {label}
            </span>
            <div className={`h-1 w-6 rounded-full ${status === "FAIL" ? "bg-rose-500" : status === "WARN" ? "bg-amber-500" : status === "INFO" ? "bg-blue-500" : "bg-emerald-500"}`} />
        </div>
    );
}
