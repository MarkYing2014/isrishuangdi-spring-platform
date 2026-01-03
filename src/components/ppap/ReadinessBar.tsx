"use client";

/**
 * Readiness Bar
 * Visual progress indicator for PPAP checklist completion
 */

import React from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import type { PpapReadinessResult } from "@/lib/ppap";

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
  // Format: "key:status"
  const [key, status] = reason.split(":");
  const itemLabel = ITEM_LABELS[key]?.[isZh ? "zh" : "en"] ?? key;
  const statusLabel = STATUS_LABELS[status]?.[isZh ? "zh" : "en"] ?? status;
  return `${itemLabel} (${statusLabel})`;
}

interface ReadinessBarProps {
  readiness: PpapReadinessResult;
  isZh?: boolean;
}

export function ReadinessBar({ readiness, isZh = true }: ReadinessBarProps) {
  const { percent, ready, total, pswBlocked, blockedReasons } = readiness;

  return (
    <div className="space-y-3">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pswBlocked ? (
            <AlertCircle className="h-5 w-5 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          )}
          <span className="text-sm font-medium text-slate-200">
            {isZh ? "PSW 就绪度" : "PSW Readiness"}
          </span>
        </div>
        <div className="text-sm">
          <span className={percent >= 100 ? "text-emerald-400" : "text-slate-400"}>
            {ready}/{total}
          </span>
          <span className="text-slate-500 ml-2">
            ({percent}%)
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress 
        value={percent} 
        className={`h-3 ${pswBlocked ? "bg-slate-700" : "bg-emerald-900"}`}
      />

      {/* Blocked Reasons */}
      {pswBlocked && blockedReasons.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-amber-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isZh ? "待完成项目:" : "Pending items:"}
          </div>
          <div className="flex flex-wrap gap-2">
            {blockedReasons.slice(0, 4).map((reason, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                {formatBlockedReason(reason, isZh)}
              </span>
            ))}
            {blockedReasons.length > 4 && (
              <span className="text-xs text-slate-500">
                +{blockedReasons.length - 4} {isZh ? "更多" : "more"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
