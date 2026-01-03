"use client";

/**
 * Export Panel
 * Generate PSW, preview, and export actions
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Eye,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileArchive,
} from "lucide-react";
import type { PpapPackage, PswDocument, PpapReadinessResult } from "@/lib/ppap";

// i18n labels for checklist items
const ITEM_LABELS: Record<string, { en: string; zh: string }> = {
  designRecord: { en: "Design Records", zh: "设计记录" },
  engineeringApproval: { en: "Engineering Approval", zh: "工程变更文件" },
  controlPlan: { en: "Control Plan", zh: "控制计划" },
  msa: { en: "MSA", zh: "测量系统分析 (MSA)" },
  materialCert: { en: "Material Cert", zh: "材料/性能测试结果" },
  dimensionalResults: { en: "Dimensional Results", zh: "尺寸检测结果" },
};

const STATUS_LABELS: Record<string, { en: string; zh: string }> = {
  NOT_STARTED: { en: "Not Started", zh: "未开始" },
  IN_PROGRESS: { en: "In Progress", zh: "进行中" },
  READY: { en: "Ready", zh: "就绪" },
  NA: { en: "N/A", zh: "不适用" },
};

function formatBlockedReason(reason: string, isZh: boolean): string {
  const [key, status] = reason.split(":");
  const itemLabel = ITEM_LABELS[key]?.[isZh ? "zh" : "en"] ?? key;
  const statusLabel = STATUS_LABELS[status]?.[isZh ? "zh" : "en"] ?? status;
  return `${itemLabel} (${statusLabel})`;
}

interface ExportPanelProps {
  ppap: PpapPackage;
  readiness: PpapReadinessResult;
  psw?: PswDocument | null;
  isZh?: boolean;
  onGeneratePsw?: () => Promise<void>;
  onPreviewPsw?: () => void;
}

export function ExportPanel({
  ppap,
  readiness,
  psw,
  isZh = true,
  onGeneratePsw,
  onPreviewPsw,
}: ExportPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!onGeneratePsw) return;
    setGenerating(true);
    setError(null);
    try {
      await onGeneratePsw();
    } catch (err: any) {
      setError(err.message || "Failed to generate PSW");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <FileText className="h-5 w-5 text-sky-400" />
          {isZh ? "导出与提交" : "Export & Submit"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PSW Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-300">
              PSW (Part Submission Warrant)
            </span>
          </div>
          {psw ? (
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
              {isZh ? "已生成" : "Generated"}
            </Badge>
          ) : readiness.pswBlocked ? (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/50">
              {isZh ? "待完成" : "Blocked"}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-sky-500/20 text-sky-400 border-sky-500/50">
              {isZh ? "可生成" : "Ready"}
            </Badge>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Blocked reasons */}
        {readiness.pswBlocked && !psw && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <div className="text-amber-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {isZh ? "无法生成 PSW，需完成以下项目:" : "Cannot generate PSW, complete these items:"}
            </div>
            <ul className="text-amber-300/80 text-xs space-y-1 ml-5 list-disc">
              {readiness.blockedReasons.map((reason, i) => (
                <li key={i}>{formatBlockedReason(reason, isZh)}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!psw ? (
            <Button
              onClick={handleGenerate}
              disabled={readiness.pswBlocked || generating}
              className={
                readiness.pswBlocked
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isZh ? "生成 PSW" : "Generate PSW"}
            </Button>
          ) : (
            <>
              <Button
                onClick={onPreviewPsw}
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isZh ? "预览 PSW" : "Preview PSW"}
              </Button>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                <Download className="h-4 w-4 mr-2" />
                {isZh ? "下载 PDF" : "Download PDF"}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="border-slate-600 text-slate-200 hover:bg-slate-800"
          >
            <FileArchive className="h-4 w-4 mr-2" />
            {isZh ? "导出 ZIP" : "Export ZIP"}
          </Button>
        </div>

        {/* PSW Generated Success */}
        {psw && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-emerald-400">
              {isZh ? "PSW 已生成" : "PSW Generated"}: {psw.id}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
