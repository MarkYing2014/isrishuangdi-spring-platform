"use client";

/**
 * PPAP Header Card
 * Displays package info, status badge, and submission level
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Building2, Car, Hash, GitBranch } from "lucide-react";
import type { PpapPackage, PpapStatus } from "@/lib/ppap";

interface PpapHeaderCardProps {
  ppap: PpapPackage;
  isZh?: boolean;
}

const STATUS_STYLES: Record<PpapStatus, string> = {
  DRAFT: "bg-slate-500/20 text-slate-400 border-slate-500/50",
  READY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  SUBMITTED: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  APPROVED: "bg-sky-500/20 text-sky-400 border-sky-500/50",
};

const STATUS_LABELS: Record<PpapStatus, { en: string; zh: string }> = {
  DRAFT: { en: "Draft", zh: "草稿" },
  READY: { en: "Ready", zh: "待提交" },
  SUBMITTED: { en: "Submitted", zh: "已提交" },
  APPROVED: { en: "Approved", zh: "已批准" },
};

export function PpapHeaderCard({ ppap, isZh = true }: PpapHeaderCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            {/* Package ID and Status */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-slate-200">{ppap.id}</span>
              <Badge variant="outline" className={STATUS_STYLES[ppap.status]}>
                {isZh ? STATUS_LABELS[ppap.status].zh : STATUS_LABELS[ppap.status].en}
              </Badge>
              <Badge variant="outline" className="bg-indigo-500/20 text-indigo-400 border-indigo-500/50">
                Level {ppap.submissionLevel}
              </Badge>
            </div>

            {/* Part Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-slate-500 flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {isZh ? "零件号" : "Part No"}
                </div>
                <div className="text-slate-200 font-medium">{ppap.partNo}</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-500 flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {isZh ? "版本" : "Rev"}
                </div>
                <div className="text-slate-200 font-medium">{ppap.partRev}</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-500 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {isZh ? "零件名称" : "Part Name"}
                </div>
                <div className="text-slate-200 font-medium">{ppap.partName}</div>
              </div>
              <div className="space-y-1">
                <div className="text-slate-500 flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {isZh ? "项目" : "Program"}
                </div>
                <div className="text-slate-200 font-medium">{ppap.program}</div>
              </div>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-slate-400">{isZh ? "客户:" : "Customer:"}</span>
              <span className="text-slate-200 font-medium">{ppap.customer}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
