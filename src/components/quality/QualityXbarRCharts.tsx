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

import type { XbarRChart } from "@/lib/quality";
import { useQualityStore } from "@/lib/quality/qualityStore";
import { QualityChartHeader } from "./debug/QualityChartHeader";
import { QualityDebugPanel } from "./debug/QualityDebugPanel";

function fmt(n: number, decimals = 3) {
  if (!isFinite(n)) return "—";
  return Number(n.toFixed(decimals)).toLocaleString();
}

export function QualityXbarRCharts({ xbarr, height = 260 }: { xbarr: XbarRChart; height?: number }) {
  const [mounted, setMounted] = useState(false);
  
  // Global State
  const chartMode = useQualityStore(s => s.chart.chartMode);
  const showRaw = chartMode === "RAW";

  const [onlyViolations, setOnlyViolations] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute multi-resolution data
  const { xSeries, rSeries } = useMemo(() => {
    if (!xbarr.points) return { xSeries: null, rSeries: null };
    
    // Map XbarRPoint to simplier shape for aggregation util
    // We treat "Mean" as the value for X-Chart
    const xPoints = xbarr.points.map(p => ({
        x: p.index,
        value: p.mean,
        cl: 0, ucl: 0, lcl: 0, // Dummy
        outOfControl: p.xOutOfControl
    }));
    
    // We treat "Range" as the value for R-Chart
    const rPoints = xbarr.points.map(p => ({
        x: p.index,
        value: p.range,
        cl: 0, ucl: 0, lcl: 0, // Dummy
        outOfControl: p.rOutOfControl
    }));

    const xAgg = aggregateImrData(xPoints);
    const xEnvelope = xAgg.envelope.map(p => ({ ...p, range: [p.min, p.max] }));
    
    const rAgg = aggregateImrData(rPoints);
    const rEnvelope = rAgg.envelope.map(p => ({ ...p, range: [p.min, p.max] }));

    return { 
        xSeries: { ...xAgg, envelope: xEnvelope, raw: xbarr.points }, // Keep raw
        rSeries: { ...rAgg, envelope: rEnvelope, raw: xbarr.points }
    };
  }, [xbarr.points]);

  if (!mounted || !xSeries) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400" style={{ height }}>
        Loading chart...
      </div>
    );
  }

  const mode = xSeries?.mode || "RAW";
  const isAggregated = mode === "AGGREGATED";
  const isSampled = mode === "SAMPLED";
  
  const showEngineeringView = !showRaw; 

  const XTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const isViolation = p.outOfControl; // From raw/sampled point or violation point

    if (isViolation) {
        return (
            <div className="bg-red-50 border border-red-200 p-2 rounded shadow-sm text-xs">
              <div className="font-bold text-red-600 mb-1">⚠️ Mean Violation</div>
              <div className="font-medium">Subgroup #{p.x}</div>
              {p.subgroupId && <div>ID: {p.subgroupId}</div>}
              <div>Mean = {fmt(p.value, 4)}</div>
            </div>
        );
    }
    
    // Engineering View
    if (showEngineeringView) {
        if (isAggregated && p.min !== undefined) {
             return (
                <div className="bg-white p-2 border rounded shadow-sm text-xs">
                  <div className="font-medium mb-1 text-slate-700">Subgroup Window</div>
                  <div>Count: {p.count} Groups</div>
                  <div>Avg Mean: {fmt(p.mean)}</div>
                  <div>Range: {fmt(p.min)} - {fmt(p.max)}</div>
                </div>
            );
        }
        if (p.value !== undefined) {
            return (
                <div className={`p-2 border rounded shadow-sm text-xs bg-white`}>
                   <div className="font-medium mb-1">{isSampled ? "Sampled Subgroup" : "Subgroup Detail"}</div>
                   <div>#{p.subgroupId || p.x}</div>
                   <div>Mean = {fmt(p.value, 4)}</div>
                </div>
            );
        }
    }

    if (showRaw && p.mean !== undefined) { // Raw XbarRPoint has mean
         return (
            <div className={`p-2 border rounded shadow-sm text-xs bg-white`}>
               <div className="text-orange-600 font-bold mb-1">⚠️ DEBUG (RAW)</div>
               <div className="font-medium mb-1">Subgroup #{p.subgroupId || p.x}</div>
               <div>Mean = {fmt(p.mean, 4)}</div>
            </div>
        );
    }
    
    return null;
  };

  const RTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const isViolation = p.outOfControl;

    if (isViolation) {
        return (
            <div className="bg-red-50 border border-red-200 p-2 rounded shadow-sm text-xs">
              <div className="font-bold text-red-600 mb-1">⚠️ Range Violation</div>
              <div className="font-medium">Subgroup #{p.x}</div>
              <div>Range = {fmt(p.value, 4)}</div>
            </div>
        );
    }
    
    if (showEngineeringView) {
         if (isAggregated && p.min !== undefined) {
             return (
                <div className="bg-white p-2 border rounded shadow-sm text-xs">
                  <div className="font-medium mb-1 text-slate-700">Subgroup Window</div>
                   <div>Count: {p.count} Groups</div>
                  <div>Avg Range: {fmt(p.mean)}</div>
                  <div>Range range: {fmt(p.min)} - {fmt(p.max)}</div>
                </div>
            );
        }
        if (p.value !== undefined) {
            return (
                <div className={`p-2 border rounded shadow-sm text-xs bg-white`}>
                   <div className="font-medium mb-1">{isSampled ? "Sampled Subgroup" : "Subgroup Detail"}</div>
                   <div>#{p.x}</div>
                   <div>Range = {fmt(p.value, 4)}</div>
                </div>
            );
        }
    }

    if (showRaw && p.range !== undefined) {
        return (
            <div className={`p-2 border rounded shadow-sm text-xs bg-white`}>
               <div className="text-orange-600 font-bold mb-1">⚠️ DEBUG (RAW)</div>
               <div>Subgroup #{p.subgroupId || p.index}</div>
               <div>Range = {fmt(p.range, 4)}</div>
            </div>
        );
    }
    return null;
  };

  return (
    <div className="space-y-4">
        {/* Header & Controls */}
        <div className="flex items-center justify-between">
           <QualityChartHeader title={`Xbar-R Analysis (n=${xbarr.subgroupSize})`} count={xbarr.points.length} densityMode={mode} />
           
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
          {/* Xbar Chart */}
          <div className="w-full relative rounded-md border bg-white p-2 shadow-sm" style={{ height }}>
             <div className="absolute top-2 left-3 z-10 text-xs font-bold text-slate-500 pointer-events-none">Subgroup Means (Xbar)</div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 24, right: 18, left: 6, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" allowDuplicatedCategory={false} type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<XTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
                
                {/* We use first point CLs for now. Technically CL can change but usually constant in this output */ }
                <ReferenceLine y={xbarr.points[0]?.xucl} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={xbarr.points[0]?.xcl} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.5} />
                <ReferenceLine y={xbarr.points[0]?.xlcl} stroke="#ef4444" strokeDasharray="3 3" />

                {/* ENGINEERING VIEW */}
                {showEngineeringView && !onlyViolations && (
                    <>
                    {/* AGGREGATED */}
                    {isAggregated && (
                        <>
                        <Area data={xSeries.envelope} dataKey="range" stroke="none" fill="#e2e8f0" fillOpacity={0.4} isAnimationActive={false} />
                        <Line data={xSeries.envelope} dataKey="mean" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                        </>
                    )}
                    {/* SAMPLED or RAW */}
                    {(isSampled || mode === "RAW") && (
                        <Line 
                            data={isSampled ? xSeries.sampled : xSeries.raw} 
                            dataKey="value" 
                            stroke="#94a3b8" 
                            strokeWidth={1} 
                            dot={false}
                            isAnimationActive={false} 
                        />
                    )}
                    </>
                )}

                {/* Debug RAW View */}
                {showRaw && !onlyViolations && (
                     <Line 
                        data={xbarr.points} 
                        type="monotone"
                        dataKey="mean" 
                        stroke="#2563eb" 
                        strokeOpacity={0.5}
                        strokeWidth={1} 
                        dot={false}
                        isAnimationActive={false} 
                    />
                )}
                
                {/* Violations Overlay */}
                <Scatter 
                    data={xSeries.violations} 
                    fill="#ef4444" 
                    line={false}
                    shape="circle"
                    isAnimationActive={false} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
    
          {/* R Chart */}
          <div className="w-full relative rounded-md border bg-white p-2 shadow-sm" style={{ height }}>
             <div className="absolute top-2 left-3 z-10 text-xs font-bold text-slate-500 pointer-events-none">Subgroup Ranges (R)</div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 24, right: 18, left: 6, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="x" allowDuplicatedCategory={false} type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<RTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
                
                <ReferenceLine y={xbarr.points[0]?.rucl} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={xbarr.points[0]?.rcl} stroke="#64748b" strokeDasharray="2 2" strokeOpacity={0.5} />
                
                {/* ENGINEERING VIEW */}
                {showEngineeringView && !onlyViolations && (
                    <>
                    {/* AGGREGATED */}
                    {isAggregated && (
                        <>
                        <Area data={rSeries.envelope} dataKey="range" stroke="none" fill="#e2e8f0" fillOpacity={0.4} isAnimationActive={false} />
                        <Line data={rSeries.envelope} dataKey="mean" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                        </>
                    )}
                    {/* SAMPLED or RAW */}
                    {(isSampled || mode === "RAW") && (
                        <Line 
                            data={isSampled ? rSeries.sampled : rSeries.raw} 
                            dataKey="value" 
                            stroke="#94a3b8" 
                            strokeWidth={1} 
                            dot={false}
                            isAnimationActive={false} 
                        />
                    )}
                    </>
                )}

                {showRaw && !onlyViolations && (
                     <Line 
                        data={xbarr.points} 
                        type="monotone"
                        dataKey="range" 
                        stroke="#8b5cf6" 
                        strokeOpacity={0.5}
                        strokeWidth={1} 
                        dot={false}
                        isAnimationActive={false} 
                    />
                )}
                
                <Scatter 
                    data={rSeries.violations} 
                    fill="#ef4444" 
                    line={false}
                    shape="circle"
                    isAnimationActive={false} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <QualityDebugPanel series={{ 
             X: xSeries,
             R: rSeries,
             CHART_MODE: chartMode,
             DENSITY_MODE: mode
        }} />
    </div>
  );
}
