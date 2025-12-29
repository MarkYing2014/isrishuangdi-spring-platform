"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { analyzeDataset } from "@/lib/quality/analytics/analyzeDataset";
import { generateQualityAnalysisReportHTML, QualityAnalysisReportPDF } from "@/lib/quality/report/qualityAnalysisReport";
import type { QualityAnalysisReportModel } from "@/lib/quality/report/qualityAnalysisReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QualityImrCharts } from "@/components/quality/QualityImrCharts";
import { QualityXbarRCharts } from "@/components/quality/QualityXbarRCharts";
import { Loader2, Download, FileText, ArrowLeft, ExternalLink, X } from "lucide-react";
import { FieldMapping } from "@/lib/quality/types";
import { QualityGateBanner } from "./QualityGateBanner";



export function QualityAnalysisOverlay({ onClose }: { onClose: () => void }) {
  const rawRows = useQualityStore(state => state.rawRows);
  const rawColumns = useQualityStore(state => state.rawColumns);
  const mappingItems = useQualityStore(state => state.columnMapping);
  const specLimits = useQualityStore(state => state.specLimits);
  
  const [reportHtml, setReportHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedChar, setSelectedChar] = useState<string>("");
  
  // Refs to store analysis model for PDF export
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = React.useRef<any>(null);
  const isZh = true; // Default to Chinese as per user locale preference

  useEffect(() => {
    // Run analysis in a timeout to allow UI to mount
    const timer = setTimeout(() => {
        try {
            // 1. Prepare Dataset
            const legacyDataset = {
                id: "current-session",
                headers: rawColumns,
                rows: rawRows.map(r => r.cells)
            };

            // 2. Prepare Mapping
            const fieldMapping: FieldMapping = {
                value: "" // Will be populated below
            };
            
            // Helper to find raw key for target
            const findRaw = (target: string) => mappingItems.find(m => m.targetKey === target)?.rawKey;
            
            // Helper to find raw key by heuristic synonyms if not mapped
            const findHeuristic = (synonyms: string[]) => {
                const lowerNames = synonyms.map(s => s.toLowerCase());
                return rawColumns.find(col => lowerNames.includes(col.toLowerCase()));
            };

            // Map System Targets to Analytics Keys
            fieldMapping.value = findRaw("Load") || ""; // Primary value
            fieldMapping.partId = findRaw("PartNo");
            fieldMapping.timestamp = findRaw("Date");
            fieldMapping.result = findRaw("Result");
            fieldMapping.lsl = findRaw("LSL");
            fieldMapping.usl = findRaw("USL");
            fieldMapping.unit = findRaw("Unit");
            
            // Heuristic Mappings for Analysis Depth (Stratification)
            fieldMapping.machine = findHeuristic(["Machine", "M/C", "Device", "Equipment"]);
            fieldMapping.lot = findHeuristic(["Lot", "Batch", "LotNo", "Serial"]);
            fieldMapping.shift = findHeuristic(["Shift", "Team"]);
            fieldMapping.appraiser = findHeuristic(["Appraiser", "Operator", "User", "Emp"]);
            fieldMapping.gage = findHeuristic(["Gage", "Gauge", "Tool"]);
            fieldMapping.characteristic = findHeuristic(["Characteristic", "Feature", "Dimension"]);

            // Fallback if "Load" not mapped but we have "Value" or just picking a number column
            if (!fieldMapping.value) {
                const numCol = mappingItems.find(m => m.type === "number");
                if (numCol) fieldMapping.value = numCol.rawKey;
            }

            // Wire fixed spec limits from store
            if (specLimits.lsl !== undefined) fieldMapping.lslFixed = specLimits.lsl;
            if (specLimits.usl !== undefined) fieldMapping.uslFixed = specLimits.usl;
            if (specLimits.target !== undefined) fieldMapping.targetFixed = specLimits.target;

            // 3. Run Analysis
            const result = analyzeDataset({
                dataset: legacyDataset,
                mapping: fieldMapping,
                options: { stratifyBy: "auto" }
            });
            
            setAnalysisResult(result);
            if (result.characteristics.length > 0) {
                setSelectedChar(result.characteristics[0].name);
            }

            // 4. Create Report Model
             const model: QualityAnalysisReportModel = {
                dataset: {
                    id: "current",
                    name: isZh ? "当前会话数据" : "Current Session Data",
                    createdAtISO: new Date().toISOString(),
                    source: "Web Import",
                    headers: rawColumns
                },
                mapping: fieldMapping,
                analysis: result,
                meta: {
                    title: isZh ? "全面质量分析报告" : "Comprehensive Quality Analysis Report",
                    language: isZh ? "zh" : "en",
                    preparedBy: "System AI"
                }
            };
            
            modelRef.current = model;
            const html = generateQualityAnalysisReportHTML(model);
            
            setReportHtml(html);
        } catch (e) {
            console.error("Analysis Failed", e);
            setReportHtml(`<html><body><h1 style="color:red">Analysis Error</h1><pre>${e}</pre></body></html>`);
        } finally {
            setLoading(false);
        }
    }, 100);
    return () => clearTimeout(timer);
  }, [rawRows, rawColumns, mappingItems, isZh]);

  const activeCharAnalysis = useMemo(() => {
     if (!analysisResult) return null;
     return analysisResult.characteristics.find((c: any) => c.name === selectedChar);
  }, [analysisResult, selectedChar]);

  const gateStatus = useMemo(() => {
     if (!activeCharAnalysis) return null;
     const imrFail = activeCharAnalysis.imr.points.filter((p: any) => p.outOfControl).length;
     const xbarFail = activeCharAnalysis.xbarr?.points.filter((p: any) => p.xOutOfControl || p.rOutOfControl).length ?? 0;
     const failCount = imrFail + xbarFail;
     // For now, warnCount is 0 since we don't have specific warn logic yet
     const warnCount = 0; 
     const status = failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "PASS";
     return { status, failCount, warnCount, totalPoints: activeCharAnalysis.imr.points.length } as const;
  }, [activeCharAnalysis]);

  const handleExcludeFailed = () => {
      // TODO: Wire to store excludeFailedRows action
      console.log("[AUDIT] Exclude failed rows triggered");
      alert("Excluded failed rows (mock). This action has been logged.");
  };

  const handleConfirmWarnings = () => {
      // TODO: Wire to store acceptWarningsForAnalysis action
      console.log("[AUDIT] Warning confirmation triggered");
  };

  const handleExportFailures = () => {
      // TODO: Export failed rows as CSV
      console.log("[AUDIT] Export failures triggered");
      alert("Export failures (mock).");
  };

  if (loading) {
     return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
           <div className="flex flex-col items-center gap-2">
             <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
             <div className="text-sm text-slate-500">Generating Analysis... / 正在生成分析...</div>
           </div>
        </div>
     );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden animate-in fade-in duration-200">
       {/* Header */}
       <div className="flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm z-10">
          <div className="text-lg font-bold text-slate-800">
             {isZh ? "质量数据分析" : "Quality Data Analysis"}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
             <X className="h-5 w-5" />
          </Button>
       </div>

       {/* Main Content */}
       <div className="flex-1 overflow-hidden">
         <Tabs defaultValue="charts" className="flex h-full flex-col">
            <div className="border-b bg-white px-6 pt-2">
                <TabsList>
                    <TabsTrigger value="charts">{isZh ? "交互式图表" : "Interactive Charts"}</TabsTrigger>
                    <TabsTrigger value="report">{isZh ? "完整报告预览" : "Full Report Preview"}</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="charts" className="flex-1 overflow-y-auto bg-slate-50 p-6 data-[state=inactive]:hidden">
               <div className="mx-auto max-w-6xl space-y-6">
               {gateStatus && (
                   <QualityGateBanner 
                       status={gateStatus.status} 
                       failCount={gateStatus.failCount} 
                       warnCount={gateStatus.warnCount}
                       totalPoints={gateStatus.totalPoints}
                       onExcludeFailed={handleExcludeFailed}
                       onConfirmWarnings={handleConfirmWarnings}
                       onExportFailures={handleExportFailures}
                   />
               )}
                  {/* Controls */}
                  <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                      <div className="text-sm font-medium text-slate-700">{isZh ? "选择特性 (Characteristic):" : "Select Characteristic:"}</div>
                      <Select value={selectedChar} onValueChange={setSelectedChar}>
                         <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Select..." />
                         </SelectTrigger>
                         <SelectContent>
                            {analysisResult?.characteristics.map((c: any) => (
                                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                            ))}
                         </SelectContent>
                      </Select>
                  </div>
                  
                  {activeCharAnalysis ? (
                      <>
                        <div className="grid gap-6">
                            {/* IMR Charts */}
                            <div className="rounded-lg border bg-white p-4 shadow-sm">
                                <h3 className="mb-4 font-semibold text-slate-800">I-MR Control Charts</h3>
                                <QualityImrCharts imr={activeCharAnalysis.imr} height={300} />
                            </div>
                            
                            {/* XbarR Charts */}
                            {activeCharAnalysis.xbarr ? (
                                <div className="rounded-lg border bg-white p-4 shadow-sm">
                                    <h3 className="mb-4 font-semibold text-slate-800">Xbar-R Control Charts (Subgroup Size = {activeCharAnalysis.xbarr.subgroupSize})</h3>
                                    <QualityXbarRCharts xbarr={activeCharAnalysis.xbarr} height={300} />
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-slate-500">
                                    {isZh ? "数据不足以生成 Xbar-R 图 (需要子组 ID)" : "Insufficient data for Xbar-R Chart (Subgroup ID required)"}
                                </div>
                            )}
                        </div>
                        
                         {/* Capability Summary Table */}
                         <div className="rounded-lg border bg-white p-6 shadow-sm">
                            <h3 className="mb-4 font-semibold text-slate-800">{isZh ? "过程能力汇总" : "Capability Summary"}</h3>
                             <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                <div className="rounded border p-4 text-center">
                                    <div className="text-slate-500 mb-1">Cp</div>
                                    <div className="text-2xl font-bold text-blue-600">{activeCharAnalysis.capability.cp?.toFixed(3) ?? "—"}</div>
                                </div>
                                <div className="rounded border p-4 text-center">
                                    <div className="text-slate-500 mb-1">Cpk</div>
                                    <div className="text-2xl font-bold text-blue-600">{activeCharAnalysis.capability.cpk?.toFixed(3) ?? "—"}</div>
                                </div>
                                <div className="rounded border p-4 text-center">
                                    <div className="text-slate-500 mb-1">Mean</div>
                                    <div className="text-xl font-bold">{activeCharAnalysis.capability.mean.toFixed(3)}</div>
                                </div>
                                <div className="rounded border p-4 text-center">
                                    <div className="text-slate-500 mb-1">Std Dev</div>
                                    <div className="text-xl font-bold">{activeCharAnalysis.capability.std.toFixed(3)}</div>
                                </div>
                             </div>
                         </div>
                      </>
                  ) : (
                      <div className="flex bg-white rounded-lg border p-12 items-center justify-center text-slate-500">
                          {isZh ? "请选择特性以查看图表" : "Please select a characteristic"}
                      </div>
                  )}
               </div>
            </TabsContent>
            
            <TabsContent value="report" className="flex-1 bg-white data-[state=inactive]:hidden relative">
                <iframe 
                  srcDoc={reportHtml} 
                  className="absolute inset-0 h-full w-full border-none" 
                  title="Analysis Report"
                  sandbox="allow-same-origin allow-scripts"
                />
            </TabsContent>
         </Tabs>
       </div>

       {/* Footer */}
       <div className="flex  items-center justify-end gap-3 border-t bg-white px-6 py-4 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] z-10">
           <Button variant="outline" onClick={() => {
                const blob = new Blob([reportHtml], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
           }}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {isZh ? "网页预览" : "Preview HTML"}
           </Button>
           
           <Button variant="outline" onClick={() => {
               const blob = new Blob([reportHtml], { type: 'text/html' });
               const url = URL.createObjectURL(blob);
               const a = document.createElement('a');
               a.href = url;
               a.download = `QualityReport_${new Date().toISOString().slice(0,10)}.html`;
               a.click();
           }}>
              <FileText className="mr-2 h-4 w-4" />
              {isZh ? "导出 HTML" : "Export HTML"}
           </Button>
           
           <Button onClick={async () => {
                if (!modelRef.current) return;
                try {
                    const { pdf } = await import("@react-pdf/renderer");
                    const { QualityAnalysisReportPDF } = await import("@/lib/quality/report/qualityAnalysisReport");
                    
                    const blob = await pdf(<QualityAnalysisReportPDF model={modelRef.current} />).toBlob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `QualityReport_${new Date().toISOString().slice(0,10)}.pdf`;
                    a.click();
                } catch (e) {
                    console.error("PDF Export failed", e);
                    alert(isZh ? "PDF 导出失败" : "PDF Export Failed");
                }
           }}>
              <Download className="mr-2 h-4 w-4" />
              {isZh ? "导出 PDF" : "Export PDF"}
           </Button>

           <div className="h-6 w-px bg-slate-300 mx-2" />
           
           <Button variant="secondary" onClick={onClose}>
               <ArrowLeft className="mr-2 h-4 w-4" />
               {isZh ? "返回数据映射" : "Return"}
           </Button>
       </div>
    </div>
  );
}
