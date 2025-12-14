"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

export interface ForceDeflectionPoint {
  deflection: number;
  load: number;
}

interface InteractiveForceChartProps {
  data: ForceDeflectionPoint[];
  currentDeflection: number;
  onDeflectionChange?: (deflection: number) => void;
  xAxisLabel?: string;
  yAxisLabel?: string;
  lineColor?: string;
  markerColor?: string;
  showMarker?: boolean;
}

/**
 * Find the nearest point in the data array to the target deflection.
 */
export function findNearestPoint(
  data: ForceDeflectionPoint[],
  targetDeflection: number
): ForceDeflectionPoint | null {
  if (data.length === 0) return null;

  let nearest = data[0];
  let minDiff = Math.abs(data[0].deflection - targetDeflection);

  for (const point of data) {
    const diff = Math.abs(point.deflection - targetDeflection);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = point;
    }
  }

  return nearest;
}

export function InteractiveForceChart({
  data,
  currentDeflection,
  onDeflectionChange,
  xAxisLabel = "Deflection (mm)",
  yAxisLabel = "Force (N)",
  lineColor = "#3b82f6",
  markerColor = "#ef4444",
  showMarker = true,
}: InteractiveForceChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentPoint = useMemo(
    () => findNearestPoint(data, currentDeflection),
    [data, currentDeflection]
  );

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        Loading chart...
        <br />
        <span className="text-xs">图表加载中...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        No data yet. Generate a curve to see the chart.
        <br />
        <span className="text-xs">暂无数据，请生成曲线。</span>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (e: any) => {
    if (e?.activePayload && e.activePayload.length > 0 && onDeflectionChange) {
      const clickedPoint = e.activePayload[0].payload as ForceDeflectionPoint;
      onDeflectionChange(clickedPoint.deflection);
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        onClick={handleChartClick}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="deflection"
          label={{ value: xAxisLabel, position: "insideBottom", offset: -10 }}
          tick={{ fontSize: 12 }}
          stroke="#64748b"
        />
        <YAxis
          dataKey="load"
          label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: 10 }}
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
          labelFormatter={(label: number) => `Deflection: ${label.toFixed(2)} mm`}
        />
        <Line
          type="monotone"
          dataKey="load"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: lineColor }}
        />

        {/* Vertical reference line at current deflection */}
        {showMarker && currentPoint && (
          <ReferenceLine
            x={currentPoint.deflection}
            stroke={markerColor}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        {/* Marker dot at current point */}
        {showMarker && currentPoint && (
          <ReferenceDot
            x={currentPoint.deflection}
            y={currentPoint.load}
            r={6}
            fill={markerColor}
            stroke="#fff"
            strokeWidth={2}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
