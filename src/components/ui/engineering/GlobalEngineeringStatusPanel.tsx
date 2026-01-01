"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformResult } from "@/lib/spring-platform/types";
import { AlertCircle, ArrowRight } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { KpiCard } from "./KpiCard";
import { WorkflowBadge } from "./WorkflowBadge";
import { useLanguage } from "@/components/language-context";

interface GlobalEngineeringStatusPanelProps {
  result: PlatformResult;
  title?: string;
  onJumpToRules?: () => void;
}

export function GlobalEngineeringStatusPanel({ result, title, onJumpToRules }: GlobalEngineeringStatusPanelProps) {
  const { language } = useLanguage();
  const rules = result.designRules || [];
  const designRuleFail = rules.some(r => r.status === "fail");
  const engineeringFail = !result.isValid;
  
  const hasFail = designRuleFail || engineeringFail;
  const hasWarning = rules.some(r => r.status === "warning");
  
  let status: "pass" | "risk" | "fail" = "pass";
  if (hasFail) status = "fail";
  else if (hasWarning) status = "risk";

  const statusConfig = {
    pass: {
      text: { en: "Design Viable", zh: "设计方案可行" },
      subtext: { en: "All checks passed.", zh: "所有检查均通过。" },
    },
    risk: {
      text: { en: "Engineering Review Required", zh: "需进行工程评审" },
      subtext: { en: "Non-critical parameters near limits.", zh: "非核心参数接近极限。" },
    },
    fail: {
      text: { en: "Redesign Required", zh: "需要重新设计" },
      subtext: { 
          en: designRuleFail 
              ? "Critical design rules failed." 
              : "Engineering limits exceeded (Stress/Load). Geometry is valid but unsafe.", 
          zh: designRuleFail 
              ? "核心设计规则未通过。" 
              : "工程条件未满足（应力/载荷超限）。几何设计合理但当前工况不可用。" 
      },
    }
  };

  const current = statusConfig[status];

  // Derive KPIs
  const springIndex = result.springIndex?.toFixed(1) || "-";
  const energy = result.totalEnergy ? result.totalEnergy.toFixed(2) : (result.cases[result.cases.length-1]?.energy?.toFixed(2) || "-");
  const minSF = result.cases.reduce((min, c) => Math.min(min, c.sfMin ?? 999), 999);
  const displaySF = minSF === 999 ? "-" : minSF.toFixed(2);
  const sfStatus = minSF < 1.0 ? "critical" : (minSF < 1.3 ? "warning" : "normal");
  const indexStatus = (parseFloat(springIndex) < 4 || parseFloat(springIndex) > 16) ? "warning" : "normal";


  return (
    <Card className="overflow-hidden border-l-4 rounded-r-lg border-l-slate-300 md:border-l-4 shadow-sm mb-6 bg-slate-50/50">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row items-stretch">
          
          {/* Status Section */}
          <div className="flex-1 p-5 flex flex-col justify-center space-y-3">
             <div className="flex items-center gap-3">
                <StatusPill 
                  status={status === "pass" ? "pass" : status === "risk" ? "risk" : "fail"} 
                  size="lg"
                  label={
                    language === "en" 
                      ? (status === "pass" ? "PASS" : status === "risk" ? "RISK" : "FAIL")
                      : (status === "pass" ? "合格" : status === "risk" ? "风险" : "不合格")
                  }
                />
                {result.workflowStatus && (
                   <WorkflowBadge 
                     state={result.workflowStatus.toLowerCase() as any} 
                     label={
                       language === "en" 
                         ? result.workflowStatus
                         : (
                            result.workflowStatus === "CONCEPT" ? "草图" : 
                            result.workflowStatus === "REVIEW" ? "评审中" :
                            result.workflowStatus === "APPROVED" ? "已批准" :
                            result.workflowStatus === "RFQ" ? "询价" : result.workflowStatus
                         )
                     }
                   />
                )}
             </div>

             <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{language === "en" ? current.text.en : current.text.zh}</h3>
                 <p className="text-sm text-slate-500 max-w-lg mt-1">{language === "en" ? current.subtext.en : current.subtext.zh}</p>
             </div>

             {status !== "pass" && onJumpToRules && (
                 <button 
                   onClick={onJumpToRules}
                   className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest mt-2 group"
                 >
                   <AlertCircle className="w-4 h-4" />
                   {language === "en" ? "View Failures" : "查看失效项"}
                   <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                 </button>
             )}
          </div>

          {/* KPI Dashboard */}
          <div className="bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 flex gap-3 overflow-x-auto min-w-[400px]">
             <KpiCard 
                title={language === "en" ? "Fatigue SF" : "疲劳系数"} 
                value={displaySF} 
                status={sfStatus} 
                className="min-w-[120px] flex-1 border shadow-none"
             />
             <KpiCard 
                title={language === "en" ? "Spring Index" : "旋绕比"} 
                value={springIndex} 
                status={indexStatus} 
                className="min-w-[120px] flex-1 border shadow-none"
             />
             <KpiCard 
                title={language === "en" ? "Energy (J)" : "储能 (J)"} 
                value={energy} 
                status="normal" 
                className="min-w-[120px] flex-1 border shadow-none"
             />
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
