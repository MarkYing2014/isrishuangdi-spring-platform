"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EngineeringDecisionPanelProps {
  className?: string;
  language: "en" | "zh";
  summary: any;
  deliverabilityAudit?: any;
}

export function EngineeringDecisionPanel({
  className,
  language,
  summary,
  deliverabilityAudit
}: EngineeringDecisionPanelProps) {
  const router = useRouter();
  const isZh = language === "zh";

  const handleEnterDecisionCenter = () => {
    // Pass summary data via URL for the Decision Center to parse
    const dataStr = encodeURIComponent(JSON.stringify(summary));
    router.push(`/engineering/decision?data=${dataStr}&lang=${language}`);
  };

  const isFail = deliverabilityAudit?.status === "FAIL";
  const isWarn = deliverabilityAudit?.status === "WARN";

  return (
    <div className={className}>
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-white shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
               <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                {isZh ? "工程决策中心 (SEOS)" : "Engineering Decision Center"}
                <Badge variant="outline" className="text-[10px] h-4 font-bold border-primary/30 text-primary">v2.0 Beta</Badge>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isFail 
                  ? (isZh ? "设计不可交付，决策已阻断。" : "Design not deliverable. Decision blocked.")
                  : (isZh ? "进入决策流水线：成本评估、供应商对比及发布生产。" : "Enter decision pipeline: Cost, Supplier Comparison & Release.")
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isFail ? (
               <Badge className="bg-red-500 text-white gap-1 py-1 px-3">
                 <AlertCircle className="h-3 w-3" />
                 {isZh ? "已阻断" : "BLOCKED"}
               </Badge>
            ) : (
              <Button 
                onClick={handleEnterDecisionCenter}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex gap-2 items-center group"
              >
                {isZh ? "进入决策中心" : "Enter Decision Center"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            )}
            
            {isWarn && (
               <Badge className="bg-amber-500 text-white gap-1 py-1 px-3">
                 <ShieldCheck className="h-3 w-3" />
                 {isZh ? "需要特采" : "Waiver Req"}
               </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
