
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function SeriesInspector({ series }: { series: any }) {
  if (!series) return <div className="p-4 text-sm text-slate-500">No Series Data</div>;

  // Flatten if needed or just dump
  // If series is object with { envelope, violations, ... }
  
  const summary = {
      keys: Object.keys(series),
      envelopeCount: series.envelope?.length,
      violationCount: series.violations?.length,
      rawCount: series.raw?.length,
      mode: series.mode
  };

  return (
    <div className="h-64 flex flex-col border rounded-md bg-slate-50">
       <div className="p-2 border-b bg-white flex justify-between items-center">
           <span className="text-xs font-bold text-indigo-700">Generic Series Inspector</span>
           <span className="text-[10px] text-slate-400">Actual props passed to chart</span>
       </div>
       <div className="flex-1 flex overflow-hidden">
           <div className="w-1/3 border-r p-2 text-xs space-y-2 overflow-y-auto">
               <div className="font-semibold">Summary</div>
               <pre className="text-[10px] bg-slate-100 p-1 rounded">{JSON.stringify(summary, null, 2)}</pre>
               
               <div className="font-semibold mt-2">Envelope [0-2]</div>
               <pre className="text-[10px] text-slate-600">
                   {JSON.stringify(series.envelope?.slice(0, 3) || [], null, 2)}
               </pre>
           </div>
           
           <div className="w-2/3 p-2 text-xs overflow-y-auto font-mono">
               <div className="font-semibold text-slate-700 mb-1">Full Structure Preview (Depth 1)</div>
               <pre className="text-[10px] whitespace-pre-wrap">
                   {JSON.stringify(series, (key, val) => {
                       if (Array.isArray(val) && val.length > 5) {
                           return `[Array(${val.length})]`; // Truncate arrays
                       }
                       return val;
                   }, 2)}
               </pre>
           </div>
       </div>
    </div>
  );
}
