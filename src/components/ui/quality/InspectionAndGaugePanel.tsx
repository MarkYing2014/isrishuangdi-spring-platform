"use client";

import React, { useState, useMemo } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Download, Eye, Ruler, Box, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeliverabilityAudit } from "@/lib/audit/types";
import { generateSmartGaugeStrategy, exportGaugeStl, GaugeSpec } from "@/lib/quality/gauges";

interface InspectionAndGaugePanelProps {
  className?: string;
  language: "en" | "zh";
  deliverabilityAudit?: DeliverabilityAudit;
  designSummary?: any; // Needs OD, ID, L0, toleranceGrade
}

export function InspectionAndGaugePanel({
  className,
  language,
  deliverabilityAudit,
  designSummary
}: InspectionAndGaugePanelProps) {
  const isZh = language === "zh";
  const [isOpen, setIsOpen] = useState(false);

  // 1. Generate Strategy using Q1 Engine
  const strategy = useMemo(() => {
    if (!deliverabilityAudit || !designSummary) return null;
    return generateSmartGaugeStrategy(designSummary, deliverabilityAudit, designSummary.partNo || "SN-888");
  }, [deliverabilityAudit, designSummary]);

  if (!strategy) return null;

  const levelColors = {
    MANDATORY: "bg-red-500",
    RECOMMENDED: "bg-yellow-500",
    OPTIONAL: "bg-green-500"
  };

  const levelLabels = {
    MANDATORY: { en: "MANDATORY", zh: "必须" },
    RECOMMENDED: { en: "RECOMMENDED", zh: "建议" },
    OPTIONAL: { en: "OPTIONAL", zh: "可选" }
  };

  return (
    <div className={className}>
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50/50 transition-colors py-3"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">
                {isZh ? "检测策略与检具" : "Inspection & Gauge Strategy"}
              </CardTitle>
              <Badge className={`${levelColors[strategy.overallLevel]} h-4 text-[10px] ml-2 border-none`}>
                {isZh ? levelLabels[strategy.overallLevel].zh : levelLabels[strategy.overallLevel].en}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="pt-0 space-y-4 pb-4">
            {/* 1. Inspection Requirement Panel */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                <Info className="h-3 w-3" />
                {isZh ? "1. 检测要求" : "1. Inspection Requirements"}
              </h3>
              <div className="bg-slate-50 rounded-md p-3 border border-slate-100 space-y-2">
                {strategy.requirements.map((req, idx) => (
                  <div key={idx} className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold">{req.category}</div>
                      <div className="text-[10px] text-slate-500">{isZh ? req.reasonZh : req.reasonEn}</div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4">
                      {isZh ? levelLabels[req.level].zh : levelLabels[req.level].en}
                    </Badge>
                  </div>
                ))}
                {strategy.requirements.length === 0 && (
                  <div className="text-[10px] text-slate-500 italic">
                    {isZh ? "无强制特殊检测要求。" : "No mandatory special inspection requirements."}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Gauge Strategy Panel */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {isZh ? "2. 检具方案" : "2. Gauge Strategy"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {strategy.gauges.map((gauge) => (
                  <Card key={gauge.id} className="border-slate-100 shadow-none bg-slate-50/50">
                    <CardContent className="p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[9px] h-4">
                          {gauge.type} - {gauge.category}
                        </Badge>
                        <span className="text-[10px] font-bold text-primary">{gauge.targetValue}mm</span>
                      </div>
                      <div className="text-[10px] text-slate-600 line-clamp-1">
                        {isZh ? gauge.notesZh : gauge.notesEn}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 3. Gauge Assets Panel */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                <Box className="h-3 w-3" />
                {isZh ? "3. 数字化资产" : "3. Digital Assets"}
              </h3>
              <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-3 py-2 font-bold">{isZh ? "资产名称" : "Asset Name"}</th>
                      <th className="text-center px-3 py-2 font-bold">{isZh ? "导出" : "Export"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.gauges.map((gauge) => (
                      <tr key={gauge.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 py-2">
                          <div className="font-bold">{gauge.type} Gauge ({gauge.category})</div>
                          <div className="text-[9px] text-slate-400 font-mono">{gauge.filename}</div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-2 gap-1 text-[9px]"
                            onClick={() => exportGaugeStl(gauge)}
                          >
                            <Download className="h-3 w-3" />
                            STL
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Supplier Compatibility Panel (Simplified for Q1) */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {isZh ? "4. 供应商检具兼容性 (Preview)" : "4. Supplier Gauge Compatibility (Preview)"}
              </h3>
              <div className="text-[10px] text-slate-500 italic p-2 bg-slate-50 border border-dashed border-slate-200 rounded">
                {isZh 
                  ? "Q2 模块将实现检具要求与供应商精密加工/校准能力的自动比对。" 
                  : "Q2 module will implement automated matching between gauge requirements and supplier precision/calibration capabilities."}
              </div>
            </div>
            
          </CardContent>
        )}
      </Card>
    </div>
  );
}
