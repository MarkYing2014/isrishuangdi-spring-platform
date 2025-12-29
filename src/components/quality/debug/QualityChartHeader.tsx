
import React from "react";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { QualityChartMode, QualityDebugMode } from "@/lib/quality/types";
import { Button } from "@/components/ui/button";

export function QualityChartHeader({ title, count, densityMode }: { title: string, count: number, densityMode: string }) {
  const chartMode = useQualityStore(s => s.chart.chartMode);
  const debugMode = useQualityStore(s => s.chart.debug.mode);
  
  const setChartMode = useQualityStore(s => s.setChartMode);
  const setDebugMode = useQualityStore(s => s.setDebugMode);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        <span className={`text-xs px-2 py-0.5 rounded border ${
            densityMode === 'RAW' ? 'bg-slate-50 text-slate-500 border-slate-200' :
            densityMode === 'SAMPLED' ? 'bg-blue-50 text-blue-600 border-blue-200' :
            'bg-purple-50 text-purple-600 border-purple-200'
        }`}>
            {densityMode} MODE (N={count})
        </span>
      </div>
      
      <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
          {/* Chart Modes */}
          <button 
              onClick={() => {
                  setChartMode("AGGREGATED");
                  if (debugMode === "RAW" && chartMode === "RAW") {
                       // UX: If we switch off raw chart, keep debug panel? Yes.
                  }
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${chartMode === 'AGGREGATED' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              ENGINEERING
          </button>
          
          <div className="w-px h-4 bg-slate-300 mx-1" />

          {/* Debug Modes */}
          <button 
               onClick={() => setDebugMode(debugMode === "SERIES" ? "OFF" : "SERIES")}
               className={`px-3 py-1 text-xs font-medium rounded-md transition ${debugMode === 'SERIES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              SERIES DEBUG
          </button>
          <button 
               onClick={() => {
                   // Debug Raw implies we might want to see Raw Chart? Not necessarily.
                   // User spec: 1) DEBUG (RAW): Inspect original QC rows.
                   // The chart button "DEBUG (RAW)" meant "Show Raw Chart". 
                   // The prompt says: "Replace DEBUG (RAW) with... [ENGINEERING] [DEBUG (SERIES)] [DEBUG (RAW)]"
                   // Is "DEBUG (RAW)" a panel mode or a chart mode?
                   // Prompt: "Clicking selects store.chart.debug.mode accordingly."
                   // BUT ChartMode must also toggle?
                   // Prompt: "If chartMode === 'RAW': Do NOT try to chart 10k points... RAW inspector can show..."
                   
                   // Logic: 
                   // "ENGINEERING" -> ChartMode: AGGREGATED
                   // "DEBUG (RAW)" -> ChartMode: RAW? Or just Panel Raw?
                   // Prompt implies 3 buttons toggle group. 
                   // Let's assume:
                   // Btn 1: ENGINEERING (Chart=AGGREGATED, Panel=OFF?)
                   // Btn 2: DEBUG SERIES (Chart=curr, Panel=SERIES)
                   // Btn 3: DEBUG RAW (Chart=curr? or RAW?, Panel=RAW)
                   
                   // Assuming we separate Chart Render Mode and Debug Panel Mode.
                   // But "ENGINEERING" button usually implies the "View".
                   // I will keep ChartMode separate toggle for now? 
                   // Or merge? 
                   // Let's implement independent controls as implemented here for flexibility, but maybe group visually.
                   
                   setDebugMode(debugMode === "RAW" ? "OFF" : "RAW");
               }}
               className={`px-3 py-1 text-xs font-medium rounded-md transition ${debugMode === 'RAW' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              RAW INSPECTOR
          </button>
      </div>
      
       <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1 ml-2">
           <span className="text-[10px] text-slate-400 px-2 uppercase tracking-wider font-bold">Chart View</span>
           <button 
                  onClick={() => setChartMode("AGGREGATED")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${chartMode === 'AGGREGATED' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
              >
                  AGG
              </button>
           <button 
                  onClick={() => setChartMode("RAW")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${chartMode === 'RAW' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
              >
                  RAW
              </button>
       </div>
    </div>
  );
}
