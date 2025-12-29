
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, Info, Download, Trash2, ShieldAlert } from "lucide-react";

interface QualityGateBannerProps {
  status: "PASS" | "WARN" | "FAIL";
  failCount: number;
  warnCount: number;
  totalPoints: number;
  onExcludeFailed: () => void;
  onConfirmWarnings: () => void;
  onExportFailures: () => void;
}

export function QualityGateBanner({ 
    status, 
    failCount, 
    warnCount, 
    totalPoints,
    onExcludeFailed, 
    onConfirmWarnings,
    onExportFailures 
}: QualityGateBannerProps) {
    
  const [showExcludeConfirm, setShowExcludeConfirm] = useState(false);
  const [showWarnConfirm, setShowWarnConfirm] = useState(false);

  // audit-grade text constants
  const text = {
      pass: {
          titleEn: "Quality Gate: PASS — Data is valid. Analysis is enabled.",
          titleZh: "质量门禁：通过 — 数据有效，可进行分析。",
      },
      warn: {
          titleEn: `Quality Gate: WARN (${warnCount}) — Analysis is allowed, but results may be impacted. Review warnings before proceed.`,
          titleZh: `质量门禁：警告（${warnCount}） — 允许分析，但结果可能受影响。建议先查看警告。`,
          btnReviewEn: "Review Warnings",
          btnReviewZh: "查看警告",
          btnProceedEn: "Proceed to Analysis (Confirm)",
          btnProceedZh: "继续分析（需确认）",
          confirmTitleEn: "Proceed with Warnings?",
          confirmTitleZh: "确认带警告继续？",
          confirmBodyEn: "Some rows contain non-blocking issues and may be excluded from capability metrics (CPK).",
          confirmBodyZh: "部分行存在非阻断问题，可能会被排除在能力指数（CPK）之外。",
      },
      fail: {
          titleEn: `Quality Gate: FAIL (${failCount}) — Analysis is blocked. Fix or exclude failed rows to continue.`,
          titleZh: `质量门禁：失败（${failCount}） — 已禁止分析。请修复或排除失败行后继续。`,
          btnReviewEn: `Review Failures (${failCount})`,
          btnReviewZh: `查看失败行（${failCount}）`,
          btnExportEn: "Export Failures",
          btnExportZh: "导出失败行",
          btnExcludeEn: "Exclude Failed Rows...",
          btnExcludeZh: "排除失败行...",
          confirmTitleEn: "Exclude failed rows from analysis?",
          confirmTitleZh: "确认从分析中排除失败行？",
          confirmBodyEn: "Excluded rows will not be used in charts and capability metrics. This action will be recorded in the audit log.",
          confirmBodyZh: "被排除行将不会用于图表与能力指数计算；该操作将写入审计日志。",
          noteEn: "Note: Filtering the table only changes what you see. The Quality Gate is evaluated on the analysis input set. To clear FAIL, you must fix the data or explicitly exclude failed rows.",
          noteZh: "说明：表格“过滤”只影响显示；质量门禁基于“分析输入集”判定。要解除失败，必须修复数据或明确排除失败行。",
      }
  };

  if (status === "PASS") {
      return (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">{text.pass.titleEn}</h3>
              <p className="mt-1 text-xs text-green-700 opacity-90">{text.pass.titleZh}</p>
            </div>
          </div>
        </div>
      );
  }

  if (status === "WARN") {
      return (
        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 relative">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">{text.warn.titleEn}</h3>
              <p className="mt-1 text-xs text-yellow-700 opacity-90">{text.warn.titleZh}</p>
              
              <div className="mt-4 flex gap-3">
                  <Button variant="outline" size="sm" className="bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                      {text.warn.btnReviewEn} <span className="text-[10px] ml-1 opacity-70">{text.warn.btnReviewZh}</span>
                  </Button>
                  <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white border-none" onClick={() => setShowWarnConfirm(true)}>
                      {text.warn.btnProceedEn} <span className="text-[10px] ml-1 opacity-70"> / (需确认)</span>
                  </Button>
              </div>
            </div>
          </div>

          {/* WARN CONFIRM MODAL */}
          {showWarnConfirm && (
              <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-yellow-50/90 backdrop-blur-[1px] rounded-md">
                 <div className="bg-white p-4 rounded-lg shadow-lg border border-yellow-200 max-w-lg w-full">
                     <div className="flex items-center gap-2 mb-2">
                         <AlertTriangle className="h-5 w-5 text-yellow-600" />
                         <span className="font-bold text-slate-800">Confirm Warning Acceptance</span>
                     </div>
                     <p className="text-sm text-slate-600 mb-1">{text.warn.confirmTitleEn}</p>
                     <p className="text-sm text-slate-500 mb-4">{text.warn.confirmBodyEn}</p>
                     <div className="border-t border-slate-100 my-2 pt-2">
                         <p className="text-xs text-slate-500">{text.warn.confirmTitleZh}</p>
                         <p className="text-xs text-slate-400">{text.warn.confirmBodyZh}</p>
                     </div>
                     <div className="flex justify-end gap-2 mt-4">
                         <Button variant="ghost" size="sm" onClick={() => setShowWarnConfirm(false)}>Cancel / 取消</Button>
                         <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => { setShowWarnConfirm(false); onConfirmWarnings(); }}>
                             Confirm / 确认
                         </Button>
                     </div>
                 </div>
              </div>
          )}
        </div>
      );
  }

  // FAIL
  return (
      <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 relative">
        <div className="flex items-start">
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">{text.fail.titleEn}</h3>
            <p className="mt-1 text-xs text-red-700 opacity-90">{text.fail.titleZh}</p>
            
            <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="bg-white border-red-300 text-red-800 hover:bg-red-100">
                     Review Failures / {text.fail.btnReviewZh.split('（')[0]}
                </Button>
                <Button variant="outline" size="sm" className="bg-white border-red-300 text-red-800 hover:bg-red-100" onClick={onExportFailures}>
                     <Download className="h-3 w-3 mr-1" /> Export / 导出
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={() => setShowExcludeConfirm(true)}>
                     <Trash2 className="h-3 w-3 mr-1" /> Exclude Failed Rows... / 排除...
                </Button>
            </div>
            
            {/* Explainer Note */}
            <div className="mt-4 border-t border-red-200/60 pt-3">
                <div className="flex gap-2">
                    <Info className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-600/80 leading-relaxed font-mono">
                         <p><span className="font-bold">Note:</span> {text.fail.noteEn}</p>
                         <p className="mt-1 opacity-80">{text.fail.noteZh}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* EXCLUDE CONFIRM MODAL (Audit Tone) */}
        {showExcludeConfirm && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-red-50/95 backdrop-blur-[2px] rounded-md">
               <div className="bg-white p-5 rounded-lg shadow-xl border-2 border-red-100 max-w-lg w-full animate-in zoom-in-95 duration-200">
                   <div className="flex items-center gap-2 mb-4 border-b pb-2">
                       <ShieldAlert className="h-5 w-5 text-red-600" />
                       <span className="font-bold text-slate-800">Audit Action Confirmation</span>
                   </div>
                   
                   <p className="font-medium text-slate-800 mb-1">{text.fail.confirmTitleEn}</p>
                   <p className="text-sm text-slate-600 mb-4 bg-red-50 p-2 rounded">{text.fail.confirmBodyEn}</p>
                   
                   <div className="border-t border-slate-100 pt-3 mt-3">
                       <p className="text-sm font-medium text-slate-700 mb-1">{text.fail.confirmTitleZh}</p>
                       <p className="text-xs text-slate-500 mb-2">{text.fail.confirmBodyZh}</p>
                   </div>
                   
                   <div className="flex justify-end gap-3 mt-6">
                       <Button variant="outline" onClick={() => setShowExcludeConfirm(false)}>Cancel / 取消</Button>
                       <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => { setShowExcludeConfirm(false); onExcludeFailed(); }}>
                           Confirm Exclude Action (Audit Log)
                       </Button>
                   </div>
               </div>
            </div>
        )}
      </div>
  );
}
