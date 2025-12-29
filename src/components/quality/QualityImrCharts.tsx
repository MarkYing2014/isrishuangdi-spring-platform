"use client";

import { aggregateImrData } from "@/lib/quality/chartUtils";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ImrChart } from "@/lib/quality";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { QualityChartHeader } from "./debug/QualityChartHeader";
import { QualityDebugPanel } from "./debug/QualityDebugPanel";

function fmt(n: number, decimals = 3) {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

export function QualityImrCharts({ imr, height = 260 }: { imr: ImrChart; height?: number }) {
  const [mounted, setMounted] = useState(false);
  
  // Global State
  const chartMode = useQualityStore(s => s.chart.chartMode);
  const showRaw = chartMode === "RAW";

  const [onlyViolations, setOnlyViolations] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute multi-resolution data
  const { series, mrSeries } = useMemo(() => {
    if (!imr.points) return { series: null, mrSeries: null };
    
    // I Chart Data
    const iAgg = aggregateImrData(imr.points);
    const iEnvelope = iAgg.envelope.map(p => ({ ...p, range: [p.min, p.max] }));
    
    // MR Chart Data (Calculate MR then aggregate)
    // For MR, we need to generate raw MR stream first
    const mrPoints = [];
    const points = imr.points;
    const mrBar = imr.mrBar ?? 0;
    const mrUcl = 3.267 * mrBar;
    
    for (let i = 1; i < points.length; i++) {
        const val = Math.abs(points[i].value - points[i-1].value);
        mrPoints.push({
            x: i + 1,
            value: val,
            cl: mrBar,
            ucl: mrUcl,
            lcl: 0,
            outOfControl: val > mrUcl // simplified check
        });
    }
    const mrAgg = aggregateImrData(mrPoints);
    const mrEnvelope = mrAgg.envelope.map(p => ({ ...p, range: [p.min, p.max] }));

    return { 
        series: { ...iAgg, envelope: iEnvelope }, 
        mrSeries: { ...mrAgg, envelope: mrEnvelope }
    };
  }, [imr.points, imr.mrBar]);

  if (!mounted || !series) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        Loading chart...
      </div>
    );
  }


  const mode = series?.mode || "RAW";
  const isAggregated = mode === "AGGREGATED";
  const isSampled = mode === "SAMPLED";
  
  // "Engineering View" logic varies by density
  // If RAW density, Engineering View = Raw points (but cleaner tooltip?)
  // User Prompt: "Default charts must be Engineering View: aggregated band+mean + explicit violations only."
  // So:
  // - If AGGREGATED: Envelope + Mean
  // - If SAMPLED: Sampled Line + Violations
  // - If RAW: Raw Line + Violations
  const showEngineeringView = !showRaw; 

  const ITooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const isViolation = p.outOfControl !== undefined && p.outOfControl;
    
    if (isViolation) {
        return (
            <div className="bg-red-50 border border-red-200 p-2 rounded shadow-sm text-xs">
              <div className="font-bold text-red-600 mb-1">⚠️ Violation</div>
              <div className="font-medium">i = {p.x}</div>
              <div>Val = {fmt(p.value, 4)}</div>
            </div>
        );
    }
    
    // Engineering View
    if (showEngineeringView) {
        if (isAggregated && p.min !== undefined) {
             return (
                <div className="bg-white p-2 border rounded shadow-sm text-xs">
                  <div className="font-medium mb-1 text-slate-700">Window Summary</div>
                  <div>Count: {p.count}</div>
                  <div>Mean: {fmt(p.mean)}</div>
                  <div>Range: {fmt(p.min)} - {fmt(p.max)}</div>
                </div>
            );
        }
        // Sampled or Raw in Eng Mode
        if (p.value !== undefined) {
             return (
                <div className="bg-white p-2 border rounded shadow-sm text-xs">
                  <div className="font-medium mb-1 text-slate-600">{isSampled ? "Sampled Point" : "Sample Detail"}</div>
                  <div>i = {p.x}</div>
                  <div>Val = {fmt(p.value, 4)}</div>
                </div>
            );
        }
    }
    
    // Debug Mode
    if (showRaw) {
        return (
            <div className="bg-white p-2 border rounded shadow-sm text-xs">
               <div className="text-orange-600 font-bold mb-1">⚠️ DEBUG (RAW)</div>
               <div className="text-[10px] text-slate-400 mb-1">Not for Engineering/Audit Decisions</div>
               <div>i = {p.x}</div>
               <div>Val = {fmt(p.value, 4)}</div>
            </div>
        );
    }

    return null;
  };

  return (
    <div className="space-y-4">
        {/* Header & Controls */}
        <div className="flex items-center justify-between">
            <QualityChartHeader title="I-MR Analysis" count={imr.points.length} densityMode={mode} />
            
            <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none ml-4">
                  <input 
                      type="checkbox" 
                      checked={onlyViolations} 
                      onChange={e => setOnlyViolations(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span>Violations Only</span>
              </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* I Chart */}
          <div className="w-full relative rounded-md border bg-white p-2 shadow-sm" style={{ height }}>
            <div className="absolute top-2 left-3 z-10 text-xs font-bold text-slate-500 pointer-events-none">Individuals</div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 24, right: 18, left: 6, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" allowDuplicatedCategory={false} type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<ITooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
                
                <ReferenceLine y={imr.ucl} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={imr.mean} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.5} />
                <ReferenceLine y={imr.lcl} stroke="#ef4444" strokeDasharray="3 3" />

                {/* ENGINEERING VIEW RENDERING */}
                {showEngineeringView && !onlyViolations && (
                    <>
                        {/* AGGREGATED: Envelope + Mean */}
                        {isAggregated && (
                            <>
                                <Area data={series.envelope} dataKey="range" stroke="none" fill="#e2e8f0" fillOpacity={0.4} isAnimationActive={false} />
                                <Line data={series.envelope} dataKey="mean" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                            </>
                        )}
                        {/* SAMPLED: Stride Line */}
                        {isSampled && (
                           <Line 
                                data={series.sampled} 
                                dataKey="value" 
                                stroke="#94a3b8" 
                                strokeWidth={1} 
                                dot={false} 
                                isAnimationActive={false} 
                            />
                        )}
                        {/* RAW: Full Line (Small N) */}
                        {mode === "RAW" && (
                            <Line 
                                data={series.raw} 
                                dataKey="value" 
                                stroke="#94a3b8" 
                                strokeWidth={1} 
                                dot={false} 
                                isAnimationActive={false} 
                            />
                        )}
                    </>
                )}

                {/* DEBUG RAW VIEW Override */}
                {showRaw && !onlyViolations && (
                    <Line // Use Line for Raw Debug as per "Recharts Config 3" allows scatter or line, user prompt used Line in sample for raw/sample
                        data={imr.points} 
                        dataKey="value"
                        stroke="#3b82f6" 
                        strokeOpacity={0.5}
                        strokeWidth={1} 
                        dot={false}
                        isAnimationActive={false} 
                    />
                )}

                {/* Violations Overlay: ALWAYS Visible & Top Layer */}
                <Scatter 
                    data={series.violations} 
                    fill="#ef4444" 
                    line={false}
                    shape="circle"
                    isAnimationActive={false} 
                />

              </ComposedChart>
            </ResponsiveContainer>
          </div>
    
          {/* MR Chart (Simplified Logic for brevity, but matching structure) */}
          <div className="w-full relative rounded-md border bg-white p-2 shadow-sm" style={{ height }}>
             <div className="absolute top-2 left-3 z-10 text-xs font-bold text-slate-500 pointer-events-none">Moving Range</div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 24, right: 18, left: 6, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" allowDuplicatedCategory={false} type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} />
                <Tooltip content={<ITooltip />} /> 
                
                <ReferenceLine y={mrSeries?.envelope[0]?.max * 3 || 0} stroke="#ef4444" strokeDasharray="3 3" />
                
                {showEngineeringView && !onlyViolations && mrSeries && (
                    <>
                        {isAggregated && (
                            <>
                            <Area data={mrSeries.envelope} dataKey="range" stroke="none" fill="#e2e8f0" fillOpacity={0.4} isAnimationActive={false} />
                            <Line data={mrSeries.envelope} dataKey="mean" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                            </>
                        )}
                        {isSampled && (
                           <Line data={mrSeries.sampled} dataKey="value" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                        )}
                       {mode === "RAW" && (
                           <Line data={mrSeries.raw} dataKey="value" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                       )}
                    </>
                )}
                 {showRaw && !onlyViolations && (
                     <Line data={mrSeries?.raw || []} dataKey="value" stroke="#8b5cf6" strokeOpacity={0.5} strokeWidth={1} dot={false} isAnimationActive={false} />
                 )}
                 <Scatter 
                    data={mrSeries?.violations} 
                    fill="#ef4444" 
                    isAnimationActive={false} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <QualityDebugPanel series={{ 
            IMR: series,
            MR: mrSeries,
            CHART_MODE: chartMode,
            DENSITY_MODE: mode
        }} />
    </div>
  );
}
