"use client";

import React, { useState, useRef } from "react";
import { QualitySheetCanvas } from "@/components/quality/QualitySheetCanvas";
import { QualityMappingPanel } from "@/components/quality/QualityMappingPanel";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { parseCsv } from "@/lib/quality/parser/parseCsv";
import { parseXlsx } from "@/lib/quality/parser/parseXlsx";
import { cn } from "@/lib/utils";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";

export default function QualityCanvasPage() {
  const [activeTab, setActiveTab] = useState<"RAW" | "NORMALIZED">("NORMALIZED");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const rawRows = useQualityStore(state => state.rawRows);
  const importData = useQualityStore(state => state.importData);
  const reset = useQualityStore(state => state.reset);
  const summary = useQualityStore(state => state.validationSummary);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      let result;
      if (file.name.endsWith(".csv")) {
          result = await parseCsv(file);
      } else if (file.name.match(/\.(xlsx|xls)$/)) {
          result = await parseXlsx(file);
      } else {
          throw new Error("Unsupported file type. Please upload .csv or .xlsx");
      }

      if (result.rows.length === 0) {
          throw new Error("File is empty or could not be parsed.");
      }

      // Transform parsed rows to RawRow format
      const rawRows = result.rows.map((cells: Record<string, any>, i: number) => ({
          id: `row-${i}`,
          cells: Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, String(v ?? "")])),
          __meta: { rowIndex: i }
      }));

      importData({ rawRows, fileName: file.name, columns: result.headers || Object.keys(result.rows[0] || {}) });
      setActiveTab("RAW"); // Switch to Raw view initially to confirm data
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to parse file");
    } finally {
        setIsUploading(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const hasData = rawRows.length > 0;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
          <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  QC Workbench
              </h1>
              {hasData && (
                  <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                      <button 
                         onClick={() => setActiveTab("RAW")}
                         className={cn("px-3 py-1 text-xs font-medium rounded transition", activeTab === "RAW" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}
                      >
                          Raw Data ({rawRows.length})
                      </button>
                      <button 
                         onClick={() => setActiveTab("NORMALIZED")}
                         className={cn("px-3 py-1 text-xs font-medium rounded transition", activeTab === "NORMALIZED" ? "bg-white shadow text-blue-600" : "text-slate-500 hover:text-slate-700")}
                      >
                          Cleaned ({summary.total})
                      </button>
                  </div>
              )}
          </div>

          <div className="flex items-center space-x-3">
              {hasData && (
                  <div className="flex items-center space-x-4 mr-4 text-xs">
                      <div className="flex items-center space-x-1 text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span>{summary.pass} Valid</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-500">
                           <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                           <span>{summary.warn} Warn</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-500">
                           <span className="w-2 h-2 rounded-full bg-red-500"></span>
                           <span>{summary.fail} Fail</span>
                      </div>
                  </div>
              )}

              <input 
                 type="file" 
                 accept=".csv,.xlsx,.xls" 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFile}
              />
              
              {!hasData ? (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition"
                  >
                      {isUploading ? "Parsing..." : <><Upload size={16} /> <span>Import Data</span></>}
                  </button>
              ) : (
                  <button 
                    onClick={reset}
                    className="text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded"
                  >
                      Close / Reset
                  </button>
              )}
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
          {error && (
             <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded shadow-lg flex items-center space-x-2">
                 <AlertCircle size={20} />
                 <span>{error}</span>
                 <button onClick={() => setError(null)} className="ml-4 font-bold">×</button>
             </div>
          )}

          {!hasData ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                      <FileSpreadsheet size={48} className="text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-800 mb-2">Quality Data Workbench</h2>
                  <p className="text-slate-500 max-w-md text-center mb-8">
                      Import raw measurement data (CSV/Excel) to clean, validate, and analyze quality metrics.
                  </p>
                  <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="px-6 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-slate-700 font-medium transition"
                  >
                      Select File to Import
                  </button>
              </div>
          ) : (
              <div className="flex-1 flex overflow-hidden">
                  {/* Mapping Sidebar (Only visible/relevant for Raw or if we want to config mapping) */}
                  {/* Let's show it always on left, collapsible? Or fixed width. */}
                  <div className="w-[350px] border-r bg-white flex flex-col overflow-hidden">
                       <QualityMappingPanel />
                  </div>

                  {/* Canvas Area */}
                  <div className="flex-1 bg-slate-100 p-4 overflow-hidden relative">
                      <QualitySheetCanvas />
                  </div>
              </div>
          )}
      </div>
    </div>
  );
}
