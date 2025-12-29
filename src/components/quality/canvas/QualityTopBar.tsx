"use client";

import React, { useRef } from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { parseCsv } from "@/lib/quality/parseCsv";
import { cn } from "@/lib/utils";
import { Upload, CheckCircle, RotateCcw, XCircle, AlertTriangle, PlayCircle } from "lucide-react";
import { useLanguage } from "@/components/language-context";
import { generateSampleData } from "@/lib/quality/generateSample";
import { QualityStepperNav } from "@/components/quality/QualityStepperNav";
import { GateConfirmModal } from "@/components/quality/GateConfirmModal";
import { useQualityCanvas } from "./QualityCanvasContext";

export function QualityTopBar() {
  // Store State - Split selectors to avoid object identity issues
  const activeStep = useQualityStore(state => state.activeStep);
  const stepperSnapshot = useQualityStore(state => state.stepperSnapshot);
  const summary = useQualityStore(state => state.validationSummary);
  const mapping = useQualityStore(state => state.columnMapping);
  const mode = useQualityStore(state => state.mode);
  
  // Actions - Split selectors
  const importData = useQualityStore(state => state.importData);
  const reset = useQualityStore(state => state.reset);
  const validateAll = useQualityStore(state => state.validateAll);
  const setActiveStep = useQualityStore(state => state.setActiveStep);
  const confirmWarningsAndEnterAnalysis = useQualityStore(state => state.confirmWarningsAndEnterAnalysis);
  const acceptWarningsForAnalysis = useQualityStore(state => state.acceptWarningsForAnalysis);

  const { language } = useLanguage();
  const isZh = language === "zh";
  
  // Local UI State
  const [showGateModal, setShowGateModal] = React.useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigation Handler
  const handleNav = (target: any) => { // QualityStep
     const result = setActiveStep(target);
     if (!result.ok) {
         if (result.reason === "REQUIRES_WARNING_CONFIRM") {
             setShowGateModal(true);
         } else {
             // Maybe show toast? For now silent prevent or console
             console.warn("Navigation prevented:", result.reason);
         }
     }
  };

  // View Mode Toggle (Visual only, allows peeking at Raw)
  const toggleMode = (m: "RAW" | "NORMALIZED") => {
      useQualityStore.setState({ mode: m });
  };

  // File Handler
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const text = await file.text();
      const result = parseCsv(text);
      
      // Transform to RawRow format
      const rawRows = result.rows.map((row, i) => ({
          id: row.__rowId || `row-${i}`,
          cells: Object.fromEntries(Object.entries(row).filter(([k]) => k !== '__rowId').map(([k, v]) => [k, String(v ?? "")])),
          __meta: { rowIndex: i }
      }));
      
      importData({
          rawRows,
          columns: result.rawColumns,
          fileName: file.name
      });
      // Auto move to Mapping if successful? 
      // Store stays at IMPORT, we click Next.
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col border-b bg-white z-20">
      {/* 1. Stepper Navigation */}
      <QualityStepperNav 
          snapshot={stepperSnapshot} 
          onStepClick={handleNav} 
      />

      {/* 2. Action Bar */}
      <div className="h-14 flex items-center justify-between px-4">
       <div className="flex items-center space-x-6">
           <h2 className="font-bold text-slate-800">{isZh ? "质量面板" : "QC Canvas"}</h2>
           
           <div className="flex bg-slate-100 p-1 rounded-lg">
               <button onClick={() => toggleMode("RAW")} className={cn("text-xs px-3 py-1 rounded font-medium transition", mode === "RAW" ? "bg-white shadow text-slate-900" : "text-slate-500")}>
                   {isZh ? "原始数据" : "Raw"}
               </button>
               <button onClick={() => toggleMode("NORMALIZED")} className={cn("text-xs px-3 py-1 rounded font-medium transition", mode === "NORMALIZED" ? "bg-white shadow text-blue-600" : "text-slate-500")}>
                   {isZh ? "标准化" : "Normalized"}
               </button>
           </div>
       </div>

       <div className="flex items-center space-x-3">
           {summary.total > 0 && (
               <div className="flex items-center space-x-3 mr-4 text-xs font-medium bg-slate-50 px-3 py-1 border rounded-full">
                   <span className="text-slate-600">{summary.total} {isZh ? "行" : "Rows"}</span>
                   <span className="text-gray-300">|</span>
                   <span className="text-green-600">{summary.pass} {isZh ? "合格" : "Pass"}</span>
                   <span className="text-amber-600">{summary.warn} {isZh ? "警告" : "Warn"}</span>
                   <span className="text-red-600">{summary.fail} {isZh ? "失败" : "Fail"}</span>
               </div>
           )}
           
           {!summary.total && (
             <button 
               onClick={() => {
                  const result = generateSampleData(10000, language);
                  importData({
                      rawRows: result.rows,
                      columns: result.rawColumns,
                      fileName: "sample_10k.csv"
                  });
               }}
               className="text-xs px-3 py-1.5 bg-gray-100 text-slate-700 rounded hover:bg-gray-200 font-medium whitespace-nowrap"
             >
               {isZh ? "加载大数据样本 (1万行)" : "Load Big Sample (10k)"}
             </button>
           )}

           {/* Workflow Actions */}
           
           {activeStep === "IMPORT" && (
                <button 
                    onClick={() => handleNav("MAPPING")}
                    disabled={mode === "RAW" && !useQualityStore.getState().rawRows.length} // Check existence
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-medium animate-pulse"
                >
                    {isZh ? "下一步: 映射字段" : "Next: Map Columns"}
                </button>
           )}

           {activeStep === "MAPPING" && (
                <button 
                    onClick={() => handleNav("VALIDATION")}
                    disabled={mapping.length === 0}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-medium animate-pulse"
                >
                    {isZh ? "下一步: 开始校验" : "Next: Start Validation"}
                </button>
           )}
           
           {activeStep === "VALIDATION" && (
               <>
                   <button onClick={() => validateAll()} className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 text-xs font-medium border border-indigo-100">
                       <CheckCircle size={14} /> <span>{isZh ? "重新校验" : "Re-Validate"}</span>
                   </button>

                   {/* Gate Actions */}
                   {stepperSnapshot.gateState === "BLOCKED" && (
                       <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-1.5 rounded text-xs font-medium border border-red-100">
                           <XCircle size={14} />
                           <span>{isZh ? "无法继续 (存在失败行)" : "Blocked (Fix Failures)"}</span>
                       </div>
                   )}
                   
                   {stepperSnapshot.gateState === "CONDITIONAL_READY" && (
                       <button 
                            onClick={() => handleNav("ANALYSIS")} // Will trigger modal
                            className="flex items-center space-x-2 text-amber-700 bg-amber-100 px-3 py-1.5 rounded text-xs font-medium border border-amber-200 hover:bg-amber-200"
                        >
                           <AlertTriangle size={14} />
                           <span>{isZh ? "确认警告并分析" : "Review Warnings"}</span>
                       </button>
                   )}
                   
                   {stepperSnapshot.gateState === "READY" && (
                       <button 
                            onClick={() => handleNav("ANALYSIS")}
                            className="flex items-center space-x-2 text-white bg-green-600 px-3 py-1.5 rounded text-xs font-medium shadow hover:bg-green-700"
                        >
                           <PlayCircle size={14} />
                           <span>{isZh ? "进入分析概览" : "Enter Analysis Dashboard"}</span>
                       </button>
                   )}
               </>
           )}

           
           <input type="file" accept=".csv" ref={fileInputRef} className="hidden" onChange={handleFile} />
           <button onClick={() => fileInputRef.current?.click()} className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-700 text-xs font-medium">
               <Upload size={14} /> <span>{isZh ? "导入CSV" : "Import CSV"}</span>
           </button>
           
           <button onClick={() => reset()} className="p-2 text-slate-400 hover:text-red-600 transition" title={isZh ? "重置" : "Reset"}>
               <RotateCcw size={16} />
           </button>
       </div>
    </div>
    
    {/* Gate Confirmation Modal */}
    {showGateModal && (
        <GateConfirmModal 
            warnCount={summary.warn}
            onCancel={() => setShowGateModal(false)}
            onConfirm={() => {
                confirmWarningsAndEnterAnalysis();
                setShowGateModal(false);
            }}
        />
    )}
    </div>
  );
}
