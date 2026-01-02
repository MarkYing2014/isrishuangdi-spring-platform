"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformResult } from "@/lib/spring-platform/types";
import { AuditStatus, DeliverabilityAudit } from "@/lib/audit/types";
import { AlertCircle, ArrowRight, ShieldCheck, Factory } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { KpiCard } from "./KpiCard";
import { WorkflowBadge } from "./WorkflowBadge";
import { useLanguage } from "@/components/language-context";

interface GlobalEngineeringStatusPanelProps {
  result: PlatformResult;
  deliverabilityAudit?: DeliverabilityAudit;
  safetyStatus?: AuditStatus;
  title?: string;
  onJumpToRules?: () => void;
}

export function GlobalEngineeringStatusPanel({ 
  result, 
  deliverabilityAudit,
  safetyStatus = "PASS",
  title, 
  onJumpToRules 
}: GlobalEngineeringStatusPanelProps) {
  const { language } = useLanguage();
  const isZh = language === "zh";

  // Safety Track Logic
  const safetyStatusConfig = {
    PASS: { color: "bg-green-500", text: isZh ? "安全" : "SAFETY PASS" },
    WARN: { color: "bg-yellow-500", text: isZh ? "风险" : "SAFETY RISK" },
    FAIL: { color: "bg-red-500", text: isZh ? "危险" : "SAFETY FAIL" },
    INFO: { color: "bg-blue-500", text: isZh ? "提示" : "INFO" },
  };

  // Deliverability Track Logic
  const deliverabilityStatus = deliverabilityAudit?.status || "PASS";
  const deliverabilityConfig = {
    PASS: { color: "bg-green-500", text: isZh ? "标品" : "DELIVERABLE" },
    WARN: { color: "bg-yellow-500", text: isZh ? "挑战" : "CHALLENGING" },
    FAIL: { color: "bg-red-500", text: isZh ? "难交付" : "HIGH RISK" },
    INFO: { color: "bg-blue-500", text: isZh ? "提示" : "INFO" },
  };

  // Overall Semantic Logic (P0)
  let statusTitle = isZh ? "设计方案可行" : "Design Viable";
  let statusSubtext = isZh ? "所有工程检查均通过。" : "All checks passed.";
  let overallStatusTag: "pass" | "risk" | "fail" = "pass";

  if (safetyStatus === "FAIL") {
    overallStatusTag = "fail";
    statusTitle = isZh ? "需要重新设计" : "Redesign Required";
    statusSubtext = isZh 
      ? "工程条件未满足（应力/载荷超限）。物理方案不可行。" 
      : "Engineering limits exceeded. Physical design is unsafe.";
  } else if (safetyStatus === "PASS" && deliverabilityStatus === "FAIL") {
    overallStatusTag = "risk"; 
    statusTitle = isZh ? "物理可行但不可交付" : "Designable but not Deliverable";
    statusSubtext = isZh 
      ? "设计方案满足安全标准，但制造约束无法满足。需要调整工艺或放宽要求。" 
      : "Safety margins met, but manufacturing constraints failed. Requires process adjustment or requirement relaxation.";
  } else if (safetyStatus === "WARN" || deliverabilityStatus === "WARN") {
    overallStatusTag = "risk";
    statusTitle = isZh ? "需进行工程评审" : "Engineering Review Required";
    statusSubtext = isZh ? "部分参数接近极限或存在制造挑战。" : "Non-critical parameters near limits or manufacturing challenges detected.";
  }

  const current = {
    text: { en: statusTitle, zh: statusTitle }, // Simplified for this implementation
    subtext: { en: statusSubtext, zh: statusSubtext }
  };

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
             <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <ShieldCheck className={`w-4 h-4 ${safetyStatus === 'PASS' ? 'text-green-500' : safetyStatus === 'FAIL' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isZh ? "物理安全" : "SAFETY"}</span>
                  <div className={`w-2 h-2 rounded-full ${safetyStatus === 'PASS' ? 'bg-green-500' : safetyStatus === 'FAIL' ? 'bg-red-500' : 'bg-yellow-500'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`} />
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
                  <Factory className={`w-4 h-4 ${deliverabilityStatus === 'PASS' ? 'text-green-500' : deliverabilityStatus === 'FAIL' ? 'text-red-500' : 'text-yellow-500'}`} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isZh ? "制造交付" : "DELIVERABILITY"}</span>
                  <div className={`w-2 h-2 rounded-full ${deliverabilityStatus === 'PASS' ? 'bg-green-500' : deliverabilityStatus === 'FAIL' ? 'bg-red-500' : 'bg-yellow-500'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`} />
                </div>

                {result.workflowStatus && (
                   <WorkflowBadge 
                     state={result.workflowStatus.toLowerCase() as any} 
                     label={isZh 
                        ? (result.workflowStatus === "CONCEPT" ? "草图" : 
                           result.workflowStatus === "REVIEW" ? "评审中" :
                           result.workflowStatus === "APPROVED" ? "已批准" :
                           result.workflowStatus === "RFQ" ? "询价" : result.workflowStatus)
                        : result.workflowStatus
                     }
                   />
                )}
             </div>

             <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{language === "en" ? current.text.en : current.text.zh}</h3>
                 <p className="text-sm text-slate-500 max-w-lg mt-1">{language === "en" ? current.subtext.en : current.subtext.zh}</p>
             </div>

             {(safetyStatus !== "PASS" || deliverabilityStatus === "FAIL") && onJumpToRules && (
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
             
             {/* P3: Supplier Coverage KPIs */}
             {deliverabilityAudit?.supplierCoverage && (
               <>
                 <KpiCard 
                    title={language === "en" ? "Full Coverage" : "全覆盖率"} 
                    value={`${deliverabilityAudit.supplierCoverage.full}/${deliverabilityAudit.supplierCoverage.total}`} 
                    status={deliverabilityAudit.supplierCoverage.full > 0 ? "normal" : "warning"} 
                    className="min-w-[120px] flex-1 border shadow-none"
                 />
                 <KpiCard 
                    title={language === "en" ? "Total Coverage" : "含特采覆盖"} 
                    value={`${deliverabilityAudit.supplierCoverage.full + deliverabilityAudit.supplierCoverage.partial}/${deliverabilityAudit.supplierCoverage.total}`} 
                    status={deliverabilityAudit.supplierCoverage.full + deliverabilityAudit.supplierCoverage.partial > 0 ? "normal" : "critical"} 
                    className="min-w-[120px] flex-1 border shadow-none"
                 />
               </>
             )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
