
import React, { useMemo } from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { sampleDeterministic } from "@/lib/quality/utils/sample";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Database } from "lucide-react";
import type { RawRowView } from "@/lib/quality/types";

export function RawInspector() {
  const chartMode = useQualityStore(s => s.chart.chartMode);
  const debug = useQualityStore(s => s.chart.debug);
  const storeRawRows = useQualityStore(s => s.rawRows);
  
  // Compute rawRows in useMemo to avoid infinite loop
  const rawRows: RawRowView[] = useMemo(() => {
    if (debug.mode !== "RAW") return [];
    
    if (chartMode === "AGGREGATED") {
      if (debug.showRawWhenAggregated === "EMPTY") return [];
      // SAMPLED
      const sampled = sampleDeterministic(storeRawRows, debug.rawSampleSize, debug.rawSampleSeed ?? 1);
      return sampled.map(r => ({ ...r.cells, id: r.id, __rowIndex: r.__meta?.rowIndex }));
    }
    
    // RAW mode - return all
    return storeRawRows.map(r => ({ ...r.cells, id: r.id, __rowIndex: r.__meta?.rowIndex }));
  }, [chartMode, debug.mode, debug.showRawWhenAggregated, debug.rawSampleSize, debug.rawSampleSeed, storeRawRows]);
  
  const setChartMode = useQualityStore(s => s.setChartMode);
  const setShowRaw = useQualityStore(s => s.setShowRawWhenAggregated);
  const setSampleSize = useQualityStore(s => s.setRawSampleSize);

  // EMPTY STATE for Aggregated Mode
  if (chartMode === "AGGREGATED" && debug.showRawWhenAggregated === "EMPTY") {
      return (
          <div className="h-56 rounded-md border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="flex flex-col items-center opacity-70">
                 <Database className="h-8 w-8 text-slate-400 mb-2" />
                 <h3 className="font-semibold text-slate-700">Raw data not shown in Aggregated Mode</h3>
                 <p className="text-xs text-slate-500 max-w-md mt-1">
                     Charts run on aggregated/decimated series for readability and performance. 
                     Switch to RAW Mode to inspect original measurements, or enable Sample Raw.
                 </p>
                 <p className="text-xs text-slate-400 max-w-md mt-2">
                     DEBUG (RAW) - Shows imported raw rows exactly as received. No mapping, cleaning, validation, or exclusions applied.
                 </p>
              </div>
              <div className="flex items-center space-x-3">
                  <Button variant="default" size="sm" onClick={() => setChartMode("RAW")}>
                      Switch to RAW Mode
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRaw("SAMPLED")}>
                      Show Sampled Raw
                  </Button>
              </div>
          </div>
      );
  }

  // DATA TABLE STATE
  // If sampled or Raw mode
  
  const keys = rawRows.length > 0 ? Object.keys(rawRows[0]).filter(k => k !== '__rowIndex' && k !== 'id') : [];

  return (
    <div className="flex flex-col border rounded-md bg-white shadow-sm overflow-hidden h-[400px]">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2">
            <div className="flex items-center space-x-3">
               <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                   <Database className="h-4 w-4 text-orange-600" />
                   Raw Data Inspector
               </span>
               <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                   Showing {rawRows.length} rows {debug.showRawWhenAggregated === "SAMPLED" && chartMode === "AGGREGATED" ? "(Sampled)" : ""}
               </span>
            </div>
            
            {chartMode === "AGGREGATED" && (
                <div className="flex items-center space-x-2 text-xs">
                     <Label>Sample Size:</Label>
                     <Input 
                        type="number" 
                        className="h-7 w-20 text-xs" 
                        value={debug.rawSampleSize} 
                        onChange={e => setSampleSize(Math.min(2000, Math.max(1, Number(e.target.value))))} 
                     />
                </div>
            )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
            {rawRows.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">No Data Available</div>
            ) : (
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 sticky top-0 z-10 font-bold text-slate-600">
                        <tr>
                            <th className="p-2 border-b w-12 text-center">#</th>
                            {keys.map(k => (
                                <th key={k} className="p-2 border-b whitespace-nowrap">{k}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rawRows.map((row) => (
                            <tr key={row.id as string || Math.random()} className="hover:bg-slate-50">
                                <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                                    {row.__rowIndex}
                                </td>
                                {keys.map(k => (
                                    <td key={k} className="p-2 whitespace-nowrap font-mono text-slate-700">
                                        {String(row[k] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
        
        {/* Footer info */}
        {rawRows.length > 500 && (
            <div className="bg-yellow-50 p-2 text-[10px] text-yellow-700 text-center border-t border-yellow-100">
                Warning: Displaying large dataset ({rawRows.length} rows) may impact performance.
            </div>
        )}
    </div>
  );
}
