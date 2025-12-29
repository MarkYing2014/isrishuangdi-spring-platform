"use client";

import React, { useState, useEffect } from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { cn } from "@/lib/utils";
import type { ColumnType } from "@/lib/quality/types";
import { useLanguage } from "@/components/language-context";

// Hardcoded schema per spec
const TARGET_SCHEMA = [
  { key: "PartNo", type: "string", required: true },
  { key: "Load", type: "number", required: false },
  { key: "FreeLength", type: "number", required: false },
  { key: "Date", type: "date", required: false },
  { key: "Result", type: "string", required: false },
] as const;

export function QualityLeftRail() {
  const [tab, setTab] = useState<"mapping" | "issues">("mapping");
  const { language } = useLanguage();
  const isZh = language === "zh";
  
  // NEW STORE API
  const mode = useQualityStore(state => state.mode);
  const rawColumns = useQualityStore(state => state.rawColumns);
  const mapping = useQualityStore(state => state.columnMapping);
  const updateMapping = useQualityStore(state => state.updateMapping);
  
  const summary = useQualityStore(state => state.validationSummary);
  const normalizedRows = useQualityStore(state => state.normalizedRows);
  
  const excludeRow = useQualityStore(state => state.excludeRow);
  const excludeFailedRows = useQualityStore(state => state.excludeFailedRows);
  
  // Fixed Spec Limits
  const specLimits = useQualityStore(state => state.specLimits);
  const setSpecLimits = useQualityStore(state => state.setSpecLimits);
  
  // Local input state for controlled inputs
  const [lslInput, setLslInput] = useState(specLimits.lsl?.toString() ?? "");
  const [uslInput, setUslInput] = useState(specLimits.usl?.toString() ?? "");
  const [targetInput, setTargetInput] = useState(specLimits.target?.toString() ?? "");
  
  // Sync local state when store changes (e.g., on reset)
  useEffect(() => {
    setLslInput(specLimits.lsl?.toString() ?? "");
    setUslInput(specLimits.usl?.toString() ?? "");
    setTargetInput(specLimits.target?.toString() ?? "");
  }, [specLimits.lsl, specLimits.usl, specLimits.target]);
  
  const handleSpecLimitBlur = (field: 'lsl' | 'usl' | 'target', value: string) => {
    const parsed = value.trim() === "" ? undefined : parseFloat(value);
    if (parsed !== undefined && isNaN(parsed)) return;
    setSpecLimits({ [field]: parsed });
  };
  
  // Helper to derive gate status
  const { deriveGateState } = require("@/lib/quality/types"); // Or import top level if possible
  // Since we are in client component and methods are pure TS, import usually works top level.
  // But let's assume imports at top.
  
  const gateStatus = useQualityStore(state => {
      // We can derive inside selector for perf or just compute in render
      const { deriveGateState } = require("@/lib/quality/types"); 
      return deriveGateState(state.validationSummary);
  });

  // Optimize: Derived Issues (Memoize if needed, but here simple filter)
  // To avoid iterating 10k rows on every render just for count (we have summary for count)
  // Only iterate for list if tab is open
  const allIssues = React.useMemo(() => {
     if (tab !== "issues" && summary.status === "PASS") return [];
     // Collect all issues from rows
     const list: { rowId: string; rowIndex: number; colKey: string; severity: string; message: string }[] = [];
     
     // Limit to 100 for display performance or use virtual list
     let count = 0;
     for (let i = 0; i < normalizedRows.length; i++) {
         const row = normalizedRows[i];
         if (row.excluded) continue;
         if (row.issues && row.issues.length > 0) {
             row.issues.forEach(issue => {
                 if (count < 200) { // Capped list
                     list.push(issue);
                     count++;
                 }
             });
         }
         if (count >= 200) break; 
     }
     return list;
  }, [normalizedRows, tab, summary]);
  
  const failIssuesCount = summary.fail;
  
  // Mapping Logic
  const handleMapChange = (targetKey: string, rawCol: string, type: ColumnType, required: boolean) => {
      const next = mapping.filter(m => m.targetKey !== targetKey);
      if (rawCol !== "__IGNORE__") {
          next.push({ rawKey: rawCol, targetKey, type, required });
      }
      updateMapping(next);
  };
  
  const mainTabName = mode === "NORMALIZED" ? (isZh ? "验证 / QC" : "Validation / QC") : (isZh ? "映射" : "Mapping");

  // Determine active gate state for UI
  // Note: deriveGateState is imported at top ideally
  
  return (
    <div className="flex flex-col h-full bg-white">
        {/* Tabs */}
        <div className="flex border-b bg-white">
            <button onClick={() => setTab("mapping")} className={cn("flex-1 py-2 text-xs font-medium border-b-2 transition-colors", tab === "mapping" ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}>{mainTabName}</button>
            <button onClick={() => setTab("issues")} className={cn("flex-1 py-2 text-xs font-medium border-b-2 transition-colors", tab === "issues" ? "border-red-600 text-red-600 bg-red-50/50" : "border-transparent text-slate-500 hover:text-slate-700")}>
                {isZh ? "问题" : "Issues"} 
                {(summary.fail + summary.warn) > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">{summary.fail + summary.warn}</span>}
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {tab === "mapping" ? (
                mode === "RAW" ? (
                    // RAW MODE: MAPPING
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                             <p className="text-xs text-slate-400">{isZh ? "CSV列映射到系统字段" : "Map CSV to System"}</p>
                             <button 
                               onClick={() => {
                                   const next = [...mapping];
                                   TARGET_SCHEMA.forEach(target => {
                                       if (next.some(m => m.targetKey === target.key)) return; 
                                       const match = rawColumns.find(r => 
                                           r.toLowerCase().replace(/[^a-z0-9]/g, "") === target.key.toLowerCase().replace(/[^a-z0-9]/g, "") ||
                                           (target.key === "PartNo" && r.toLowerCase().includes("part")) ||
                                           (target.key === "Load" && r.toLowerCase().includes("load"))
                                       );
                                       if (match) next.push({ rawKey: match, targetKey: target.key, type: target.type as any, required: !!target.required });
                                   });
                                   updateMapping(next);
                               }}
                               className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium"
                             >
                                 {isZh ? "自动匹配" : "Auto Match"}
                             </button>
                        </div>
    
                        {TARGET_SCHEMA.map(target => {
                            const current = mapping.find(m => m.targetKey === target.key);
                            return (
                                <div key={target.key} className="space-y-1">
                                    <label className="text-xs font-medium text-slate-700 block">
                                        {target.key} <span className="text-slate-400 font-normal">({target.type})</span>
                                        {target.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    <select 
                                       className={cn(
                                           "w-full text-xs border rounded p-1.5 bg-white transition-colors",
                                           !current?.rawKey && target.required ? "border-amber-300 bg-amber-50" : "border-slate-200"
                                       )}
                                       value={current?.rawKey || "__IGNORE__"}
                                       onChange={e => handleMapChange(target.key, e.target.value, target.type as any, !!target.required)}
                                    >
                                        <option value="__IGNORE__">{isZh ? "- 忽略 -" : "- Ignore -"}</option>
                                        {rawColumns.map(col => (
                                            <option key={col} value={col}>{col}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                        
                         {/* Guidance Cue */}
                         <div className="mt-6 p-3 bg-blue-50 rounded border border-blue-100">
                             <h4 className="text-xs font-bold text-blue-800 mb-1">{isZh ? "下一步" : "Next Step"}</h4>
                             <p className="text-[10px] text-blue-600">
                                 {mapping.length < TARGET_SCHEMA.filter(t => t.required).length 
                                     ? (isZh ? "请映射上方所有必填项(*)。" : "Please map all required fields (*) above.")
                                     : (isZh ? "映射完成！点击顶部 '下一步' 继续。" : "Mapping looks good! Click 'Apply Mapping' in the top bar to proceed.")
                                 }
                             </p>
                         </div>
                          
                          {/* Fixed Spec Limits Section */}
                          <div className="mt-4 p-3 bg-white rounded border border-slate-200">
                              <h4 className="text-xs font-bold text-slate-700 mb-2">
                                  {isZh ? "固定规格限 (可选)" : "Fixed Spec Limits (Optional)"}
                              </h4>
                              <p className="text-[10px] text-slate-400 mb-3">
                                  {isZh ? "当数据无 LSL/USL 列时，在此输入固定值以计算 Cp/Cpk" : "Enter fixed values for Cp/Cpk calculation when data lacks LSL/USL columns"}
                              </p>
                              
                              <div className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                      <label className="text-[10px] text-slate-500 w-14">LSL</label>
                                      <input
                                          type="number"
                                          step="any"
                                          value={lslInput}
                                          onChange={(e) => setLslInput(e.target.value)}
                                          onBlur={(e) => handleSpecLimitBlur('lsl', e.target.value)}
                                          placeholder={isZh ? "下规格限" : "Lower Spec"}
                                          className="flex-1 text-xs border rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <label className="text-[10px] text-slate-500 w-14">USL</label>
                                      <input
                                          type="number"
                                          step="any"
                                          value={uslInput}
                                          onChange={(e) => setUslInput(e.target.value)}
                                          onBlur={(e) => handleSpecLimitBlur('usl', e.target.value)}
                                          placeholder={isZh ? "上规格限" : "Upper Spec"}
                                          className="flex-1 text-xs border rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                      <label className="text-[10px] text-slate-500 w-14">Target</label>
                                      <input
                                          type="number"
                                          step="any"
                                          value={targetInput}
                                          onChange={(e) => setTargetInput(e.target.value)}
                                          onBlur={(e) => handleSpecLimitBlur('target', e.target.value)}
                                          placeholder={isZh ? "目标值" : "Target"}
                                          className="flex-1 text-xs border rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      />
                                  </div>
                              </div>
                              
                              {(specLimits.lsl !== undefined || specLimits.usl !== undefined) && (
                                  <div className="mt-2 text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded">
                                      ✓ {isZh ? "规格限已配置" : "Spec limits configured"}
                                  </div>
                              )}
                          </div>
                    </div>
                ) : (
                    // NORMALIZED MODE: ACTIONS
                    <div className="space-y-6">
                        {/* Status Card */}
                        <div className={cn("p-4 rounded-lg border", gateStatus === "BLOCKED" ? "bg-red-50 border-red-200" : gateStatus === "CONDITIONAL_READY" ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200")}>
                            <h3 className={cn("font-bold text-sm mb-1", gateStatus === "BLOCKED" ? "text-red-800" : gateStatus === "CONDITIONAL_READY" ? "text-amber-800" : "text-green-800")}>
                                {gateStatus === "BLOCKED" ? (isZh ? "分析被阻断" : "Analysis Blocked") : 
                                 gateStatus === "CONDITIONAL_READY" ? (isZh ? "准备就绪 (带警告)" : "Ready with Warnings") : 
                                 (isZh ? "准备就绪" : "Ready")}
                            </h3>
                            <p className="text-xs opacity-80">
                                {gateStatus === "BLOCKED" ? (isZh ? "必须修复或排除所有失败行才能继续。" : "You must fix or exclude all failed rows to proceed.") :
                                 gateStatus === "CONDITIONAL_READY" ? (isZh ? "您可以继续，但警告行将被标记。" : "You can proceed, but warned rows will be flagged.") :
                                 (isZh ? "数据完美，可以进入分析。" : "Data is clean. Ready for analysis.")}
                            </p>
                            
                            {/* Summary Stats in Card */}
                            <div className="mt-3 flex space-x-4 text-xs">
                                <span className="font-medium text-red-600">Fail: {summary.fail}</span>
                                <span className="font-medium text-amber-600">Warn: {summary.warn}</span>
                                <span className="text-slate-500">Excluded: {summary.excluded}</span>
                            </div>
                        </div>

                        {/* Failure Actions */}
                        {gateStatus === "BLOCKED" && summary.fail > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{isZh ? "失败处理" : "Failure Actions"}</h4>
                                
                                <button 
                                    onClick={() => {
                                        // Bulk Exclude
                                        if(confirm(isZh ? `确定排除所有 ${summary.fail} 个失败行吗？` : `Exclude all ${summary.fail} failed rows?`)) {
                                            excludeFailedRows();
                                        }
                                    }}
                                    className="w-full py-2 px-3 bg-white border border-slate-300 hover:border-red-400 hover:text-red-600 rounded text-xs font-medium transition shadow-sm flex items-center justify-center"
                                >
                                    {isZh ? "排除所有失败行" : "Exclude All Failed Rows"}
                                </button>
                                
                                <button className="w-full py-2 px-3 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 rounded text-xs font-medium transition shadow-sm flex items-center justify-center">
                                    {isZh ? "导出失败数据 (CSV)" : "Export Failures (CSV)"}
                                </button>
                            </div>
                        )}
                        
                        <div className="text-[10px] text-slate-400 text-center mt-8">
                            {isZh ? "提示: 点击 '问题' 标签页查看详细列表" : "Tip: Check 'Issues' tab for details"}
                        </div>
                    </div>
                )
            ) : (
                <div className="space-y-2">
                    {allIssues.length === 0 && <div className="text-xs text-slate-400 text-center mt-4">{isZh ? "未发现问题（或已截断显示）。" : "No issues found (or list truncated)."}</div>}
                    {allIssues.map((issue, i) => (
                        <div key={i} className="text-xs p-2 bg-white border rounded shadow-sm hover:bg-slate-50 cursor-pointer group">
                           <div className="flex justify-between font-medium">
                               <span className={issue.severity === "FAIL" ? "text-red-600" : "text-amber-600"}>{issue.severity}</span>
                               <span className="text-slate-400 group-hover:text-blue-600 transition">R{issue.rowIndex + 1} : {issue.colKey}</span>
                           </div>
                           <div className="text-slate-600 mt-1">{issue.message}</div>
                           {/* Quick Action for Issue */}
                           {issue.severity === "FAIL" && (
                               <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    excludeRow(issue.rowId);
                                }}
                                className="mt-2 text-[10px] text-slate-400 hover:text-red-500 underline"
                               >
                                   {isZh ? "排除此行" : "Exclude Row"}
                               </button>
                           )}
                        </div>
                    ))}
                    {/* Truncation Notice */}
                     {allIssues.length >= 200 && (
                        <div className="text-[10px] text-slate-400 italic text-center py-2">
                            {isZh ? "仅显示前 200 个问题" : "Showing first 200 issues only"}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
}
