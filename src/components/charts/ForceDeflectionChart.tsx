"use client";

 import { useEffect, useState } from "react";

import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from "recharts";

export interface ForceDeflectionPoint {
  deflection: number;
  load: number;
}

interface Props {
  data: ForceDeflectionPoint[];
  xAxisMode?: "deflection" | "height";
  freeLength?: number;
}

export function ForceDeflectionChart({ data, xAxisMode = "deflection", freeLength }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        Loading chart...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        No data yet. Generate a curve to see the chart.
      </div>
    );
  }

  const chartData = data.map(p => ({
    ...p,
    height: freeLength !== undefined ? freeLength - p.deflection : undefined
  }));

  const xKey = xAxisMode === "height" && freeLength !== undefined ? "height" : "deflection";
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const xLabel: any = xAxisMode === "height" 
    ? { value: "Height (mm)", position: "insideBottom", offset: -10 } 
    : { value: "Deflection (mm)", position: "insideBottom", offset: -10 };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey={xKey}
          type="number"
          label={xLabel}
          tick={{ fontSize: 12 }}
          stroke="#64748b"
          reversed={xAxisMode === "height"}
          domain={xAxisMode === "height" ? ['auto', 'auto'] : [0, 'auto']}
        />
        <YAxis
          dataKey="load"
          label={{ value: "Force (N)", angle: -90, position: "insideLeft", offset: 10 }}
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            fontSize: "12px",
          }}
          formatter={(value: number) => [`${value.toFixed(2)} N`, "Force"]}
          labelFormatter={(label: number) => 
            xAxisMode === "height" 
              ? `Height: ${label.toFixed(2)} mm` 
              : `Deflection: ${label.toFixed(2)} mm`
          }
        />
        <Line
          type="monotone"
          dataKey="load"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#3b82f6" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
