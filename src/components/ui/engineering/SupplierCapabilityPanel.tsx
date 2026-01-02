"use client";

import React, { useState } from "react";
import { Factory, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle, ShieldAlert, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeliverabilityAudit } from "@/lib/audit/types";

interface SupplierCapabilityPanelProps {
  className?: string;
  language: "en" | "zh";
  deliverabilityAudit?: DeliverabilityAudit;
}

export function SupplierCapabilityPanel({
  className,
  language,
  deliverabilityAudit
}: SupplierCapabilityPanelProps) {
  const isZh = language === "zh";
  const [isOpen, setIsOpen] = useState(false);

  // Safely check for supplierMatches to avoid crashing before data is fully loaded
  if (!deliverabilityAudit || !deliverabilityAudit.supplierMatches) return null;

  const { supplierCoverage, supplierMatches } = deliverabilityAudit;

  const matchLevelColors = {
    FULL: "bg-green-500",
    PARTIAL: "bg-yellow-500",
    NO_MATCH: "bg-red-500"
  };

  const matchLevelLabels = {
    FULL: { en: "Full Match", zh: "完全匹配" },
    PARTIAL: { en: "Partial Match", zh: "部分匹配" },
    NO_MATCH: { en: "No Match", zh: "不匹配" }
  };

  return (
    <div className={className}>
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50/50 transition-colors py-3"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">
                {isZh ? "供应商能力评估" : "Supplier Capability Assessment"}
              </CardTitle>
              <div className="flex gap-1 ml-2">
                <Badge variant="outline" className="text-[10px] h-4 bg-green-50 border-green-200 text-green-700">
                   {isZh ? "全匹配" : "Full"}: {supplierCoverage.full}/{supplierCoverage.total}
                </Badge>
                <Badge variant="outline" className="text-[10px] h-4 bg-slate-50 border-slate-200 text-slate-600">
                   {isZh ? "总覆盖" : "Total"}: {supplierCoverage.full + supplierCoverage.partial}/{supplierCoverage.total}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="pt-0 space-y-3 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {supplierMatches.map((match) => (
                <Card key={match.supplierId} className="border border-slate-100 shadow-none bg-slate-50/30">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate pr-1">{match.supplierName}</span>
                      <div className={`w-2 h-2 rounded-full ${matchLevelColors[match.matchLevel as keyof typeof matchLevelColors]}`} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 font-normal opacity-80">
                        {isZh ? matchLevelLabels[match.matchLevel as keyof typeof matchLevelLabels].zh : matchLevelLabels[match.matchLevel as keyof typeof matchLevelLabels].en}
                      </Badge>
                      {match.matchLevel === "PARTIAL" && (
                        <Badge variant="destructive" className="text-[8px] h-4 px-1 bg-yellow-500 hover:bg-yellow-600 border-none">
                          <ShieldAlert className="h-2 w-2 mr-1" />
                          {isZh ? "需要特采" : "Waiver Req"}
                        </Badge>
                      )}
                    </div>

                    {match.gaps.length > 0 && (
                      <div className="space-y-1">
                        {match.gaps.map((gap: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-1 p-1 bg-white border border-slate-100 rounded text-[9px]">
                            {gap.severity === "FAIL" ? (
                              <XCircle className="h-2.5 w-2.5 text-red-500 mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="h-2.5 w-2.5 text-yellow-500 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-slate-600 mr-1">{gap.gapId}:</span>
                              <span className="text-slate-500 text-[8px]">{gap.requirement} vs {gap.capability}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {match.gaps.length === 0 && (
                      <div className="flex items-center gap-1 text-[9px] text-green-600">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>{isZh ? "符合能力要求" : "Meets capability"}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex items-start gap-2 p-2 bg-slate-100/50 border border-slate-200 rounded text-[10px] text-slate-600">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                {isZh 
                  ? "此评估基于供应商申报的基础能力范围。PARTIAL 状态需要通过偏差审批流程方可创建工单。" 
                  : "This assessment is based on declared supplier capabilities. PARTIAL status requires a waiver approval for work order creation."}
              </span>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
